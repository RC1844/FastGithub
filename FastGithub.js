// ==UserScript==
// @icon          https://github.githubassets.com/favicon.ico
// @name          GitHub镜像加速访问、克隆和下载
// @namespace     RC1844.FastGithub
// @author        RC1844
// @homepageURL   https://github.com/RC1844/FastGithub
// @supportURL    https://github.com/RC1844/FastGithub/issues
// @license       MIT License
// @description   镜像访问GitHub、加速克隆和下载；适配Github新UI；增加新克隆站点；前往项目Github仓库查看免费搭建Github镜像站点方法
// @include       *://github.com/*
// @include       *://github*
// @include       *://hub.fastgit.org/*
// @require       https://cdn.bootcss.com/jquery/3.4.1/jquery.min.js
// @version       1.5.2
// @run-at        document-end
// @grant         GM_addStyle
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

  var MirrorUrl = new Array();
  MirrorUrl[0] = "https://github.com.cnpmjs.org";
  MirrorUrl[1] = "https://hub.fastgit.org";
  MirrorUrl[2] = "https://github.wuyanzheshui.workers.dev";
  MirrorUrl[3] = "https://github.bajins.com";
  MirrorUrl[4] = "https://download.fastgit.org";
  MirrorUrl[5] = "https://github.rc1844.ml";
  MirrorUrl[6] = "https://gitclone.com/github.com";
  MirrorUrl[7] = "git@git.zhlh6.cn:";
  MirrorUrl[8] = "https://github-speedup.laiczhang.com";
  MirrorUrl[9] = "https://cdn.jsdelivr.net/gh";
  //添加对应索引即可使用
  var CloneSet = [1, 8, 0, 6];
  var MirrorSet = [1, 8, 0, 3, 2, 5];
  var DownloadSet = [4, 8, 2, 5];
  var RawSet = [1, 3, 2, 5];

  //其他
  var OtherUrl = new Array();
  OtherUrl = [
    {
      url: "https://github.com/RC1844/FastGithub",
      name: "脚本Github仓库地址，点个赞谢谢",
    },
    {
      url: "https://greasyfork.org/zh-CN/scripts/397419",
      name: "GreasyFork地址，希望可以给我评分收藏",
    },
    {
      url: "https://minhaskamal.github.io/DownGit",
      name: "DownGit",
    },
    {
      url: "https://d.serctl.com/",
      name: "GitHub中转下载",
    },
    {
      url: "https://github.zhlh6.cn/",
      name: "加速你的Github",
    },
    {
      url: "http://gitd.cc/",
      name: "GitHub代下载",
    },
    {
      url: "https://gh.isteed.cc/",
      name: "gh-proxy部署站点",
    },
    {
      url: "https://github.zsxwz.workers.dev/",
      name: "gh-proxy部署站点",
    },
    {
      url: "https://gh.api.99988866.xyz/",
      name: "gh-proxy部署站点",
    },
    {
      url: "https://g.ioiox.com/",
      name: "gh-proxy部署站点",
    },
    {
      url: "https://gh.sky-and-poem.fun/",
      name: "gh-proxy部署站点",
    },
    // {
    // url: "", name: "",
    // },
  ];
  var CloneList = addCloneList();
  var OtherList = addOtherList();
  addMenus(CloneList + addBrowseList() + OtherList);
  addReleasesList();
  addRawList();
  addDownloadZip();
  $(document).on("pjax:success", function (evt) {
    addRawList();
    addMenus(CloneList + addBrowseList() + OtherList);
    addDownloadZip();
  });
  /**
   * 添加Raw列表
   */
  function addRawList() {
    $("#raw-url").each(function () {
      var href = $(this).attr("href");
      var text = $(this).text();
      for (const i in RawSet) {
        if (RawSet.hasOwnProperty(i)) {
          const element = RawSet[i];
          var span = $(this).clone().removeAttr("id");
          span.attr({
            href: MirrorUrl[element] + href,
            title: MirrorUrl[element],
            target: "_blank",
          });
          span.text(text + i);
          $(this).before(span);
        }
      }
      var span = $(this).clone().removeAttr("id");
      span.attr({
        href: MirrorUrl[9] + href.replace("/raw/", "@"),
        title: MirrorUrl[9],
        target: "_blank",
      });
      span.text("jsDelivr");
      $(this).before(span);
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
      for (const i in DownloadSet) {
        if (DownloadSet.hasOwnProperty(i)) {
          const element = DownloadSet[i];
          var span1 = clone.clone();
          span1.attr({
            href: MirrorUrl[element] + href,
            title: MirrorUrl[element],
          });
          span1.html(
            span1.html().replace("Download ZIP", `Fast Download ZIP${i}`)
          );
          span = span.clone().append(span1);
        }
      }
      $(this).parent().after(span);
    });
  }
  /**
   * 添加Releases列表
   */
  function addReleasesList() {
    $(".Box--condensed").each(function () {
      $(this)
        .find(".flex-items-center>a")
        .each(function () {
          var href = $(this).attr("href");
          var span = "";
          if (!IsPC()) {
            span =
              `<div style="text-align: right;">` +
              downloadHref(href) +
              `</div>`;
          } else {
            span =
              `<small style="text-align: right;">` +
              downloadHref(href) +
              `</small>`;
          }
          $(this).next().append(span);
        });
      if (!IsPC()) {
        $(this).find(".d-flex").removeClass("d-flex");
      }
      $(this)
        .find(".d-block.Box-body>a")
        .each(function () {
          var href = $(this).attr("href");
          $(this).after(
            `<small style="text-align: right;">` +
            downloadHref(href) +
            `</small>`
          );
          $(this).parent().addClass("d-flex flex-justify-between");
        });

      function downloadHref(href) {
        var span = "";
        for (let i in DownloadSet) {
          span += `<a class="flex-1 btn btn-outline get-repo-btn" rel="nofollow" href="${MirrorUrl[DownloadSet[i]] + href
            }" title="${MirrorUrl[DownloadSet[i]]}">快速下载${i}</a>`;
        }
        return span;
      }
      /**
       * 检测是否为移动端
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
        for (var v = 0; v < Agents.length; v++) {
          if (userAgentInfo.indexOf(Agents[v]) > 0) {
            flag = false;
            break;
          }
        }
        return flag;
      }
    });
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
    <span class="css-truncate-target" data-menu-button="">镜像网站</span>
    <span class="dropdown-caret"></span>
  </summary>

  <details-menu class="SelectMenu SelectMenu--hasFilter" role="menu">
    <div class="SelectMenu-modal" style="width: 400px;">

      <header class="SelectMenu-header">
        <span class="SelectMenu-title">镜像站点与快速克隆</span>
        <button class="SelectMenu-closeButton" type="button" data-toggle-for="mirror-menu"><svg aria-label="Close menu"
            class="octicon octicon-x" viewBox="0 0 16 16" version="1.1" width="16" height="16" role="img">
            <path fill-rule="evenodd"
              d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z">
            </path>
          </svg></button>
      </header>

      <tab-container class="d-flex flex-column js-branches-tags-tabs" style="min-height: 0;">

        <div class="SelectMenu-tabs" role="tablist">
          <button class="SelectMenu-tab" type="button" data-filter-placeholder="Find or create a branch…" role="tab"
            aria-selected="true" tabindex="0">主要</button>
          <button class="SelectMenu-tab" type="button" data-filter-placeholder="Find a tag" role="tab"
            aria-selected="false" tabindex="-1">其他</button>
        </div>

        <div role="tabpanel" class="d-flex flex-column flex-auto overflow-auto" tabindex="0">
          <div class="SelectMenu-list" data-filter-list="">
            <div class=" btn-block"
              style="padding: 4px;background-color: #ffffdd;color: #996600;border-top-left-radius: 3px;border-top-right-radius: 3px;"
              role="alert">clone、depth命令的插入可手动编辑代码关闭</div>
            <div class=" btn-block"
              style="padding: 4px;background-color: #ffcccc;color: #990000;border-top-left-radius: 3px;border-top-right-radius: 3px;"
              role="alert">请不要在镜像网站登录账号，若因此造成任何损失本人概不负责</div> `;
    //克隆列表
    for (let i in CloneSet) {
      info += cloneHtml(Setting + MirrorUrl[CloneSet[i]] + "/" + git);
    }
    info += cloneHtml(Setting + MirrorUrl[7] + git);
    function cloneHtml(Url) {
      return `<div class="input-group">
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
    for (let i in CloneSet) {
      info += listHtml(MirrorUrl[MirrorSet[i]] + path, `镜像浏览${i}`);
    }
    if (
      href.length == 5 ||
      path.includes("/tree/") ||
      path.includes("/blob/")
    ) {
      var Html =
        MirrorUrl[9] + path.replace("/tree/", "@").replace("/blob/", "@");
      if (!path.includes("/blob/")) {
        Html += "/";
      }
      info += listHtml(Html, "jsDelivr");
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
      info += listHtml(element.url, element.name);
    });
    info += `</div>
        </div>
      </tab-container>
    </div>
  </details-menu>
</details>`;
    return info;
  }
  function listHtml(Url, Name) {
    return `<a class="SelectMenu-item" href="${Url}" target="_blank" title="${Url}" role="menuitemradio"
  aria-checked="false" rel="nofollow">
  <span class="css-truncate css-truncate-overflow" style="text-align:center;">
    ${Name}
  </span>
</a>`;
  }
})();
