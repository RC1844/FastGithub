// ==UserScript==
// @icon          https://github.githubassets.com/favicon.ico
// @name          FastGithub 镜像加速访问、克隆和下载
// @namespace     RC1844.FastGithub
// @author        RC1844
// @homepageURL   https://github.com/RC1844/FastGithub
// @supportURL    https://github.com/RC1844/FastGithub/issues
// @license       MIT License
// @description   镜像访问GitHub,极速Clone、Raw、Release资产、ZIP加速；适配 2025+ 新版 GitHub 页面，纯原生JS无外部依赖，自动复用 GitHub Primer React 组件样式
// @include       *://github.com/*
// @include       *://github*
// @include       *://hub.fastgit.xyz/*
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_registerMenuCommand
// @run-at        document-idle
// @version       3.1.0
// ==/UserScript==

(function () {
  "use strict";

  /* ===================== 可编辑配置（GM_setValue/GM_getValue 持久化） ===================== */
  var CONFIG = { cloneCmd: true, depth: true };
  try {
    if (typeof GM_getValue === "function") {
      var saved = GM_getValue("fgConfig", null);
      if (saved) CONFIG = Object.assign(CONFIG, saved);
    }
  } catch (e) { }
  function saveConfig() {
    try { if (typeof GM_setValue === "function") GM_setValue("fgConfig", CONFIG); } catch (e) { }
  }

  /* MirrorUrl[i] = [前缀, 名称, 提示] */
  var MirrorUrl = new Array();
  MirrorUrl[0] = ["https://eo.gh-proxy.cn/github/https://github.com", "gh-proxy.cn", "gh-proxy.cn 官方推荐入口(腾讯云EdgeOne)，支持clone/raw/zip/releases，支持断点续传，只加速文件不代理网页"];
  MirrorUrl[1] = ["https://z1.gh-proxy.cn/github/https://github.com", "gh-proxy z1", "gh-proxy.cn EdgeOne加速-1，支持clone/raw/zip/releases，支持断点续传"];
  MirrorUrl[2] = ["https://z3.gh-proxy.cn/github/https://github.com", "gh-proxy z3", "gh-proxy.cn EdgeOne加速-3，支持clone/raw/zip/releases，支持断点续传"];
  MirrorUrl[3] = ["https://cf.gh-proxy.cn/github/https://github.com", "gh-proxy cf", "gh-proxy.cn Cloudflare优选节点，支持clone/raw/zip/releases，支持断点续传"];
  MirrorUrl[4] = ["https://gh-proxy.com/https://github.com", "gh-proxy.com", "开源公益GitHub文件代理，支持clone/raw/zip/releases，节点由社区贡献"];
  MirrorUrl[5] = ["https://ghproxy.net/https://github.com", "ghproxy.net", "公益GitHub文件加速，支持clone/raw/zip/releases"];
  MirrorUrl[6] = ["https://ghfast.top/https://github.com", "ghfast.top", "公益加速，脚本环境实测仅可用于克隆，文件下载请选其它入口"];
  MirrorUrl[7] = ["https://gitclone.com/github.com", "GitClone", "GitHub缓存加速网站，仅克隆有效"];
  MirrorUrl[8] = ["https://gh.llkk.cc/https://github.com", "gh.llkk.cc", "公益加速，支持clone/raw/zip/releases（国内常用，部分海外网络可能不可达）"];
  MirrorUrl[9] = ["https://hub.ddayh.com/https://github.com", "hub.ddayh.com", "公益加速，支持clone/raw/zip/releases"];
  MirrorUrl[10] = ["https://gh.con.sh/https://github.com", "gh.con.sh", "公益加速，支持clone/raw/zip/releases"];
  MirrorUrl[11] = ["https://fastgit.cc/https://github.com", "fastgit.cc", "FastGit 公益加速，支持clone/raw/zip/releases"];
  MirrorUrl[12] = ["https://git.yylx.win/https://github.com", "git.yylx.win", "公益加速，支持clone/raw/zip/releases"];
  MirrorUrl[13] = ["https://ghproxy.monkeyray.net/https://github.com", "ghproxy.monkeyray.net", "公益加速，支持clone/raw/zip/releases"];
  MirrorUrl[14] = ["https://tvv.tw/https://github.com", "tvv.tw", "公益加速，支持clone/raw/zip/releases"];
  MirrorUrl[15] = ["https://ghproxy.it/https://github.com", "ghproxy.it", "美国Cloudflare CDN公益加速，支持clone/raw/zip/releases"];
  MirrorUrl[16] = ["https://gh.monlor.com/https://github.com", "gh.monlor.com", "公益加速，支持clone/raw/zip/releases"];
  MirrorUrl[17] = ["https://wget.la/https://github.com", "wget.la", "公益加速，支持clone/raw/zip/releases"];
  MirrorUrl[18] = ["https://hk.gh-proxy.org/https://github.com", "hk.gh-proxy.org", "gh-proxy.org 香港节点，支持clone/raw/zip/releases"];
  MirrorUrl[19] = ["https://cdn.gh-proxy.org/https://github.com", "cdn.gh-proxy.org", "gh-proxy.org 日本节点，支持clone/raw/zip/releases"];
  MirrorUrl[20] = ["https://edgeone.gh-proxy.org/https://github.com", "edgeone.gh-proxy.org", "gh-proxy.org 多国节点，支持clone/raw/zip/releases"];
  MirrorUrl[21] = ["https://github.moeyy.xyz/https://github.com", "github.moeyy.xyz", "公益加速，支持clone/raw/zip/releases（部分海外网络可能不可达）"];
  MirrorUrl[22] = ["https://gh.ddlc.top/https://github.com", "gh.ddlc.top", "美国Cloudflare CDN公益加速，高并发时可能限流"];
  MirrorUrl[23] = ["https://github.boki.moe/https://github.com", "github.boki.moe", "美国Cloudflare CDN公益加速，支持clone/raw/zip/releases"];
  MirrorUrl[24] = ["https://ghfile.geekertao.top/https://github.com", "ghfile.geekertao.top", "公益加速，支持clone/raw/zip/releases"];
  MirrorUrl[25] = ["https://ghp.keleyaa.com/https://github.com", "ghp.keleyaa.com", "公益加速，支持clone/raw/zip/releases"];
  MirrorUrl[26] = ["https://gh.chjina.com/https://github.com", "gh.chjina.com", "公益加速，支持clone/raw/zip/releases"];
  MirrorUrl[27] = ["https://ghpxy.hwinzniej.top/https://github.com", "ghpxy.hwinzniej.top", "公益加速，支持clone/raw/zip/releases"];
  MirrorUrl[28] = ["https://cdn.crashmc.com/https://github.com", "cdn.crashmc.com", "公益加速，支持clone/raw/zip/releases"];
  MirrorUrl[29] = ["https://gh.idayer.com/https://github.com", "gh.idayer.com", "公益加速，支持clone/raw/zip/releases"];

  var SSH_MIRROR = ["git@git.zhlh6.cn:", "加速你的Github", "利用ucloud提供的GlobalSSH，仅克隆有效"];
  var JSD = ["https://cdn.jsdelivr.net/gh", "jsDelivr", "通过CDN浏览/读取单个文件，单包总体积有限制(约50MB)，无Release/ZIP加速"];

  var ALL_MIRRORS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29];

  var CloneSet    = ALL_MIRRORS;
  var DownloadSet = ALL_MIRRORS;
  var RawSet      = ALL_MIRRORS;

  var OtherUrl = [
    ["https://github.com/RC1844/FastGithub", "脚本Github仓库地址,点个赞谢谢"],
    ["https://greasyfork.org/zh-CN/scripts/397419", "GreasyFork地址,希望可以给我评分收藏"],
    ["https://gitclone.com", "GitClone"],
    ["https://www.gh-proxy.cn/github/", "gh-proxy.cn GitHub加速(官方站)"],
    ["https://www.gh-proxy.cn/nodes", "gh-proxy.cn 节点状态/延迟"],
    ["https://gh-proxy.com", "gh-proxy.com 公益代理"],
    ["https://ghproxy.net", "ghproxy.net 公益加速"],
    ["https://ghfast.top", "ghfast.top 公益加速"],
    ["https://gh-proxy.org", "gh-proxy.org 公益加速(香港/日本/CDN多节点)"],
    ["https://fastgit.cc", "FastGit 公益加速"],
    ["https://wget.la", "wget.la 公益加速"],
    ["https://github.moeyy.xyz", "moeyy GitHub 加速"],
    ["https://minhaskamal.github.io/DownGit", "DownGit"],
    ["https://zhoudaxiaa.gitee.io", "DownGit 周大侠啊"],
    ["https://d.serctl.com", "GitHub中转下载"],
    ["https://toolwa.com", "孟坤工具箱"],
    ["https://github.zhlh6.cn/", "加速你的Github"],
    ["https://gitee.com/organizations/mirrors/projects", "Gitee 极速下载"],
    ["https://codechina.csdn.net/mirrors", "CSDN Mirrors 镜像仓库"]
  ];

  /* ================================== 工具函数 ================================== */
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k];
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
    if (!m) m = u.match(/^\/([^/]+)\/[^/]+\/(?:raw|blob)\/(?:refs\/heads\/|refs\/tags\/)?(.+)$/);
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

  /* ================================== 动态探测 GitHub Primer React 组件样式 ==================================
   * GitHub 2025+ 前端使用 CSS Modules（哈希类名随构建变化）+ data-component 属性（稳定）。
   * 启动时从原生 DOM 探测出当前版本的哈希类名和 computedStyle，之后构造注入 UI 时精确复用。 */
  var GH = {
    buttonClass: "",            // prc-Button-ButtonBase-*
    actionMenuButtonClass: "",  // prc-Button-ButtonBase-* + ActionMenu_Button__*
    labelClass: "",             // prc-Button-Label-*
    buttonContentClass: "",     // prc-Button-ButtonContent-*
    leadingVisualClass: "",     // prc-Button-Visual-* prc-Button-LeadingVisual-* prc-Button-VisualWrap-*
    boxClass: "",               // Box_* 容器
    inputClass: "",             // prc-components-Input-*
    // computedStyle 精确值（Primer 主题 Token）
    cs: {
      btn: null,   // default small button
      select: null, // 下拉框主题
      box: null,    // panel 容器主题
      link: null    // 链接主题
    }
  };

  function detectGitHubStyle() {
    // 1. 普通按钮（prc-Button-ButtonBase-*）
    var btn = document.querySelector('[data-component="Button"][data-size="small"][data-variant="default"]');
    if (!btn) btn = document.querySelector('[data-component="Button"]');
    if (btn) {
      GH.buttonClass = btn.className;
      GH.cs.btn = {
        bg: getComputedStyle(btn).backgroundColor,
        border: getComputedStyle(btn).border,
        radius: getComputedStyle(btn).borderRadius,
        padding: getComputedStyle(btn).padding,
        height: getComputedStyle(btn).height,
        color: getComputedStyle(btn).color,
        fontSize: getComputedStyle(btn).fontSize,
        fontFamily: getComputedStyle(btn).fontFamily,
        cursor: getComputedStyle(btn).cursor,
        display: getComputedStyle(btn).display,
        alignItems: getComputedStyle(btn).alignItems
      };
      // 内部结构 class
      var content = btn.querySelector('[data-component="buttonContent"]');
      if (content) GH.buttonContentClass = content.className;
      var leading = btn.querySelector('[data-component="leadingVisual"]');
      if (leading) GH.leadingVisualClass = leading.className;
      var label = btn.querySelector('[data-component="text"]');
      if (label) GH.labelClass = label.className;
    }

    // 2. ActionMenu.Button（带弹出菜单的触发器按钮）
    var amb = document.querySelector('[class*="ActionMenu_Button"], [data-component="ActionMenu.Button"]');
    if (amb) GH.actionMenuButtonClass = amb.className;

    // 3. Box 容器（选一个看起来像 panel 的）
    var boxes = $$('[class*="Box_"]').filter(function (b) {
      var cls = b.className.toString();
      // 排除 icon/button 内嵌的小 Box，要选 panel-like 的
      return cls.indexOf("Box_") >= 0 && b.children.length >= 2 && b.offsetWidth > 120;
    });
    if (boxes.length) GH.boxClass = boxes[0].className.toString();
    if (GH.boxClass) {
      GH.cs.box = {
        bg: getComputedStyle(boxes[0]).backgroundColor,
        border: getComputedStyle(boxes[0]).border,
        radius: getComputedStyle(boxes[0]).borderRadius,
        padding: getComputedStyle(boxes[0]).padding
      };
    }

    // 4. Input（TextInput 组件）
    var input = document.querySelector('[data-component="input"], [class*="prc-components-Input"]');
    if (input) {
      GH.inputClass = input.className;
      GH.cs.input = {
        bg: getComputedStyle(input).backgroundColor,
        border: getComputedStyle(input).border,
        radius: getComputedStyle(input).borderRadius,
        padding: getComputedStyle(input).padding,
        height: getComputedStyle(input).height,
        fontSize: getComputedStyle(input).fontSize
      };
    }

    // 5. Link
    var link = document.querySelector('[data-component="Link"], [class*="prc-Link-"]');
    if (link) {
      GH.linkClass = link.className;
      GH.cs.link = {
        color: getComputedStyle(link).color,
        fontSize: getComputedStyle(link).fontSize
      };
    }
  }

  /* ================================== 注入样式（仅 GitHub 原生 class 无法覆盖的部分） ================================== */
  var MINIMAL_CSS = [
    "#fg-menu-li{list-style:none;position:relative;display:inline-block;}",
    "li#fg-menu-li ~ li#fg-menu-li{display:none;}",
    // select 下拉框：GitHub 无原生 select 组件，用 Primer 主题 Token 精确模拟
    "details#fg-details select{box-sizing:border-box;appearance:none;-webkit-appearance:none;background-image:url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16' fill='%2359636e'%3E%3Cpath d='M12.78 5.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 6.28a.75.75 0 0 1 1.06-1.06L8 8.94l3.72-3.72a.75.75 0 0 1 1.06 0Z'/%3E%3C/svg%3E\");background-repeat:no-repeat;background-position:right 8px center;padding-right:28px;}",
    // details/summary 的三角箭头隐藏（我们用自定义 chevron SVG）
    "details#fg-details > summary{list-style:none;display:inline-flex;align-items:center;gap:6px;cursor:pointer;width:auto;}",
    "details#fg-details > summary::-webkit-details-marker{display:none;}",
    // details 展开面板容器样式（匹配 GitHub Box）
    "details#fg-details > div[class*='Box']{position:absolute;top:calc(100% + 4px);left:0;min-width:320px;width:max-content;max-width:420px;z-index:100;}"
  ].join("\n");

  function injectStyle() {
    if ($("#fg-style")) return;
    document.head.appendChild(el("style", { id: "fg-style", textContent: MINIMAL_CSS }));
  }

  /* ================================== 原生风格按钮构建（仿照 data-component="Button"） ================================== */
  // <button data-component="Button" data-size="small" data-variant="default" class="prc-Button-ButtonBase-*">
  //   <span data-component="buttonContent" data-align="center" class="prc-Button-ButtonContent-*">
  //     [<span data-component="leadingVisual" class="prc-Button-Visual-* prc-Button-LeadingVisual-* prc-Button-VisualWrap-*"><svg...></svg></span>]
  //     <span data-component="text" class="prc-Button-Label-*">文字</span>
  //   </span>
  // </button>
  function buildNativeButton(text, opts) {
    opts = opts || {};
    var cls = GH.buttonClass || "";
    if (opts.extraClass) cls += " " + opts.extraClass;

    var btn = el("button", {
      type: "button",
      "data-component": "Button",
      "data-size": opts.size || "small",
      "data-variant": opts.variant || "default",
      class: cls,
      title: opts.title || text,
      html: ""
    });

    var contentClass = GH.buttonContentClass || "";
    var content = el("span", {
      "data-component": "buttonContent",
      "data-align": "center",
      class: contentClass
    });

    if (opts.icon) {
      var leadingCls = GH.leadingVisualClass || "";
      var leading = el("span", { "data-component": "leadingVisual", class: leadingCls });
      leading.innerHTML = opts.icon;
      content.appendChild(leading);
    }

    var labelCls = GH.labelClass || "";
    content.appendChild(el("span", { "data-component": "text", class: labelCls, text: text }));
    btn.appendChild(content);

    // 精确匹配原生 computedStyle 给 inline fallback（万一 class 探测失败）
    if (!GH.buttonClass && GH.cs.btn) {
      var cs = GH.cs.btn;
      btn.style.cssText = "background:" + cs.bg + ";border:" + cs.border + ";border-radius:" + cs.radius +
        ";padding:" + cs.padding + ";color:" + cs.color + ";font-size:" + cs.fontSize +
        ";height:" + cs.height + ";cursor:" + cs.cursor + ";display:" + cs.display +
        ";align-items:" + cs.alignItems + ";font-family:" + cs.fontFamily;
    }
    return btn;
  }

  // <summary> 触发器按钮（仿照 ActionMenu.Button + variant=invisible）
  function buildActionMenuTrigger(text, opts) {
    opts = opts || {};
    var btn = el("summary", {
      title: opts.title || text,
      html: ""
    });
    var cls = GH.actionMenuButtonClass || GH.buttonClass || "";
    btn.className = cls;
    btn.setAttribute("role", "button");
    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("tabindex", "0");
    btn.setAttribute("data-component", "ActionMenu.Button");
    btn.setAttribute("data-size", opts.size || "medium");
    btn.setAttribute("data-variant", opts.variant || "invisible");

    // 内容：可选 SVG leadingVisual + 文字 + chevron
    if (opts.icon) {
      var leading = el("span", {
        "data-component": "leadingVisual",
        class: GH.leadingVisualClass || ""
      });
      leading.innerHTML = opts.icon;
      btn.appendChild(leading);
    }
    btn.appendChild(el("span", {
      "data-component": "text",
      class: GH.labelClass || "",
      text: text
    }));
    btn.innerHTML +=
      '<svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" style="flex-shrink:0;opacity:.6">' +
      '<path fill="currentColor" d="M12.78 5.22a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 6.28a.75.75 0 0 1 1.06-1.06L8 8.94l3.72-3.72a.75.75 0 0 1 1.06 0Z"/></svg>';

    // fallback style
    if (!cls) {
      btn.style.cssText = "background:transparent;border:1px solid transparent;border-radius:6px;" +
        "padding:0 8px;color:#59636e;font-size:14px;cursor:pointer;display:flex;" +
        "align-items:center;gap:6px;list-style:none;";
    }
    return btn;
  }

  /* ================================== 复制功能 ================================== */
  function copyText(text, btn) {
    function ok() {
      // 把按钮内容替换成 "已复制" 文字（保持原生内部结构）
      var label = btn.querySelector('[data-component="text"]');
      if (label) { var old = label.textContent; label.textContent = "已复制"; setTimeout(function () { label.textContent = old; }, 1200); }
      else { var ot = btn.textContent; btn.textContent = "已复制"; setTimeout(function () { btn.textContent = ot; }, 1200); }
    }
    function fallback() {
      var ta = el("textarea", { value: text });
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); ok(); } catch (e) { }
      ta.remove();
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(ok).catch(fallback);
    } else fallback();
  }

  /* ============================== 主菜单（克隆与镜像） ============================== */

  // 克隆行 —— 完全仿照原生按钮风格
  function buildCloneRow(cmd, name, tip) {
    // 容器：flex 一行，padding 用 Primer token
    var row = el("div", {
      style: "display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid var(--color-border-default);" +
             "font-family:" + (GH.cs.btn ? GH.cs.btn.fontFamily : "var(--font-stack)") + ";"
    });

    // 名称 Label —— 用原生 Label 类或仿造
    var labelSpan = el("span", {
      class: GH.labelClass || "",
      style: "min-width:96px;opacity:.75;font-size:12px;" +
             (GH.cs.btn ? "color:" + GH.cs.btn.color + ";" : ""),
      text: name,
      title: tip || name
    });
    row.appendChild(labelSpan);

    // 命令 Input —— 用探测到的 Input 类
    var inputCls = GH.inputClass || "";
    var input = el("input", {
      type: "text", value: cmd, readonly: true, title: tip || name,
      "data-component": "input",
      class: inputCls,
      style: "flex:1 1 auto;min-width:0;font-family:var(--font-mono);font-size:12px;" +
             "background:transparent;border:1px solid var(--color-border-default);border-radius:6px;" +
             "padding:3px 8px;"
    });
    row.appendChild(input);

    // 复制按钮 —— 原生 Button 结构
    var copyBtn = buildNativeButton("复制", { title: "复制命令" });
    row.appendChild(copyBtn);

    copyBtn.addEventListener("click", function () { copyText(cmd, copyBtn); });
    input.addEventListener("focus", function () { input.select(); });
    return row;
  }

  // select 下拉框（GitHub 无原生组件，用 Primer 主题 Token 精确模拟）
  function buildPrimerSelect(options, prompt, onChange) {
    var sel = el("select", {
      style: "width:auto;min-width:240px;font-size:12px;padding:3px 28px 3px 8px;" +
             "border:1px solid var(--color-border-default);border-radius:6px;" +
             "background-color:var(--color-canvas-default);color:var(--color-fg-default);" +
             "appearance:none;-webkit-appearance:none;"
    });
    sel.appendChild(el("option", { value: "", text: prompt }));
    options.forEach(function (o) {
      sel.appendChild(el("option", { value: o[0], text: o[1] }));
    });
    sel.addEventListener("change", onChange);
    return sel;
  }

  function buildMenu(ctx) {
    var li = el("li", { id: "fg-menu-li" });
    menuLi = li;

    // 面板容器 —— Box 原生风格
    var boxCls = GH.boxClass || "";
    var boxStyle = GH.cs.box ?
      "box-shadow:0 1px 3px rgba(27,31,36,.12);" +
      "background:" + GH.cs.box.bg + ";border:" + GH.cs.box.border +
      ";border-radius:" + GH.cs.box.radius + ";" :
      "box-shadow:0 1px 3px rgba(27,31,36,.12);background:var(--color-canvas-default);" +
      "border:1px solid var(--color-border-default);border-radius:6px;";

    var details = el("details", { id: "fg-details", class: boxCls });
    details.style.cssText = boxStyle + "position:relative;display:inline-block;";

    // 触发器 —— ActionMenu.Button 风格（invisible variant 但加个轻边框让它看得清）
    var summary = buildActionMenuTrigger("克隆与镜像", { title: "镜像站点与快速克隆" });
    // 给 summary 加回按钮边框和背景（让它看起来像个按钮）
    if (GH.cs.btn) {
      summary.style.background = GH.cs.btn.bg;
      summary.style.border = GH.cs.btn.border;
    } else {
      summary.style.background = "rgb(246,248,250)";
      summary.style.border = "1px solid rgb(209,217,224)";
    }

    // 面板主体
    var panel = el("div", { style: "max-height:calc(100vh - 100px);overflow:auto;" });

    // 两个 Tab（GitHub 原生 UnderlineNav 风格，点击切换）
    var tabBar = el("div", {
      style: "display:flex;border-bottom:1px solid var(--color-border-default);padding:4px 8px;"
    });
    var tabMain = el("button", {
      type: "button", "data-component": "Button", "data-size": "small", "data-variant": "invisible",
      class: GH.buttonClass || "",
      text: "主要",
      style: "font-weight:600;border-bottom:2px solid var(--color-accent-emphasis);margin-right:4px;"
    });
    var tabOther = el("button", {
      type: "button", "data-component": "Button", "data-size": "small", "data-variant": "invisible",
      class: GH.buttonClass || "",
      text: "其他",
      style: "font-weight:normal;margin-right:4px;"
    });
    tabBar.appendChild(tabMain);
    tabBar.appendChild(tabOther);

    var body = el("div");
    var paneMain = el("div", { style: "padding:4px 0;" });
    var paneOther = el("div", { style: "padding:4px 0;", hidden: true });

    /* ---- 主要 ---- */
    var tipBox = el("div", {
      style: "padding:8px 12px;margin:8px;border-radius:6px;background:var(--color-neutral-subtle);" +
             "font-size:12px;color:var(--color-fg-muted);line-height:1.5;"
    }, [
      el("div", { style: "font-weight:600;color:var(--color-fg-default);margin-bottom:2px;", text: "⚠ 提示" }),
      el("div", { text: "可在 Tampermonkey 脚本菜单「FastGithub」里切换 clone 命令前缀" }),
      el("div", { style: "color:var(--color-danger-fg, #cf222e);margin-top:2px;",
        text: "请不要在镜像网站登录账号，若因此造成任何损失作者概不负责" })
    ]);
    paneMain.appendChild(tipBox);

    paneMain.appendChild(el("div", {
      style: "font-weight:600;padding:8px 12px 4px;font-size:13px;color:var(--color-fg-default);",
      text: "快速克隆"
    }));

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

    /* ---- ZIP ---- */
    var zipPath = defaultZipPath(ctx);
    if (zipPath) {
      paneMain.appendChild(el("div", {
        style: "font-weight:600;padding:8px 12px 4px;font-size:13px;color:var(--color-fg-default);",
        text: "ZIP 归档加速下载"
      }));
      var zipOpts = DownloadSet.map(function (i) {
        var m = MirrorUrl[i];
        return [m[0] + relPath(zipPath), m[1] + " - " + m[2]];
      });
      paneMain.appendChild(el("div", { style: "padding:0 8px 8px;" }, [
        buildPrimerSelect(zipOpts, "选择镜像下载 ZIP", function () {
          if (this.value) window.open(this.value, "_blank", "noopener");
        })
      ]));
    }

    /* ---- 镜像浏览 ---- */
    var jsd = jsDelivrFromUrl(location.href);
    if (jsd) {
      paneMain.appendChild(el("div", {
        style: "font-weight:600;padding:8px 12px 4px;font-size:13px;color:var(--color-fg-default);",
        text: "镜像浏览"
      }));
      paneMain.appendChild(el("a", {
        href: jsd, target: "_blank", rel: "nofollow", title: JSD[2],
        style: "display:block;padding:6px 12px;color:var(--color-accent-fg);text-decoration:none;font-weight:600;",
        text: "镜像浏览(" + JSD[1] + ")"
      }));
    }
    if (location.hostname !== "github.com") {
      paneMain.appendChild(el("a", {
        href: "https://github.com" + location.pathname + location.search,
        target: "_blank", rel: "nofollow",
        style: "display:block;padding:6px 12px;color:var(--color-accent-fg);text-decoration:none;font-weight:600;",
        text: "返回 GitHub 官方站"
      }));
    }

    /* ---- 其他 ---- */
    OtherUrl.forEach(function (u) {
      paneOther.appendChild(el("a", {
        href: u[0], target: "_blank", rel: "nofollow",
        style: "display:block;padding:6px 12px;color:var(--color-fg);text-decoration:none;font-size:13px;",
        text: u[1]
      }));
    });

    tabMain.addEventListener("click", function () {
      tabMain.style.borderBottom = "2px solid var(--color-accent-emphasis)";
      tabMain.style.fontWeight = "600";
      tabOther.style.borderBottom = "none";
      tabOther.style.fontWeight = "normal";
      paneMain.hidden = false; paneOther.hidden = true;
    });
    tabOther.addEventListener("click", function () {
      tabOther.style.borderBottom = "2px solid var(--color-accent-emphasis)";
      tabOther.style.fontWeight = "600";
      tabMain.style.borderBottom = "none";
      tabMain.style.fontWeight = "normal";
      paneOther.hidden = false; paneMain.hidden = true;
    });

    body.appendChild(paneMain);
    body.appendChild(paneOther);
    panel.appendChild(tabBar);
    panel.appendChild(body);
    details.appendChild(summary);
    details.appendChild(panel);
    li.appendChild(details);

    /* ---- 依次尝试所有 repo 子页面都能用的插入点 ---- */
    // 1. 仓库首页 header actions
    var bar = $("ul[data-testid='repo-header-actions']") || $("ul.pagehead-actions");
    if (bar) { bar.insertBefore(li, bar.firstChild); return true; }
    // 2. 仓库首页 visibility-label 旁边
    var vl = $("[data-testid='repo-visibility-label']");
    if (vl && vl.parentElement && vl.parentElement.parentElement) {
      var wh = vl.parentElement.parentElement;
      var w = el("div", { style: "display:inline-flex;margin:0 8px;" });
      w.appendChild(li); wh.appendChild(w); return true;
    }
    // 3. Blob 页 header（Edit/Raw 按钮组旁）
    var bh = $("[class*='react-blob-header']") || $("[class*='blob-header']");
    if (bh) {
      var bw = el("div", { style: "display:inline-flex;margin:0 8px;" });
      bw.appendChild(li); bh.insertBefore(bw, bh.firstChild); return true;
    }
    // 4. 面包屑导航
    var cr = $("nav[aria-label='Breadcrumb']") || $("[data-testid='breadcrumbs']");
    if (cr) {
      var cw = el("div", { style: "display:inline-flex;margin:0 8px;" });
      cw.appendChild(li); cr.insertBefore(cw, cr.firstChild); return true;
    }
    // 5. 通用 fallback
    var pjax = $("#repo-content-pjax-container");
    if (pjax && pjax.firstElementChild) {
      var pw = el("div", { style: "display:inline-flex;margin:8px 0;" });
      pw.appendChild(li); pjax.insertBefore(pw, pjax.firstElementChild); return true;
    }
    return false;
  }

  /* ====================== 增强原生 Code 下拉里的 Download ZIP ====================== */
  function augmentCodePanel() {
    $$("a[href*='/archive/refs/'][href$='.zip']").forEach(function (a) {
      if (a.dataset.fgZip) return;
      if (!a.closest("[class*='ActionList'], [class*='action-list'], details, .Anchor, ul")) return;
      a.dataset.fgZip = "1";
      var baseNode = a.closest("li") || a.parentElement;
      var host = baseNode.parentNode;
      var insertRef = baseNode.nextSibling;
      var opts = DownloadSet.map(function (i) {
        var m = MirrorUrl[i];
        return [m[0] + relPath(a.getAttribute("href")), m[1] + " - " + m[2]];
      });
      var sel = buildPrimerSelect(opts, "选择镜像下载 ZIP", function () {
        if (this.value) window.open(this.value, "_blank", "noopener");
      });
      if (host) host.insertBefore(sel, insertRef);
    });
  }

  /* ============================== Releases 资产按钮 ============================== */
  function injectReleaseAssets() {
    if (location.pathname.split("/")[3] !== "releases") return;
    $$("a[href*='/releases/download/']").forEach(function (a) {
      if (a.dataset.fgRel) return;
      var row = a.closest("[class*='Box-row'], li, [class*='release']");
      if (!row) return;
      a.dataset.fgRel = "1";
      var opts = DownloadSet.map(function (i) {
        var m = MirrorUrl[i];
        return [m[0] + relPath(a.getAttribute("href")), m[1] + " - " + m[2]];
      });
      row.appendChild(buildPrimerSelect(opts, "选择镜像下载", function () {
        if (this.value) window.open(this.value, "_blank", "noopener");
      }));
    });
  }

  /* ================================== Raw 按钮下拉 ================================================== */
  function injectRawButtons() {
    var host = $("a[data-testid='raw-button'], a#raw-url");
    if (!host || host.dataset.fgRaw) return;
    host.dataset.fgRaw = "1";
    var href = host.getAttribute("href") || "";
    var rel = relPath(href);
    var item = host.closest("div[class*='ButtonGroup-Item']") || host.parentElement;

    var opts = RawSet.map(function (i) {
      var m = MirrorUrl[i];
      return [m[0] + rel, m[1]];
    });
    var jsd = jsDelivrFromUrl(href);
    if (jsd) opts.push([jsd, JSD[1]]);

    var sel = buildPrimerSelect(opts, "镜像 Raw 下载", function () {
      if (this.value) window.open(this.value, "_blank", "noopener");
    });
    if (item.parentNode) item.parentNode.insertBefore(sel, item.nextSibling);
  }

  /* ================================== GM_registerMenuCommand 配置菜单 ================================== */
  function registerConfigMenu() {
    if (typeof GM_registerMenuCommand !== "function") return;
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
    // 启动时首次探测 GitHub 样式（后续 page 切换会重新探测）
    if (!GH.buttonClass) detectGitHubStyle();

    injectStyle();
    var ctx = repoContext();
    if (ctx) {
      var key = ctx.owner + "/" + ctx.repo;
      if (menuLi && key === lastKey) {
        var liveBar = $("ul[data-testid='repo-header-actions']") || $("ul.pagehead-actions");
        if (liveBar && !liveBar.contains(menuLi)) liveBar.insertBefore(menuLi, liveBar.firstChild);
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
      var d = $("#fg-details"); if (d) d.open = false;
    }
  });

  // 首次启动
  detectGitHubStyle();
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
    document.addEventListener(ev, function () { detectGitHubStyle(); schedule(); });
  });
  window.addEventListener("popstate", function () { detectGitHubStyle(); schedule(); });

  ["pushState", "replaceState"].forEach(function (fn) {
    var raw = history[fn];
    history[fn] = function () {
      var ret = raw.apply(this, arguments);
      detectGitHubStyle(); schedule();
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
