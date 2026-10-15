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
// @grant         none
// @run-at        document-idle
// @version       2.0.0
// ==/UserScript==

(function () {
  "use strict";

  /* ===================== 可编辑配置（无注释字段可直接编辑） ===================== */
  var CONFIG = {
    cloneCmd: true,   // 克隆行是否带 "git clone"
    depth: true       // 克隆行是否带 "--depth=1"
  };

  /* MirrorUrl[i] = [前缀, 名称, 提示]
   * 下载/克隆类前缀拼接规则: 前缀 + GitHub 完整链接(以 https://github.com 起始)
   * 实测 2026-10，仅保留实测可用的节点；z2 等临时不可用节点见下方注释。
   * 历史镜像(fastgit/cnpmjs/bajins/wuyanzheshui/rc1844 worker/cors.zme.ink/ghproxy.com旧域名等)
   * 已全部死亡，故移除，git 历史中可查。 */
  var MirrorUrl = new Array();
  MirrorUrl[0] = ["https://eo.gh-proxy.cn/github/https://github.com", "gh-proxy.cn", "gh-proxy.cn 官方推荐入口(腾讯云EdgeOne)，支持clone/raw/zip/releases，支持断点续传，只加速文件不代理网页"];
  MirrorUrl[1] = ["https://z1.gh-proxy.cn/github/https://github.com", "gh-proxy z1", "gh-proxy.cn EdgeOne加速-1，支持clone/raw/zip/releases，支持断点续传"];
  MirrorUrl[2] = ["https://z3.gh-proxy.cn/github/https://github.com", "gh-proxy z3", "gh-proxy.cn EdgeOne加速-3，支持clone/raw/zip/releases，支持断点续传"];
  MirrorUrl[3] = ["https://cf.gh-proxy.cn/github/https://github.com", "gh-proxy cf", "gh-proxy.cn Cloudflare优选节点，支持clone/raw/zip/releases，支持断点续传"];
  MirrorUrl[4] = ["https://gh-proxy.com/https://github.com", "gh-proxy.com", "开源公益GitHub文件代理，支持clone/raw/zip/releases，节点由社区贡献"];
  MirrorUrl[5] = ["https://ghproxy.net/https://github.com", "ghproxy.net", "公益GitHub文件加速，支持clone/raw/zip/releases"];
  MirrorUrl[6] = ["https://ghfast.top/https://github.com", "ghfast.top", "公益加速，脚本环境实测仅可用于克隆，文件下载请选其它入口"];
  MirrorUrl[7] = ["https://gitclone.com/github.com", "GitClone", "GitHub缓存加速网站，仅克隆有效"];
  // gh-proxy.cn z2 节点(https://z2.gh-proxy.cn)此前返回423锁定；若已恢复可取消注释并把 8 加入下方对应 Set
  // MirrorUrl[8] = ["https://z2.gh-proxy.cn/github/https://github.com", "gh-proxy z2", "gh-proxy.cn EdgeOne加速-2"];

  // 专用克隆镜像(SSH形式，前缀 + owner/repo.git)
  var SSH_MIRROR = ["git@git.zhlh6.cn:", "加速你的Github", "利用ucloud提供的GlobalSSH，仅克隆有效"];
  // 专用文件镜像
  var JSD = ["https://cdn.jsdelivr.net/gh", "jsDelivr", "通过CDN浏览/读取单个文件，单包总体积有限制(约50MB)，无Release/ZIP加速"];

  // 添加对应索引即可（重写后按“能力”拆分，避免把不能下载的站点放进下载列表）
  var CloneSet    = [0, 1, 2, 3, 4, 5, 6, 7];
  var DownloadSet = [0, 1, 2, 3, 4, 5];
  var RawSet      = [0, 1, 2, 3, 4, 5];
  // 注意: 这些服务“只加速文件不代理网页”，因此没有镜像浏览集合；文件浏览只有 jsDelivr 特殊处理

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

  function absUrl(u) {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    return location.origin + (u.charAt(0) === "/" ? u : "/" + u);
  }

  // 当前仓库 owner/repo（非仓库页返回 null）
  function repoContext() {
    var p = location.pathname.split("/").filter(Boolean);
    var banned = ["features", "marketplace", "orgs", "settings", "search", "login", "signup",
      "about", "pricing", "topics", "trending", "explore", "notifications", "new", "dashboard"];
    if (p.length < 2 || banned.indexOf(p[0]) !== -1) return null;
    return { owner: p[0], repo: p[1], parts: p };
  }

  // 页面内嵌数据中的默认分支 ZIP 路径（Code 面板未打开时兜底）
  var zipCache;
  function defaultZipPath(ctx) {
    if (zipCache !== undefined) return zipCache;
    zipCache = null;
    try {
      var m = document.documentElement.innerHTML.match(/"zipballUrl":"(\/[^"]+?\.zip)"/);
      if (m) zipCache = m[1].replace(/\\u0026/g, "&");
    } catch (e) { }
    if (!zipCache) {
      // 最后兜底：/owner/repo/tree/<分支(可含/)>
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

  // jsDelivr 链接：/owner/repo/(raw|blob)/[refs/heads/|refs/tags/]ref/path -> gh/owner/repo@ref/path
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

  /* ================================ 注入样式（一次性） ================================ */
  var STYLE = [
    "#fg-menu-li{list-style:none;position:relative;display:inline-block;}",
    ".fg-details{position:relative;}",
    ".fg-details>summary{list-style:none;display:inline-flex;align-items:center;gap:6px;cursor:pointer;",
    "padding:3px 12px;font-size:14px;font-weight:500;line-height:20px;border-radius:6px;",
    "color:var(--color-fg-default,#1f2328);background:var(--color-btn-bg,#f6f8fa);",
    "border:1px solid var(--color-btn-border,#d0d7de);user-select:none;white-space:nowrap;}",
    ".fg-details>summary::-webkit-details-marker{display:none;}",
    ".fg-details>summary:hover{background:var(--color-btn-hover-bg,#f3f4f6);border-color:var(--color-btn-hover-border,#afb8c1);}",
    ".fg-caret{width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid currentColor;opacity:.7;}",
    ".fg-panel{position:absolute;top:calc(100% + 6px);right:0;z-index:1000;width:420px;max-width:90vw;",
    "background:var(--color-canvas-overlay,var(--color-canvas-default,#fff));",
    "border:1px solid var(--color-border-default,#d0d7de);border-radius:12px;",
    "box-shadow:0 8px 24px rgba(140,149,159,.2);overflow:hidden;}",
    ".fg-tabs{display:flex;border-bottom:1px solid var(--color-border-muted,#d8dee4);background:var(--color-canvas-subtle,#f6f8fa);}",
    ".fg-tab{flex:1;padding:8px 0;border:0;background:transparent;font-size:14px;cursor:pointer;color:var(--color-fg-muted,#59636e);}",
    ".fg-tab.fg-on{color:var(--color-fg-default,#1f2328);font-weight:600;box-shadow:inset 0 -2px 0 var(--color-primer-accent-fg,#fd8c73);}",
    ".fg-body{max-height:min(70vh,560px);overflow:auto;padding:8px;}",
    ".fg-sec{font-size:12px;font-weight:600;color:var(--color-fg-muted,#59636e);padding:8px 8px 4px;}",
    ".fg-warn{margin:0 4px 6px;padding:6px 8px;font-size:12px;border-radius:6px;}",
    ".fg-warn.a{background:#fff8c5;color:#7d4e00;border:1px solid #d4a72c66;}",
    ".fg-warn.b{background:#ffebe9;color:#cf222e;border:1px solid #ff818266;}",
    ".fg-row{display:flex;align-items:center;gap:6px;padding:3px 4px;}",
    ".fg-row .fg-name{flex:0 0 96px;font-size:12px;color:var(--color-fg-muted,#59636e);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
    ".fg-in{flex:1;min-width:0;padding:4px 8px;font-size:12px;border:1px solid var(--color-border-default,#d0d7de);",
    "border-radius:6px;background:var(--color-canvas-default,#fff);color:var(--color-fg-default,#1f2328);}",
    ".fg-copy{flex:0 0 auto;padding:3px 9px;font-size:12px;border-radius:6px;cursor:pointer;",
    "border:1px solid var(--color-btn-border,#d0d7de);background:var(--color-btn-bg,#f6f8fa);color:var(--color-fg-default,#1f2328);}",
    ".fg-copy:hover{background:var(--color-btn-hover-bg,#f3f4f6);}",
    ".fg-item{display:block;padding:8px 10px;border-radius:6px;font-size:13px;color:var(--color-fg-default,#1f2328);text-decoration:none;}",
    ".fg-item:hover{background:var(--color-canvas-subtle,#f6f8fa);}",
    ".fg-zip{display:inline-block;margin:3px 6px 3px 0;padding:3px 10px;font-size:12px;border-radius:6px;text-decoration:none;",
    "border:1px solid var(--color-border-default,#d0d7de);color:var(--color-fg-default,#1f2328);background:var(--color-canvas-default,#fff);}",
    ".fg-zip:hover{background:var(--color-canvas-subtle,#f6f8fa);}",
    ".fg-asset-row{flex-basis:100%;display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;padding-top:6px;border-top:1px dashed var(--color-border-muted,#d8dee4);}",
    ".fg-asset-row a{font-size:12px;padding:2px 8px;border-radius:20px;text-decoration:none;",
    "border:1px solid var(--color-border-default,#d0d7de);color:var(--color-accent-fg,#0969da);background:var(--color-canvas-default,#fff);}",
    ".fg-asset-row a:hover{background:var(--color-canvas-subtle,#f6f8fa);}"
  ].join("\n");

  function injectStyle() {
    if ($("#fg-style")) return;
    document.head.appendChild(el("style", { id: "fg-style", textContent: STYLE }));
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
    var input = el("input", {
      class: "fg-in", type: "text", value: cmd, readonly: true, title: tip || name,
      "aria-label": cmd
    });
    var copyBtn = el("button", { class: "fg-copy", type: "button", text: "复制", title: "复制命令" });
    copyBtn.addEventListener("click", function () { copyText(cmd, copyBtn); });
    input.addEventListener("focus", function () { input.select(); });
    return el("div", { class: "fg-row", title: tip || "" }, [
      el("span", { class: "fg-name", text: name, title: tip || name }), input, copyBtn
    ]);
  }

  function buildMenu(ctx) {
    var old = $("#fg-menu-li");
    if (old) old.remove();

    var details = el("details", { id: "fg-details", class: "fg-details" });
    var summary = el("summary", { title: "镜像站点与快速克隆" }, [
      document.createTextNode("克隆与镜像"),
      el("span", { class: "fg-caret" })
    ]);
    var panel = el("div", { class: "fg-panel" });
    var tabs = el("div", { class: "fg-tabs" });
    var tabMain = el("button", { class: "fg-tab fg-on", type: "button", text: "主要" });
    var tabOther = el("button", { class: "fg-tab", type: "button", text: "其他" });
    tabs.appendChild(tabMain);
    tabs.appendChild(tabOther);

    var body = el("div", { class: "fg-body" });
    var paneMain = el("div");
    var paneOther = el("div", { hidden: true });

    /* ---- 主要 ---- */
    paneMain.appendChild(el("div", { class: "fg-warn a", text: "可编辑脚本顶部 CONFIG 关闭 clone / --depth=1 前缀" }));
    paneMain.appendChild(el("div", { class: "fg-warn b", text: "请不要在镜像网站登录账号，若因此造成任何损失作者概不负责" }));

    paneMain.appendChild(el("div", { class: "fg-sec", text: "快速克隆" }));
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

    /* ---- ZIP 镜像下载 ---- */
    var zipPath = defaultZipPath(ctx);
    if (zipPath) {
      paneMain.appendChild(el("div", { class: "fg-sec", text: "ZIP 归档加速下载" }));
      var zipBox = el("div", { style: "padding:2px 4px 6px;" });
      DownloadSet.forEach(function (i) {
        var m = MirrorUrl[i];
        zipBox.appendChild(el("a", {
          class: "fg-zip", href: m[0] + absUrl(zipPath), target: "_blank",
          rel: "nofollow", title: m[2], text: "ZIP(" + m[1] + ")"
        }));
      });
      paneMain.appendChild(zipBox);
    }

    /* ---- 镜像浏览（仅 jsDelivr，可看源码/图片） ---- */
    var jsd = jsDelivrFromUrl(location.href);
    if (jsd) {
      paneMain.appendChild(el("div", { class: "fg-sec", text: "镜像浏览" }));
      paneMain.appendChild(el("a", { class: "fg-item", href: jsd, target: "_blank", rel: "nofollow", title: JSD[2], text: "镜像浏览(" + JSD[1] + ")" }));
    }
    if (location.hostname !== "github.com") {
      paneMain.appendChild(el("a", {
        class: "fg-item", href: "https://github.com" + location.pathname + location.search,
        target: "_blank", rel: "nofollow", text: "返回 GitHub 官方站"
      }));
    }

    /* ---- 其他 ---- */
    OtherUrl.forEach(function (u) {
      paneOther.appendChild(el("a", { class: "fg-item", href: u[0], target: "_blank", rel: "nofollow", text: u[1] }));
    });

    tabMain.addEventListener("click", function () {
      tabMain.classList.add("fg-on"); tabOther.classList.remove("fg-on");
      paneMain.hidden = false; paneOther.hidden = true;
    });
    tabOther.addEventListener("click", function () {
      tabOther.classList.add("fg-on"); tabMain.classList.remove("fg-on");
      paneOther.hidden = false; paneMain.hidden = true;
    });

    body.appendChild(paneMain);
    body.appendChild(paneOther);
    panel.appendChild(tabs);
    panel.appendChild(body);
    details.appendChild(summary);
    details.appendChild(panel);
    var li = el("li", { id: "fg-menu-li" });
    li.appendChild(details);

    var bar = $("ul[data-testid='repo-header-actions']") || $("ul.pagehead-actions");
    if (bar) {
      bar.insertBefore(li, bar.firstChild);
      return true;
    }
    // 极端情况的兜底：挂到 Public 标签旁
    var label = $("[data-testid='repo-visibility-label']");
    if (label && label.parentElement && label.parentElement.parentElement) {
      var wrap = el("div", { style: "display:inline-block;margin:0 8px;" });
      wrap.appendChild(details);
      label.parentElement.parentElement.appendChild(wrap);
      return true;
    }
    return false;
  }

  /* ====================== 增强原生 Code 下拉里的 Download ZIP ====================== */
  function augmentCodePanel() {
    $$("a[href*='/archive/refs/'][href$='.zip']").forEach(function (a) {
      if (a.dataset.fgZip) return;
      // 仅处理 Code 克隆面板里的 ZIP（避免误伤 releases 的 Source code）
      if (!a.closest("[class*='ActionList'], .get-repo-form, details")) return;
      a.dataset.fgZip = "1";
      var li = a.closest("li") || a.parentElement;
      DownloadSet.forEach(function (i) {
        var m = MirrorUrl[i];
        var node = li.cloneNode(true);
        var aa = node.querySelector("a") || node;
        aa.removeAttribute("id");
        aa.setAttribute("href", m[0] + absUrl(a.getAttribute("href")));
        aa.setAttribute("title", m[2]);
        aa.setAttribute("rel", "nofollow");
        aa.setAttribute("target", "_blank");
        aa.textContent = "Download ZIP(" + m[1] + ")";
        if (li.parentNode) li.parentNode.insertBefore(node, li.nextSibling);
        else a.parentNode.insertBefore(node, a.nextSibling);
        li = node;
      });
    });
  }

  /* ============================== Releases 资产按钮 ============================== */
  function injectReleaseAssets() {
    if (location.pathname.split("/")[3] !== "releases") return;
    $$("a[href*='/releases/download/']").forEach(function (a) {
      if (a.dataset.fgRel) return;
      var row = a.closest("li.Box-row");
      if (!row) return; // 资产片段懒加载完成后才会有
      a.dataset.fgRel = "1";
      var wrap = el("div", { class: "fg-asset-row" });
      DownloadSet.forEach(function (i) {
        var m = MirrorUrl[i];
        wrap.appendChild(el("a", {
          href: m[0] + absUrl(a.getAttribute("href")), target: "_blank",
          rel: "nofollow", title: m[2], text: m[1]
        }));
      });
      row.appendChild(wrap);
    });
  }

  /* ================================== Raw 按钮 ================================== */
  function injectRawButtons() {
    var host = $("a[data-testid='raw-button'], a#raw-url");
    if (!host || host.dataset.fgRaw) return;
    host.dataset.fgRaw = "1";
    var href = host.getAttribute("href") || "";
    var abs = absUrl(href);
    var anchorNode = host.closest("div"); // 新版 ButtonGroup 的 item 包裹层

    function makeSibling(url, name, tip) {
      var a;
      var wrapper = null;
      if (host.dataset.testid === "raw-button" && anchorNode && anchorNode.className &&
          /ButtonGroup-Item/i.test(anchorNode.className)) {
        wrapper = anchorNode.cloneNode(false);
        a = host.cloneNode(true);
      } else {
        a = host.cloneNode(true);
      }
      a.removeAttribute("id");
      a.setAttribute("href", url);
      a.setAttribute("title", tip);
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "nofollow");
      var txt = a.querySelector("[data-component='text']");
      if (txt) txt.textContent = name; else a.textContent = name;
      if (wrapper) { wrapper.appendChild(a); return wrapper; }
      a.className = "fg-zip";
      return a;
    }

    var prev = anchorNode || host;
    var nodes = [];
    RawSet.forEach(function (i) {
      var m = MirrorUrl[i];
      nodes.push(makeSibling(m[0] + abs, m[1], m[2]));
    });
    var jsd = jsDelivrFromUrl(abs);
    if (jsd) nodes.push(makeSibling(jsd, JSD[1], JSD[2]));
    nodes.forEach(function (n) {
      if (prev.parentNode) prev.parentNode.insertBefore(n, prev.nextSibling);
      prev = n;
    });
  }

  /* ================================== 调度入口 ================================== */
  var lastKey = "";
  function scan() {
    injectStyle();
    var ctx = repoContext();
    var bar = $("ul[data-testid='repo-header-actions']") || $("ul.pagehead-actions");
    if (ctx && bar) {
      var key = ctx.owner + "/" + ctx.repo + "|" + location.pathname;
      if (key !== lastKey || !$("#fg-menu-li")) {
        zipCache = undefined;
        if (buildMenu(ctx)) lastKey = key;
      }
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

  // 点击菜单外部或按 Esc 关闭（全局只注册一次，#fg-details 每次重建后自动生效）
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

  // 1) 先跑一次
  scan();
  // 2) DOM 变动（React 重渲染、include-fragment 懒加载资产、Code 面板弹出）
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  // 3) Turbo 软导航
  ["turbo:load", "turbo:render"].forEach(function (ev) {
    document.addEventListener(ev, schedule);
  });
  window.addEventListener("popstate", schedule);
  // 4) 兜底：劫持 pushState/replaceState
  ["pushState", "replaceState"].forEach(function (fn) {
    var raw = history[fn];
    history[fn] = function () {
      var ret = raw.apply(this, arguments);
      schedule();
      return ret;
    };
  });
})();
