// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Cameron Jago Lis Illustrates.
'use strict';
Object.assign(methodHints, {
  bayer16: 'A large ordered matrix for finely stepped tones.',
  jjn: 'Spreads colour error over two rows, for a soft, open scatter.',
  stucki: 'A broad scatter with stronger neighbouring marks and fine texture.',
  sierra3: 'A full three-row Sierra scatter, with a gently woven grain.',
  diamonds: 'Little diamonds that open into an argyle-like texture.',
  bricks: 'Staggered rows, like ink on a little garden wall.',
  weave: 'Alternating horizontal and vertical marks, like woven fabric.',
  zigzag: 'Repeated chevrons that bend through the tones.',
  scales: 'Offset curved marks, like overlapping fish scales.',
  sparkles: 'Cross-shaped marks that gather into little stars.',
  maze: 'Small blocks of horizontal and vertical lines that find their own way.',
  custom: 'Your own repeating 4 × 4 threshold tile. Open Your little tile to edit it.'
});
Object.assign(recipes, {
  picnic: {
    method: 'diamonds',
    cell: 2,
    duet: 'lines',
    duetBalance: 48,
    duetSoftness: 40,
    palette: inks.moss,
    temporal: 'roll',
    temporalAmount: 8
  },
  late: {
    method: 'weave',
    cell: 2,
    mapMode: 'trio',
    mapColours: ['#171d3c', '#bc5d90', '#ffda84'],
    bloom: 35,
    bloomRadius: 4,
    temporal: 'boil',
    temporalAmount: 5
  },
  signal: {
    method: 'bayer8',
    cell: 2,
    palette: inks.blue,
    rowSlip: 7,
    rgbSplit: 6,
    scanlines: 18,
    effectSize: 10,
    animateEffects: true
  }
});
function reverseInks() {
  closeInk();
  opts.reverseInks = !opts.reverseInks;
  remember();
  sync();
  requestPrint();
}
function syncEffects() {
  $('swapInks').textContent = opts.reverseInks ? 'Inks reversed · undo' : 'Reverse inks';
  $('swapInks').setAttribute('aria-pressed', String(opts.reverseInks));
  $('diffusionControls').hidden = !Dither.diffusionMethods.includes(opts.method);
  $('tileControls').hidden = opts.method !== 'custom' && opts.duet !== 'custom';
  const ordered = Dither.patternMethods.includes(opts.method) || opts.duet !== 'off';
  for (const id of ['patternX', 'patternY', 'patternScale', 'patternAngle'])
    $(id).disabled = !ordered;
  $('mapFields').hidden = opts.mapMode === 'off';
  $('mapMiddle').hidden = opts.mapMode === 'duo';
  for (let i = 0; i < 3; i++) $('map' + i).value = opts.mapColours[i];
  $('mapPreview').style.background =
    'linear-gradient(to right,' + Dither.inkColours(opts).join(',') + ')';
  $('paletteList').classList.toggle('inactive-inks', opts.mapMode !== 'off');
  $('paletteList').inert = opts.mapMode !== 'off';
  $('palettePreset').disabled = opts.mapMode !== 'off';
  $('extractPalette').disabled = opts.mapMode !== 'off';
  $('addInk').disabled = opts.mapMode !== 'off' || opts.palette.length >= 8;
  const focused = document.activeElement?.dataset.tile;
  $('tileEditor').replaceChildren();
  opts.tile.forEach((v, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.tile = i;
    b.textContent = v + 1;
    b.style.background =
      'rgb(' + [0, 0, 0].map(() => Math.round((v / 15) * 230 + 15)).join(',') + ')';
    b.style.color = v < 8 ? '#fff' : '#111';
    b.setAttribute(
      'aria-label',
      'Row ' +
        (Math.floor(i / 4) + 1) +
        ', column ' +
        ((i % 4) + 1) +
        ', threshold ' +
        (v + 1) +
        '. Paint selected value.'
    );
    b.onclick = () => {
      opts.tile[i] = +$('tileBrush').value;
      remember();
      sync();
      requestPrint();
    };
    $('tileEditor').append(b);
    if (focused === String(i)) b.focus({ preventScroll: true });
  });
}
function layerFill(g, l, box) {
  if (!l.fillMode || l.fillMode === 'solid') return l.colour;
  const rad = (l.gradientAngle * Math.PI) / 180;
  const dx = (Math.cos(rad) * box.w) / 2,
    dy = (Math.sin(rad) * box.h) / 2;
  const fill =
    l.fillMode === 'radial'
      ? g.createRadialGradient(0, 0, 0, 0, 0, Math.max(box.w, box.h) / 2)
      : g.createLinearGradient(-dx, -dy, dx, dy);
  fill.addColorStop(0, l.colour);
  fill.addColorStop(1, l.colour2);
  return fill;
}
function addGradient() {
  if (scene.layers.length >= 12) return toast('There is room for 12 layers.');
  const l = {
    ...layerBase('A wash of colour', 'gradient'),
    w: scene.width,
    h: scene.height,
    fillMode: 'linear',
    colour: '#302547',
    colour2: '#f4c696',
    gradientAngle: 35
  };
  // A fresh wash goes behind the collage, ready for lettering on top.
  scene.layers.unshift(l);
  scene.active = l.id;
  changedLayer();
  showTab('layers');
  toast('Gradient added behind your layers. Raise it to use it over an image.');
}
function separateInkCanvases(canvas, s) {
  const colours = Dither.inkColours(s).map((hex) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  );
  const pixels = pixelsOf(canvas).data;
  const plates = colours.map(() => new Uint8ClampedArray(pixels.length));
  for (let i = 0; i < pixels.length; i += 4) {
    if (!pixels[i + 3]) continue;
    let best = 0,
      distance = Infinity;
    colours.forEach((c, n) => {
      const d =
        (c[0] - pixels[i]) ** 2 * 0.2126 +
        (c[1] - pixels[i + 1]) ** 2 * 0.7152 +
        (c[2] - pixels[i + 2]) ** 2 * 0.0722;
      if (d < distance) {
        distance = d;
        best = n;
      }
    });
    // Keep original RGBA at the edges, rather than recolouring anti-aliasing.
    plates[best].set(pixels.subarray(i, i + 4), i);
  }
  return plates.map((data) => {
    const c = makeCanvas(canvas.width, canvas.height);
    c.getContext('2d').putImageData(new ImageData(data, c.width, c.height), 0, 0);
    return c;
  });
}
function handleKeys(e) {
  if (busy || e.defaultPrevented || document.querySelector('dialog:modal')) return;
  const key = e.key.toLowerCase(),
    cmd = e.ctrlKey || e.metaKey;
  const typing = /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.target.isContentEditable;
  if (cmd && key === 's') {
    e.preventDefault();
    safe(saveProject);
    return;
  }
  if (typing || e.altKey || e.target.id === 'splitLine') return;
  const inLayers =
    document.querySelector('[data-tab="layers"]').getAttribute('aria-selected') === 'true';
  let action;
  if (cmd) {
    if (key === 'o') action = () => $('projectFile').click();
    if (key === 'e') action = () => $('exportBtn').click();
    if (key === 'z') action = () => safe(() => restore(e.shiftKey ? 1 : -1));
    if (key === 'y') action = () => safe(() => restore(1));
    if (key === 'd' && inLayers) action = () => $('layerDuplicate').click();
  } else {
    if (e.code === 'Space') action = togglePlay;
    if (key === '?') action = () => $('helpDialog').showModal();
    if (['1', '2', '3', '4', '5'].includes(key))
      action = () => showTab(['print', 'ink', 'move', 'layers', 'play'][+key - 1]);
    if (key === 'b')
      action = () => {
        $('viewMode').value = $('viewMode').value === 'split' ? 'result' : 'split';
        syncCompare();
      };
    if (key === 'r') action = reverseInks;
    if (key === 'f') action = () => $('fitBtn').click();
    if (key === '0') action = () => $('fitBtn').click();
    if (key === 'h') action = () => $('panBtn').click();
    if (key === 'escape') action = closeInk;
    if (key === '[' || key === ']')
      action = () => {
        opts.cell = clamp(opts.cell + (key === ']' ? 1 : -1), 1, 24);
        remember();
        sync();
        requestPrint();
      };
    if (key === ',' || key === '.')
      action = () => {
        pause();
        phase = ((frame + (key === '.' ? 1 : -1) + frameCount()) % frameCount()) / frameCount();
        syncTimeline();
        requestPrint();
      };
    if (inLayers && key === 'delete') action = () => $('layerDelete').click();
    if (inLayers && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(key))
      action = () => {
        const l = selectedLayer();
        if (!l) return;
        const step = e.shiftKey ? 10 : 1;
        l.x = clamp(
          l.x + (key === 'arrowright' ? step : key === 'arrowleft' ? -step : 0),
          -2400,
          3600
        );
        l.y = clamp(
          l.y + (key === 'arrowdown' ? step : key === 'arrowup' ? -step : 0),
          -2400,
          3600
        );
        changedLayer();
      };
  }
  if (action) {
    e.preventDefault();
    action();
  }
}
$('addGradient').onclick = addGradient;
$('themeHelp').onclick = () => $('helpDialog').showModal();
for (const el of document.querySelectorAll('[data-map]')) {
  el.oninput = () => {
    opts.mapColours[+el.dataset.map] = el.value;
    syncEffects();
    requestPrint();
  };
  el.onchange = remember;
}
const mapRecipes = {
  sunset: ['#302547', '#db7960', '#fff1bd'],
  acid: ['#261d40', '#d34c92', '#dcff72'],
  sea: ['#112e48', '#329d9c', '#ffe0a8']
};
for (const b of document.querySelectorAll('[data-map-preset]'))
  b.onclick = () => {
    opts.mapColours = [...mapRecipes[b.dataset.mapPreset]];
    remember();
    sync();
    requestPrint();
  };
$('tileChecks').onclick = () => {
  opts.tile = [...Dither.defaults.tile];
  remember();
  sync();
  requestPrint();
};
$('tileDiagonal').onclick = () => {
  opts.tile = Array.from({ length: 16 }, (_, i) => (((i % 4) + Math.floor(i / 4)) % 4) * 4);
  remember();
  sync();
  requestPrint();
};
$('tileShuffle').onclick = () => {
  opts.tile = Array.from({ length: 16 }, (_, i) => i);
  for (let i = 15; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opts.tile[i], opts.tile[j]] = [opts.tile[j], opts.tile[i]];
  }
  remember();
  sync();
  requestPrint();
};
$('resetEffects').onclick = () => {
  for (const key of [
    'rowSlip',
    'blockShift',
    'rgbSplit',
    'effectSize',
    'scanlines',
    'vignette',
    'solarize',
    'bloom',
    'bloomRadius',
    'animateEffects'
  ])
    opts[key] = Dither.defaults[key];
  remember();
  sync();
  requestPrint();
};
safe(async () => {
  opts.method = 'atkinson';
  opts.cell = 2;
  opts.contrast = 0;
  await loadStudy('morning', false);
  remember();
  markSaved();
  window.appReady = true;
});
