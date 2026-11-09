// Run against an extracted 1.9 source archive or the untouched baseline checkout.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
if (!process.env.DITHER_BASELINE_ROOT)
  throw Error("Set DITHER_BASELINE_ROOT to the verified 1.9 source root.");
const Old = require(
    path.join(process.env.DITHER_BASELINE_ROOT, "Source/engine.js"),
  ),
  New = require("../engine.js"),
  hash = (data) => crypto.createHash("sha256").update(data).digest("hex");
const sources = [
  [80, 60],
  [45, 80],
].map(([width, height]) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      data.set(
        [
          (x / width) * 255,
          (y / height) * 255,
          ((x + y) / (width + height)) * 255,
          x < width * 0.15 ? 128 : 255,
        ],
        (y * width + x) * 4,
      );
  return { width, height, data };
});
const variants = [
    {},
    ...["atkinson", "dots", "bayer8", "ascii", "crosshatch"].map((method) => ({
      method,
    })),
    { riso: { enabled: true, screen: "crosshatch" } },
    { studio: { family: "screen", screenMask: "slots", screenGlow: 0.5 } },
    { studio: { family: "characters", columns: 45, charset: " .:+#@" } },
    {
      studio: { family: "screen", warp: "swirl", warpAnimate: true, scan: 0.2 },
    },
    {
      studio: {
        family: "print",
        warp: "wave",
        surface: true,
        sharpen: 0.5,
        ringing: 0.2,
        noise: 0.1,
      },
    },
    {
      studio: {
        family: "characters",
        order: "treatment-first",
        warp: "swirl",
        glyphScale: 0.8,
      },
    },
  ],
  records = [];
for (const source of sources)
  for (const variant of variants)
    for (const phase of [0, 0.37]) {
      const settings = Old.settings({ width: 320, ...variant }),
        a = Old.render(source, settings, phase),
        b = New.render(source, New.settings(settings), phase);
      assert.equal(
        hash(a.data),
        hash(b.data),
        JSON.stringify({ variant, phase }),
      );
      assert.deepEqual(a.glyphs, b.glyphs);
      assert.deepEqual(a.characterGrid, b.characterGrid);
      records.push({
        source: source.width + "x" + source.height,
        variant,
        phase,
        sha256: hash(b.data),
      });
    }
const out =
  process.env.JAGO_PROJECT_TEST_WORK || path.resolve(__dirname, "../../Checks");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, "parity-1.9.json"),
  JSON.stringify({ ok: true, cases: records.length, records }, null, 2),
);
console.log(JSON.stringify({ ok: true, cases: records.length }));
