(() => {
  const TOKEN_KEY = "kuru-hub-gh-token";
  const LOCAL_PREFIX = "kuru-hub-doc:";
  const LOG_KEY = "kuru-hub-update-log";

  const state = {
    manifest: null,
    path: null,
    sha: null,
    text: "",
    dirty: false,
    mode: "view",
    fromLocal: false,
    deferredInstall: null,
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

  function githubBlobUrl(path) {
    const m = state.manifest;
    return `https://github.com/${m.owner}/${m.repo}/blob/${m.branch}/${path}`;
  }

  function readLocal(path) {
    try {
      const raw = localStorage.getItem(LOCAL_PREFIX + path);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeLocal(path, text) {
    const updatedAt = new Date().toISOString();
    localStorage.setItem(LOCAL_PREFIX + path, JSON.stringify({ text, updatedAt }));
    appendLog(path, updatedAt, "local");
    return updatedAt;
  }

  function appendLog(path, updatedAt, via) {
    let log = [];
    try {
      log = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
    } catch {
      log = [];
    }
    log.unshift({ path, updatedAt, via: via || "local" });
    localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(0, 200)));
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
        const local = readLocal(f.path);
        b.className = "file-btn" + (f.path === state.path ? " active" : "");
        b.textContent = local ? `${f.title} ·端末` : f.title;
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

  function resolveDocPath(fromPath, href) {
    if (!href || href.startsWith("#") || /^https?:\/\//i.test(href) || href.startsWith("mailto:")) {
      return null;
    }
    const clean = href.split("#")[0].split("?")[0];
    if (!clean || !/\.md$/i.test(clean)) return null;

    let path;
    if (clean.startsWith("/")) {
      path = clean.replace(/^\/+/, "");
    } else if (clean.startsWith("docs/")) {
      path = clean;
    } else {
      const dir = fromPath.includes("/") ? fromPath.slice(0, fromPath.lastIndexOf("/") + 1) : "";
      const parts = (dir + clean).split("/");
      const out = [];
      for (const part of parts) {
        if (!part || part === ".") continue;
        if (part === "..") out.pop();
        else out.push(part);
      }
      path = out.join("/");
    }
    return path;
  }

  function onViewClick(ev) {
    const a = ev.target.closest("a");
    if (!a || !$("view-pane").contains(a)) return;
    const href = a.getAttribute("href") || "";
    const docPath = resolveDocPath(state.path || "", href);
    if (!docPath) return;
    ev.preventDefault();
    openFile(docPath);
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
      const local = readLocal(path);
      let remote = "";
      try {
        remote = await fetchRaw(path);
      } catch (e) {
        if (!local) throw e;
      }

      if (local && local.text != null) {
        state.text = local.text;
        state.fromLocal = true;
      } else {
        state.text = remote;
        state.fromLocal = false;
      }

      state.dirty = false;
      $("edit-pane").value = state.text;
      const item = state.manifest.files.find((f) => f.path === path);
      $("current-title").textContent =
        (item ? item.title : path) + (state.fromLocal ? "（端末）" : "");
      renderList();
      renderView();
      setMode("view");
      await fetchMeta(path);
      setStatus(
        state.fromLocal
          ? `端末版を表示（更新: ${local.updatedAt || "不明"}）`
          : "リポ版を表示。編集したら「端末に保存」→必要なら「書き出し」",
        "ok"
      );
    } catch (e) {
      setStatus(String(e.message || e), "err");
    }
  }

  function saveToDevice() {
    if (!state.path) return;
    const bodyText = $("edit-pane").value;
    const at = writeLocal(state.path, bodyText);
    state.text = bodyText;
    state.dirty = false;
    state.fromLocal = true;
    const item = state.manifest.files.find((f) => f.path === state.path);
    $("current-title").textContent = (item ? item.title : state.path) + "（端末）";
    renderList();
    renderView();
    setStatus(`端末に保存した ${at}`, "ok");
  }

  function exportFile() {
    if (!state.path) return;
    const bodyText = state.mode === "edit" ? $("edit-pane").value : state.text;
    const name = state.path.split("/").pop() || "export.md";
    const blob = new Blob([bodyText], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    appendLog(state.path, new Date().toISOString(), "export");
    setStatus(`書き出した: ${name} → Driveに上げて正本にできる`, "ok");
  }

  function importFile(file) {
    if (!file || !state.path) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      $("edit-pane").value = text;
      state.text = text;
      state.dirty = false;
      writeLocal(state.path, text);
      state.fromLocal = true;
      const item = state.manifest.files.find((f) => f.path === state.path);
      $("current-title").textContent = (item ? item.title : state.path) + "（端末）";
      renderList();
      renderView();
      setMode("view");
      setStatus(`取り込んだ: ${file.name}`, "ok");
    };
    reader.readAsText(file, "UTF-8");
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
      setStatus("トークンがありません（普段は端末保存でOK）", "err");
      return;
    }
    if (!state.path) return;
    const bodyText = $("edit-pane").value;
    setStatus("GitHubへ保存中…");
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
      writeLocal(state.path, bodyText);
      appendLog(state.path, new Date().toISOString(), "github");
      setStatus("GitHubに保存した", "ok");
      renderView();
    } catch (e) {
      setStatus(String(e.message || e), "err");
    }
  }

  function setupInstall() {
    const btn = $("btn-install");
    const hint = $("install-hint");
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      navigator.standalone === true;

    if (isStandalone) {
      hint.classList.add("hidden");
      btn.classList.add("hidden");
      return;
    }

    if (isIos) {
      hint.textContent = "iPhone: 共有ボタン →「ホーム画面に追加」";
      hint.classList.remove("hidden");
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      state.deferredInstall = e;
      btn.classList.remove("hidden");
      hint.textContent = "ホーム画面に追加できます";
      hint.classList.remove("hidden");
    });

    btn.addEventListener("click", async () => {
      if (!state.deferredInstall) return;
      state.deferredInstall.prompt();
      await state.deferredInstall.userChoice;
      state.deferredInstall = null;
      btn.classList.add("hidden");
    });
  }

  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    const swUrl = `${base()}/sw.js`;
    navigator.serviceWorker.register(swUrl).catch((err) => {
      console.warn("SW register failed", err);
    });
  }

  function wire() {
    $("view-pane").addEventListener("click", onViewClick);
    $("btn-view").addEventListener("click", () => setMode("view"));
    $("btn-edit").addEventListener("click", () => setMode("edit"));
    $("btn-local-save").addEventListener("click", saveToDevice);
    $("btn-export").addEventListener("click", exportFile);
    $("btn-import").addEventListener("click", () => $("import-input").click());
    $("import-input").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) importFile(file);
      e.target.value = "";
    });
    $("btn-reload").addEventListener("click", async () => {
      await loadManifest();
      if (state.path) await openFile(state.path);
    });
    $("edit-pane").addEventListener("input", () => {
      state.dirty = true;
      setStatus("未保存の編集あり →「端末に保存」");
    });
    $("btn-settings").addEventListener("click", () => {
      $("token-input").value = "";
      $("token-clear").checked = false;
      $("settings-dialog").showModal();
    });
    $("btn-github-save").addEventListener("click", (ev) => {
      ev.preventDefault();
      saveToGitHub();
    });
    $("settings-form").addEventListener("submit", (ev) => {
      if ($("token-clear").checked) {
        localStorage.removeItem(TOKEN_KEY);
      } else if ($("token-input").value.trim()) {
        localStorage.setItem(TOKEN_KEY, $("token-input").value.trim());
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
    setupInstall();
    registerSW();
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
