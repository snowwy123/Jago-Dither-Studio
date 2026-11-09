// SPDX-License-Identifier: MIT
// Original JAGO image-space optics and non-destructive look stages.
(function (root) {
  "use strict";
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)),
    rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)),
    luma = (c) => (c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722) / 255;
  const defaults = {
    treatmentEnabled: true,
    warpEnabled: true,
    lightEnabled: true,
    maskEnabled: false,
    lensEnabled: false,
    finishEnabled: true,
    textureEnabled: false,
    dotGain: 0,
    inkStage: "integrated",
    protectShadows: false,
    cellLow: 0.025,
    cellHigh: 0.2,
    glowLow: 0.08,
    glowHigh: 0.4,
    target: "all",
    targetLow: 0.3,
    targetHigh: 0.75,
    satLow: 0.2,
    satHigh: 0.65,
    picked: ["#ec6197"],
    tolerance: 0.2,
    maskSoftness: 0.15,
    maskInvert: false,
    paint: [],
    halationEnabled: false,
    halation: 0.25,
    halationRadius: 6,
    halationThreshold: 0.65,
    halationTint: "#ff9574",
    lensType: "crt",
    lensAmount: 0.3,
    lensX: 0.5,
    lensY: 0.5,
    lensStage: "screen",
    lensEdge: "black",
    lensAutoFrame: true,
    lensZoom: 1,
    scanEnabled: false,
    fringeEnabled: false,
    vignetteEnabled: false,
    trailsEnabled: false,
    scanMode: "display",
    scanSpacing: 4,
    scanThickness: 0.25,
    scanSoftness: 0.25,
    scanStrength: 0.35,
    scanRoll: false,
    scanCycles: 1,
    fringe: 2,
    vignette: 0.25,
    trails: 0.35,
    trailThreshold: 0.2,
    textureMethod: "dots",
    textureSize: 7,
    textureAngle: 45,
    textureStrength: 0.5,
    textureColour: "#111823",
    textureStage: "surface",
    printGroup: "auto",
    memory: {
      dither: { method: "bayer4", cell: 3, patternScale: 1, patternAngle: 0 },
      halftone: { method: "dots", cell: 1, patternScale: 1, patternAngle: 45 },
    },
  };
  const ranges = {
    dotGain: [-50, 50],
    cellLow: [0, 1],
    cellHigh: [0, 1],
    glowLow: [0, 1],
    glowHigh: [0, 1],
    targetLow: [0, 1],
    targetHigh: [0, 1],
    satLow: [0, 1],
    satHigh: [0, 1],
    tolerance: [0, 1],
    maskSoftness: [0.01, 1],
    halation: [0, 1],
    halationRadius: [1, 20],
    halationThreshold: [0, 1],
    lensAmount: [0, 1],
    lensX: [0, 1],
    lensY: [0, 1],
    lensZoom: [0.5, 3],
    scanSpacing: [2, 32],
    scanThickness: [0.03, 0.95],
    scanSoftness: [0, 1],
    scanStrength: [0, 1],
    scanCycles: [1, 8],
    fringe: [0, 12],
    vignette: [0, 1],
    trails: [0, 0.8],
    trailThreshold: [0, 1],
    textureSize: [2, 40],
    textureAngle: [-180, 180],
    textureStrength: [0, 1],
  };
  function settings(value = {}) {
    const s = { ...defaults, ...value };
    for (const [k, [a, b]] of Object.entries(ranges))
      if (!Number.isFinite(s[k]) || s[k] < a || s[k] > b)
        throw Error("Invalid " + k + " setting.");
    for (const k of [
      "treatmentEnabled",
      "warpEnabled",
      "lightEnabled",
      "maskEnabled",
      "lensEnabled",
      "finishEnabled",
      "textureEnabled",
      "protectShadows",
      "maskInvert",
      "lensAutoFrame",
      "scanRoll",
      "halationEnabled",
      "scanEnabled",
      "fringeEnabled",
      "vignetteEnabled",
      "trailsEnabled",
    ])
      if (typeof s[k] !== "boolean") throw Error("Invalid " + k + " switch.");
    for (const [k, values] of Object.entries({
      inkStage: ["integrated", "after"],
      target: ["all", "highlights", "saturated", "picked", "painted"],
      lensType: ["crt", "fisheye", "barrel", "pincushion"],
      lensStage: ["source", "screen"],
      lensEdge: ["black", "clamp", "mirror", "transparent"],
      scanMode: ["display", "crt", "bands"],
      textureMethod: [
        "dots",
        "ellipses",
        "lines",
        "crosshatch",
        "diamonds",
        "grain",
      ],
      textureStage: ["source", "surface"],
      printGroup: ["auto", "dither", "halftone"],
    }))
      if (!values.includes(s[k])) throw Error("Invalid " + k + " choice.");
    for (const [a, b] of [
      ["cellLow", "cellHigh"],
      ["glowLow", "glowHigh"],
      ["targetLow", "targetHigh"],
      ["satLow", "satHigh"],
    ])
      if (s[b] <= s[a])
        throw Error("The upper threshold must be above the lower threshold.");
    const hex = (v) => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
    if (
      !hex(s.halationTint) ||
      !hex(s.textureColour) ||
      !Array.isArray(s.picked) ||
      s.picked.length > 16 ||
      s.picked.some((v) => !hex(v))
    )
      throw Error("Use valid effect colours.");
    if (!Array.isArray(s.paint) || s.paint.length > 2048)
      throw Error("A mask supports up to 2048 brush stamps.");
    s.paint = s.paint.map((p) => {
      if (
        !p ||
        !Number.isFinite(p.x) ||
        !Number.isFinite(p.y) ||
        p.x < 0 ||
        p.x > 1 ||
        p.y < 0 ||
        p.y > 1 ||
        !Number.isFinite(p.r) ||
        p.r < 0.005 ||
        p.r > 0.3 ||
        !Number.isFinite(p.amount) ||
        Math.abs(p.amount) > 1 ||
        !Number.isFinite(p.softness) ||
        p.softness < 0 ||
        p.softness > 1
      )
        throw Error("Invalid painted mask.");
      return { x: p.x, y: p.y, r: p.r, amount: p.amount, softness: p.softness };
    });
    const memory = {};
    for (const group of ["dither", "halftone"]) {
      const m = { ...defaults.memory[group], ...s.memory?.[group] };
      if (
        typeof m.method !== "string" ||
        !/^[a-z0-9]{1,20}$/.test(m.method) ||
        !Number.isFinite(m.cell) ||
        m.cell < 1 ||
        m.cell > 24 ||
        !Number.isFinite(m.patternScale) ||
        m.patternScale < 0.25 ||
        m.patternScale > 8 ||
        !Number.isFinite(m.patternAngle) ||
        Math.abs(m.patternAngle) > 180
      )
        throw Error("Invalid remembered treatment.");
      memory[group] = {
        method: m.method,
        cell: m.cell,
        patternScale: m.patternScale,
        patternAngle: m.patternAngle,
      };
    }
    s.memory = memory;
    return Object.fromEntries(
      Object.keys(defaults).map((k) => [k, structuredClone(s[k])]),
    );
  }
  const smooth = (lo, hi, v) => {
    const t = clamp((v - lo) / Math.max(0.00001, hi - lo));
    return t * t * (3 - 2 * t);
  };
  const image = (w, h) => ({
    width: w,
    height: h,
    data: new Uint8ClampedArray(w * h * 4),
  });
  function active(s, studio, inks = false) {
    return (
      !s.treatmentEnabled ||
      !s.finishEnabled ||
      (!s.warpEnabled && studio.warp !== "off") ||
      (!s.lightEnabled &&
        studio.family === "screen" &&
        studio.screenGlow > 0) ||
      s.maskEnabled ||
      s.textureEnabled ||
      (s.lensEnabled && s.lensAmount > 0) ||
      (s.lightEnabled &&
        (s.protectShadows || (s.halationEnabled && s.halation > 0))) ||
      (s.finishEnabled &&
        ((s.scanEnabled && s.scanStrength) ||
          (s.fringeEnabled && s.fringe) ||
          (s.vignetteEnabled && s.vignette) ||
          (s.trailsEnabled && s.trails))) ||
      (s.inkStage === "after" && inks)
    );
  }
  let paintKey = "",
    paintCache = null;
  function paintMask(w, h, stamps) {
    const key = w + ":" + h + ":" + JSON.stringify(stamps);
    if (key === paintKey && paintCache) return paintCache.slice();
    const data = new Float32Array(w * h);
    for (const p of stamps) {
      const radius = p.r * Math.min(w, h),
        cx = p.x * w,
        cy = p.y * h,
        left = Math.max(0, Math.floor(cx - radius)),
        right = Math.min(w - 1, Math.ceil(cx + radius)),
        top = Math.max(0, Math.floor(cy - radius)),
        bottom = Math.min(h - 1, Math.ceil(cy + radius));
      for (let y = top; y <= bottom; y++)
        for (let x = left; x <= right; x++) {
          const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / radius;
          if (d > 1) continue;
          const strength = p.softness ? 1 - smooth(1 - p.softness, 1, d) : 1,
            i = y * w + x;
          data[i] = clamp(data[i] + p.amount * strength);
        }
    }
    paintKey = key;
    paintCache = data;
    return data.slice();
  }
  function mask(source, s) {
    const { width: w, height: h, data } = source;
    if (s.target === "painted") {
      const m = paintMask(w, h, s.paint);
      if (s.maskInvert) for (let i = 0; i < m.length; i++) m[i] = 1 - m[i];
      return m;
    }
    const out = new Float32Array(w * h),
      picked = s.picked.map(rgb);
    if (s.target === "all") {
      out.fill(s.maskInvert ? 0 : 1);
      return out;
    }
    for (let i = 0; i < out.length; i++) {
      const j = i * 4,
        r = data[j],
        g = data[j + 1],
        b = data[j + 2];
      let value = 1;
      if (s.target === "highlights")
        value = smooth(
          s.targetLow,
          s.targetHigh,
          (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255,
        );
      else if (s.target === "saturated")
        value = smooth(
          s.satLow,
          s.satHigh,
          (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, r, g, b),
        );
      else if (s.target === "picked") {
        let distance = Infinity;
        for (const c of picked) {
          const d = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
          if (d < distance) distance = d;
        }
        value =
          1 -
          smooth(
            s.tolerance,
            Math.min(1.5, s.tolerance + s.maskSoftness),
            Math.sqrt(distance) / 441.673,
          );
      }
      out[i] = s.maskInvert ? 1 - value : value;
    }
    return out;
  }
  function select(treated, reference, s, maskSource = reference) {
    if (!s.maskEnabled) return treated;
    const weights = mask(maskSource, s),
      out = image(treated.width, treated.height);
    for (let i = 0; i < weights.length; i++) {
      const j = i * 4,
        t = weights[i],
        a = treated.data[j + 3] / 255,
        b = reference.data[j + 3] / 255,
        alpha = a * t + b * (1 - t);
      for (let k = 0; k < 3; k++)
        out.data[j + k] = alpha
          ? (treated.data[j + k] * a * t +
              reference.data[j + k] * b * (1 - t)) /
            alpha
          : 0;
      out.data[j + 3] = alpha * 255;
    }
    out.characterGrid = treated.characterGrid;
    return out;
  }
  const mirror = (v) => {
    const n = ((v % 2) + 2) % 2;
    return n > 1 ? 2 - n : n;
  };
  function sample(source, u, v, edge, out, index) {
    let inside = u >= 0 && u <= 1 && v >= 0 && v <= 1;
    if (!inside && ["black", "transparent"].includes(edge)) {
      out[index] = out[index + 1] = out[index + 2] = 0;
      out[index + 3] = edge === "black" ? 255 : 0;
      return;
    }
    if (edge === "mirror") {
      u = mirror(u);
      v = mirror(v);
    }
    u = clamp(u) * (source.width - 1);
    v = clamp(v) * (source.height - 1);
    const x = Math.floor(u),
      y = Math.floor(v),
      fx = u - x,
      fy = v - y;
    let alpha = 0,
      r = 0,
      g = 0,
      b = 0;
    for (let t = 0; t < 4; t++) {
      const xx = t % 2 ? Math.min(source.width - 1, x + 1) : x,
        yy = t > 1 ? Math.min(source.height - 1, y + 1) : y,
        weight = (t % 2 ? fx : 1 - fx) * (t > 1 ? fy : 1 - fy);
      const j = (yy * source.width + xx) * 4,
        a = (source.data[j + 3] / 255) * weight;
      alpha += a;
      r += source.data[j] * a;
      g += source.data[j + 1] * a;
      b += source.data[j + 2] * a;
    }
    out[index] = alpha ? r / alpha : 0;
    out[index + 1] = alpha ? g / alpha : 0;
    out[index + 2] = alpha ? b / alpha : 0;
    out[index + 3] = alpha * 255;
  }
  function coordinates(u, v, s, zoom) {
    let dx = ((u - s.lensX) * 2) / zoom,
      dy = ((v - s.lensY) * 2) / zoom;
    const r = Math.hypot(dx, dy),
      amount = s.lensAmount;
    if (s.lensType === "crt") {
      return [
        s.lensX + (dx * (1 + amount * 0.18 * dy * dy)) / 2,
        s.lensY + (dy * (1 + amount * 0.18 * dx * dx)) / 2,
      ];
    }
    let factor = 1;
    if (s.lensType === "barrel") factor = 1 + amount * 0.35 * r * r;
    else if (s.lensType === "pincushion")
      factor = Math.max(0.1, 1 - amount * 0.24 * r * r);
    else if (r > 0) {
      const theta = amount * 0.95;
      factor =
        Math.tan(Math.min(1.45, r * theta)) /
        Math.max(1e-12, r * Math.tan(theta));
    }
    return [s.lensX + (dx * factor) / 2, s.lensY + (dy * factor) / 2];
  }
  function fitZoom(s) {
    if (!s.lensAutoFrame) return s.lensZoom;
    const fits = (zoom) => {
      for (let i = 0; i <= 12; i++)
        for (const [u, v] of [
          [i / 12, 0],
          [i / 12, 1],
          [0, i / 12],
          [1, i / 12],
        ]) {
          const [x, y] = coordinates(u, v, s, zoom);
          if (x < -0.000001 || x > 1.000001 || y < -0.000001 || y > 1.000001)
            return false;
        }
      return true;
    };
    let lo = 1,
      hi = 8;
    if (fits(lo)) return s.lensZoom;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    return hi * s.lensZoom;
  }
  function lens(source, s) {
    if (!s.lensEnabled || !s.lensAmount) return source;
    const out = image(source.width, source.height),
      zoom = fitZoom(s);
    for (let y = 0; y < out.height; y++)
      for (let x = 0; x < out.width; x++) {
        const [u, v] = coordinates(
          x / Math.max(1, out.width - 1),
          y / Math.max(1, out.height - 1),
          s,
          zoom,
        );
        sample(source, u, v, s.lensEdge, out.data, (y * out.width + x) * 4);
      }
    out.characterGrid = source.characterGrid;
    return out;
  }
  function texture(source, s, seed) {
    if (!s.textureEnabled || !s.textureStrength) return source;
    const out = image(source.width, source.height),
      colour = rgb(s.textureColour),
      a = (s.textureAngle * Math.PI) / 180,
      co = Math.cos(a),
      si = Math.sin(a);
    for (let y = 0; y < source.height; y++)
      for (let x = 0; x < source.width; x++) {
        const i = (y * source.width + x) * 4,
          c = source.data.subarray(i, i + 3),
          dark = 1 - luma(c),
          u = (((((x * co + y * si) / s.textureSize) % 1) + 1) % 1) - 0.5,
          v = (((((-x * si + y * co) / s.textureSize) % 1) + 1) % 1) - 0.5;
        let mark;
        if (s.textureMethod === "lines") mark = Math.abs(u) < 0.07 + dark * 0.3;
        else if (s.textureMethod === "crosshatch")
          mark = Math.min(Math.abs(u), Math.abs(v)) < 0.035 + dark * 0.2;
        else if (s.textureMethod === "diamonds")
          mark = Math.abs(u) + Math.abs(v) < 0.12 + dark * 0.45;
        else if (s.textureMethod === "ellipses")
          mark = u * u * 0.6 + v * v * 1.7 < 0.015 + dark * 0.16;
        else if (s.textureMethod === "grain") {
          let n = Math.imul(x + seed, 374761393) ^ Math.imul(y + 1, 668265263);
          n = Math.imul(n ^ (n >>> 13), 1274126177);
          mark = ((n ^ (n >>> 16)) >>> 0) / 4294967295 < dark * 0.7;
        } else mark = u * u + v * v < 0.015 + dark * 0.16;
        const t = mark ? s.textureStrength : 0;
        for (let k = 0; k < 3; k++)
          out.data[i + k] = source.data[i + k] * (1 - t) + colour[k] * t;
        out.data[i + 3] = source.data[i + 3];
      }
    out.characterGrid = source.characterGrid;
    return out;
  }
  const linear = Float32Array.from({ length: 256 }, (_, i) => {
    const v = i / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const encode = (v) =>
    Math.round(
      255 *
        (v <= 0.0031308
          ? v * 12.92
          : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055),
    );
  function blur(source, w, h, r) {
    const temp = new Float32Array(source.length),
      out = new Float32Array(source.length);
    for (let k = 0; k < 3; k++) {
      for (let y = 0; y < h; y++) {
        let sum = 0;
        for (let x = -r; x <= r; x++)
          sum += source[(y * w + clamp(x, 0, w - 1)) * 3 + k];
        for (let x = 0; x < w; x++) {
          temp[(y * w + x) * 3 + k] = sum / (2 * r + 1);
          sum +=
            source[(y * w + clamp(x + r + 1, 0, w - 1)) * 3 + k] -
            source[(y * w + clamp(x - r, 0, w - 1)) * 3 + k];
        }
      }
      for (let x = 0; x < w; x++) {
        let sum = 0;
        for (let y = -r; y <= r; y++)
          sum += temp[(clamp(y, 0, h - 1) * w + x) * 3 + k];
        for (let y = 0; y < h; y++) {
          out[(y * w + x) * 3 + k] = sum / (2 * r + 1);
          sum +=
            temp[(clamp(y + r + 1, 0, h - 1) * w + x) * 3 + k] -
            temp[(clamp(y - r, 0, h - 1) * w + x) * 3 + k];
        }
      }
    }
    return out;
  }
  function halation(source, s) {
    if (!s.lightEnabled || !s.halationEnabled || !s.halation) return source;
    const { width: w, height: h } = source,
      lights = new Float32Array(w * h * 3),
      tint = rgb(s.halationTint);
    for (let i = 0; i < w * h; i++) {
      const j = i * 4,
        c = source.data.subarray(j, j + 3),
        weight =
          (smooth(
            s.halationThreshold,
            Math.min(1, s.halationThreshold + 0.2),
            luma(c),
          ) *
            source.data[j + 3]) /
          255;
      for (let k = 0; k < 3; k++)
        lights[i * 3 + k] = linear[source.data[j + k]] * weight;
    }
    const glow = blur(lights, w, h, Math.round(s.halationRadius)),
      out = image(w, h);
    for (let i = 0; i < w * h; i++) {
      const j = i * 4,
        alpha = source.data[j + 3] / 255;
      const red = (glow[i * 3] * s.halation * tint[0]) / 255,
        green = (glow[i * 3 + 1] * s.halation * tint[1]) / 255,
        blue = (glow[i * 3 + 2] * s.halation * tint[2]) / 255;
      const outputAlpha =
        alpha + (1 - alpha) * clamp(Math.max(red, green, blue));
      for (let k = 0; k < 3; k++)
        out.data[j + k] = outputAlpha
          ? encode(
              clamp(
                (linear[source.data[j + k]] * alpha +
                  (glow[i * 3 + k] * s.halation * tint[k]) / 255) /
                  outputAlpha,
              ),
            )
          : 0;
      out.data[j + 3] = outputAlpha * 255;
    }
    out.characterGrid = source.characterGrid;
    return out;
  }
  function finish(source, s, phase, previous) {
    if (
      !s.finishEnabled ||
      !(
        (s.scanEnabled && s.scanStrength) ||
        (s.fringeEnabled && s.fringe) ||
        (s.vignetteEnabled && s.vignette) ||
        (s.trailsEnabled && s.trails)
      )
    )
      return source;
    const scan = s.scanEnabled ? s.scanStrength : 0,
      fringe = s.fringeEnabled ? s.fringe : 0,
      vignette = s.vignetteEnabled ? s.vignette : 0,
      trails = s.trailsEnabled ? s.trails : 0;
    const out = image(source.width, source.height),
      { width: w, height: h } = source,
      cycle = (((phase * s.scanCycles) % 1) + 1) % 1;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4,
          position =
            (((y / s.scanSpacing + (s.scanRoll ? cycle : 0)) % 1) + 1) % 1,
          d = Math.min(position, 1 - position),
          half = s.scanThickness / 2,
          soft = s.scanSoftness * 0.25;
        let band = soft
          ? 1 - smooth(Math.max(0, half - soft), half + soft, d)
          : d < half
            ? 1
            : 0;
        if (s.scanMode === "crt")
          band *= 0.6 + 0.4 * Math.sin((Math.PI * x) / w);
        else if (s.scanMode === "bands")
          band =
            0.5 +
            0.5 *
              Math.sin(((y / h) * 3 + (s.scanRoll ? cycle : 0)) * Math.PI * 2);
        const vig =
            1 -
            vignette *
              clamp(Math.hypot((x / w - 0.5) * 1.4, (y / h - 0.5) * 1.4)) **
                1.5,
          alpha = source.data[i + 3] / 255;
        for (let k = 0; k < 3; k++) {
          const xx = clamp(
              Math.round(
                x +
                  (k === 0 ? fringe : k === 2 ? -fringe : 0) *
                    (x / w - 0.5) *
                    2,
              ),
              0,
              w - 1,
            ),
            j = (y * w + xx) * 4;
          let value = alpha
            ? source.data[j + k] * Math.min(1, source.data[j + 3] / 255 / alpha)
            : 0;
          if (
            previous &&
            trails &&
            previous.width === w &&
            previous.height === h
          ) {
            const prev = previous.data[i + k],
              gate = smooth(
                s.trailThreshold,
                Math.min(1, s.trailThreshold + 0.2),
                luma(previous.data.subarray(i, i + 3)),
              );
            value = Math.max(value, prev * trails * gate);
          }
          out.data[i + k] = alpha ? value * (1 - band * scan) * vig : 0;
        }
        out.data[i + 3] = source.data[i + 3];
      }
    out.characterGrid = source.characterGrid;
    return out;
  }
  const api = {
    defaults,
    settings,
    active,
    smooth,
    mask,
    paintMask,
    select,
    lens,
    fitZoom,
    coordinates,
    texture,
    halation,
    finish,
    blur,
  };
  if (typeof module !== "undefined") module.exports = api;
  root.DitherOptics = api;
})(globalThis);
