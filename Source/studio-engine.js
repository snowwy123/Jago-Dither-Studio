// SPDX-License-Identifier: MIT
// Original JAGO screen, character-grid and image-stage renderer.
(function (root) {
  "use strict";
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
    rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)),
    lum = (c) => c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  const Optics =
    typeof module !== "undefined"
      ? require("./optics-engine.js")
      : root.DitherOptics;
  const Riso =
    typeof module !== "undefined" ? require("./riso.js") : root.JagoRiso;
  const defaults = {
    optics: Optics.defaults,
    family: "print",
    gradientMid: 0.5,
    gradientSpace: "srgb",
    order: "warp-first",
    warp: "off",
    warpAmount: 20,
    warpScale: 2,
    warpAnimate: false,
    wrap: false,
    screenMask: "rgb",
    screenColumns: 80,
    screenAspect: 1.2,
    screenGap: 0.22,
    screenGain: 2.2,
    screenBlack: 0.03,
    screenGlow: 0.25,
    screenRadius: 3,
    screenColour: "source",
    screenVertical: false,
    columns: 80,
    cellAspect: 1.6,
    charset: " .:-=+*#%@",
    density: true,
    charPolarity: "light",
    glyphScale: 0.9,
    charColour: "mono",
    ink: "#d7ecc0",
    background: "#07131e",
    overrides: [],
    surface: true,
    sharpen: 0,
    ringing: 0,
    scan: 0,
    noise: 0,
    paletteMode: "locked",
    paletteCount: 4,
    temporalBlend: 0,
    seamBlend: 0,
  };
  const ranges = {
    gradientMid: [0.05, 0.95],
    warpAmount: [0, 100],
    warpScale: [0.25, 8],
    screenColumns: [12, 240],
    screenAspect: [0.5, 3],
    screenGap: [0, 0.8],
    screenGain: [0.5, 6],
    screenBlack: [0, 0.6],
    screenGlow: [0, 1],
    screenRadius: [1, 12],
    columns: [12, 160],
    cellAspect: [0.8, 2.5],
    glyphScale: [0.4, 1.4],
    sharpen: [0, 2],
    ringing: [0, 1],
    scan: [0, 1],
    noise: [0, 0.4],
    paletteCount: [2, 8],
    temporalBlend: [0, 0.7],
    seamBlend: [0, 0.4],
  };
  function graphemes(text) {
    if (typeof Intl !== "undefined" && Intl.Segmenter)
      return [
        ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
          text,
        ),
      ].map((v) => v.segment);
    return Array.from(text);
  }
  function settings(value = {}) {
    const s = { ...defaults, ...value };
    s.optics = Optics.settings(s.optics);
    for (const [k, [a, b]] of Object.entries(ranges))
      if (!Number.isFinite(s[k]) || s[k] < a || s[k] > b)
        throw Error("Invalid " + k + " control.");
    for (const k of [
      "warpAnimate",
      "wrap",
      "screenVertical",
      "density",
      "surface",
    ])
      if (typeof s[k] !== "boolean") throw Error("Invalid " + k + " switch.");
    for (const [k, values] of Object.entries({
      gradientSpace: ["srgb", "linear"],
      family: ["print", "screen", "characters"],
      order: ["warp-first", "treatment-first"],
      warp: ["off", "wave", "swirl", "mirror", "pinch"],
      screenMask: ["rgb", "bgr", "dots", "slots"],
      screenColour: ["source", "palette"],
      charPolarity: ["light", "dark"],
      charColour: ["mono", "source", "palette"],
      paletteMode: ["locked", "adaptive"],
    }))
      if (!values.includes(s[k])) throw Error("Invalid " + k + " choice.");
    for (const k of ["ink", "background"])
      if (!/^#[\da-f]{6}$/i.test(s[k]))
        throw Error("Invalid " + k + " colour.");
    if (
      typeof s.charset !== "string" ||
      s.charset.length > 256 ||
      /[\r\n\t\x00-\x1f\x7f]/.test(s.charset) ||
      graphemes(s.charset).length < 2 ||
      graphemes(s.charset).length > 64
    )
      throw Error("Use 2–64 printable character marks.");
    if (!Array.isArray(s.overrides) || s.overrides.length > 2048)
      throw Error("Use up to 2048 edited character cells.");
    s.overrides = s.overrides.map((c) => {
      if (
        !c ||
        !Number.isInteger(c.x) ||
        !Number.isInteger(c.y) ||
        c.x < 0 ||
        c.x > 159 ||
        c.y < 0 ||
        c.y > 399 ||
        typeof c.ch !== "string" ||
        c.ch.length > 32 ||
        graphemes(c.ch).length !== 1 ||
        /[\r\n\t\x00-\x1f]/.test(c.ch)
      )
        throw Error("Invalid edited character cell.");
      return { x: c.x, y: c.y, ch: c.ch };
    });
    if (
      new Set([...graphemes(s.charset), ...s.overrides.map((c) => c.ch)]).size >
      240
    )
      throw Error("Use at most 240 different character marks across the grid.");
    return Object.fromEntries(
      Object.keys(defaults).map((k) => [k, structuredClone(s[k])]),
    );
  }
  const linear = Float32Array.from({ length: 256 }, (_, i) => {
    const v = i / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const srgb = (v) =>
    Math.round(
      255 *
        (v <= 0.0031308
          ? v * 12.92
          : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055),
    );
  function noise(x, y, seed) {
    let n = Math.imul(x + seed, 374761393) ^ Math.imul(y + 1, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }
  function image(w, h) {
    return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) };
  }
  function resized(source, edge) {
    const scale = edge / Math.max(source.width, source.height),
      w = Math.max(1, Math.round(source.width * scale)),
      h = Math.max(1, Math.round(source.height * scale)),
      out = image(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4,
          j =
            (Math.min(
              source.height - 1,
              Math.floor(((y + 0.5) * source.height) / h),
            ) *
              source.width +
              Math.min(
                source.width - 1,
                Math.floor(((x + 0.5) * source.width) / w),
              )) *
            4;
        out.data.set(source.data.subarray(j, j + 4), i);
      }
    return out;
  }
  function mix(a, b, amount) {
    if (!b || !amount) return a;
    const second =
      b.width === a.width && b.height === a.height
        ? b
        : resized(b, Math.max(a.width, a.height));
    if (second.width !== a.width || second.height !== a.height) return a;
    let difference = 0;
    for (let i = 0; i < a.data.length; i += 64)
      difference += Math.abs(a.data[i] - second.data[i]);
    if (difference / Math.ceil(a.data.length / 64) > 80) return a;
    const out = image(a.width, a.height);
    for (let i = 0; i < a.data.length; i++)
      out.data[i] = a.data[i] * (1 - amount) + second.data[i] * amount;
    return out;
  }
  function dissolve(a, b, amount) {
    if (!b || amount <= 0) return a;
    const second = resized(b, Math.max(a.width, a.height));
    if (a.width !== second.width || a.height !== second.height) return a;
    const out = image(a.width, a.height);
    for (let i = 0; i < a.data.length; i++)
      out.data[i] = a.data[i] * (1 - amount) + second.data[i] * amount;
    return out;
  }
  function warp(source, s, phase) {
    if (s.warp === "off" || !s.warpAmount) return source;
    const { width: w, height: h } = source,
      out = image(w, h),
      a = s.warpAmount / 100,
      t = s.warpAnimate ? Math.sin(phase * Math.PI * 2) : 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let u = (x + 0.5) / w,
          v = (y + 0.5) / h;
        if (s.warp === "wave") {
          u += Math.sin(v * Math.PI * 2 * s.warpScale + t * Math.PI) * a * 0.16;
          v += Math.sin(u * Math.PI * 2 * s.warpScale + t * Math.PI) * a * 0.05;
        } else if (s.warp === "swirl") {
          const dx = u - 0.5,
            dy = v - 0.5,
            angle =
              (1 - clamp(Math.hypot(dx, dy) * 1.5)) * a * 5 * (1 + t * 0.3);
          u = 0.5 + dx * Math.cos(angle) - dy * Math.sin(angle);
          v = 0.5 + dx * Math.sin(angle) + dy * Math.cos(angle);
        } else if (s.warp === "mirror") {
          u = 0.5 + Math.abs(u - 0.5);
          u = (u - 0.5) * 2;
          v = v * (1 - a) + Math.abs(v - 0.5) * 2 * a;
        } else {
          const dx = u - 0.5,
            dy = v - 0.5,
            r = Math.hypot(dx, dy),
            f = 1 + a * Math.max(0, 1 - r * 1.5) * (1 + t * 0.2);
          u = 0.5 + dx * f;
          v = 0.5 + dy * f;
        }
        u = s.wrap ? ((u % 1) + 1) % 1 : clamp(u);
        v = s.wrap ? ((v % 1) + 1) % 1 : clamp(v);
        const j =
          (Math.min(h - 1, Math.floor(v * h)) * w +
            Math.min(w - 1, Math.floor(u * w))) *
          4;
        out.data.set(source.data.subarray(j, j + 4), (y * w + x) * 4);
      }
    return out;
  }
  function palette(source, count = 4) {
    const bins = new Map();
    for (
      let i = 0;
      i < source.data.length;
      i += Math.max(4, Math.ceil(source.data.length / 4 / 65536) * 4)
    ) {
      if (source.data[i + 3] < 32) continue;
      const c = [source.data[i], source.data[i + 1], source.data[i + 2]],
        key = (c[0] >> 4) * 256 + (c[1] >> 4) * 16 + (c[2] >> 4);
      let bin = bins.get(key);
      if (!bin) {
        bin = { c: [0, 0, 0], n: 0 };
        bins.set(key, bin);
      }
      bin.n++;
      for (let k = 0; k < 3; k++) bin.c[k] += c[k];
    }
    const samples = [...bins.values()].map((b) => ({
      c: b.c.map((v) => v / b.n),
      n: b.n,
    }));
    if (!samples.length) return ["#000000", "#ffffff"];
    let boxes = [samples];
    while (boxes.length < count) {
      const extent = (b) =>
          [0, 1, 2].map(
            (k) =>
              Math.max(...b.map((v) => v.c[k])) -
              Math.min(...b.map((v) => v.c[k])),
          ),
        scores = boxes.map(
          (b) =>
            Math.max(...extent(b)) * Math.sqrt(b.reduce((n, v) => n + v.n, 0)),
        ),
        at = scores.indexOf(Math.max(...scores)),
        box = boxes[at];
      if (box.length < 2 || scores[at] === 0) break;
      const e = extent(box),
        axis = e.indexOf(Math.max(...e));
      box.sort((a, b) => a.c[axis] - b.c[axis]);
      const half = box.reduce((n, v) => n + v.n, 0) / 2;
      let total = 0,
        split = 1;
      for (let i = 0; i < box.length - 1; i++) {
        total += box[i].n;
        split = i + 1;
        if (total >= half) break;
      }
      boxes.splice(at, 1, box.slice(0, split), box.slice(split));
    }
    const colours = boxes
      .map((b) => {
        const n = b.reduce((n, v) => n + v.n, 0);
        return [0, 1, 2].map(
          (k) => b.reduce((n, v) => n + v.c[k] * v.n, 0) / n,
        );
      })
      .sort((a, b) => lum(a) - lum(b));
    if (colours.length === 1) colours.push(colours[0]);
    return colours.map(
      (c) =>
        "#" +
        c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join(""),
    );
  }
  function nearest(c, pal) {
    return pal.reduce(
      (best, p) =>
        p.reduce((n, v, i) => n + (v - c[i]) ** 2, 0) <
        best.reduce((n, v, i) => n + (v - c[i]) ** 2, 0)
          ? p
          : best,
      pal[0],
    );
  }
  function paletteColours(opts) {
    return (
      opts.mapMode === "duo"
        ? [opts.mapColours[0], opts.mapColours[2]]
        : opts.mapMode === "trio"
          ? opts.mapColours
          : opts.palette
    ).map(rgb);
  }
  function movement(source, opts, phase) {
    if (opts.motion === "none" || !opts.amount) return source;
    const { width: w, height: h } = source,
      out = image(w, h),
      a = (((phase % 1) + 1) % 1) * Math.PI * 2,
      amount = opts.amount;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let xx = x,
          yy = y;
        if (opts.motion === "drift") {
          xx += (Math.cos(a) - 1) * amount;
          yy += Math.sin(a) * amount;
        } else if (opts.motion === "ripple")
          xx += Math.sin((y / h) * Math.PI * 2 * opts.waves + a) * amount;
        else if (opts.motion === "crawl") {
          xx += Math.sin(a) * amount * 0.3;
          yy += Math.cos(a) * amount * 0.3;
        } else {
          const scale =
              opts.motion === "zoom" || opts.motion === "breathe"
                ? 1 + (Math.sin(a) * amount) / 250
                : 1,
            turn =
              opts.motion === "sway"
                ? (Math.sin(a) * amount) / 500
                : opts.motion === "twist"
                  ? ((Math.sin(a) * amount) / 65) *
                    Math.max(
                      0,
                      1 - Math.hypot((x - w / 2) / w, (y - h / 2) / h) * 2,
                    ) **
                      2
                  : 0,
            rx = (x - w / 2) / scale,
            ry = (y - h / 2) / scale;
          xx = w / 2 + rx * Math.cos(turn) - ry * Math.sin(turn);
          yy = h / 2 + rx * Math.sin(turn) + ry * Math.cos(turn);
        }
        if (opts.studio.wrap) {
          xx = ((xx % w) + w) % w;
          yy = ((yy % h) + h) % h;
        }
        const i =
          (clamp(Math.floor(yy), 0, h - 1) * w +
            clamp(Math.floor(xx), 0, w - 1)) *
          4;
        out.data.set(source.data.subarray(i, i + 4), (y * w + x) * 4);
      }
    return out;
  }
  function gradient(c, opts) {
    if (opts.mapMode === "off") return c;
    const colours = (
        opts.mapMode === "duo"
          ? [opts.mapColours[0], opts.mapColours[2]]
          : opts.mapColours
      ).map(rgb),
      t = clamp(lum(c) / 255),
      mid = opts.studio.gradientMid;
    let left = 0,
      f = t;
    if (colours.length === 3) {
      left = t < mid ? 0 : 1;
      f = left ? (t - mid) / (1 - mid) : t / mid;
    }
    return colours[left].map((v, k) =>
      opts.studio.gradientSpace === "linear"
        ? srgb(linear[v] * (1 - f) + linear[colours[left + 1][k]] * f)
        : v * (1 - f) + colours[left + 1][k] * f,
    );
  }
  function temporalSource(source, opts, phase) {
    if (opts.temporal === "none" || !opts.temporalAmount) return source;
    const { width: w, height: h } = source,
      out = image(w, h),
      cycle = (((phase * opts.temporalCycles) % 1) + 1) % 1,
      a = cycle * Math.PI * 2,
      amount = opts.temporalAmount;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const u = x / w,
          v = y / h;
        let wave = 0;
        if (opts.temporal === "tide") wave = Math.sin(a);
        else if (opts.temporal === "roll") wave = Math.sin(u * Math.PI * 2 + a);
        else if (opts.temporal === "rings")
          wave = Math.sin(Math.hypot(u - 0.5, v - 0.5) * Math.PI * 8 - a);
        else if (opts.temporal === "weave")
          wave = Math.sin(u * Math.PI * 8 + a) * Math.cos(v * Math.PI * 8 - a);
        else if (opts.temporal === "shimmer")
          wave =
            ((Math.floor(x / 8) + Math.floor(y / 8)) % 2 ? 1 : -1) *
            Math.sin(a);
        else
          wave =
            (noise(
              Math.floor(x / 3),
              Math.floor(y / 3),
              opts.seed + Math.floor(cycle * 12),
            ) -
              0.5) *
            2;
        const i = (y * w + x) * 4;
        for (let k = 0; k < 3; k++)
          out.data[i + k] = source.data[i + k] + wave * amount;
        out.data[i + 3] = source.data[i + 3];
      }
    return out;
  }

  function tones(src, opts) {
    const out = image(src.width, src.height),
      bg = rgb(opts.studio.background);
    for (let i = 0; i < src.data.length; i += 4) {
      const a = src.data[i + 3] / 255,
        c = [0, 1, 2].map((k) =>
          opts.transparent
            ? src.data[i + k]
            : src.data[i + k] * a + bg[k] * (1 - a),
        ),
        grey = lum(c);
      for (let k = 0; k < 3; k++) {
        let v = grey + ((c[k] - grey) * opts.saturation) / 100;
        if (opts.edge) {
          const x = (i / 4) % src.width,
            y = Math.floor(i / 4 / src.width),
            at = (xx, yy) =>
              src.data[
                (clamp(yy, 0, src.height - 1) * src.width +
                  clamp(xx, 0, src.width - 1)) *
                  4 +
                  k
              ],
            mean =
              (at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1)) / 4;
          v += ((c[k] - mean) * opts.edge) / 50;
        }
        v =
          (v - 127.5) * (1 + opts.contrast / 100) +
          127.5 +
          opts.brightness * 2.55;
        v = 255 * Math.pow(clamp(v / 255), 1 / opts.gamma);
        if (opts.posterize >= 2)
          v =
            (Math.round((v / 255) * (opts.posterize - 1)) /
              (opts.posterize - 1)) *
            255;
        out.data[i + k] = opts.invert ? 255 - v : v;
      }
      if (opts.mapMode !== "off")
        out.data.set(
          gradient(Array.from(out.data.subarray(i, i + 3)), opts),
          i,
        );
      out.data[i + 3] = opts.transparent ? src.data[i + 3] : 255;
    }
    return out;
  }
  function sampleCells(source, columns, aspect) {
    const cw = source.width / columns,
      ch = Math.max(cw * aspect, source.height / 400),
      rows = Math.max(1, Math.min(400, Math.ceil(source.height / ch))),
      data = new Float32Array(columns * rows * 4);
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < columns; x++) {
        let sums = [0, 0, 0, 0],
          weight = 0;
        for (const a of [0.2, 0.5, 0.8])
          for (const b of [0.2, 0.5, 0.8]) {
            const xx = Math.min(source.width - 1, Math.floor((x + a) * cw)),
              yy = Math.min(source.height - 1, Math.floor((y + b) * ch)),
              j = (yy * source.width + xx) * 4,
              alpha = source.data[j + 3] / 255;
            for (let k = 0; k < 3; k++) sums[k] += source.data[j + k] * alpha;
            sums[3] += alpha;
            weight++;
          }
        for (let k = 0; k < 3; k++)
          data[(y * columns + x) * 4 + k] = sums[3] ? sums[k] / sums[3] : 0;
        data[(y * columns + x) * 4 + 3] = (sums[3] / weight) * 255;
      }
    return { columns, rows, cw, ch, data };
  }
  function blur(input, w, h, r) {
    const temp = new Float32Array(input.length),
      out = new Float32Array(input.length);
    for (let c = 0; c < 3; c++) {
      for (let y = 0; y < h; y++) {
        let sum = 0;
        for (let x = -r; x <= r; x++)
          sum += input[(y * w + clamp(x, 0, w - 1)) * 3 + c];
        for (let x = 0; x < w; x++) {
          temp[(y * w + x) * 3 + c] = sum / (2 * r + 1);
          sum +=
            input[(y * w + clamp(x + r + 1, 0, w - 1)) * 3 + c] -
            input[(y * w + clamp(x - r, 0, w - 1)) * 3 + c];
        }
      }
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let y = -r; y <= r; y++)
          sum += temp[(clamp(y, 0, h - 1) * w + x) * 3 + c];
        for (let y = 0; y < h; y++) {
          out[(y * w + x) * 3 + c] = sum / (2 * r + 1);
          sum +=
            temp[(clamp(y + r + 1, 0, h - 1) * w + x) * 3 + c] -
            temp[(clamp(y - r, 0, h - 1) * w + x) * 3 + c];
        }
      }
    }
    return out;
  }
  function screen(source, opts) {
    const s = opts.studio,
      { width: w, height: h } = source,
      columns = Math.round(s.screenColumns),
      cells = sampleCells(source, columns, s.screenAspect),
      out = image(w, h),
      lights = new Float32Array(w * h * 3),
      pal = paletteColours(opts);
    const optics = s.optics,
      protectedLight = optics.lightEnabled && optics.protectShadows,
      glowInputs = protectedLight ? new Float32Array(w * h * 3) : null;
    // Sample/fit each cell once. Subpixels share its colour rather than repeating
    // palette searches and short-lived array allocations for every output pixel.
    const cellLights = new Float32Array(columns * cells.rows * 3);
    for (let n = 0; n < columns * cells.rows; n++) {
      const c = Array.from(cells.data.subarray(n * 4, n * 4 + 3)),
        colour = s.screenColour === "palette" ? nearest(c, pal) : c;
      for (let k = 0; k < 3; k++)
        cellLights[n * 3 + k] =
          Math.max(0, linear[Math.round(colour[k])] - s.screenBlack) *
          s.screenGain;
    }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const row = Math.min(cells.rows - 1, Math.floor(y / cells.ch)),
          shift = s.screenMask === "slots" && row % 2 ? 0.5 : 0,
          u = x / cells.cw + shift,
          col = Math.floor(u) % columns,
          cell = (row * columns + col) * 4;
        let px = u - Math.floor(u),
          py = (y / cells.ch) % 1;
        if (s.screenVertical) [px, py] = [py, px];
        const sub = Math.min(2, Math.floor(px * 3)),
          local = (px * 3) % 1,
          channel = s.screenMask === "bgr" ? 2 - sub : sub;
        let mask =
          local > s.screenGap * 0.5 &&
          local < 1 - s.screenGap * 0.5 &&
          py > s.screenGap * 0.5 &&
          py < 1 - s.screenGap * 0.5;
        if (s.screenMask === "dots")
          mask =
            ((local - 0.5) / (0.5 - s.screenGap * 0.5)) ** 2 +
              ((py - 0.5) / (0.5 - s.screenGap * 0.5)) ** 2 <
            1;
        const i = y * w + x,
          alpha = cells.data[cell + 3] / 255,
          brightness = lum(cells.data.subarray(cell, cell + 3)) / 255,
          cellWeight = protectedLight
            ? Optics.smooth(optics.cellLow, optics.cellHigh, brightness)
            : 1,
          glowWeight = protectedLight
            ? Optics.smooth(optics.glowLow, optics.glowHigh, brightness)
            : 1;
        for (let k = 0; k < 3; k++) {
          const value =
            mask && k === channel
              ? cellLights[(row * columns + col) * 3 + k]
              : 0;
          lights[i * 3 + k] =
            value * (opts.transparent ? alpha : 1) * cellWeight;
          if (glowInputs)
            glowInputs[i * 3 + k] =
              value * (opts.transparent ? alpha : 1) * glowWeight;
        }
        out.data[i * 4 + 3] = opts.transparent ? cells.data[cell + 3] : 255;
      }
    const glow =
      s.screenGlow && optics.lightEnabled
        ? blur(glowInputs || lights, w, h, Math.round(s.screenRadius))
        : null;
    for (let i = 0; i < w * h; i++)
      for (let k = 0; k < 3; k++)
        out.data[i * 4 + k] = srgb(
          clamp(
            (lights[i * 3 + k] +
              (glow ? glow[i * 3 + k] * s.screenGlow * 3 : 0)) /
              (opts.transparent
                ? Math.max(1 / 255, out.data[i * 4 + 3] / 255)
                : 1),
          ),
        );
    return out;
  }
  function characters(source, opts, atlas) {
    const s = opts.studio,
      columns = Math.round(s.columns),
      cells = sampleCells(source, columns, s.cellAspect),
      out = image(source.width, source.height),
      marks = graphemes(s.charset),
      pal = paletteColours(opts),
      ink = rgb(s.ink),
      bg = rgb(s.background);
    let glyphList = marks.map((ch, i) => ({
      ch,
      density: atlas?.glyphs[ch]?.density ?? i / (marks.length - 1),
    }));
    if (s.density) glyphList.sort((a, b) => a.density - b.density);
    const glyphs = [],
      colours = [],
      alphas = [],
      overrides = new Map(
        s.overrides
          .filter((c) => c.x < columns && c.y < cells.rows)
          .map((c) => [c.y * columns + c.x, c.ch]),
      );
    for (let y = 0; y < cells.rows; y++)
      for (let x = 0; x < columns; x++) {
        const index = y * columns + x,
          j = index * 4,
          c = Array.from(cells.data.subarray(j, j + 3)),
          tone = clamp(lum(c) / 255),
          glyph =
            glyphList[
              Math.round(
                (s.charPolarity === "light" ? tone : 1 - tone) *
                  (glyphList.length - 1),
              )
            ].ch;
        glyphs.push(overrides.get(index) ?? glyph);
        colours.push(
          s.charColour === "source"
            ? c
            : s.charColour === "palette"
              ? nearest(c, pal)
              : ink,
        );
        alphas.push(cells.data[j + 3]);
      }
    for (let y = 0; y < source.height; y++)
      for (let x = 0; x < source.width; x++) {
        const cx = Math.min(columns - 1, Math.floor(x / cells.cw)),
          cy = Math.min(cells.rows - 1, Math.floor(y / cells.ch)),
          index = cy * columns + cx,
          glyph = atlas?.glyphs[glyphs[index]],
          u = (((x / cells.cw) % 1) - 0.5) / s.glyphScale + 0.5,
          v = (((y / cells.ch) % 1) - 0.5) / s.glyphScale + 0.5;
        let coverage = 0;
        if (u >= 0 && u < 1 && v >= 0 && v < 1 && glyph)
          coverage =
            glyph.mask[
              Math.floor(v * atlas.height) * atlas.width +
                Math.floor(u * atlas.width)
            ] / 255;
        const i = (y * source.width + x) * 4;
        for (let k = 0; k < 3; k++)
          out.data[i + k] = opts.transparent
            ? colours[index][k]
            : bg[k] * (1 - coverage) + colours[index][k] * coverage;
        out.data[i + 3] = opts.transparent ? coverage * alphas[index] : 255;
      }
    out.characterGrid = {
      columns,
      rows: cells.rows,
      glyphs,
      colours,
      alpha: alphas,
      cellWidth: cells.cw,
      cellHeight: cells.ch,
      width: source.width,
      height: source.height,
      font: "IBM Plex Mono",
      scale: s.glyphScale,
      background: s.background,
      transparent: opts.transparent,
    };
    return out;
  }
  function surface(source, opts) {
    const s = opts.studio;
    if (!s.surface || !(s.sharpen || s.ringing || s.scan || s.noise))
      return source;
    const { width: w, height: h } = source,
      out = image(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        for (let k = 0; k < 3; k++) {
          const v = source.data[i + k],
            left = source.data[(y * w + Math.max(0, x - 1)) * 4 + k],
            right = source.data[(y * w + Math.min(w - 1, x + 1)) * 4 + k],
            far = source.data[(y * w + Math.max(0, x - 3)) * 4 + k];
          out.data[i + k] =
            (v +
              (v - (left + right) / 2) * s.sharpen +
              (v - far) * s.ringing * 0.5) *
              (1 - s.scan * (y % 2) * 0.6) +
            (noise(x, y, opts.seed) - 0.5) * s.noise * 255;
        }
        out.data[i + 3] = source.data[i + 3];
      }
    out.characterGrid = source.characterGrid;
    return out;
  }
  function raster(out, atlas) {
    if (
      out.width === out.outputWidth &&
      out.height === out.outputHeight &&
      !out.glyphs
    )
      return out;
    const img = image(out.outputWidth, out.outputHeight);
    for (let y = 0; y < img.height; y++)
      for (let x = 0; x < img.width; x++) {
        const sx = Math.min(
            out.width - 1,
            Math.floor((x / img.width) * out.width),
          ),
          sy = Math.min(
            out.height - 1,
            Math.floor((y / img.height) * out.height),
          ),
          i = (y * img.width + x) * 4,
          j = (sy * out.width + sx) * 4;
        if (!out.glyphs) {
          img.data.set(out.data.subarray(j, j + 4), i);
          continue;
        }
        const glyph = atlas?.glyphs[out.glyphs[sy * out.width + sx]],
          u = ((x / img.width) * out.width) % 1,
          v = ((y / img.height) * out.height) % 1,
          a = glyph
            ? glyph.mask[
                Math.floor(v * atlas.height) * atlas.width +
                  Math.floor(u * atlas.width)
              ] / 255
            : 0;
        for (let k = 0; k < 3; k++)
          img.data[i + k] = out.transparent
            ? out.data[j + k]
            : out.background[k] * (1 - a) + out.data[j + k] * a;
        img.data[i + 3] = out.transparent ? out.data[j + 3] * a : 255;
      }
    return img;
  }
  function render(source, opts, phase, base, context = {}) {
    const s = opts.studio,
      o = s.optics;
    if (
      !Optics.active(o, s, opts.riso.enabled) &&
      s.family === "print" &&
      s.warp === "off" &&
      s.paletteMode === "locked" &&
      !s.temporalBlend &&
      !s.seamBlend &&
      (!s.surface || !(s.sharpen || s.ringing || s.scan || s.noise))
    )
      return base(source, opts, phase);
    let input = resized(source, opts.width);
    if (s.temporalBlend)
      input = mix(input, context.previousSource, s.temporalBlend);
    if (s.seamBlend && phase > 1 - s.seamBlend)
      input = dissolve(
        input,
        context.seamSource,
        (phase - (1 - s.seamBlend)) / s.seamBlend,
      );
    if (o.lensEnabled && o.lensStage === "source")
      input = Optics.lens(input, o);
    if (s.order === "warp-first" && o.warpEnabled)
      input = warp(input, s, phase);
    if (o.textureStage === "source")
      input = Optics.texture(input, o, opts.seed);
    let chosen =
      s.paletteMode === "adaptive"
        ? { ...opts, palette: palette(input, Math.round(s.paletteCount)) }
        : opts;
    if (!o.finishEnabled)
      chosen = {
        ...chosen,
        rowSlip: 0,
        blockShift: 0,
        rgbSplit: 0,
        bloom: 0,
        scanlines: 0,
        vignette: 0,
        solarize: 0,
        animateEffects: false,
      };
    if (s.family !== "print")
      input = temporalSource(movement(input, chosen, phase), chosen, phase);
    else if (o.maskEnabled) {
      input = movement(input, chosen, phase);
      chosen = { ...chosen, motion: "none" };
    }
    let reference =
        s.family !== "print" || !o.treatmentEnabled || o.maskEnabled
          ? tones(input, chosen)
          : input,
      maskReference = input,
      out;
    if (!o.treatmentEnabled) out = reference;
    else if (s.family === "screen") out = screen(reference, chosen);
    else if (s.family === "characters")
      out = characters(reference, chosen, context.atlas);
    else
      out = raster(
        base(
          input,
          o.inkStage === "after"
            ? { ...chosen, riso: { ...chosen.riso, enabled: false } }
            : chosen,
          phase,
        ),
        context.atlas,
      );
    if (o.textureStage === "surface") out = Optics.texture(out, o, opts.seed);
    if (opts.riso.enabled && o.inkStage === "after") {
      const grid = out.characterGrid;
      out = Riso.render(
        out,
        {
          ...chosen,
          brightness: 0,
          contrast: 0,
          gamma: 1,
          saturation: 100,
          invert: false,
          motion: "none",
          selective: { ...chosen.selective, mode: "off" },
        },
        phase,
      );
      out.characterGrid = grid;
    }
    if (s.order === "treatment-first" && o.warpEnabled) {
      const grid = out.characterGrid;
      out = warp(out, s, phase);
      out.characterGrid = grid;
      if (o.maskEnabled) {
        reference = warp(reference, s, phase);
        maskReference = warp(maskReference, s, phase);
      }
    }
    out = Optics.halation(out, o);
    if (o.finishEnabled) out = surface(out, opts);
    if (o.lensEnabled && o.lensStage === "screen") {
      out = Optics.lens(out, o);
      if (o.maskEnabled) {
        reference = Optics.lens(reference, o);
        maskReference = Optics.lens(maskReference, o);
      }
    }
    let previous;
    if (o.finishEnabled && o.trailsEnabled && o.trails && context.trailSource) {
      const earlier = {
        ...opts,
        studio: {
          ...s,
          temporalBlend: 0,
          seamBlend: 0,
          optics: { ...o, trailsEnabled: false },
        },
      };
      previous = render(
        context.trailSource,
        earlier,
        context.trailPhase ?? phase,
        base,
        { atlas: context.atlas },
      );
    }
    out = Optics.finish(out, o, phase, previous);
    out = Optics.select(out, reference, o, maskReference);
    return {
      ...out,
      outputWidth: out.width,
      outputHeight: out.height,
      background: rgb(s.background),
      transparent: opts.transparent,
      studio: true,
    };
  }
  const api = {
    defaults,
    settings,
    graphemes,
    resized,
    mix,
    dissolve,
    warp,
    movement,
    gradient,
    palette,
    screen,
    characters,
    surface,
    render,
  };
  if (typeof module !== "undefined") module.exports = api;
  root.DitherStudio = api;
})(globalThis);
