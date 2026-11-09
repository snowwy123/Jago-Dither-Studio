const test = require("node:test"),
  assert = require("node:assert/strict"),
  D = require("../engine.js"),
  S = require("../studio-engine.js");
function source(w = 48, h = 32) {
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
function settings(value) {
  return D.settings({ width: 320, studio: value });
}
test("all screen masks are distinct, deterministic, bounded and preserve input", () => {
  const src = source(),
    copy = src.data.slice(),
    results = [];
  for (const screenMask of ["rgb", "bgr", "dots", "slots"]) {
    const s = settings({ family: "screen", screenMask });
    const a = D.render(src, s, 0.25),
      b = D.render(src, s, 0.25);
    assert.deepEqual(a.data, b.data);
    assert.equal(a.width, 320);
    assert(a.data.some((v) => v > 20));
    results.push(Buffer.from(a.data).toString("base64"));
  }
  assert.equal(new Set(results).size, 4);
  assert.deepEqual(src.data, copy);
});
test("warp cycles meet exactly and order changes screen output", () => {
  const src = source(),
    s = settings({ family: "screen", warp: "wave", warpAnimate: true });
  assert.deepEqual(D.render(src, s, 0).data, D.render(src, s, 1).data);
  assert.notDeepEqual(
    D.render(src, s, 0.3).data,
    D.render(
      src,
      { ...s, studio: { ...s.studio, order: "treatment-first" } },
      0.3,
    ).data,
  );
});
test("resolved character grid contains whole graphemes and edited cells", () => {
  const src = source(),
    s = settings({
      family: "characters",
      charset: " .█",
      overrides: [{ x: 2, y: 1, ch: "é" }],
    }),
    glyphs = {};
  for (const ch of [" ", ".", "█", "é"])
    glyphs[ch] = {
      mask: Uint8Array.from({ length: 24 }, () => (ch === " " ? 0 : 255)),
      density: ch === " " ? 0 : ch === "." ? 0.2 : 1,
    };
  const out = D.render(src, s, 0, { atlas: { width: 4, height: 6, glyphs } });
  assert.equal(out.characterGrid.glyphs[s.studio.columns + 2], "é");
  assert.equal(
    out.characterGrid.glyphs.length,
    out.characterGrid.rows * s.studio.columns,
  );
  assert(out.data.some((v) => v > 0));
});
test("light and dark character polarity reverse density mapping", () => {
  const src = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([255, 255, 255, 255]),
    },
    s = settings({ family: "characters", charset: " .█", columns: 12 });
  assert.equal(D.render(src, s).characterGrid.glyphs[0], "█");
  assert.equal(
    D.render(src, { ...s, studio: { ...s.studio, charPolarity: "dark" } })
      .characterGrid.glyphs[0],
    " ",
  );
});
test("palettes are repeatable, bounded and skip invisible pixels", () => {
  const src = source();
  assert.deepEqual(S.palette(src, 6), S.palette(src, 6));
  assert.equal(S.palette(src, 6).length, 6);
  src.data.fill(0);
  assert.deepEqual(S.palette(src, 4), ["#000000", "#ffffff"]);
});
test("previous frame and seam rendering has no mutable frame history", () => {
  const src = source(),
    prev = source();
  prev.data.fill(100);
  const s = settings({ family: "screen", temporalBlend: 0.3, seamBlend: 0.3 }),
    context = { previousSource: prev, seamSource: prev };
  const a = D.render(src, s, 0.95, context);
  D.render(src, s, 0.1, {});
  assert.deepEqual(a.data, D.render(src, s, 0.95, context).data);
  assert.notDeepEqual(a.data, D.render(src, s, 0.95, {}).data);
});
test("new settings reject malformed edits, invalid numbers and unsafe choices", () => {
  for (const value of [
    { warpAmount: Infinity },
    { columns: 0 },
    { charPolarity: "eval" },
    { overrides: [{ x: -1, y: 0, ch: "#" }] },
    { charset: "a\n" },
  ])
    assert.throws(() => settings(value));
  const a = settings({}),
    b = settings({});
  a.studio.overrides.push({ x: 0, y: 0, ch: "a" });
  assert.equal(b.studio.overrides.length, 0);
});
test("new ink controls affect plates and remain repeatable", () => {
  const src = source(),
    s = D.settings({
      width: 320,
      riso: { enabled: true, screen: "crosshatch" },
    }),
    a = D.render(src, s),
    b = D.render(src, {
      ...s,
      riso: {
        ...s.riso,
        paperFibres: 0.7,
        absorption: 0.8,
        inks: s.riso.inks.map((i) => ({
          ...i,
          spacingScale: 1.5,
          roughness: 0.3,
          spread: 10,
        })),
      },
    });
  assert.notDeepEqual(a.plates, b.plates);
  assert.notDeepEqual(a.data, b.data);
  assert.deepEqual(
    b.data,
    D.render(src, {
      ...s,
      riso: {
        ...s.riso,
        paperFibres: 0.7,
        absorption: 0.8,
        inks: s.riso.inks.map((i) => ({
          ...i,
          spacingScale: 1.5,
          roughness: 0.3,
          spread: 10,
        })),
      },
    }).data,
  );
});
test("screen transparency retains straight RGB instead of darkening twice", () => {
  const data = new Uint8ClampedArray(16 * 16 * 4).fill(128);
  for (let i = 0; i < data.length; i += 4) data.set([220, 160, 80, 128], i);
  const src = { width: 16, height: 16, data },
    s = settings({ family: "screen", screenGlow: 0 }),
    half = D.render(src, { ...s, transparent: true });
  const solid = { ...src, data: src.data.slice() };
  for (let i = 3; i < solid.data.length; i += 4) solid.data[i] = 255;
  const full = D.render(solid, { ...s, transparent: true });
  for (let i = 0; i < half.data.length; i++) {
    if (i % 4 === 3) assert.equal(half.data[i], 128);
    else assert.equal(half.data[i], full.data[i]);
  }
});
test("source movement works in both new treatments and closes its cycle", () => {
  const src = source();
  for (const family of ["screen", "characters"]) {
    const s = { ...settings({ family }), motion: "ripple", amount: 15 };
    const a = D.render(src, s, 0),
      b = D.render(src, s, 0.3);
    assert.deepEqual(a.data, D.render(src, s, 1).data);
    if (family === "characters")
      assert.notDeepEqual(a.characterGrid.glyphs, b.characterGrid.glyphs);
    else assert.notDeepEqual(a.data, b.data);
  }
});
test("gradient middle stop and linear-light blending are authored controls", () => {
  const s = settings({ gradientSpace: "linear" });
  s.mapMode = "duo";
  s.mapColours = ["#000000", "#ff0000", "#ffffff"];
  const c = S.gradient([127.5, 127.5, 127.5], s);
  assert(c.every((v) => v >= 187 && v <= 189));
  s.mapMode = "trio";
  s.studio.gradientMid = 0.25;
  assert.deepEqual(S.gradient([63.75, 63.75, 63.75], s), [255, 0, 0]);
  s.studio.gradientMid = 0.75;
  assert.notDeepEqual(S.gradient([63.75, 63.75, 63.75], s), [255, 0, 0]);
});
test("edits beyond a changed column count do not wrap into a different row", () => {
  const src = source(),
    s = settings({
      family: "characters",
      columns: 12,
      overrides: [{ x: 13, y: 0, ch: "Z" }],
    });
  const g = D.render(src, s).characterGrid;
  assert(!g.glyphs.includes("Z"));
});
test("texture movement remains deterministic and cyclic in screen treatments", () => {
  for (const temporal of [
    "tide",
    "roll",
    "rings",
    "weave",
    "shimmer",
    "boil",
  ]) {
    const s = {
        ...settings({ family: "screen" }),
        temporal,
        temporalAmount: 25,
        temporalCycles: 2,
      },
      src = source(),
      a = D.render(src, s, 0);
    assert.deepEqual(a.data, D.render(src, s, 1).data);
    assert.notDeepEqual(a.data, D.render(src, s, 0.17).data);
  }
});
