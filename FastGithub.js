// ==UserScript==
// @icon            https://github.githubassets.com/favicon.ico
// @name            GitHub 镜像加速下载-码酷博客-改改
// @namespace       https://github.com/FireSoil
// @author          wzz
// @description     加速GitHub克隆和下载
// @match           *://github.com/*
// @require         http://cdn.bootcss.com/jquery/1.8.3/jquery.min.js
// @version         1.0.4
// @grant           GM_addStyle
// ==/UserScript==

(function () {
 'use strict';
 var loca =  window.location.href+'.git';
 var mirror_url1 = 'https://'+'github-mirror.bugkiller.org';
 var mirror_url2 = 'https://'+'github.com.cnpmjs.org';
 var a = loca.split("/");
 var str1='/'+a[3]+'/'+a[4];
 var clone_utl1 = mirror_url1 + str1;
 var clone_utl2 =  mirror_url2 + str1;
 var qc = a[4].split(".")
 var str2='/'+a[3]+'/'+qc[0];
 var web_url1 =mirror_url1+str2;
 var web_url2 =mirror_url2+str2;
  //$('.mt-2').append('快速克隆通道:<input value="'+str1+'">')

 var info = `
    <details class="ment">
      <summary><b>镜像网站(点击显示)</b></summary>
      <div style="height:100px;border:2px dashed ;">
       <center>
       <div>快速克隆通道1：<input style="width:300px;height:30px" value="${clone_utl1}"> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;快速浏览下载通道1：<a href="${web_url1}" id="down">点我下载</div></a>
      快速克隆通道2：<input style="width:300px;height:30px" value="${clone_utl2}"> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;快速浏览下载通道2：<a href="${web_url2}" id="down">点我下载</div></a></div>
       </div>
      </center>
    </div>
</details>
</br>
 `;
 
  $('.repository-content').prepend(info);
  $('.release-entry').each(function(){
      $(this).find('.Box-body>a').each(function(){
          var href = $(this).attr('href');
          var url1 = mirror_url1+href;
          var url2 = mirror_url2+href;
          var span1 = `&nbsp;<a href="${url1}"><span class="text-bold">快速下载通道1</span></a>`;
          var span2 = `&nbsp;<a href="${url2}"><span class="text-bold">快速下载通道2</span></a>`;

          $(this).after(span2);
          $(this).after(span1);
      });
  });
})();
