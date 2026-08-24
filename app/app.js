(() => {
  const TOKEN_KEY = "kuru-hub-gh-token";
  const state = {
    manifest: null,
    path: null,
    sha: null,
    text: "",
    dirty: false,
    mode: "view",
  };

  const $ = (id) => document.getElementById(id);
  const base = () => {
    const p = location.pathname.replace(/\/index\.html$/i, "");
    return p.endsWith("/") ? p.slice(0, -1) : p;
  };

  function setStatus(msg, kind) {
    const el = $("status");
    el.textContent = msg || "";
    el.className = "status" + (kind ? " " + kind : "");
  }

  function token() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function githubEditUrl(path) {
    const m = state.manifest;
    return `https://github.com/${m.owner}/${m.repo}/edit/${m.branch}/${path}`;
  }

  function githubBlobUrl(path) {
    const m = state.manifest;
    return `https://github.com/${m.owner}/${m.repo}/blob/${m.branch}/${path}`;
  }

  async function loadManifest() {
    const res = await fetch(`${base()}/manifest.json?t=${Date.now()}`);
    if (!res.ok) throw new Error("manifest.json を読めません");
    state.manifest = await res.json();
    renderList();
  }

  function renderList() {
    const nav = $("file-list");
    nav.innerHTML = "";
    const groups = {};
    for (const f of state.manifest.files) {
      (groups[f.group] ||= []).push(f);
    }
    for (const [group, files] of Object.entries(groups)) {
      const g = document.createElement("div");
      g.className = "group";
      g.textContent = group;
      nav.appendChild(g);
      for (const f of files) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "file-btn" + (f.path === state.path ? " active" : "");
        b.textContent = f.title;
        b.addEventListener("click", () => openFile(f.path));
        nav.appendChild(b);
      }
    }
  }

  async function fetchRaw(path) {
    const res = await fetch(`${base()}/${path}?t=${Date.now()}`);
    if (!res.ok) throw new Error(`${path} を読めません (${res.status})`);
    return res.text();
  }

  function apiPath(path) {
    return path.split("/").map(encodeURIComponent).join("/");
  }

  async function fetchMeta(path) {
    const t = token();
    if (!t) {
      state.sha = null;
      return;
    }
    const m = state.manifest;
    const url = `https://api.github.com/repos/${m.owner}/${m.repo}/contents/${apiPath(path)}?ref=${m.branch}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${t}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      state.sha = data.sha;
    } else {
      state.sha = null;
    }
  }

  function renderView() {
    const html = marked.parse(state.text || "");
    $("view-pane").innerHTML = html;
    $("view-pane").querySelectorAll('input[type="checkbox"]').forEach((box) => {
      box.disabled = true;
    });
  }

  function setMode(mode) {
    state.mode = mode;
    $("btn-view").classList.toggle("active", mode === "view");
    $("btn-edit").classList.toggle("active", mode === "edit");
    $("view-pane").classList.toggle("hidden", mode !== "view");
    $("edit-pane").classList.toggle("hidden", mode !== "edit");
    if (mode === "view") {
      state.text = $("edit-pane").value;
      renderView();
    }
  }

  async function openFile(path) {
    if (state.dirty && !confirm("保存していない編集があります。切り替えますか？")) return;
    setStatus("読込中…");
    try {
      state.path = path;
      state.text = await fetchRaw(path);
      state.dirty = false;
      $("edit-pane").value = state.text;
      const item = state.manifest.files.find((f) => f.path === path);
      $("current-title").textContent = item ? item.title : path;
      $("link-github").href = githubBlobUrl(path);
      $("btn-save").disabled = !token();
      renderList();
      renderView();
      setMode("view");
      await fetchMeta(path);
      setStatus(token() ? (state.sha ? "読込OK（保存可）" : "読込OK（SHA未取得）") : "読込OK（表示のみ。保存は設定でトークン）", "ok");
    } catch (e) {
      setStatus(String(e.message || e), "err");
    }
  }

  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary);
  }

  async function saveToGitHub() {
    const t = token();
    if (!t) {
      setStatus("先に設定でトークンを保存してください", "err");
      $("settings-dialog").showModal();
      return;
    }
    if (!state.path) return;
    const bodyText = $("edit-pane").value;
    setStatus("保存中…");
    $("btn-save").disabled = true;
    try {
      if (!state.sha) await fetchMeta(state.path);
      const m = state.manifest;
      const url = `https://api.github.com/repos/${m.owner}/${m.repo}/contents/${apiPath(state.path)}`;
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${t}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `hub: update ${state.path}`,
          content: utf8ToBase64(bodyText),
          branch: m.branch,
          sha: state.sha || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `保存失敗 ${res.status}`);
      state.sha = data.content.sha;
      state.text = bodyText;
      state.dirty = false;
      setStatus("保存した（GitHubに反映）", "ok");
      renderView();
    } catch (e) {
      setStatus(String(e.message || e), "err");
    } finally {
      $("btn-save").disabled = !token();
    }
  }

  function wire() {
    $("btn-view").addEventListener("click", () => setMode("view"));
    $("btn-edit").addEventListener("click", () => setMode("edit"));
    $("btn-save").addEventListener("click", saveToGitHub);
    $("btn-reload").addEventListener("click", async () => {
      await loadManifest();
      if (state.path) await openFile(state.path);
    });
    $("edit-pane").addEventListener("input", () => {
      state.dirty = true;
      setStatus("未保存の編集あり");
    });
    $("btn-settings").addEventListener("click", () => {
      $("token-input").value = "";
      $("token-clear").checked = false;
      $("settings-dialog").showModal();
    });
    $("settings-form").addEventListener("submit", (ev) => {
      const val = ev.submitter && ev.submitter.value;
      if (val === "ok") {
        if ($("token-clear").checked) {
          localStorage.removeItem(TOKEN_KEY);
        } else if ($("token-input").value.trim()) {
          localStorage.setItem(TOKEN_KEY, $("token-input").value.trim());
        }
        $("btn-save").disabled = !token();
        setStatus(token() ? "トークン保存済み" : "トークンなし（表示のみ）", "ok");
      }
    });
    window.addEventListener("beforeunload", (e) => {
      if (state.dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    });
  }

  async function boot() {
    wire();
    try {
      await loadManifest();
      document.title = state.manifest.title || "クルハブ";
      const first = state.manifest.files[0];
      if (first) await openFile(first.path);
    } catch (e) {
      setStatus(String(e.message || e), "err");
    }
  }

  boot();
})();
