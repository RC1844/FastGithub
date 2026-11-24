# GitHub 镜像加速助手

一个单文件、零依赖的 Tampermonkey 用户脚本：在 GitHub 页面上提供镜像浏览、Clone、Raw、Release / Archive 下载、ZIP 快照、Actions 制品下载等加速能力，并附带一个可自建的 Cloudflare Worker 镜像。

- 脚本版本：`1.10.0`
- 适用页面：`https://github.com/*`、`https://gist.github.com/*`
- 运行时：Tampermonkey（推荐）/ Violentmonkey
- 许可：MIT

## 功能特性

| 能力 | 说明 |
| --- | --- |
| 镜像浏览 | 一键在 kkgithub、bgithub 等全站镜像中打开当前页面（仅建议公开页面） |
| 镜像 Clone | 生成并复制走镜像的 `git clone` 命令，自动带上当前浏览的分支 / Tag / commit，克隆后把 `origin` 还原为官方仓库（可在设置中关闭），支持 `--depth` 浅克隆与 `insteadOf` 全局配置 |
| 镜像 Raw | 文件页一键打开 / 下载 Raw 文件，自动挑选可用线路 |
| Release / Archive 下载 | 自动改写下载链接，多线路按健康度与延迟排序重试，失败自动切换 |
| ZIP 快照 | 支持当前**分支 / 标签 / 提交（commit SHA）**，不再只能下载 HEAD |
| 资产批量下载 | 复制或批量下载当前 Release 的全部资产 |
| Actions 制品 | 下载运行产物的 Artifacts / 日志，支持浏览器登录态或 Personal Access Token |
| Gist 支持 | Gist 页面的 Raw 与 ZIP 同样可用 |
| 多线路管理 | 90+ 内置线路，可测速、置顶、禁用；自定义线路同样参与测速排序与线路管理 |
| 自定义线路 | 可添加多条，支持代理前缀 / 全站镜像 / URL 模板 / API 加速，并可独立开关 Raw、下载、Clone、API 能力 |
| 自定义 API | 在自定义线路中添加「API 加速」类型，即可在设置中选用，无需再单独填写地址 |
| 自动降级 | 定时巡检线路健康度，异常时自动切换并在面板提示 |
| 静态资源 CDN | 可选把头像 / 图片改走 `wsrv.nl` |
| API 加速 | 可选把页面发出的 `api.github.com` GET/HEAD 请求转发到 API 镜像 |
| 浮动按钮 | 可自由拖动、松手自动贴左 / 右边缘，面板跟随按钮定位并始终置顶 |
| 诊断与配置 | 一键生成诊断报告；配置导入 / 导出（Token 与按钮位置保留在本机） |

## 安装

1. 安装浏览器扩展 [Tampermonkey](https://www.tampermonkey.net/)（或 Violentmonkey）。
2. 新建脚本，把 [`github-mirror-accelerator.user.js`](./github-mirror-accelerator.user.js) 的全部内容粘贴进去并保存；也可以直接把 `.user.js` 文件拖到浏览器中按提示安装。
3. 打开任意 GitHub 页面，页面右上角出现圆形「镜像」按钮即安装成功。

脚本使用 `@run-at document-start`，并只在顶层窗口运行（`@noframes`）。

## 使用方法

### 浮动按钮

- **单击**：打开 / 关闭面板（快捷键默认 `Alt + M`，可在设置中修改）。
- **拖动**：按住按钮拖到任意位置，松手后自动吸附到最近的左 / 右边缘，位置会被记住。
- **面板**：自动贴在按钮内侧并跟随按钮移动，纵向与按钮对齐；内容过高时会在视口内滚动，展开「线路管理」也不会超出屏幕。

### 面板：操作

| 按钮 | 作用 |
| --- | --- |
| 镜像浏览 | 用全站镜像打开当前页面 |
| 复制 Clone | 复制当前仓库的镜像 Clone 命令（自动带分支 / 提交、还原 origin，可配置浅克隆深度） |
| 镜像 Raw | 在文件页通过镜像打开 Raw |
| 下载 ZIP | 下载当前分支 / 标签 / 提交的 ZIP 快照 |
| 复制直链 | 复制当前页面对应的镜像直链 |
| 下载文件 | 通过镜像下载当前文件 |
| 复制资产 / 下载资产 | 处理 Release 页面上的全部资产 |
| 复制 gh 命令 | 复制 `gh run download` 命令 |
| 下载 Artifacts / 下载日志 | 下载当前 Actions 运行的产物或日志 |

### 面板：线路

- **镜像线路**：主线路，用于浏览、Clone 与默认下载。
- **分用途线路**：Raw / Release+Archive / Clone 可分别设为 `auto` 或指定线路。
- **Clone 节点**：Clone 列表只显示支持 `git clone`（Git Smart HTTP）的线路，分为「Clone 专用节点」「支持 Clone 的代理」「全站镜像」三组；ghproxy.net、ghfast.top、gh-proxy.com、gh-proxy.org 系列等实测可用。选择 `auto` 时，如果主线路不支持 Clone（例如 jsDelivr、仅 Raw 模板），会自动改用可用的 Clone 节点。
- **线路管理（禁用 / 置顶）**：展开后可查看全部内置与自定义线路、查看健康状态与测速结果，并单独禁用或置顶。

### 面板：设置

| 设置 | 默认 | 说明 |
| --- | --- | --- |
| 启用脚本 | 开 | 关闭后恢复页面原始链接与图片 |
| 自动改写下载 | 开 | 自动把 Release / Archive 链接改写成镜像地址 |
| 线路失败自动切换 | 开 | 结合健康检查在失败时换线路 |
| Code 面板快捷按钮 | 开 | 在仓库文件导航栏注入「镜像 Clone / 下载 ZIP / Raw / 镜像站」按钮 |
| 文件页 Raw 镜像按钮 | 开 | 在文件页注入 Raw 镜像入口 |
| Clone 后还原官方仓库连接 | 开 | 关闭后 Clone 命令不再追加 `git remote set-url origin`，保留镜像地址 |
| 静态资源 CDN | 关 | 头像 / 图片改走 `wsrv.nl` |
| API 加速 | 关 | 可选 `api.kkgithub.com`，或自定义线路中类型为「API 加速」的线路；只改写 GET / HEAD，且跳过带 `Authorization` 的请求 |
| Actions Token | 空 | 私有仓库或未登录时必须填写；Token 只发往 `api.github.com`（或自定义 API 线路） |
| 自定义线路 | 空 | 可添加多条，每条独立选择代理前缀 / 全站镜像 / URL 模板 / API 加速，并单独开关 Raw、下载、Clone、API |
| 快捷键 | `Alt + M` | 打开 / 关闭面板 |

#### 自定义线路

在「设置」页的「自定义线路」区域可以添加多条线路，每条独立配置名称、类型、地址与能力开关：

- `代理前缀`：`https://你的前缀/` + 原始 GitHub 地址；勾选「Clone」后可用于 `git clone`
- `全站镜像`：`https://镜像站`
- `URL 模板`：可用变量 `{url}` `{rawUrl}` `{cloneUrl}` `{owner}` `{repo}` `{ref}` `{path}` `{refPath}` `{host}`（`{cloneUrl}` 仅用于 Clone）
- `API 加速`：填写 API 镜像地址（如 `https://api.example.com/`），保存后可在设置页的「API 加速」中选择
- 每条线路可单独开关 `Raw`、`下载`、`Clone`、`API` 能力；模板线路的能力由模板变量自动推导，API 线路固定只用于 API
- 自定义代理 / 全站镜像会与内置线路一起参与测速排序，并显示在「线路」页的「线路管理」中，可置顶或禁用
- 「线路名称」可选；留空时在下拉框中显示为「自定义线路 1 / 2…」
- 每条线路以卡片展示，左侧序号对应线路顺序，底部会提示类型或地址状态（未填写地址、格式错误等）
- 私人部署的 Worker（如 `https://gh.example.com/`）请填在这里，不要写进脚本内置线路表

### 脚本菜单

在 Tampermonkey 的脚本菜单中还可以：

- 打开 / 关闭镜像面板
- 切换镜像线路
- 镜像测速并选择最快
- 检测线路可用性
- 在 API 镜像中查看当前仓库
- 启用 / 禁用脚本
- 重置所有设置

## 内置线路

线路按类型分组，共 90+ 条，以上只是常见示例，完整列表见面板「线路」页：

| 类型 | 示例 | 用途 |
| --- | --- | --- |
| 下载代理 | `ghproxy.net`、`ghfast.top`、`gh-proxy.com`、`v4.gh-proxy.org`、`gh.llkk.cc`、`hub.gitmirror.com` | Raw / Release / Archive（部分支持 Clone） |
| URL 模板 | `jsDelivr`、`statically.io`、`eo.gh-proxy.cn` | 仅 Raw / 文件 CDN |
| 全站镜像 | `kkgithub.com`、`bgithub.xyz` | 直接浏览网页 |
| Clone 专用 | `gitclone.com` | `git clone` 加速 |
| Clone 代理 | `ghproxy.net`、`ghfast.top`、`gh-proxy.com`、`gh-proxy.org` 系列 | 前缀拼接完整地址后 `git clone` |

线路健康状态有 5 分钟缓存：测速或实际下载失败会被标记，自动降级时优先跳过。

## Actions 制品下载

- **已登录 GitHub**：脚本通过 `GM_xmlhttpRequest` 携带浏览器登录态请求 `api.github.com`，可直接下载公开仓库的 Artifacts。
- **未登录 / 私有仓库**：在「设置」中填入 Personal Access Token（`repo` 权限即可）。
- 若不想下载，可「复制 gh 命令」，在本地用 GitHub CLI 执行：

  ```bash
  gh run download <run-id> -R <owner>/<repo>
  ```

## 自建 Cloudflare Worker 镜像

`cloudflare-worker/` 提供了一个与脚本「代理前缀」线路完全兼容的 Worker：

```
cloudflare-worker/
├── github-mirror-worker.js   # Worker 源码
├── wrangler.toml             # wrangler 配置
└── deploy.ps1                # Windows 一键部署脚本
```

### 部署

方式一：Cloudflare Dashboard → Workers & Pages → 创建 Worker → 粘贴 `github-mirror-worker.js` → 部署。

方式二（Windows，自动检查 Node / 登录状态并部署）：

```powershell
cd cloudflare-worker
.\deploy.ps1
# 或
.\deploy.ps1 -Name my-gh-mirror -ApiToken $env:CLOUDFLARE_API_TOKEN
```

方式三：

```bash
npx wrangler deploy --config cloudflare-worker/wrangler.toml
```

部署完成后，在脚本面板「设置」→「自定义线路」中添加一条线路，类型选择「代理前缀」，填写：

```
https://<你的 Worker 域名>/
```

### 支持的地址形式

```text
https://<域名>/https://github.com/owner/repo/releases/download/v1/app.zip
https://<域名>/https://raw.githubusercontent.com/owner/repo/main/README.md
https://<域名>/https://github.com/owner/repo/archive/main.zip
https://<域名>/https://github.com/owner/repo/blob/main/README.md   # 自动转为 Raw
https://<域名>/github.com/owner/repo/archive/main.zip   # 省略协议头
https://<域名>/https:/github.com/owner/repo/archive/main.zip   # 合并斜杠后的形式
git clone https://<域名>/https://github.com/owner/repo.git
```

> 若 Cloudflare 区域开启了 URL 规范化中的「合并斜杠」，`https://` 会被压缩为 `https:/`，Worker 已自动兼容这种形式，无需额外配置。

### 环境变量（均可选）

| 变量 | 说明 |
| --- | --- |
| `ALLOWED_HOSTS` | 额外允许的域名，逗号分隔 |
| `ENABLE_API=1` | 允许 `api.github.com`，并把 Worker 根路径作为 API 镜像 |
| `ALLOW_AUTH=1` | 转发 `Authorization` 头（默认剥离，避免凭据经过第三方） |

安全默认值：只允许 `GET / HEAD / POST` 与 https 443，禁止 `git push`，默认剥离 `Cookie` / `Authorization` / Cloudflare 内部头；支持 Range 与大文件 302 跟随。

## 常见问题

**下载失败或很慢？**
打开「线路」页点「镜像测速」，或在脚本菜单执行「镜像测速并选择最快」；也可以禁用不稳定的线路。下载失败时会自动按顺序尝试其他线路，全部失败则回退为打开原链接。

**Clone 命令里的 `--branch`、`checkout` 和 `remote set-url` 是什么？**
脚本会按当前页面自动补全 Clone 命令，复制后可直接执行：

- **分支 / Tag 页面**：写入 `--branch`，例如 `git clone --branch main ...`；仓库首页使用默认分支。
- **Commit 页面**：Clone 后追加 `git -C <repo> checkout <sha>` 切到该提交；开启浅克隆时先 `git -C <repo> fetch --depth N origin <sha>` 再 checkout。
- **origin 还原**：走镜像时 `origin` 会被写成镜像地址，因此最后追加 `git -C <repo> remote set-url origin https://github.com/owner/repo.git`，把仓库连接还原为官方地址，方便 push 或切回直连。直连命令与 Gist 不需要还原时不会追加；可在设置中关闭「Clone 后还原官方仓库连接」。

**ZIP 下载的不是当前分支？**
脚本优先使用页面内嵌的官方 `zipballUrl`，并结合 URL 中的分支 / 标签 / commit SHA 校正；`blob/@SHA/README.md`、`tree/分支名` 等页面都会生成对应 ref 的归档地址。含斜杠的分支（如 `trae/agent-WkFkuq`）会通过页面内嵌的 `refInfo` 或分支选择器还原完整名称，不再被截断成第一段。

**Actions 下载返回 401 / 403？**
填写 Token（`repo` 权限），或确认浏览器已登录 GitHub；私有仓库必须使用 Token。

**全站镜像里登录不了？**
全站镜像只建议浏览公开页面，登录态与私有数据不会同步，请勿在镜像站输入账号密码。

**设置存在哪里？**
全部保存在浏览器扩展的本地存储（键名 `ghma:settings`），脚本不会上传。导入配置时，Token 与浮动按钮位置会保留本机原值。

**按钮位置会丢吗？**
拖动后的位置会持久化；窗口缩放或换分辨率时会被自动夹回可视区域。

## 代码结构（分层）

脚本仍是单文件、零依赖，但内部按职责自上而下分层，后层只依赖前层，便于定位与维护：

| 层 | 职责 | 主要成员 |
| --- | --- | --- |
| 1. 常量与默认值 | 内置线路、API 线路、默认设置 | `MIRRORS`、`API_MIRRORS`、`DEFAULTS` |
| 2. 通用工具 | DOM 查询、防抖、地址归一化、剪贴板 | `$`、`$$`、`debounce`、`normalizeBase`、`copyText`、`clamp`、`stripTrailingSlash`、`isCustomId` |
| 3. 设置存储 | 读取、清洗、迁移与持久化 | `loadSettings`、`saveSettings`、`sanitizeSettings`、`migrateSettings` |
| 4. 页面上下文 | 解析 GitHub / Gist 的仓库、分支、文件与归档地址 | `parseGitHubUrl`、`getRepoContext`、`zipUrl`、`buildArchiveUrl` |
| 5. 线路模型 | 健康度、能力判断、排序、分用途选择与 URL 改写 | `healthOf`、`mirrorCaps`、`sortedMirrors`、`orderedPool`、`mirrorize`、`cloneCommand` |
| 6. 文件与 Actions | 下载、制品 / 日志、配置导入导出 | `downloadViaMirror`、`downloadAssets`、`ghApiRequest`、`importConfig`、`exportConfig` |
| 7. 面板 UI | 设计令牌、CSS、渲染、事件、浮动按钮与定位 | `PANEL_CSS`、`buildUI`、`renderPanel`、`positionPanel` |
| 8. 页面注入 | Code 工具栏、文件页 Raw 按钮、静态资源 CDN | `injectCodeToolbar`、`injectRawButton`、`applyStaticCdn` |
| 9. 下载改写与启动 | 链接改写、菜单、快捷键、定时巡检 | `rewriteDownloads`、`installMenus`、`startHealthLoop` |

公共小工具只保留一处实现：`stripTrailingSlash` 统一各处的“去掉末尾斜杠”，`isCustomId` 统一自定义线路 ID 判断，`currentFileName` 统一文件下载命名，`customApiBase` 统一自定义 API 地址解析。回归测试通过字符串标记从源码抽取代码，因此被测试覆盖的函数名与签名保持不变。

## 项目结构

```text
.
├── github-mirror-accelerator.user.js   # 用户脚本（单文件、零依赖）
├── test/                               # 回归测试（Node 直接运行）
│   ├── zipurl.test.js                  # ZIP ref 解析
│   ├── clone.test.js                   # Clone 线路能力与命令生成
│   ├── fab-geometry.test.js            # 浮动按钮与面板几何
│   └── fab-interaction.test.js         # 拖动 / 贴边 / 面板跟随
├── LICENSE
└── cloudflare-worker/                  # 可选的自建镜像
    ├── github-mirror-worker.js
    ├── wrangler.toml
    └── deploy.ps1
```

## 布局与响应式

面板样式集中为一份带设计令牌的样式表，视觉规则不再散落在各选择器里：

- **设计令牌**：颜色、间距、圆角、字体、阴影统一声明为 `--ghma-*` CSS 变量；浅色主题只覆盖令牌（`:host(.ghma-light)`），不再为每个选择器重复写一套颜色。
- **间距体系**：以 4 / 6 / 8 / 10 / 12 / 16px 的六级间距（`--ghma-space-1…6`）组织内边距与元素间隔，面板主体统一 12px 内边距、10px 纵向节奏。
- **视觉层级**：头部使用吸顶 + 分隔线，标题超出省略；版本号、状态点、关闭按钮固定不换行；分组标题小号大写；主操作按钮使用主色，其余使用次级底色。
- **对齐一致性**：所有按钮与下拉框统一 `min-height`、圆角与居中方式，图标 / 文本基线一致；线路管理、分用途线路行、自定义线路卡片使用统一的行高与右对齐数值。
- **响应式**：
  - 面板宽度随视口收缩（`220–344px`），高度始终夹在视口内；
  - 视口宽度 `< 380px` 时，快捷操作网格由三列降为两列；
  - 视口宽度 `< 300px` 时，网格降为单列，自定义线路底部信息与分用途线路行改为纵向排列；
  - 视口宽度 `< 360px` 时，面板切换为贴边抽屉（左右 8px、顶部 8px），避免与浮动按钮互相遮挡；
  - 遵循 `prefers-reduced-motion`，在系统要求减少动效时关闭浮动按钮与提示的过渡。
- **可访问性**：交互元素补充 `:focus-visible` 焦点环；滚动条使用细样式；文本与背景对比度沿用 GitHub 暗色 / 浅色调色板。

## 开发

- 无构建、无依赖，浏览器直接执行单文件脚本。
- 编码约定：2 空格缩进、单引号、语句以分号结尾、函数使用 `function` 声明；新增逻辑按上述九层归位，公共表达式先抽小工具，避免在多个分支重复。
- 修改后先做语法检查：

  ```bash
  node --check github-mirror-accelerator.user.js
  ```

- 发布新版本时同步更新两处版本号：文件头的 `@version` 与代码中的 `SCRIPT_VERSION`。
- 回归测试直接运行，无需安装依赖：

  ```bash
  node test/zipurl.test.js
  node test/clone.test.js
  node test/fab-geometry.test.js
  node test/fab-interaction.test.js
  ```

  测试会从用户脚本中抽取真实代码，验证 ZIP ref 解析、Clone 线路选择与命令生成，以及浮动按钮 / 面板的几何和交互行为。

## 许可

MIT
