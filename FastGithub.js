// ==UserScript==
// @icon            https://github.githubassets.com/favicon.ico
// @name            GitHub 镜像加速下载
// @namespace       https://github.com/RC1844
// @author          RC1844
// @license         MIT License
// @description     加速GitHub克隆和下载
// @include         *://github.com/*
// @include         *://github*
// @require         http://cdn.bootcss.com/jquery/1.8.3/jquery.min.js
// @version         1.2.1
// @grant           GM_addStyle
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
  // mirror_url[1] = 'http://' + 'github-mirror.bugkiller.org';
  mirror_url[1] = 'https://' + 'github.wuyanzheshui.workers.dev';

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

  var clone_url = new Array();
  var web_url = new Array();
  for (let i = 0; i < mirror_url.length; i++) {
    clone_url[i] = str1 + mirror_url[i] + str2;
    web_url[i] = mirror_url[i] + str3;
  }

  //镜像列表
  var info = `<details class="details-reset details-overlay branch-select-menu ">
  <summary class="btn btn-sm btn-primary" title="镜像列表" aria-haspopup="menu" role="button">
      <b>镜像网站</b>
      <span class="dropdown-caret"></span>
  </summary>
  <details-menu class="SelectMenu">
      <div style="width:500px;margin: 4px 0 16px;font-size: 12px; pointer-events: auto;border: 1px solid #d1d5da;position: absolute;top: 100%;left: 0;z-index: 100;padding-top: 4px;padding-bottom: 4px;background-color: #fff;background-clip: padding-box;border-radius: 4px;box-shadow: 0 1px 5px rgba(27,31,35,.15);">
          <header style="flex: none;padding: 16px; padding-top: 8px;padding-bottom: 8px;">
          <div class=" btn-block"
              style="padding: 4px;border: 1px solid #d1d5da;background-color: #fff3cd;border-top-left-radius: 3px;border-top-right-radius: 3px;"
              role="alert">clone、depth命令的插入可手动编辑代码关闭</div>
              <div class=" btn-block"
              style="padding: 4px;border: 1px solid #d1d5da;background-color: #fff3cd;border-top-left-radius: 3px;border-top-right-radius: 3px;"
              role="alert">请不要在镜像网站登录账号，若因此造成任何损失本人概不负责</div>`;

  for (let i = 0; i < clone_url.length - 1; i++) {
    info += `<div class="input-group">
    <input type="text" class="form-control input-monospace input-sm"
        value="${clone_url[i]}" data-autoselect="" readonly="">
    <div class="input-group-button">
        <clipboard-copy value="${clone_url[i]}" class="btn btn-sm">
            <svg class="octicon octicon-clippy" viewBox="0 0 14 16" version="1.1" width="14" height="16" aria-hidden="true">
                <path fill-rule="evenodd"
                    d="M2 13h4v1H2v-1zm5-6H2v1h5V7zm2 3V8l-3 3 3 3v-2h5v-2H9zM4.5 9H2v1h2.5V9zM2 12h2.5v-1H2v1zm9 1h1v2c-.02.28-.11.52-.3.7-.19.18-.42.28-.7.3H1c-.55 0-1-.45-1-1V4c0-.55.45-1 1-1h3c0-1.11.89-2 2-2 1.11 0 2 .89 2 2h3c.55 0 1 .45 1 1v5h-1V6H1v9h10v-2zM2 5h8c0-.55-.45-1-1-1H8c-.55 0-1-.45-1-1s-.45-1-1-1-1 .45-1 1-.45 1-1 1H3c-.55 0-1 .45-1 1z">
                </path>
            </svg>
        </clipboard-copy>
    </div>
</div>`;
  }

  info += `<div class="mt-2 d-flex">`;
  for (let i = 0; i < web_url.length; i++) {
    info += `<a class="flex-1 btn btn-outline get-repo-btn btn-block" rel="nofollow"
  href="${web_url[i]}">镜像浏览${i}</a>`;
  }
  if (location.hostname != "github.com") {
    info += `<a class="flex-1 btn btn-outline get-repo-btn btn-block" rel="nofollow"
  href="https://github.com${str3}">返回GitHub</a>`
  }
  info += `</div></header></div></details-menu></details>`;

  $('.repository-content').prepend(info);


  //Fast Download ZIP
  $('.get-repo-modal-options').each(function () {
    $(this).find("a[rel='nofollow']").each(function () {
      var href = $(this).attr('href');
      var url1 = mirror_url[1] + href;
      var span1 = `<a class="flex-1 btn btn-outline get-repo-btn btn-block" rel="nofollow" href="${url1}">Fast Download ZIP</a>`;

      $('.get-repo-modal-options').after(span1);
    });
  });


  //Download Releases
  $('.release-entry').each(function () {
    $(this).find('.d-flex.Box-body>a').each(function () {
      var href = $(this).attr('href');
      var span = `<div style=" position: absolute;left: 65%;">`;
      for (let i = 1; i < mirror_url.length; i++) {
        span += `<a class="flex-1 btn btn-outline get-repo-btn" rel="nofollow" href="${mirror_url[i] + href}">快速下载${i}</a>`;
      }
      span += `</div>`

      $(this).after(span);
    });
  });
  $('.release-entry').each(function () {
    $(this).find('.d-block.Box-body>a').each(function () {
      var href = $(this).attr('href');
      var span = `<a class="btn btn-outline get-repo-btn" rel="nofollow" href="${mirror_url[1] + href}">快速下载</a>`;

      $(this).after(span);
    });
  });

})();
