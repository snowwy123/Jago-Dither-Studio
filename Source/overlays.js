// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Cameron Jago Lis Illustrates.
'use strict';

const overlayNames = {
  stars: 'A few little stars',
  sparkles: 'Something sparkling',
  lights: 'Lights in the distance',
  dust: 'Dust in the sunshine'
};
const scatterCache = new Map();
function addOverlay() {
  if (scene.layers.length >= 12) return toast('There is room for 12 layers.');
  const l = {
    ...layerBase(overlayNames.stars, 'overlay'),
    w: scene.width,
    h: scene.height,
    overlay: 'stars',
    stage: 'after',
    colour: '#fff0b5',
    count: 36,
    dotSize: Math.max(1, Math.round(Math.min(scene.width, scene.height) / 45)),
    variation: 65,
    spacing: 50,
    seed: 37,
    animation: 'twinkle',
    depth: 85,
    cycles: 1,
    together: false,
    travel: 12
  };
  scene.layers.push(l);
  scene.active = l.id;
  changedLayer();
  showTab('layers');
  $('overlayKind').focus();
  toast('Overlay added. Press Play to see it twinkle.');
}
function overlayMoves(l) {
  return (
    l.kind === 'overlay' &&
    l.animation !== 'none' &&
    (l.animation === 'drift' ? l.travel > 0 : l.depth > 0)
  );
}
function afterOverlays() {
  return scene.layers.some(
    (l) => l.kind === 'overlay' && l.stage === 'after' && l.visible && l.opacity > 0
  );
}
function overlayPoints(l) {
  const key = [l.w, l.h, l.count, l.spacing, l.seed].join('/');
  if (scatterCache.has(key)) return scatterCache.get(key);
  let seed = l.seed >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const points = [],
    gap = (Math.sqrt((l.w * l.h) / l.count) * 0.7 * l.spacing) / 100;
  for (let i = 0; i < l.count; i++) {
    let x, y;
    for (let tries = 0; tries < 80; tries++) {
      x = random() * 0.94 + 0.03;
      y = random() * 0.94 + 0.03;
      if (points.every((p) => Math.hypot((p.x - x) * l.w, (p.y - y) * l.h) >= gap)) break;
    }
    points.push({ x, y, size: random(), offset: random(), angle: random() * Math.PI * 2 });
  }
  if (scatterCache.size >= 32) scatterCache.delete(scatterCache.keys().next().value);
  scatterCache.set(key, points);
  return points;
}
function drawOverlay(g, l, t) {
  const time = ((t % 1) + 1) % 1,
    tau = Math.PI * 2;
  for (const p of overlayPoints(l)) {
    const a = (time * l.cycles + l.offset / 100 + (l.together ? 0 : p.offset)) * tau;
    let brightness = 1,
      dx = 0,
      dy = 0;
    if (l.animation === 'twinkle')
      brightness = 1 - l.depth / 100 + (l.depth / 100) * Math.pow((1 + Math.sin(a)) / 2, 3);
    if (l.animation === 'pulse') brightness = 1 - ((l.depth / 100) * (1 - Math.sin(a))) / 2;
    if (l.animation === 'drift') {
      dx = Math.sin(a) * l.travel;
      dy = (Math.cos(a) - 1) * l.travel * 0.5;
    }
    const r = (l.dotSize * (1 - (l.variation / 100) * (1 - p.size))) / 2;
    g.save();
    g.translate((p.x - 0.5) * l.w + dx, (p.y - 0.5) * l.h + dy);
    g.globalAlpha *= brightness;
    g.fillStyle = l.colour;
    if (l.overlay === 'lights') {
      const glow = g.createRadialGradient(0, 0, 0, 0, 0, r * 2);
      glow.addColorStop(0, l.colour);
      glow.addColorStop(0.2, l.colour + 'c0');
      glow.addColorStop(1, l.colour + '00');
      g.fillStyle = glow;
      g.fillRect(-r * 2, -r * 2, r * 4, r * 4);
    } else if (l.overlay === 'dust') {
      g.beginPath();
      g.arc(0, 0, r, 0, tau);
      g.fill();
    } else {
      const tips = l.overlay === 'stars' ? 5 : 4;
      g.rotate(l.overlay === 'stars' ? p.angle : 0);
      g.beginPath();
      for (let i = 0; i < tips * 2; i++) {
        const angle = (i * Math.PI) / tips - Math.PI / 2;
        const radius = i % 2 ? r * (tips === 5 ? 0.43 : 0.22) : r;
        const x = Math.cos(angle) * radius,
          y = Math.sin(angle) * radius;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.closePath();
      g.fill();
    }
    g.restore();
  }
}
function paintAfterOverlays(canvas, t) {
  if (!afterOverlays()) return;
  const g = canvas.getContext('2d');
  g.save();
  g.scale(canvas.width / scene.width, canvas.height / scene.height);
  for (const l of scene.layers) {
    if (l.kind !== 'overlay' || l.stage !== 'after' || !l.visible || !l.opacity) continue;
    const p = layerPose(l, t);
    g.save();
    g.globalAlpha = l.opacity / 100;
    g.globalCompositeOperation = l.blend;
    g.translate(p.x, p.y);
    g.rotate((p.angle * Math.PI) / 180);
    g.scale(p.scale * (l.flipX ? -1 : 1), p.scale * (l.flipY ? -1 : 1));
    drawOverlay(g, l, t);
    g.restore();
  }
  g.restore();
}
function validateOverlay(l) {
  const range = (key, low, high, integer = false) =>
    Number.isFinite(l[key]) &&
    l[key] >= low &&
    l[key] <= high &&
    (!integer || Number.isInteger(l[key]));
  if (
    !Object.hasOwn(overlayNames, l.overlay) ||
    !['before', 'after'].includes(l.stage) ||
    !['none', 'twinkle', 'pulse', 'drift'].includes(l.animation) ||
    !/^#[\da-f]{6}$/i.test(l.colour) ||
    !range('w', 16, 2048) ||
    !range('h', 16, 2048) ||
    !range('count', 1, 200, true) ||
    !range('dotSize', 1, 160) ||
    !range('variation', 0, 95) ||
    !range('spacing', 0, 100) ||
    !range('seed', 0, 999999, true) ||
    !range('depth', 0, 100) ||
    !range('cycles', 1, 8, true) ||
    !range('travel', 0, 100) ||
    typeof l.together !== 'boolean'
  )
    throw Error('This project has invalid overlay settings.');
}
function syncOverlay(l) {
  $('overlaySettings').hidden = l?.kind !== 'overlay';
  if (l?.kind !== 'overlay') return;
  const moving = l.animation !== 'none';
  $('overlayFade').hidden = !['twinkle', 'pulse'].includes(l.animation);
  $('overlayDrift').hidden = l.animation !== 'drift';
  $('overlayTiming').hidden = !moving;
  $('overlayStageHint').textContent =
    l.stage === 'before'
      ? 'Printed with your pictures, using the selected inks and effects. Its position in the layer list matters.'
      : 'Above the finished print, keeping its own colour. After-print overlays sit above all printed layers; reorder them to stack them with each other.';
}
$('addOverlay').onclick = addOverlay;
$('reshuffleOverlay').onclick = () => {
  const l = selectedLayer();
  if (l?.kind !== 'overlay') return;
  l.seed = (l.seed + 7919) % 1000000;
  changedLayer();
};
