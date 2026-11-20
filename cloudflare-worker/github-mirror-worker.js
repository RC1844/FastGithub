/**
 * GitHub 镜像加速 Worker（Cloudflare Workers 模板）
 *
 * 与「GitHub 镜像加速助手」油猴脚本的「代理前缀」线路完全兼容：
 *   Worker 地址 + 原始 GitHub 地址
 *
 * 部署方式（任选其一）：
 *   1. Cloudflare Dashboard → Workers & Pages → 创建 Worker → 粘贴本文件 → 部署
 *   2. 本地安装 wrangler 后执行：npx wrangler deploy github-mirror-worker.js --name github-mirror
 *      首次部署时按提示创建 wrangler.toml 即可
 *
 * 部署完成后在脚本面板中选择「自定义线路」，类型选「代理前缀」，填写：
 *   https://<你的 Worker 域名>/
 *
 * 支持的地址形式：
 *   https://<域名>/https://github.com/owner/repo/releases/download/v1/app.zip
 *   https://<域名>/https://raw.githubusercontent.com/owner/repo/main/README.md
 *   https://<域名>/https://github.com/owner/repo/archive/HEAD.zip
 *   https://<域名>/github.com/owner/repo/archive/HEAD.zip   （省略协议头的简写）
 *   git clone https://<域名>/https://github.com/owner/repo.git
 *
 * 环境变量（在 Worker 设置 → 变量中添加，均可选）：
 *   ALLOWED_HOSTS  额外允许的域名，逗号分隔
 *   ENABLE_API     设为 "1" 时允许 api.github.com；同时可把 Worker 根路径当作 API 镜像根地址
 *   ALLOW_AUTH     设为 "1" 时转发 Authorization 头（默认剥离，避免凭据经过第三方）
 *
 * 说明：
 *   - 仅允许 GET / HEAD / POST，且禁止 git push（git-receive-pack）
 *   - 默认剥离 Cookie / Authorization / CF 内部头，避免把用户凭据转发给上游
 *   - 支持 Range 请求与 302 跟随，Release 大文件、Archive、Raw、git clone 均可使用
 *   - 如需限制流量，可在 Cloudflare 控制台为该 Worker 配置 Rate limiting 规则
 */

const DEFAULT_HOSTS = [
  'github.com',
  'raw.githubusercontent.com',
  'codeload.github.com',
  'objects.githubusercontent.com',
  'gist.githubusercontent.com',
];

// 不转发给上游的请求头：连接类 / Cloudflare 注入 / 凭据类
const DROP_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-connection',
  'transfer-encoding',
  'upgrade',
  'content-length',
  'accept-encoding',
  'cookie',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-real-ip',
]);

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, POST, OPTIONS',
  'access-control-allow-headers': '*',
  'access-control-max-age': '86400',
  'access-control-expose-headers': 'content-length, content-range, content-disposition, etag',
};

export default {
  async fetch(request, env) {
    env = env || {};
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      return usage();
    }

    if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'POST') {
      return text(405, '仅支持 GET / HEAD / POST');
    }

    const resolved = resolveTarget(url, env);
    if (resolved.error) return text(resolved.status || 400, resolved.error);
    const target = resolved.target;

    // 推送需要凭据，镜像不代为转发
    if (request.method === 'POST' && /\/git-receive-pack$/.test(target.pathname)) {
      return text(403, '本镜像不支持 git push');
    }

    const allowAuth = String(env.ALLOW_AUTH || '') === '1';
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (DROP_REQUEST_HEADERS.has(k)) return;
      if (k === 'authorization' && !allowAuth) return;
      headers.set(k, value);
    });
    // 强制未压缩，避免边缘节点解压后 content-encoding 与实际内容不一致
    headers.set('accept-encoding', 'identity');

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

    let upstream;
    try {
      upstream = await fetch(target.toString(), {
        method: request.method,
        headers,
        body: hasBody ? request.body : undefined,
        redirect: 'follow',
      });
    } catch (err) {
      return text(502, `上游请求失败：${err && err.message ? err.message : '未知错误'}`);
    }

    const outHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === 'set-cookie' || k === 'clear-site-data') return;
      outHeaders.set(k, value);
    });
    Object.keys(CORS_HEADERS).forEach((k) => outHeaders.set(k, CORS_HEADERS[k]));

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  },
};

function allowedHosts(env) {
  const extra = String((env && env.ALLOWED_HOSTS) || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const hosts = new Set(DEFAULT_HOSTS);
  extra.forEach((host) => hosts.add(host));
  if (env && String(env.ENABLE_API || '') === '1') hosts.add('api.github.com');
  return hosts;
}

/**
 * 解析出真正的上游地址：
 *   /https://github.com/...  →  https://github.com/...
 *   /github.com/...          →  https://github.com/...（简写）
 *   /repos/...               →  https://api.github.com/repos/...（需 ENABLE_API=1）
 */
function resolveTarget(requestUrl, env) {
  const raw = requestUrl.pathname.replace(/^\/+/, '');
  if (!raw) return { error: '缺少目标地址' };
  const search = requestUrl.search || '';
  const hosts = allowedHosts(env);
  let candidate = '';

  if (/^https?:\/\//i.test(raw)) {
    candidate = raw + search;
  } else {
    const first = raw.split('/')[0].toLowerCase();
    if (hosts.has(first)) {
      candidate = 'https://' + raw + search;
    } else if (String(env.ENABLE_API || '') === '1') {
      candidate = 'https://api.github.com/' + raw + search;
    } else {
      return { error: '格式错误：地址应以 /https://github.com/... 开头' };
    }
  }

  let target;
  try {
    target = new URL(candidate);
  } catch (e) {
    return { error: '目标地址无效' };
  }
  if (target.protocol !== 'https:') return { status: 400, error: '仅支持 https 目标地址' };
  if (target.username || target.password) return { status: 400, error: '不允许携带用户名或密码' };
  if (target.port && target.port !== '443') return { status: 403, error: '仅允许 443 端口' };

  const host = target.hostname.toLowerCase();
  if (!hosts.has(host)) return { status: 403, error: `域名 ${host} 不在允许列表中` };

  return { target };
}

function usage() {
  return text(
    200,
    [
      'GitHub 镜像加速 Worker 已运行',
      '',
      '用法：',
      '  https://<本域名>/https://github.com/owner/repo/releases/download/v1/app.zip',
      '  https://<本域名>/https://raw.githubusercontent.com/owner/repo/main/README.md',
      '  https://<本域名>/https://github.com/owner/repo/archive/HEAD.zip',
      '  git clone https://<本域名>/https://github.com/owner/repo.git',
      '',
      '在油猴脚本面板中选择「自定义线路」→「代理前缀」，前缀填写 https://<本域名>/',
    ].join('\n')
  );
}

function text(status, body) {
  const headers = new Headers(CORS_HEADERS);
  headers.set('content-type', 'text/plain; charset=utf-8');
  return new Response(body, { status, headers });
}
