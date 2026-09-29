// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Cameron Jago Lis Illustrates.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { $: () => ({}) };
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, '../overlays.js'), 'utf8') +
    ';globalThis.api = { overlayPoints, drawOverlay, validateOverlay };',
  context
);
const { overlayPoints, drawOverlay, validateOverlay } = context.api;
const layer = () => ({
  w: 720, h: 512, overlay: 'stars', stage: 'after', colour: '#ffcc88',
  count: 36, dotSize: 16, variation: 60, spacing: 50, seed: 37,
  animation: 'twinkle', depth: 85, cycles: 2, offset: 0, together: false, travel: 12
});
function drawing(l, time) {
  const calls = [], stack = [];
  const g = { globalAlpha: 1 };
  for (const key of ['translate', 'rotate', 'beginPath', 'arc', 'fill', 'fillRect', 'lineTo', 'moveTo', 'closePath'])
    g[key] = (...args) => calls.push([key, ...args, g.globalAlpha]);
  g.save = () => stack.push(g.globalAlpha);
  g.restore = () => { g.globalAlpha = stack.pop(); };
  g.createRadialGradient = (...args) => {
    calls.push(['gradient', ...args]);
    return { addColorStop: (...stop) => calls.push(['stop', ...stop]) };
  };
  drawOverlay(g, l, time);
  return calls;
}
test('scatter seed keeps marks in place across size and animation edits', () => {
  const l = layer(), first = JSON.stringify(overlayPoints(l));
  l.dotSize = 80; l.animation = 'drift'; l.variation = 0;
  assert.equal(JSON.stringify(overlayPoints(l)), first);
  l.seed++;
  assert.notEqual(JSON.stringify(overlayPoints(l)), first);
  assert.equal(overlayPoints(l).length, l.count);
});
test('every overlay movement closes its loop and the still choice stays still', () => {
  for (const overlay of ['stars', 'sparkles', 'lights', 'dust'])
    for (const animation of ['none', 'twinkle', 'pulse', 'drift']) {
      const l = { ...layer(), overlay, animation };
      assert.deepEqual(drawing(l, 0), drawing(l, 1));
      if (animation === 'none') assert.deepEqual(drawing(l, 0), drawing(l, .137));
      else assert.notDeepEqual(drawing(l, 0), drawing(l, .137));
    }
});
test('zero fade or drift amount stops that mark animation', () => {
  for (const animation of ['twinkle', 'pulse', 'drift']) {
    const l = { ...layer(), animation, depth: 0, travel: 0 };
    assert.deepEqual(drawing(l, 0), drawing(l, .35));
  }
});
test('overlay project validation rejects unbounded and fractional settings', () => {
  assert.doesNotThrow(() => validateOverlay(layer()));
  for (const [key, value] of [['count', 201], ['seed', -1], ['cycles', 1.5], ['dotSize', Infinity], ['travel', NaN], ['colour', 'red'], ['stage', 'unknown']])
    assert.throws(() => validateOverlay({ ...layer(), [key]: value }));
});
test('rendering does not modify saved overlay settings', () => {
  const l = layer(), saved = JSON.stringify(l);
  drawing(l, .4); overlayPoints(l);
  assert.equal(JSON.stringify(l), saved);
});
