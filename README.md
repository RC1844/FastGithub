# FastGithub

快速跳转 GitHub 镜像网站的猴油脚本

可以生成加速克隆命令和加速链接按钮

## 请不要在镜像网站登录账号，若因此造成任何损失本人概不负责

本人并不会 js，所以只能改别人的代码

该脚本在[GitHub 镜像加速下载-码酷博客-改](https://greasyfork.org/zh-CN/scripts/391911)基础上修改：

## [[预览效果]](REANDME/README.md)

下载安装地址：

<https://raw.githubusercontent.com/RC1844/FastGithub/master/FastGithub.js>

<https://raw.fastgit.org/RC1844/FastGithub/master/FastGithub.js>(无法下载安装的请使用该链接)

或：从[Greasyfork](https://greasyfork.org/zh-CN/scripts/397419)安装

## 已知的 GitHub 镜像(含失效站点)

|                   域名                    | https | 克隆加速 | zip 加速 | releases 加速 | 主机服务商 | 服务器所在地 |
| :---------------------------------------: | :---: | :------: | :------: | :-----------: | :--------: | :----------: |
|      <https://github.com.cnpmjs.org>      |   ✓   |    ✓     |    ✗     |       ✗       |   dnspod   |     香港     |
| ~~<http://github-mirror.bugkiller.org>~~  |   ✗   |    ✓     |    ✗     |       ✓       |     ?      |     日本     |
| <https://github.wuyanzheshui.workers.dev> |   ✓   |    ✗     |    ✓     |       ✓       | Cloudflare |     美国     |
|        <https://github.bajins.com>        |   ✓   |    ✗     |    ?     |       ?       | Cloudflare |     美国     |
|         <https://doc.fastgit.org>         |   ✓   |    ✓     |    ✓     |       ✓       |  fastgit   |     香港     |
|          <https://gitclone.com>           |   ✓   |    ✓     |    ✗     |       ✗       |   Aliyun   |     杭州     |
|  <https://github-speedup.laiczhang.com>   |   ✓   |    ✓     |    ✓     |       ✓       | Quadranet  |     美国     |

## 使用 Cloudflare 搭建 Github 镜像(实为代理)

[基础教程](https://github.com/EtherDream/jsproxy/tree/master/cf-worker)

只需要将[基础教程](https://github.com/EtherDream/jsproxy/tree/master/cf-worker)中[index.js](https://raw.githubusercontent.com/EtherDream/jsproxy/master/cf-worker/index.js)的代码：

```js
const ASSET_URL = "https://etherdream.github.io/jsproxy";
```

改为

```js
const ASSET_URL = "https://github.com";
```

即可

## 相关网站、仓库

[GitClone](https://gitclone.com/)

[gh-proxy](https://github.com/hunshcn/gh-proxy)

[Fast Git](https://fastgit.org/)

[jsproxy](https://github.com/EtherDream/jsproxy)

[zmirror](https://github.com/aploium/zmirror)

## 更新日志

v1.5.0

1. 增加对 Raw 按钮的镜像
2. 缩减 HTML 代码，使用 js 拷贝
3. 更换镜像网站按钮的插入位置
4. 调整插入次序，速度快的在先

v1.4.5-v1.4.7

1. releases 页按钮终于对齐了，手机浏览更舒服
2. 增加多个中转站点(由[@smileat2000](https://github.com/smileat2000)于[issues#5](https://github.com/RC1844/FastGithub/issues/5)提供)，增加一个全能站点
3. 链接增加 title 属性，提示提供服务站点
4. 缩减代码
5. 修复手机端 releases 页面，部分插入失败问题

v1.4.0-1.4.3

1. 更换插入位置
2. releases 页改为相对布局，不再为对齐而使用绝对布局
3. 弹出页面再改版，支持手机浏览
4. 适配 Github 新 UI 样式
5. 修复插入失效
6. 增加一个克隆站点，增加一些代下载站点

v1.3.1

1. 取消新提供的下载站点
2. 增加自建站点<https://github.rc1844.workers.dev> ，与<https://github.wuyanzheshui.workers.dev> 相同
3. 自建方法请看下方

v1.3.0

1. 增加一个镜像浏览站点和一个下载站点(这是一个演示服务器，不可滥用，需手动开启)
2. 修复插入失效
3. 代码大改：修改生成插入的 HTML 代码的生成方式，方便以后增减站点

v1.2.1-1.2.4

1. 移除失效站点
2. 添加警告（迟来的警告，希望没人遭受损失）
3. 修复 release tag 页无法注入问题
4. 修饰警告信息的显示
5. 增加一组镜像站点，感谢[@KevinZonda](https://github.com/KevinZonda)提供的信息，具体请看[issues#1](https://github.com/RC1844/FastGithub/issues/1)

v1.2.0

1. 修复 Fast Download ZIP 无法注入的 bug
2. 修复取消一个无效的下载按钮
3. 增加克隆链接复制按钮
4. 增加浏览镜像站点返回 GitHub 的按钮
5. Html 代码全面回炉重造，增加修饰，按钮对齐，体验更佳

v1.0-1.1.4

1. 更换两个 GitHub 克隆镜像站点
2. 改下载为跳转到镜像站点
3. 提供 3 个可浏览镜像站点
4. 增加 ZIP 镜像下载按钮
5. (原有)releases 镜像下载按钮(releases Source code 的快速下载 1 是没有加速效果的)
6. 在克隆地址处插入克隆命令，不需要的可以编辑代码禁用
