// ==UserScript==
// @icon https://github.githubassets.com/favicon.ico
// @name GitHub镜像加速访问、克隆和下载
// @namespace https://github.com/RC1844
// @author RC1844
// @license MIT License
// @description 镜像访问GitHub、加速克隆和下载；适配Github新UI；增加新克隆站点；前往项目Github仓库查看免费搭建Github镜像站点方法
// @include *://github.com/*
// @include *://github*
// @include *://hub.fastgit.org/*
// @require http://cdn.bootcss.com/jquery/1.8.3/jquery.min.js
// @version 1.4.3
// @grant GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  //=true为启用，=false为禁用
  var clone = true;
  // var clone = false;
  var depth = true;
  // var depth = false;

  var mirror_url = new Array();
  mirror_url[0] = 'https://' + 'github.com.cnpmjs.org';
  mirror_url[1] = 'https://' + 'hub.fastgit.org';
  mirror_url[2] = 'https://' + 'github.wuyanzheshui.workers.dev';
  mirror_url[3] = 'https://' + 'github.bajins.com';
  mirror_url[4] = 'https://' + 'download.fastgit.org';
  mirror_url[5] = 'https://' + 'github.rc1844.workers.dev';
  mirror_url[6] = 'https://' + 'gitclone.com/github.com';
  //添加对应索引即可使用
  var clone_set = [0, 1, 6];
  var mirror_set = [0, 1, 2, 3, 5];
  var download_set = [2, 4, 5];

  var str1 = '';
  if (clone) {
    str1 += "git clone ";
    if (depth) {
      str1 += "--depth=1 ";
    }
  }
  var loca = window.location.href;
  var a = loca.split("/");
  var str2 = '/' + a[3] + '/' + a[4] + '.git';
  var str3 = window.location.pathname;

  //镜像列表
  var info = `<details class="details-reset details-overlay mr-0 mb-0" id="mirror-menu">
  <summary class="btn  ml-2 btn-primary" data-hotkey="m" title="Switch branches or tags" aria-haspopup="menu"
    role="button">
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
              <input type="text" class="form-control input-monospace input-sm"
                value="${str1 + mirror_url[clone_set[i]] + str2}" readonly="" data-autoselect="">
              <div class="input-group-button">
                <clipboard-copy value="${str1 + mirror_url[clone_set[i]] + str2}" class="btn btn-sm"><svg
                    class="octicon octicon-clippy" viewBox="0 0 16 16" version="1.1" width="16" height="16"
                    aria-hidden="true">
                    <path fill-rule="evenodd"
                      d="M5.75 1a.75.75 0 00-.75.75v3c0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75v-3a.75.75 0 00-.75-.75h-4.5zm.75 3V2.5h3V4h-3zm-2.874-.467a.75.75 0 00-.752-1.298A1.75 1.75 0 002 3.75v9.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 13.25v-9.5a1.75 1.75 0 00-.874-1.515.75.75 0 10-.752 1.298.25.25 0 01.126.217v9.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-9.5a.25.25 0 01.126-.217z">
                    </path>
                  </svg></clipboard-copy>
              </div>
            </div>`;
  }

  //浏览列表
  for (let i in mirror_set) {
    info += `<a class="SelectMenu-item" href="${mirror_url[mirror_set[i]] + str3}" target="_blank"
              role="menuitemradio" aria-checked="false" rel="nofollow">
              <svg class="octicon octicon-check SelectMenu-icon SelectMenu-icon--check" viewBox="0 0 16 16"
                version="1.1" width="16" height="16" aria-hidden="true">
                <path fill-rule="evenodd"
                  d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z">
                </path>
              </svg>
              <span class="break-word">镜像浏览${i}</span>
            </a>`
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
            </a>`
  }

  info += `
          </div>
        </div>

        <div role="tabpanel" class="d-flex flex-column flex-auto overflow-auto" tabindex="0" hidden="">
          <div class="SelectMenu-list">
            <a class="SelectMenu-item" href="https://github.com/RC1844/FastGithub" target="_blank" role="menuitemradio"
              aria-checked="false" rel="nofollow">
              <span class="css-truncate css-truncate-overflow" style="text-align:center;">
                Github仓库地址，点个赞谢谢
              </span>
            </a>
            <a class="SelectMenu-item" href="https://greasyfork.org/zh-CN/scripts/397419" target="_blank"
              role="menuitemradio" aria-checked="false" rel="nofollow">
              <span class="css-truncate css-truncate-overflow" style="text-align:center;">
                GreasyFork地址，喜欢的可以收藏
              </span>
            </a>
            <a class="SelectMenu-item" href="https://minhaskamal.github.io/DownGit" target="_blank" role="menuitemradio"
              aria-checked="false" rel="nofollow">
              <span class="css-truncate css-truncate-overflow" style="text-align:center;">
                DownGit
              </span>
            </a>
            <a class="SelectMenu-item" href="https://d.serctl.com/" target="_blank" role="menuitemradio"
              aria-checked="false" rel="nofollow">
              <span class="css-truncate css-truncate-overflow" style="text-align:center;">
                GitHub内容下载站点：d.serctl.com
              </span>
            </a>
            <a class="SelectMenu-item" href="https://gh.isteed.cc/" target="_blank" role="menuitemradio"
              aria-checked="false" rel="nofollow">
              <span class="css-truncate css-truncate-overflow" style="text-align:center;">
                gh-proxy部署站点1
              </span>
            </a>
            <a class="SelectMenu-item" href="https://github.zsxwz.workers.dev/" target="_blank" role="menuitemradio"
              aria-checked="false" rel="nofollow">
              <span class="css-truncate css-truncate-overflow" style="text-align:center;">
                gh-proxy部署站点2
              </span>
            </a>
          </div>
        </div>

      </tab-container>
    </div>
  </details-menu>
</details>`;
  $('div.flex-auto.min-width-0.width-fit.mr-3').after(info);


  //Fast Download ZIP
  $('ul >li.Box-row.Box-row--hover-gray.p-0').each(function () {
    var span = `<li class="Box-row p-0">`;
    $(this).find("a[rel='nofollow']").each(function () {
      var href = $(this).attr('href');
      for (let i in download_set) {
        span += `<a class="d-flex flex-items-center text-gray-dark text-bold no-underline Box-row Box-row--hover-gray p-3"
    rel="nofollow" href="${mirror_url[download_set[i]] + href}">
    <svg class="octicon octicon-file-zip mr-3" viewBox="0 0 16 16" version="1.1" width="16" height="16"
      aria-hidden="true">
      <path fill-rule="evenodd"
        d="M3.5 1.75a.25.25 0 01.25-.25h3a.75.75 0 000 1.5h.5a.75.75 0 000-1.5h2.086a.25.25 0 01.177.073l2.914 2.914a.25.25 0 01.073.177v8.586a.25.25 0 01-.25.25h-.5a.75.75 0 000 1.5h.5A1.75 1.75 0 0014 13.25V4.664c0-.464-.184-.909-.513-1.237L10.573.513A1.75 1.75 0 009.336 0H3.75A1.75 1.75 0 002 1.75v11.5c0 .649.353 1.214.874 1.515a.75.75 0 10.752-1.298.25.25 0 01-.126-.217V1.75zM8.75 3a.75.75 0 000 1.5h.5a.75.75 0 000-1.5h-.5zM6 5.25a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5A.75.75 0 016 5.25zm2 1.5A.75.75 0 018.75 6h.5a.75.75 0 010 1.5h-.5A.75.75 0 018 6.75zm-1.25.75a.75.75 0 000 1.5h.5a.75.75 0 000-1.5h-.5zM8 9.75A.75.75 0 018.75 9h.5a.75.75 0 010 1.5h-.5A.75.75 0 018 9.75zm-.75.75a1.75 1.75 0 00-1.75 1.75v3c0 .414.336.75.75.75h2.5a.75.75 0 00.75-.75v-3a1.75 1.75 0 00-1.75-1.75h-.5zM7 12.25a.25.25 0 01.25-.25h.5a.25.25 0 01.25.25v2.25H7v-2.25z">
      </path>
    </svg>Fast Download ZIP${i}</a>`;
      }
    });
    span += `</li>`;
    $(this).after(span);
  });


  //Download Releases
  $('.release-main-section').each(function () {
    $(this).find('.d-flex.Box-body>a').each(function () {
      var href = $(this).attr('href');
      var span = `<div style="left: 65%;">`;
      for (let i in download_set) {
        span += `<a class="flex-1 btn btn-outline get-repo-btn" rel="nofollow"
    href="${mirror_url[download_set[i]] + href}">快速下载${i}</a>`;
      }
      span += `</div>`;
      $(this).after(span);
    });
  });
  $('.release-main-section').each(function () {
    $(this).find('.d-block.Box-body>a').each(function () {
      var href = $(this).attr('href');
      var span = ``;
      for (let i in download_set) {
        span += `<a class="flex-1 btn btn-outline get-repo-btn" rel="nofollow"
  href="${mirror_url[download_set[i]] + href}">快速下载${i}</a>`;
      }
      $(this).after(span);
    });
  });

})();