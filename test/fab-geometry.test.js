/* 浮动按钮几何逻辑测试：用假 DOM 模拟布局，验证贴边/夹紧/面板跟随的数值
 * node geom.test.js
 */
'use strict';

const VW = 1280, VH = 800;
const FAB_W = 76, FAB_H = 38;
const PANEL_W = 344, PANEL_H = 260;
const FAB_MARGIN = 8;
const FAB_GAP = 6;
const PANEL_GUTTER = 8;

function makeFab() {
  const style = { left: 'auto', right: '8px', top: '8px' };
  const fab = {
    style,
    offsetWidth: FAB_W,
    offsetHeight: FAB_H,
    getBoundingClientRect() {
      const left = style.left !== 'auto' ? parseFloat(style.left) : VW - parseFloat(style.right) - FAB_W;
      const top = parseFloat(style.top) || 0;
      return { left, top, right: left + FAB_W, bottom: top + FAB_H, width: FAB_W, height: FAB_H };
    },
  };
  return fab;
}

function makePanel(vw = VW, vh = VH) {
  const style = { left: 'auto', right: '8px', top: '66px', maxHeight: '' };
  let hidden = true;
  const width = () => (style.width ? parseFloat(style.width) : PANEL_W);
  const height = () => {
    if (hidden) return 0;
    const mh = parseFloat(style.maxHeight);
    return Number.isFinite(mh) ? Math.min(PANEL_H, mh) : PANEL_H;
  };
  return {
    style,
    get hidden() { return hidden; },
    set hidden(v) { hidden = v; },
    get offsetHeight() { return height(); },
    getBoundingClientRect() {
      const w = width();
      const left = style.left !== 'auto' ? parseFloat(style.left) : vw - parseFloat(style.right) - w;
      const top = parseFloat(style.top) || 0;
      return { left, top, right: left + w, bottom: top + height(), width: w, height: height() };
    },
  };
}

function build(vw = VW, vh = VH) {
  const fab = makeFab();
  const panel = makePanel(vw, vh);
  const win = { innerWidth: vw, innerHeight: vh };

  function clampFabTop(top) {
    const h = fab.offsetHeight || 38;
    const max = Math.max(FAB_MARGIN, win.innerHeight - h - FAB_MARGIN);
    return Math.max(FAB_MARGIN, Math.min(max, top));
  }

  function applyFabPosition(pos) {
    const p = pos || {};
    const side = p.side === 'left' ? 'left' : 'right';
    const top = clampFabTop(typeof p.top === 'number' ? p.top : FAB_MARGIN);
    fab.style.top = Math.round(top) + 'px';
    if (side === 'left') {
      fab.style.left = FAB_MARGIN + 'px';
      fab.style.right = 'auto';
    } else {
      fab.style.left = 'auto';
      fab.style.right = FAB_MARGIN + 'px';
    }
  }

  function positionPanel() {
    if (panel.hidden) return;
    const vw2 = win.innerWidth;
    const vh2 = win.innerHeight;

    panel.style.width = Math.round(Math.max(220, Math.min(344, vw2 - PANEL_GUTTER * 2))) + 'px';
    panel.style.maxHeight = Math.max(160, vh2 - PANEL_GUTTER * 2) + 'px';

    const fr = fab.getBoundingClientRect();
    let onLeft = fr.left + fr.width / 2 < vw2 / 2;
    const space = onLeft ? vw2 - fr.right - FAB_GAP - PANEL_GUTTER : fr.left - FAB_GAP - PANEL_GUTTER;
    if (space < 260) onLeft = !onLeft;

    panel.style.left = 'auto';
    panel.style.right = 'auto';
    if (onLeft) panel.style.left = Math.round(fr.right + FAB_GAP) + 'px';
    else panel.style.right = Math.round(Math.max(vw2 - fr.left + FAB_GAP, PANEL_GUTTER)) + 'px';

    const ph = panel.offsetHeight;
    const top = Math.max(PANEL_GUTTER, Math.min(fr.top, vh2 - ph - PANEL_GUTTER));
    panel.style.top = Math.round(top) + 'px';
    panel.style.maxHeight = Math.round(Math.max(120, vh2 - top - PANEL_GUTTER)) + 'px';

    const pr = panel.getBoundingClientRect();
    if (pr.right > vw2 - PANEL_GUTTER) {
      panel.style.left = Math.round(vw2 - pr.width - PANEL_GUTTER) + 'px';
      panel.style.right = 'auto';
    } else if (pr.left < PANEL_GUTTER) {
      panel.style.left = PANEL_GUTTER + 'px';
      panel.style.right = 'auto';
    }
  }

  return { fab, panel, clampFabTop, applyFabPosition, positionPanel };
}

let passed = 0, failed = 0;
function eq(actual, expected, label) {
  if (actual === expected) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.log(`  ✗ ${label}\n      期望: ${expected}\n      实际: ${actual}`); }
}

console.log('applyFabPosition');
{
  const { fab, applyFabPosition } = build();
  applyFabPosition({ side: 'right', top: 100 });
  eq(fab.style.right, '8px', '右侧：right=8px');
  eq(fab.style.left, 'auto', '右侧：left=auto');
  eq(fab.style.top, '100px', 'top=100px');

  applyFabPosition({ side: 'left', top: 250 });
  eq(fab.style.left, '8px', '左侧：left=8px');
  eq(fab.style.right, 'auto', '左侧：right=auto');
  eq(fab.style.top, '250px', 'top=250px');
}

console.log('\nclampFabTop');
{
  const { clampFabTop } = build();
  eq(clampFabTop(99999), VH - FAB_H - FAB_MARGIN, '超下边界 → 800-38-8=754');
  eq(clampFabTop(-90), FAB_MARGIN, '超上边界 → 8');
  eq(clampFabTop(300), 300, '正常值不变');
}

console.log('\npositionPanel — 按钮在左侧');
{
  const { fab, panel, applyFabPosition, positionPanel } = build();
  applyFabPosition({ side: 'left', top: 100 });
  panel.hidden = false;
  positionPanel();
  eq(panel.style.left, `${8 + FAB_W + 6}px`, '面板 left = fab.right + 6 = 90px');
  eq(panel.style.right, 'auto', '面板 right = auto');
  eq(panel.style.top, '100px', '面板与按钮顶部对齐');
}

console.log('\npositionPanel — 按钮在右侧');
{
  const { fab, panel, applyFabPosition, positionPanel } = build();
  applyFabPosition({ side: 'right', top: 120 });
  panel.hidden = false;
  positionPanel();
  const fabLeft = VW - FAB_MARGIN - FAB_W; // 1196
  eq(panel.style.right, `${VW - fabLeft + FAB_GAP}px`, '面板 right = vw - fab.left + 6 = 90px');
  eq(panel.style.left, 'auto', '面板 left = auto');
  const pr = panel.getBoundingClientRect();
  eq(Math.round(pr.right), Math.round(fabLeft - FAB_GAP), '面板右边缘紧贴按钮左侧 6px');
  eq(panel.style.top, '120px', '顶部与按钮对齐');
}

console.log('\npositionPanel — 按钮贴近底部时夹紧');
{
  const { fab, panel, applyFabPosition, positionPanel } = build();
  applyFabPosition({ side: 'right', top: 700 });
  panel.hidden = false;
  positionPanel();
  eq(parseFloat(panel.style.top), VH - PANEL_H - PANEL_GUTTER, '面板 top 夹到 800-260-8=532');
  eq(parseFloat(panel.style.maxHeight), VH - (VH - PANEL_H - PANEL_GUTTER) - PANEL_GUTTER, '可用高度 = 260');
}

console.log('\npositionPanel — 面板高于视口时底部贴边');
{
  const { fab, panel, applyFabPosition, positionPanel } = build();
  panel.style.maxHeight = '9999px';
  // 伪造很高的内容：把面板高度换成视口上限
  Object.defineProperty(panel, 'offsetHeight', { get() { return panel.hidden ? 0 : VH - 16; } });
  applyFabPosition({ side: 'right', top: 500 });
  panel.hidden = false;
  positionPanel();
  eq(parseFloat(panel.style.top), PANEL_GUTTER, '顶部夹到 8px');
  eq(parseFloat(panel.style.maxHeight), VH - PANEL_GUTTER * 2, '高度 = 784，底部不越界');
}

console.log('\npositionPanel — 窄视口越界修正');
{
  const { fab, panel, applyFabPosition, positionPanel } = build(380, 800);
  applyFabPosition({ side: 'left', top: 100 });
  panel.hidden = false;
  positionPanel();
  eq(parseFloat(panel.style.left), 380 - PANEL_W - PANEL_GUTTER, '面板 left 修正为 380-344-8=28');
}

console.log('\n贴边判定（拖动松手）');
{
  const decide = (left) => (left + FAB_W / 2 < VW / 2 ? 'left' : 'right');
  eq(decide(10), 'left', '按钮中心在左半区 → 左贴边');
  eq(decide(1000), 'right', '按钮中心在右半区 → 右贴边');
  eq(decide(601), 'left', '中心 639 < 640 → left');
  eq(decide(603), 'right', '中心 641 > 640 → right');
}

console.log('\n面板隐藏时不重排');
{
  const { panel, positionPanel } = build();
  panel.hidden = true;
  const before = panel.style.top;
  positionPanel();
  eq(panel.style.top, before, 'hidden 时 style 不变');
}

console.log('');
if (failed === 0) {
  console.log(`全部通过 ✅  passed=${passed}  failed=0`);
  process.exit(0);
} else {
  console.log(`有失败 ❌  passed=${passed}  failed=${failed}`);
  process.exit(1);
}
