const test = require("node:test"),
  assert = require("node:assert/strict"),
  O = require("../optics-engine.js"),
  D = require("../engine.js");
function source(w = 64, h = 48) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      data.set(
        [(x / w) * 255, (y / h) * 255, ((x + y) / (w + h)) * 255, 255],
        i,
      );
    }
  return { width: w, height: h, data };
}
const config = (v) => O.settings(v),
  settings = (o = {}, s = {}) =>
    D.settings({ width: 320, studio: { ...s, optics: o } });

test("fisheye approaches identity smoothly at small nonzero strength", () => {
  const p = O.coordinates(
    0.8,
    0.7,
    config({ lensType: "fisheye", lensAmount: 0.00001 }),
    1,
  );
  assert(Math.abs(p[0] - 0.8) < 1e-8 && Math.abs(p[1] - 0.7) < 1e-8);
});

test("halation extends soft alpha beyond a cutout without an opaque background", () => {
  const src = source(16, 16);
  src.data.fill(0);
  src.data.set([255, 255, 255, 255], (8 * 16 + 8) * 4);
  const out = O.halation(
    src,
    config({
      halationEnabled: true,
      halation: 1,
      halationRadius: 3,
      halationThreshold: 0.2,
    }),
  );
  const a = out.data[(8 * 16 + 9) * 4 + 3];
  assert(a > 0 && a < 255);
  assert.equal(out.data[3], 0);
  assert.equal(out.data[(8 * 16 + 8) * 4 + 3], 255);
});
test("new stages are inactive by default and settings own their arrays", () => {
  const a = config({}),
    b = config({});
  a.paint.push({ x: 0.5, y: 0.5, r: 0.1, amount: 1, softness: 0.5 });
  a.memory.dither.cell = 8;
  assert.equal(b.paint.length, 0);
  assert.equal(b.memory.dither.cell, 3);
  assert.equal(O.active(b, D.defaults.studio, false), false);
});
test("validation rejects non-finite, oversized, malformed and reversed mask controls", () => {
  for (const bad of [
    { lensAmount: Infinity },
    { lensType: "execute" },
    { cellLow: 0.5, cellHigh: 0.1 },
    { paint: [{ x: 3, y: 0.5, r: 0.1, amount: 1, softness: 0.5 }] },
    { paint: Array(2049).fill({}) },
    { picked: ["javascript:abc"] },
    { memory: { dither: { method: "<script>" } } },
  ])
    assert.throws(() => config(bad));
});
test("source highlight and saturation targets are soft, invertible and distinct", () => {
  const src = {
      width: 3,
      height: 1,
      data: new Uint8ClampedArray([
        0, 0, 0, 255, 255, 20, 20, 255, 255, 255, 255, 255,
      ]),
    },
    a = O.mask(src, config({ target: "highlights" })),
    b = O.mask(src, config({ target: "saturated" }));
  assert.equal(a[0], 0);
  assert.equal(a[2], 1);
  assert.equal(b[2], 0);
  assert.equal(b[1], 1);
  const inv = O.mask(src, config({ target: "highlights", maskInvert: true }));
  a.forEach((v, i) => assert(Math.abs(v + inv[i] - 1) < 1e-6));
});
test("picked-colour target selects red without selecting blue", () => {
  const src = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]),
    },
    m = O.mask(
      src,
      config({ target: "picked", picked: ["#ff0000"], tolerance: 0.05 }),
    );
  assert.equal(m[0], 1);
  assert.equal(m[1], 0);
});
test("paint and erase are deterministic and cache data cannot be mutated by consumers", () => {
  const stamps = [{ x: 0.5, y: 0.5, r: 0.25, amount: 1, softness: 0.5 }],
    a = O.paintMask(80, 60, stamps);
  assert(a[30 * 80 + 40] > 0.9);
  assert.equal(a[0], 0);
  a.fill(0);
  assert(O.paintMask(80, 60, stamps)[30 * 80 + 40] > 0.9);
  const b = O.paintMask(80, 60, [
    ...stamps,
    { x: 0.5, y: 0.5, r: 0.1, amount: -1, softness: 0 },
  ]);
  assert.equal(b[30 * 80 + 40], 0);
});
test("mask composition preserves untreated pixels and straight alpha", () => {
  const source = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([10, 20, 30, 128, 240, 240, 240, 128]),
    },
    treated = {
      ...source,
      data: new Uint8ClampedArray([255, 0, 0, 128, 255, 0, 0, 128]),
    },
    result = O.select(
      treated,
      source,
      config({
        maskEnabled: true,
        target: "highlights",
        targetLow: 0.2,
        targetHigh: 0.7,
      }),
    );
  assert.deepEqual(result.data.slice(0, 4), source.data.slice(0, 4));
  assert.deepEqual(result.data.slice(4, 8), treated.data.slice(4, 8));
});
test("soft screen shadow protection darkens shadows without crushing lit cells", () => {
  const data = new Uint8ClampedArray(64 * 32 * 4);
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 64; x++)
      data.set(
        x < 32 ? [40, 20, 30, 255] : [235, 120, 190, 255],
        (y * 64 + x) * 4,
      );
  const src = { width: 64, height: 32, data },
    s = settings({}, { family: "screen", screenGlow: 0, screenBlack: 0 }),
    base = D.render(src, s),
    protectedResult = D.render(
      src,
      settings(
        { protectShadows: true, cellLow: 0.1, cellHigh: 0.5 },
        { family: "screen", screenGlow: 0, screenBlack: 0 },
      ),
    );
  let lowA = 0,
    lowB = 0,
    highA = 0,
    highB = 0;
  for (let i = 0; i < base.width * base.height; i++) {
    const x = i % base.width;
    for (let k = 0; k < 3; k++) {
      if (x < base.width * 0.45) {
        lowA += base.data[i * 4 + k];
        lowB += protectedResult.data[i * 4 + k];
      }
      if (x > base.width * 0.55) {
        highA += base.data[i * 4 + k];
        highB += protectedResult.data[i * 4 + k];
      }
    }
  }
  assert(lowB < lowA * 0.1);
  assert(highB > highA * 0.9);
});
test("all lens styles are distinct, finite, deterministic and bounded", () => {
  const src = source(),
    hashes = [];
  for (const lensType of ["crt", "fisheye", "barrel", "pincushion"]) {
    const s = config({ lensEnabled: true, lensType, lensAmount: 0.7 }),
      out = O.lens(src, s);
    assert.equal(out.data.length, src.data.length);
    assert.deepEqual(out.data, O.lens(src, s).data);
    hashes.push(Buffer.from(out.data).toString("base64"));
    assert(O.fitZoom(s) >= 1);
  }
  assert.equal(new Set(hashes).size, 4);
});
test("transparent lens edges remain cut out and autoframe avoids missing corners", () => {
  const src = source(),
    s = config({
      lensEnabled: true,
      lensType: "barrel",
      lensAmount: 0.9,
      lensAutoFrame: false,
      lensEdge: "transparent",
    }),
    out = O.lens(src, s);
  assert.equal(out.data[3], 0);
  const full = O.lens(src, { ...s, lensAutoFrame: true });
  assert.equal(full.data[3], 255);
  assert.equal(full.data.at(-1), 255);
});
test("lens placement changes whether RGB cells themselves curve", () => {
  const src = source(),
    a = D.render(
      src,
      settings(
        { lensEnabled: true, lensType: "fisheye", lensStage: "source" },
        { family: "screen" },
      ),
    ),
    b = D.render(
      src,
      settings(
        { lensEnabled: true, lensType: "fisheye", lensStage: "screen" },
        { family: "screen" },
      ),
    );
  assert.notDeepEqual(a.data, b.data);
});
test("additional textures combine with a screen and bypass without losing settings", () => {
  const src = source(),
    s = settings(
      { textureEnabled: true, textureMethod: "crosshatch" },
      { family: "screen" },
    ),
    a = D.render(src, s),
    off = D.render(src, {
      ...s,
      studio: {
        ...s.studio,
        optics: { ...s.studio.optics, textureEnabled: false },
      },
    }),
    base = D.render(src, settings({}, { family: "screen" }));
  assert.notDeepEqual(a.data, off.data);
  assert.deepEqual(off.data, base.data);
  assert.equal(s.studio.optics.textureMethod, "crosshatch");
});
test("rolling scanlines loop exactly and each style differs", () => {
  const src = source(),
    hashes = [];
  for (const scanMode of ["display", "crt", "bands"]) {
    const s = config({
      scanEnabled: true,
      scanStrength: 0.7,
      scanRoll: true,
      scanMode,
    });
    const a = O.finish(src, s, 0),
      b = O.finish(src, s, 0.37);
    assert.deepEqual(a.data, O.finish(src, s, 1).data);
    assert.notDeepEqual(a.data, b.data);
    hashes.push(Buffer.from(a.data).toString("base64"));
  }
  assert.equal(new Set(hashes).size, 3);
});
test("halation and finishing respect stage bypasses and source alpha", () => {
  const src = source();
  for (let i = 3; i < src.data.length; i += 4) src.data[i] = 128;
  const halo = config({
    halationEnabled: true,
    halation: 0.6,
    halationThreshold: 0.3,
  });
  assert.notDeepEqual(O.halation(src, halo).data, src.data);
  assert.strictEqual(O.halation(src, { ...halo, lightEnabled: false }), src);
  const finished = O.finish(
    src,
    config({ scanEnabled: true, fringeEnabled: true, vignetteEnabled: true }),
    0.3,
  );
  for (let i = 3; i < finished.data.length; i += 4)
    assert.equal(finished.data[i], 128);
  assert.strictEqual(
    O.finish(src, config({ finishEnabled: false, scanEnabled: true }), 0),
    src,
  );
});
test("phosphor trails use explicit prior frames and are seek-order independent", () => {
  const src = source(),
    prev = source();
  prev.data.fill(240);
  const o = config({ trailsEnabled: true, trails: 0.6, trailThreshold: 0.1 }),
    a = O.finish(src, o, 0.4, prev);
  O.finish(src, o, 0.9, src);
  assert.deepEqual(a.data, O.finish(src, o, 0.4, prev).data);
  assert.notDeepEqual(
    a.data,
    O.finish(src, { ...o, trailsEnabled: false }, 0.4, prev).data,
  );
});
test("overlapping inks can run after screen or characters as an independent stage", () => {
  const src = source(),
    s = settings({ inkStage: "after" }, { family: "screen" });
  s.riso.enabled = true;
  const on = D.render(src, s),
    off = D.render(src, { ...s, riso: { ...s.riso, enabled: false } });
  assert.notDeepEqual(on.data, off.data);
  assert.equal(on.outputWidth, off.outputWidth);
});
test("halftone spread changes ink area and zero preserves the treatment", () => {
  const src = source(),
    base = { ...settings({}), method: "dots", cell: 1 },
    a = D.render(src, base),
    b = D.render(src, {
      ...base,
      studio: {
        ...base.studio,
        optics: { ...base.studio.optics, dotGain: 35 },
      },
    });
  assert.notDeepEqual(a.data, b.data);
});
