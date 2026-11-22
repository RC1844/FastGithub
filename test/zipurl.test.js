/* ZIP 归档地址解析回归测试
 * 直接从 userscript 抽取 getGistRawLink → zipUrl 的真实代码，用假 location / DOM 驱动
 * 运行：node test/zipurl.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'github-mirror-accelerator.user.js');
const src = fs.readFileSync(SRC, 'utf8');

const START = '  function getGistRawLink() {';
const END = '  // ---------------------------------------------------------------------------\n  // 镜像 URL 生成 / 模板 / 自动降级';
const s = src.indexOf(START);
const e = src.indexOf(END);
if (s < 0 || e < 0) {
  console.error('未找到 ZIP 解析代码片段，请检查抽取标记');
  process.exit(1);
}
const block = src.slice(s, e);

const RESERVED = new Set([
  'settings', 'topics', 'explore', 'marketplace', 'pricing', 'login', 'join',
  'sponsors', 'notifications', 'pulls', 'issues', 'codespaces', 'organizations',
  'orgs', 'users', 'about', 'site', 'security', 'contact', 'new', 'features',
  'enterprise', 'team', 'collections', 'trending', 'events', 'readme', 'apps',
  'search', 'dashboard', 'account', 'apps', 'sponsoring', 'support',
  'developer', 'solutions', 'open-source', 'customer-stories',
]);

function jsonFixture(owner, repo, ref, defaultBranch) {
  const kind = ref && /^v?\d/.test(ref) ? 'tags' : 'heads';
  const zip = ref ? `https://github.com/${owner}/${repo}/archive/refs/${kind}/${ref}.zip` : '';
  return JSON.stringify({ defaultBranch: defaultBranch || 'main', zipballUrl: zip });
}

function makeApi(pathname, opts) {
  const o = opts || {};
  const search = o.search || '';
  const location = {
    pathname,
    search,
    origin: 'https://github.com',
    get href() { return 'https://github.com' + this.pathname + this.search; },
  };
  const scripts = o.json ? [{ textContent: o.json }] : [];
  const toAnchor = (href) => ({
    href: /^https?:\/\//.test(href) ? href : 'https://github.com' + href,
    getAttribute: (n) => (n === 'href' ? href : null),
  });
  const links = (o.links || []).map(toAnchor);
  const gistLinks = (o.gistLinks || []).map(toAnchor);
  const $$ = (sel) => {
    if (sel.indexOf('application/json') >= 0) return scripts;
    if (sel.indexOf('/archive/') >= 0) return o.gist ? gistLinks : links;
    return [];
  };
  const factory = new Function(
    'IS_GH', 'IS_GIST', 'RESERVED', '$', '$$', 'location',
    block + '\nreturn { getRepoContext: getRepoContext, zipUrl: zipUrl, buildArchiveUrl: buildArchiveUrl };'
  );
  const api = factory(true, !!o.gist, RESERVED, () => null, $$, location);
  api.location = location;
  return api;
}

function zipFor(pathname, opts) {
  const api = makeApi(pathname, opts);
  return api.zipUrl(api.getRepoContext());
}

let passed = 0;
let failed = 0;
function eq(actual, expected, label) {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}\n      期望: ${expected}\n      实际: ${actual}`);
  }
}

const OWNER = 'RC1844';
const REPO = 'Actions-Build-TWRP-For-Begonia';
const SHA = '49a9af927342951c4da57cdd72ea2c1ac2fae85b';
const BASE = `https://github.com/${OWNER}/${REPO}`;
const MAIN_JSON = jsonFixture(OWNER, REPO, 'main');
const shaPath = (sub) => `/${OWNER}/${REPO}/${sub}`;

console.log('commit / tree / blob 的 SHA 页面（内嵌 JSON 指向 HEAD 时也必须使用 SHA）');
eq(zipFor(shaPath(`commit/${SHA}`), { json: MAIN_JSON }), `${BASE}/archive/${SHA}.zip`, 'commit/@SHA');
eq(zipFor(shaPath(`tree/${SHA}`), { json: MAIN_JSON }), `${BASE}/archive/${SHA}.zip`, 'tree/@SHA');
eq(zipFor(shaPath(`tree/${SHA}/src`), { json: MAIN_JSON }), `${BASE}/archive/${SHA}.zip`, 'tree/@SHA/src');
eq(zipFor(shaPath(`blob/${SHA}/README.md`), { json: MAIN_JSON }), `${BASE}/archive/${SHA}.zip`, 'blob/@SHA/README.md');
eq(zipFor(shaPath(`commit/${SHA.toUpperCase()}`), { json: MAIN_JSON }), `${BASE}/archive/${SHA.toUpperCase()}.zip`, '大写 SHA 原样保留');

console.log('\n带斜杠的分支 / Tag（优先使用内嵌 JSON 的官方 zipballUrl）');
eq(
  zipFor(shaPath('tree/trae/agent-WkFkuq'), { json: jsonFixture(OWNER, REPO, 'trae/agent-WkFkuq') }),
  `${BASE}/archive/refs/heads/trae/agent-WkFkuq.zip`,
  'tree/分支名含斜杠'
);
eq(
  zipFor(shaPath('blob/trae/agent-WkFkuq/README.md'), { json: jsonFixture(OWNER, REPO, 'trae/agent-WkFkuq') }),
  `${BASE}/archive/refs/heads/trae/agent-WkFkuq.zip`,
  'blob/分支名含斜杠/README.md'
);
eq(
  zipFor(shaPath('blob/trae/agent-WkFkuq/docs/a.md'), { json: jsonFixture(OWNER, REPO, 'trae/agent-WkFkuq') }),
  `${BASE}/archive/refs/heads/trae/agent-WkFkuq.zip`,
  'blob/斜杠分支/子目录文件'
);
eq(
  zipFor(shaPath('tree/release/2.0'), { json: jsonFixture(OWNER, REPO, 'release/2.0') }),
  `${BASE}/archive/refs/heads/release/2.0.zip`,
  'tree/release/2.0'
);
eq(
  zipFor(shaPath('blob/begonia-TWRP-v3.7.1-20261104-0039/README.md'), {
    json: JSON.stringify({
      defaultBranch: 'main',
      zipballUrl: `${BASE}/archive/refs/tags/begonia-TWRP-v3.7.1-20261104-0039.zip`,
    }),
  }),
  `${BASE}/archive/refs/tags/begonia-TWRP-v3.7.1-20261104-0039.zip`,
  'blob/Tag/README.md'
);

console.log('\n普通分支页面');
eq(zipFor(shaPath('tree/main/src'), { json: MAIN_JSON }), `${BASE}/archive/refs/heads/main.zip`, 'tree/main/src');
eq(zipFor(shaPath('tree/main'), { json: MAIN_JSON }), `${BASE}/archive/refs/heads/main.zip`, 'tree/main');
eq(zipFor(`/${OWNER}/${REPO}`, { json: MAIN_JSON }), `${BASE}/archive/refs/heads/main.zip`, '仓库首页使用默认分支');

console.log('\n无内嵌 JSON 时的兜底');
eq(zipFor(shaPath('tree/main/src')), `${BASE}/archive/main.zip`, '按 URL ref 构造');
eq(zipFor(shaPath('tree/feature/x')), `${BASE}/archive/feature.zip`, '兜底取第一段（子目录场景）');
eq(zipFor(shaPath('blob/main/docs/a.md')), `${BASE}/archive/main.zip`, 'blob 兜底取第一段');
eq(zipFor(`/${OWNER}/${REPO}`), `${BASE}/archive/HEAD.zip`, '首页无默认分支 → HEAD.zip');
eq(
  zipFor(shaPath('releases/tag/v1.2.3')),
  `${BASE}/archive/v1.2.3.zip`,
  'releases/tag 页面'
);

console.log('\nDOM 原生 Download ZIP 按钮');
eq(
  zipFor(shaPath('tree/main/src'), { links: [`/${OWNER}/${REPO}/archive/refs/heads/main.zip`] }),
  `${BASE}/archive/refs/heads/main.zip`,
  'DOM ref 与 URL 一致 → 采用 DOM 链接'
);
eq(
  zipFor(shaPath('tree/main/src'), { links: [`/${OWNER}/${REPO}/archive/HEAD.zip`] }),
  `${BASE}/archive/main.zip`,
  'DOM ref 不一致 → 忽略并按 URL 构造'
);

console.log('\n异常与边界');
eq(
  zipFor(shaPath('tree/main/src'), {
    json: JSON.stringify({ zipballUrl: 'https://github.com/other/thing/archive/refs/heads/main.zip' }),
  }),
  `${BASE}/archive/main.zip`,
  '内嵌 JSON 属于其他仓库 → 忽略'
);
eq(
  zipFor(shaPath('blob/main/docs/a.md'), {
    json: JSON.stringify({ zipballUrl: `${BASE}/archive/refs/heads/main.zip` }),
  }),
  `${BASE}/archive/refs/heads/main.zip`,
  'blob 普通分支/嵌套路径'
);
{
  const api = makeApi(shaPath('tree/main'));
  const ctx = api.getRepoContext();
  eq(
    api.buildArchiveUrl(ctx, 'feat/a b'),
    `${BASE}/archive/feat/a%20b.zip`,
    'buildArchiveUrl 逐段编码'
  );
}

console.log('\nGist');
{
  const url = 'https://gist.github.com/RC1844/abcdef123456/archive/abcdef123456.zip';
  eq(
    zipFor('/RC1844/abcdef123456', { gist: true, gistLinks: [url] }),
    url,
    'Gist 页面取 archive 链接'
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
