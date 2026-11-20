#Requires -Version 5.1
<#
.SYNOPSIS
    部署 GitHub 镜像加速 Worker 到 Cloudflare Workers。

.DESCRIPTION
    自动检查 Node.js / npx、确认 Cloudflare 登录状态，然后使用 wrangler 部署
    cloudflare-worker/github-mirror-worker.js，并在完成后提示脚本配置方式。

.PARAMETER Name
    自定义 Worker 名称，默认使用 wrangler.toml 中的 github-mirror。

.PARAMETER ApiToken
    Cloudflare API Token。适合 CI 或无法交互登录的环境；
    未提供时若未登录会自动执行 wrangler login。

.EXAMPLE
    .\deploy.ps1

.EXAMPLE
    .\deploy.ps1 -Name my-gh-mirror

.EXAMPLE
    .\deploy.ps1 -ApiToken $env:CLOUDFLARE_API_TOKEN
#>
[CmdletBinding()]
param(
    [string]$Name = 'github-mirror',
    [string]$ApiToken = ''
)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$configPath = Join-Path $scriptDir 'wrangler.toml'
$wranglerPrefix = @('--yes', 'wrangler@latest')

function Write-Step([string]$Message) {
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Write-Ok([string]$Message) {
    Write-Host "[OK] $Message" -ForegroundColor Green
}

function Write-Info([string]$Message) {
    Write-Host "    $Message" -ForegroundColor DarkGray
}

try {
    # 1. 基础环境检查
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw '未找到 Node.js，请先安装 Node.js 18+：https://nodejs.org/'
    }
    if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
        throw '未找到 npx，请确认 Node.js 安装完整并已加入 PATH。'
    }

    $nodeVersion = (& node -v).Trim()
    $nodeMajor = [int](($nodeVersion -replace '^v', '') -split '\.')[0]
    if ($nodeMajor -lt 18) {
        throw "Node.js 版本过低（$nodeVersion），请升级到 18+（建议 20+）。"
    }
    Write-Ok "Node.js $nodeVersion"

    if (-not (Test-Path -LiteralPath $configPath)) {
        throw "未找到配置文件：$configPath"
    }
    $workerEntry = Join-Path $scriptDir 'github-mirror-worker.js'
    if (-not (Test-Path -LiteralPath $workerEntry)) {
        throw "未找到 Worker 文件：$workerEntry"
    }

    # 2. 登录状态
    if ($ApiToken) {
        $env:CLOUDFLARE_API_TOKEN = $ApiToken
        Write-Info '使用 -ApiToken 指定的 API Token'
    }

    Write-Step '检查 Cloudflare 登录状态'
    & npx @wranglerPrefix whoami *> $null
    if ($LASTEXITCODE -ne 0) {
        if ($ApiToken) {
            throw 'API Token 无效或无权限，请检查 Token 是否包含 Workers 编辑权限。'
        }
        Write-Info '尚未登录，正在打开浏览器进行授权…'
        & npx @wranglerPrefix login
        if ($LASTEXITCODE -ne 0) {
            throw 'Cloudflare 登录失败，请重试或改用 -ApiToken 方式。'
        }
    }
    Write-Ok 'Cloudflare 登录状态正常'

    # 3. 部署
    Write-Step "部署 Worker：$Name"
    Push-Location $scriptDir
    try {
        $deployArgs = @('deploy', '--config', $configPath)
        if ($PSBoundParameters.ContainsKey('Name')) {
            $deployArgs += @('--name', $Name)
        }
        & npx @wranglerPrefix @deployArgs
        if ($LASTEXITCODE -ne 0) {
            throw "wrangler 部署失败（退出码 $LASTEXITCODE）。"
        }
    }
    finally {
        Pop-Location
    }

    # 4. 完成提示
    Write-Host ''
    Write-Ok '部署完成'
    Write-Host '在油猴面板中选择「自定义线路」→ 类型「代理前缀」，填写部署输出中的地址并保留结尾斜杠：'
    Write-Host '    https://<你的 Worker 域名>/' -ForegroundColor Yellow
    Write-Host ''
    Write-Host '可选环境变量（Dashboard → Workers & Pages → 对应 Worker → 设置 → 变量）：'
    Write-Host '    ALLOWED_HOSTS  额外允许的域名，逗号分隔'
    Write-Host '    ENABLE_API=1   允许 api.github.com，并把 Worker 根路径作为 API 镜像'
    Write-Host '    ALLOW_AUTH=1   转发 Authorization（默认剥离）'
    Write-Host ''
    Write-Host '如需自定义域名，请在 Worker 的「设置 → 域和路由」中绑定。'
}
catch {
    Write-Host ''
    Write-Host "[失败] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
