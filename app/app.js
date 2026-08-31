(() => {
  const TOKEN_KEY = "kuru-hub-gh-token";
  const LOCAL_PREFIX = "kuru-hub-doc:";
  const LOG_KEY = "kuru-hub-update-log";

  const state = {
    manifest: null,
    path: null,
    slug: null,
    sha: null,
    text: "",
    dirty: false,
    mode: "view",
    fromLocal: false,
    deferredInstall: null,
  };

  const $ = (id) => document.getElementById(id);

  /** リポジトリルート（ /p/slug 配下でもルートを指す） */
  function repoRoot() {
    let path = location.pathname.replace(/\/index\.html$/i, "");
    path = path.replace(/\/p\/[^/]+\/?$/, "");
    if (path.endsWith("/")) path = path.slice(0, -1);
    return path;
  }

  function asset(path) {
    return `${repoRoot()}/${path.replace(/^\//, "")}`;
  }

  function pageUrl(slug) {
    return `${repoRoot()}/p/${slug}/`;
  }

  function setStatus(msg, kind) {
    const el = $("status");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "status" + (kind ? " " + kind : "");
  }

  function token() {
    return localStorage.getItem(TOKEN_KEY) || "";
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

  function hasLocal(path) {
    return path ? !!readLocal(path) : false;
  }

  function updateClearLocalButton() {
    const btn = $("btn-clear-local");
    if (!btn) return;
    const show = !!(state.path && hasLocal(state.path));
    btn.hidden = !show;
    btn.disabled = !show;
  }

  async function clearLocalForCurrent() {
    if (!state.path) return;
    if (!hasLocal(state.path)) {
      setStatus("このページに端末データはありません", "ok");
      updateClearLocalButton();
      return;
    }
    const item = fileByPath(state.path);
    const name = item ? item.title : state.path;
    if (
      !confirm(
        `「${name}」の端末データを消して、Web上の最新版を表示します。\n\n端末での編集・取り込み内容は戻せません。よろしいですか？`
      )
    ) {
      return;
    }
    localStorage.removeItem(LOCAL_PREFIX + state.path);
    state.dirty = false;
    await openFile(state.path, state.slug);
    setStatus("Web版を表示しています", "ok");
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

  function fileBySlug(slug) {
    return (state.manifest.files || []).find((f) => f.slug === slug);
  }

  function fileByPath(path) {
    return (state.manifest.files || []).find((f) => f.path === path);
  }

  function currentSlugFromLocation() {
    if (window.KURU_SLUG) return window.KURU_SLUG;
    const q = new URLSearchParams(location.search).get("p");
    if (q) return q;
    const m = location.pathname.match(/\/p\/([^/]+)\/?/);
    return m ? decodeURIComponent(m[1]) : null;
  }

  function navigateToSlug(slug, { replace } = {}) {
    const url = pageUrl(slug);
    if (replace) history.replaceState({ slug }, "", url);
    else if (location.pathname + location.search !== new URL(url, location.origin).pathname) {
      // 別ディレクトリへはフル遷移（相対アセットが正しい）
      const here = location.pathname.replace(/\/index\.html$/i, "").replace(/\/$/, "");
      const target = new URL(url, location.origin).pathname.replace(/\/$/, "");
      if (here !== target) {
        location.href = url;
        return false;
      }
      history.pushState({ slug }, "", url);
    }
    return true;
  }

  async function loadManifest() {
    const res = await fetch(`${asset("manifest.json")}?t=${Date.now()}`);
    if (!res.ok) throw new Error("manifest.json を読めません");
    state.manifest = await res.json();
    renderList();
  }

  function renderList() {
    const nav = $("file-list");
    if (!nav) return;
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
        const a = document.createElement("a");
        a.href = pageUrl(f.slug);
        a.className = "file-btn" + (f.slug === state.slug ? " active" : "");
        const local = readLocal(f.path);
        a.textContent = local ? `${f.title} ·端末` : f.title;
        a.addEventListener("click", (ev) => {
          ev.preventDefault();
          openBySlug(f.slug);
        });
        nav.appendChild(a);
      }
    }
  }

  async function fetchRaw(path) {
    const res = await fetch(`${asset(path)}?t=${Date.now()}`);
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
    const f = fileByPath(docPath);
    if (f && f.slug) openBySlug(f.slug);
    else openFile(docPath);
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

  async function openBySlug(slug) {
    const f = fileBySlug(slug);
    if (!f) {
      setStatus(`不明なページ: ${slug}`, "err");
      return;
    }
    const cont = navigateToSlug(slug);
    if (cont === false) return;
    window.KURU_SLUG = slug;
    await openFile(f.path, slug);
  }

  async function openFile(path, slug) {
    if (state.dirty && !confirm("保存していない編集があります。切り替えますか？")) return;
    setStatus("読込中…");
    try {
      const f = fileByPath(path) || (slug ? fileBySlug(slug) : null);
      state.path = path;
      state.slug = f ? f.slug : slug || null;

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
      $("current-title").textContent =
        (f ? f.title : path) + (state.fromLocal ? "（端末）" : "");
      document.title = `${f ? f.title : path} | クルハブ`;
      renderList();
      renderView();
      setMode("view");
      await fetchMeta(path);
      setStatus(
        state.fromLocal
          ? `端末版（${local.updatedAt || "不明"}） ${state.slug ? "URL: /p/" + state.slug + "/" : ""}`
          : `表示中 ${state.slug ? "→ /p/" + state.slug + "/" : ""}`,
        "ok"
      );
      updateClearLocalButton();
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
    const item = fileByPath(state.path);
    $("current-title").textContent = (item ? item.title : state.path) + "（端末）";
    renderList();
    renderView();
    setStatus(`端末に保存した ${at}`, "ok");
    updateClearLocalButton();
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
    setStatus(`書き出した: ${name}`, "ok");
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
      const item = fileByPath(state.path);
      $("current-title").textContent = (item ? item.title : state.path) + "（端末）";
      renderList();
      renderView();
      setMode("view");
      setStatus(`取り込んだ: ${file.name}`, "ok");
      updateClearLocalButton();
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

  async function copyPageUrl() {
    const slug = state.slug || currentSlugFromLocation();
    const url = slug
      ? new URL(pageUrl(slug), location.origin).href
      : location.href;
    try {
      await navigator.clipboard.writeText(url);
      setStatus(`URLをコピーした: ${url}`, "ok");
    } catch {
      prompt("このURLをコピーしてください", url);
    }
  }

  function setupInstall() {
    const btn = $("btn-install");
    const hint = $("install-hint");
    if (!btn || !hint) return;
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
      hint.textContent = "iPhone: 共有 →「ホーム画面に追加」";
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
    navigator.serviceWorker.register(`${asset("sw.js")}`).catch(() => {});
  }

  function wire() {
    $("view-pane").addEventListener("click", onViewClick);
    $("btn-view").addEventListener("click", () => setMode("view"));
    $("btn-edit").addEventListener("click", () => setMode("edit"));
    $("btn-local-save").addEventListener("click", saveToDevice);
    $("btn-export").addEventListener("click", exportFile);
    $("btn-import").addEventListener("click", () => $("import-input").click());
    const clearLocalBtn = $("btn-clear-local");
    if (clearLocalBtn) clearLocalBtn.addEventListener("click", clearLocalForCurrent);
    $("import-input").addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) importFile(file);
      e.target.value = "";
    });
    $("btn-reload").addEventListener("click", async () => {
      await loadManifest();
      const slug = state.slug || currentSlugFromLocation();
      if (slug) await openBySlug(slug);
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
    const copyBtn = $("btn-copy-url");
    if (copyBtn) copyBtn.addEventListener("click", copyPageUrl);
    $("btn-github-save").addEventListener("click", (ev) => {
      ev.preventDefault();
      saveToGitHub();
    });
    $("settings-form").addEventListener("submit", () => {
      if ($("token-clear").checked) localStorage.removeItem(TOKEN_KEY);
      else if ($("token-input").value.trim()) {
        localStorage.setItem(TOKEN_KEY, $("token-input").value.trim());
      }
    });
    window.addEventListener("popstate", () => {
      const slug = currentSlugFromLocation();
      if (slug) openBySlug(slug);
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
      const slug = currentSlugFromLocation();
      if (slug && fileBySlug(slug)) {
        await openBySlug(slug);
      } else if (location.pathname.includes("/p/")) {
        setStatus("このスラッグのページが manifest にありません", "err");
      } else {
        // トップは一覧のみ。最初のファイルへ誘導せずボードへ
        const board = fileBySlug("board") || state.manifest.files[0];
        if (board) await openBySlug(board.slug);
      }
    } catch (e) {
      setStatus(String(e.message || e), "err");
    }
  }

  boot();
})();
