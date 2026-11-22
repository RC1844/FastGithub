/* Clone 线路测试：抽取用户脚本中的线路能力、自动兜底与 clone 命令生成
 * 运行：node test/clone.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'github-mirror-accelerator.user.js');
const src = fs.readFileSync(SRC, 'utf8');

const S1_START = '  // 实测支持 git clone（Git Smart HTTP）的代理前缀线路；其余代理仅用于 Raw / 下载';
const S1_END = `  function chooseCloneMirror(silent) {
    return state.settings.autoFallback
      ? pickMirror('clone', silent)
      : mirrorFor('clone');
  }`;
const S2_START = '  // 分支名含 shell 特殊字符时加单引号';
const S2_END = "    return parts.join(' && ');\n  }";

const i1 = src.indexOf(S1_START);
const i2 = src.indexOf(S1_END);
const i3 = src.indexOf(S2_START);
const i4 = src.indexOf(S2_END, i3);
if (i1 < 0 || i2 < 0 || i3 < 0 || i4 < 0) {
  console.error('未找到代码片段');
  process.exit(1);
}
const block = src.slice(i1, i2 + S1_END.length) + '\n' + src.slice(i3, i4 + S2_END.length);
console.log(`抽取代码 ${block.split('\n').length} 行\n`);

// ---------- 线路样本 ----------
const MIRRORS = [
  { id: 'ghproxy', label: 'ghproxy.net', type: 'proxy', base: 'https://ghproxy.net/' },
  { id: 'ghfast', label: 'ghfast.top', type: 'proxy', base: 'https://ghfast.top/' },
  { id: 'ghproxycom', label: 'gh-proxy.com', type: 'proxy', base: 'https://gh-proxy.com/' },
  { id: 'ghproxyorgv4', label: 'v4.gh-proxy.org', type: 'proxy', base: 'https://v4.gh-proxy.org/' },
  { id: 'ghproxynet', label: 'gh-proxy.net', type: 'proxy', base: 'https://gh-proxy.net/' },
  {
    id: 'jsdelivr',
    label: 'jsDelivr',
    type: 'template',
    template: 'https://cdn.jsdelivr.net/gh/{owner}/{repo}@{ref}/{path}',
    caps: { raw: true, downloads: false },
  },
  {
    id: 'rawonly',
    label: 'eo.gh-proxy.cn',
    type: 'template',
    template: 'https://eo.gh-proxy.cn/github/{rawUrl}',
    caps: { raw: true, downloads: false },
  },
  {
    id: 'cloneurl',
    label: '自定义 Clone 模板',
    type: 'template',
    template: 'https://m.example.com/{cloneUrl}',
    caps: { clone: true },
  },
  { id: 'gitclone', label: 'gitclone.com', type: 'clone', base: 'https://gitclone.com/' },
  { id: 'kkgithub', label: 'kkgithub.com', type: 'site', base: 'https://kkgithub.com' },
];
const byId = (id) => MIRRORS.find((m) => m.id === id);

function setup(over, page) {
  const pageInfo = page || {};
  const state = {
    settings: Object.assign(
      {
        mirror: 'ghproxy',
        mirrorClone: 'auto',
        autoFallback: true,
        disabledMirrors: [],
        pinnedMirrors: [],
        speeds: {},
        cloneDepth: 0,
      },
      over,
    ),
    health: {},
  };
  const healthOf = (m) => {
    const h = m && state.health[m.id];
    return h ? (h.ok ? 'ok' : 'bad') : 'unknown';
  };
  const activeMirror = () => byId(state.settings.mirror) || MIRRORS[0];
  const customMirror = () => null;
  const zipUrl = () => pageInfo.zip || '';
  const refFromArchiveHref = (href) => {
    const m = String(href || '').match(/\/archive\/(.+?)\.(zip|tar\.gz)(?:\?|$)/i);
    if (!m) return '';
    const token = m[1];
    if (token === 'HEAD') return '';
    return token.replace(/^refs\/(heads|tags)\//, '');
  };
  const embeddedRepoInfo = () => ({ zipballUrl: '', defaultBranch: pageInfo.defaultBranch || '' });
  const factory = new Function(
    'MIRRORS',
    'state',
    'healthOf',
    'activeMirror',
    'customMirror',
    'zipUrl',
    'refFromArchiveHref',
    'embeddedRepoInfo',
    block + '\nreturn { mirrorCaps, mirrorFor, fallbackCloneMirror, cloneCommand, orderedPool };',
  );
  const api = factory(
    MIRRORS,
    state,
    healthOf,
    activeMirror,
    customMirror,
    zipUrl,
    refFromArchiveHref,
    embeddedRepoInfo,
  );
  return Object.assign({ state }, api);
}

const CTX = { owner: 'octocat', repo: 'Hello-World', isGist: false };

let passed = 0;
let failed = 0;
const eq = (a, b, label) => {
  const same = JSON.stringify(a) === JSON.stringify(b);
  if (same) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}\n      期望: ${JSON.stringify(b)}\n      实际: ${JSON.stringify(a)}`);
  }
};

console.log('Clone 线路能力');
{
  const { mirrorCaps } = setup();
  eq(mirrorCaps(byId('ghproxy'), 'clone'), true, 'ghproxy.net 支持 Clone');
  eq(mirrorCaps(byId('ghproxyorgv4'), 'clone'), true, 'v4.gh-proxy.org 支持 Clone');
  eq(mirrorCaps(byId('ghproxynet'), 'clone'), false, '未实测代理不进入 Clone 列表');
  eq(mirrorCaps(byId('jsdelivr'), 'clone'), false, 'jsDelivr 模板不支持 Clone');
  eq(mirrorCaps(byId('rawonly'), 'clone'), false, '仅 Raw 模板不支持 Clone');
  eq(mirrorCaps(byId('cloneurl'), 'clone'), true, '含 {cloneUrl} 的模板支持 Clone');
  eq(mirrorCaps(byId('gitclone'), 'clone'), true, 'Clone 专用节点始终可用');
  eq(mirrorCaps(byId('kkgithub'), 'clone'), true, '全站镜像可用于 Clone');
  eq(mirrorCaps(byId('jsdelivr'), 'downloads'), false, 'Clone 能力不影响下载能力判定');
}

console.log('\n自动选择 Clone 节点');
{
  const { mirrorFor } = setup({ mirror: 'ghproxy' });
  eq(mirrorFor('clone').id, 'ghproxy', '主线路支持 Clone 时跟随主线路');
}
{
  const { mirrorFor } = setup({ mirror: 'jsdelivr' });
  eq(mirrorFor('clone').id, 'ghproxy', '主线路不支持 Clone 时自动改用 Clone 节点');
}
{
  const { mirrorFor } = setup({ mirror: 'rawonly' });
  eq(mirrorFor('clone').id, 'ghproxy', '仅 Raw 模板也自动兜底');
}
{
  const { mirrorFor } = setup({
    mirror: 'jsdelivr',
    disabledMirrors: ['ghproxy', 'ghfast', 'ghproxycom', 'ghproxyorgv4', 'cloneurl'],
  });
  eq(mirrorFor('clone').id, 'gitclone', '跳过禁用线路后继续选择');
}
{
  const { mirrorFor } = setup({ mirror: 'jsdelivr', mirrorClone: 'ghfast' });
  eq(mirrorFor('clone').id, 'ghfast', '显式指定 Clone 线路时优先使用');
}

console.log('\nClone 候选线路池');
{
  const { orderedPool } = setup({ mirror: 'jsdelivr' });
  const ids = orderedPool('clone').map((m) => m.id);
  eq(ids.indexOf('ghproxynet'), -1, '排除未实测代理');
  eq(ids.indexOf('jsdelivr'), -1, '排除 jsDelivr');
  eq(ids.indexOf('rawonly'), -1, '排除仅 Raw 模板');
  eq(ids.indexOf('cloneurl') >= 0, true, '支持 Clone 的模板可用');
  eq(ids.indexOf('gitclone') >= 0 && ids.indexOf('kkgithub') >= 0, true, '包含专用节点与全站镜像');
}

console.log('\nClone 命令生成');
const OFFICIAL = 'https://github.com/octocat/Hello-World.git';
const GIST_OFFICIAL = 'https://gist.github.com/abc123.git';
const restore = (dir, url) => ` && git -C ${dir} remote set-url origin ${url || OFFICIAL}`;
{
  const { cloneCommand } = setup({ mirror: 'ghproxy' });
  eq(
    cloneCommand(CTX),
    'git clone https://ghproxy.net/https://github.com/octocat/Hello-World.git' + restore('Hello-World'),
    '代理线路：前缀拼接完整地址，并还原 origin',
  );
}
{
  const { cloneCommand } = setup({ mirror: 'ghproxy', cloneDepth: 1 });
  eq(
    cloneCommand(CTX),
    'git clone --depth 1 https://ghproxy.net/https://github.com/octocat/Hello-World.git' + restore('Hello-World'),
    '浅克隆：追加 --depth',
  );
}
{
  const { cloneCommand } = setup({ mirror: 'ghproxy' });
  eq(
    cloneCommand(CTX, byId('gitclone')),
    'git clone https://gitclone.com/github.com/octocat/Hello-World.git' + restore('Hello-World'),
    'Clone 专用节点：gitclone 路径形式',
  );
}
{
  const { cloneCommand } = setup({ mirror: 'ghproxy' });
  eq(
    cloneCommand(CTX, byId('kkgithub')),
    'git clone https://kkgithub.com/octocat/Hello-World.git' + restore('Hello-World'),
    '全站镜像：域名直拼 owner/repo',
  );
}
{
  const { cloneCommand } = setup({ mirror: 'ghproxy' });
  eq(
    cloneCommand(CTX, byId('cloneurl')),
    'git clone https://m.example.com/https://github.com/octocat/Hello-World.git' + restore('Hello-World'),
    'URL 模板：替换 {cloneUrl}',
  );
}
{
  const { cloneCommand } = setup({ mirror: 'ghproxy' });
  eq(
    cloneCommand(CTX, byId('jsdelivr')),
    'git clone https://ghproxy.net/https://github.com/octocat/Hello-World.git' + restore('Hello-World'),
    '传入不支持 Clone 的线路时自动兜底',
  );
}
{
  const { cloneCommand, state } = setup({ mirror: 'ghproxy', disabledMirrors: ['ghproxy'] });
  state.health.ghproxy = { ok: true };
  eq(
    cloneCommand(CTX),
    'git clone https://ghfast.top/https://github.com/octocat/Hello-World.git' + restore('Hello-World'),
    '主线路被禁用时改用可用节点',
  );
}
{
  const { cloneCommand } = setup({ mirror: 'ghproxy' });
  const gist = { repo: 'abc123', isGist: true };
  eq(
    cloneCommand(gist, byId('kkgithub')),
    'git clone https://gist.github.com/abc123.git',
    'Gist + 全站镜像：回退到官方地址，无需还原',
  );
  eq(
    cloneCommand(gist, byId('ghproxy')),
    'git clone https://ghproxy.net/https://gist.github.com/abc123.git' + restore('abc123', GIST_OFFICIAL),
    'Gist + 代理线路：仍走镜像前缀并还原 origin',
  );
}
{
  const { cloneCommand } = setup({ mirror: 'ghproxy' });
  eq(cloneCommand(null), '', '无仓库上下文时返回空字符串');
}
{
  const { cloneCommand } = setup({
    mirror: 'jsdelivr',
    disabledMirrors: ['ghproxy', 'ghfast', 'ghproxycom', 'ghproxyorgv4', 'cloneurl', 'gitclone', 'kkgithub'],
  });
  eq(
    cloneCommand(CTX),
    'git clone https://github.com/octocat/Hello-World.git',
    '无可用 Clone 节点时直连，且不追加还原命令',
  );
}

console.log('\n自动写入当前分支');
{
  const { cloneCommand } = setup(
    { mirror: 'ghproxy' },
    { zip: 'https://github.com/octocat/Hello-World/archive/refs/heads/main.zip' },
  );
  eq(
    cloneCommand(CTX),
    'git clone --branch main https://ghproxy.net/https://github.com/octocat/Hello-World.git' +
      restore('Hello-World'),
    '仓库首页：使用默认分支 main',
  );
}
{
  const { cloneCommand } = setup(
    { mirror: 'ghproxy' },
    { zip: 'https://github.com/octocat/Hello-World/archive/refs/heads/feature/x.zip' },
  );
  const ctx = Object.assign({ kind: 'tree', rest: ['tree', 'feature', 'x'] }, CTX);
  eq(
    cloneCommand(ctx),
    'git clone --branch feature/x https://ghproxy.net/https://github.com/octocat/Hello-World.git' +
      restore('Hello-World'),
    '带斜杠的分支原样保留',
  );
}
{
  const { cloneCommand } = setup({ mirror: 'ghproxy', cloneDepth: 1 }, { defaultBranch: 'main' });
  eq(
    cloneCommand(CTX),
    'git clone --branch main --depth 1 https://ghproxy.net/https://github.com/octocat/Hello-World.git' +
      restore('Hello-World'),
    '分支参数在 --depth 之前',
  );
}
{
  const { cloneCommand } = setup(
    { mirror: 'ghproxy' },
    { zip: 'https://github.com/octocat/Hello-World/archive/abc1234.zip' },
  );
  const ctx = Object.assign({ kind: 'tree', rest: ['tree', 'abc1234'] }, CTX);
  eq(
    cloneCommand(ctx),
    'git clone https://ghproxy.net/https://github.com/octocat/Hello-World.git' +
      ' && git -C Hello-World checkout abc1234' +
      restore('Hello-World'),
    'tree/<SHA>：clone 后 checkout 该提交',
  );
}
{
  const { cloneCommand } = setup(
    { mirror: 'ghproxy', cloneDepth: 1 },
    { zip: 'https://github.com/octocat/Hello-World/archive/abc1234.zip' },
  );
  const ctx = Object.assign({ kind: 'commit', rest: ['commit', 'abc1234'] }, CTX);
  eq(
    cloneCommand(ctx),
    'git clone --depth 1 https://ghproxy.net/https://github.com/octocat/Hello-World.git' +
      ' && git -C Hello-World fetch --depth 1 origin abc1234' +
      ' && git -C Hello-World checkout abc1234' +
      restore('Hello-World'),
    'commit 页面 + 浅克隆：先补取提交再 checkout',
  );
}
{
  const { cloneCommand } = setup({ mirror: 'ghproxy' }, { defaultBranch: 'main' });
  const ctx = Object.assign(
    {
      kind: 'tree',
      rest: ['tree', 'trae', 'agent-WkFkuq'],
      ref: 'trae/agent-WkFkuq',
      refExact: true,
    },
    CTX,
  );
  eq(
    cloneCommand(ctx),
    'git clone --branch trae/agent-WkFkuq https://ghproxy.net/https://github.com/octocat/Hello-World.git' +
      restore('Hello-World'),
    '精确拆分斜杠分支：--branch 使用完整 ref',
  );
}
{
  const { cloneCommand } = setup({ mirror: 'ghproxy', restoreOrigin: false });
  eq(
    cloneCommand(CTX),
    'git clone https://ghproxy.net/https://github.com/octocat/Hello-World.git',
    '关闭还原 origin 后不再追加 remote set-url',
  );
}
{
  const { cloneCommand } = setup({ mirror: 'ghproxy' }, { defaultBranch: 'main' });
  const ctx = Object.assign({ kind: 'pull', rest: ['pull', '1'] }, CTX);
  eq(
    cloneCommand(ctx),
    'git clone https://ghproxy.net/https://github.com/octocat/Hello-World.git' + restore('Hello-World'),
    'PR 页面不猜分支',
  );
}
{
  const { cloneCommand } = setup({ mirror: 'ghproxy' }, { defaultBranch: 'main' });
  const gist = { repo: 'abc123', isGist: true, kind: '' };
  eq(
    cloneCommand(gist),
    'git clone https://ghproxy.net/https://gist.github.com/abc123.git' + restore('abc123', GIST_OFFICIAL),
    'Gist 不写 --branch',
  );
}
{
  const { cloneCommand } = setup(
    { mirror: 'ghproxy' },
    { zip: 'https://github.com/octocat/Hello-World/archive/refs/heads/foo$bar.zip' },
  );
  eq(
    cloneCommand(CTX),
    "git clone --branch 'foo$bar' https://ghproxy.net/https://github.com/octocat/Hello-World.git" +
      restore('Hello-World'),
    '含 shell 特殊字符的分支加引号',
  );
}

console.log('');
if (failed === 0) {
  console.log(`全部通过 ✅  passed=${passed}  failed=0`);
  process.exit(0);
} else {
  console.log(`有失败 ❌  passed=${passed}  failed=${failed}`);
  process.exit(1);
}
