// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Cameron Jago Lis Illustrates.
(function (root) {
  'use strict';
  const Riso = typeof module !== 'undefined' ? require('./riso.js') : root.JagoRiso;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const methods = [
    'bayer16',
    'jjn',
    'stucki',
    'sierra3',
    'diamonds',
    'bricks',
    'weave',
    'zigzag',
    'scales',
    'sparkles',
    'maze',
    'custom',
    'bayer2',
    'bayer4',
    'bayer8',
    'burkes',
    'sierra',
    'crosshatch',
    'rings',
    'floyd',
    'atkinson',
    'grain',
    'dots',
    'lines',
    'threshold',
    'ascii'
  ];
  const motions = ['none', 'drift', 'ripple', 'sway', 'breathe', 'crawl', 'zoom', 'twist'];
  const defaults = {
    riso: Riso.defaults,
    method: 'bayer4',
    cell: 3,
    width: 720,
    brightness: 0,
    contrast: 15,
    gamma: 1,
    saturation: 100,
    strength: 100,
    invert: false,
    transparent: false,
    palette: ['#283e50', '#fcf6e7'],
    motion: 'none',
    amount: 8,
    waves: 3,
    seconds: 3,
    fps: 12,
    chars: ' .:-=+*#%@',
    asciiStretch: false,
    patternScale: 1,
    patternAngle: 0,
    edge: 0,
    posterize: 0,
    grain: 0,
    selective: {mode: "off", colours: [], tolerance: 0, retain: "palette"},
    reverseInks: false,
    mapMode: 'off',
    mapColours: ['#302547', '#db7960', '#fff1bd'],
    tile: [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5],
    duet: 'off',
    duetBalance: 50,
    duetSoftness: 25,
    patternX: 0,
    patternY: 0,
    serpentine: true,
    diffusionReach: 1,
    temporal: 'none',
    temporalAmount: 12,
    temporalCycles: 1,
    animateEffects: false,
    rowSlip: 0,
    blockShift: 0,
    rgbSplit: 0,
    effectSize: 12,
    scanlines: 0,
    vignette: 0,
    solarize: 0,
    bloom: 0,
    bloomRadius: 3,
    seed: 37
  };
  const limits = {
    patternScale: [0.5, 6],
    patternAngle: [-180, 180],
    edge: [0, 100],
    posterize: [0, 16],
    grain: [0, 50],
    cell: [1, 24],
    width: [160, 1024],
    brightness: [-100, 100],
    contrast: [-90, 100],
    gamma: [0.25, 3],
    saturation: [0, 200],
    strength: [0, 150],
    amount: [0, 40],
    waves: [1, 8],
    seconds: [0.25, 12],
    fps: [6, 24],
    duetBalance: [0, 100],
    duetSoftness: [1, 100],
    patternX: [-64, 64],
    patternY: [-64, 64],
    diffusionReach: [1, 3],
    temporalAmount: [0, 50],
    temporalCycles: [1, 6],
    rowSlip: [0, 40],
    blockShift: [0, 40],
    rgbSplit: [0, 20],
    effectSize: [2, 64],
    scanlines: [0, 100],
    vignette: [0, 100],
    solarize: [0, 100],
    bloom: [0, 100],
    bloomRadius: [1, 12],
    seed: [0, 65535]
  };
  function settings(value) {
    if (!value || typeof value !== 'object') throw Error('This file has no settings.');
    const s = { ...defaults, ...value };
    if (typeof s.asciiStretch !== 'boolean') throw Error('Invalid character tone range.');
    for (const [key, [min, max]] of Object.entries(limits)) {
      if (typeof s[key] !== 'number' || !Number.isFinite(s[key]) || s[key] < min || s[key] > max)
        throw Error('Invalid ' + key + ' setting.');
    }
    for (const key of [
      'cell',
      'width',
      'fps',
      'seed',
      'diffusionReach',
      'temporalCycles',
      'effectSize',
      'bloomRadius'
    ])
      if (!Number.isInteger(s[key])) throw Error('Invalid ' + key + '.');
    if (![320, 480, 720, 1024].includes(s.width) || ![6, 12, 24].includes(s.fps))
      throw Error('Unsupported resolution or frame rate.');
    if (!methods.includes(s.method) || !motions.includes(s.motion))
      throw Error('Unknown print or motion style.');
    if (
      !Array.isArray(s.palette) ||
      s.palette.length < 2 ||
      s.palette.length > 8 ||
      !s.palette.every((c) => typeof c === 'string' && /^#[\da-f]{6}$/i.test(c))
    )
      throw Error('Use two to eight hex colours.');
    if (
      typeof s.chars !== 'string' ||
      [...s.chars].length < 2 ||
      [...s.chars].length > 16 ||
      /[\r\n\t]/.test(s.chars)
    )
      throw Error('Use 2 to 16 single-line characters.');
    if (typeof s.transparent !== 'boolean' || typeof s.invert !== 'boolean')
      throw Error('Invalid image settings.');
    for (const key of ['reverseInks', 'serpentine', 'animateEffects'])
      if (typeof s[key] !== 'boolean') throw Error('Invalid ' + key + '.');
    if (
      !['off', 'duo', 'trio'].includes(s.mapMode) ||
      !['none', 'tide', 'boil', 'roll', 'shimmer', 'rings', 'weave'].includes(s.temporal) ||
      !['off', 'bayer4', 'dots', 'lines', 'crosshatch', 'grain', 'diamonds', 'custom'].includes(
        s.duet
      )
    )
      throw Error('Invalid print effect.');
    if (
      !Array.isArray(s.tile) ||
      s.tile.length !== 16 ||
      s.tile.some((v) => !Number.isInteger(v) || v < 0 || v > 15)
    )
      throw Error('A custom tile needs 16 values from 0 to 15.');
    if (
      !Array.isArray(s.mapColours) ||
      s.mapColours.length !== 3 ||
      s.mapColours.some((c) => typeof c !== 'string' || !/^#[\da-f]{6}$/i.test(c))
    )
      throw Error('Invalid gradient colours.');
    if(!s.selective||!["off","include","exclude"].includes(s.selective.mode)||!["palette","source"].includes(s.selective.retain)||!Array.isArray(s.selective.colours)||s.selective.colours.length>16||s.selective.colours.some(c=>typeof c!=="string"||!/^#[0-9a-f]{6}$/i.test(c))||!Number.isFinite(s.selective.tolerance)||s.selective.tolerance<0||s.selective.tolerance>100)throw Error("Invalid selective colour rules");
    s.selective={...s.selective,colours:[...s.selective.colours]};
    s.riso=Riso.settings(s.riso);
    return Object.fromEntries(
      Object.keys(defaults).map((k) => [k, Array.isArray(s[k]) ? [...s[k]] : s[k]])
    );
  }
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const luma = (c) => c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
  function bayer(n) {
    let a = [[0]];
    while (a.length < n) {
      const m = a.length,
        out = Array.from({ length: m * 2 }, () => Array(m * 2));
      for (let y = 0; y < m; y++)
        for (let x = 0; x < m; x++) {
          out[y][x] = a[y][x] * 4;
          out[y][x + m] = a[y][x] * 4 + 2;
          out[y + m][x] = a[y][x] * 4 + 3;
          out[y + m][x + m] = a[y][x] * 4 + 1;
        }
      a = out;
    }
    return a;
  }
  const matrices = { bayer16: bayer(16), bayer2: bayer(2), bayer4: bayer(4), bayer8: bayer(8) };
  function noise(x, y, seed) {
    let n = Math.imul(x + seed, 374761393) ^ Math.imul(y + 1, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }
  const patternMethods = [
    'bayer2',
    'bayer4',
    'bayer8',
    'bayer16',
    'grain',
    'dots',
    'lines',
    'crosshatch',
    'rings',
    'diamonds',
    'bricks',
    'weave',
    'zigzag',
    'scales',
    'sparkles',
    'maze',
    'custom'
  ];
  const diffusionMethods = ['floyd', 'atkinson', 'burkes', 'sierra', 'jjn', 'stucki', 'sierra3'];
  const mod = (v, n) => ((v % n) + n) % n;
  function inkColours(s) {
    return s.mapMode === 'off'
      ? [...s.palette]
      : s.mapMode === 'duo'
        ? [s.mapColours[0], s.mapColours[2]]
        : [...s.mapColours];
  }
  function pattern(method, x, y, s) {
    const m = matrices[method];
    if (m) return (m[mod(y, m.length)][mod(x, m.length)] + 0.5) / (m.length * m.length);
    const u = (mod(x, 8) + 0.5) / 8 - 0.5,
      v = (mod(y, 8) + 0.5) / 8 - 0.5;
    switch (method) {
      case 'grain':
        return noise(x, y, s.seed);
      case 'dots':
        return clamp(
          (((mod(x, 6) + 0.5) / 6 - 0.5) ** 2 + ((mod(y, 6) + 0.5) / 6 - 0.5) ** 2) * 2,
          0,
          1
        );
      case 'lines':
        return (mod(x + y, 6) + 0.5) / 6;
      case 'crosshatch':
        return (mod(x + y, 8) + mod(x - y, 8)) / 14;
      case 'rings':
        return mod(Math.hypot(x, y), 8) / 8;
      case 'diamonds':
        return Math.abs(u) + Math.abs(v);
      case 'bricks':
        return (mod(x + (Math.floor(y / 4) % 2) * 4, 8) + mod(y, 4) * 2) / 14;
      case 'weave':
        return Math.floor(x / 4) % 2 === Math.floor(y / 4) % 2
          ? (mod(x, 4) + 0.5) / 4
          : (mod(y, 4) + 0.5) / 4;
      case 'zigzag':
        return mod(y + Math.abs(mod(x, 12) - 6), 8) / 8;
      case 'scales':
        return clamp(
          Math.hypot((mod(x + (Math.floor(y / 6) % 2) * 4, 8) - 4) / 4, mod(y, 6) / 6) / 1.4,
          0,
          1
        );
      case 'sparkles':
        return clamp(
          Math.min(Math.abs(u), Math.abs(v)) * 3 + Math.max(Math.abs(u), Math.abs(v)) * 0.3,
          0,
          1
        );
      case 'maze':
        return noise(Math.floor(x / 8), Math.floor(y / 8), s.seed) > 0.5
          ? (mod(x, 8) + 0.5) / 8
          : (mod(y, 8) + 0.5) / 8;
      case 'custom':
        return (s.tile[mod(y, 4) * 4 + mod(x, 4)] + 0.5) / 16;
      default:
        return 0.5;
    }
  }
  function blurBright(samples, w, h, r) {
    const a = new Float32Array(w * h),
      b = new Float32Array(w * h),
      out = new Float32Array(w * h);
    for (let i = 0; i < a.length; i++)
      a[i] = Math.max(0, luma(samples.subarray(i * 3, i * 3 + 3)) - 150);
    for (let y = 0; y < h; y++) {
      let sum = 0;
      for (let x = -r; x <= r; x++) sum += a[y * w + clamp(x, 0, w - 1)];
      for (let x = 0; x < w; x++) {
        b[y * w + x] = sum / (2 * r + 1);
        sum += a[y * w + clamp(x + r + 1, 0, w - 1)] - a[y * w + clamp(x - r, 0, w - 1)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += b[clamp(y, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        out[y * w + x] = sum / (2 * r + 1);
        sum += b[clamp(y + r + 1, 0, h - 1) * w + x] - b[clamp(y - r, 0, h - 1) * w + x];
      }
    }
    return out;
  }
  function render(source, opts, phase = 0) {
    const s = settings(opts),
      sw = source.width,
      sh = source.height;
    if (
      !Number.isInteger(sw) ||
      !Number.isInteger(sh) ||
      sw < 1 ||
      sh < 1 ||
      sw * sh > 4194304 ||
      source.data.length !== sw * sh * 4
    )
      throw Error('Invalid source image.');
    if(s.riso.enabled)return Riso.render(source,s,phase);
    const ratio = s.width / Math.max(sw, sh),
      ow = Math.max(1, Math.round(sw * ratio)),
      oh = Math.max(1, Math.round(sh * ratio));
    // ASCII cells are taller so the letters keep their natural proportions.
    const cw = s.method === 'ascii' ? Math.max(5, s.cell) : s.cell,
      ch = s.method === 'ascii' ? cw * 1.5 : cw;
    const w = Math.max(1, Math.ceil(ow / cw)),
      h = Math.max(1, Math.ceil(oh / ch));
    const rawSamples=s.selective.mode!=="off"?new Float32Array(w*h*3):null;
    const samples = new Float32Array(w * h * 3),
      alpha = new Uint8Array(w * h),
      palette = inkColours(s).map(rgb);
    const bg = palette[palette.length - 1],
      angle = (((phase % 1) + 1) % 1) * Math.PI * 2;
    const loopX = Math.cos(angle) - 1,
      loopY = Math.sin(angle),
      amount = (s.amount / ow) * sw;
    const temporalAngle = angle * s.temporalCycles;
    const fx = s.animateEffects ? Math.sin(angle) : 1,
      fy = s.animateEffects ? Math.cos(angle) : 1;
    const contrast = (100 + s.contrast) / 100;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let sx = ((x + 0.5) / w) * sw,
          sy = ((y + 0.5) / h) * sh;
        if (s.motion === 'drift') {
          sx += loopX * amount;
          sy += loopY * amount;
        }
        if (s.motion === 'ripple') sx += Math.sin((y / h) * Math.PI * 2 * s.waves + angle) * amount;
        if (s.motion === 'sway') {
          const a = (loopY * s.amount) / 500,
            dx = sx - sw / 2,
            dy = sy - sh / 2;
          sx = sw / 2 + dx * Math.cos(a) - dy * Math.sin(a);
          sy = sh / 2 + dx * Math.sin(a) + dy * Math.cos(a);
        }
        if (s.motion === 'zoom') {
          const scale = 1 + (loopY * s.amount) / 250;
          sx = sw / 2 + (sx - sw / 2) / scale;
          sy = sh / 2 + (sy - sh / 2) / scale;
        }
        if (s.motion === 'twist') {
          const dx = sx - sw / 2,
            dy = sy - sh / 2;
          const falloff = Math.max(0, 1 - Math.hypot(dx / sw, dy / sh) * 2);
          const turn = ((loopY * s.amount) / 65) * falloff * falloff;
          sx = sw / 2 + dx * Math.cos(turn) - dy * Math.sin(turn);
          sy = sh / 2 + dx * Math.sin(turn) + dy * Math.cos(turn);
        }
        sx += (Math.sin(Math.floor(y / s.effectSize) * 1.7 + s.seed) * s.rowSlip * fx * sw) / ow;
        sx +=
          ((noise(Math.floor(x / s.effectSize), Math.floor(y / s.effectSize), s.seed) - 0.5) *
            s.blockShift *
            2 *
            fx *
            sw) /
          ow;
        // Four taps soften downsampling without making exported pixels blurry.
        const sum = [0, 0, 0, 0];
        for (const [dx, dy] of [
          [-0.25, -0.25],
          [0.25, -0.25],
          [-0.25, 0.25],
          [0.25, 0.25]
        ]) {
          const ix = clamp(Math.floor(sx + (dx * sw) / w), 0, sw - 1),
            iy = clamp(Math.floor(sy + (dy * sh) / h), 0, sh - 1),
            i = (iy * sw + ix) * 4;
          const a = source.data[i + 3] / 255;
          for (let c = 0; c < 3; c++) {
            const split = Math.round(((c - 1) * s.rgbSplit * fy * sw) / ow);
            const ci = (iy * sw + clamp(ix + split, 0, sw - 1)) * 4;
            sum[c] +=
              (source.data[ci + 3] ? source.data[ci + c] : source.data[i + c]) * a +
              bg[c] * (1 - a);
          }
          sum[3] += source.data[i + 3];
        }
        if (s.transparent && sum[3] > 0)
          for (let c = 0; c < 3; c++)
            sum[c] = (((sum[c] - bg[c] * (4 - sum[3] / 255)) * 255) / sum[3]) * 4;
        const i = y * w + x,
          grey = luma(sum) / 4;
        alpha[i] = sum[3] / 4;
        for (let c = 0; c < 3; c++) {
          if(rawSamples)rawSamples[i*3+c]=sum[c]/4;
          let v = grey + ((sum[c] / 4 - grey) * s.saturation) / 100;
          v = (v - 127.5) * contrast + 127.5 + s.brightness * 2.55;
          if (s.motion === 'breathe') v += Math.sin(angle) * s.amount * 2;
          v = 255 * Math.pow(clamp(v / 255, 0, 1), 1 / s.gamma);
          if (s.posterize >= 2)
            v =
              (Math.round((v / 255) * (Math.round(s.posterize) - 1)) /
                (Math.round(s.posterize) - 1)) *
              255;
          v += (noise(x, y, s.seed + 113) - 0.5) * s.grain * 2;
          v -= s.scanlines * (0.5 + 0.5 * Math.cos((y * Math.PI * 2) / s.effectSize)) * 0.9;
          v -= s.vignette * ((x / w - 0.5) ** 2 + (y / h - 0.5) ** 2) * 3;
          if (s.solarize)
            v = v * (1 - s.solarize / 100) + ((v > 127.5 ? 255 - v : v) * s.solarize) / 100;
          if (s.temporal === 'tide') v += Math.sin(temporalAngle) * s.temporalAmount * 2;
          if (s.temporal === 'boil')
            v += Math.sin(temporalAngle + noise(x, y, s.seed) * Math.PI * 2) * s.temporalAmount * 2;
          if (s.temporal === 'roll')
            v += Math.sin(temporalAngle + (y / h) * Math.PI * 2) * s.temporalAmount * 2;
          if (s.temporal === 'rings')
            v +=
              Math.sin(Math.hypot(x / w - 0.5, y / h - 0.5) * Math.PI * 10 - temporalAngle) *
              s.temporalAmount *
              2;
          if (s.temporal === 'weave')
            v +=
              (Math.sin((x / w) * Math.PI * 8 + temporalAngle) +
                Math.sin((y / h) * Math.PI * 8 - temporalAngle)) *
              s.temporalAmount;
          if (s.temporal === 'shimmer')
            v += Math.sin(temporalAngle + (x + y) * Math.PI) * s.temporalAmount * 2;
          samples[i * 3 + c] = s.invert ? 255 - v : v;
        }
      }
    // Sharpen the sampled tones before mapping them to ink.
    if (s.edge) {
      const base = samples.slice();
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          for (let c = 0; c < 3; c++) {
            const i = (y * w + x) * 3 + c;
            const neighbours = [
              base[(y * w + Math.max(0, x - 1)) * 3 + c],
              base[(y * w + Math.min(w - 1, x + 1)) * 3 + c],
              base[(Math.max(0, y - 1) * w + x) * 3 + c],
              base[(Math.min(h - 1, y + 1) * w + x) * 3 + c]
            ];
            samples[i] = clamp(
              base[i] + ((base[i] - neighbours.reduce((a, b) => a + b, 0) / 4) * s.edge) / 25,
              0,
              255
            );
          }
    }
    if (s.bloom) {
      const glow = blurBright(samples, w, h, s.bloomRadius);
      for (let i = 0; i < w * h; i++)
        for (let c = 0; c < 3; c++)
          samples[i * 3 + c] = clamp(samples[i * 3 + c] + (glow[i] * s.bloom) / 40, 0, 255);
    }
    if (s.mapMode !== 'off') {
      for (let i = 0; i < w * h; i++) {
        const t =
          clamp(luma(samples.subarray(i * 3, i * 3 + 3)) / 255, 0, 1) * (palette.length - 1);
        const a = Math.min(palette.length - 2, Math.floor(t)),
          f = t - a;
        for (let c = 0; c < 3; c++)
          samples[i * 3 + c] = palette[a][c] * (1 - f) + palette[a + 1][c] * f;
      }
    }
    let asciiLow = 0, asciiHigh = 255;
    if (s.method === 'ascii' && s.asciiStretch) {
      let low = Infinity, high = -Infinity;
      for (let i = 0; i < w * h; i++) if (alpha[i] > 0) {
        const value = luma(samples.subarray(i * 3, i * 3 + 3));
        low = Math.min(low, value); high = Math.max(high, value);
      }
      if (high - low > 1) { asciiLow = low; asciiHigh = high; }
    }
    const out = new Uint8ClampedArray(w * h * 4),
      glyphs = s.method === 'ascii' ? [] : null;
    const nearest = (r, g, b) => {
      let best = 0,
        distance = Infinity;
      palette.forEach((p, i) => {
        const d = (p[0] - r) ** 2 * 0.2126 + (p[1] - g) ** 2 * 0.7152 + (p[2] - b) ** 2 * 0.0722;
        if (d < distance) {
          distance = d;
          best = i;
        }
      });
      return palette[best];
    };
    const diffusion = diffusionMethods.includes(s.method);
    const taps =
      s.method === 'jjn'
        ? [
            [1, 0, 7 / 48],
            [2, 0, 5 / 48],
            [-2, 1, 3 / 48],
            [-1, 1, 5 / 48],
            [0, 1, 7 / 48],
            [1, 1, 5 / 48],
            [2, 1, 3 / 48],
            [-2, 2, 1 / 48],
            [-1, 2, 3 / 48],
            [0, 2, 5 / 48],
            [1, 2, 3 / 48],
            [2, 2, 1 / 48]
          ]
        : s.method === 'stucki'
          ? [
              [1, 0, 8 / 42],
              [2, 0, 4 / 42],
              [-2, 1, 2 / 42],
              [-1, 1, 4 / 42],
              [0, 1, 8 / 42],
              [1, 1, 4 / 42],
              [2, 1, 2 / 42],
              [-2, 2, 1 / 42],
              [-1, 2, 2 / 42],
              [0, 2, 4 / 42],
              [1, 2, 2 / 42],
              [2, 2, 1 / 42]
            ]
          : s.method === 'sierra3'
            ? [
                [1, 0, 5 / 32],
                [2, 0, 3 / 32],
                [-2, 1, 2 / 32],
                [-1, 1, 4 / 32],
                [0, 1, 5 / 32],
                [1, 1, 4 / 32],
                [2, 1, 2 / 32],
                [-1, 2, 2 / 32],
                [0, 2, 3 / 32],
                [1, 2, 2 / 32]
              ]
            : s.method === 'burkes'
              ? [
                  [1, 0, 8 / 32],
                  [2, 0, 4 / 32],
                  [-2, 1, 2 / 32],
                  [-1, 1, 4 / 32],
                  [0, 1, 8 / 32],
                  [1, 1, 4 / 32],
                  [2, 1, 2 / 32]
                ]
              : s.method === 'sierra'
                ? [
                    [1, 0, 2 / 4],
                    [-1, 1, 1 / 4],
                    [0, 1, 1 / 4]
                  ]
                : s.method === 'floyd'
                  ? [
                      [1, 0, 7 / 16],
                      [-1, 1, 3 / 16],
                      [0, 1, 5 / 16],
                      [1, 1, 1 / 16]
                    ]
                  : [
                      [1, 0, 1 / 8],
                      [2, 0, 1 / 8],
                      [-1, 1, 1 / 8],
                      [0, 1, 1 / 8],
                      [1, 1, 1 / 8],
                      [0, 2, 1 / 8]
                    ];
    const chars = [...s.chars],
      sorted = [...palette].sort((a, b) => luma(a) - luma(b));
    const rad = (s.patternAngle * Math.PI) / 180,
      cosine = Math.cos(rad),
      sine = Math.sin(rad);
    for (let y = 0; y < h; y++) {
      const dir = diffusion && s.serpentine && y % 2 ? -1 : 1;
      for (let step = 0; step < w; step++) {
        const x = dir === 1 ? step : w - step - 1,
          i = y * w + x;
        const px = Math.floor((x * cosine - y * sine) / s.patternScale + s.patternX);
        const py = Math.floor((x * sine + y * cosine) / s.patternScale + s.patternY);
        let threshold = pattern(s.method, px, py, s);
        if (s.duet !== 'off') {
          const light = luma(samples.subarray(i * 3, i * 3 + 3)) / 255;
          let mix = clamp((light - s.duetBalance / 100) / (s.duetSoftness / 100) + 0.5, 0, 1);
          mix = mix * mix * (3 - 2 * mix);
          threshold = threshold * (1 - mix) + pattern(s.duet, px, py, s) * mix;
        }
        let shift = (threshold - 0.5) * 255;
        // More inks need smaller threshold offsets to keep gentle colour transitions.
        shift *= s.strength / 100 / (palette.length - 1);
        if (s.motion === 'crawl')
          shift += Math.sin(angle + noise(x, y, s.seed) * Math.PI * 2) * s.amount * 3;
        const value = [0, 1, 2].map((c) => samples[i * 3 + c] + shift);
        const color = nearest(...value);
        const printed = s.reverseInks
          ? palette[palette.length - 1 - palette.indexOf(color)]
          : color;
        out.set([...printed, s.transparent ? alpha[i] : 255], i * 4);
        if (glyphs) {
          const tone = clamp((luma(value) - asciiLow) / (asciiHigh - asciiLow), 0, 1);
          glyphs[i] = chars[Math.round((1 - tone) * (chars.length - 1))];
          out.set(
            [...(s.reverseInks ? sorted.at(-1) : sorted[0]), s.transparent ? alpha[i] : 255],
            i * 4
          );
        }
        if (diffusion && (!s.transparent || alpha[i] > 0)) {
          for (const [dx, dy, weight] of taps) {
            const xx = x + dx * dir * s.diffusionReach,
              yy = y + dy * s.diffusionReach;
            if (xx < 0 || xx >= w || yy >= h) continue;
            const j = yy * w + xx;
            if (s.transparent && alpha[j] === 0) continue;
            for (let c = 0; c < 3; c++)
              samples[j * 3 + c] += ((value[c] - color[c]) * weight * s.strength) / 100;
          }
        }
      }
    }
    const protectedCells=rawSamples?new Uint8Array(w*h):null;
    if(rawSamples){const colours=s.selective.colours.map(rgb),distance=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2,threshold=(s.selective.tolerance/100*441.673)**2;for(let i=0;i<w*h;i++){const raw=Array.from(rawSamples.subarray(i*3,i*3+3)),picked=colours.some(c=>distance(raw,c)<=threshold+.001),apply=s.selective.mode==="include"?picked:!picked;if(apply)continue;protectedCells[i]=1;const colour=s.selective.retain==="source"?raw:palette.reduce((best,c)=>distance(raw,c)<distance(raw,best)?c:best,palette[0]);out.set([...colour,s.transparent?alpha[i]:255],i*4);}}
    return {
      protectedCells,
      data: out,
      width: w,
      height: h,
      outputWidth: ow,
      outputHeight: oh,
      glyphs,
      background: s.reverseInks ? sorted[0] : sorted.at(-1),
      transparent: s.transparent
    };
  }
  const api = {
    render,
    settings,
    defaults,
    methods,
    motions,
    bayer,
    noise,
    patternMethods,
    diffusionMethods,
    inkColours,
    pattern
  };
  if (typeof module !== 'undefined') module.exports = api;
  else root.Dither = api;
})(globalThis);
