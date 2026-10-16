// ==UserScript==
// @icon          https://github.githubassets.com/favicon.ico
// @name          FastGithub 镜像加速访问、克隆和下载
// @namespace     RC1844.FastGithub
// @author        RC1844
// @homepageURL   https://github.com/RC1844/FastGithub
// @supportURL    https://github.com/RC1844/FastGithub/issues
// @license       MIT License
// @description   镜像访问GitHub,极速Clone、Raw、Release资产、ZIP加速；适配 2025+ 新版 GitHub 页面，纯原生JS无外部依赖
// @include       *://github.com/*
// @include       *://github*
// @include       *://hub.fastgit.xyz/*
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_registerMenuCommand
// @run-at        document-idle
// @version       3.0.0
// ==/UserScript==

(function () {
  "use strict";

  /* ===================== 可编辑配置（GM_setValue/GM_getValue 持久化） ===================== */
  var CONFIG = {
    cloneCmd: true,
    depth: true
  };
  try {
    if (typeof GM_getValue === "function") {
      var saved = GM_getValue("fgConfig", null);
      if (saved) CONFIG = Object.assign(CONFIG, saved);
    }
  } catch (e) { }
  function saveConfig() {
    try {
      if (typeof GM_setValue === "function") GM_setValue("fgConfig", CONFIG);
    } catch (e) { }
  }

  /* MirrorUrl[i] = [前缀, 名称, 提示]
   * 下载/克隆类前缀拼接规则: 前缀 + GitHub 完整链接(以 https://github.com 起始) */
  var MirrorUrl = new Array();
  MirrorUrl[0] = ["https://eo.gh-proxy.cn/github/https://github.com", "gh-proxy.cn", "gh-proxy.cn 官方推荐入口(腾讯云EdgeOne)，支持clone/raw/zip/releases，支持断点续传，只加速文件不代理网页"];
  MirrorUrl[1] = ["https://z1.gh-proxy.cn/github/https://github.com", "gh-proxy z1", "gh-proxy.cn EdgeOne加速-1，支持clone/raw/zip/releases，支持断点续传"];
  MirrorUrl[2] = ["https://z3.gh-proxy.cn/github/https://github.com", "gh-proxy z3", "gh-proxy.cn EdgeOne加速-3，支持clone/raw/zip/releases，支持断点续传"];
  MirrorUrl[3] = ["https://cf.gh-proxy.cn/github/https://github.com", "gh-proxy cf", "gh-proxy.cn Cloudflare优选节点，支持clone/raw/zip/releases，支持断点续传"];
  MirrorUrl[4] = ["https://gh-proxy.com/https://github.com", "gh-proxy.com", "开源公益GitHub文件代理，支持clone/raw/zip/releases，节点由社区贡献"];
  MirrorUrl[5] = ["https://ghproxy.net/https://github.com", "ghproxy.net", "公益GitHub文件加速，支持clone/raw/zip/releases"];
  MirrorUrl[6] = ["https://ghfast.top/https://github.com", "ghfast.top", "公益加速，脚本环境实测仅可用于克隆，文件下载请选其它入口"];
  MirrorUrl[7] = ["https://gitclone.com/github.com", "GitClone", "GitHub缓存加速网站，仅克隆有效"];

  var SSH_MIRROR = ["git@git.zhlh6.cn:", "加速你的Github", "利用ucloud提供的GlobalSSH，仅克隆有效"];
  var JSD = ["https://cdn.jsdelivr.net/gh", "jsDelivr", "通过CDN浏览/读取单个文件，单包总体积有限制(约50MB)，无Release/ZIP加速"];

  var CloneSet    = [0, 1, 2, 3, 4, 5, 6, 7];
  var DownloadSet = [0, 1, 2, 3, 4, 5];
  var RawSet      = [0, 1, 2, 3, 4, 5];

  var OtherUrl = [
    ["https://github.com/RC1844/FastGithub", "脚本Github仓库地址,点个赞谢谢"],
    ["https://greasyfork.org/zh-CN/scripts/397419", "GreasyFork地址,希望可以给我评分收藏"],
    ["https://gitclone.com", "GitClone"],
    ["https://www.gh-proxy.cn/github/", "gh-proxy.cn GitHub加速(官方站)"],
    ["https://www.gh-proxy.cn/nodes", "gh-proxy.cn 节点状态/延迟"],
    ["https://gh-proxy.com", "gh-proxy.com 公益代理"],
    ["https://ghproxy.net", "ghproxy.net 公益加速"],
    ["https://ghfast.top", "ghfast.top 公益加速"],
    ["https://minhaskamal.github.io/DownGit", "DownGit"],
    ["https://zhoudaxiaa.gitee.io", "DownGit 周大侠啊"],
    ["https://d.serctl.com", "GitHub中转下载"],
    ["https://toolwa.com", "孟坤工具箱"],
    ["https://github.zhlh6.cn/", "加速你的Github"],
    ["https://gitee.com/organizations/mirrors/projects", "Gitee 极速下载"],
    ["https://codechina.csdn.net/mirrors", "CSDN Mirrors 镜像仓库"]
  ];

  /* ================================== 工具函数 ================================== */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k.slice(0, 5) === "data-") node.setAttribute(k, attrs[k]);
        else node[k] = attrs[k];
      });
    }
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function relPath(u) {
    if (!u) return "";
    var m = u.match(/github\.com(\/.*)$/i);
    if (m) return m[1];
    if (u.charAt(0) === "/") return u;
    return "/" + u;
  }

  function repoContext() {
    var p = location.pathname.split("/").filter(Boolean);
    var banned = ["features", "marketplace", "orgs", "settings", "search", "login", "signup",
      "about", "pricing", "topics", "trending", "explore", "notifications", "new", "dashboard"];
    if (p.length < 2 || banned.indexOf(p[0]) !== -1) return null;
    return { owner: p[0], repo: p[1], parts: p };
  }

  var zipCache;
  function defaultZipPath(ctx) {
    if (zipCache !== undefined) return zipCache;
    zipCache = null;
    try {
      var m = document.documentElement.innerHTML.match(/"zipballUrl":"(\/[^"]+?\.zip)"/);
      if (m) zipCache = m[1].replace(/\\u0026/g, "&");
    } catch (e) { }
    if (!zipCache) {
      var tm = location.pathname.match(/^\/[^/]+\/[^/]+\/tree\/(.+)$/);
      if (tm) zipCache = "/" + ctx.owner + "/" + ctx.repo + "/archive/refs/heads/" + tm[1] + ".zip";
    }
    return zipCache;
  }

  function defaultBranch(ctx) {
    var z = defaultZipPath(ctx);
    if (z) {
      var m = z.match(/archive\/refs\/heads\/(.+)\.zip$/);
      if (m) return decodeURIComponent(m[1]);
    }
    return null;
  }

  function jsDelivrFromUrl(u) {
    var m = u.match(/github\.com\/([^/]+)\/[^/]+\/(?:raw|blob)\/(?:refs\/heads\/|refs\/tags\/)?(.+)$/i);
    if (!m) {
      m = u.match(/^\/([^/]+)\/[^/]+\/(?:raw|blob)\/(?:refs\/heads\/|refs\/tags\/)?(.+)$/);
    }
    var ctx = repoContext();
    if (!m && ctx) {
      var pm = location.pathname.match(/(?:tree|blob)\/(?:refs\/heads\/|refs\/tags\/)?(.+)$/);
      if (pm) return JSD[0] + "/" + ctx.owner + "/" + ctx.repo + "@" + pm[1];
      var b = defaultBranch(ctx);
      if (b) return JSD[0] + "/" + ctx.owner + "/" + ctx.repo + "@" + b + "/";
    }
    if (!m) return null;
    var repoName = (u.match(/github\.com\/([^/]+\/[^/]+)\//i) ||
      u.match(/^\/([^/]+\/[^/]+)\//) || [])[1];
    if (!repoName && ctx) repoName = ctx.owner + "/" + ctx.repo;
    if (!repoName) return null;
    return JSD[0] + "/" + repoName.replace(/\/$/, "") + "@" + m[2];
  }

  /* ================================== 注入样式（仅保留 GitHub 原生类不覆盖的部分） ================================== */
  var MINIMAL_CSS = [
    // 菜单 li 基本定位 + 视觉去重（仅 2 行）
    "#fg-menu-li{list-style:none;position:relative;display:inline-block;}",
    "li#fg-menu-li ~ li#fg-menu-li{display:none;}"
  ].join("\n");

  function injectStyle() {
    if ($("#fg-style")) return;
    document.head.appendChild(el("style", { id: "fg-style", textContent: MINIMAL_CSS }));
  }

  /* ================================== 复制功能 ================================== */
  function copyText(text, btn) {
    function ok() {
      var old = btn.textContent;
      btn.textContent = "已复制";
      setTimeout(function () { btn.textContent = old; }, 1200);
    }
    function fallback() {
      var ta = el("textarea", { value: text });
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(fallback);
    } else fallback();
  }

  /* ============================== 主菜单（克隆与镜像） ============================== */
  function buildCloneRow(cmd, name, tip) {
    var row = el("div", { class: "Box-row d-flex flex-items-center px-3 py-1", title: tip || "" }, [
      el("span", { class: "Label Label--inline m-2 text-muted", text: name, title: tip || name }),
      el("input", {
        class: "form-control form-control-sm flex-grow-1 w-auto",
        type: "text", value: cmd, readonly: true, title: tip || name,
        style: "font-family:var(--font-mono);font-size:12px;min-width:0"
      }),
      el("button", { class: "btn btn-sm ml-2", type: "button", text: "复制", title: "复制命令" })
    ]);
    var input = row.querySelector("input");
    var copyBtn = row.querySelector("button");
    copyBtn.addEventListener("click", function () { copyText(cmd, copyBtn); });
    input.addEventListener("focus", function () { input.select(); });
    return row;
  }

  function buildMenu(ctx) {
    var li = el("li", { id: "fg-menu-li" });
    menuLi = li;

    var details = el("details", { id: "fg-details", class: "Box" });
    details.style.cssText = "position:relative;display:inline-block;width:400px;max-width:90vw;";

    var summary = el("summary", { title: "镜像站点与快速克隆", class: "btn btn-sm m-2" });
    summary.style.cssText = "list-style:none;display:inline-flex;align-items:center;gap:6px;cursor:pointer;width:auto;";
    summary.innerHTML = "克隆与镜像 " +
      '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" style="flex-shrink:0;opacity:.6">' +
      '<path fill="currentColor" d="M12.78 5.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 6.28a.75.75 0 0 1 1.06-1.06L8 8.94l3.72-3.72a.75.75 0 0 1 1.06 0Z"/></svg>';

    var panel = el("div", { class: "Box-header" });
    var tabs = el("div", { class: "UnderlineNav px-2" });
    var tabMain = el("button", { class: "UnderlineNav-octicon-btn m-1 py-2 font-bold", type: "button", text: "主要" });
    var tabOther = el("button", { class: "UnderlineNav-octicon-btn m-1 py-2", type: "button", text: "其他" });
    tabs.appendChild(tabMain);
    tabs.appendChild(tabOther);

    var body = el("div", { class: "Box-body p-0" });
    var paneMain = el("div", { class: "Box p-0" });
    var paneOther = el("div", { class: "Box p-0", hidden: true });

    /* ---- 主要 ---- */
    paneMain.appendChild(el("div", { class: "Box p-2 m-2 bg-subtle rounded-2", style: "font-size:12px;" }, [
      el("div", { class: "text-bold mb-1", text: "⚠ 提示" }),
      el("div", { text: "可在 Tampermonkey 脚本菜单「配置」中切换 git clone / --depth=1 前缀" }),
      el("div", { class: "text-danger mt-1", text: "请不要在镜像网站登录账号，若因此造成任何损失作者概不负责" })
    ]));

    paneMain.appendChild(el("div", { class: "h5 px-3 pt-3 text-bold text-muted", text: "快速克隆" }));
    var suffix = ctx.owner + "/" + ctx.repo + ".git";
    function cloneCmd(url) {
      return (CONFIG.cloneCmd ? "git clone " : "") + (CONFIG.depth ? "--depth=1 " : "") + url;
    }
    CloneSet.forEach(function (i) {
      var m = MirrorUrl[i];
      if (!m) return;
      paneMain.appendChild(buildCloneRow(cloneCmd(m[0] + "/" + suffix), m[1], m[2]));
    });
    paneMain.appendChild(buildCloneRow(cloneCmd(SSH_MIRROR[0] + suffix), SSH_MIRROR[1], SSH_MIRROR[2]));
    paneMain.appendChild(buildCloneRow(
      "git remote set-url origin https://github.com/" + suffix, "还原GitHub", "还原为 GitHub 官方仓库地址"));

    /* ---- ZIP 镜像下载（form-select） ---- */
    var zipPath = defaultZipPath(ctx);
    if (zipPath) {
      paneMain.appendChild(el("div", { class: "h5 px-3 pt-3 text-bold text-muted", text: "ZIP 归档加速下载" }));
      var zipSelect = el("select", { class: "form-select w-full p-2" });
      zipSelect.appendChild(el("option", { value: "", text: "选择镜像下载 ZIP" }));
      DownloadSet.forEach(function (i) {
        var m = MirrorUrl[i];
        zipSelect.appendChild(el("option", { value: m[0] + relPath(zipPath), text: m[1] + " - " + m[2] }));
      });
      zipSelect.addEventListener("change", function () {
        if (zipSelect.value) window.open(zipSelect.value, "_blank", "noopener");
      });
      paneMain.appendChild(el("div", { class: "px-3 pb-2" }, [zipSelect]));
    }

    /* ---- 镜像浏览 ---- */
    var jsd = jsDelivrFromUrl(location.href);
    if (jsd) {
      paneMain.appendChild(el("div", { class: "h5 px-3 pt-3 text-bold text-muted", text: "镜像浏览" }));
      paneMain.appendChild(el("a", { class: "Link p-2 d-block text-bold", href: jsd, target: "_blank", rel: "nofollow", title: JSD[2], text: "镜像浏览(" + JSD[1] + ")" }));
    }
    if (location.hostname !== "github.com") {
      paneMain.appendChild(el("a", {
        class: "Link p-2 d-block text-bold", href: "https://github.com" + location.pathname + location.search,
        target: "_blank", rel: "nofollow", text: "返回 GitHub 官方站"
      }));
    }

    /* ---- 其他 ---- */
    OtherUrl.forEach(function (u) {
      paneOther.appendChild(el("a", { class: "Link p-2 d-block", href: u[0], target: "_blank", rel: "nofollow", text: u[1] }));
    });

    tabMain.addEventListener("click", function () {
      tabMain.className = "UnderlineNav-octicon-btn m-1 py-2 font-bold";
      tabOther.className = "UnderlineNav-octicon-btn m-1 py-2";
      paneMain.hidden = false; paneOther.hidden = true;
    });
    tabOther.addEventListener("click", function () {
      tabOther.className = "UnderlineNav-octicon-btn m-1 py-2 font-bold";
      tabMain.className = "UnderlineNav-octicon-btn m-1 py-2";
      paneOther.hidden = false; paneMain.hidden = true;
    });

    body.appendChild(paneMain);
    body.appendChild(paneOther);
    panel.appendChild(tabs);
    panel.appendChild(body);
    details.appendChild(summary);
    details.appendChild(panel);
    li.appendChild(details);

    /* ---- 依次尝试所有 repo 子页面都能用的插入点 ---- */
    // 1. 仓库首页 header actions
    var bar = $("ul[data-testid='repo-header-actions']") || $("ul.pagehead-actions");
    if (bar) { bar.insertBefore(li, bar.firstChild); return true; }
    // 2. 仓库首页 visibility-label 旁边
    var label = $("[data-testid='repo-visibility-label']");
    if (label && label.parentElement && label.parentElement.parentElement) {
      var wrapHost = label.parentElement.parentElement;
      var wrap = el("div", { style: "display:inline-block;margin:0 8px;" });
      wrap.appendChild(li); wrapHost.appendChild(wrap);
      return true;
    }
    // 3. Blob 页 header（Edit/Raw 按钮组旁）
    var blobHeader = $("[class*='react-blob-header']") || $("[class*='blob-header']");
    if (blobHeader) {
      var blobWrap = el("div", { style: "display:inline-block;margin:0 8px;" });
      blobWrap.appendChild(li);
      blobHeader.insertBefore(blobWrap, blobHeader.firstChild);
      return true;
    }
    // 4. 面包屑导航末尾
    var crumbs = $("nav[aria-label='Breadcrumb']") || $("[data-testid='breadcrumbs']");
    if (crumbs) {
      var crumbWrap = el("div", { style: "display:inline-block;margin:0 8px;" });
      crumbWrap.appendChild(li);
      crumbs.insertBefore(crumbWrap, crumbs.firstChild);
      return true;
    }
    // 5. 通用 fallback：#repo-content-pjax-container 开头
    var pjax = $("#repo-content-pjax-container");
    if (pjax && pjax.firstElementChild) {
      var pjaxWrap = el("div", { style: "display:inline-block;margin:8px 0;" });
      pjaxWrap.appendChild(li);
      pjax.insertBefore(pjaxWrap, pjax.firstElementChild);
      return true;
    }
    return false;
  }

  /* ====================== 增强原生 Code 下拉里的 Download ZIP（form-select） ====================== */
  function augmentCodePanel() {
    $$("a[href*='/archive/refs/'][href$='.zip']").forEach(function (a) {
      if (a.dataset.fgZip) return;
      if (!a.closest("[class*='ActionList'], .get-repo-form, details")) return;
      a.dataset.fgZip = "1";
      var baseLi = a.closest("li") || a.parentElement;
      var host = baseLi.parentNode;
      var insertRef = baseLi.nextSibling;
      var sel = el("select", { class: "form-select m-2", style: "width:auto;min-width:180px;font-size:12px;" });
      sel.appendChild(el("option", { value: "", text: "选择镜像下载 ZIP" }));
      DownloadSet.forEach(function (i) {
        var m = MirrorUrl[i];
        sel.appendChild(el("option", { value: m[0] + relPath(a.getAttribute("href")), text: m[1] + " - " + m[2] }));
      });
      sel.addEventListener("change", function () {
        if (sel.value) window.open(sel.value, "_blank", "noopener");
      });
      if (host) host.insertBefore(sel, insertRef);
    });
  }

  /* ============================== Releases 资产按钮（form-select） ============================== */
  function injectReleaseAssets() {
    if (location.pathname.split("/")[3] !== "releases") return;
    $$("a[href*='/releases/download/']").forEach(function (a) {
      if (a.dataset.fgRel) return;
      var row = a.closest("li.Box-row");
      if (!row) return;
      a.dataset.fgRel = "1";
      var sel = el("select", { class: "form-select m-2", style: "width:auto;min-width:180px;font-size:12px;" });
      sel.appendChild(el("option", { value: "", text: "选择镜像下载" }));
      DownloadSet.forEach(function (i) {
        var m = MirrorUrl[i];
        sel.appendChild(el("option", { value: m[0] + relPath(a.getAttribute("href")), text: m[1] + " - " + m[2] }));
      });
      sel.addEventListener("change", function () {
        if (sel.value) window.open(sel.value, "_blank", "noopener");
      });
      row.appendChild(sel);
    });
  }

  /* ================================== Raw 按钮（form-select） ================================== */
  function injectRawButtons() {
    var host = $("a[data-testid='raw-button'], a#raw-url");
    if (!host || host.dataset.fgRaw) return;
    host.dataset.fgRaw = "1";
    var href = host.getAttribute("href") || "";
    var rel = relPath(href);
    var item = host.closest("div[class*='ButtonGroup-Item']") || host.parentElement;
    var sel = el("select", { class: "form-select m-2", style: "width:auto;min-width:160px;font-size:12px;" });
    sel.appendChild(el("option", { value: "", text: "镜像 Raw 下载" }));
    RawSet.forEach(function (i) {
      var m = MirrorUrl[i];
      sel.appendChild(el("option", { value: m[0] + rel, text: m[1] }));
    });
    var jsd = jsDelivrFromUrl(href);
    if (jsd) sel.appendChild(el("option", { value: jsd, text: JSD[1] + " " + JSD[2] }));
    sel.addEventListener("change", function () {
      if (sel.value) window.open(sel.value, "_blank", "noopener");
    });
    if (item.parentNode) item.parentNode.insertBefore(sel, item.nextSibling);
  }

  /* ================================== GM_registerMenuCommand 配置菜单 ================================== */
  function registerConfigMenu() {
    if (typeof GM_registerMenuCommand !== "function") return;
    // 克隆命令前缀配置
    GM_registerMenuCommand(
      "配置：克隆命令带 git clone 前缀（当前：" + (CONFIG.cloneCmd ? "开" : "关") + "）",
      function () {
        CONFIG.cloneCmd = !CONFIG.cloneCmd;
        saveConfig();
        alert("克隆命令前缀：git clone → " + (CONFIG.cloneCmd ? "开" : "关") + "\n刷新页面生效");
      }
    );
    GM_registerMenuCommand(
      "配置：克隆命令带 --depth=1（当前：" + (CONFIG.depth ? "开" : "关") + "）",
      function () {
        CONFIG.depth = !CONFIG.depth;
        saveConfig();
        alert("克隆命令前缀：--depth=1 → " + (CONFIG.depth ? "开" : "关") + "\n刷新页面生效");
      }
    );
  }

  /* ================================== 调度入口 ================================== */
  var lastKey = "";
  var menuLi = null;
  function scan() {
    injectStyle();
    var ctx = repoContext();
    if (ctx) {
      var key = ctx.owner + "/" + ctx.repo;
      if (menuLi && key === lastKey) {
        var liveBar = $("ul[data-testid='repo-header-actions']") || $("ul.pagehead-actions");
        if (liveBar && !liveBar.contains(menuLi)) {
          liveBar.insertBefore(menuLi, liveBar.firstChild);
        }
      } else if (key !== lastKey || !menuLi) {
        if (buildMenu(ctx)) { menuLi = $("#fg-menu-li"); lastKey = key; }
      }
      $$("li#fg-menu-li").forEach(function (n) {
        if (n !== menuLi) n.remove();
      });
    }
    augmentCodePanel();
    injectReleaseAssets();
    injectRawButtons();
  }

  var timer = null;
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(scan, 200);
  }

  document.addEventListener("click", function (e) {
    var d = $("#fg-details");
    if (d && d.open && !d.contains(e.target)) d.open = false;
  }, true);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var d = $("#fg-details");
      if (d) d.open = false;
    }
  });

  scan();
  // 启动阶段多次重试 —— 应对 GitHub React hydrate 延迟
  var _startupRetries = 0;
  var _startupTimer = setInterval(function () {
    _startupRetries++;
    scan();
    if (_startupRetries >= 8) clearInterval(_startupTimer);
  }, 500);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  ["turbo:load", "turbo:render"].forEach(function (ev) {
    document.addEventListener(ev, schedule);
  });
  window.addEventListener("popstate", schedule);
  ["pushState", "replaceState"].forEach(function (fn) {
    var raw = history[fn];
    history[fn] = function () {
      var ret = raw.apply(this, arguments);
      schedule();
      return ret;
    };
  });
  setInterval(function () {
    if (!menuLi) return;
    $$("li#fg-menu-li").forEach(function (n) {
      if (n !== menuLi && !menuLi.contains(n)) n.remove();
    });
  }, 1500);

  registerConfigMenu();
})();
