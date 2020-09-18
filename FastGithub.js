// ==UserScript==
// @icon https://github.githubassets.com/favicon.ico
// @name GitHub镜像加速访问、克隆和下载
// @namespace RC1844.FastGithub
// @author RC1844
// @homepageURL https://github.com/RC1844/FastGithub
// @supportURL https://github.com/RC1844/FastGithub/issues
// @license MIT License
// @description 镜像访问GitHub、加速克隆和下载；适配Github新UI；增加新克隆站点；前往项目Github仓库查看免费搭建Github镜像站点方法
// @include *://github.com/*
// @include *://github*
// @include *://hub.fastgit.org/*
// @require http://cdn.bootcss.com/jquery/1.8.3/jquery.min.js
// @version 1.5.0
// @grant GM_addStyle
// ==/UserScript==

(function () {
  "use strict";

  //=true为启用，=false为禁用
  var clone = true;
  // var clone = false;
  var depth = true;
  // var depth = false;

  var mirror_url = new Array();
  mirror_url[0] = "https://github.com.cnpmjs.org/";
  mirror_url[1] = "https://hub.fastgit.org/";
  mirror_url[2] = "https://github.wuyanzheshui.workers.dev";
  mirror_url[3] = "https://github.bajins.com/";
  mirror_url[4] = "https://download.fastgit.org";
  mirror_url[5] = "https://github.rc1844.workers.dev";
  mirror_url[6] = "https://gitclone.com/github.com/";
  mirror_url[7] = "git@git.zhlh6.cn:";
  mirror_url[8] = "https://github-speedup.laiczhang.com/";
  //添加对应索引即可使用
  var clone_set = [1, 8, 0, 6, 7];
  var mirror_set = [1, 8, 0, 3, 2, 5];
  var download_set = [4, 8, 2, 5];
  var raw_set = [1, 8, 3, 2, 5];
  //其他
  var other_url = new Array();
  other_url = [{
    url: "https://github.com/RC1844/FastGithub",
    name: "脚本Github仓库地址，点个赞谢谢",
  }, {
    url: "https://greasyfork.org/zh-CN/scripts/397419",
    name: "GreasyFork地址，希望可以给我评分收藏",
  }, {
    url: "https://minhaskamal.github.io/DownGit",
    name: "DownGit",
  }, {
    url: "https://d.serctl.com/",
    name: "GitHub中转下载",
  }, {
    url: "https://github.zhlh6.cn/",
    name: "加速你的Github",
  }, {
    url: "http://gitd.cc/",
    name: "GitHub代下载",
  }, {
    url: "https://gh.isteed.cc/",
    name: "gh-proxy部署站点",
  }, {
    url: "https://github.zsxwz.workers.dev/",
    name: "gh-proxy部署站点",
  }, {
    url: "https://gh.api.99988866.xyz/",
    name: "gh-proxy部署站点",
  }, {
    url: "https://g.ioiox.com/",
    name: "gh-proxy部署站点",
  }, {
    url: "https://gh.sky-and-poem.fun/",
    name: "gh-proxy部署站点",
  },
    // {
    // url: "",
    // name: "",
    // },
  ];
  var str1 = "";
  if (clone) {
    str1 += "git clone ";
    if (depth) {
      str1 += "--depth=1 ";
    }
  }

  var a = window.location.href.split("/");
  var str2 = a[3] + "/" + a[4] + ".git";
  var str3 = window.location.pathname;

  //镜像列表
  // $("div.flex-auto.min-width-0.width-fit.mr-3")
  $("h1.flex-wrap.break-word.text-normal")
    .each(function () {
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
              role="alert">请不要在镜像网站登录账号，若因此造成任何损失本人概不负责</div>`;

      //克隆列表
      for (let i in clone_set) {
        info += `<div class="input-group">
              <input type="text" class="form-control input-monospace input-sm" value="${str1 + mirror_url[clone_set[i]] + str2
          }" readonly="" data-autoselect="">
              <div class="input-group-button">
                <clipboard-copy value="${str1 + mirror_url[clone_set[i]] + str2
          }" class="btn btn-sm"><svg class="octicon octicon-clippy" viewBox="0 0 16 16" version="1.1" width="16"
                    height="16" aria-hidden="true">
                    <path fill-rule="evenodd"
                      d="M5.75 1a.75.75 0 00-.75.75v3c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-3a.75.75 0 00-.75-.75h-4.5zm.75 3V2.5h3V4h-3zm-2.874-.467a.75.75 0 00-.752-1.298A1.75 1.75 0 002 3.75v9.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 13.25v-9.5a1.75 1.75 0 00-.874-1.515.75.75 0 10-.752 1.298.25.25 0 01.126.217v9.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-9.5a.25.25 0 01.126-.217z">
                    </path>
                  </svg></clipboard-copy>
              </div>
            </div>`;
      }

      //浏览列表
      for (let i in mirror_set) {
        info += `<a class="SelectMenu-item" href="${mirror_url[mirror_set[i]] + str3
          }" target="_blank" role="menuitemradio" aria-checked="false" rel="nofollow" title="${mirror_url[mirror_set[i]]}">
              <svg class="octicon octicon-check SelectMenu-icon SelectMenu-icon--check" viewBox="0 0 16 16"
                version="1.1" width="16" height="16" aria-hidden="true">
                <path fill-rule="evenodd"
                  d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z">
                </path>
              </svg>
              <span class="break-word">镜像浏览${i}</span>
            </a>`;
      }
      if (location.hostname != "github.com") {
        info += `<a class="SelectMenu-item" href="https://github.com${str3}" target="_blank" role="menuitemradio"
              aria-checked="false" rel="nofollow">
              <svg class="octicon octicon-check SelectMenu-icon SelectMenu-icon--check" viewBox="0 0 16 16"
                version="1.1" width="16" height="16" aria-hidden="true">
                <path fill-rule="evenodd"
                  d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z">
                </path>
              </svg>
              <span class="break-word">返回GitHub</span>
            </a>`;
      }

      info += `
          </div>
        </div>
        <div role="tabpanel" class="d-flex flex-column flex-auto overflow-auto" tabindex="0" hidden="">
          <div class="SelectMenu-list">
            `;

      //其他列表
      other_url.forEach((element) => {
        info += `<a class="SelectMenu-item" href="${element.url}" target="_blank" 
    title="${element.url}" role="menuitemradio" aria-checked="false"
              rel="nofollow">
              <span class="css-truncate css-truncate-overflow" style="text-align:center;">
                ${element.name}
              </span>
            </a>
            `;
      });
      info += `</div>
        </div>
      </tab-container>
    </div>
  </details-menu>
</details>`;
      $(this).append(info);
    });

  //Fast Download ZIP
  $("a[data-open-app='link']").each(function () {
    var span = $(`<li class="Box-row p-0"></li>`);
    var href = $(this).attr("href");
    var clone = $(this).clone().removeAttr("data-hydro-click data-hydro-click-hmac data-ga-click");
    clone.addClass("Box-row Box-row--hover-gray");
    for (const i in download_set) {
      if (download_set.hasOwnProperty(i)) {
        const element = download_set[i];
        var span1 = clone.clone();
        span1.attr({ "href": mirror_url[element] + href, "title": mirror_url[element] });
        span1.html(span1.html().replace("Download ZIP", `Fast Download ZIP${i}`))
        span = span.clone().append(span1)
      }
    }
    $(this).parent().after(span);
  });

  //Download Releases
  $(".Box--condensed").each(function () {
    $(this).find(".flex-items-center>a").each(function () {
      var href = $(this).attr("href");
      var span = "";
      if (!IsPC()) {
        span = `<div style="text-align: right;">` + DownloadHref(href) + `</div>`
      } else {
        span = `<small style="text-align: right;">` + DownloadHref(href) + `</small>`
      }
      $(this).next().append(span);
    });
    if (!IsPC()) {
      $(this).find(".d-flex").removeClass("d-flex");
    }
    $(this).find(".d-block.Box-body>a").each(function () {
      var href = $(this).attr("href");
      $(this).after(`<small style="text-align: right;">` + DownloadHref(href) + `</small>`);
      $(this).parent().addClass("d-flex  flex-justify-between");
    });
  });

  // Raw
  $("#raw-url").each(function () {
    var href = $(this).attr("href");
    var text = $(this).text()
    for (const i in raw_set) {
      if (raw_set.hasOwnProperty(i)) {
        const element = raw_set[i];
        var span = $(this).clone().removeAttr("id");
        span.attr({
          "href": mirror_url[element] + href,
          "title": mirror_url[element]
        })
        span.text(text + i)
        $(this).before(span);
      }
    }
  });

  function DownloadHref(href) {
    var span = "";
    for (let i in download_set) {
      span += `<a class="flex-1 btn btn-outline get-repo-btn" rel="nofollow"
      href="${mirror_url[download_set[i]] + href}" title="${mirror_url[download_set[i]]}">快速下载${i}</a>`;
    }
    return span;
  }

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
})();
