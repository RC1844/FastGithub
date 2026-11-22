/* 交互逻辑测试：直接从 userscript 抽取「浮动按钮」整段真实代码，用假 DOM 驱动
 * 运行：node test/fab-interaction.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'github-mirror-accelerator.user.js');
const src = fs.readFileSync(SRC, 'utf8');

const START = '    // ---- 浮动按钮：自由拖动 / 自动贴边 / 面板跟随 ----';
const END = "    shadow.querySelector('.x').addEventListener('click', () => togglePanel(false));";
const s = src.indexOf(START);
const e = src.indexOf(END);
if (s < 0 || e < 0) { console.error('未找到代码片段'); process.exit(1); }
const block = src.slice(s, e + END.length);
console.log(`抽取代码 ${block.split('\n').length} 行\n`);

// ---------- 假 DOM ----------
const VW = 1280, VH = 800, FAB_W = 76, FAB_H = 38, PANEL_W = 344;

// rAF 队列：手动 flush，保证断言时机可控
const rafQueue = [];
global.requestAnimationFrame = (fn) => rafQueue.push(fn);
const flushRaf = () => { while (rafQueue.length) rafQueue.shift()(); };

// ResizeObserver 桩：记录回调，测试里手动触发
const roCallbacks = [];
global.ResizeObserver = class {
  constructor(cb) { roCallbacks.push(cb); }
  observe() {}
};

function makeEl(w, h) {
  const listeners = {};
  const el = {
    style: { left: 'auto', right: 'auto', top: '18px' },
    hidden: false,
    offsetWidth: w,
    offsetHeight: h,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
    dispatch(t, ev) { (listeners[t] || []).forEach((fn) => fn(Object.assign({ preventDefault() {}, pointerId: 1, pointerType: 'mouse', button: 0 }, ev))); },
    setPointerCapture() {},
    getBoundingClientRect() {
      const width = el.style.width ? parseFloat(el.style.width) : el.offsetWidth;
      const height = el.offsetHeight;
      const left = el.style.left !== 'auto' && el.style.left !== undefined ? parseFloat(el.style.left)
        : (el.style.right !== 'auto' && el.style.right !== undefined ? VW - parseFloat(el.style.right) - width : 0);
      const top = el.style.top !== 'auto' && el.style.top !== undefined ? parseFloat(el.style.top) : 0;
      return { left, top, right: left + width, bottom: top + height, width, height };
    },
  };
  return el;
}

function makePanel(w, naturalH) {
  const el = makeEl(w, naturalH);
  let natural = naturalH;
  Object.defineProperty(el, 'offsetHeight', {
    get() {
      if (el.hidden) return 0;
      const mh = parseFloat(el.style.maxHeight);
      return Number.isFinite(mh) ? Math.min(natural, mh) : natural;
    },
  });
  el.setNaturalHeight = (h) => { natural = h; };
  return el;
}

function setup(savedPos) {
  rafQueue.length = 0;
  roCallbacks.length = 0;

  const fab = makeEl(FAB_W, FAB_H);
  const panel = makePanel(PANEL_W, 260);
  panel.hidden = true;

  const state = { panelOpen: false, settings: { fabPos: savedPos || { side: 'right', top: 18 } } };
  const saved = { count: 0 };
  const saveSettings = () => { saved.count++; };
  const renderPanel = () => {};
  const win = { innerWidth: VW, innerHeight: VH, addEventListener() {} };
  const shadowListeners = {};
  const shadow = {
    querySelector: () => makeEl(10, 10),
    addEventListener(t, fn) { (shadowListeners[t] = shadowListeners[t] || []).push(fn); },
    dispatch(t, ev) { (shadowListeners[t] || []).forEach((fn) => fn(Object.assign({}, ev))); },
  };

  const factory = new Function('fab', 'panel', 'state', 'saveSettings', 'renderPanel', 'window', 'shadow', block);
  factory(fab, panel, state, saveSettings, renderPanel, win, shadow);

  return { fab, panel, state, saved, shadow };
}

let passed = 0, failed = 0;
const eq = (a, b, label) => {
  if (a === b) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ ${label}\n      期望: ${b}\n      实际: ${a}`); }
};

const down = (fab, x, y) => fab.dispatch('pointerdown', { clientX: x, clientY: y });
const move = (fab, x, y) => fab.dispatch('pointermove', { clientX: x, clientY: y });
const up = (fab, x, y) => fab.dispatch('pointerup', { clientX: x, clientY: y });

console.log('初始化');
{
  const { fab } = setup({ side: 'right', top: 120 });
  eq(fab.style.right, '8px', '恢复右侧：right=8px');
  eq(fab.style.top, '120px', '恢复 top=120px');
}
{
  const { fab } = setup({ side: 'left', top: 99999 });
  eq(fab.style.left, '8px', '恢复左侧：left=8px');
  eq(fab.style.top, `${VH - FAB_H - 8}px`, '超界的 top 被夹到 754px');
}

console.log('\n点击（未拖动）→ 打开面板');
{
  const { fab, panel, state, saved } = setup({ side: 'right', top: 100 });
  down(fab, 1200, 119);
  up(fab, 1200, 119);
  fab.dispatch('click', {});
  eq(state.panelOpen, true, '面板已打开');
  eq(panel.hidden, false, 'panel.hidden=false');
  eq(saved.count, 0, '点击不保存位置');
  eq(panel.style.right, `${VW - (VW - 8 - FAB_W) + 6}px`, '面板贴在按钮左侧 6px');
  eq(panel.style.top, '100px', '面板与按钮顶部对齐');
}

console.log('\n拖动到左半区 → 左贴边 + 抑制随后的 click');
{
  const { fab, panel, state, saved } = setup({ side: 'right', top: 100 });
  down(fab, 1200, 119);
  move(fab, 1196, 120); // 超过 4px 阈值
  move(fab, 300, 220);
  eq(fab.classList.contains('dragging'), true, '拖动中带 dragging 类（关闭过渡）');
  up(fab, 300, 220);
  eq(fab.classList.contains('dragging'), false, '松手后移除 dragging（恢复吸附动画）');
  eq(fab.style.left, '8px', '自动贴左边');
  eq(fab.style.right, 'auto', '右侧置 auto');
  eq(state.settings.fabPos.side, 'left', '位置已保存：side=left');
  eq(saved.count, 1, 'saveSettings 调用 1 次');

  fab.dispatch('click', {});
  eq(state.panelOpen, false, '拖动后的 click 被抑制，面板不弹出');
  fab.dispatch('click', {});
  eq(state.panelOpen, true, '再次点击正常打开面板');
}

console.log('\n拖动到右半区 → 右贴边');
{
  const { fab, state } = setup({ side: 'left', top: 100 });
  down(fab, 30, 119);
  move(fab, 700, 300);
  up(fab, 700, 300);
  eq(fab.style.right, '8px', '自动贴右边');
  eq(fab.style.left, 'auto', '左侧置 auto');
  eq(state.settings.fabPos.side, 'right', '位置已保存：side=right');
}

console.log('\n拖动越界 → 夹在视口内');
{
  const { fab } = setup({ side: 'right', top: 100 });
  down(fab, 1200, 119);
  move(fab, -500, -500);
  up(fab, -500, -500);
  eq(fab.style.top, '8px', '上边界夹到 8px');
  eq(fab.style.left, '8px', '左边界夹到 8px');
}
{
  const { fab } = setup({ side: 'right', top: 100 });
  down(fab, 1200, 119);
  move(fab, 99999, 99999);
  up(fab, 99999, 99999);
  eq(fab.style.top, `${VH - FAB_H - 8}px`, '下边界夹到 754px');
}

console.log('\n拖动中面板跟随');
{
  const { fab, panel, state } = setup({ side: 'right', top: 100 });
  // 先打开面板
  fab.dispatch('click', {});
  eq(state.panelOpen, true, '面板已打开');

  down(fab, 1200, 119);
  move(fab, 600, 400); // 拖到左半区中间
  up(fab, 600, 400);
  eq(fab.style.left, '8px', '贴到左边');
  const fabTop = fab.getBoundingClientRect().top;
  const pTop = parseFloat(panel.style.top);
  eq(pTop, Math.round(Math.max(8, Math.min(fabTop, VH - panel.offsetHeight - 8))), '面板纵向跟随按钮并夹紧');
  eq(panel.style.left, `${8 + FAB_W + 6}px`, '面板切换到按钮右侧');
}

console.log('\n展开线路管理（面板变高）→ 底部不越出视口');
{
  const { fab, panel, state } = setup({ side: 'right', top: 500 });
  fab.dispatch('click', {});
  eq(state.panelOpen, true, '面板已打开');
  eq(panel.style.top, '500px', '初始与按钮顶部对齐');
  eq(panel.offsetHeight, 260, '初始高度 260');

  // 模拟展开 <details>：面板内容变高，ResizeObserver 触发重排
  panel.setNaturalHeight(1200);
  roCallbacks.forEach((cb) => cb());
  flushRaf();

  const top = parseFloat(panel.style.top);
  const maxH = parseFloat(panel.style.maxHeight);
  eq(top, 8, '内容超屏 → 面板顶部夹到 8px');
  eq(maxH, VH - 8 - 8, '高度按可用空间收缩到底部贴边');
  eq(panel.offsetHeight, VH - 16, '面板底部恰好到视口底边');
}

console.log('\n展开后收起（面板变矮）→ 高度恢复并重新对齐按钮');
{
  const { fab, panel, state } = setup({ side: 'right', top: 300 });
  fab.dispatch('click', {});
  eq(state.panelOpen, true, '面板已打开');
  eq(parseFloat(panel.style.top), 300, '初始与按钮顶部对齐');

  panel.setNaturalHeight(1200);
  roCallbacks.forEach((cb) => cb());
  flushRaf();
  eq(parseFloat(panel.style.top), 8, '先压到顶部');

  panel.setNaturalHeight(200);
  roCallbacks.forEach((cb) => cb());
  flushRaf();
  eq(parseFloat(panel.style.top), 300, '变矮后回到与按钮顶部对齐 300px');
  eq(panel.offsetHeight, 200, '高度恢复为内容高度');
}

console.log('\ndetails toggle 事件触发重排');
{
  const { panel, state, shadow } = setup({ side: 'right', top: 500 });
  panel.hidden = false;
  state.panelOpen = true;
  panel.setNaturalHeight(1000);
  shadow.dispatch('toggle', { target: { tagName: 'DETAILS' } });
  flushRaf();
  eq(parseFloat(panel.style.top), 8, 'toggle 后面板被重新夹紧到 8px');
}

console.log('\n贴边过渡结束后重新对齐面板');
{
  const { fab, panel, state } = setup({ side: 'right', top: 100 });
  fab.dispatch('click', {});
  eq(parseFloat(panel.style.top), 100, '打开时与按钮对齐');

  // 模拟动画中途：按钮的视觉位置还在移动，随后 transitionend 应触发重排
  fab.style.top = '400px';
  panel.setNaturalHeight(300);
  fab.dispatch('transitionend', { propertyName: 'top', target: fab });
  eq(parseFloat(panel.style.top), 400, '过渡结束后面板与按钮新的位置对齐');
}

console.log('\n重置设置后重新应用默认位置');
{
  const { fab, state } = setup({ side: 'left', top: 400 });
  eq(fab.style.left, '8px', '初始在左侧');
  state.settings.fabPos = { side: 'right', top: 18 };
  state.applyFabPosition();
  eq(fab.style.right, '8px', 'applyFabPosition 暴露在 state 上，重置后回到右侧');
}

console.log('');
if (failed === 0) {
  console.log(`全部通过 ✅  passed=${passed}  failed=0`);
  process.exit(0);
} else {
  console.log(`有失败 ❌  passed=${passed}  failed=${failed}`);
  process.exit(1);
}
