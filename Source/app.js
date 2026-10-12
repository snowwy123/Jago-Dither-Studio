// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Cameron Jago Lis Illustrates.
'use strict';
const $ = (id) => document.getElementById(id);
const copy = (v) => JSON.parse(JSON.stringify(v));
const inks = {
  blue: ['#283e50', '#fcf6e7'],
  mono: ['#211f20', '#fffdf5'],
  pink: ['#4b2c4f', '#bb617d', '#ffeddf'],
  moss: ['#273e38', '#748a61', '#c3c895', '#f3edcb'],
  sunset: ['#35304f', '#80546e', '#d48477', '#f8d6a0'],
  candy: ['#36294b', '#9b66ab', '#e985a5', '#f9c9a4', '#fff4d7'],
  grey: ['#25272b', '#626266', '#a9a5a0', '#efebe4'],
  risograph: ['#273959', '#cf5148', '#f4c79a', '#fff3d9'],
  petrol: ['#193f47', '#cf7466', '#f3d4ad', '#fff3de'],
  lavender: ['#363044', '#796783', '#b5a7c1', '#f2e9f1'],
  arcade: ['#172132', '#257b88', '#66d9bd', '#edffbf'],
  parcel: ['#392d26', '#8b5f3e', '#c29863', '#ead7ae'],
  fern: ['#163d31', '#63844c', '#b9bf72', '#f2e9b5']
};
const methodHints = {
  bayer2: 'Bold little checks, with a tidy repeating rhythm.',
  bayer4: 'An ordered pattern for a classic printed look.',
  bayer8: 'A finer repeating pattern, especially nice in smooth gradients.',
  floyd: 'Passes each pixel’s colour error to its neighbours. Soft, irregular texture.',
  atkinson: 'A lighter scatter with crisp shapes and a little less detail.',
  grain: 'A fixed, speckled texture. The same settings always make the same print.',
  dots: 'Clustered dots that grow and shrink with the image tones.',
  lines: 'Diagonal hatching, with darker areas filling in.',
  threshold: 'Just the nearest ink. Hard edges, no dither pattern.',
  ascii: 'Turns tones into characters. Put light marks first and dense marks last.'
};
const motionHints = {
  zoom: 'A slow push in and out, like a lens taking a breath.',
  twist: 'A soft twist in the middle, easing away towards the edges.',
  none: 'Keep the print still. You can still scrub and export a single frame.',
  drift: 'A small circular wander across the source image. Edges extend rather than wrap.',
  ripple: 'A travelling wave bends the image from side to side.',
  sway: 'A gentle turn around the centre of the image.',
  breathe: 'Light and dark tones ebb and return, changing the amount of ink.',
  crawl: 'The grain shifts in a repeating cycle while the picture stays in place.'
};
let opts = copy(Dither.defaults),
  source = null,
  sourcePNG = '',
  sourceName = 'A quiet morning';
let phase = 0,
  playing = false,
  playStart = 0,
  frame = 0,
  busy = false,
  cancelled = false,
  dirty = false;
let history = [],
  historyIndex = -1,
  revision = 0,
  pending = null,
  rendering = false,
  fitView = true,
  latest = null;
let inkIndex = null,
  hsv = { h: 0, s: 0, v: 0 },
  wheelDrag = null,
  toastTimer;
const result = $('resultCanvas'),
  original = $('originalCanvas');
const workerURL = URL.createObjectURL(
  new Blob(
    [
      engineSource,
      '\nlet source; onmessage=e=>{ const m=e.data; try { if(m.type==="source"){source=m.source;postMessage({id:m.id,ok:true});}else{ if(m.source)source=m.source; const out=Dither.render(source,m.opts,m.phase);postMessage({id:m.id,out},[out.data.buffer]);}}catch(error){postMessage({id:m.id,error:error.message});}}'
    ],
    { type: 'text/javascript' }
  )
);
const worker = new Worker(workerURL);
URL.revokeObjectURL(workerURL);
let job = 0;
const jobs = new Map();
worker.onmessage = ({ data }) => {
  const task = jobs.get(data.id);
  if (!task) return;
  jobs.delete(data.id);
  data.error ? task.reject(Error(data.error)) : task.resolve(data.out || true);
};
worker.onerror = () => {
  for (const task of jobs.values())
    task.reject(Error('The print worker stopped. Save your project and reopen the app.'));
  jobs.clear();
  toast('The print worker stopped. Please reopen the app.');
};
let sentWorkerSource=null;
function callWorker(data) {
  return new Promise((resolve, reject) => {
    const id = ++job;
    jobs.set(id, { resolve, reject });
    const message={...data,id};if(data.source&&data.source===sentWorkerSource)delete message.source;else if(data.source)sentWorkerSource=data.source;worker.postMessage(message);
  });
}
function toast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 4200);
}
function snapshot() {
  return { opts: copy(opts), scene: copy(scene), name: sourceName };
}
function remember() {
  const state = snapshot();
  if (history[historyIndex] && JSON.stringify(history[historyIndex]) === JSON.stringify(state))
    return;
  history.splice(historyIndex + 1);
  history.push(state);
  if (history.length > 24) history.shift();
  historyIndex = history.length - 1;
  checkUnsaved();
  syncHistory();
  pruneAssets();
}
function syncHistory() {
  $('undoBtn').disabled = historyIndex < 1;
  $('redoBtn').disabled = historyIndex >= history.length - 1;
}
async function restore(delta) {
  if (busy) return;
  closeInk();
  const index = historyIndex + delta;
  if (index < 0 || index >= history.length) return;
  pause();
  const state = history[index];
  scene = copy(state.scene);
  refreshSource(phase);
  opts = copy(state.opts);
  sourceName = state.name;
  historyIndex = index;
  checkUnsaved();
  sync();
  requestPrint();
}
function pause() {
  playing = false;
  $('playBtn').textContent = '▶';
  $('playBtn').setAttribute('aria-label', 'Play loop');
}
function togglePlay() {
  if (busy) return;
  if (playing) {
    pause();
    return;
  }
  if (opts.motion === 'none' && !sceneMoves() && opts.temporal === 'none' && !opts.animateEffects) {
    toast('Choose a movement first, then press Play.');
    showTab('move');
    return;
  }
  playing = true;
  playStart = performance.now() - phase * opts.seconds * 1000;
  $('playBtn').textContent = 'Ⅱ';
  $('playBtn').setAttribute('aria-label', 'Pause loop');
}
function frameCount() {
  return Math.round(opts.seconds * opts.fps);
}
function syncTimeline() {
  const count = frameCount();
  frame = Math.min(count - 1, Math.floor(phase * count));
  $('scrub').max = count - 1;
  $('scrub').value = frame;
  $('frameLabel').textContent = String(frame + 1).padStart(2, '0') + ' / ' + count;
  $('loopInfo').textContent = opts.seconds + ' seconds · ' + opts.fps + ' fps';
}
function showTab(name) {
  document
    .querySelectorAll('[data-tab]')
    .forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  document.querySelectorAll('[data-panel]').forEach((p) => (p.hidden = p.dataset.panel !== name));
}
function sync() {
  for (const input of document.querySelectorAll('[data-setting]')) {
    const key = input.dataset.setting;
    if (input.type === 'checkbox') input.checked = opts[key];
    else input.value = opts[key];
    const out = $(key + 'Value');
    if (out)
      out.textContent =
        opts[key] +
        ({
          cell: ' px',
          strength: '%',
          brightness: '',
          contrast: '',
          gamma: '',
          saturation: '%',
          amount: '',
          waves: '',
          seconds: ' sec'
        }[key] || '');
  }
  $('charsField').hidden = opts.method !== 'ascii';
  $('asciiStretchField').hidden = opts.method !== 'ascii';
  $('strength').disabled = ['threshold', 'ascii'].includes(opts.method);
  for (const id of ['patternScale', 'patternAngle'])
    $(id).disabled = ![
      'bayer2',
      'bayer4',
      'bayer8',
      'dots',
      'lines',
      'crosshatch',
      'rings'
    ].includes(opts.method);
  $('posterizeValue').textContent = opts.posterize < 2 ? 'Off' : Math.round(opts.posterize);
  $('methodHint').textContent = methodHints[opts.method];
  $('motionHint').textContent = motionHints[opts.motion];
  $('waveField').hidden = opts.motion !== 'ripple';
  $('amount').disabled = opts.motion === 'none';
  $('motionQuick').value = opts.motion;
  $('projectName').value = sourceName;
  $('palettePreset').value =
    Object.keys(inks).find((key) => JSON.stringify(inks[key]) === JSON.stringify(opts.palette)) ||
    'custom';
  renderPalette();
  syncTimeline();
  syncHistory();
  syncLayers();
  syncEffects();
}
function renderPalette() {
  const list = $('paletteList');
  list.replaceChildren();
  opts.palette.forEach((hex, i) => {
    const row = document.createElement('div');
    row.className = 'ink-row';
    const pick = document.createElement('button');
    pick.className = 'ink-swatch';
    pick.title = 'Edit ink ' + (i + 1);
    const swatch = document.createElement('i');
    swatch.style.background = hex;
    const label = document.createElement('span');
    label.textContent = hex + ' · ' + (i === opts.palette.length - 1 ? 'paper' : 'ink ' + (i + 1));
    pick.append(swatch, label);
    pick.onclick = () => openInk(i);
    const remove = document.createElement('button');
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Remove ink ' + (i + 1));
    remove.disabled = opts.palette.length <= 2;
    remove.onclick = () => {
      closeInk();
      opts.palette.splice(i, 1);
      remember();
      sync();
      requestPrint();
    };
    row.append(pick, remove);
    list.append(row);
  });
  $('addInk').disabled = opts.palette.length >= 8;
}
function requestPrint() {
  if (!source) return;
  revision++;
  pending = { opts: copy(opts), phase, rev: revision, sceneKey:JSON.stringify(scene) };
  pump();
}
async function pump() {
  if (rendering || busy || !pending) return;
  const request = pending;
  pending = null;
  rendering = true;
  const started = performance.now();
  try {
    const composed = compose(request.phase);
    const out = await callWorker({
      type: 'render',
      source: pixelsOf(composed),
      opts: request.opts,
      phase: request.phase
    });
    if (request.rev === revision || (playing&&request.sceneKey===JSON.stringify(scene)&&JSON.stringify(request.opts)===JSON.stringify(opts))) {
      latest = out;
      paintOutput(result, out, 1, request.phase);
      sourceCanvas = composed;
      source = pixelsOf(composed);
      drawOriginal(request.phase);
      fitPaper();
      $('dimensions').textContent = scene.width + ' × ' + scene.height;
      $('dimensions').title =
        'Resize page · print output ' + out.outputWidth + ' × ' + out.outputHeight;
      $('renderTime').textContent = Math.round(performance.now() - started) + ' ms';
      $('statusText').textContent = opts.riso.enabled?'Layered inks / '+opts.riso.screen+' screen':playing
        ? 'Looping on the print table'
        : methodHints[opts.method].split('.')[0] + '.';
    }
  } catch (e) {
    toast(e.message);
  } finally {
    rendering = false;
    pump();
  }
}
function paintOutput(canvas, out, scale, t = null) {
  canvas.width = out.outputWidth * scale;
  canvas.height = out.outputHeight * scale;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, canvas.width, canvas.height);
  g.imageSmoothingEnabled = false;
  if (out.glyphs) {
    if (!out.transparent) {
      g.fillStyle = 'rgb(' + out.background.join(',') + ')';
      g.fillRect(0, 0, canvas.width, canvas.height);
    }
    const cw = canvas.width / out.width,
      ch = canvas.height / out.height;
    g.font = 'bold ' + ch * 0.88 + 'px "Courier New", monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let y = 0; y < out.height; y++)
      for (let x = 0; x < out.width; x++) {
        const i = y * out.width + x;
        g.fillStyle = `rgba(${out.data[i * 4]},${out.data[i * 4 + 1]},${out.data[i * 4 + 2]},${out.data[i * 4 + 3] / 255})`;
        if(out.protectedCells?.[i])g.fillRect(x*cw,y*ch,cw,ch);else g.fillText(out.glyphs[i], (x + 0.5) * cw, (y + 0.5) * ch, cw);
      }
  } else {
    const small = document.createElement('canvas');
    small.width = out.width;
    small.height = out.height;
    small.getContext('2d').putImageData(new ImageData(out.data, out.width, out.height), 0, 0);
    g.drawImage(small, 0, 0, canvas.width, canvas.height);
  }
  if (t !== null) paintAfterOverlays(canvas, t);
}
function drawOriginal(t = phase) {
  if (!source) return;
  original.width = result.width;
  original.height = result.height;
  original.getContext('2d').drawImage(sourceCanvas, 0, 0, original.width, original.height);
  paintAfterOverlays(original, t);
  syncCompare();
}
let sourceCanvas = null;
function fitPaper() {
  if (!result.width) return;
  const box = $('dropZone');
  if (fitView) {
    viewScale = Math.max(
      0.05,
      Math.min((box.clientWidth - 80) / result.width, (box.clientHeight - 76) / result.height, 2)
    );
    viewX = (box.clientWidth - result.width * viewScale) / 2;
    viewY = (box.clientHeight - result.height * viewScale) / 2;
  }
  const paper = $('paper');
  paper.style.width = result.width * viewScale + 'px';
  paper.style.height = result.height * viewScale + 'px';
  paper.style.left = viewX + 'px';
  paper.style.top = viewY + 'px';
  $('zoomReadout').textContent = Math.round(viewScale * 100) + '%';
}
function syncCompare() {
  const mode = $('viewMode').value,
    p = +$('compare').value;
  original.classList.toggle('visible', mode !== 'result');
  original.style.clipPath = mode === 'split' ? `inset(0 ${100 - p}% 0 0)` : 'none';
  $('splitLine').style.display = mode === 'split' ? 'block' : 'none';
  $('splitLine').style.left = p + '%';
  $('compareRow').hidden = mode !== 'split';
  $('splitLine').setAttribute('aria-valuenow', p);
}
async function decodeImage(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  if (image.naturalWidth * image.naturalHeight > 64000000)
    throw Error('That image is very large. Resize it below 64 megapixels first.');
  return image;
}
async function importImage(file) {
  if (!file || busy) return;
  if (/\.zip$/i.test(file.name)) return importSequence(file);
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw Error('Choose a still PNG, JPEG or WebP image.');
  if (file.size > 20 * 1024 * 1024) throw Error('Use an image below 20 MB.');
  const url = URL.createObjectURL(file);
  try {
    await addImage(await decodeImage(url), file.name.replace(/\.[^.]+$/, ''));
    toast('Image added as a layer. Drag it in Layers, or adjust its size.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
function download(blob, name, prepared) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  if (prepared) prepared(url);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function fileName(ext) {
  return (sourceName.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'Little print') + ext;
}
async function safe(action) {
  try {
    await action();
  } catch (e) {
    toast(e.message || 'That did not work. Please try again.');
    console.warn(e);
  }
}
document.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));
document.querySelectorAll('[data-setting]').forEach((input) => {
  const update = () => {
    const key = input.dataset.setting,
      value =
        input.type === 'checkbox'
          ? input.checked
          : ['method', 'motion', 'chars', 'mapMode', 'duet', 'temporal'].includes(key)
            ? input.value
            : Number(input.value);
    try {
      opts = Dither.settings({ ...opts, [key]: value });
      if (key === 'motion' && value === 'none') pause();
      sync();
      requestPrint();
    } catch (e) {
      toast(e.message);
      sync();
    }
  };
  if (input.dataset.setting === 'chars') {
    input.oninput = () => {
      const value = input.value;
      if ([...value].length < 2 || [...value].length > 16 || /[\r\n\t]/.test(value)) return;
      opts = Dither.settings({ ...opts, chars: value });
      requestPrint();
    };
    input.onchange = () => { update(); remember(); };
  } else if (input.type === 'range') {
    input.oninput = update;
    input.onchange = remember;
  } else
    input.onchange = () => {
      update();
      remember();
    };
});
$('projectName').onchange = () => {
  sourceName = $('projectName').value.trim() || 'Untitled print';
  remember();
};
$('importBtn').onclick = () => $('imageFile').click();
$('imageFile').onchange = (e) =>
  safe(async () => {
    await importImage(e.target.files[0]);
    e.target.value = '';
  });
$('openBtn').onclick = () => $('projectFile').click();
$('projectFile').onchange = (e) =>
  safe(async () => {
    await readProject(e.target.files[0]);
    e.target.value = '';
  });
$('saveBtn').onclick = () => safe(saveProject);
$('undoBtn').onclick = () => safe(() => restore(-1));
$('redoBtn').onclick = () => safe(() => restore(1));
$('helpBtn').onclick = () => $('helpDialog').showModal();
document.querySelectorAll('[data-close]').forEach(
  (b) =>
    (b.onclick = () => {
      if (b.closest('dialog').id === 'exportDialog' && busy) {
        cancelled = true;
        return;
      }
      b.closest('dialog').close();
    })
);
$('fitBtn').onclick = () => {
  fitView = true;
  fitPaper();
};
$('actualBtn').onclick = () => zoomPaper(1 / viewScale);
new ResizeObserver(fitPaper).observe($('dropZone'));
$('viewMode').onchange = () => {
  syncCompare();
  fitPaper();
};
$('compare').oninput = syncCompare;
$('playBtn').onclick = togglePlay;
$('motionQuick').onchange = (e) => {
  opts.motion = e.target.value;
  if (opts.motion === 'none') pause();
  remember();
  sync();
  requestPrint();
};
$('scrub').oninput = (e) => {
  pause();
  phase = +e.target.value / frameCount();
  syncTimeline();
  requestPrint();
};
$('palettePreset').onchange = (e) => {
  if (!inks[e.target.value]) return;
  closeInk();
  opts.palette = [...inks[e.target.value]];
  remember();
  sync();
  requestPrint();
};
$('addInk').onclick = () => {
  closeInk();
  opts.palette.splice(opts.palette.length - 1, 0, '#b88579');
  remember();
  sync();
  requestPrint();
};
$('extractPalette').onclick = () => {
  closeInk();
  refreshSource(phase);
  const hist = new Map();
  for (let i = 0; i < source.data.length; i += 4 * 7) {
    if (source.data[i + 3] < 128) continue;
    const rgb = [0, 1, 2].map((c) => Math.round(source.data[i + c] / 32) * 32);
    const key = rgb.join(',');
    hist.set(key, (hist.get(key) || 0) + 1);
  }
  const candidates = [...hist].sort((a, b) => b[1] - a[1]);
  const chosen = [];
  for (const [key] of candidates) {
    const c = key.split(',').map(Number);
    if (chosen.every((p) => Math.hypot(...p.map((v, i) => v - c[i])) > 80)) chosen.push(c);
    if (chosen.length === 5) break;
  }
  if (chosen.length < 2) {
    toast('This image has too few different colours to make a palette.');
    return;
  }
  chosen.sort((a, b) => a.reduce((n, v) => n + v, 0) - b.reduce((n, v) => n + v, 0));
  opts.palette = chosen.map(
    (c) => '#' + c.map((v) => Math.min(255, v).toString(16).padStart(2, '0')).join('')
  );
  remember();
  sync();
  requestPrint();
  toast('A few inks from your image.');
};
$('resetPrint').onclick = () => {
  for (const k of [
    'method',
    'cell',
    'width',
    'brightness',
    'contrast',
    'gamma',
    'saturation',
    'strength',
    'invert',
    'transparent',
    'chars',
    'patternScale',
    'patternAngle',
    'edge',
    'posterize',
    'grain',
    'patternX',
    'patternY',
    'duet',
    'duetBalance',
    'duetSoftness',
    'serpentine',
    'diffusionReach'
  ])
    opts[k] = Dither.defaults[k];
  remember();
  sync();
  requestPrint();
};
$('resetMotion').onclick = () => {
  pause();
  for (const k of [
    'motion',
    'amount',
    'waves',
    'seconds',
    'fps',
    'temporal',
    'temporalAmount',
    'temporalCycles',
    'animateEffects'
  ])
    opts[k] = Dither.defaults[k];
  phase = 0;
  remember();
  sync();
  requestPrint();
};
$('saveRecipe').onclick = () =>
  download(
    new Blob(
      [
        JSON.stringify({
          format: 'jago-dither-recipe',
          version: 1,
          name: $('recipeName').value,
          settings: opts
        })
      ],
      { type: 'application/json' }
    ),
    ($('recipeName').value.replace(/[^\p{L}\p{N} _-]/gu, '') || 'My recipe') + '.ditherrecipe'
  );
$('importRecipe').onclick = () => $('recipeFile').click();
$('recipeFile').onchange = (e) =>
  safe(async () => {
    await readProject(e.target.files[0], true);
    e.target.value = '';
  });
document
  .querySelectorAll('[data-demo]')
  .forEach((b) => (b.onclick = () => safe(() => loadStudy(b.dataset.demo))));
const recipes = {
  news: { method: 'floyd', cell: 2, contrast: 25, palette: inks.mono, motion: 'none' },
  green: { method: 'bayer4', cell: 4, palette: inks.moss, motion: 'crawl', amount: 8 },
  sea: { method: 'bayer8', cell: 3, palette: inks.sunset, motion: 'ripple', amount: 10 },
  type: { method: 'ascii', cell: 8, palette: inks.blue, motion: 'breathe', amount: 10 }
};
document.querySelectorAll('[data-recipe]').forEach(
  (b) =>
    (b.onclick = () => {
      pause();
      closeInk();
      opts = Dither.settings({ ...Dither.defaults, ...recipes[b.dataset.recipe] });
      phase = 0;
      remember();
      sync();
      requestPrint();
      toast('Recipe on the table.');
    })
);
$('makeText').onclick = () =>
  safe(() => {
    if (scene.layers.length >= 12) return toast('There is room for 12 layers.');
    addText($('words').value);
  });
$('theme').onchange = (e) => {
  document.documentElement.dataset.theme = e.target.value;
  try {
    localStorage.setItem('jago-dither-theme-v2', e.target.value);
  } catch {}
};
try {
  const theme = localStorage.getItem('jago-dither-theme-v2');
  if (['sketchbook', 'charcoal', 'paper', 'plum', 'candy'].includes(theme)) {
    $('theme').value = theme;
    document.documentElement.dataset.theme = theme;
  }
} catch {}
let dragDepth = 0;
for (const event of ['dragenter', 'dragover', 'dragleave', 'drop'])
  $('dropZone').addEventListener(event, (e) => {
    e.preventDefault();
    if (event === 'dragenter') dragDepth++;
    if (event === 'dragleave') dragDepth = Math.max(0, dragDepth - 1);
    if (event === 'drop') {
      dragDepth = 0;
      safe(() => importImage(e.dataTransfer.files[0]));
    }
    $('dropZone').classList.toggle('dragover', dragDepth > 0);
  });
document.addEventListener('paste', (e) => {
  if (/INPUT|TEXTAREA/.test(e.target.tagName) || busy) return;
  const image = [...e.clipboardData.items].find((i) =>
    ['image/png', 'image/jpeg', 'image/webp'].includes(i.type)
  );
  if (image) {
    e.preventDefault();
    safe(() => importImage(image.getAsFile()));
  }
});
document.addEventListener('keydown', handleKeys);
window.addEventListener('beforeunload', (e) => {
  if (checkUnsaved()) {
    e.preventDefault();
    e.returnValue = '';
  }
});
let lastFrame = -1;
function tick(now) {
  if (playing && !busy && !document.hidden) {
    const next = Math.floor(
      ((((now - playStart) / 1000) % opts.seconds) / opts.seconds) * frameCount()
    );
    if (next !== lastFrame) {
      lastFrame = next;
      phase = next / frameCount();
      syncTimeline();
      if (!rendering) requestPrint();
    }
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
// The colour panel is non-modal, so the print remains visible while mixing ink.
function hexHSV(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255),
    max = Math.max(...c),
    min = Math.min(...c),
    d = max - min;
  let h = 0;
  if (d)
    h =
      max === c[0]
        ? ((c[1] - c[2]) / d) % 6
        : max === c[1]
          ? (c[2] - c[0]) / d + 2
          : (c[0] - c[1]) / d + 4;
  return { h: (h * 60 + 360) % 360, s: max ? d / max : 0, v: max };
}
function hsvHex() {
  const channel = (n) => {
    const k = (n + hsv.h / 60) % 6;
    return Math.round((hsv.v - hsv.v * hsv.s * Math.max(0, Math.min(k, 4 - k, 1))) * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return '#' + channel(5) + channel(3) + channel(1);
}
function paintWheel() {
  const g = $('colourWheel').getContext('2d');
  g.clearRect(0, 0, 256, 256);
  g.lineWidth = 20;
  for (let h = 0; h < 360; h++) {
    g.strokeStyle = `hsl(${h} 100% 50%)`;
    g.beginPath();
    g.arc(128, 128, 112, ((h - 0.5) * Math.PI) / 180, ((h + 1) * Math.PI) / 180);
    g.stroke();
  }
  g.fillStyle = `hsl(${hsv.h} 100% 50%)`;
  g.fillRect(60, 60, 136, 136);
  const a = g.createLinearGradient(60, 0, 196, 0);
  a.addColorStop(0, '#fff');
  a.addColorStop(1, '#fff0');
  g.fillStyle = a;
  g.fillRect(60, 60, 136, 136);
  const b = g.createLinearGradient(0, 60, 0, 196);
  b.addColorStop(0, '#0000');
  b.addColorStop(1, '#000');
  g.fillStyle = b;
  g.fillRect(60, 60, 136, 136);
  for (const [x, y] of [
    [128 + Math.cos((hsv.h * Math.PI) / 180) * 112, 128 + Math.sin((hsv.h * Math.PI) / 180) * 112],
    [60 + hsv.s * 136, 60 + (1 - hsv.v) * 136]
  ]) {
    g.beginPath();
    g.arc(x, y, 5, 0, Math.PI * 2);
    g.strokeStyle = '#111';
    g.lineWidth = 4;
    g.stroke();
    g.strokeStyle = '#fff';
    g.lineWidth = 2;
    g.stroke();
  }
  const hex = hsvHex();
  $('colourHex').value = hex;
  ['red', 'green', 'blue'].forEach(
    (id, i) => ($(id).value = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16))
  );
}
function openInk(i) {
  closeInk();
  inkIndex = i;
  hsv = hexHSV(opts.palette[i]);
  paintWheel();
  $('colourPanel').show();
}
function closeInk() {
  if (inkIndex !== null) remember();
  $('colourPanel').close();
  inkIndex = null;
  wheelDrag = null;
}
function applyInk() {
  if (inkIndex === null) return;
  opts.palette[inkIndex] = hsvHex();
  paintWheel();
  renderPalette();
  $('palettePreset').value = 'custom';
  requestPrint();
}
$('colourPanel').addEventListener('close', () => {
  if (!$('colourPanel').open) {
    if (inkIndex !== null) remember();
    inkIndex = null;
    wheelDrag = null;
  }
});
$('colourWheel').onpointerdown = (e) => {
  const box = e.currentTarget.getBoundingClientRect(),
    x = ((e.clientX - box.left) * 256) / box.width,
    y = ((e.clientY - box.top) * 256) / box.height;
  const square = x >= 60 && x <= 196 && y >= 60 && y <= 196,
    r = Math.hypot(x - 128, y - 128);
  if (e.button !== 0 || (!square && (r < 100 || r > 125))) return;
  e.preventDefault();
  e.currentTarget.setPointerCapture(e.pointerId);
  wheelDrag = { id: e.pointerId, part: square ? 'shade' : 'hue' };
  moveWheel(e);
};
function moveWheel(e) {
  if (!wheelDrag || e.pointerId !== wheelDrag.id) return;
  const box = $('colourWheel').getBoundingClientRect(),
    x = ((e.clientX - box.left) * 256) / box.width,
    y = ((e.clientY - box.top) * 256) / box.height;
  if (wheelDrag.part === 'hue')
    hsv.h = ((Math.atan2(y - 128, x - 128) * 180) / Math.PI + 360) % 360;
  else {
    hsv.s = clamp((x - 60) / 136, 0, 1);
    hsv.v = 1 - clamp((y - 60) / 136, 0, 1);
  }
  applyInk();
}
$('colourWheel').onpointermove = moveWheel;
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'])
  $('colourWheel').addEventListener(ev, () => {
    if (wheelDrag) {
      wheelDrag = null;
      remember();
    }
  });
$('colourHex').onchange = () => {
  let hex = $('colourHex').value.trim();
  if (!hex.startsWith('#')) hex = '#' + hex;
  if (!/^#[\da-f]{6}$/i.test(hex)) {
    toast('Use six hex digits, such as #283e50.');
    return;
  }
  hsv = hexHSV(hex);
  applyInk();
  remember();
};
for (const id of ['red', 'green', 'blue'])
  $(id).onchange = () => {
    const rgb = ['red', 'green', 'blue'].map((id) => $(id).value);
    if (rgb.some((v) => v === '' || !Number.isInteger(+v) || +v < 0 || +v > 255)) {
      toast('RGB values go from 0 to 255.');
      return;
    }
    hsv = hexHSV('#' + rgb.map((v) => (+v).toString(16).padStart(2, '0')).join(''));
    applyInk();
    remember();
  };
$('exportBtn').onclick = () => {
  pause();
  closeInk();
  exportInfo();
  $('exportDialog').showModal();
};
$('exportFormat').onchange = exportInfo;
$('exportScale').onchange = exportInfo;
function canvasBlob(c) {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(Error('Could not encode this image.'))), 'image/png')
  );
}
$('doExport').onclick = () => safe(exportPrint);
$('cancelExport').onclick = () => (cancelled = true);
$('exportDialog').addEventListener('cancel', (e) => {
  if (busy) {
    e.preventDefault();
    cancelled = true;
  }
});
