// ==UserScript==
// @name         GitHub 镜像加速助手
// @namespace    https://github.com/ghma
// @version      1.10.0
// @description  镜像浏览 / Clone / Raw / Release / Archive 加速，多线路重试、多条自定义线路（含 API 加速）、按用途分线路、线路禁用置顶、浅克隆、Actions 制品登录态/Token 下载、Gist 支持、诊断报告、配置导入导出、浮动按钮拖动贴边
// @author       ghma
// @license      MIT
// @match        https://github.com/*
// @match        https://gist.github.com/*
// @icon         https://github.githubassets.com/favicons/favicon.svg
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      *
// @run-at       document-start
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  if (window.top !== window.self) return;

  const IS_GH = location.hostname === 'github.com';
  const IS_GIST = location.hostname === 'gist.github.com';
  if (!IS_GH && !IS_GIST) return;

  // 代码分层（自上而下，职责单一，后层只依赖前层）：
  //   1. 常量与默认值     MIRRORS / DEFAULTS
  //   2. 通用工具         DOM 查询、防抖、地址归一化、剪贴板
  //   3. 设置存储         loadSettings / saveSettings / sanitize
  //   4. 页面上下文       parseGitHubUrl / getRepoContext / zipUrl
  //   5. 线路模型         健康度、能力判断、排序、选择、URL 改写
  //   6. 文件与 Actions   下载、制品、日志、配置导入导出
  //   7. 面板 UI          CSS 令牌、渲染、事件、浮动按钮与定位
  //   8. 页面注入         Code 工具栏、Raw 按钮、静态资源 CDN
  //   9. 下载改写与启动   链接改写、菜单、快捷键、定时巡检

  // ---------------------------------------------------------------------------
  // 镜像线路表
  //   type = proxy    : 下载代理，镜像地址 = base + 原始 URL
  //   type = site     : 全站镜像，可直接浏览网页
  //   type = clone    : 仅用于 git clone 加速
  //   type = template : URL 模板（能力由模板变量决定）
  // 每条线路用 caps 明确标注能力：
  //   caps.raw        提供 Raw 文件加速
  //   caps.downloads  提供 Release / Archive 下载加速
  //   caps.clone      可用于 git clone
  //   caps.api        可作为 api.github.com 加速入口（需同时提供 apiBase）
  //   caps.browse     可镜像浏览网页（全站镜像）
  // 私人线路请通过设置里的「自定义线路」填写，不要写进这张表
  // ---------------------------------------------------------------------------
  const MIRRORS = [
    { id: 'ghproxy', label: 'ghproxy.net', type: 'proxy', base: 'https://ghproxy.net/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ghfast', label: 'ghfast.top', type: 'proxy', base: 'https://ghfast.top/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ghproxycom', label: 'gh-proxy.com', type: 'proxy', base: 'https://gh-proxy.com/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ghproxyorg', label: 'gh-proxy.org', type: 'proxy', base: 'https://gh-proxy.org/', caps: { raw: true, downloads: true, clone: true } },
    {
      id: 'ghproxyorgv4',
      label: 'v4.gh-proxy.org（推荐）',
      type: 'proxy',
      base: 'https://v4.gh-proxy.org/',
      caps: { raw: true, downloads: true, clone: true },
    },
    { id: 'ghproxyorgv6', label: 'v6.gh-proxy.org', type: 'proxy', base: 'https://v6.gh-proxy.org/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ghproxyorgcdn', label: 'cdn.gh-proxy.org', type: 'proxy', base: 'https://cdn.gh-proxy.org/', caps: { raw: true, downloads: true, clone: true } },
    {
      id: 'ghproxyorgaxis',
      label: 'axisnow.gh-proxy.org',
      type: 'proxy',
      base: 'https://axisnow.gh-proxy.org/',
      caps: { raw: true, downloads: true, clone: true },
    },
    { id: 'ghproxynet', label: 'gh-proxy.net', type: 'proxy', base: 'https://gh-proxy.net/', caps: { raw: true, downloads: true } },
    { id: 'ghproxycn', label: 'gh-proxy.cn', type: 'proxy', base: 'https://gh-proxy.cn/github/', caps: { raw: true, downloads: true } },
    {
      id: 'eo.ghproxycn',
      label: 'eo.gh-proxy.cn（仅 Raw）',
      type: 'template',
      template: 'https://eo.gh-proxy.cn/github/{rawUrl}',
      caps: { raw: true, downloads: false, clone: false, api: false, browse: false },
    },
    { id: 'ghproxycn2', label: 'ghproxy.cn', type: 'proxy', base: 'https://ghproxy.cn/', caps: { raw: true, downloads: true } },
    { id: 'ghproxycfd', label: 'ghproxy.cfd', type: 'proxy', base: 'https://ghproxy.cfd/', caps: { raw: true, downloads: true } },
    { id: 'gitproxyclick', label: 'gitproxy.click', type: 'proxy', base: 'https://gitproxy.click/', caps: { raw: true, downloads: true } },
    { id: 'cnxiaobai', label: 'github.cnxiaobai.com', type: 'proxy', base: 'https://github.cnxiaobai.com/', caps: { raw: true, downloads: true } },
    { id: 'monkeyray', label: 'ghproxy.monkeyray.net', type: 'proxy', base: 'https://ghproxy.monkeyray.net/', caps: { raw: true, downloads: true } },
    // 2026-11-20 批量实测通过（Raw + Archive），按延迟排序
    { id: 'sakuramoe', label: 'ghproxy.sakuramoe.dev', type: 'proxy', base: 'https://ghproxy.sakuramoe.dev/', caps: { raw: true, downloads: true } },
    { id: 'gh996986', label: 'gh.996986.xyz', type: 'proxy', base: 'https://gh.996986.xyz/', caps: { raw: true, downloads: true } },
    { id: 'zzrbk', label: 'github.zzrbk.xyz', type: 'proxy', base: 'https://github.zzrbk.xyz/', caps: { raw: true, downloads: true } },
    { id: 'git951959483', label: 'git.951959483.xyz', type: 'proxy', base: 'https://git.951959483.xyz/', caps: { raw: true, downloads: true } },
    { id: 'git820828', label: 'git.820828.xyz', type: 'proxy', base: 'https://git.820828.xyz/', caps: { raw: true, downloads: true } },
    { id: 'shiina', label: 'gh.shiina-rimo.cafe', type: 'proxy', base: 'https://gh.shiina-rimo.cafe/', caps: { raw: true, downloads: true } },
    { id: 'gh39al', label: 'gh.39.al', type: 'proxy', base: 'https://gh.39.al/', caps: { raw: true, downloads: true } },
    { id: 'ihn', label: 'github.ihnic.com', type: 'proxy', base: 'https://github.ihnic.com/', caps: { raw: true, downloads: true } },
    { id: 'gp871201', label: 'gp.871201.xyz', type: 'proxy', base: 'https://gp.871201.xyz/', caps: { raw: true, downloads: true } },
    { id: 'chjina', label: 'gh.chjina.com', type: 'proxy', base: 'https://gh.chjina.com/', caps: { raw: true, downloads: true } },
    { id: 'tianrld', label: 'github.tianrld.top', type: 'proxy', base: 'https://github.tianrld.top/', caps: { raw: true, downloads: true } },
    { id: 'baguoyuyan', label: 'proxy.baguoyuyan.com', type: 'proxy', base: 'https://proxy.baguoyuyan.com/', caps: { raw: true, downloads: true } },
    { id: 'gh880824', label: 'github.880824.xyz', type: 'proxy', base: 'https://github.880824.xyz/', caps: { raw: true, downloads: true } },
    { id: 'padao', label: 'gh.padao.fun', type: 'proxy', base: 'https://gh.padao.fun/', caps: { raw: true, downloads: true } },
    { id: 'skybyte', label: 'ghproxy.mirror.skybyte.me', type: 'proxy', base: 'https://ghproxy.mirror.skybyte.me/', caps: { raw: true, downloads: true } },
    { id: 'imciel', label: 'ghproxy.imciel.com', type: 'proxy', base: 'https://ghproxy.imciel.com/', caps: { raw: true, downloads: true } },
    { id: 'love8yun', label: 'getgit.love8yun.eu.org', type: 'proxy', base: 'https://getgit.love8yun.eu.org/', caps: { raw: true, downloads: true } },
    { id: 'catmak', label: 'gh.catmak.name', type: 'proxy', base: 'https://gh.catmak.name/', caps: { raw: true, downloads: true } },
    { id: 'jiashu', label: 'jiashu.1win.eu.org', type: 'proxy', base: 'https://jiashu.1win.eu.org/', caps: { raw: true, downloads: true } },
    { id: 'fastgitcc', label: 'fastgit.cc', type: 'proxy', base: 'https://fastgit.cc/', caps: { raw: true, downloads: true } },
    { id: 'ghdpik', label: 'gh.dpik.top', type: 'proxy', base: 'https://gh.dpik.top/', caps: { raw: true, downloads: true } },
    { id: 'ddayh', label: 'hub.ddayh.com', type: 'proxy', base: 'https://hub.ddayh.com/', caps: { raw: true, downloads: true } },
    { id: 'ghm078465', label: 'ghm.078465.xyz', type: 'proxy', base: 'https://ghm.078465.xyz/', caps: { raw: true, downloads: true } },
    { id: 'gh1ms', label: 'github.1ms.xx.kg', type: 'proxy', base: 'https://github.1ms.xx.kg/', caps: { raw: true, downloads: true } },
    { id: 'ednovas', label: 'github.ednovas.xyz', type: 'proxy', base: 'https://github.ednovas.xyz/', caps: { raw: true, downloads: true } },
    { id: 'crdz', label: 'github.crdz.eu.org', type: 'proxy', base: 'https://github.crdz.eu.org/', caps: { raw: true, downloads: true } },
    { id: 'keleyaa', label: 'ghp.keleyaa.com', type: 'proxy', base: 'https://ghp.keleyaa.com/', caps: { raw: true, downloads: true } },
    { id: 'lsdfxdk', label: 'github.lsdfxdk.nyc.mn', type: 'proxy', base: 'https://github.lsdfxdk.nyc.mn/', caps: { raw: true, downloads: true } },
    { id: 'boringhex', label: 'github.boringhex.top', type: 'proxy', base: 'https://github.boringhex.top/', caps: { raw: true, downloads: true } },
    { id: 'monlor', label: 'gh.monlor.com', type: 'proxy', base: 'https://gh.monlor.com/', caps: { raw: true, downloads: true } },
    { id: 'gh198962', label: 'gh.198962.xyz', type: 'proxy', base: 'https://gh.198962.xyz/', caps: { raw: true, downloads: true } },
    { id: 'xzhouqd', label: 'ghproxy.xzhouqd.com', type: 'proxy', base: 'https://ghproxy.xzhouqd.com/', caps: { raw: true, downloads: true } },
    { id: 'kenyu', label: 'kenyu.ggff.net', type: 'proxy', base: 'https://kenyu.ggff.net/', caps: { raw: true, downloads: true } },
    { id: 'lixxing', label: 'github-proxy.lixxing.top', type: 'proxy', base: 'https://github-proxy.lixxing.top/', caps: { raw: true, downloads: true } },
    { id: 'gh788787', label: 'github.788787.xyz', type: 'proxy', base: 'https://github.788787.xyz/', caps: { raw: true, downloads: true } },
    { id: 'clwap', label: 'ggg.clwap.dpdns.org', type: 'proxy', base: 'https://ggg.clwap.dpdns.org/', caps: { raw: true, downloads: true } },
    { id: 'chenc', label: 'github.chenc.dev', type: 'proxy', base: 'https://github.chenc.dev/', caps: { raw: true, downloads: true } },
    { id: 'gitproxy127731', label: 'gitproxy.127731.xyz', type: 'proxy', base: 'https://gitproxy.127731.xyz/', caps: { raw: true, downloads: true } },
    { id: 'yaoyaoling', label: 'proxy.yaoyaoling.net', type: 'proxy', base: 'https://proxy.yaoyaoling.net/', caps: { raw: true, downloads: true } },
    { id: 'gitmirror', label: 'hub.gitmirror.com', type: 'proxy', base: 'https://hub.gitmirror.com/', caps: { raw: true, downloads: true } },
    { id: 'ghproxycc', label: 'ghproxy.cc', type: 'proxy', base: 'https://ghproxy.cc/', caps: { raw: true, downloads: true } },
    { id: 'llkk', label: 'gh.llkk.cc', type: 'proxy', base: 'https://gh.llkk.cc/', caps: { raw: true, downloads: true } },
    { id: 'moeyy', label: 'github.moeyy.xyz', type: 'proxy', base: 'https://github.moeyy.xyz/', caps: { raw: true, downloads: true } },
    // 2026-11-24 扫描 github.akams.cn 节点列表后实测通过（Raw + Archive），按实测延迟排序
    { id: 'ak-777-z321-cc-cd', label: '777.z321.cc.cd', type: 'proxy', base: 'https://777.z321.cc.cd/', caps: { raw: true, downloads: true } },
    { id: 'ak-gh-meali-top', label: 'gh.meali.top', type: 'proxy', base: 'https://gh.meali.top/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-g-blfrp-cn', label: 'g.blfrp.cn', type: 'proxy', base: 'https://g.blfrp.cn/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-github-tbap-top', label: 'github.tbap.top', type: 'proxy', base: 'https://github.tbap.top/', caps: { raw: true, downloads: true } },
    { id: 'ak-gh-sixyin-com', label: 'gh.sixyin.com', type: 'proxy', base: 'https://gh.sixyin.com/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-ghgo-de5-net', label: 'ghgo.de5.net', type: 'proxy', base: 'https://ghgo.de5.net/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-githubproxy-gohj99-site', label: 'githubproxy.gohj99.site', type: 'proxy', base: 'https://githubproxy.gohj99.site/', caps: { raw: true, downloads: true } },
    { id: 'ak-github-xxlab-tech', label: 'github.xxlab.tech', type: 'proxy', base: 'https://github.xxlab.tech/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-mousegithubproxy-cc-cd', label: 'mousegithubproxy.cc.cd', type: 'proxy', base: 'https://mousegithubproxy.cc.cd/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-gh-qfmc0721-cc-cd', label: 'gh.qfmc0721.cc.cd', type: 'proxy', base: 'https://gh.qfmc0721.cc.cd/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-gh-noki-icu', label: 'gh.noki.icu', type: 'proxy', base: 'https://gh.noki.icu/', caps: { raw: true, downloads: true } },
    { id: 'ak-gh-07150721-xyz', label: 'gh.07150721.xyz', type: 'proxy', base: 'https://gh.07150721.xyz/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-github-ikgy-top', label: 'github.ikgy.top', type: 'proxy', base: 'https://github.ikgy.top/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-eogh-719831-xyz', label: 'eogh.719831.xyz', type: 'proxy', base: 'https://eogh.719831.xyz/', caps: { raw: true, downloads: true } },
    { id: 'ak-git-669966-xyz', label: 'git.669966.xyz', type: 'proxy', base: 'https://git.669966.xyz/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-down-mxw-xx-kg', label: 'down.mxw.xx.kg', type: 'proxy', base: 'https://down.mxw.xx.kg/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-gh-jjj-gv-uy', label: 'gh.jjj.gv.uy', type: 'proxy', base: 'https://gh.jjj.gv.uy/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-gh-acmsz-top', label: 'gh.acmsz.top', type: 'proxy', base: 'https://gh.acmsz.top/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-cdn-akaere-online', label: 'cdn.akaere.online', type: 'proxy', base: 'https://cdn.akaere.online/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-g-z321-cc-cd', label: 'g.z321.cc.cd', type: 'proxy', base: 'https://g.z321.cc.cd/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-cfgh-ikgy-top', label: 'cfgh.ikgy.top', type: 'proxy', base: 'https://cfgh.ikgy.top/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-gg-z321-cc-cd', label: 'gg.z321.cc.cd', type: 'proxy', base: 'https://gg.z321.cc.cd/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-gh-inkchills-cn', label: 'gh.inkchills.cn', type: 'proxy', base: 'https://gh.inkchills.cn/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-ghproxy-felicity-land', label: 'ghproxy.felicity.land', type: 'proxy', base: 'https://ghproxy.felicity.land/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-tvv-tw', label: 'tvv.tw', type: 'proxy', base: 'https://tvv.tw/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-ghproxy-icu', label: 'ghproxy.icu', type: 'proxy', base: 'https://ghproxy.icu/', caps: { raw: true, downloads: true, clone: true } },
    { id: 'ak-xsadwsd-kdns-fr', label: 'xsadwsd.kdns.fr', type: 'proxy', base: 'https://xsadwsd.kdns.fr/', caps: { raw: true, downloads: true, clone: true } },
    {
      id: 'jsdelivr',
      label: 'jsDelivr（模板）',
      type: 'template',
      template: 'https://cdn.jsdelivr.net/gh/{owner}/{repo}@{ref}/{path}',
      caps: { raw: true, downloads: false, clone: false, api: false, browse: false },
    },
    {
      id: 'statically',
      label: 'statically.io（模板）',
      type: 'template',
      template: 'https://cdn.statically.io/gh/{owner}/{repo}/{ref}/{path}',
      caps: { raw: true, downloads: false, clone: false, api: false, browse: false },
    },
    { id: 'kkgithub', label: 'kkgithub.com', type: 'site', base: 'https://kkgithub.com', apiBase: 'https://api.kkgithub.com/', caps: { raw: true, downloads: true, clone: true, api: true, browse: true } },
    { id: 'bgithub', label: 'bgithub.xyz', type: 'site', base: 'https://bgithub.xyz', caps: { raw: true, downloads: true, clone: true, api: false, browse: true } },
    { id: 'gitclone', label: 'gitclone.com', type: 'clone', base: 'https://gitclone.com/', caps: { raw: false, downloads: false, clone: true, api: false, browse: false } },
  ];

  // 内置 API 线路：由 MIRRORS 的能力标记直接派生，避免再维护一份重复清单
  function builtinApiList() {
    return MIRRORS.filter((m) => m.caps && m.caps.api === true && !!m.apiBase);
  }

  function builtinApiById(id) {
    return builtinApiList().find((m) => m.id === id) || null;
  }

  const STORE_KEY = 'ghma:settings';
  const SCRIPT_VERSION = '1.10.0';
  const defaultCustom = (id) => ({
    id: id || 'custom',
    label: '',
    type: 'proxy',
    base: '',
    caps: { raw: true, downloads: true, clone: true, api: false, browse: false },
  });
  const DEFAULTS = {
    enabled: true,
    mirror: 'ghproxy',
    mirrorRaw: 'auto',
    mirrorDownloads: 'auto',
    mirrorClone: 'auto',
    customRoutes: [],
    disabledMirrors: [],
    pinnedMirrors: [],
    cloneDepth: 0,
    restoreOrigin: false,
    autoDownload: true,
    autoFallback: true,
    codeToolbar: true,
    rawButton: true,
    apiMirror: 'off',
    apiCustom: '',
    actionsToken: '',
    staticCdn: false,
    hotkey: 'Alt+M',
    speeds: {},
    fabPos: { side: 'right', top: 18 },
  };

  // ---------------------------------------------------------------------------
  // 工具函数
  // ---------------------------------------------------------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function debounce(fn, wait) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function normalizeBase(input) {
    let v = String(input || '').trim();
    // 兼容从聊天工具 / Markdown 粘贴时包裹的反引号、引号与尖括号
    v = v.replace(/^[`'"<\s]+/, '').replace(/[`'"\s>]+$/, '');
    if (!v) return '';
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    if (!v.endsWith('/')) v += '/';
    return v;
  }

  function escHtml(text) {
    return String(text).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  }

  function copyText(text) {
    if (!text) return Promise.resolve(false);
    return new Promise((resolve) => {
      try {
        if (typeof GM_setClipboard === 'function') {
          GM_setClipboard(text, 'text');
          return resolve(true);
        }
      } catch (e) {
        /* 忽略并走降级方案 */
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(text)
          .then(() => resolve(true))
          .catch(() => resolve(fallbackCopy(text)));
        return;
      }
      resolve(fallbackCopy(text));
    });
  }

  function fallbackCopy(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  // 统一的小工具：把散落在各处的同类表达式收敛到一处
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const stripTrailingSlash = (value) => String(value || '').replace(/\/+$/, '');
  const isCustomId = (id) => /^custom/i.test(String(id || ''));

  // 从当前页面路径取文件名（处理百分号编码），下载动作共用
  function currentFileName(fallback) {
    const raw = location.pathname.split('/').pop() || '';
    let name = raw;
    try {
      name = decodeURIComponent(raw);
    } catch (e) {
      /* 保留原始编码 */
    }
    return name || fallback || 'download';
  }

  // ---------------------------------------------------------------------------
  // 设置
  // ---------------------------------------------------------------------------
  function loadSettings() {
    let saved = null;
    try {
      saved = GM_getValue(STORE_KEY, null);
    } catch (e) {
      saved = null;
    }
    const merged = Object.assign({}, DEFAULTS, saved || {});
    merged.customRoutes = sanitizeCustomRoutes(saved && saved.customRoutes, saved && saved.custom);
    delete merged.custom;
    migrateLegacyApi(merged);
    merged.fabPos = Object.assign({}, DEFAULTS.fabPos, (saved && saved.fabPos) || {});
    merged.speeds = Object.assign({}, (saved && saved.speeds) || {});
    merged.disabledMirrors = Array.isArray(saved && saved.disabledMirrors)
      ? saved.disabledMirrors.slice()
      : [];
    merged.pinnedMirrors = Array.isArray(saved && saved.pinnedMirrors)
      ? saved.pinnedMirrors.slice()
      : [];
    return merged;
  }

  function saveSettings() {
    try {
      GM_setValue(STORE_KEY, state.settings);
    } catch (e) {
      /* 存储不可用时静默失败 */
    }
  }

  const state = {
    settings: loadSettings(),
    panelOpen: false,
    panelSig: '',
    shadow: null,
    health: {},
    stats: { downloads: 0, ok: 0, fail: 0, raw: 0, clone: 0 },
  };

  // ---------------------------------------------------------------------------
  // 页面 / 仓库上下文
  // ---------------------------------------------------------------------------
  const RESERVED = new Set([
    'settings', 'notifications', 'explore', 'marketplace', 'sponsors', 'topics',
    'trending', 'collections', 'orgs', 'users', 'login', 'join', 'signup',
    'pricing', 'features', 'about', 'apps', 'codespaces', 'search', 'new',
    'issues', 'pulls', 'dashboard', 'account', 'organizations', 'enterprise',
    'site', 'security', 'contact', 'readme', 'repositories', 'stars', 'watching',
    'discussions', 'codespace', 'gist', 'sessions', 'shop', 'team', 'events',
    'education', 'mobile', 'recover', 'premium-support', 'uploads', 'home',
    'sponsoring', 'support', 'developer', 'solutions', 'open-source', 'customer-stories',
  ]);

  function getGistRawLink() {
    return (
      $$('a[href*="gist.githubusercontent.com"]').find((a) => /\/raw\//.test(a.href)) || null
    );
  }

  // 从页面上的分支 / Tag 选择器读取 ref 文本，用于还原含斜杠分支的完整名称
  // 只在文本确实位于 URL 剩余路径开头时才采用，避免把目录名误判为 ref
  const REF_SELECTORS = [
    'button[data-hotkey="w"]',
    '#branch-select-menu summary',
    '.ref-selector-button-text-container',
    '[data-testid="anchor-button"]',
  ];
  let domRefCache = { key: '', value: '' };

  function domRefName(remainder) {
    if (!remainder) return '';
    const key = location.pathname + '\n' + remainder;
    if (domRefCache.key === key) return domRefCache.value;
    const match = (value) => {
      const text = String(value || '').trim();
      return text && (remainder === text || remainder.startsWith(text + '/')) ? text : '';
    };
    for (const sel of REF_SELECTORS) {
      for (const el of $$(sel)) {
        let hit = match(el.textContent);
        if (!hit && el.querySelectorAll) {
          for (const child of el.querySelectorAll('span, strong, b')) {
            hit = match(child.textContent);
            if (hit) break;
          }
        }
        if (!hit && el.getAttribute) hit = match(el.getAttribute('title'));
        if (hit) {
          domRefCache = { key, value: hit };
          return hit;
        }
      }
    }
    return '';
  }

  // 专门用于拆分 GitHub 仓库连接
  //   /<owner>/<repo>/<kind>/<ref>[/<path>]
  // 含斜杠的分支 / Tag 在 URL 中没有边界，优先用内嵌 refInfo 或 DOM 选择器还原；
  // 都拿不到时按第一段猜测，并通过 refExact 标记结果是否可信
  function parseGitHubUrl(pathname, hints) {
    const decode = (value) => {
      try {
        return decodeURIComponent(value);
      } catch (e) {
        return value;
      }
    };
    const parts = String(pathname || '')
      .split('/')
      .filter(Boolean)
      .map(decode);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1];
    if (RESERVED.has(owner.toLowerCase())) return null;
    const kind = parts[2] || '';
    const rest = parts.slice(3);
    const remainder = rest.join('/');
    const info = hints || {};
    const out = { owner, repo, kind, ref: '', refExact: false, filePath: '' };

    if (!kind) {
      out.ref = info.defaultBranch || '';
      out.refExact = !!out.ref;
      return out;
    }
    if (kind === 'commit' || kind === 'commits' || kind === 'tag') {
      out.ref = remainder;
      out.refExact = !!remainder;
      return out;
    }
    if (kind === 'releases') {
      if (rest[0] === 'tag') {
        out.ref = rest.slice(1).join('/');
        out.refExact = !!out.ref;
      }
      return out;
    }
    const refKinds = ['tree', 'blob', 'blame', 'raw', 'edit'];
    if (refKinds.indexOf(kind) < 0) return out;

    const fits = (value) => !!value && (remainder === value || remainder.startsWith(value + '/'));
    // 内嵌 JSON 命中时不再扫描 DOM
    let refName = fits(info.refName) ? info.refName : '';
    if (!refName) {
      const domRef = domRefName(remainder);
      if (fits(domRef)) refName = domRef;
    }
    if (refName) {
      out.ref = refName;
      out.refExact = true;
      if (kind !== 'tree') out.filePath = remainder.slice(refName.length).replace(/^\//, '');
      return out;
    }
    // 无法判定边界：取第一段作为最常见情况的猜测
    out.ref = rest[0] || '';
    if (kind !== 'tree' && rest.length > 1) out.filePath = rest.slice(1).join('/');
    return out;
  }

  function getRepoContext() {
    if (IS_GIST) {
      const parts = location.pathname.split('/').filter(Boolean);
      if (!parts.length) return null;
      let owner = '';
      let repo = '';
      if (parts.length >= 2 && /^[0-9a-f]{8,}$/i.test(parts[1])) {
        owner = parts[0];
        repo = parts[1];
      } else if (/^[0-9a-f]{8,}$/i.test(parts[0])) {
        repo = parts[0];
      } else {
        return null;
      }
      const rest = parts.slice(owner ? 2 : 1);
      return {
        owner,
        repo,
        rest,
        kind: '',
        ref: '',
        refExact: false,
        filePath: '',
        isFile: !!getGistRawLink(),
        isCode: false,
        isGist: true,
      };
    }
    if (!IS_GH) return null;
    const parts = location.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    if (RESERVED.has(parts[0].toLowerCase())) return null;
    const info = embeddedRepoInfo();
    const parsed = parseGitHubUrl(location.pathname, {
      refName: info.refName,
      defaultBranch: info.defaultBranch,
    });
    if (!parsed) return null;
    const rest = parts.slice(2);
    const kind = rest[0] || '';
    return {
      owner: parsed.owner,
      repo: parsed.repo,
      rest,
      kind,
      ref: parsed.ref,
      refExact: parsed.refExact,
      filePath: parsed.filePath,
      isFile: kind === 'blob',
      isCode: kind === '' || kind === 'tree',
      isGist: false,
    };
  }

  function getRawUrl(ctx) {
    if (!ctx || !ctx.isFile) return '';
    if (ctx.isGist) {
      const link = getGistRawLink();
      return link ? link.href : '';
    }
    const direct = $('a[data-testid="raw-button"]') || $('#raw-url');
    if (direct && direct.href) return direct.href;
    const anyRaw = $$('a[href*="/raw/"]').find((el) =>
      el.href.startsWith('https://github.com/')
    );
    if (anyRaw) return anyRaw.href;
    // 兜底：GitHub 的 blob?raw=true 会重定向到 raw 文件
    return `${location.origin}${location.pathname.split('?')[0]}?raw=true`;
  }

  // 从 URL pathname 解析当前 ref（分支 / Tag / commit SHA）
  // getRepoContext() 返回的 rest 数组里 rest[0] === kind 字面量（tree/blob/commit/tag/...）
  // 所以真实 ref 一律从 rest[1] 开始，但 blob 场景要特殊处理：
  //   /blob/<ref>/<filepath> — 最后一个 segment 一定是文件名，不是 ref 的一部分
  // tree 场景：ref 可能含 /（GitFlow），但 URL 中 / 的边界不可判定，
  //   依赖 zipUrl() 的内嵌 JSON zipballUrl 来精确匹配（GitHub 官方来源）
  // SHA ref 的优先级由 zipUrl() 中的 firstSegment 检测负责（只看第一个 URL segment）
  function getCurrentRef(ctx) {
    if (!ctx || ctx.isGist) return '';
    const { kind, rest } = ctx;
    if (!kind) return '';

    if (kind === 'blob') {
      // /blob/<ref>/<filepath> — 最后一个 segment 是文件名，必须去掉
      // rest 至少 3 个元素 ['blob', <ref>, <file>]
      if (rest.length < 3) return rest.slice(1).join('/') || '';
      return rest.slice(1, -1).join('/') || '';
    }
    if (kind === 'tree') {
      // /tree/<ref>[/path] — ref 边界不确定，完整返回 rest[1..]，
      // 由 zipUrl() 的内嵌 JSON zipballUrl 来精确匹配 ref 边界
      return rest.slice(1).join('/') || '';
    }
    if (kind === 'commit' || kind === 'commits') {
      return rest.slice(1).join('/') || '';
    }
    if (kind === 'tag') {
      return rest.slice(1).join('/') || '';
    }
    if (kind === 'releases') {
      if (rest[1] === 'tag') return rest.slice(2).join('/') || '';
      return '';
    }
    if (kind === 'pull') {
      try {
        const refParam = new URLSearchParams(location.search).get('ref');
        if (refParam) return refParam;
      } catch (e) { /* ignore */ }
      return '';
    }
    return '';
  }

  // 根据 ref 构造 archive URL（遵循 GitHub 文档中的官方格式）
  function buildArchiveUrl(ctx, ref, defaultBranch) {
    const base = `https://github.com/${ctx.owner}/${ctx.repo}`;
    if (!ref) {
      // 仓库首页：优先使用默认分支的 refs/heads 形式
      if (defaultBranch) return `${base}/archive/refs/heads/${refPath(defaultBranch)}.zip`;
      return `${base}/archive/HEAD.zip`;
    }
    // 7-40 位 SHA → /archive/<sha>.zip
    if (/^[0-9a-f]{7,40}$/i.test(ref)) return `${base}/archive/${ref}.zip`;
    // 分支 / Tag → /archive/<ref>.zip，由 GitHub 自身解析
    return `${base}/archive/${refPath(ref)}.zip`;
  }

  // 从 GitHub archive href 里反解出 ref（用于 DOM 结果和 URL ref 比对）
  // 支持: /archive/HEAD.zip, /archive/{ref}.zip, /archive/refs/heads/{ref}.zip, /archive/refs/tags/{ref}.zip
  function refFromArchiveHref(href) {
    const m = (href || '').match(/\/archive\/(.+?)\.(zip|tar\.gz)(?:\?|$)/i);
    if (!m) return '';
    const token = m[1];
    if (token === 'HEAD') return '';
    // refs/heads/xxx 或 refs/tags/xxx
    if (token.startsWith('refs/heads/')) return token.slice('refs/heads/'.length);
    if (token.startsWith('refs/tags/')) return token.slice('refs/tags/'.length);
    return token;
  }

  // GitHub 在页面内嵌 JSON 中提供了官方 zipball 地址和默认分支，优先使用
  // 参考文档：/archive/refs/heads/<branch>.zip、/archive/refs/tags/<tag>.zip、/archive/<sha>.zip
  // 内嵌 JSON 体积较大，按页面 URL 缓存一次，避免刷新注入时反复拼接扫描
  let repoInfoCache = { key: '', value: null };
  function embeddedRepoInfo() {
    const key = location.pathname + location.search;
    if (repoInfoCache.key === key && repoInfoCache.value) return repoInfoCache.value;
    const info = { zipballUrl: '', defaultBranch: '', refName: '' };
    try {
      let refName = '';
      let refInfo = '';
      // 逐段扫描，命中即停止，避免把所有脚本拼成一个大字符串
      for (const el of $$('script[type="application/json"]')) {
        const text = el.textContent || '';
        if (!info.zipballUrl) {
          const zip = text.match(/"zipballUrl"\s*:\s*"([^"]+)"/);
          if (zip) info.zipballUrl = zip[1];
        }
        if (!info.defaultBranch) {
          const branch = text.match(/"defaultBranch"\s*:\s*"([^"]+)"/);
          if (branch) info.defaultBranch = branch[1];
        }
        // refInfo.name 是 GitHub 当前 ref 的权威来源，含斜杠的分支也能完整拿到
        if (!refInfo) {
          const match = text.match(/"refInfo"\s*:\s*\{[\s\S]{0,400}?"name"\s*:\s*"([^"]+)"/);
          if (match) refInfo = match[1];
        }
        if (!refName) {
          const match = text.match(/"refName"\s*:\s*"([^"]+)"/);
          if (match) refName = match[1];
        }
        if (info.zipballUrl && info.defaultBranch && (refInfo || refName)) break;
      }
      if (info.zipballUrl) info.refName = refFromArchiveHref(info.zipballUrl);
      if (refName) info.refName = refName;
      if (refInfo) info.refName = refInfo;
    } catch (e) {
      /* 页面结构变化时忽略 */
    }
    // 只缓存解析到结果的情况，页面脚本延迟加载时下次仍会重新扫描
    if (info.zipballUrl || info.defaultBranch || info.refName) repoInfoCache = { key, value: info };
    return info;
  }

  // ref 可能包含斜杠（如 tag: codeql-cli/v2.12.0），逐段编码，保留分隔符
  function refPath(ref) {
    return String(ref || '')
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');
  }

  function zipUrl(ctx) {
    if (!ctx) return '';
    if (ctx.isGist) {
      const links = $$('a[href*="/archive/"]').filter((a) =>
        a.href.startsWith('https://gist.github.com/')
      );
      const link = links.find((a) => /\.zip(\?|$)/i.test(a.href)) || links[0];
      return link ? link.href : '';
    }

    // 先从 URL 解析 ref；parseGitHubUrl 已还原的精确 ref 优先
    const urlRef = ctx.refExact && ctx.ref ? ctx.ref : getCurrentRef(ctx);

    // SHA 判断只看 rest[1]（kind 后面的第一个 URL segment）
    // 原因：blob/@SHA/README.md 页面 getCurrentRef 会返回 'SHA/README.md'（含路径），
    // 整体不再匹配纯 SHA 正则；但 rest[1] 永远是 URL 里的纯 ref 起点
    const firstSegment = (ctx.rest && ctx.rest[1]) || '';
    const isShaRef = /^[0-9a-f]{7,40}$/i.test(firstSegment);

    // 当 URL 第一个 segment 是 commit SHA 时，内嵌 JSON 指向 HEAD 或默认分支，
    // 必须跳过内嵌，直接用这个 SHA 构造 archive URL
    if (isShaRef) return buildArchiveUrl(ctx, firstSegment);

    const info = embeddedRepoInfo();
    const prefix = `/${ctx.owner}/${ctx.repo}/${ctx.kind || ''}/`;
    // 判断 ref 是否确实出现在当前路径中（解决带斜杠分支/Tag 被截断的问题）
    const refInPath = (ref) => {
      if (!ref || !ctx.kind) return false;
      const path = location.pathname;
      return path === prefix + ref || path.startsWith(prefix + ref + '/');
    };

    // 1. 页面内嵌 zipballUrl 是 GitHub 官方地址，优先使用
    if (info.zipballUrl) {
      try {
        const abs = new URL(info.zipballUrl, 'https://github.com').href;
        // 防止误用页面内其他仓库的内嵌数据
        if (!abs.includes(`/${ctx.owner}/${ctx.repo}/archive/`)) throw new Error('repo mismatch');
        const zipRef = refFromArchiveHref(info.zipballUrl);
        if (!urlRef || urlRef === zipRef || refInPath(zipRef)) return abs;
      } catch (e) {
        /* 忽略非法地址 */
      }
    }

    // 2. 从 DOM 抓原生按钮（Code 菜单里的 Download ZIP）
    const domLink = $$('a[href*="/archive/"]').find((a) => {
      try {
        const href = a.getAttribute('href') || '';
        if (!/^\/[^/]+\/[^/]+\/archive\//.test(href)) return false;
        if (!/\.(zip|tar\.gz)$/i.test(href)) return false;
        const m = href.match(/^\/([^/]+)\/([^/]+)\/archive\//);
        return m && m[1] === ctx.owner && m[2] === ctx.repo;
      } catch (e) { return false; }
    });

    if (domLink && domLink.href) {
      // DOM 按钮的 ref 必须和当前页面一致才信任
      const domRef = refFromArchiveHref(domLink.getAttribute('href') || '');
      if (!urlRef || urlRef === domRef || refInPath(domRef)) return domLink.href;
    }

    // 3. 兜底：按当前 ref 构造；仓库首页使用默认分支的 refs/heads 地址
    // parseGitHubUrl 已确认的精确 ref 优先；否则 tree / blob 取第一段作为猜测，
    // 含斜杠的分支依赖上面的内嵌 JSON / DOM 链接命中
    const fallbackRef =
      ctx.refExact && ctx.ref
        ? ctx.ref
        : (ctx.kind === 'tree' || ctx.kind === 'blob') && ctx.rest && ctx.rest[1]
          ? ctx.rest[1]
          : urlRef;
    return buildArchiveUrl(ctx, fallbackRef, info.defaultBranch);
  }

  // ---------------------------------------------------------------------------
  // 镜像 URL 生成 / 模板 / 自动降级
  // ---------------------------------------------------------------------------
  const HEALTH_TTL = 5 * 60 * 1000;

  function healthOf(m) {
    if (!m) return 'unknown';
    const h = state.health[m.id];
    if (!h || Date.now() - h.ts > HEALTH_TTL) return 'unknown';
    return h.ok ? 'ok' : 'bad';
  }

  function markHealth(id, ok) {
    state.health[id] = { ok: !!ok, ts: Date.now() };
  }

  function templateCaps(tpl) {
    const text = String(tpl || '');
    return {
      raw: /\{(rawUrl|url|owner)\}/.test(text),
      downloads: /\{url\}/.test(text),
    };
  }

  // 解析 owner / repo / ref / path（兼容 github.com/.../raw/... 与 raw.githubusercontent.com）
  function parseRepoPath(sourceUrl) {
    const empty = { owner: '', repo: '', ref: '', path: '' };
    try {
      const u = new URL(sourceUrl, location.href);
      let seg = u.pathname.split('/').filter(Boolean);
      let owner = '';
      let repo = '';
      let rest = [];
      if (u.hostname === 'raw.githubusercontent.com') {
        owner = seg[0] || '';
        repo = seg[1] || '';
        rest = seg.slice(2);
      } else if (u.hostname === 'github.com') {
        owner = seg[0] || '';
        repo = seg[1] || '';
        const marker = seg.includes('raw') ? 'raw' : seg.includes('blob') ? 'blob' : '';
        if (!marker) return { owner, repo, ref: '', path: '' };
        rest = seg.slice(seg.indexOf(marker) + 1);
      } else {
        return empty;
      }
      if (rest[0] === 'refs' && (rest[1] === 'heads' || rest[1] === 'tags')) rest = rest.slice(2);
      return { owner, repo, ref: rest[0] || '', path: rest.slice(1).join('/') };
    } catch (e) {
      return empty;
    }
  }

  function renderTemplate(tpl, sourceUrl, isRaw) {
    try {
      const info = parseRepoPath(sourceUrl);
      const u = new URL(sourceUrl, location.href);
      const vars = {
        url: sourceUrl,
        rawUrl: isRaw ? sourceUrl : '',
        owner: info.owner,
        repo: info.repo,
        ref: info.ref,
        path: info.path,
        refPath: [info.ref, info.path].filter(Boolean).join('/'),
        host: u.hostname,
      };
      if (/\{(ref|path|refPath)\}/.test(tpl) && (!info.ref || !info.path)) return '';
      return String(tpl).replace(/\{(\w+)\}/g, (all, key) =>
        Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : all
      );
    } catch (e) {
      return '';
    }
  }

  function activeMirror() {
    const s = state.settings;
    if (isCustomId(s.mirror)) return customMirror(s.mirror);
    return MIRRORS.find((m) => m.id === s.mirror) || MIRRORS[0];
  }

  function findCustomRoute(id) {
    return (state.settings.customRoutes || []).find((r) => r.id === id) || null;
  }

  function isApiRoute(route) {
    return !!route && (route.type === 'api' || !!(route.caps && route.caps.api));
  }

  // 自定义线路中的 API 基础地址：仅「API 加速」类型且未禁用时可用
  function customApiBase(id) {
    const route = findCustomRoute(id);
    if (!route || !isApiRoute(route) || isMirrorDisabled(route.id)) return '';
    return normalizeBase(route.base);
  }

  function defaultCustomCaps(type, base) {
    if (type === 'api') return { raw: false, downloads: false, clone: false, api: true, browse: false };
    if (type === 'template') {
      const caps = templateCaps(String(base || ''));
      return {
        raw: !!caps.raw,
        downloads: !!caps.downloads,
        clone: /\{(url|cloneUrl)\}/.test(String(base || '')),
        api: false,
        browse: false,
      };
    }
    // 全站镜像默认可浏览；代理前缀（如自建 Worker）可手动勾选「浏览」
    return { raw: true, downloads: true, clone: true, api: false, browse: type === 'site' };
  }

  // 模板与 API 线路的能力由类型决定，代理 / 全站镜像可单独开关
  function customRouteCaps(route) {
    const type = route.type || 'proxy';
    const defaults = defaultCustomCaps(type, route.base);
    if (type === 'template' || type === 'api') return defaults;
    const caps = route.caps || {};
    const pick = (key) => (typeof caps[key] === 'boolean' ? caps[key] : defaults[key]);
    return {
      raw: pick('raw'),
      downloads: pick('downloads'),
      clone: pick('clone'),
      api: pick('api'),
      browse: pick('browse'),
    };
  }

  function customMirror(id) {
    const routes = state.settings.customRoutes || [];
    const index = id ? routes.findIndex((r) => r.id === id) : routes.findIndex((r) => r.id === 'custom');
    if (index < 0) return null;
    const c = routes[index];
    const type = c.type || 'proxy';
    if (type === 'api') return null;
    const raw = String(c.base || '').trim();
    if (!raw) return null;
    const label = c.label || (type === 'template' ? `自定义模板 ${index + 1}` : `自定义线路 ${index + 1}`);
    if (type === 'template') {
      if (!/^https?:\/\//i.test(raw)) return null;
      return { id: c.id, label, type: 'template', template: raw, caps: customRouteCaps(c), custom: true };
    }
    return {
      id: c.id,
      label,
      type,
      base: normalizeBase(raw),
      caps: customRouteCaps(c),
      custom: true,
    };
  }

  function mirrorCaps(m, need) {
    if (!m) return false;
    const caps = m.caps || {};
    if (need === 'browse') {
      if (typeof caps.browse === 'boolean') return caps.browse;
      return m.type === 'site';
    }
    if (need === 'api') {
      return typeof caps.api === 'boolean' ? caps.api : false;
    }
    if (need === 'clone') {
      if (m.type === 'template') return /\{(url|cloneUrl)\}/.test(String(m.template || ''));
      if (typeof caps.clone === 'boolean') return caps.clone;
      // 未标记能力的代理默认不支持 Clone，全站镜像默认支持
      if (m.type === 'proxy') return false;
      return m.type !== 'template';
    }
    if (m.type === 'clone') return false;
    if (typeof caps[need] === 'boolean') return caps[need];
    if (m.type === 'template') {
      const derived = m.caps || templateCaps(m.template);
      return !!derived[need];
    }
    return m.type === 'proxy' || m.type === 'site';
  }

  function isMirrorDisabled(id) {
    return (state.settings.disabledMirrors || []).indexOf(id) >= 0;
  }

  // 统一排序：禁用置底 → 置顶顺序 → 健康度 → 测速耗时 → 原始顺序
  function sortedMirrors(list) {
    const pinned = state.settings.pinnedMirrors || [];
    const order = new Map(MIRRORS.map((m, i) => [m.id, i]));
    (state.settings.customRoutes || []).forEach((route, i) => {
      order.set(route.id, MIRRORS.length + i);
    });
    const pinRank = (m) => {
      const i = pinned.indexOf(m.id);
      return i < 0 ? Number.MAX_SAFE_INTEGER : i;
    };
    const healthRank = (m) => {
      const h = healthOf(m);
      return h === 'ok' ? 0 : h === 'bad' ? 2 : 1;
    };
    const speedRank = (m) => {
      const ms = Number(state.settings.speeds[m.id]);
      if (Number.isFinite(ms) && ms > 0) return ms;
      if (Number.isFinite(ms) && ms < 0) return 999999;
      return 500000;
    };
    return list.slice().sort((a, b) => {
      const da = isMirrorDisabled(a.id) ? 1 : 0;
      const db = isMirrorDisabled(b.id) ? 1 : 0;
      if (da !== db) return da - db;
      const pa = pinRank(a);
      const pb = pinRank(b);
      if (pa !== pb) return pa - pb;
      const ha = healthRank(a);
      const hb = healthRank(b);
      if (ha !== hb) return ha - hb;
      const sa = speedRank(a);
      const sb = speedRank(b);
      if (sa !== sb) return sa - sb;
      return (order.get(a.id) || 0) - (order.get(b.id) || 0);
    });
  }

  // 可用的自定义浏览线路（排除 API 线路与未配置地址的条目）
  function customMirrorList() {
    return (state.settings.customRoutes || []).map((route) => customMirror(route.id)).filter(Boolean);
  }

  function mirrorById(id) {
    return MIRRORS.find((m) => m.id === id) || customMirror(id);
  }

  function browsingMirrors() {
    return MIRRORS.concat(customMirrorList());
  }

  // 线路管理需要展示全部自定义线路，包括未填写地址与 API 线路
  function manageMirrorList() {
    return MIRRORS.concat(
      (state.settings.customRoutes || []).map((route, index) => ({
        id: route.id,
        label: route.label || `自定义线路 ${index + 1}`,
        type: route.type || 'proxy',
        base: route.base,
        caps: customRouteCaps(route),
        custom: true,
      })),
    );
  }

  // API 加速可用的自定义线路
  function apiMirrorList() {
    return (state.settings.customRoutes || [])
      .map((route, index) => {
        const base = normalizeBase(route.base);
        if (!isApiRoute(route) || !base) return null;
        return {
          id: route.id,
          label: route.label || `API 线路 ${index + 1}`,
          type: 'api',
          base,
          caps: customRouteCaps(route),
          custom: true,
        };
      })
      .filter(Boolean);
  }

  // 按用途取线路：'raw' | 'downloads' | 'clone'，未单独设置时跟随主线路
  function mirrorFor(need) {
    const s = state.settings;
    const key = need === 'raw' ? 'mirrorRaw' : need === 'clone' ? 'mirrorClone' : 'mirrorDownloads';
    const id = s[key] || 'auto';
    if (/^custom/.test(String(id))) return customMirror(id);
    if (id === 'auto') {
      const active = activeMirror();
      // 主线路不支持 git clone（如 jsDelivr / 仅 Raw 的模板）时改用可 Clone 的节点
      if (need === 'clone' && !mirrorCaps(active, 'clone')) {
        return fallbackCloneMirror() || active;
      }
      return active;
    }
    return MIRRORS.find((m) => m.id === id) || activeMirror();
  }

  // Clone 兜底：按置顶 / 健康度 / 测速从可 Clone 的线路中挑一个
  function fallbackCloneMirror() {
    const pool = sortedMirrors(
      MIRRORS.filter(
        (m) => mirrorCaps(m, 'clone') && !isMirrorDisabled(m.id) && healthOf(m) !== 'bad',
      ),
    );
    return pool[0] || null;
  }

  // 按「置顶 → 健康度 → 测速」排序候选线路
  function orderedPool(need) {
    need = need || 'downloads';
    const preferred = mirrorFor(need);
    const pinned = state.settings.pinnedMirrors || [];
    const preferredUsable =
      preferred && mirrorCaps(preferred, need) && !isMirrorDisabled(preferred.id);
    const pool = MIRRORS.filter((m) => !isMirrorDisabled(m.id) && mirrorCaps(m, need));
    if (preferredUsable && !pool.some((m) => m.id === preferred.id)) {
      pool.unshift(preferred);
    }
    const rank = (m) => {
      const h = healthOf(m);
      const ms = Number(state.settings.speeds[m.id]);
      return [h === 'bad' ? 2 : h === 'ok' ? 0 : 1, ms > 0 ? ms : 99999];
    };
    const pinIndex = (m) => {
      const index = pinned.indexOf(m.id);
      return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    };
    pool.sort((a, b) => {
      const pa = pinIndex(a);
      const pb = pinIndex(b);
      if (pa !== pb) return pa - pb;
      const [ra, ma] = rank(a);
      const [rb, mb] = rank(b);
      return ra - rb || ma - mb;
    });
    // 有置顶线路时按置顶顺序优先；否则把选中的主线路提到最前
    const hasPinned = pool.some((m) => pinned.indexOf(m.id) >= 0);
    if (!hasPinned && preferredUsable && healthOf(preferred) !== 'bad') {
      const index = pool.findIndex((m) => m.id === preferred.id);
      if (index > 0) pool.unshift(pool.splice(index, 1)[0]);
    }
    return pool;
  }

  function pickMirror(need, silent) {
    const pool = orderedPool(need);
    if (!pool.length) return null;
    const chosen = pool.find((m) => healthOf(m) !== 'bad') || pool[0];
    const preferred = mirrorFor(need);
    if (
      !silent &&
      state.settings.autoFallback &&
      preferred &&
      chosen.id !== preferred.id &&
      healthOf(preferred) === 'bad' &&
      state.toast
    ) {
      state.toast(`线路 ${preferred.label} 不可用，已自动切换至 ${chosen.label}`);
    }
    return chosen;
  }

  function chooseDownloadMirror(need, silent) {
    need = need || 'downloads';
    if (!state.settings.autoFallback) {
      const m = mirrorFor(need);
      if (mirrorCaps(m, need)) return m;
      return orderedPool(need)[0] || null;
    }
    return pickMirror(need, silent);
  }

  function chooseCloneMirror(silent) {
    return state.settings.autoFallback
      ? pickMirror('clone', silent)
      : mirrorFor('clone');
  }

  // 后台探测首选线路，失败后自动标记并逐个尝试候补
  async function ensureHealthy() {
    if (!state.settings.enabled || !state.settings.autoFallback) return null;
    const pool = orderedPool('downloads')
      .filter((m) => m.type !== 'template')
      .slice(0, 4);
    const known = pool.find((m) => healthOf(m) === 'ok');
    if (known) return known;
    for (const m of pool) {
      if (healthOf(m) === 'bad') continue;
      const result = await probeMirror(m, 3500);
      markHealth(m.id, result.ok);
      if (result.ok) return m;
    }
    return null;
  }

  function mirrorize(url, mirror) {
    const m = mirror || activeMirror();
    if (!m || !url) return url;
    if (m.type === 'proxy') return m.base + url;
    if (m.type === 'template') {
      if (!mirrorCaps(m, 'downloads')) return url;
      return renderTemplate(m.template, url, false) || url;
    }
    if (m.type === 'site') {
      try {
        const u = new URL(url, location.href);
        if (u.hostname === 'github.com') {
          return stripTrailingSlash(m.base) + u.pathname + u.search + u.hash;
        }
      } catch (e) {
        /* ignore */
      }
      return url;
    }
    return url;
  }

  function mirrorizeRaw(rawUrl, mirror) {
    const m = mirror || activeMirror();
    if (!m || !rawUrl) return rawUrl;
    if (m.type === 'proxy') return m.base + rawUrl;
    if (m.type === 'template') {
      if (!mirrorCaps(m, 'raw')) return rawUrl;
      return renderTemplate(m.template, rawUrl, true) || rawUrl;
    }
    if (m.type === 'site') {
      try {
        const u = new URL(rawUrl, location.href);
        if (u.hostname === 'raw.githubusercontent.com') {
          const seg = u.pathname.split('/').filter(Boolean);
          if (seg.length >= 3) {
            const owner = seg[0];
            const repo = seg[1];
            const rest = seg.slice(2).join('/');
            return `${stripTrailingSlash(m.base)}/${owner}/${repo}/raw/${rest}`;
          }
        }
        return mirrorize(rawUrl, m);
      } catch (e) {
        return rawUrl;
      }
    }
    return rawUrl;
  }

  function siteMirror() {
    const m = activeMirror();
    if (m && mirrorCaps(m, 'browse')) return m;
    return browsingMirrors().find((x) => mirrorCaps(x, 'browse')) || null;
  }

  // 镜像浏览地址：全站镜像直接拼路径；代理前缀需拼完整 GitHub 地址（如自建 Worker）
  function browseHref(m, pathname, search, hash) {
    if (!m) return '';
    const path = (pathname || location.pathname) + (search || location.search) + (hash || location.hash);
    if (m.type === 'proxy') return normalizeBase(m.base) + location.origin + path;
    if (m.type === 'site') return stripTrailingSlash(m.base) + path;
    return '';
  }

  // 分支名含 shell 特殊字符时加单引号
  function shellArg(value) {
    const text = String(value || '');
    if (/^[\w./@+-]+$/.test(text)) return text;
    return "'" + text.replace(/'/g, "'\\''") + "'";
  }

  function cloneCommand(ctx, mirror) {
    if (!ctx) return '';
    let m = mirror || mirrorFor('clone');
    // 指定线路被禁用或不支持 git clone 时，换成可用的 Clone 节点，避免生成无效命令
    if (!m || isMirrorDisabled(m.id) || !mirrorCaps(m, 'clone')) m = fallbackCloneMirror();
    const httpsUrl = ctx.isGist
      ? `https://gist.github.com/${ctx.repo}.git`
      : `https://github.com/${ctx.owner}/${ctx.repo}.git`;
    const depth = Math.min(10000, Math.max(0, Math.floor(Number(state.settings.cloneDepth) || 0)));
    // 解析当前 ref：分支 / Tag 用 --branch，commit SHA 在 clone 后 checkout
    const branchKinds = ['', 'tree', 'blob', 'tag', 'releases'];
    let ref = '';
    let isSha = false;
    if (!ctx.isGist) {
      // parseGitHubUrl 已还原的精确 ref（含斜杠分支）优先于 archive 地址反解
      const exactRef = ctx.refExact && ctx.ref ? ctx.ref : '';
      // 已有精确 ref 时无需再解析 ZIP 地址（会触发一次页面扫描）
      const zipRef = exactRef ? '' : refFromArchiveHref(zipUrl(ctx));
      if (!ctx.kind || branchKinds.indexOf(ctx.kind) >= 0) {
        ref = exactRef || zipRef || embeddedRepoInfo().defaultBranch || '';
        isSha = /^[0-9a-f]{7,40}$/i.test(ref);
      } else if (ctx.kind === 'commit' || ctx.kind === 'commits') {
        ref = exactRef || zipRef;
        isSha = /^[0-9a-f]{7,40}$/i.test(ref);
      }
    }
    const branch = ref && !isSha ? ` --branch ${shellArg(ref)}` : '';

    // 解析实际使用的 Clone 地址
    const resolveTarget = (mm) => {
      if (!mm) return httpsUrl;
      if (ctx.isGist && (mm.type === 'site' || mm.type === 'clone')) return httpsUrl;
      if (mm.type === 'proxy') return `${mm.base}${httpsUrl}`;
      if (mm.type === 'site') return `${mm.base.replace(/\/+$/, '')}/${ctx.owner}/${ctx.repo}.git`;
      if (mm.type === 'clone') return `${mm.base}github.com/${ctx.owner}/${ctx.repo}.git`;
      if (mm.type === 'template') {
        if (mm.template.includes('{cloneUrl}')) return mm.template.replace(/\{cloneUrl\}/g, httpsUrl);
        if (mm.template.includes('{url}')) return mm.template.replace(/\{url\}/g, httpsUrl);
      }
      return httpsUrl;
    };

    const target = resolveTarget(m);
    const repoDir = shellArg(ctx.repo);
    const parts = [`git clone${branch}${depth > 0 ? ` --depth ${depth}` : ''} ${target}`];
    if (isSha) {
      if (depth > 0) parts.push(`git -C ${repoDir} fetch --depth ${depth} origin ${shellArg(ref)}`);
      parts.push(`git -C ${repoDir} checkout ${shellArg(ref)}`);
    }
    // 走镜像时 origin 会被写成镜像地址，克隆完成后还原为官方仓库，便于 push / 直连
    if (state.settings.restoreOrigin !== false && target !== httpsUrl) {
      parts.push(`git -C ${repoDir} remote set-url origin ${httpsUrl}`);
    }
    return parts.join(' && ');
  }

  function isDownloadUrl(url) {
    try {
      const u = new URL(url);
      if (u.hostname !== 'github.com') return false;
      return (
        /\/releases\/download\//.test(u.pathname) ||
        /\/archive\/refs\//.test(u.pathname) ||
        /\/archive\/[^/]+\.(zip|tar\.gz)$/.test(u.pathname) ||
        /\/archive\/HEAD\.(zip|tar\.gz)$/.test(u.pathname)
      );
    } catch (e) {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // 工具动作：Release 资产 / 文件下载 / git 配置 / 配置导入导出
  // ---------------------------------------------------------------------------
  function collectAssetLinks() {
    const seen = new Set();
    const list = [];
    $$('a[href*="/releases/download/"]').forEach((a) => {
      const url = a.href;
      if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\//.test(url)) return;
      if (seen.has(url)) return;
      seen.add(url);
      const rawName = (url.split('/').pop() || '').split('?')[0];
      let name = rawName;
      try {
        name = decodeURIComponent(rawName);
      } catch (e) {
        /* 保留原样 */
      }
      list.push({ url, name: name || 'download' });
    });
    return list;
  }

  // 通过 GM 请求拉取镜像文件，失败时自动切换下一条线路
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function requestBlob(url, timeout) {
    return new Promise((resolve, reject) => {
      try {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          responseType: 'blob',
          timeout: timeout || 45000,
          onload: (res) => {
            if (res.status >= 200 && res.status < 300 && res.response) resolve(res.response);
            else reject(new Error(`HTTP ${res.status}`));
          },
          onerror: () => reject(new Error('网络错误')),
          ontimeout: () => reject(new Error('请求超时')),
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  function saveBlob(blob, filename) {
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename || 'download';
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    } catch (e) {
      return false;
    } finally {
      setTimeout(() => {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
      }, 60000);
    }
  }

  async function downloadViaMirror(url, filename, notify, need) {
    const say = notify || state.toast || (() => { });
    state.stats.downloads++;
    if (!url) {
      state.stats.fail++;
      say('下载地址为空', true);
      renderPanel();
      return false;
    }
    const pool = orderedPool(need || 'downloads').slice(0, 4);
    if (!pool.length) {
      state.stats.fail++;
      say('没有可用的下载镜像', true);
      renderPanel();
      return false;
    }
    if (typeof GM_xmlhttpRequest !== 'function') {
      state.stats.ok++;
      openInNewTab(mirrorize(url, pool[0]));
      renderPanel();
      return true;
    }
    for (let i = 0; i < pool.length; i++) {
      const m = pool[i];
      const target = mirrorize(url, m);
      if (!target) continue;
      say(`通过 ${m.label} 下载…（${i + 1}/${pool.length}）`);
      try {
        const blob = await requestBlob(target, 120000);
        if (
          blob &&
          typeof blob.type === 'string' &&
          /^text\/html/i.test(blob.type) &&
          !/\.html?$/i.test(filename || '')
        ) {
          throw new Error('线路返回网页而非文件');
        }
        if (/\.zip$/i.test(filename || '') && blob && typeof blob.slice === 'function') {
          const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
          if (head[0] !== 0x50 || head[1] !== 0x4b) throw new Error('返回内容不是 ZIP');
        }
        markHealth(m.id, true);
        if (!saveBlob(blob, filename)) throw new Error('无法保存文件');
        state.stats.ok++;
        say(`下载完成：${filename || ''}`.trim());
        renderPanel();
        return true;
      } catch (e) {
        markHealth(m.id, false);
        say(`${m.label} 下载失败，正在尝试下一条线路…`, true);
        await sleep(300);
      }
    }
    state.stats.fail++;
    say('所有已尝试的镜像均失败，已改为新窗口打开原链接', true);
    openInNewTab(url);
    renderPanel();
    return false;
  }

  async function downloadAssets(notify) {
    const say = notify || state.toast || (() => { });
    const list = collectAssetLinks();
    if (!list.length) return say('当前页面没有 Release 资产', true);
    say(`开始下载 ${list.length} 个资产…`);
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      say(`下载资产 ${i + 1}/${list.length}：${list[i].name}`);
      if (await downloadViaMirror(list[i].url, list[i].name, say)) ok++;
      await sleep(800);
    }
    say(`资产下载结束：成功 ${ok}/${list.length}`);
  }

  // ---------------------------------------------------------------------------
  // GitHub Actions：制品 / 日志（需登录态或 Token）
  //   Artifacts 必须鉴权，普通前缀镜像无法代理；有 Token 时用 GM_xmlhttpRequest
  //   带 Authorization 直连 api.github.com，无 Token 时用浏览器 Cookie 走网页
  //   下载地址；也可以经用户自建 Worker（ENABLE_API=1 + ALLOW_AUTH=1）转发。
  // ---------------------------------------------------------------------------
  function actionsRunInfo() {
    if (!IS_GH) return null;
    const match = location.pathname.match(/^\/([^/]+)\/([^/]+)\/actions\/runs\/(\d+)/);
    if (!match) return null;
    return { owner: match[1], repo: match[2], runId: match[3] };
  }

  // 读取 GitHub 登录名；匿名页面该 meta 的 content 为空
  function githubLogin() {
    const meta = document.querySelector('meta[name="user-login"]');
    return meta ? String(meta.getAttribute('content') || '').trim() : '';
  }

  function actionsApiBase() {
    const s = state.settings;
    // 第三方 API 镜像不接收凭据：只有用户自建的自定义地址才用于鉴权请求
    const base = s.apiMirror === 'custom' ? normalizeBase(s.apiCustom) : customApiBase(s.apiMirror);
    return base || 'https://api.github.com/';
  }

  function ghApiRequest(url, responseType, timeout) {
    return new Promise((resolve, reject) => {
      const token = String(state.settings.actionsToken || '').trim();
      if (typeof GM_xmlhttpRequest !== 'function') {
        return reject(new Error('GM_xmlhttpRequest 不可用'));
      }
      const headers = {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      };
      // Token 可选：公开仓库的 Actions 列表接口可匿名访问（下载仍需登录）
      if (token) headers.Authorization = `Bearer ${token}`;
      try {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          headers,
          responseType: responseType || 'json',
          timeout: timeout || 60000,
          onload: (res) => {
            if (res.status >= 200 && res.status < 300) resolve(res.response);
            else reject(new Error(`HTTP ${res.status}`));
          },
          onerror: () => reject(new Error('网络错误')),
          ontimeout: () => reject(new Error('请求超时')),
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  // 带浏览器登录态（Cookie）的下载，用于没有 Token 时
  function sessionRequest(url, timeout) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'function') {
        return reject(new Error('GM_xmlhttpRequest 不可用'));
      }
      try {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          responseType: 'blob',
          timeout: timeout || 180000,
          onload: (res) => {
            if (res.status >= 200 && res.status < 300) resolve(res.response);
            else reject(new Error(`HTTP ${res.status}`));
          },
          onerror: () => reject(new Error('网络错误')),
          ontimeout: () => reject(new Error('请求超时')),
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  async function listRunArtifacts(info) {
    const base = actionsApiBase();
    const out = [];
    for (let page = 1; page <= 5; page++) {
      const data = await ghApiRequest(
        `${base}repos/${info.owner}/${info.repo}/actions/runs/${info.runId}/artifacts?per_page=100&page=${page}`
      );
      let list = [];
      if (typeof data === 'string') {
        try {
          list = JSON.parse(data).artifacts || [];
        } catch (e) {
          list = [];
        }
      } else if (data && Array.isArray(data.artifacts)) {
        list = data.artifacts;
      }
      out.push(...list);
      if (list.length < 100) break;
    }
    return out.filter((a) => a && !a.expired);
  }

  // 从当前页面抓取制品链接（API 不可用或未配置 Token 时使用）
  function domRunArtifacts() {
    const map = new Map();
    $$('a[href*="/artifacts/"]').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const idMatch = href.match(/\/artifacts\/(\d+)/);
      if (!idMatch) return;
      const id = idMatch[1];
      const name = (a.textContent || '').trim();
      if (!map.has(id)) map.set(id, { id, name: name || `artifact-${id}`, url: a.href });
    });
    return Array.from(map.values());
  }

  function artifactWebUrl(info, item) {
    // API 返回的 item.url 是 JSON 接口地址，不能直接当下载地址
    if (item.url && /^https:\/\/github\.com\//i.test(item.url)) return item.url;
    return `https://github.com/${info.owner}/${info.repo}/actions/runs/${info.runId}/artifacts/${item.id}`;
  }

  async function downloadRunArtifacts(notify) {
    const say = notify || state.toast || (() => { });
    const info = actionsRunInfo();
    if (!info) return say('请先打开一个 Actions 运行页面', true);
    const token = String(state.settings.actionsToken || '').trim();
    if (!token && !githubLogin()) {
      return say('Actions 制品不支持匿名下载：请先登录 GitHub，或在「设置」填写 Token', true);
    }
    say('正在读取 Actions 制品列表…');
    let list = [];
    try {
      list = await listRunArtifacts(info);
    } catch (e) {
      list = domRunArtifacts();
      if (!list.length) {
        const hint = /HTTP (401|403|404)/.test(e.message)
          ? '请先在浏览器登录 GitHub，或在面板填写 Token（点“获取 Token”）'
          : '可在“API 加速”里配置可访问 api.github.com 的地址';
        return say(`读取制品失败：${e.message}。${hint}`, true);
      }
    }
    if (!list.length) return say('该运行没有可下载的制品（可能已过期）', true);
    const base = actionsApiBase();
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      say(`下载制品 ${i + 1}/${list.length}：${item.name}`);
      try {
        let blob;
        if (token) {
          try {
            blob = await ghApiRequest(
              `${base}repos/${info.owner}/${info.repo}/actions/artifacts/${item.id}/zip`,
              'blob',
              180000
            );
          } catch (apiErr) {
            // Token 失效或无权限时退回浏览器登录态
            blob = await sessionRequest(artifactWebUrl(info, item), 180000);
          }
        } else {
          // 无 Token：用浏览器登录态走网页下载地址
          blob = await sessionRequest(artifactWebUrl(info, item), 180000);
        }
        if (!saveBlob(blob, `${item.name || `artifact-${item.id}`}.zip`)) {
          throw new Error('无法保存文件');
        }
        state.stats.downloads++;
        state.stats.ok++;
        ok++;
      } catch (e) {
        state.stats.fail++;
        say(`制品 ${item.name} 下载失败：${e.message}`, true);
      }
      await sleep(800);
    }
    renderPanel();
    say(`制品下载结束：成功 ${ok}/${list.length}`);
  }

  async function downloadRunLog(notify) {
    const say = notify || state.toast || (() => { });
    const info = actionsRunInfo();
    if (!info) return say('请先打开一个 Actions 运行页面', true);
    say('正在下载运行日志…');
    const token = String(state.settings.actionsToken || '').trim();
    if (!token && !githubLogin()) {
      return say('Actions 日志不支持匿名下载：请先登录 GitHub，或在「设置」填写 Token', true);
    }
    const apiLogs = `${actionsApiBase()}repos/${info.owner}/${info.repo}/actions/runs/${info.runId}/logs`;
    const webLogs = `https://github.com/${info.owner}/${info.repo}/actions/runs/${info.runId}/logs`;
    try {
      let blob;
      if (token) {
        try {
          blob = await ghApiRequest(apiLogs, 'blob', 180000);
        } catch (apiErr) {
          blob = await sessionRequest(webLogs, 180000);
        }
      } else {
        blob = await sessionRequest(webLogs, 180000);
      }
      if (!saveBlob(blob, `${info.repo}-run-${info.runId}-logs.zip`)) {
        throw new Error('无法保存文件');
      }
      state.stats.downloads++;
      state.stats.ok++;
      renderPanel();
      say('运行日志已下载');
    } catch (e) {
      state.stats.fail++;
      renderPanel();
      const hint = /HTTP (401|403|404)/.test(e.message)
        ? '下载日志需要登录态或 Token'
        : '';
      say(`日志下载失败：${e.message}${hint ? `。${hint}` : ''}`, true);
    }
  }

  function ghDownloadCommand() {
    const info = actionsRunInfo();
    if (!info) return '';
    return `gh run download ${info.runId} -R ${info.owner}/${info.repo}`;
  }

  // 生成 git insteadOf 全局配置，让 git clone / fetch 自动走镜像
  function insteadOfCommand() {
    let m = mirrorFor('clone');
    if (!m || m.type === 'template') m = fallbackCloneMirror() || activeMirror();
    if (!m) return '';
    let prefix = '';
    if (m.type === 'proxy') prefix = `${m.base}https://github.com/`;
    else if (m.type === 'site') prefix = `${stripTrailingSlash(m.base)}/`;
    else if (m.type === 'clone') prefix = `${m.base}github.com/`;
    if (!prefix) return '';
    return `git config --global url."${prefix}".insteadOf "https://github.com/"`;
  }

  function exportConfig(notify) {
    // 导出的配置不含 Token，避免凭据随 JSON 流出
    const data = Object.assign({}, state.settings);
    delete data.actionsToken;
    const text = JSON.stringify(data, null, 2);
    copyText(text).then((ok) => {
      if (notify) notify(ok ? '配置 JSON 已复制到剪贴板' : '复制失败', !ok);
    });
  }

  function isKnownMirrorId(id) {
    return MIRRORS.some((m) => m.id === id);
  }

  // 自定义线路按 MIRRORS 的字段结构归一化，支持多条
  function sanitizeCustomRoute(input, fallbackId) {
    const c = input && typeof input === 'object' ? input : {};
    const type = ['proxy', 'site', 'template', 'api'].indexOf(c.type) >= 0 ? c.type : 'proxy';
    let base = String(c.base || '').trim();
    if (type !== 'template') base = normalizeBase(base);
    const defaults = defaultCustomCaps(type, base);
    const caps = c.caps && typeof c.caps === 'object' ? c.caps : {};
    const pick = (key) => (typeof caps[key] === 'boolean' ? caps[key] : defaults[key]);
    return {
      id: /^custom[\w:-]*$/i.test(String(c.id || '')) ? String(c.id) : fallbackId,
      label: String(c.label || '').trim(),
      type,
      base,
      caps:
        type === 'template' || type === 'api'
          ? defaults
          : {
            raw: pick('raw'),
            downloads: pick('downloads'),
            clone: pick('clone'),
            api: pick('api'),
            browse: pick('browse'),
          },
    };
  }

  function sanitizeCustomRoutes(list, legacy) {
    const out = [];
    const used = new Set();
    const source = Array.isArray(list) ? list : [];
    source.forEach((item) => {
      const route = sanitizeCustomRoute(item, 'custom');
      let id = route.id;
      let n = 2;
      while (used.has(id)) id = 'custom-' + n++;
      used.add(id);
      route.id = id;
      if (route.base || route.label) out.push(route);
    });
    // 兼容旧版单条 custom 配置
    if (!out.length && legacy && typeof legacy === 'object' && String(legacy.base || '').trim()) {
      out.push(sanitizeCustomRoute(Object.assign({ id: 'custom' }, legacy), 'custom'));
    }
    return out;
  }

  // 旧版“自定义 API 地址”迁移为一条 API 类型的自定义线路
  function migrateLegacyApi(settings) {
    if (!settings || settings.apiMirror !== 'custom') return;
    const base = normalizeBase(settings.apiCustom);
    if (!base) {
      settings.apiMirror = 'off';
      settings.apiCustom = '';
      return;
    }
    const routes = settings.customRoutes || (settings.customRoutes = []);
    let route = routes.find((r) => isApiRoute(r) && normalizeBase(r.base) === base);
    if (!route) {
      route = {
        id: nextCustomRouteId(routes),
        label: 'API 加速',
        type: 'api',
        base,
        caps: defaultCustomCaps('api'),
      };
      routes.push(route);
    }
    settings.apiMirror = route.id;
    settings.apiCustom = '';
  }

  // 导入配置时只接受已知字段，并逐项校验取值
  function sanitizeSettings(input) {
    const out = {
      enabled: DEFAULTS.enabled,
      mirror: DEFAULTS.mirror,
      mirrorRaw: DEFAULTS.mirrorRaw,
      mirrorDownloads: DEFAULTS.mirrorDownloads,
      mirrorClone: DEFAULTS.mirrorClone,
      customRoutes: [],
      disabledMirrors: [],
      pinnedMirrors: [],
      cloneDepth: DEFAULTS.cloneDepth,
      restoreOrigin: DEFAULTS.restoreOrigin,
      autoDownload: DEFAULTS.autoDownload,
      autoFallback: DEFAULTS.autoFallback,
      codeToolbar: DEFAULTS.codeToolbar,
      rawButton: DEFAULTS.rawButton,
      apiMirror: DEFAULTS.apiMirror,
      apiCustom: DEFAULTS.apiCustom,
      actionsToken: DEFAULTS.actionsToken,
      staticCdn: DEFAULTS.staticCdn,
      hotkey: DEFAULTS.hotkey,
      speeds: {},
    };
    if (!input || typeof input !== 'object' || Array.isArray(input)) return out;

    ['enabled', 'autoDownload', 'autoFallback', 'codeToolbar', 'rawButton', 'staticCdn', 'restoreOrigin'].forEach(
      (key) => {
        if (typeof input[key] === 'boolean') out[key] = input[key];
      }
    );

    out.customRoutes = sanitizeCustomRoutes(input.customRoutes, input.custom);

    const validMirror = (id) =>
      isKnownMirrorId(id) || out.customRoutes.some((route) => route.id === id);
    if (validMirror(input.mirror)) out.mirror = input.mirror;
    ['mirrorRaw', 'mirrorDownloads', 'mirrorClone'].forEach((key) => {
      const value = input[key];
      if (value === 'auto' || validMirror(value)) out[key] = value;
    });

    const validId = (id) =>
      isKnownMirrorId(id) || out.customRoutes.some((route) => route.id === id);
    const disabled = Array.isArray(input.disabledMirrors) ? input.disabledMirrors : [];
    out.disabledMirrors = disabled
      .filter(validId)
      .filter((id, index, list) => list.indexOf(id) === index);
    const pinned = Array.isArray(input.pinnedMirrors) ? input.pinnedMirrors : [];
    out.pinnedMirrors = pinned
      .filter(validId)
      .filter((id, index, list) => list.indexOf(id) === index);

    const apiIds = builtinApiList().map((m) => m.id);
    const apiCustom = normalizeBase(input.apiCustom);
    if (apiCustom) out.apiCustom = apiCustom;
    if (input.apiMirror === 'custom') {
      out.apiMirror = 'custom';
      migrateLegacyApi(out);
    } else if (
      input.apiMirror === 'off' ||
      apiIds.indexOf(input.apiMirror) >= 0 ||
      out.customRoutes.some((route) => route.id === input.apiMirror && isApiRoute(route))
    ) {
      out.apiMirror = input.apiMirror;
    }

    const actionsToken = String(input.actionsToken || '').trim();
    if (actionsToken) out.actionsToken = actionsToken.slice(0, 255);

    const hotkey = String(input.hotkey || '').trim();
    if (parseHotkey(hotkey)) out.hotkey = hotkey;

    if (Number.isFinite(Number(input.cloneDepth))) {
      const depth = Math.floor(Number(input.cloneDepth));
      if (depth >= 0 && depth <= 10000) out.cloneDepth = depth;
    }

    if (input.speeds && typeof input.speeds === 'object') {
      Object.keys(input.speeds).forEach((id) => {
        if (!validId(id)) return;
        const ms = Number(input.speeds[id]);
        if (Number.isFinite(ms)) out.speeds[id] = Math.max(-1, Math.min(600000, Math.round(ms)));
      });
    }
    return out;
  }

  function importConfig(notify) {
    let text = '';
    try {
      text = window.prompt('粘贴配置 JSON：') || '';
    } catch (e) {
      text = '';
    }
    if (!text.trim()) return;
    try {
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('bad');
      const merged = sanitizeSettings(data);
      // 导入的配置通常不含 Token，保留本地已保存的值
      if (!merged.actionsToken) merged.actionsToken = state.settings.actionsToken || '';
      // 浮动按钮位置属于本机 UI 偏好，不随配置导入而被重置
      merged.fabPos = Object.assign({}, DEFAULTS.fabPos, state.settings.fabPos || {});
      state.settings = merged;
      state.health = {};
      saveSettings();
      if (!merged.staticCdn) restoreStaticCdn();
      renderPanel();
      refreshInjected();
      if (notify) notify('配置已导入');
    } catch (e) {
      if (notify) notify('配置格式不正确', true);
    }
  }

  // ---------------------------------------------------------------------------
  // 快捷键 / 主题
  // ---------------------------------------------------------------------------
  function parseHotkey(text) {
    const parts = String(text || '')
      .split('+')
      .map((p) => p.trim())
      .filter(Boolean);
    const combo = { alt: false, ctrl: false, shift: false, meta: false, key: '' };
    parts.forEach((p) => {
      const k = p.toLowerCase();
      if (k === 'alt' || k === 'option') combo.alt = true;
      else if (k === 'ctrl' || k === 'control') combo.ctrl = true;
      else if (k === 'shift') combo.shift = true;
      else if (k === 'meta' || k === 'cmd' || k === 'command' || k === 'win') combo.meta = true;
      else combo.key = p;
    });
    return combo.key ? combo : null;
  }

  function matchHotkey(e) {
    const combo = parseHotkey(state.settings.hotkey || DEFAULTS.hotkey);
    if (!combo) return false;
    if (!!e.altKey !== combo.alt) return false;
    if (!!e.ctrlKey !== combo.ctrl) return false;
    if (!!e.shiftKey !== combo.shift) return false;
    if (!!e.metaKey !== combo.meta) return false;
    const key = combo.key.toLowerCase();
    const actual = String(e.key || '').toLowerCase();
    const code = String(e.code || '').toLowerCase();
    return actual === key || code === `key${key}`;
  }

  function isLightTheme() {
    const root = document.documentElement;
    const mode = root.getAttribute('data-color-mode');
    if (mode === 'light') return true;
    if (mode === 'dark') return false;
    try {
      if (typeof matchMedia === 'function') {
        return !matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } catch (e) {
      /* ignore */
    }
    return false;
  }

  function syncTheme() {
    const root = document.getElementById('ghma-root');
    if (!root) return;
    root.classList.toggle('ghma-light', isLightTheme());
  }

  // ---------------------------------------------------------------------------
  // 静态资源 CDN
  // ---------------------------------------------------------------------------
  const STATIC_HOST_RE = /^(avatars\d*|camo|user-images|private-user-images)\.githubusercontent\.com$/;
  const IMAGE_CDN_TEMPLATE = 'https://wsrv.nl/?url={url}';

  function cdnImageUrl(url) {
    if (!state.settings.enabled || !state.settings.staticCdn || !url) return url;
    try {
      const u = new URL(url, location.href);
      if (!STATIC_HOST_RE.test(u.hostname)) return url;
      return IMAGE_CDN_TEMPLATE.replace('{url}', encodeURIComponent(url));
    } catch (e) {
      return url;
    }
  }

  // 通过 GM 请求绕过页面 CSP 取回图片，再以 blob URL 替换，失败时自动还原
  function requestImageBlob(url) {
    return new Promise((resolve) => {
      if (typeof GM_xmlhttpRequest !== 'function') return resolve(null);
      let done = false;
      const finish = (blob) => {
        if (done) return;
        done = true;
        resolve(blob || null);
      };
      try {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          responseType: 'blob',
          timeout: 8000,
          onload: (res) => {
            if (res.status < 200 || res.status >= 400) return finish(null);
            const data = res.response;
            if (data && typeof data.size === 'number') return finish(data);
            if (data instanceof ArrayBuffer) return finish(new Blob([data]));
            finish(null);
          },
          onerror: () => finish(null),
          ontimeout: () => finish(null),
        });
      } catch (e) {
        finish(null);
      }
    });
  }

  function restoreOneImage(img) {
    const objectUrl = img.dataset.ghmaCdnUrl;
    if (objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (e) {
        /* ignore */
      }
    }
    if (img.dataset.ghmaOrigSrc) img.src = img.dataset.ghmaOrigSrc;
    delete img.dataset.ghmaCdnUrl;
    delete img.dataset.ghmaOrigSrc;
    delete img.dataset.ghmaCdn;
  }

  function applyStaticCdn() {
    if (!state.settings.enabled || !state.settings.staticCdn) return;
    document.querySelectorAll('img[src]').forEach((img) => {
      if (
        img.dataset.ghmaCdn === '1' ||
        img.dataset.ghmaCdnPending === '1' ||
        img.dataset.ghmaCdnSkip === '1'
      ) {
        return;
      }
      const original = img.src;
      const cdn = cdnImageUrl(original);
      if (!cdn || cdn === original) return;
      img.dataset.ghmaCdnPending = '1';
      requestImageBlob(cdn).then((blob) => {
        delete img.dataset.ghmaCdnPending;
        if (!blob || !img.isConnected) return;
        if (!state.settings.enabled || !state.settings.staticCdn) return;
        try {
          const objectUrl = URL.createObjectURL(blob);
          img.dataset.ghmaOrigSrc = original;
          img.dataset.ghmaCdnUrl = objectUrl;
          img.dataset.ghmaCdn = '1';
          img.src = objectUrl;
          img.addEventListener(
            'error',
            () => {
              img.dataset.ghmaCdnSkip = '1';
              restoreOneImage(img);
            },
            { once: true }
          );
        } catch (e) {
          /* ignore */
        }
      });
    });
  }

  function restoreStaticCdn() {
    document.querySelectorAll('img[data-ghma-cdn="1"]').forEach(restoreOneImage);
    document.querySelectorAll('img[data-ghma-cdn-pending="1"]').forEach((img) => {
      delete img.dataset.ghmaCdnPending;
    });
    document.querySelectorAll('img[data-ghma-cdn-skip="1"]').forEach((img) => {
      delete img.dataset.ghmaCdnSkip;
    });
  }

  // ---------------------------------------------------------------------------
  // GitHub API 加速
  // ---------------------------------------------------------------------------
  function apiBase() {
    const s = state.settings;
    if (!s.enabled || !s.apiMirror || s.apiMirror === 'off') return '';
    if (s.apiMirror === 'custom') return normalizeBase(s.apiCustom);
    const found = builtinApiById(s.apiMirror);
    if (found) return found.apiBase;
    return customApiBase(s.apiMirror);
  }

  function rewriteApiUrl(url) {
    const base = apiBase();
    if (!base) return url;
    if (!/^https?:\/\/api\.github\.com\//i.test(url)) return url;
    return base + url.replace(/^https?:\/\/api\.github\.com\//i, '');
  }

  // 只改写页面发起的 GET/HEAD API 请求，且跳过带 Authorization 的请求，避免凭据外泄；
  // 命中 CSP/网络错误时自动回退原始地址，保证不影响页面原有功能
  function installApiHooks() {
    let w = window;
    try {
      if (typeof unsafeWindow !== 'undefined' && unsafeWindow) w = unsafeWindow;
    } catch (e) {
      /* ignore */
    }
    if (!w || w.__ghmaApiHooked) return;
    try {
      w.__ghmaApiHooked = true;
    } catch (e) {
      return;
    }

    const origFetch = w.fetch;
    if (typeof origFetch === 'function') {
      try {
        w.fetch = function (input, init) {
          let original = input;
          try {
            if (typeof input === 'string' && apiBase()) {
              const method = (init && init.method) || 'GET';
              const headers = init && init.headers;
              let hasAuth = false;
              if (headers) {
                if (typeof headers.get === 'function') hasAuth = !!headers.get('Authorization');
                else hasAuth = !!(headers.Authorization || headers.authorization);
              }
              if (/^(GET|HEAD)$/i.test(method) && !hasAuth) input = rewriteApiUrl(input);
            }
          } catch (e) {
            /* ignore */
          }
          const promise = origFetch.call(this, input, init);
          if (input === original) return promise;
          return promise.catch(() => origFetch.call(this, original, init));
        };
      } catch (e) {
        /* ignore */
      }
    }

    const xhrProto = w.XMLHttpRequest && w.XMLHttpRequest.prototype;
    if (xhrProto && typeof xhrProto.open === 'function') {
      const origOpen = xhrProto.open;
      try {
        xhrProto.open = function (method, url, ...rest) {
          let original = '';
          try {
            if (typeof url === 'string' && /^(GET|HEAD)$/i.test(method)) {
              const next = rewriteApiUrl(url);
              if (next !== url) {
                original = url;
                url = next;
              }
            }
          } catch (e) {
            /* ignore */
          }
          const result = origOpen.call(this, method, url, ...rest);
          if (original) {
            this.addEventListener(
              'error',
              () => {
                try {
                  origOpen.call(this, method, original, ...rest);
                  this.send();
                } catch (e) {
                  /* ignore */
                }
              },
              { once: true }
            );
          }
          return result;
        };
      } catch (e) {
        /* ignore */
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 面板 UI
  // ---------------------------------------------------------------------------
  const PANEL_CSS = `
    /* 设计令牌：颜色 / 间距 / 圆角 / 字体 / 阴影集中声明；
       浅色主题只覆盖令牌，避免为每个选择器重复写一套颜色 */
    :host {
      all: initial;

      --ghma-fg: #e6edf3;
      --ghma-fg-muted: #8b949e;
      --ghma-fg-dim: #6e7681;
      --ghma-bg: #0d1117;
      --ghma-bg-elev: #161b22;
      --ghma-bg-inset: #21262d;
      --ghma-bg-soft: rgba(22, 27, 34, .45);
      --ghma-border: #30363d;
      --ghma-border-hover: #8b949e;
      --ghma-accent: #1f6feb;
      --ghma-accent-fg: #58a6ff;
      --ghma-danger: #f85149;
      --ghma-warn: #d29922;
      --ghma-ok: #3fb950;

      --ghma-space-1: 4px;
      --ghma-space-2: 6px;
      --ghma-space-3: 8px;
      --ghma-space-4: 10px;
      --ghma-space-5: 12px;
      --ghma-space-6: 16px;

      --ghma-radius-sm: 6px;
      --ghma-radius-md: 8px;
      --ghma-radius-lg: 12px;
      --ghma-radius-pill: 999px;

      --ghma-font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      --ghma-font-mono: ui-monospace, SFMono-Regular, Consolas, monospace;
      --ghma-shadow-fab: 0 6px 20px rgba(0, 0, 0, .35);
      --ghma-shadow-fab-drag: 0 10px 28px rgba(0, 0, 0, .5);
      --ghma-shadow-panel: 0 16px 48px rgba(0, 0, 0, .55);
      --ghma-shadow-toast: 0 8px 24px rgba(0, 0, 0, .5);
    }
    :host(.ghma-light) {
      --ghma-fg: #1f2328;
      --ghma-fg-muted: #57606a;
      --ghma-fg-dim: #8c959f;
      --ghma-bg: #ffffff;
      --ghma-bg-elev: #f6f8fa;
      --ghma-bg-inset: #f6f8fa;
      --ghma-bg-soft: #f6f8fa;
      --ghma-border: #d0d7de;
      --ghma-border-hover: #afb8c1;
      --ghma-accent-fg: #0969da;
      --ghma-shadow-panel: 0 16px 48px rgba(31, 35, 40, .18);
    }
    * { box-sizing: border-box; }

    /* 浮动按钮 */
    .fab {
      position: fixed; right: 18px; top: 18px; z-index: 2147483001;
      display: inline-flex; align-items: center; justify-content: center;
      height: 38px; padding: 0 var(--ghma-space-6);
      border: 1px solid var(--ghma-accent); border-radius: var(--ghma-radius-pill);
      background: linear-gradient(180deg, #1f6feb, #1a5fd0); color: #fff;
      font: 600 13px/1 var(--ghma-font-ui); letter-spacing: .5px;
      cursor: grab; box-shadow: var(--ghma-shadow-fab);
      touch-action: none; user-select: none; -webkit-user-select: none;
      transition: left .18s ease, right .18s ease, top .18s ease;
    }
    .fab:hover { filter: brightness(1.12); }
    .fab.dragging {
      cursor: grabbing; transition: none; filter: brightness(1.12);
      box-shadow: var(--ghma-shadow-fab-drag);
    }
    .fab.off {
      background: var(--ghma-bg-inset); border-color: var(--ghma-border);
      color: var(--ghma-fg-muted);
    }

    /* 面板容器 */
    .panel {
      position: fixed; right: 18px; top: 66px; z-index: 2147483002;
      width: 344px; max-height: calc(100vh - 36px); overflow: auto;
      background: var(--ghma-bg); color: var(--ghma-fg);
      border: 1px solid var(--ghma-border); border-radius: var(--ghma-radius-lg);
      box-shadow: var(--ghma-shadow-panel);
      font: 13px/1.5 var(--ghma-font-ui);
      scrollbar-width: thin;
    }
    .panel[hidden] { display: none; }
    .panel::-webkit-scrollbar { width: 8px; height: 8px; }
    .panel::-webkit-scrollbar-thumb {
      background: var(--ghma-border); border-radius: var(--ghma-radius-pill);
    }
    .panel::-webkit-scrollbar-thumb:hover { background: var(--ghma-border-hover); }

    /* 头部 */
    .ph {
      display: flex; align-items: center; gap: var(--ghma-space-3);
      padding: var(--ghma-space-4) var(--ghma-space-5);
      background: var(--ghma-bg-elev);
      border-bottom: 1px solid var(--ghma-border);
      position: sticky; top: 0; z-index: 1;
    }
    .ph .dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--ghma-ok); flex: none;
    }
    .ph .dot.off { background: var(--ghma-fg-muted); }
    .ph h1 {
      flex: 1; margin: 0; font-size: 13px; font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .ph .x {
      flex: none; border: 0; background: transparent; color: var(--ghma-fg-muted);
      font-size: 16px; line-height: 1; cursor: pointer;
      padding: 2px var(--ghma-space-1); border-radius: var(--ghma-radius-sm);
    }
    .ph .x:hover { color: var(--ghma-fg); background: var(--ghma-bg-inset); }
    .ver {
      flex: none; color: var(--ghma-fg-muted); font-size: 10px; line-height: 1.6;
      border: 1px solid var(--ghma-border); border-radius: var(--ghma-radius-pill);
      padding: 1px var(--ghma-space-2); white-space: nowrap;
    }

    /* 分页与内容区 */
    .tabs {
      display: flex; gap: var(--ghma-space-1);
      padding: var(--ghma-space-3) var(--ghma-space-5) 0;
      border-bottom: 1px solid var(--ghma-border);
    }
    .tab {
      flex: 1; padding: var(--ghma-space-2) var(--ghma-space-1);
      border: 1px solid transparent; border-bottom: 0;
      border-radius: var(--ghma-radius-sm) var(--ghma-radius-sm) 0 0;
      background: transparent; color: var(--ghma-fg-muted); font: inherit; cursor: pointer;
    }
    .tab:hover { color: var(--ghma-fg); background: var(--ghma-bg-elev); }
    .tab.on { color: var(--ghma-fg); background: var(--ghma-bg-elev); border-color: var(--ghma-border); }
    .pb {
      padding: var(--ghma-space-5); display: flex; flex-direction: column;
      gap: var(--ghma-space-4);
    }
    .pane { display: flex; flex-direction: column; gap: var(--ghma-space-4); }
    .pane[hidden] { display: none; }
    .group-title {
      color: var(--ghma-fg-muted); font-size: 11px; text-transform: uppercase;
      letter-spacing: .6px; margin: var(--ghma-space-1) 0 calc(var(--ghma-space-2) * -1);
    }

    /* 表单控件 */
    .field { display: flex; flex-direction: column; gap: var(--ghma-space-2); }
    .field > span {
      color: var(--ghma-fg-muted); font-size: 11px;
      text-transform: uppercase; letter-spacing: .6px;
    }
    select, input[type="text"], input[type="number"], input[type="password"] {
      width: 100%; background: var(--ghma-bg-elev); color: var(--ghma-fg);
      border: 1px solid var(--ghma-border); border-radius: var(--ghma-radius-sm);
      padding: var(--ghma-space-2) var(--ghma-space-3); font: inherit; outline: none;
    }
    select:focus, input[type="text"]:focus, input[type="number"]:focus, input[type="password"]:focus {
      border-color: var(--ghma-accent);
    }
    select:focus-visible, input:focus-visible, button:focus-visible, a:focus-visible, summary:focus-visible {
      outline: 2px solid var(--ghma-accent-fg); outline-offset: 1px;
    }

    /* 操作网格 */
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--ghma-space-2); }
    .grid .span2 { grid-column: 1 / -1; }
    .grid.tools { grid-template-columns: repeat(3, 1fr); }
    .grid button, .grid a {
      display: flex; align-items: center; justify-content: center;
      min-height: 32px; padding: var(--ghma-space-2) var(--ghma-space-3);
      border: 1px solid var(--ghma-border); border-radius: var(--ghma-radius-sm);
      background: var(--ghma-bg-inset); color: var(--ghma-fg);
      font: inherit; cursor: pointer; text-align: center; text-decoration: none;
    }
    .grid.tools button, .grid.tools a {
      font-size: 12px; padding: var(--ghma-space-2) var(--ghma-space-1);
    }
    .grid button:hover, .grid a:hover {
      background: var(--ghma-border); border-color: var(--ghma-border-hover);
    }
    .grid button.primary, .grid a.primary {
      background: var(--ghma-accent); border-color: var(--ghma-accent); color: #fff;
    }
    .grid button.primary:hover, .grid a.primary:hover { filter: brightness(1.1); }
    .grid button:disabled, .grid a.disabled {
      opacity: .45; cursor: not-allowed; pointer-events: none;
    }

    /* 开关列表 */
    .toggles { display: flex; flex-direction: column; gap: var(--ghma-space-2); padding-top: 2px; }
    .toggles label {
      display: flex; align-items: center; gap: var(--ghma-space-3);
      color: var(--ghma-fg); cursor: pointer;
    }
    .toggles input { accent-color: var(--ghma-accent); }

    /* 预览 / 提示 */
    .preview {
      border: 1px dashed var(--ghma-border); border-radius: var(--ghma-radius-sm);
      padding: var(--ghma-space-2) var(--ghma-space-3); color: var(--ghma-fg-muted);
      font: 11px/1.5 var(--ghma-font-mono); word-break: break-all; cursor: copy;
    }
    .preview:hover { color: var(--ghma-fg); border-color: var(--ghma-accent); }
    .hint { margin: 0; color: var(--ghma-fg-muted); font-size: 11px; }
    .hint a { color: var(--ghma-accent-fg); }

    /* 自定义线路卡片 */
    .custom { display: flex; gap: var(--ghma-space-2); align-items: center; }
    .custom[hidden] { display: none; }
    .custom input { flex: 1; min-width: 0; }
    .custom input[type="checkbox"] { flex: none; width: auto; }
    .custom select { width: 108px; flex: none; }
    .custom .cap {
      display: inline-flex; align-items: center; gap: var(--ghma-space-1);
      font-size: 12px; white-space: nowrap;
    }
    .custom-list { display: flex; flex-direction: column; gap: var(--ghma-space-3); }
    .custom-list .crow {
      display: flex; flex-direction: column; gap: var(--ghma-space-2);
      border: 1px solid var(--ghma-border); border-radius: var(--ghma-radius-md);
      padding: var(--ghma-space-3); background: var(--ghma-bg-soft);
    }
    .crow-head { display: flex; align-items: center; gap: var(--ghma-space-2); }
    .crow-head input { flex: 1; min-width: 0; }
    .crow-head select {
      width: 96px; flex: none; padding: var(--ghma-space-2) var(--ghma-space-1);
    }
    .crow-idx {
      flex: none; display: inline-flex; align-items: center; justify-content: center;
      min-width: 18px; height: 18px; padding: 0 var(--ghma-space-1);
      border-radius: var(--ghma-radius-pill); background: var(--ghma-bg-inset);
      color: var(--ghma-fg-muted); font-size: 10px; line-height: 1;
    }
    .crow-body input { width: 100%; }
    .crow-caps { display: flex; flex-wrap: wrap; gap: var(--ghma-space-1) var(--ghma-space-5); }
    .crow-caps label {
      display: inline-flex; align-items: center; gap: var(--ghma-space-1);
      font-size: 11px; white-space: nowrap;
    }
    .crow-caps label.locked { opacity: .66; }
    .crow-caps input { accent-color: var(--ghma-accent); margin: 0; }
    .crow-foot {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--ghma-space-3);
    }
    .crow-foot .crow-help { flex: 1; min-width: 0; }
    .crow-help {
      color: var(--ghma-fg-muted); font-size: 10px;
      line-height: 1.45; word-break: break-all;
    }
    .crow-meta {
      color: var(--ghma-fg-muted); font-size: 11px; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; max-width: 46%;
    }
    .crow-meta.warn { color: var(--ghma-warn); }
    .custom-empty {
      border: 1px dashed var(--ghma-border); border-radius: var(--ghma-radius-md);
      padding: var(--ghma-space-4); color: var(--ghma-fg-muted);
      font-size: 11px; line-height: 1.6; text-align: center;
    }
    .custom-list .del {
      flex: none; width: 26px; height: 26px; padding: 0;
      border-radius: var(--ghma-space-1); border: 1px solid var(--ghma-border);
      background: var(--ghma-bg-inset); color: var(--ghma-fg);
      font: 14px/1 inherit; cursor: pointer;
    }
    .custom-list .del:hover { border-color: var(--ghma-danger); color: var(--ghma-danger); }
    .custom-list .add {
      width: 100%; padding: var(--ghma-space-2) var(--ghma-space-3);
      border-radius: var(--ghma-radius-sm); border: 1px dashed var(--ghma-border);
      background: transparent; color: var(--ghma-fg); font: inherit; cursor: pointer;
    }
    .custom-list .add:hover { border-color: var(--ghma-accent); color: var(--ghma-accent-fg); }
    .gcount {
      display: inline-block; margin-left: var(--ghma-space-1);
      padding: 0 var(--ghma-space-2); border-radius: var(--ghma-radius-pill);
      background: var(--ghma-bg-inset); color: var(--ghma-fg-muted);
      font-size: 10px; line-height: 1.6;
    }

    /* 线路管理 */
    details.manage {
      border: 1px solid var(--ghma-border); border-radius: var(--ghma-radius-sm);
      padding: var(--ghma-space-2) var(--ghma-space-3);
    }
    details.manage summary {
      display: flex; align-items: center; justify-content: space-between;
      gap: var(--ghma-space-3); cursor: pointer; color: var(--ghma-fg-muted);
      font-size: 12px; user-select: none;
    }
    details.manage summary .mini {
      flex: none; padding: 1px var(--ghma-space-3); border-radius: var(--ghma-space-1);
      border: 1px solid var(--ghma-border); background: var(--ghma-bg-inset);
      color: var(--ghma-fg); font: 11px/1.6 inherit; cursor: pointer;
    }
    details.manage summary .mini:hover { border-color: var(--ghma-border-hover); }
    .mline-list {
      display: flex; flex-direction: column; gap: var(--ghma-space-1);
      margin-top: var(--ghma-space-2);
    }
    .mline { display: flex; align-items: center; gap: var(--ghma-space-2); font-size: 12px; }
    .mline .mdot {
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--ghma-fg-dim); flex: none;
    }
    .mline .mdot.ok { background: var(--ghma-ok); }
    .mline .mdot.bad { background: var(--ghma-danger); }
    .mline .mlabel {
      flex: 1; min-width: 0; overflow: hidden;
      text-overflow: ellipsis; white-space: nowrap;
    }
    .mline .mtag {
      margin-left: var(--ghma-space-1); padding: 0 var(--ghma-space-1);
      border-radius: 3px; background: var(--ghma-bg-inset);
      color: var(--ghma-fg-muted); font-size: 9px;
    }
    .mline .mspeed {
      flex: none; min-width: 68px; text-align: right;
      color: var(--ghma-fg-muted); font-size: 10px; font-variant-numeric: tabular-nums;
    }
    .mline.off .mlabel { color: var(--ghma-fg-dim); text-decoration: line-through; }
    .mline button {
      padding: 2px var(--ghma-space-2); border-radius: var(--ghma-space-1);
      border: 1px solid var(--ghma-border); background: var(--ghma-bg-inset);
      color: var(--ghma-fg); font: 11px/1.4 inherit; cursor: pointer;
    }
    .mline button:hover { border-color: var(--ghma-border-hover); }
    .mline button.on { border-color: var(--ghma-accent); color: var(--ghma-accent-fg); }

    /* 分用途线路行与统计 */
    .stats {
      margin: 0; color: var(--ghma-fg-muted); font-size: 11px;
      font-variant-numeric: tabular-nums;
    }
    .prow { display: flex; align-items: center; gap: var(--ghma-space-2); }
    .prow em {
      flex: none; width: 96px; font-style: normal;
      color: var(--ghma-fg-muted); font-size: 11px;
    }
    .prow select { flex: 1; min-width: 0; }

    /* 轻提示 */
    .toast {
      position: fixed; right: 18px; bottom: 66px; z-index: 2147483003; max-width: 320px;
      background: var(--ghma-accent); color: #fff; border-radius: var(--ghma-radius-md);
      padding: var(--ghma-space-3) var(--ghma-space-5);
      font: 12px/1.5 var(--ghma-font-ui); box-shadow: var(--ghma-shadow-toast);
      opacity: 0; transform: translateY(6px);
      transition: opacity .18s ease, transform .18s ease; pointer-events: none;
    }
    .toast.show { opacity: 1; transform: translateY(0); }
    .toast[hidden] { display: none; }

    /* 响应式：窄视口压缩为两列，超窄视口改为单列 */
    @media (max-width: 380px) {
      .grid.tools { grid-template-columns: repeat(2, 1fr); }
      .crow-head select { width: 84px; }
    }
    @media (max-width: 300px) {
      .grid, .grid.tools { grid-template-columns: 1fr; }
      .grid .span2 { grid-column: auto; }
      .crow-foot {
        flex-direction: column; align-items: flex-start; gap: var(--ghma-space-1);
      }
      .crow-meta { max-width: 100%; }
      .prow { flex-direction: column; align-items: stretch; gap: var(--ghma-space-1); }
      .prow em { width: auto; }
    }
    @media (prefers-reduced-motion: reduce) {
      .fab, .toast { transition: none; }
    }
  `;

  function customRoutePlaceholder(type) {
    if (type === 'template') return 'https://cdn.example.com/gh/{owner}/{repo}/{ref}/{path}';
    if (type === 'site') return 'https://mirror.example.com';
    if (type === 'api') return 'https://api.example.com/';
    return 'https://your-proxy.example.com/';
  }

  function customRoutesSignature(routes) {
    return JSON.stringify(
      (routes || []).map((r) => {
        const caps = customRouteCaps(r);
        return [
          r.id,
          r.label || '',
          r.type || 'proxy',
          r.base || '',
          caps.raw ? 1 : 0,
          caps.downloads ? 1 : 0,
          caps.clone ? 1 : 0,
          caps.api ? 1 : 0,
        ];
      }),
    );
  }

  function customTypeName(type) {
    if (type === 'site') return '全站镜像';
    if (type === 'template') return 'URL 模板';
    if (type === 'api') return 'API 加速';
    return '代理前缀';
  }

  function customRouteHelp(type) {
    if (type === 'template') {
      return '变量：{url} {rawUrl} {cloneUrl} {owner} {repo} {ref} {path} {refPath} {host}';
    }
    if (type === 'site') return '直接替换 github.com 域名，可浏览网页';
    if (type === 'api') return '用于 api.github.com 请求，Token 会发送到该地址';
    return '代理前缀 + 原始 GitHub 地址';
  }

  function customRouteMeta(route, type) {
    const base = String(route.base || '').trim();
    if (!base) {
      return { text: type === 'api' ? '未填写 API 地址' : '未填写地址', warn: true };
    }
    if ((type === 'template' || type === 'api') && !/^https?:\/\//i.test(base)) {
      return {
        text: type === 'api' ? 'API 地址需以 http(s):// 开头' : '模板需以 http(s):// 开头',
        warn: true,
      };
    }
    if (type === 'proxy' && base === '/') return { text: '地址无效', warn: true };
    return { text: customTypeName(type), warn: false };
  }

  function customRouteRowHTML(route, index) {
    const type = route.type || 'proxy';
    const caps = customRouteCaps(route);
    const locked = type === 'template' || type === 'api';
    const meta = customRouteMeta(route, type);
    const typeOptions = ['proxy', 'site', 'template', 'api']
      .map(
        (value) =>
          `<option value="${value}"${type === value ? ' selected' : ''}>${customTypeName(value)}</option>`,
      )
      .join('');
    const capsHtml = [
      ['raw', 'Raw'],
      ['downloads', '下载'],
      ['clone', 'Clone'],
      ['api', 'API'],
      ['browse', '浏览'],
    ]
      .map(
        ([key, text]) =>
          `<label${locked ? ' class="locked"' : ''}><input type="checkbox" data-field="cap" data-cap="${key}"${caps[key] ? ' checked' : ''}${locked ? ' disabled' : ''}> ${text}</label>`,
      )
      .join('');
    return `
      <div class="crow" data-route-id="${escHtml(route.id)}">
        <div class="crow-head">
          <span class="crow-idx" title="线路顺序">${index + 1}</span>
          <input type="text" data-field="label" placeholder="线路名称（可选）" value="${escHtml(route.label || '')}">
          <select data-field="type" title="线路类型">${typeOptions}</select>
          <button type="button" class="del" data-route-del="${escHtml(route.id)}" title="删除该线路" aria-label="删除该线路">×</button>
        </div>
        <div class="crow-body">
          <input type="text" data-field="base" placeholder="${escHtml(customRoutePlaceholder(type))}" value="${escHtml(route.base || '')}">
        </div>
        <div class="crow-caps">${capsHtml}</div>
        <div class="crow-foot">
          <span class="crow-help">${escHtml(customRouteHelp(type))}</span>
          <span class="crow-meta${meta.warn ? ' warn' : ''}" title="${escHtml(meta.text)}">${escHtml(meta.text)}</span>
        </div>
      </div>
    `;
  }

  function renderCustomRoutes() {
    const shadow = state.shadow;
    if (!shadow) return;
    const box = shadow.querySelector('[data-role="custom-routes"]');
    if (!box) return;
    const routes = state.settings.customRoutes || [];
    const count = shadow.querySelector('[data-role="custom-count"]');
    if (count) count.textContent = String(routes.length);
    const sig = customRoutesSignature(routes);
    if (box.__ghmaSig === sig) return;
    box.__ghmaSig = sig;
    box.innerHTML =
      (routes.length
        ? routes.map((route, index) => customRouteRowHTML(route, index)).join('')
        : '<div class="custom-empty">还没有自定义线路<br>可添加浏览线路或 API 加速线路</div>') +
      '<button type="button" class="add" data-route-add>+ 添加自定义线路</button>';
  }

  function applyRouteTypeDefaults(route) {
    const type = route.type || 'proxy';
    route.caps = defaultCustomCaps(type, route.base);
  }

  function nextCustomRouteId(routes) {
    const list = routes || [];
    const used = new Set(list.map((route) => route.id));
    let n = list.length + 1;
    let id = 'custom-' + n;
    while (used.has(id)) id = 'custom-' + ++n;
    return id;
  }

  function newCustomRouteId() {
    return nextCustomRouteId(state.settings.customRoutes || []);
  }

  function addCustomRoute() {
    const routes = (state.settings.customRoutes = state.settings.customRoutes || []);
    const route = defaultCustom(newCustomRouteId());
    routes.push(route);
    saveSettings();
    renderPanel();
    refreshInjected();
    const shadow = state.shadow;
    if (shadow) {
      requestAnimationFrame(() => {
        const input = shadow.querySelector(`.crow[data-route-id="${route.id}"] [data-field="label"]`);
        if (input) input.focus();
      });
    }
  }

  function removeCustomRoute(id) {
    const s = state.settings;
    s.customRoutes = (s.customRoutes || []).filter((route) => route.id !== id);
    if (s.mirror === id) {
      const next = MIRRORS.find((m) => !isMirrorDisabled(m.id) && m.type !== 'clone');
      s.mirror = next ? next.id : DEFAULTS.mirror;
    }
    ['mirrorRaw', 'mirrorDownloads', 'mirrorClone'].forEach((key) => {
      if (s[key] === id) s[key] = 'auto';
    });
    if (s.apiMirror === id) s.apiMirror = 'off';
    s.pinnedMirrors = (s.pinnedMirrors || []).filter((x) => x !== id);
    s.disabledMirrors = (s.disabledMirrors || []).filter((x) => x !== id);
    if (s.speeds) delete s.speeds[id];
    saveSettings();
    renderPanel();
    refreshInjected();
  }

  function buildUI() {
    if ($('#ghma-root')) return;

    const hostEl = document.createElement('div');
    hostEl.id = 'ghma-root';
    const shadow = hostEl.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>${PANEL_CSS}</style>
      <button class="fab" type="button" title="GitHub 镜像加速 (Alt+M)">镜像</button>
      <section class="panel" hidden>
        <header class="ph">
          <span class="dot"></span>
          <h1>GitHub 镜像加速</h1>
          <span class="ver">v${SCRIPT_VERSION}</span>
          <button class="x" type="button" title="关闭">×</button>
        </header>
        <nav class="tabs" role="tablist">
          <button type="button" class="tab on" role="tab" data-tab="ops">操作</button>
          <button type="button" class="tab" role="tab" data-tab="routes">线路</button>
          <button type="button" class="tab" role="tab" data-tab="settings">设置</button>
        </nav>
        <div class="pb">
          <p class="hint" data-role="hint"></p>
          <section class="pane" data-pane="ops">
            <div class="preview" data-role="preview" title="点击复制 Clone 命令"></div>
            <div class="group-title">常用</div>
            <div class="grid">
              <a class="primary span2" data-act="browse" target="_blank" rel="noopener">镜像浏览</a>
              <button type="button" data-act="clone">复制 Clone</button>
              <a data-act="raw" target="_blank" rel="noopener">镜像 Raw</a>
              <a data-act="zip" target="_blank" rel="noopener" title="下载当前分支/标签/提交的 ZIP 快照（不含 Git 历史）">下载 ZIP</a>
              <button type="button" data-act="copy">复制直链</button>
            </div>
            <div class="group-title">文件与资产</div>
            <div class="grid tools">
              <a data-act="filedl" target="_blank" rel="noopener">下载文件</a>
              <button type="button" data-act="assets">复制资产</button>
              <button type="button" data-act="assetsdl">下载资产</button>
            </div>
            <div class="group-title">Actions</div>
            <div class="grid tools">
              <button type="button" data-act="ghcmd">复制 gh 命令</button>
              <button type="button" data-act="actdl">下载 Artifacts</button>
              <button type="button" data-act="actlog">下载日志</button>
            </div>
            <p class="hint" data-role="actions-hint"></p>
            <p class="stats" data-role="stats" hidden></p>
          </section>
          <section class="pane" data-pane="routes" hidden>
            <label class="field">
              <span>镜像线路</span>
              <select data-role="mirror"></select>
            </label>
            <div class="field">
              <span>分用途线路</span>
              <label class="prow"><em>Raw</em><select data-role="mirror-raw"></select></label>
              <label class="prow"><em>Release / Archive</em><select data-role="mirror-downloads"></select></label>
              <label class="prow"><em>Clone</em><select data-role="mirror-clone"></select></label>
            </div>
            <label class="field">
              <span>Clone 深度（--depth，0 = 完整历史）</span>
              <input type="number" min="0" max="10000" step="1" data-role="clone-depth" placeholder="0">
            </label>
            <div class="grid">
              <button type="button" data-act="speed">镜像测速</button>
              <button type="button" data-act="gitcfg">git 配置</button>
            </div>
            <details class="manage">
              <summary>
                <span>线路管理（禁用 / 置顶）</span>
                <button type="button" class="mini" data-act="speed" title="统一下载 256KB 样本，按实际耗时排序">测速</button>
              </summary>
              <div class="mline-list" data-role="manage-list"></div>
            </details>
          </section>
          <section class="pane" data-pane="settings" hidden>
            <div class="group-title">开关</div>
            <div class="toggles">
              <label><input type="checkbox" data-role="enabled">启用脚本</label>
              <label><input type="checkbox" data-role="autoDownload">自动改写 Release / Archive 下载</label>
              <label><input type="checkbox" data-role="autoFallback">线路失败自动切换</label>
              <label><input type="checkbox" data-role="codeToolbar">Code 面板快捷按钮</label>
              <label><input type="checkbox" data-role="rawButton">文件页 Raw 镜像按钮</label>
              <label><input type="checkbox" data-role="restoreOrigin">Clone 后还原官方仓库连接</label>
              <label><input type="checkbox" data-role="staticCdn">静态资源 CDN（头像 / 图片）</label>
            </div>
            <div class="group-title">自定义线路 <span class="gcount" data-role="custom-count">0</span></div>
            <div class="custom-list" data-role="custom-routes"></div>
            <p class="hint">可添加多条，保存后出现在「线路」页的下拉框中；支持 Clone 的线路会参与 Clone 线路选择。</p>
            <div class="group-title">账号与 API</div>
            <label class="field">
              <span>Actions Token（可选，未登录时必须填写）</span>
              <input type="password" data-role="actions-token" placeholder="ghp_... / github_pat_..." autocomplete="off" spellcheck="false" title="Token 只发往 api.github.com；若在“API 加速”中选择自定义线路，则发往该地址（需 Worker 开启 ENABLE_API=1 与 ALLOW_AUTH=1）">
            </label>
            <label class="field">
              <span>API 加速（api.github.com）</span>
              <select data-role="api-mirror"></select>
            </label>
            <p class="hint">可在「自定义线路」中添加类型为「API 加速」的线路，选中后用于 API 请求。</p>
            <label class="field">
              <span>快捷键</span>
              <input type="text" data-role="hotkey" placeholder="Alt+M">
            </label>
            <div class="group-title">配置与诊断</div>
            <div class="grid">
              <button type="button" data-act="newtoken">获取 Token</button>
              <button type="button" data-act="diagnose">诊断</button>
              <button type="button" data-act="export">导出配置</button>
              <button type="button" data-act="import">导入配置</button>
            </div>
          </section>
        </div>
      </section>
      <div class="toast" hidden></div>
    `;
    document.documentElement.appendChild(hostEl);
    state.shadow = shadow;

    const byRole = (role) => shadow.querySelector(`[data-role="${role}"]`);
    const panel = shadow.querySelector('.panel');
    const fab = shadow.querySelector('.fab');
    const toastEl = shadow.querySelector('.toast');
    const mirrorSel = byRole('mirror');
    const routeList = byRole('custom-routes');
    const apiSel = byRole('api-mirror');

    let toastTimer = null;
    let toastHideTimer = null;
    const toast = (msg, isError) => {
      clearTimeout(toastTimer);
      clearTimeout(toastHideTimer);
      toastEl.hidden = false;
      toastEl.textContent = msg;
      toastEl.style.background = isError ? '#da3633' : '#1f6feb';
      requestAnimationFrame(() => toastEl.classList.add('show'));
      toastTimer = setTimeout(() => {
        toastEl.classList.remove('show');
        toastHideTimer = setTimeout(() => {
          toastEl.hidden = true;
        }, 220);
      }, 2400);
    };
    state.toast = toast;

    // ---- 浮动按钮：自由拖动 / 自动贴边 / 面板跟随 ----
    const FAB_MARGIN = 8;
    const FAB_GAP = 6;
    const PANEL_GUTTER = 8;

    function clampFabTop(top) {
      const h = fab.offsetHeight || 38;
      const max = Math.max(FAB_MARGIN, window.innerHeight - h - FAB_MARGIN);
      return Math.max(FAB_MARGIN, Math.min(max, top));
    }

    function applyFabPosition(pos) {
      const p = pos || state.settings.fabPos || {};
      const side = p.side === 'left' ? 'left' : 'right';
      const top = clampFabTop(typeof p.top === 'number' ? p.top : FAB_MARGIN);
      fab.style.top = Math.round(top) + 'px';
      if (side === 'left') {
        fab.style.left = FAB_MARGIN + 'px';
        fab.style.right = 'auto';
      } else {
        fab.style.left = 'auto';
        fab.style.right = FAB_MARGIN + 'px';
      }
    }

    // 面板贴在按钮内侧，垂直与按钮对齐并夹在视口内（始终在最上层）
    function positionPanel() {
      if (panel.hidden) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // 超窄视口（手机 / 分屏）改为贴边抽屉，避免面板与按钮互相挤压
      if (vw < 360) {
        panel.style.width = Math.round(Math.max(200, vw - PANEL_GUTTER * 2)) + 'px';
        panel.style.left = PANEL_GUTTER + 'px';
        panel.style.right = 'auto';
        panel.style.top = PANEL_GUTTER + 'px';
        panel.style.maxHeight = Math.round(Math.max(120, vh - PANEL_GUTTER * 2)) + 'px';
        return;
      }

      // 宽度随视口收缩，避免窄窗口水平溢出
      panel.style.width = Math.round(Math.max(220, Math.min(344, vw - PANEL_GUTTER * 2))) + 'px';

      // 先按视口上限量一次高度，据此把面板整体夹进视口
      panel.style.maxHeight = Math.max(160, vh - PANEL_GUTTER * 2) + 'px';
      const fr = fab.getBoundingClientRect();
      let onLeft = fr.left + fr.width / 2 < vw / 2;
      let space = onLeft ? vw - fr.right - FAB_GAP - PANEL_GUTTER : fr.left - FAB_GAP - PANEL_GUTTER;
      if (space < 260) onLeft = !onLeft; // 内侧空间不足则换到另一侧，避免压住按钮

      panel.style.left = 'auto';
      panel.style.right = 'auto';
      if (onLeft) panel.style.left = Math.round(fr.right + FAB_GAP) + 'px';
      else panel.style.right = Math.round(Math.max(vw - fr.left + FAB_GAP, PANEL_GUTTER)) + 'px';

      const ph = panel.offsetHeight;
      const top = Math.max(PANEL_GUTTER, Math.min(fr.top, vh - ph - PANEL_GUTTER));
      panel.style.top = Math.round(top) + 'px';

      // 依据最终 top 重新约束高度，保证面板底部不越出视口（展开线路管理后尤其重要）
      panel.style.maxHeight = Math.round(Math.max(120, vh - top - PANEL_GUTTER)) + 'px';

      // 水平越界修正
      const pr = panel.getBoundingClientRect();
      if (pr.right > vw - PANEL_GUTTER) {
        panel.style.left = Math.round(vw - pr.width - PANEL_GUTTER) + 'px';
        panel.style.right = 'auto';
      } else if (pr.left < PANEL_GUTTER) {
        panel.style.left = PANEL_GUTTER + 'px';
        panel.style.right = 'auto';
      }
    }

    // 面板内容高度变化（切页 / 展开 details / 重新渲染）后重新定位
    let panelPosRaf = 0;
    function schedulePanelPosition() {
      if (!state.panelOpen || panelPosRaf) return;
      panelPosRaf = requestAnimationFrame(() => {
        panelPosRaf = 0;
        positionPanel();
      });
    }

    const togglePanel = (force) => {
      state.panelOpen = typeof force === 'boolean' ? force : !state.panelOpen;
      panel.hidden = !state.panelOpen;
      if (state.panelOpen) {
        renderPanel();
        positionPanel();
      }
    };
    state.togglePanel = togglePanel;

    let dragState = null;
    let suppressClick = false;

    fab.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      suppressClick = false;
      const rect = fab.getBoundingClientRect();
      dragState = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        offX: e.clientX - rect.left,
        offY: e.clientY - rect.top,
        moved: false,
      };
      try { fab.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    });

    fab.addEventListener('pointermove', (e) => {
      if (!dragState || e.pointerId !== dragState.id) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      if (!dragState.moved && Math.hypot(dx, dy) < 4) return; // 小幅抖动视为点击
      dragState.moved = true;
      fab.classList.add('dragging');
      const w = fab.offsetWidth;
      const h = fab.offsetHeight;
      const left = Math.max(4, Math.min(window.innerWidth - w - 4, e.clientX - dragState.offX));
      const top = Math.max(4, Math.min(window.innerHeight - h - 4, e.clientY - dragState.offY));
      fab.style.left = Math.round(left) + 'px';
      fab.style.right = 'auto';
      fab.style.top = Math.round(top) + 'px';
      if (state.panelOpen) positionPanel();
      e.preventDefault();
    });

    const endDrag = (e) => {
      if (!dragState || (e && e.pointerId !== dragState.id)) return;
      const moved = dragState.moved;
      dragState = null;
      fab.classList.remove('dragging'); // 恢复过渡动画，让贴边平滑吸附
      if (!moved) return; // 未拖动，交给 click 切换面板
      suppressClick = true;
      const rect = fab.getBoundingClientRect();
      const side = rect.left + rect.width / 2 < window.innerWidth / 2 ? 'left' : 'right';
      const pos = { side, top: Math.round(clampFabTop(rect.top)) };
      state.settings.fabPos = pos;
      saveSettings();
      applyFabPosition(pos);
      if (state.panelOpen) positionPanel();
    };

    fab.addEventListener('pointerup', endDrag);
    fab.addEventListener('pointercancel', endDrag);

    fab.addEventListener('click', () => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      togglePanel();
    });

    window.addEventListener('resize', () => {
      applyFabPosition();
      if (state.panelOpen) positionPanel();
    });

    // 贴边过渡结束后再对齐一次，避免按动画中间位置定位导致间隙过大
    fab.addEventListener('transitionend', (e) => {
      if (e.target !== fab) return;
      if (e.propertyName === 'top' || e.propertyName === 'left' || e.propertyName === 'right') {
        if (state.panelOpen) positionPanel();
      }
    });

    // details 展开 / 收起、内容重新渲染都可能导致面板高度变化
    shadow.addEventListener('toggle', (e) => {
      if (e.target && e.target.tagName === 'DETAILS') schedulePanelPosition();
    }, true);
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(schedulePanelPosition);
      ro.observe(panel);
    }

    applyFabPosition();
    state.applyFabPosition = applyFabPosition;

    shadow.querySelector('.x').addEventListener('click', () => togglePanel(false));

    // 分页：操作 / 线路 / 设置
    const tabBtns = Array.from(shadow.querySelectorAll('.tab'));
    const panes = Array.from(shadow.querySelectorAll('[data-pane]'));
    const activateTab = (name) => {
      tabBtns.forEach((btn) => {
        const on = btn.getAttribute('data-tab') === name;
        btn.classList.toggle('on', on);
        btn.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      panes.forEach((pane) => {
        pane.hidden = pane.getAttribute('data-pane') !== name;
      });
      schedulePanelPosition();
    };
    tabBtns.forEach((btn) =>
      btn.addEventListener('click', () => activateTab(btn.getAttribute('data-tab')))
    );
    activateTab('ops');

    mirrorSel.addEventListener('change', () => {
      state.settings.mirror = mirrorSel.value;
      saveSettings();
      renderPanel();
      refreshInjected();
    });

    [
      ['mirror-raw', 'mirrorRaw'],
      ['mirror-downloads', 'mirrorDownloads'],
      ['mirror-clone', 'mirrorClone'],
    ].forEach(([role, key]) => {
      byRole(role).addEventListener('change', (e) => {
        state.settings[key] = e.target.value;
        saveSettings();
        renderPanel();
      });
    });

    shadow.addEventListener('click', (e) => {
      const btn = e.target && e.target.closest ? e.target.closest('[data-manage]') : null;
      if (!btn) return;
      e.preventDefault();
      handleManageAction(btn.getAttribute('data-manage'), btn.getAttribute('data-id'));
    });

    const saveCustomRoutes = debounce(() => {
      saveSettings();
      refreshInjected();
      renderPanel();
    }, 400);
    const routeRowFromEvent = (target) =>
      target && target.closest ? target.closest('.crow') : null;
    const routeFromEvent = (target) => {
      const row = routeRowFromEvent(target);
      return row ? findCustomRoute(row.getAttribute('data-route-id')) : null;
    };
    routeList.addEventListener('input', (e) => {
      const field = e.target.getAttribute && e.target.getAttribute('data-field');
      if (field !== 'label' && field !== 'base') return;
      const row = routeRowFromEvent(e.target);
      const route = row ? findCustomRoute(row.getAttribute('data-route-id')) : null;
      if (!row || !route) return;
      route[field] = e.target.value;
      if (field === 'base') {
        // 仅更新状态提示，避免输入过程中重建整行导致焦点丢失
        const meta = customRouteMeta(route, route.type || 'proxy');
        const metaEl = row.querySelector('.crow-meta');
        if (metaEl) {
          metaEl.textContent = meta.text;
          metaEl.classList.toggle('warn', meta.warn);
        }
        // 模板能力由变量决定，输入时实时刷新只读勾选
        if (route.type === 'template') {
          const caps = customRouteCaps(route);
          row.querySelectorAll('[data-field="cap"]').forEach((box) => {
            box.checked = !!caps[box.getAttribute('data-cap')];
          });
        }
      }
      routeList.__ghmaSig = customRoutesSignature(state.settings.customRoutes);
      saveCustomRoutes();
    });
    routeList.addEventListener('change', (e) => {
      const field = e.target.getAttribute && e.target.getAttribute('data-field');
      if (field !== 'type' && field !== 'cap') return;
      const route = routeFromEvent(e.target);
      if (!route) return;
      const s = state.settings;
      if (field === 'type') {
        route.type = e.target.value;
        applyRouteTypeDefaults(route);
        if (route.type === 'api') {
          if (s.mirror === route.id) {
            const next = MIRRORS.find((m) => !isMirrorDisabled(m.id) && m.type !== 'clone');
            s.mirror = next ? next.id : DEFAULTS.mirror;
          }
          ['mirrorRaw', 'mirrorDownloads', 'mirrorClone'].forEach((key) => {
            if (s[key] === route.id) s[key] = 'auto';
          });
        }
        if (s.apiMirror === route.id && !isApiRoute(route)) s.apiMirror = 'off';
      } else {
        const cap = e.target.getAttribute('data-cap');
        route.caps = Object.assign({}, customRouteCaps(route));
        route.caps[cap] = e.target.checked;
        if (cap === 'api' && !e.target.checked && s.apiMirror === route.id) {
          s.apiMirror = 'off';
        }
        const purposeKey = { raw: 'mirrorRaw', downloads: 'mirrorDownloads', clone: 'mirrorClone' }[cap];
        if (purposeKey && !e.target.checked && s[purposeKey] === route.id) {
          s[purposeKey] = 'auto';
        }
      }
      saveCustomRoutes();
    });
    routeList.addEventListener('click', (e) => {
      const add = e.target.closest && e.target.closest('[data-route-add]');
      if (add) {
        addCustomRoute();
        return;
      }
      const del = e.target.closest && e.target.closest('[data-route-del]');
      if (del) removeCustomRoute(del.getAttribute('data-route-del'));
    });

    apiSel.addEventListener('change', () => {
      state.settings.apiMirror = apiSel.value;
      if (apiSel.value === 'off' || builtinApiById(apiSel.value)) {
        state.settings.apiCustom = '';
      }
      saveSettings();
      renderPanel();
    });

    const hotkeyInput = byRole('hotkey');
    const saveHotkey = debounce(() => {
      const value = hotkeyInput.value.trim();
      state.settings.hotkey = parseHotkey(value) ? value : DEFAULTS.hotkey;
      saveSettings();
      renderPanel();
    }, 400);
    hotkeyInput.addEventListener('input', saveHotkey);

    const depthInput = byRole('clone-depth');
    const saveDepth = debounce(() => {
      const raw = Number(depthInput.value);
      const depth = Number.isFinite(raw) ? clamp(Math.floor(raw), 0, 10000) : 0;
      state.settings.cloneDepth = depth;
      saveSettings();
      renderPanel();
      refreshInjected();
    }, 300);
    depthInput.addEventListener('input', saveDepth);

    const tokenInput = byRole('actions-token');
    const saveToken = debounce(() => {
      state.settings.actionsToken = tokenInput.value.trim();
      saveSettings();
      renderPanel();
    }, 400);
    tokenInput.addEventListener('input', saveToken);

    [
      ['enabled', 'enabled'],
      ['autoDownload', 'autoDownload'],
      ['autoFallback', 'autoFallback'],
      ['codeToolbar', 'codeToolbar'],
      ['rawButton', 'rawButton'],
      ['restoreOrigin', 'restoreOrigin'],
      ['staticCdn', 'staticCdn'],
    ].forEach(([role, key]) => {
      byRole(role).addEventListener('change', (e) => {
        state.settings[key] = e.target.checked;
        saveSettings();
        if (key === 'staticCdn' && !e.target.checked) restoreStaticCdn();
        renderPanel();
        refreshInjected();
      });
    });

    shadow.addEventListener('click', (e) => {
      const act = e.target.closest && e.target.closest('[data-act]');
      if (!act) return;
      e.preventDefault();
      doPanelAction(act.dataset.act, toast);
    });

    const preview = byRole('preview');
    preview.addEventListener('click', async () => {
      const ctx = getRepoContext();
      if (!ctx) return;
      const ok = await copyText(cloneCommand(ctx));
      toast(ok ? '已复制 Clone 命令' : '复制失败', !ok);
    });

    renderPanel();
  }

  // 仅在 HTML 真正变化时写入，避免重复重建上百个 option / 线路行
  function setHTML(el, html) {
    if (!el || el.__ghmaHtml === html) return;
    el.__ghmaHtml = html;
    el.innerHTML = html;
  }

  function renderPanel() {
    const shadow = state.shadow;
    if (!shadow) return;
    const s = state.settings;
    const byRole = (role) => shadow.querySelector(`[data-role="${role}"]`);

    const mirrorSel = byRole('mirror');
    setHTML(mirrorSel, buildMirrorOptionsHTML());
    mirrorSel.value = s.mirror;

    [
      ['mirror-raw', 'mirrorRaw', 'raw'],
      ['mirror-downloads', 'mirrorDownloads', 'downloads'],
      ['mirror-clone', 'mirrorClone', 'clone'],
    ].forEach(([role, key, need]) => {
      const sel = byRole(role);
      setHTML(sel, buildPurposeOptionsHTML(need));
      sel.value = s[key] || 'auto';
    });

    renderCustomRoutes();

    const apiMirrorSel = byRole('api-mirror');
    setHTML(apiMirrorSel, buildApiOptionsHTML());
    apiMirrorSel.value = s.apiMirror || 'off';

    byRole('enabled').checked = !!s.enabled;
    byRole('autoDownload').checked = !!s.autoDownload;
    byRole('autoFallback').checked = !!s.autoFallback;
    byRole('codeToolbar').checked = !!s.codeToolbar;
    byRole('rawButton').checked = !!s.rawButton;
    byRole('restoreOrigin').checked = !!s.restoreOrigin;
    byRole('staticCdn').checked = !!s.staticCdn;

    const hotkeyInput = byRole('hotkey');
    if (shadow.activeElement !== hotkeyInput) hotkeyInput.value = s.hotkey || DEFAULTS.hotkey;

    shadow.querySelector('.fab').classList.toggle('off', !s.enabled);
    shadow.querySelector('.ph .dot').classList.toggle('off', !s.enabled);

    const ctx = getRepoContext();
    const preview = byRole('preview');
    const cloneText = ctx ? cloneCommand(ctx) : '';
    const previewText = ctx
      ? cloneText
      : IS_GIST
        ? '当前 Gist 页面未解析到文件，试试刷新页面'
        : '打开仓库页面后可一键复制 Clone 命令';
    preview.textContent = previewText;
    preview.dataset.value = cloneText;

    const m = activeMirror();
    const mirrorName = m ? `${m.label}${describeType(m.type)}` : '未配置线路';
    const hasRaw = !!(ctx && ctx.isFile);
    const unhealthy = m && s.autoFallback && healthOf(m) === 'bad';
    byRole('hint').textContent =
      `${mirrorName} · ${hasRaw ? '文件页可镜像 Raw' : 'Raw 需在文件页使用'}` +
      (unhealthy ? ' · 当前线路异常，已自动切换' : '') +
      ` · 快捷键 ${s.hotkey || DEFAULTS.hotkey}`;

    const depthInput = byRole('clone-depth');
    if (shadow.activeElement !== depthInput) depthInput.value = String(s.cloneDepth || 0);

    const tokenInput = byRole('actions-token');
    if (shadow.activeElement !== tokenInput) tokenInput.value = s.actionsToken || '';

    const runInfo = actionsRunInfo();
    const token = String(s.actionsToken || '').trim();
    const login = githubLogin();
    const canActions = !!(runInfo && (token || login));
    const ghcmdBtn = shadow.querySelector('[data-act="ghcmd"]');
    const actDlBtn = shadow.querySelector('[data-act="actdl"]');
    const actLogBtn = shadow.querySelector('[data-act="actlog"]');
    ghcmdBtn.disabled = !runInfo;
    actDlBtn.disabled = !canActions;
    actLogBtn.disabled = !canActions;
    ghcmdBtn.title = runInfo
      ? '复制 gh run download 命令（使用本机 gh 登录态）'
      : '请先打开 Actions 运行页面';
    const authTitle = token
      ? '使用 Token 通过 API 下载'
      : login
        ? `使用 GitHub 登录态（${login}）下载`
        : '制品不支持匿名下载：请先登录 GitHub，或在「设置」填写 Token';
    actDlBtn.title = runInfo ? `${authTitle}本次运行的制品` : '请先打开 Actions 运行页面';
    actLogBtn.title = runInfo ? `${authTitle}本次运行的日志` : '请先打开 Actions 运行页面';

    const actionsHint = byRole('actions-hint');
    if (!runInfo) {
      actionsHint.textContent = '打开 Actions 运行页面后可下载制品与日志';
    } else if (token) {
      actionsHint.textContent = '已配置 Token，制品与日志通过 API 下载';
    } else if (login) {
      actionsHint.textContent = `已登录 ${login}，制品与日志使用浏览器登录态下载`;
    } else {
      actionsHint.innerHTML =
        '制品 / 日志不支持匿名下载，请先 <a href="https://github.com/login" target="_blank" rel="noopener">登录 GitHub</a>，或在「设置」填写 Token';
    }

    const rawBtn = shadow.querySelector('[data-act="raw"]');
    const cloneBtn = shadow.querySelector('[data-act="clone"]');
    const fileBtn = shadow.querySelector('[data-act="filedl"]');
    const zipBtn = shadow.querySelector('[data-act="zip"]');
    const browseBtn = shadow.querySelector('[data-act="browse"]');
    const dmRaw = chooseDownloadMirror('raw', true);
    const dmDl = chooseDownloadMirror('downloads', true);
    const rawHref = hasRaw && dmRaw ? mirrorizeRaw(getRawUrl(ctx), dmRaw) : '';
    const hasZip = !!(ctx && zipUrl(ctx));
    const zipHref = hasZip && dmDl ? mirrorize(zipUrl(ctx), dmDl) : '';
    const site = siteMirror();
    const canBrowse = !(ctx && ctx.isGist) && !!site;
    const browseUrl = canBrowse ? browseHref(site) : '';

    setLink(rawBtn, rawHref, '通过镜像打开当前文件的 Raw', '请先打开一个文件（blob）页面');
    setLink(fileBtn, rawHref, '通过镜像下载当前文件', '请先打开一个文件（blob）页面');
    setLink(zipBtn, zipHref, '通过镜像下载仓库 ZIP', '当前页面没有可用的 ZIP 链接');
    setLink(browseBtn, browseUrl, '在镜像中打开当前页面', 'Gist 不支持全站镜像');
    cloneBtn.disabled = !ctx;

    const assetCount = collectAssetLinks().length;
    const assetsBtn = shadow.querySelector('[data-act="assets"]');
    assetsBtn.disabled = !assetCount;
    assetsBtn.title = assetCount
      ? `复制当前页面 ${assetCount} 个 Release 资产的镜像链接`
      : '当前页面没有 Release 资产';

    const assetsDlBtn = shadow.querySelector('[data-act="assetsdl"]');
    assetsDlBtn.disabled = !assetCount;
    assetsDlBtn.title = assetCount
      ? `通过镜像依次下载 ${assetCount} 个资产`
      : '当前页面没有 Release 资产';

    const manageList = byRole('manage-list');
    const pinned = s.pinnedMirrors || [];
    const disabled = s.disabledMirrors || [];
    const manageHtml = sortedMirrors(manageMirrorList())
      .map((mirror) => {
        const health = healthOf(mirror);
        const isPinned = pinned.indexOf(mirror.id) >= 0;
        const isOff = disabled.indexOf(mirror.id) >= 0;
        const ms = state.settings.speeds && state.settings.speeds[mirror.id];
        const speed = typeof ms === 'number' ? speedText(ms) : '';
        const tag =
          mirror.custom
            ? `<span class="mtag">${escHtml(customTypeName(mirror.type))}${mirror.type !== 'api' && !mirror.base ? ' · 未配置' : ''}</span>`
            : '';
        return (
          `<div class="mline${isOff ? ' off' : ''}">` +
          `<span class="mdot ${health}"></span>` +
          `<span class="mlabel">${escHtml(mirror.label)}${tag}</span>` +
          `<span class="mspeed">${speed}</span>` +
          `<button type="button" data-manage="pin" data-id="${escHtml(mirror.id)}" class="${isPinned ? 'on' : ''}">${isPinned ? '取消置顶' : '置顶'}</button>` +
          `<button type="button" data-manage="disable" data-id="${escHtml(mirror.id)}" class="${isOff ? 'on' : ''}">${isOff ? '启用' : '禁用'}</button>` +
          `</div>`
        );
      })
      .join('');
    setHTML(manageList, manageHtml);

    const statsEl = byRole('stats');
    const st = state.stats;
    const hasStats = st.downloads + st.raw + st.clone > 0;
    statsEl.hidden = !hasStats;
    if (hasStats) {
      statsEl.textContent =
        `本次会话：下载 ${st.ok}/${st.downloads} 成功` +
        (st.fail ? `（失败 ${st.fail}）` : '') +
        ` · Raw ${st.raw} 次 · Clone ${st.clone} 次`;
    }

    shadow.querySelector('.fab').title = `GitHub 镜像加速 (${s.hotkey || DEFAULTS.hotkey})`;
    state.panelSig = panelSignature();
  }

  // 让按钮式链接携带真实 href，浏览器悬停时即可显示目标地址
  function setLink(el, href, titleText, emptyTitle) {
    if (!el) return;
    if (href) {
      el.href = href;
      el.classList.remove('disabled');
      el.removeAttribute('aria-disabled');
      el.title = titleText;
    } else {
      el.removeAttribute('href');
      el.classList.add('disabled');
      el.setAttribute('aria-disabled', 'true');
      el.title = emptyTitle;
    }
  }

  function panelSignature() {
    const ctx = getRepoContext();
    return [
      location.pathname,
      ctx ? `${ctx.owner}/${ctx.repo}` : '-',
      ctx && ctx.isGist ? 'gist' : '',
      ctx && ctx.isFile ? 1 : 0,
      collectAssetLinks().length,
      state.settings.mirror,
      customRoutesSignature(state.settings.customRoutes),
      githubLogin(),
    ].join('|');
  }

  function describeType(type) {
    if (type === 'proxy') return ' · 下载代理';
    if (type === 'site') return ' · 全站镜像';
    if (type === 'clone') return ' · 仅 Clone';
    if (type === 'template') return ' · URL 模板';
    if (type === 'api') return ' · API 加速';
    return '';
  }

  function buildMirrorOptionsHTML() {
    const opt = (m) => {
      const ms = state.settings.speeds && state.settings.speeds[m.id];
      let suffix = '';
      if (typeof ms === 'number') suffix = ` · ${speedText(ms) || '超时'}`;
      const health = healthOf(m);
      const badge = health === 'ok' ? '✓ ' : health === 'bad' ? '✕ ' : '';
      const off = isMirrorDisabled(m.id) ? ' · 已禁用' : '';
      return `<option value="${escHtml(m.id)}">${badge}${escHtml(m.label)}${suffix}${off}</option>`;
    };
    const group = (type) => sortedMirrors(MIRRORS.filter((m) => m.type === type)).map(opt).join('');
    const customList = sortedMirrors(customMirrorList()).map(opt).join('');
    const customGroup = customList ? `<optgroup label="自定义线路">${customList}</optgroup>` : '';
    return `
      <optgroup label="下载代理（Raw / Release / Archive）">${group('proxy')}</optgroup>
      <optgroup label="URL 模板（Raw / 文件 CDN）">${group('template')}</optgroup>
      <optgroup label="全站镜像（可浏览网页）">${group('site')}</optgroup>
      <optgroup label="镜像 Clone">${group('clone')}</optgroup>
      ${customGroup}
    `;
  }

  function buildPurposeOptionsHTML(need) {
    const opt = (m) => {
      const health = healthOf(m);
      const badge = health === 'ok' ? '✓ ' : health === 'bad' ? '✕ ' : '';
      const off = isMirrorDisabled(m.id) ? ' · 已禁用' : '';
      return `<option value="${escHtml(m.id)}">${badge}${escHtml(m.label)}${off}</option>`;
    };
    const head = '<option value="auto">跟随主线路</option>';
    // 自定义线路与内置线路一起按能力过滤、按测速结果排序
    const customItems = sortedMirrors(
      customMirrorList().filter((m) => mirrorCaps(m, need)),
    )
      .map(opt)
      .join('');
    const tail = customItems ? `<optgroup label="自定义线路">${customItems}</optgroup>` : '';
    if (need !== 'clone') {
      const list = sortedMirrors(MIRRORS.filter((m) => mirrorCaps(m, need))).map(opt).join('');
      return `${head}${list}${tail}`;
    }
    // Clone 按能力分组：专用节点 / 标记 caps.clone 的代理 / 全站镜像，避免选到不支持 git 的线路
    const group = (label, list) => {
      const items = sortedMirrors(list).map(opt).join('');
      return items ? `<optgroup label="${label}">${items}</optgroup>` : '';
    };
    return (
      head +
      group('Clone 专用节点', MIRRORS.filter((m) => m.type === 'clone')) +
      group('支持 Clone 的代理', MIRRORS.filter((m) => m.type === 'proxy' && mirrorCaps(m, 'clone'))) +
      group('全站镜像', MIRRORS.filter((m) => m.type === 'site')) +
      tail
    );
  }

  function buildApiOptionsHTML() {
    const head = '<option value="off">关闭</option>';
    const builtins = builtinApiList()
      .map((m) => `<option value="${m.id}">${m.label} · API</option>`)
      .join('');
    const custom = sortedMirrors(apiMirrorList())
      .map(
        (m) =>
          `<option value="${escHtml(m.id)}">${escHtml(m.label)}${isMirrorDisabled(m.id) ? ' · 已禁用' : ''}</option>`,
      )
      .join('');
    return `${head}${builtins}${custom ? `<optgroup label="自定义线路">${custom}</optgroup>` : ''}`;
  }

  function handleManageAction(action, id) {
    if (!id || (!MIRRORS.some((m) => m.id === id) && !findCustomRoute(id))) return;
    const s = state.settings;
    if (action === 'pin') {
      const pinned = s.pinnedMirrors || [];
      s.pinnedMirrors =
        pinned.indexOf(id) >= 0 ? pinned.filter((x) => x !== id) : pinned.concat(id);
    } else if (action === 'disable') {
      const disabled = s.disabledMirrors || [];
      const turnOff = disabled.indexOf(id) < 0;
      s.disabledMirrors = turnOff
        ? disabled.concat(id)
        : disabled.filter((x) => x !== id);
      if (turnOff) {
        if (s.mirror === id) {
          const next =
            MIRRORS.find((m) => !isMirrorDisabled(m.id) && m.type !== 'clone') || MIRRORS[0];
          s.mirror = next ? next.id : DEFAULTS.mirror;
        }
        ['mirrorRaw', 'mirrorDownloads', 'mirrorClone'].forEach((key) => {
          if (s[key] === id) s[key] = 'auto';
        });
        if (s.apiMirror === id) s.apiMirror = 'off';
      }
    }
    saveSettings();
    renderPanel();
    refreshInjected();
  }

  // ---------------------------------------------------------------------------
  // 面板动作
  // ---------------------------------------------------------------------------
  function openInNewTab(url) {
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  }

  function doPanelAction(act, toast) {
    const ctx = getRepoContext();
    const m = activeMirror();

    if (act === 'speed') {
      runSpeedTest(toast);
      return;
    }

    if (act === 'export') {
      exportConfig(toast);
      return;
    }

    if (act === 'import') {
      importConfig(toast);
      return;
    }

    if (act === 'assetsdl') {
      downloadAssets(toast);
      return;
    }

    if (act === 'ghcmd') {
      const cmd = ghDownloadCommand();
      if (!cmd) return toast('请先打开 Actions 运行页面', true);
      copyText(cmd).then((ok) => toast(ok ? `已复制：${cmd}` : '复制失败', !ok));
      return;
    }

    if (act === 'actdl') {
      downloadRunArtifacts(toast);
      return;
    }

    if (act === 'actlog') {
      downloadRunLog(toast);
      return;
    }

    if (act === 'newtoken') {
      // 打开预填说明的 Token 创建页；公开仓库其实无需 Token
      openInNewTab(
        'https://github.com/settings/tokens/new?scopes=repo&description=GitHub%20Mirror%20Accelerator'
      );
      return;
    }

    if (act === 'diagnose') {
      runDiagnostics(toast);
      return;
    }

    if (act === 'assets') {
      const list = collectAssetLinks();
      if (!list.length) return toast('当前页面没有 Release 资产', true);
      const dm = chooseDownloadMirror('downloads');
      if (!dm) return toast('没有可用的下载镜像', true);
      const text = list.map((item) => mirrorize(item.url, dm)).join('\n');
      copyText(text).then((ok) =>
        toast(ok ? `已复制 ${list.length} 条镜像链接` : '复制失败', !ok)
      );
      return;
    }

    if (act === 'gitcfg') {
      const cmd = insteadOfCommand();
      if (!cmd) return toast('当前线路不支持 git 配置', true);
      copyText(cmd).then((ok) =>
        toast(ok ? '已复制 git insteadOf 配置' : '复制失败', !ok)
      );
      return;
    }

    if (act === 'browse') {
      if (ctx && ctx.isGist) return toast('Gist 不支持全站镜像', true);
      const site = siteMirror();
      if (!site) return toast('没有可用的全站镜像', true);
      openInNewTab(browseHref(site, location.pathname, location.search, location.hash));
      if (!mirrorCaps(m, 'browse')) toast(`当前线路不支持浏览，已使用 ${site.label}`);
      return;
    }

    if (!ctx) {
      toast('请先打开一个 GitHub 仓库页面', true);
      return;
    }

    if (act === 'filedl') {
      if (!ctx.isFile) return toast('请先打开一个文件页面', true);
      downloadViaMirror(getRawUrl(ctx), currentFileName(), toast, 'raw');
      return;
    }

    if (act === 'clone') {
      const cm = chooseCloneMirror(true);
      copyText(cloneCommand(ctx, cm)).then((ok) => {
        if (ok) state.stats.clone++;
        toast(ok ? '已复制 Clone 命令' : '复制失败', !ok);
        renderPanel();
      });
      return;
    }

    if (act === 'raw') {
      if (!ctx.isFile) return toast('请先打开一个文件页面', true);
      const raw = getRawUrl(ctx);
      if (!raw) return toast('当前页面没有可用的 Raw 链接', true);
      const dm = chooseDownloadMirror('raw');
      if (!dm) return toast('没有可用的下载镜像', true);
      state.stats.raw++;
      openInNewTab(mirrorizeRaw(raw, dm));
      renderPanel();
      return;
    }

    if (act === 'zip') {
      const link = zipUrl(ctx);
      if (!link) return toast('当前页面没有可用的 ZIP 链接', true);
      downloadViaMirror(link, `${ctx.repo}.zip`, toast);
      return;
    }

    if (act === 'copy') {
      const dm = chooseDownloadMirror(ctx.isFile ? 'raw' : 'downloads');
      if (!dm) return toast('没有可用的下载镜像', true);
      let target;
      if (ctx.isFile) target = mirrorizeRaw(getRawUrl(ctx), dm);
      else if (dm.type === 'site') target = mirrorize(location.href, dm);
      else target = mirrorize(zipUrl(ctx), dm);
      copyText(target).then((ok) =>
        toast(ok ? '已复制镜像直链' : '复制失败', !ok)
      );
    }
  }

  // 测速样本：各线路统一下载同一份 256KB 内容，耗时越短代表实际下载越快；
  // 只测握手延迟会把“响应快但带宽低”的线路误判为最快
  const SPEED_SAMPLE_BYTES = 256 * 1024;
  const SPEED_SAMPLE_URL = 'https://raw.githubusercontent.com/torvalds/linux/master/MAINTAINERS';

  function speedText(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n) || n === 0) return '';
    if (n < 0) return '超时';
    const kbps = SPEED_SAMPLE_BYTES / 1024 / (n / 1000);
    return `${Math.round(kbps)} KB/s`;
  }

  async function runSpeedTest(toast) {
    const notify = toast || (state.toast || (() => { }));
    // 自定义代理 / 全站镜像与内置线路一起参与测速与排序
    const list = browsingMirrors().filter(
      (m) => !isMirrorDisabled(m.id) && (m.type === 'proxy' || m.type === 'site')
    );
    notify('测速中，请稍候…');

    const results = await Promise.all(list.map((m) => probeMirror(m)));
    const speeds = Object.assign({}, state.settings.speeds);
    results.forEach((r) => {
      speeds[r.id] = r.ok ? r.ms : -1;
      markHealth(r.id, r.ok);
    });
    state.settings.speeds = speeds;

    const okList = results.filter((r) => r.ok).sort((a, b) => a.ms - b.ms);
    if (okList.length) {
      state.settings.mirror = okList[0].id;
    }
    saveSettings();
    renderPanel();
    refreshInjected();

    if (okList.length) {
      const best = okList[0];
      const mirror = mirrorById(best.id);
      notify(`已选择最快线路：${mirror ? mirror.label : best.id} ${speedText(best.ms)}`);
    } else {
      notify('所有线路测速失败，请检查网络', true);
    }
  }

  function probeMirror(m, timeout, sampleBytes) {
    const limit = timeout || 12000;
    const targetBytes = sampleBytes || SPEED_SAMPLE_BYTES;
    return new Promise((resolve) => {
      const started = Date.now();
      let finished = false;
      let req = null;
      const done = (ok) => {
        if (finished) return;
        finished = true;
        resolve({ id: m.id, ok, ms: ok ? Math.max(1, Date.now() - started) : -1 });
      };
      let url = '';
      if (m.type === 'site') {
        url = `${stripTrailingSlash(m.base)}/torvalds/linux/raw/master/MAINTAINERS`;
      } else if (m.type === 'proxy') {
        url = normalizeBase(m.base) + SPEED_SAMPLE_URL;
      } else {
        return done(true); // 模板线路无法统一探测，视为可用
      }

      if (typeof GM_xmlhttpRequest !== 'function') return done(false);

      try {
        req = GM_xmlhttpRequest({
          method: 'GET',
          url,
          timeout: limit,
          onprogress: (res) => {
            const bytes = Number(res.responseLength || (res.responseText ? res.responseText.length : 0));
            if (bytes >= targetBytes) {
              done(true);
              try {
                if (req && typeof req.abort === 'function') req.abort();
              } catch (e) {
                /* 已中止，忽略 */
              }
            }
          },
          onload: (res) => done(res.status >= 200 && res.status < 400),
          onerror: () => done(false),
          ontimeout: () => done(false),
        });
      } catch (e) {
        done(false);
      }
      setTimeout(() => done(false), limit + 500);
    });
  }

  async function runDiagnostics(toast) {
    const notify = toast || (state.toast || (() => { }));
    notify('正在诊断线路，请稍候…');
    const list = browsingMirrors().filter(
      (m) => !isMirrorDisabled(m.id) && (m.type === 'proxy' || m.type === 'site')
    );
    const results = await Promise.all(list.map((m) => probeMirror(m, 4000, 16 * 1024)));
    results.forEach((r) => markHealth(r.id, r.ok));

    const s = state.settings;
    const m = activeMirror();
    const ctx = getRepoContext();
    const csp = $('meta[http-equiv="Content-Security-Policy"]');
    const apiRoute = findCustomRoute(s.apiMirror);
    const apiBuiltin = builtinApiById(s.apiMirror);
    const apiName =
      s.apiMirror === 'off'
        ? '关闭'
        : s.apiMirror === 'custom'
          ? `自定义（${s.apiCustom || '未填写'}）`
          : apiRoute
            ? `${apiRoute.label || '自定义线路'}（${normalizeBase(apiRoute.base) || '未填写'}）`
            : apiBuiltin
              ? `${apiBuiltin.label}（${apiBuiltin.apiBase}）`
              : s.apiMirror;
    const lines = [
      'GitHub 镜像加速诊断报告',
      `时间：${new Date().toLocaleString()}`,
      `脚本版本：${SCRIPT_VERSION}`,
      `页面：${location.href}`,
      `页面类型：${ctx ? (ctx.isGist ? 'Gist' : '仓库') : '其他'}`,
      '',
      `主线路：${m ? `${m.label}（${describeType(m.type)}）` : '未配置'}`,
      `分用途线路：Raw=${s.mirrorRaw} / Downloads=${s.mirrorDownloads} / Clone=${s.mirrorClone}`,
      `自动降级：${s.autoFallback ? '开' : '关'} · 自动下载改写：${s.autoDownload ? '开' : '关'}`,
      `API 加速：${apiName}`,
      `Actions Token：${s.actionsToken ? '已配置' : '未配置（使用浏览器登录态）'}`,
      `静态资源 CDN：${s.staticCdn ? '开' : '关'}`,
      `禁用线路：${(s.disabledMirrors || []).join(', ') || '无'}`,
      `置顶线路：${(s.pinnedMirrors || []).join(', ') || '无'}`,
      `GM_xmlhttpRequest：${typeof GM_xmlhttpRequest === 'function' ? '可用' : '不可用'}`,
      `GM_setClipboard：${typeof GM_setClipboard === 'function' ? '可用' : '不可用'}`,
      `页面 CSP：${csp ? String(csp.content || '').slice(0, 200) : '未检测到'}`,
      `User-Agent：${navigator.userAgent}`,
      '',
      '线路探测（抽样 16KB，耗时含握手）：',
    ];
    results.forEach((r) => {
      const mirror = mirrorById(r.id);
      lines.push(
        `  ${r.ok ? '✓' : '✕'} ${mirror ? mirror.label : r.id} ${r.ok ? `${r.ms}ms` : '失败或超时'}`
      );
    });

    renderPanel();
    const ok = await copyText(lines.join('\n'));
    notify(ok ? '诊断报告已复制到剪贴板' : '诊断完成，但复制失败', !ok);
  }

  // ---------------------------------------------------------------------------
  // Code 面板增强
  // ---------------------------------------------------------------------------
  function injectGlobalStyle() {
    if ($('#ghma-style')) return;
    const style = document.createElement('style');
    style.id = 'ghma-style';
    style.textContent = `
      .ghma-toolbar { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; flex-wrap: wrap; }
      .ghma-toolbar .ghma-btn { white-space: nowrap; }
      .ghma-raw-btn { white-space: nowrap; }
    `;
    document.head.appendChild(style);
  }

  function removeEl(sel) {
    const el = document.querySelector(sel);
    if (el) el.remove();
  }

  function removeRawButton() {
    $$('.ghma-raw-wrap').forEach((el) => el.remove());
    removeEl('.ghma-raw-btn');
  }

  function injectToolbar() {
    if (!state.settings.codeToolbar) {
      removeEl('.ghma-toolbar');
      return;
    }
    const ctx = getRepoContext();
    if (!ctx) return;
    const mount =
      $('.file-navigation') || $('[data-testid="repository-content"] .file-navigation');
    if (!mount) return;

    let bar = $('.ghma-toolbar');
    if (!bar || !bar.isConnected) {
      bar = document.createElement('div');
      bar.className = 'ghma-toolbar';
      bar.addEventListener('click', (e) => {
        const btn = e.target.closest && e.target.closest('[data-ghma]');
        if (!btn) return;
        e.preventDefault();
        handleToolbarAction(btn.dataset.ghma);
      });
      mount.appendChild(bar);
    }

    const m = activeMirror();
    const dmDl = chooseDownloadMirror('downloads', true);
    const dmRaw = chooseDownloadMirror('raw', true);
    const site = siteMirror();
    const zipLink = zipUrl(ctx);
    const zipHref = zipLink && dmDl ? mirrorize(zipLink, dmDl) : '';
    const rawHref = ctx.isFile && dmRaw ? mirrorizeRaw(getRawUrl(ctx), dmRaw) : '';
    const siteHref = site ? browseHref(site, location.pathname, location.search, '') : '';
    const sig = [
      ctx.owner,
      ctx.repo,
      ctx.isFile ? 1 : 0,
      m ? m.id : '-',
      dmDl ? dmDl.id : '-',
      dmRaw ? dmRaw.id : '-',
      siteHref,
      zipHref,
      rawHref,
      state.settings.enabled ? 1 : 0,
    ].join('|');
    if (bar.dataset.sig === sig) return;
    bar.dataset.sig = sig;

    const attr = (v) =>
      String(v || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const link = (act, label, href, title) =>
      `<a class="btn btn-sm ghma-btn" data-ghma="${act}"${href ? ` href="${attr(href)}"` : ''} target="_blank" rel="noopener" title="${title}">${label}</a>`;

    bar.innerHTML = `
      <button type="button" class="btn btn-sm ghma-btn" data-ghma="clone" title="复制镜像 Clone 命令">镜像 Clone</button>
      ${link('zip', '下载 ZIP', zipHref, '通过镜像下载仓库 ZIP')}
      ${ctx.isFile
        ? link('raw', '镜像 Raw', rawHref, '通过镜像打开 Raw 文件') +
        link('filedl', '下载文件', rawHref, '通过镜像下载当前文件')
        : ''
      }
      ${link('site', '镜像站', siteHref, '在全站镜像中打开')}
    `;
  }

  function handleToolbarAction(action) {
    const ctx = getRepoContext();
    const notify = state.toast || (() => { });
    if (!ctx) return;

    if (action === 'clone') {
      const cm = chooseCloneMirror(true);
      if (!cm) return notify('请先配置镜像线路', true);
      copyText(cloneCommand(ctx, cm)).then((ok) => {
        if (ok) state.stats.clone++;
        notify(ok ? '已复制 Clone 命令' : '复制失败', !ok);
        renderPanel();
      });
      return;
    }
    if (action === 'zip') {
      const link = zipUrl(ctx);
      if (!link) return notify('当前页面没有可用的 ZIP 链接', true);
      downloadViaMirror(link, `${ctx.repo}.zip`, notify);
      return;
    }
    if (action === 'raw') {
      if (!ctx.isFile) return notify('请先打开文件页面', true);
      const raw = getRawUrl(ctx);
      if (!raw) return notify('当前页面没有可用的 Raw 链接', true);
      const dm = chooseDownloadMirror('raw');
      if (!dm) return notify('没有可用的下载镜像', true);
      state.stats.raw++;
      openInNewTab(mirrorizeRaw(raw, dm));
      renderPanel();
      return;
    }
    if (action === 'filedl') {
      if (!ctx.isFile) return notify('请先打开文件页面', true);
      downloadViaMirror(getRawUrl(ctx), currentFileName(), notify, 'raw');
      return;
    }
    if (action === 'site') {
      const site = siteMirror();
      if (!site) return notify('没有可用的全站镜像', true);
      openInNewTab(browseHref(site, location.pathname, location.search, ''));
    }
  }

  function injectRawButton() {
    if (!state.settings.rawButton) {
      removeRawButton();
      return;
    }
    const ctx = getRepoContext();
    if (!ctx || !ctx.isFile) {
      removeRawButton();
      return;
    }
    const rawLink = $('a[data-testid="raw-button"]') || $('#raw-url');
    const dm = chooseDownloadMirror('raw', true);
    if (!rawLink || !rawLink.parentElement || !dm) return;

    const existing = $('.ghma-raw-btn');
    if (existing && existing.isConnected) {
      existing.href = mirrorizeRaw(getRawUrl(ctx), dm);
      return;
    }

    // 复用原生 Raw 按钮的类名与尺寸，并按 GitHub ButtonGroup 的结构包裹
    const nativeClass = (rawLink.getAttribute('class') || '').trim();
    const a = document.createElement('a');
    a.className = `${nativeClass || 'btn btn-sm'} ghma-raw-btn`;
    ['data-size', 'data-variant', 'data-component'].forEach((name) => {
      const value = rawLink.getAttribute(name);
      if (value) a.setAttribute(name, value);
    });
    a.textContent = '镜像 Raw';
    a.href = mirrorizeRaw(getRawUrl(ctx), dm);
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = '通过镜像打开 Raw 文件';
    a.setAttribute('aria-label', '镜像 Raw');

    const groupItem = rawLink.closest && rawLink.closest('[class*="prc-ButtonGroup-Item"]');
    if (groupItem && groupItem.parentElement) {
      // 与原生按钮同组，共享圆角与边框，不再单独加间距
      const wrap = document.createElement('div');
      wrap.className = `${groupItem.className} ghma-raw-wrap`;
      wrap.appendChild(a);
      groupItem.parentElement.insertBefore(wrap, groupItem.nextSibling);
    } else {
      a.style.marginLeft = '8px';
      rawLink.parentElement.insertBefore(a, rawLink.nextSibling);
    }
  }

  function refreshInjected() {
    if (!state.settings.enabled) {
      removeEl('.ghma-toolbar');
      removeRawButton();
      restoreStaticCdn();
      restoreDownloadLinks();
      return;
    }
    injectGlobalStyle();
    injectToolbar();
    injectRawButton();
    applyStaticCdn();
    if (state.settings.autoDownload) rewriteDownloadLinks();
    else restoreDownloadLinks();
    // Release 资产由 GitHub 懒加载，页面结构变化后需要同步面板状态
    if (state.panelOpen && panelSignature() !== state.panelSig) renderPanel();
  }

  // ---------------------------------------------------------------------------
  // Release / Archive 下载自动改写
  // ---------------------------------------------------------------------------
  const DOWNLOAD_LINK_SELECTOR = 'a[href*="/releases/download/"], a[href*="/archive/"]';
  const MIRROR_ATTR = 'data-ghma-orig';

  // 改写单个下载链接，并记录原始地址以便切换线路或关闭功能时还原
  function rewriteOne(a) {
    const raw = a.getAttribute(MIRROR_ATTR) || a.getAttribute('href');
    if (!raw) return;
    let abs = raw;
    try {
      abs = new URL(raw, location.href).href;
    } catch (e) {
      return;
    }
    if (!isDownloadUrl(abs)) return;

    // 只对 /archive/ 源码压缩包链接做 ref 修正（SHA 优先 / 分支 ref 一致性）
    // /releases/download/ 下的发布资产完全不动，避免把 APK / wheel 等误改成源码
    if (/\/archive\//.test(abs)) {
      const ctx = getRepoContext();
      if (ctx && !ctx.isGist) {
        const urlRef = getCurrentRef(ctx);
        if (urlRef) {
          const domRef = refFromArchiveHref(a.getAttribute('href') || '');
          const isSha = /^[0-9a-f]{7,40}$/i.test(urlRef);
          // SHA ref 直接覆盖；DOM ref 和 URL ref 不一致也覆盖
          if (isSha || urlRef !== domRef) {
            const corrected = zipUrl(ctx);
            if (corrected) abs = corrected;
          }
        }
      }
    }

    const dm = chooseDownloadMirror('downloads', true);
    if (!dm) return;
    const mirrored = mirrorize(abs, dm);
    if (!mirrored || mirrored === abs) return;
    if (a.getAttribute('href') === mirrored) return;
    a.setAttribute(MIRROR_ATTR, raw);
    a.setAttribute('href', mirrored);
  }

  // 主动扫描页面上的下载链接，避免依赖 click 事件被其他脚本拦截
  function rewriteDownloadLinks() {
    if (!state.settings.enabled || !state.settings.autoDownload) return;
    $$(DOWNLOAD_LINK_SELECTOR).forEach(rewriteOne);
  }

  // 关闭功能时把链接恢复成 GitHub 原始地址
  function restoreDownloadLinks() {
    $$(`a[${MIRROR_ATTR}]`).forEach((a) => {
      const orig = a.getAttribute(MIRROR_ATTR);
      if (orig) a.setAttribute('href', orig);
      a.removeAttribute(MIRROR_ATTR);
    });
  }

  function rewriteDownloadLink(e) {
    if (!state.settings.enabled || !state.settings.autoDownload) return;
    const target = e.target;
    const a = target && target.closest ? target.closest('a[href]') : null;
    if (a) rewriteOne(a);
  }

  document.addEventListener(
    'click',
    (e) => {
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      rewriteDownloadLink(e);
    },
    true
  );
  // 中键「在新标签页打开」同样走镜像
  document.addEventListener(
    'auxclick',
    (e) => {
      if (e.button === 1) rewriteDownloadLink(e);
    },
    true
  );

  // ---------------------------------------------------------------------------
  // 菜单 / 快捷键
  // ---------------------------------------------------------------------------
  function cycleMirror() {
    const enabled = MIRRORS.filter((m) => !isMirrorDisabled(m.id));
    if (!enabled.length) return;
    const index = enabled.findIndex((m) => m.id === state.settings.mirror);
    const next = enabled[(index + 1) % enabled.length];
    state.settings.mirror = next.id;
    saveSettings();
    renderPanel();
    refreshInjected();
    if (state.toast) state.toast(`已切换到 ${next.label}`);
  }

  function registerMenus() {
    if (typeof GM_registerMenuCommand !== 'function') return;
    GM_registerMenuCommand('打开 / 关闭镜像面板', () => {
      if (state.togglePanel) state.togglePanel();
    });
    GM_registerMenuCommand('切换镜像线路', cycleMirror);
    GM_registerMenuCommand('镜像测速并选择最快', () => runSpeedTest());
    GM_registerMenuCommand('检测线路可用性', async () => {
      const ok = await ensureHealthy();
      if (state.toast) {
        state.toast(ok ? `线路可用：${ok.label}` : '所有候选线路均不可用', !ok);
      }
      renderPanel();
    });
    GM_registerMenuCommand('在 API 镜像中查看当前仓库', () => {
      const ctx = getRepoContext();
      const base = apiBase();
      if (!base) {
        if (state.toast) state.toast('请先在面板启用 API 加速', true);
        return;
      }
      if (!ctx) {
        if (state.toast) state.toast('请先打开仓库页面', true);
        return;
      }
      openInNewTab(`${base}repos/${ctx.owner}/${ctx.repo}`);
    });
    GM_registerMenuCommand('启用 / 禁用脚本', () => {
      state.settings.enabled = !state.settings.enabled;
      saveSettings();
      renderPanel();
      refreshInjected();
    });
    GM_registerMenuCommand('重置所有设置', () => {
      state.settings = Object.assign({}, DEFAULTS, {
        customRoutes: [],
        fabPos: Object.assign({}, DEFAULTS.fabPos),
        disabledMirrors: [],
        pinnedMirrors: [],
        speeds: {},
      });
      state.health = {};
      restoreStaticCdn();
      saveSettings();
      if (state.applyFabPosition) state.applyFabPosition();
      renderPanel();
      refreshInjected();
      if (state.toast) state.toast('已重置设置');
    });
  }

  document.addEventListener('keydown', (e) => {
    if (!matchHotkey(e)) return;
    const editable = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    // 事件从 Shadow DOM 里冒出时 target 会被重定向为宿主元素，需额外检查影子树内的焦点
    if (editable(e.target) || (state.shadow && editable(state.shadow.activeElement))) return;
    e.preventDefault();
    if (state.togglePanel) state.togglePanel();
  });

  // ---------------------------------------------------------------------------
  // 启动
  // ---------------------------------------------------------------------------
  const HEALTH_INTERVAL = 10 * 60 * 1000;

  // 定时巡检：首选线路异常时自动切换，并提示用户
  async function refreshHealth() {
    if (document.hidden || !state.settings.enabled || !state.settings.autoFallback) return;
    const before = activeMirror();
    const ok = await ensureHealthy();
    if (state.panelOpen) renderPanel(); // 面板未展开时无需刷新 UI
    if (state.toast && before && ok && ok.id !== before.id && healthOf(before) === 'bad') {
      state.toast(`线路 ${before.label} 异常，已切换至 ${ok.label}`);
    }
  }

  function initUi() {
    const s = state.settings;
    // 主线路被禁用或已不存在时，回退到第一条可用线路
    const customSelected = isCustomId(s.mirror);
    const mirrorMissing = customSelected
      ? !customMirror(s.mirror) || isMirrorDisabled(s.mirror)
      : !isKnownMirrorId(s.mirror) || isMirrorDisabled(s.mirror);
    if (mirrorMissing) {
      const next = MIRRORS.find((m) => !isMirrorDisabled(m.id) && m.type !== 'clone');
      if (next) {
        s.mirror = next.id;
        saveSettings();
      }
    }
    // 分用途线路指向已删除或不可用的自定义线路时回到 auto
    ['mirrorRaw', 'mirrorDownloads', 'mirrorClone'].forEach((key) => {
      const value = s[key];
      if (isCustomId(value) && !customMirror(value)) s[key] = 'auto';
    });
    // API 加速指向已删除、禁用或不再具备 API 能力的自定义线路时关闭
    if (s.apiMirror !== 'off') {
      if (s.apiMirror === 'custom') {
        if (!normalizeBase(s.apiCustom)) {
          s.apiMirror = 'off';
          saveSettings();
        }
      } else if (!builtinApiById(s.apiMirror)) {
        const route = findCustomRoute(s.apiMirror);
        if (!route || !isApiRoute(route) || isMirrorDisabled(route.id)) {
          s.apiMirror = 'off';
          saveSettings();
        }
      }
    }

    // 用上次测速结果预热健康状态，失败线路无需等待探测即可被跳过
    Object.keys(state.settings.speeds || {}).forEach((id) => {
      if (Number(state.settings.speeds[id]) < 0) {
        state.health[id] = { ok: false, ts: Date.now() };
      }
    });

    buildUI();
    syncTheme();
    injectGlobalStyle();
    refreshInjected();
    registerMenus();

    const scheduleRefresh = debounce(() => refreshInjected(), 500);
    const observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.body, { childList: true, subtree: true });

    // 跟随 GitHub 的浅色 / 深色主题切换
    try {
      new MutationObserver(syncTheme).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-color-mode', 'data-light-theme', 'data-dark-theme'],
      });
    } catch (e) {
      /* ignore */
    }
    try {
      if (typeof matchMedia === 'function') {
        matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme);
      }
    } catch (e) {
      /* ignore */
    }

    ['turbo:load', 'pjax:end'].forEach((evt) => {
      document.addEventListener(evt, () => {
        document.querySelectorAll('.ghma-toolbar, .ghma-raw-btn, .ghma-raw-wrap').forEach((el) => el.remove());
        syncTheme();
        scheduleRefresh();
      });
    });

    // 页面空闲后做一次轻量健康检查，失败线路会被自动标记并跳过
    setTimeout(refreshHealth, 2500);
    // 每 10 分钟巡检一次，页面隐藏时跳过
    setInterval(refreshHealth, HEALTH_INTERVAL);
  }

  function boot() {
    installApiHooks();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initUi, { once: true });
    } else {
      initUi();
    }
  }

  boot();
})();
