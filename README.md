# FastGithub
快速跳转GitHub镜像网站的猴油脚本

本人并不会js，所以只能改别人的代码

该脚本在[GitHub 镜像加速下载-码酷博客-改](https://greasyfork.org/zh-CN/scripts/391911-github-%E9%95%9C%E5%83%8F%E5%8A%A0%E9%80%9F%E4%B8%8B%E8%BD%BD-%E7%A0%81%E9%85%B7%E5%8D%9A%E5%AE%A2-%E6%94%B9)基础上修改：
1. 更换两个GitHub克隆镜像站点
2. 改下载为跳转到镜像站点
3. 提供3个可浏览镜像站点
4. 增加ZIP镜像下载按钮
5. （原有）releases镜像下载按钮($\color{red}{releases Source code的快速下载1是没有加速效果的}$)

下载安装地址：https://raw.githubusercontent.com/RC1844/FastGithub/master/FastGithub.js

<figure class="half">
    <img src="REANDME\releases1.png" width="600">
    <img src="REANDME\releases2.png" width="600">
</figure>

### 已知的GitHub镜像
|域名|https|克隆加速|zip加速|releases加速
|:---:|:----------:|:--------:|:---------:|:---------:|
|https://github.com.cnpmjs.org|✓|?✓|✗|✗
|http://github-mirror.bugkiller.org|✗|✓|✗|✓
|https://github.wuyanzheshui.workers.dev|✓|✗|✓|✓
