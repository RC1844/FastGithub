# FastGithub

快速跳转 GitHub 镜像网站的猴油脚本

可以生成加速克隆命令和加速链接按钮

## 请不要在镜像网站登录账号，若因此造成任何损失本人概不负责

该脚本在[GitHub 镜像加速下载-码酷博客-改](https://greasyfork.org/zh-CN/scripts/391911)基础上修改(已经面目全非了)。

> **v3.0.0 起完全移除自定义 CSS**，复用 GitHub Primer 原生样式类（`.btn` / `.Box` / `.form-select` / `.Label` / `.UnderlineNav-octicon-btn` / `.Link` 等），零视觉割裂感；`CONFIG` 配置迁移到 `GM_registerMenuCommand`（Tampermonkey 脚本菜单）切换。
>
> **v2.0.0 起脚本已完全重写为纯原生 JS（零依赖、无 jQuery）**，适配 2025+ 新版 GitHub 页面（`ul[data-testid="repo-header-actions"]`、`a[data-testid="raw-button"]`、Blob 页 Raw 按钮的 `prc-ButtonGroup` 嵌套等）。同时移除了所有已死亡的镜像站点（fastgit/cnpmjs/bajins/wuyanzheshui/rc1844 worker 等），只保留实测可用的入口。

## [[预览效果]](REANDME/README.md)

下载安装地址：

<https://raw.githubusercontent.com/RC1844/FastGithub/master/FastGithub.js>

或：从[Greasyfork](https://greasyfork.org/zh-CN/scripts/397419)安装

## 已知的 GitHub 镜像(含失效站点)

|                    域名                    | https | 克隆加速 | zip 加速 | releases 加速 | 主机服务商 | 服务器所在地 |
| :----------------------------------------: | :---: | :------: | :------: | :-----------: | :--------: | :----------: |
|      <https://github.com.cnpmjs.org>       |   ✓   |    ✓     |    ✗     |       ✗       |   dnspod   |     香港     |
|  ~~<http://github-mirror.bugkiller.org>~~  |   ✗   |    ✓     |    ✗     |       ✓       |     ?      |     日本     |
| <https://github.wuyanzheshui.workers.dev>  |   ✓   |    ✗     |    ✓     |       ✓       | Cloudflare |     美国     |
|        <https://github.bajins.com>         |   ✓   |    ✗     |    ?     |       ?       | Cloudflare |     美国     |
|         <https://doc.fastgit.org>          |   ✓   |    ✓     |    ✓     |       ✓       |  fastgit   |     香港     |
|           <https://gitclone.com>           |   ✓   |    ✓     |    ✗     |       ✗       |   Aliyun   |     杭州     |
| ~~<https://github-speedup.laiczhang.com>~~ |   ✓   |    ✓     |    ✓     |       ✓       | Quadranet  |     美国     |
|          <https://eo.gh-proxy.cn>          |   ✓   |    ✓     |    ✓     |       ✓       | 腾讯云EdgeOne |   边缘节点   |
|          <https://z1.gh-proxy.cn>          |   ✓   |    ✓     |    ✓     |       ✓       |   EdgeOne  |   边缘节点   |
|          <https://z3.gh-proxy.cn>          |   ✓   |    ✓     |    ✓     |       ✓       |   EdgeOne  |   边缘节点   |
|          <https://cf.gh-proxy.cn>          |   ✓   |    ✓     |    ✓     |       ✓       | Cloudflare |   优选节点   |
|         ~~<https://z2.gh-proxy.cn>~~       |   ✓   |    ✓     |    ✓     |       ✓       |   EdgeOne  | 423锁定，暂不可用 |

> gh-proxy.cn 系列入口路径规则为 `https://<入口域名>/github/<完整 GitHub 链接>`，只加速文件（clone、raw、release、archive，支持断点续传），不代理 GitHub 网页；实时延迟与节点状态见 <https://www.gh-proxy.cn/nodes>。

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

[gh-proxy.cn GitHub 加速](https://www.gh-proxy.cn/github/)（[节点状态](https://www.gh-proxy.cn/nodes)）

[Fast Git](https://fastgit.org/)

[jsproxy](https://github.com/EtherDream/jsproxy)

[zmirror](https://github.com/aploium/zmirror)

## 更新日志

v3.1.0

1. **扩充公益镜像池**：从 [bdnb.cn](https://m.bdnb.cn/search?q=github&sort=stars&page=1) 聚合的 GitHub 加速脚本中整理出一批「前缀 + 完整 GitHub URL」格式兼容的公益加速源，并对每个域名做过连通性实测后收录，`MirrorUrl` 由 8 个扩充至 30 个
2. 新增镜像：gh.llkk.cc、hub.ddayh.com、gh.con.sh、fastgit.cc、git.yylx.win、ghproxy.monkeyray.net、tvv.tw、ghproxy.it、gh.monlor.com、wget.la、hk.gh-proxy.org、cdn.gh-proxy.org、edgeone.gh-proxy.org、github.moeyy.xyz、gh.ddlc.top、github.boki.moe、ghfile.geekertao.top、ghp.keleyaa.com、gh.chjina.com、ghpxy.hwinzniej.top、cdn.crashmc.com、gh.idayer.com（均支持 clone/raw/zip/releases，克隆/下载/Raw 三组下拉框统一收录）
3. 实测未通过（连接超时/403/404/格式不兼容）的候选源未收录，包括 github.akams.cn、gh.h233.eu.org、github.geekery.cn、github.ednovas.xyz、gh.zwy.one、ghproxy.053000.xyz、g.blfrp.cn 等
4. 「其他」菜单新增 gh-proxy.org、fastgit.cc、wget.la、github.moeyy.xyz 入口
5. 版本号升至 3.1.0

v3.0.0

1. **动态探测 GitHub Primer React CSS Modules**：GitHub 2025+ 前端使用哈希类名（`.prc-Button-ButtonBase-9n-Xk`、`.ActionMenu_Button__Q94vxS` 等）而非旧版 `.btn` / `.Box`。脚本启动时从原生 DOM 自动探测当前版本的哈希类名和 computedStyle（按钮 bg/border/radius/padding/fontSize/fontFamily 等），构造注入 UI 时精确复用，**computedStyle 全部 10 项属性与原生按钮 100% 匹配**。GitHub 重新构建前端时哈希变了，脚本自动适配
2. **仿照 `data-component="Button"` / `data-component="ActionMenu.Button"` 结构**：注入按钮完整克隆 GitHub 原生 DOM 结构（`data-component` 属性 + `data-size="small"/"medium"` + `data-variant="default"/"invisible"` + 内部 `buttonContent` / `leadingVisual` / `text` 层级），而不是硬编码旧版 Primer CSS 类名
3. **`<select>` 下拉框用 Primer 主题 Token 精确模拟**：GitHub 无原生 select 组件，用 `--color-canvas-default` / `--color-border-default` / `--color-fg-default` 等 CSS 变量 + 自定义 SVG chevron 背景图精确匹配原生风格
4. **配置迁移到 `GM_registerMenuCommand`**：面板内原「设置」页签已移除，`cloneCmd`（克隆命令前缀 git clone）和 `depth`（克隆命令前缀 --depth=1）两项开关注册到 Tampermonkey 脚本菜单，点击切换即时通过 `GM_setValue` 持久化
5. **`@grant` 新增 `GM_registerMenuCommand`**，内部用 `typeof GM_registerMenuCommand !== "function"` 做防护
6. **主菜单 fallback 插入点补全**：依次尝试仓库首页 `repo-header-actions` → `repo-visibility-label` 旁 → Blob 页 `react-blob-header` → 面包屑 → 通用 `#repo-content-pjax-container`，所有 repo 子页面均能正确注入
7. **启动阶段多次重试 + Turbo 切换时重新探测**：`scan()` 基础上 500ms × 8 次延迟重试；`turbo:load` / `turbo:render` / `pushState` / `replaceState` 时自动重新 `detectGitHubStyle()` 以适配 SPA 导航
8. **版本号升至 3.0.0**

v2.1.0

1. 横向列表（ZIP 归档下载、Code 面板 ZIP、Releases 资产、Raw 按钮）全部改为下拉选择框，选中即在新窗口打开下载，界面更简洁
2. CONFIG 配置（`cloneCmd` / `depth`）改为通过 `GM_setValue` / `GM_getValue` 持久化，并在菜单新增「设置」页签提供勾选框，改动实时保存、即时生效
3. `@grant` 由 `none` 改为 `GM_setValue` + `GM_getValue`（仅使用 Greasemonkey 标准 API，无其他依赖）

v2.0.0

1. 全面重写为纯原生 JS，移除 jQuery 依赖，体积更小、无外部依赖
2. 适配 2025+ 新版 GitHub 页面：仓库页 header 由 `ul.pagehead-actions` 迁移为 `ul[data-testid="repo-header-actions"]`，Blob 页 Raw 按钮改为 `a[data-testid="raw-button"]`（嵌套 `prc-ButtonGroup` 包裹层），克隆面板结构同步更新
3. 移除全部已死亡镜像站点（fastgit/cnpmjs/bajins/wuyanzheshui/rc1844 worker/cors.zme.ink/ghproxy.com 旧域名等），仅保留实测可用的 gh-proxy.cn（eo/z1/z3/cf）、gh-proxy.com、ghproxy.net、ghfast.top、gitclone.com
4. 修复镜像 URL 拼接：统一通过 `relPath()` 归一化 `/owner/repo/...` 相对路径，杜绝 `.../github.com/https://github.com/...` 之类错误拼接
5. 修复菜单重复累积：菜单稳定引用 `menuLi` 只创建一次，`augmentCodePanel` 在脱机副本上构建 ZIP 链接不再深拷贝菜单子树，配合 CSS 兄弟选择器 + 周期性物理去重，视觉与 DOM 均保持唯一
6. 按「能力」拆分站点集合（CloneSet/DownloadSet/RawSet），避免把不支持下载的站点放进下载列表；gh-proxy.cn 只加速文件不代理网页，故未加入镜像浏览
7. 「其他」菜单新增 gh-proxy.cn 官方站与节点状态页

v1.6.7

1. 新增 [gh-proxy.cn](https://www.gh-proxy.cn/github/) 的 4 个可用加速入口：eo（官方推荐，腾讯云 EdgeOne）、z1、z3（EdgeOne）、cf（Cloudflare 优选），均支持 clone、raw、zip、releases 加速与断点续传，并置于克隆/下载/Raw 列表首位
2. z2 节点（<https://z2.gh-proxy.cn>）当前返回 423 锁定，暂未启用，恢复后可手动取消注释并把索引 21 加入对应 Set
3. gh-proxy.cn 只加速文件不代理网页，故未加入镜像浏览（MirrorSet）
4. 「其他」菜单新增 gh-proxy.cn 官方站与节点状态页

v1.6.3

1. 更新提示，增加其他站点

v1.6.2

1. 修复菜单按钮插入

v1.6.0

1. 修复上一版本写的 bug，菜单无法滚动问题

v1.5.9

1. 增加 releases 页下载按钮的样式(好认一点)
2. 修复菜单双滚动条问题
3. laiczhang 站点似乎已失效，现禁用，你可以手动编辑 xxxSet 添加

v1.5.8

1. 修复 commits 页 bug

v1.5.7

1. 修复 GitHub 网页变更产生的 bug
2. 解决困扰已久的 releases 页样式对齐问题
3. 增加一个 cf 站点(由[@Ecalose](https://github.com/Ecalose)提供；增加一些代下站点

v1.5.5

1. 增加站点 IAPK 工具箱:<https://iapk.cc/github>,该站点由[酷友@QZrom 玩机](http://www.coolapk.com/u/2889405)提供，可使用镜像浏览与文件下载。

v1.5.3-v1.5.4

1. 所有按钮改为镜像站点的名字，部分有描述提示
2. 效率性能进一步下降
3. 增加站点:<https://cdn.staticaly.com>
4. 为手机端增加一些修饰，让网页更美观
5. 修复部分 Raw 按钮失效问题
6. 更换 addRawList()函数的结构
7. 完善提示信息

v1.5.2

1. 从隔壁（Github 增强 - 高速下载）偷师使用\$(document).on(）; 方法
2. 由于上一点，所以代码结构又大改

v1.5.1

1. 增加站点 jsDelivr，更换自有站点域名(租期 1 年，不知道有没有加成)
2. 为了添加 jsDelivr 而添加函数拖慢性能
3. jsDelivr 支持度很差，将就用吧

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
2. 增加自建站点:<https://github.rc1844.workers.dev> ，与<https://github.wuyanzheshui.workers.dev> 相同
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
