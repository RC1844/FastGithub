// ==UserScript==
// @icon          https://github.githubassets.com/favicon.ico
// @name          FastGithub 镜像加速访问、克隆和下载
// @namespace     RC1844.FastGithub
// @author        RC1844
// @homepageURL   https://github.com/RC1844/FastGithub
// @supportURL    https://github.com/RC1844/FastGithub/issues
// @license       MIT License
// @description   镜像访问GitHub，极速Clone、Release/Raw/Zip加速；十几个站点可供选择；前往项目Github仓库查看免费搭建Github镜像站点方法
// @include       *://github.com/*
// @include       *://github*
// @include       *://hub.fastgit.org/*
// @require       https://cdn.bootcss.com/jquery/3.4.1/jquery.min.js
// @version       1.5.8
// @run-at        document-end
// ==/UserScript==

(function () {
  //=true为启用，=false为禁用
  var clone = true;
  // var clone = false;
  var depth = true;
  // var depth = false;
  var Setting = "";
  if (clone) {
    Setting += "git clone ";
    if (depth) {
      Setting += "--depth=1 ";
    }
  }

  var MirrorUrl = new Array();//["Url", "Name", "Tip"]
  MirrorUrl[0] = ["https://github.com.cnpmjs.org", "Cnpmjs", "由cnpmjs.org提供"];
  MirrorUrl[1] = ["https://hub.fastgit.org", "FastGit", "由KevinZonda推动的FastGit项目，目前项目资金不足，接受捐赠中"];
  MirrorUrl[2] = ["https://github.wuyanzheshui.workers.dev", "CF加速 1", "每日10万次调用上限，由wuyanzheshui提供"];
  MirrorUrl[3] = ["https://github.bajins.com", "Bajins", "Bajins的个人站点"];
  MirrorUrl[4] = ["https://download.fastgit.org", "FastGit", MirrorUrl[1][2]];
  MirrorUrl[5] = ["https://github.rc1844.workers.dev", "CF加速 2", "每日10万次调用上限，由RC1844提供"];
  MirrorUrl[6] = ["https://gitclone.com/github.com", "GitClone", "GitHub缓存加速网站，1元开会员尽享极速"];
  MirrorUrl[7] = ["git@git.zhlh6.cn:", "加速你的Github", "利用ucloud提供的GlobalSSH"];
  MirrorUrl[8] = ["https://github-speedup.laiczhang.com", "laiczhang", "laiczhang的个人站点"];
  MirrorUrl[9] = ["https://cdn.jsdelivr.net/gh", "jsDelivr", "项目当前分支总文件大小不可超过 50MB"];
  MirrorUrl[10] = ["https://g.ioiox.com/https://github.com", "Ioiox", "CN2 GIA 线路"];
  MirrorUrl[11] = ["https://raw.fastgit.org", "FastGit", MirrorUrl[1][2]];
  MirrorUrl[12] = ["https://cdn.staticaly.com/gh", "Statically", "只能浏览图片和源代码文件，文件大小限制为30MB"]
  MirrorUrl[13] = ["https://github.iapk.cc", "IAPK", "IAPK工具箱·Github下载器"]
  MirrorUrl[14] = ["https://iapk.cc/github?url=https://github.com", "IAPK", "IAPK工具箱·Github下载器"]
  MirrorUrl[15] = ["https://gh.haval.gq", "CF加速 3", "每日10万次调用上限，由Ecalose提供"]
  //添加对应索引即可使用
  var CloneSet = [1, 8, 0, 6, 10];
  var MirrorSet = [1, 8, 0, 3, 13, 2, 5, 15];
  var DownloadSet = [4, 8, 2, 5, 15, 10, 14];
  var RawSet = [3, 2, 5, 15, 14];

  //其他
  var OtherUrl = new Array();
  OtherUrl = [
    ["https://github.com/RC1844/FastGithub", "脚本Github仓库地址，点个赞谢谢"],
    ["https://greasyfork.org/zh-CN/scripts/397419", "GreasyFork地址，希望可以给我评分收藏"],
    ["https://doc.fastgit.org/", "FastGit，资金不足，接受捐赠中"],
    ["https://minhaskamal.github.io/DownGit", "DownGit"],
    ["https://zhoudaxiaa.gitee.io", "DownGit 周大侠啊"],
    ["https://gitclone.com", "GitClone，1元开会员"],
    ["https://d.serctl.com", "GitHub中转下载"],
    ["https://iapk.cc/github", "IAPK工具箱·Github下载器"],
    ["https://toolwa.com", "孟坤工具箱"],
    ["https://github.zhlh6.cn/", "加速你的Github"],
    ["http://gitd.cc", "GitHub代下服务"],
    ["https://gh.isteed.cc", "gh-proxy部署站点1"],
    ["https://github.zsxwz.workers.dev", "gh-proxy部署站点2"],
    ["https://gh.api.99988866.xyz", "gh-proxy部署站点3"],
    ["https://gh.sky-and-poem.fun", "gh-proxy部署站点4"],
    ["https://github.b15.me", "gh-proxy部署站点5"],
  ];
  var CloneList = addCloneList();
  var OtherList = addOtherList();
  var isPC = IsPC();
  run();
  $(document).on("pjax:success", function () {
    $("#mirror-menu").remove();
    run();
  });

  function run() {
    addMenus(CloneList + addBrowseList() + OtherList);
    if (location.pathname.split("/")[3] == "releases")
      addReleasesList();
    if (isPC)
      addDownloadZip();
    addRawList();
  }
  /**
   * 添加Raw列表
   */
  function addRawList() {
    $("#raw-url").each(function () {
      var href = $(this).attr("href");
      rawHtml(11, MirrorUrl[11][0] + href.replace("/raw", ""));
      RawSet.forEach((element) => {
        rawHtml(element, MirrorUrl[element][0] + href);
      });
      rawHtml(9, MirrorUrl[9][0] + href.replace("/raw/", "@"));
      rawHtml(12, MirrorUrl[12][0] + href.replace("/raw", ""));

      function rawHtml(element, Url) {
        var span = $("#raw-url").clone().removeAttr("id");
        span.attr({
          href: Url,
          title: MirrorUrl[element][2],
          target: "_blank",
        });
        span.text(MirrorUrl[element][1]);
        $("#raw-url").before(span);
      }
    });
  }

  /**
   * Fast Download ZIP
   */
  function addDownloadZip() {
    $("a[data-open-app='link']").each(function () {
      var span = $(`<li class="Box-row p-0"></li>`);
      var href = $(this).attr("href");
      var clone = $(this)
        .clone()
        .removeAttr("data-hydro-click data-hydro-click-hmac data-ga-click");
      clone.addClass("Box-row Box-row--hover-gray");
      DownloadSet.forEach((element) => {
        var span1 = clone.clone();
        span1.attr({
          href: MirrorUrl[element][0] + href,
          title: MirrorUrl[element][2],
        });
        span1.html(
          span1.html().replace("Download ZIP", `Download ZIP(${MirrorUrl[element][1]})`)
        );
        span = span.clone().append(span1);
      });
      $(this).parent().after(span);
    });
  }
  /**
   * 添加Releases列表
   */
  function addReleasesList() {
    $(".Box--condensed").find("[href]").each(function () {
      var href = $(this).attr("href");
      $(this).parent().after(`<div class="Box-body" >` + downloadHref(href) + `</div>`);
      $(this).parent().removeClass("Box-body");

      function downloadHref(href) {
        var span = "";
        DownloadSet.forEach((element) => {
          span += `<a class="flex-1 btn btn-outline get-repo-btn" rel="nofollow" href="${MirrorUrl[element][0] + href
            }" title="${MirrorUrl[element][2]}">${MirrorUrl[element][1]}</a>`;
        });
        return span;
      }
    });
  }
  /**
  * 检测是否为PC端
  */
  function IsPC() {
    var userAgentInfo = navigator.userAgent;
    var Agents = [
      "Android",
      "iPhone",
      "SymbianOS",
      "Windows Phone",
      "iPad",
      "iPod",
    ];
    var flag = true;
    const len = Agents.length;
    for (var v = 0; v < len; v++) {
      if (userAgentInfo.indexOf(Agents[v]) > 0) {
        flag = false;
        break;
      }
    }
    return flag;
  }
  /**
   * 添加菜单列表
   */
  function addMenus(info) {
    // $("div.flex-auto.min-width-0.width-fit.mr-3")
    $("h1.flex-wrap.break-word.text-normal").append(info);
  }
  /**
   * 添加克隆列表
   */
  function addCloneList() {
    var href = window.location.href.split("/");
    var git = href[3] + "/" + href[4] + ".git";
    var info = `<details class="details-reset details-overlay mr-0 mb-0" id="mirror-menu">
  <summary class="btn  ml-2 btn-primary" data-hotkey="m" title="打开列表" aria-haspopup="menu" role="button">
    <span class="css-truncate-target" data-menu-button="">克隆与镜像</span>
    <span class="dropdown-caret"></span>
  </summary>

  <details-menu class="SelectMenu SelectMenu--hasFilter" role="menu">
    <div class="SelectMenu-modal" style="width: 400px;">

      <header class="SelectMenu-header">
        <span class="SelectMenu-title">镜像站点与快速克隆</span>
        <button class="SelectMenu-closeButton" type="button" data-toggle-for="mirror-menu"><svg aria-label="Close menu"
            class="octicon octicon-x" width="16" height="16" role="img">
            <path fill-rule="evenodd"
              d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z">
            </path>
          </svg></button>
      </header>

      <tab-container class="d-flex flex-column js-branches-tags-tabs" style="min-height: 0;">

        <div class="SelectMenu-tabs" role="tablist">
          <button class="SelectMenu-tab" type="button" role="tab"
            aria-selected="true" tabindex="0">主要</button>
          <button class="SelectMenu-tab" type="button" role="tab"
            aria-selected="false" tabindex="-1">其他</button>
        </div>

        <div role="tabpanel" class="d-flex flex-column flex-auto overflow-auto" tabindex="0">
          <div class="SelectMenu-list" data-filter-list="">
            <div class="btn-block"
              style="padding: 4px;background-color: #ffffdd;color: #996600;" role="alert">
              clone、depth命令的插入可手动编辑代码关闭</div>
            <div class="btn-block flash-error"
              style="padding: 4px;color: #990000;" role="alert">
              请不要在镜像网站登录账号，若因此造成任何损失本人概不负责</div> `;
    //克隆列表
    CloneSet.forEach((element) => {
      info += cloneHtml(Setting + MirrorUrl[element][0] + "/" + git, MirrorUrl[element][1]);
    });
    info += cloneHtml(Setting + MirrorUrl[7][0] + git, MirrorUrl[7][1]);
    info += cloneHtml("git remote set-url origin https://github.com/" + git, "还原GitHub仓库地址");
    function cloneHtml(Url, Tip) {
      return `<div class="input-group" title="${Tip}">
              <input type="text" class="form-control input-monospace input-sm" value="${Url}" readonly=""
                data-autoselect="">
              <div class="input-group-button">
                <clipboard-copy value="${Url}" class="btn btn-sm"><svg class="octicon octicon-clippy"
                    viewBox="0 0 16 16" version="1.1" width="16" height="16" aria-hidden="true">
                    <path fill-rule="evenodd"
                      d="M5.75 1a.75.75 0 00-.75.75v3c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-3a.75.75 0 00-.75-.75h-4.5zm.75 3V2.5h3V4h-3zm-2.874-.467a.75.75 0 00-.752-1.298A1.75 1.75 0 002 3.75v9.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 13.25v-9.5a1.75 1.75 0 00-.874-1.515.75.75 0 10-.752 1.298.25.25 0 01.126.217v9.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-9.5a.25.25 0 01.126-.217z">
                    </path>
                  </svg></clipboard-copy>
              </div>
            </div>`;
    }
    return info;
  }
  /**
   * 添加镜像浏览列表
   */
  function addBrowseList() {
    var info = ``;
    var href = window.location.href.split("/");
    var path = window.location.pathname;
    MirrorSet.forEach((element) => {
      info += listHtml(MirrorUrl[element][0] + path, `镜像浏览(${MirrorUrl[element][1]})`, MirrorUrl[element][2]);
    });
    if (
      href.length == 5 ||
      path.includes("/tree/") ||
      path.includes("/blob/")
    ) {
      var Html =
        MirrorUrl[9][0] + path.replace("/tree/", "@").replace("/blob/", "@");
      if (!path.includes("/blob/")) {
        Html += "/";
      }
      info += listHtml(Html, `镜像浏览(${MirrorUrl[9][1]})`, MirrorUrl[9][2]);
    }
    if (location.hostname != "github.com") {
      info += listHtml(`https://github.com${path}`, "返回GitHub");
    }
    return info;
  }

  /**
   * 添加其他列表
   */
  function addOtherList() {
    var info = `
          </div>
        </div>
        <div role="tabpanel" class="d-flex flex-column flex-auto overflow-auto" tabindex="0" hidden="">
          <div class="SelectMenu-list">
            `;
    //其他列表
    OtherUrl.forEach((element) => {
      info += listHtml(element[0], element[1]);
    });
    info += `</div>
        </div>
      </tab-container>
    </div>
  </details-menu>
</details>`;
    return info;
  }
  function listHtml(Url, Name, Tip = "") {
    return `<a class="SelectMenu-item" href="${Url}" target="_blank" title="${Tip}" role="menuitemradio"
  aria-checked="false" rel="nofollow">
  <span class="css-truncate css-truncate-overflow" style="text-align:center;">
    ${Name}
  </span>
</a>`;
  }
})();
