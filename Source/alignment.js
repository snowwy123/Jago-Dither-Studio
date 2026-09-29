// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Cameron Jago Lis Illustrates.
'use strict';

let savedState = '',
  pendingProjectSave = null;
function stateToSave() {
  const state = snapshot();
  delete state.scene.active;
  return JSON.stringify(state);
}
function checkUnsaved() {
  dirty = stateToSave() !== savedState;
  return dirty;
}
function markSaved() {
  savedState = stateToSave();
  checkUnsaved();
}
if (window.chrome?.webview) {
  window.chrome.webview.addEventListener('message', ({ data }) => {
    if (data?.type !== 'project-save' || data.url !== pendingProjectSave?.url) return;
    if (!data.ok && savedState === pendingProjectSave.state)
      savedState = pendingProjectSave.previous;
    pendingProjectSave = null;
    $('saveBtn').disabled = false;
    checkUnsaved();
    toast(
      data.ok ? 'Project saved.' : 'Save cancelled or interrupted. Your changes are still here.'
    );
  });
}

let viewScale = 1,
  viewX = 0,
  viewY = 0,
  panMode = false,
  panDrag = null;
$('dimensions').onclick = () => {
  showTab('layers');
  $('canvasPreset').scrollIntoView({ block: 'center', behavior: 'smooth' });
};
function zoomPaper(factor, x, y) {
  const box = $('dropZone').getBoundingClientRect();
  x = (x ?? box.left + box.width / 2) - box.left;
  y = (y ?? box.top + box.height / 2) - box.top;
  const old = viewScale;
  viewScale = clamp(old * factor, 0.08, Math.max(scene.width, scene.height) <= 256 ? 40 : 5);
  viewX = x - ((x - viewX) * viewScale) / old;
  viewY = y - ((y - viewY) * viewScale) / old;
  fitView = false;
  fitPaper();
}
$('panBtn').onclick = () => {
  panMode = !panMode;
  $('panBtn').setAttribute('aria-pressed', String(panMode));
  $('dropZone').classList.toggle('pan-mode', panMode);
};
$('dropZone').addEventListener(
  'wheel',
  (e) => {
    if (busy) return;
    e.preventDefault();
    zoomPaper(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
  },
  { passive: false }
);
$('dropZone').addEventListener(
  'pointerdown',
  (e) => {
    if (busy || !(e.button === 1 || (e.button === 0 && panMode))) return;
    e.preventDefault();
    e.stopPropagation();
    panDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, vx: viewX, vy: viewY };
    fitView = false;
    $('dropZone').setPointerCapture(e.pointerId);
  },
  true
);
$('dropZone').addEventListener('pointermove', (e) => {
  if (panDrag?.id !== e.pointerId) return;
  viewX = panDrag.vx + e.clientX - panDrag.x;
  viewY = panDrag.vy + e.clientY - panDrag.y;
  fitPaper();
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
  $('dropZone').addEventListener(event, () => {
    panDrag = null;
  });

function openNewSheet() {
  if (busy) return;
  $('newSheetPreset').value = '960,640';
  $('newSheetWidth').value = 960;
  $('newSheetHeight').value = 640;
  $('newSheetPaper').value = '#fcf6e7';
  $('newSheetClear').checked = false;
  $('newSheetCell').value = '2';
  $('newSheetDialog').showModal();
}
$('newSheetPreset').onchange = (e) => {
  if (e.target.value === 'custom') return;
  const [w, h] = e.target.value.split(',').map(Number);
  $('newSheetWidth').value = w;
  $('newSheetHeight').value = h;
  if (Math.max(w, h) <= 256) $('newSheetCell').value = '1';
};
for (const id of ['newSheetWidth', 'newSheetHeight'])
  $(id).oninput = () => {
    $('newSheetPreset').value = 'custom';
  };
$('createSheet').onclick = () => {
  const width = +$('newSheetWidth').value,
    height = +$('newSheetHeight').value;
  if (
    ![width, height].every((n) => Number.isInteger(n) && n >= 16 && n <= 2048) ||
    width * height > 2097152
  )
    return toast('Use 16–2048 px per side, up to 2,097,152 pixels altogether.');
  pause();
  closeInk();
  scene = {
    width,
    height,
    paper: $('newSheetPaper').value,
    clear: $('newSheetClear').checked,
    layers: [],
    active: ''
  };
  opts.cell = +$('newSheetCell').value;
  opts.transparent = scene.clear;
  sourceName = 'Untitled print';
  phase = 0;
  fitView = true;
  refreshSource(0);
  changedLayer();
  showTab('layers');
  $('newSheetDialog').close();
};

function pagePoint(e) {
  const r = $('paper').getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) * scene.width) / r.width,
    y: ((e.clientY - r.top) * scene.height) / r.height
  };
}
function localPoint(p, centre, angle) {
  const a = (-angle * Math.PI) / 180,
    x = p.x - centre.x,
    y = p.y - centre.y;
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
}
function rotatePoint(x, y, angle) {
  const a = (angle * Math.PI) / 180;
  return { x: x * Math.cos(a) - y * Math.sin(a), y: x * Math.sin(a) + y * Math.cos(a) };
}
function hitLayer(p) {
  const printed = scene.layers.filter((l) => l.kind !== 'overlay' || l.stage !== 'after');
  const above = scene.layers.filter((l) => l.kind === 'overlay' && l.stage === 'after');
  return [...printed, ...above].reverse().find((l) => {
    if (!l.visible || !l.opacity) return false;
    const pose = layerPose(l, phase),
      b = layerSize(l),
      q = localPoint(p, pose, pose.angle);
    return Math.abs(q.x) <= (b.w * pose.scale) / 2 && Math.abs(q.y) <= (b.h * pose.scale) / 2;
  });
}
$('paper').addEventListener('pointerdown', (e) => {
  if (
    busy ||
    panDrag ||
    panMode ||
    e.button !== 0 ||
    $('viewMode').value === 'split' ||
    document.querySelector('[data-tab="layers"]').getAttribute('aria-selected') !== 'true'
  )
    return;
  const p = pagePoint(e),
    grip = e.target.closest('[data-grip]')?.dataset.grip;
  const l = grip ? selectedLayer() : hitLayer(p);
  if (!l) return;
  scene.active = l.id;
  pause();
  syncLayers();
  const pose = layerPose(l, phase),
    b = layerSize(l);
  layerDrag = {
    id: e.pointerId,
    layer: l.id,
    original: copy(l),
    start: p,
    pose,
    grip: grip || 'move'
  };
  if (grip === 'turn') layerDrag.startAngle = Math.atan2(p.y - pose.y, p.x - pose.x);
  else if (grip) {
    const sx = grip.endsWith('e') ? 1 : -1,
      sy = grip.startsWith('s') ? 1 : -1;
    const v = rotatePoint((sx * b.w * pose.scale) / 2, (sy * b.h * pose.scale) / 2, pose.angle);
    layerDrag.anchor = { x: pose.x - v.x, y: pose.y - v.y };
    layerDrag.diagonal = { x: sx * b.w * pose.scale, y: sy * b.h * pose.scale };
  }
  e.preventDefault();
  $('paper').setPointerCapture(e.pointerId);
});
$('paper').addEventListener('pointermove', (e) => {
  const drag = layerDrag;
  if (!drag || e.pointerId !== drag.id) return;
  const l = scene.layers.find((l) => l.id === drag.layer),
    p = pagePoint(e),
    old = drag.original;
  if (!l) return;
  if (drag.grip === 'move') {
    let dx = p.x - drag.start.x,
      dy = p.y - drag.start.y;
    if (e.shiftKey) {
      if (Math.abs(dx) > Math.abs(dy)) dy = 0;
      else dx = 0;
    }
    l.x = clamp(old.x + dx, -2400, 3600);
    l.y = clamp(old.y + dy, -2400, 3600);
  } else if (drag.grip === 'turn') {
    const angle =
      old.rotation +
      ((Math.atan2(p.y - drag.pose.y, p.x - drag.pose.x) - drag.startAngle) * 180) / Math.PI;
    const snapped = e.shiftKey ? Math.round(angle / 15) * 15 : angle;
    l.rotation = ((((snapped + 180) % 360) + 360) % 360) - 180;
  } else {
    const q = localPoint(p, drag.anchor, drag.pose.angle),
      v = drag.diagonal;
    const ratio = (q.x * v.x + q.y * v.y) / (v.x * v.x + v.y * v.y);
    l.scale = clamp(old.scale * ratio, 1, 400);
    const t = l.scale / old.scale,
      delta = rotatePoint((v.x * t) / 2, (v.y * t) / 2, drag.pose.angle);
    l.x = clamp(drag.anchor.x + delta.x - (drag.pose.x - old.x), -2400, 3600);
    l.y = clamp(drag.anchor.y + delta.y - (drag.pose.y - old.y), -2400, 3600);
  }
  composingKey = '';
  syncLayers();
  requestPrint();
});
function finishLayerDrag(cancel = false) {
  if (!layerDrag) return;
  const drag = layerDrag;
  layerDrag = null;
  if (cancel) {
    const i = scene.layers.findIndex((l) => l.id === drag.layer);
    if (i >= 0) scene.layers[i] = drag.original;
    composingKey = '';
    sync();
    requestPrint();
  } else changedLayer();
}
$('paper').addEventListener('pointerup', () => finishLayerDrag());
$('paper').addEventListener('pointercancel', () => finishLayerDrag(true));
$('paper').addEventListener('lostpointercapture', () => finishLayerDrag(true));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && layerDrag) {
    e.preventDefault();
    finishLayerDrag(true);
  }
});
