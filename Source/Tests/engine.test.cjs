const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../engine.js');

test('new movements are neutral at zero amount with every print style', () => {
  for (const method of D.methods) {
    const s = { ...D.defaults, width: 320, method };
    const base = D.render(source(), s, 0.25);
    for (const motion of ['zoom', 'twist']) {
      const out = D.render(source(), { ...s, motion, amount: 0 }, 0.25);
      assert.deepEqual(out.data, base.data);
      assert.deepEqual(out.glyphs, base.glyphs);
    }
    for (const temporal of ['rings', 'weave']) {
      const out = D.render(source(), { ...s, temporal, temporalAmount: 0 }, 0.25);
      assert.deepEqual(out.data, base.data);
      assert.deepEqual(out.glyphs, base.glyphs);
    }
  }
});
test('Reverse inks swaps rendered colours, not just palette order', () => {
  const s = { ...D.defaults, width: 320, palette: ['#123456', '#fedcba'] };
  for (const method of D.methods.filter((m) => m !== 'ascii')) {
    const normal = D.render(source(), { ...s, method }),
      reversed = D.render(source(), { ...s, method, reverseInks: true });
    for (let i = 0; i < normal.data.length; i += 4) {
      assert.equal(reversed.data[i], 0x12 + 0xfe - normal.data[i], method);
      assert.equal(reversed.data[i + 1], 0x34 + 0xdc - normal.data[i + 1], method);
      assert.equal(reversed.data[i + 2], 0x56 + 0xba - normal.data[i + 2], method);
      assert.equal(reversed.data[i + 3], normal.data[i + 3]);
    }
  }
  const a = D.render(source(), { ...s, method: 'ascii' }),
    b = D.render(source(), { ...s, method: 'ascii', reverseInks: true });
  assert.deepEqual(a.glyphs, b.glyphs);
  assert.notDeepEqual(a.background, b.background);
  assert.notDeepEqual(a.data, b.data);
});
test('temporal textures work with every style and close their loop', () => {
  for (const method of D.methods)
    for (const temporal of ['tide', 'boil', 'roll', 'shimmer', 'rings', 'weave']) {
      const s = {
        ...D.defaults,
        width: 320,
        cell: 5,
        method,
        temporal,
        temporalAmount: 28,
        temporalCycles: 3
      };
      const start = D.render(source(), s, 0),
        mid = D.render(source(), s, 0.125),
        end = D.render(source(), s, 1);
      assert.deepEqual(start.data, end.data, method + ' ' + temporal);
      if (method === 'ascii') assert.notDeepEqual(start.glyphs, mid.glyphs, temporal);
      else assert.notDeepEqual(start.data, mid.data, method + ' ' + temporal);
    }
});
test('effect stack keeps transparency and the selected inks', () => {
  const input = source();
  for (let i = 3; i < input.data.length; i += 8) input.data[i] = 0;
  const s = {
    ...D.defaults,
    width: 320,
    cell: 3,
    transparent: true,
    mapMode: 'trio',
    reverseInks: true,
    rowSlip: 12,
    blockShift: 8,
    rgbSplit: 7,
    scanlines: 30,
    vignette: 22,
    solarize: 20,
    bloom: 65,
    bloomRadius: 4,
    animateEffects: true
  };
  const output = D.render(input, s, 0.125),
    palette = D.inkColours(s).map((h) =>
      [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',')
    );
  for (let i = 0; i < output.data.length; i += 4)
    assert(palette.includes([...output.data.slice(i, i + 3)].join(',')));
  assert(output.data.some((v, i) => i % 4 === 3 && v < 255));
  assert.deepEqual(D.render(input, s, 0).data, D.render(input, s, 1).data);
});
test('custom tile, duet and diffusion controls alter the marks', () => {
  const s = { ...D.defaults, width: 320 },
    input = source(),
    base = D.render(input, s);
  for (const change of [
    { method: 'custom', tile: Array(16).fill(2) },
    { duet: 'grain', duetBalance: 30 },
    { patternX: 1 },
    { patternY: 1 }
  ])
    assert.notDeepEqual(base.data, D.render(input, { ...s, ...change }).data);
  const a = D.render(input, { ...s, method: 'jjn' });
  for (const change of [{ serpentine: false }, { diffusionReach: 3 }])
    assert.notDeepEqual(a.data, D.render(input, { ...s, method: 'jjn', ...change }).data);
});
test('new file fields reject invalid input and never share mutable defaults', () => {
  for (const bad of [
    { tile: [1] },
    { tile: Array(16).fill(20) },
    { mapMode: 'unknown' },
    { mapColours: ['bad'] },
    { temporalCycles: 1.5 },
    { reverseInks: 'yes' },
    { duet: 'random' },
    { bloomRadius: 100 }
  ])
    assert.throws(() => D.settings({ ...D.defaults, ...bad }));
  const a = D.settings({});
  a.tile[0] = 15;
  a.mapColours[0] = '#ffffff';
  assert.equal(D.defaults.tile[0], 0);
  assert.equal(D.defaults.mapColours[0], '#302547');
});
test('texture controls change the print without changing dimensions', () => {
  const input = source(),
    settings = { ...D.defaults, width: 320, cell: 2 };
  const base = D.render(input, settings);
  for (const change of [
    { patternScale: 2 },
    { patternAngle: 37 },
    { grain: 40 },
    { posterize: 3 },
    { edge: 100 }
  ]) {
    const out = D.render(input, { ...settings, ...change });
    assert.equal(out.outputWidth, base.outputWidth);
    assert.equal(out.outputHeight, base.outputHeight);
    assert.notDeepEqual(out.data, base.data, JSON.stringify(change));
  }
});
test('new pattern styles loop with transformed pattern coordinates', () => {
  for (const method of ['crosshatch', 'rings', 'burkes', 'sierra']) {
    const settings = {
      ...D.defaults,
      width: 320,
      method,
      motion: 'crawl',
      patternAngle: -83,
      patternScale: 0.5,
      grain: 12
    };
    assert.deepEqual(D.render(source(), settings, 0).data, D.render(source(), settings, 1).data);
  }
});
function source() {
  const width = 96,
    height = 72,
    data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data.set([(x / 95) * 255, (y / 71) * 255, ((x + y) / 166) * 255, 255], i);
    }
  return { width, height, data };
}
test('ordered matrices visit every threshold once', () => {
  for (const n of [2, 4, 8])
    assert.deepEqual(
      D.bayer(n)
        .flat()
        .sort((a, b) => a - b),
      Array.from({ length: n * n }, (_, i) => i)
    );
});
for (const method of D.methods)
  test(method + ' renders deterministically and preserves inputs', () => {
    const src = source(),
      before = src.data.slice(),
      settings = { ...D.defaults, width: 320, method };
    const a = D.render(src, settings),
      b = D.render(src, settings);
    assert.deepEqual(a, b);
    assert.deepEqual(src.data, before);
    assert.equal(a.data.length, a.width * a.height * 4);
    assert.equal(a.outputWidth, 320);
    assert.equal(a.outputHeight, 240);
    for (let i = 0; i < a.data.length; i += 4) {
      assert.equal(a.data[i + 3], 255);
      assert(['40,62,80', '252,246,231'].includes([...a.data.slice(i, i + 3)].join(',')));
    }
    if (method === 'ascii') assert.equal(a.glyphs.length, a.width * a.height);
  });
for (const motion of D.motions)
  test(motion + ' closes the loop exactly', () => {
    const s = { ...D.defaults, width: 320, motion };
    const a = D.render(source(), s, 0),
      b = D.render(source(), s, 1);
    assert.deepEqual(a, b);
    if (motion !== 'none') assert.notDeepEqual(a.data, D.render(source(), s, 0.25).data);
  });
test('disabled dither gives the same result as nearest palette', () => {
  for (const method of ['bayer2', 'bayer4', 'bayer8', 'floyd', 'atkinson', 'grain'])
    assert.deepEqual(
      D.render(source(), { ...D.defaults, width: 320, method, strength: 0 }).data,
      D.render(source(), { ...D.defaults, width: 320, method: 'threshold' }).data
    );
});
test('transparent source remains transparent', () => {
  const src = source();
  for (let i = 3; i < src.data.length; i += 4) src.data[i] = 0;
  const out = D.render(src, { ...D.defaults, width: 320, transparent: true });
  assert(out.data.every((v, i) => i % 4 !== 3 || v === 0));
});
test('settings reject corrupt, huge and unsupported input', () => {
  for (const change of [
    { width: 50000 },
    { method: 'bad' },
    { cell: 0 },
    { fps: NaN },
    { palette: ['red', 'blue'] },
    { palette: ['#ffffff'] },
    { chars: 'a' },
    { motion: 'bad' },
    { invert: 1 }
  ])
    assert.throws(() => D.settings({ ...D.defaults, ...change }));
});
test('two-column image does not diffuse outside its buffer', () => {
  const src = { width: 2, height: 20, data: new Uint8ClampedArray(160).fill(180) };
  for (let i = 3; i < src.data.length; i += 4) src.data[i] = 255;
  for (const method of ['floyd', 'atkinson']) {
    const out = D.render(src, { ...D.defaults, width: 320, cell: 24, method });
    assert(out.data.every(Number.isFinite));
  }
});
