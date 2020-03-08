// ==UserScript==
// @icon            https://github.githubassets.com/favicon.ico
// @name            GitHub 镜像加速下载
// @namespace       https://github.com/RC1844
// @author          RC
// @description     加速GitHub克隆和下载
// @include           *://github.com/*
// @include           *://github*
// @require         http://cdn.bootcss.com/jquery/1.8.3/jquery.min.js
// @version         1.1.4
// @grant           GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  //=true为启用，=false为禁用
  var clone = true;
  // var clone = false;
  var depth = true;
  // var depth = false;

  var loca = window.location.href;
  var mirror_url1 = 'https://' + 'github.com.cnpmjs.org';
  var mirror_url2 = 'http://' + 'github-mirror.bugkiller.org';
  var mirror_url3 = 'https://' + 'github.wuyanzheshui.workers.dev';
  var str1 = '';

  if (clone) {
    str1 += "git clone ";
    if (depth) {
      str1 += "--depth=1 ";
    }
  }
  
  var a = loca.split("/");
  var str2 = '/' + a[3] + '/' + a[4] + '.git';
  var clone_utl1 = str1 + mirror_url1 + str2;
  var clone_utl2 = str1 + mirror_url2 + str2;
  var str3 = window.location.pathname;
  var web_url1 = mirror_url1 + str3;
  var web_url2 = mirror_url2 + str3;
  var web_url3 = mirror_url3 + str3;

  var info = `
  <details class="ment">
  <summary><b>镜像网站(点击显示)</b></summary>
  <div style="border:2px dashed ;">
      <center>
          <div>快速克隆1:<input type="text" data-autoselect="" value="${clone_utl1}" aria-label="将此存储库克隆到 ${clone_utl1}"
                  readonly="" style="width:400px"> &nbsp;快速浏览1:<a href="${web_url1}" id="down">跳转</a></div>
          <div>快速克隆2:<input type="text" data-autoselect="" value="${clone_utl2}" aria-label="将此存储库克隆到 ${clone_utl2}"
                  readonly="" style="width:400px"> &nbsp;快速浏览2:<a href="${web_url2}" id="down">跳转</a></div>
          <div><del>快速克隆3:</del><input type="text" data-autoselect="" value="clone、depth命令的插入可手动编辑代码关闭" aria-label="" readonly=""
                  style="width:400px"> &nbsp;快速浏览3:<a href="${web_url3}" id="down">跳转</a></div>
      </center>
  </div>
  </details>
  </br>
  `;

  $('.repository-content').prepend(info);
  $('.release-entry').each(function () {
    $(this).find('.Box-body>a').each(function () {
      var href = $(this).attr('href');
      var url1 = mirror_url2 + href;
      var url2 = mirror_url3 + href;
      var span1 = `<li><a href="${url1}" rel="nofollow"><span class="pl-2 flex-auto min-width-0 text-bold">快速下载1</span></a></li>`;
      var span2 = `<li><a href="${url2}" rel="nofollow"><span class="pl-2 flex-auto min-width-0 text-bold">快速下载2</span></a></li>`;

      $(this).after(span2);
      $(this).after(span1);
    });
  });
  $('.get-repo-modal-options').each(function () {
    $(this).find('.btn-block,.js-anon-download-zip-link').each(function () {
      var href = $(this).attr('href');
      var url1 = mirror_url3 + href;
      var span1 = `<a class="btn btn-outline get-repo-btn btn-block" rel="nofollow" href="${url1}">Fast Download ZIP</a>`;

      $(this).after(span1);
    });
  });
})();
