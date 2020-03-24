# FastGithub
快速跳转GitHub镜像网站的猴油脚本

本人并不会js，所以只能改别人的代码

该脚本在[GitHub 镜像加速下载-码酷博客-改](https://greasyfork.org/zh-CN/scripts/391911-github-%E9%95%9C%E5%83%8F%E5%8A%A0%E9%80%9F%E4%B8%8B%E8%BD%BD-%E7%A0%81%E9%85%B7%E5%8D%9A%E5%AE%A2-%E6%94%B9)基础上修改：

v1.2.1
1. 移除失效站点
2. 添加警告（迟来的警告，希望没人遭受损失）

v1.2.0
1. 修复Fast Download ZIP无法注入的bug
2. 修复取消一个无效的下载按钮
3. 增加克隆链接复制按钮
4. 增加浏览镜像站点返回GitHub的按钮
5. Html代码全面回炉重造，增加修饰，按钮对齐，体验更佳

v1.0-1.1.4
1. 更换两个GitHub克隆镜像站点
2. 改下载为跳转到镜像站点
3. 提供3个可浏览镜像站点
4. 增加ZIP镜像下载按钮
5. (原有)releases镜像下载按钮(releases Source code的快速下载1是没有加速效果的)
6. 在克隆地址处插入克隆命令，不需要的可以编辑代码禁用

下载安装地址：https://raw.githubusercontent.com/RC1844/FastGithub/master/FastGithub.js

### 已知的GitHub镜像
|域名|https|克隆加速|zip加速|releases加速|主机服务商|服务器所在地
|:---:|:----------:|:--------:|:---------:|:---------:|:---------:|:---------:|
|https://github.com.cnpmjs.org|✓|?✓|✗|✗|dnspod|香港
|~~http://github-mirror.bugkiller.org~~|✗|✓|✗|✓|?|日本
|https://github.wuyanzheshui.workers.dev|✓|✗|✓|✓|Cloudflare|美国

<figure class="half">
    <img src="REANDME\releases1.png" width="600">
    <img src="REANDME\releases2.png" width="600">
</figure>
<figure class="half">
    <img src="REANDME\releases3.png" width="600">
    <img src="REANDME\releases4.png" width="600">
</figure>

