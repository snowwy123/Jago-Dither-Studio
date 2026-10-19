// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Cameron Jago Lis Illustrates.
'use strict';

// History keeps small layer records. Images are shared until no undo step needs them.
let scene = { width: 900, height: 680, paper: '#fcf6e7', clear: false, layers: [], active: '' };
const assets = new Map();
const fonts = {
  sans: 'Trebuchet MS, sans-serif',
  serif: 'Georgia, serif',
  mono: 'Courier New, monospace',
  hand: 'Segoe Print, Comic Sans MS, cursive',
  bold: 'Arial Black, Arial, sans-serif'
};
const blends = ['source-over', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'difference'];
let composingKey = '',
  composingCanvas = null,
  layerDrag = null;
const uid = () => crypto.randomUUID();
let sampledCanvas=null,sampledPixels=null;
const pixelsOf = c => {
  if(c===composingCanvas&&c===sampledCanvas&&sampledPixels)return sampledPixels;
  const value={width:c.width,height:c.height,data:c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,c.width,c.height).data};
  if(c===composingCanvas){sampledCanvas=c;sampledPixels=value;}return value;
};
const selectedLayer = () => scene.layers.find((l) => l.id === scene.active);
function sceneMoves(printedOnly = false) {
  return scene.layers.some(
    (l) =>
      l.visible &&
      (!printedOnly || l.kind !== 'overlay' || l.stage !== 'after') &&
      (l.frames || l.motion !== 'none' || overlayMoves(l))
  );
}
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}
function imageAsset(image, max = 1200) {
  const w = image.naturalWidth || image.width,
    h = image.naturalHeight || image.height;
  const ratio = Math.min(1, max / Math.max(w, h));
  const c = makeCanvas(Math.max(1, Math.round(w * ratio)), Math.max(1, Math.round(h * ratio)));
  c.getContext('2d').drawImage(image, 0, 0, c.width, c.height);
  return { image: c, png: c.toDataURL('image/png'), width: c.width, height: c.height };
}
function layerBase(name, kind = 'image') {
  return {
    id: uid(),
    kind,
    name: String(name).slice(0, 60),
    visible: true,
    opacity: 100,
    blend: 'source-over',
    x: scene.width / 2,
    y: scene.height / 2,
    scale: 100,
    rotation: 0,
    flipX: false,
    flipY: false,
    motion: 'none',
    amount: 16,
    offset: 0
  };
}
function layerSize(l) {
  if (l.kind === 'gradient' || l.kind === 'overlay') return { w: l.w, h: l.h };
  if (l.kind === 'text') {
    const g = makeCanvas(1, 1).getContext('2d');
    g.font = (l.bold ? 'bold ' : '') + l.size + 'px ' + fonts[l.font];
    return {
      w: Math.max(1, ...l.text.split('\n').map((t) => g.measureText(t).width)),
      h: l.text.split('\n').length * l.size * l.leading
    };
  }
  const a = assets.get(l.asset || l.frames?.[0]?.asset);
  return { w: a?.width || 1, h: a?.height || 1 };
}
function layerPose(l, t) {
  t = ((t % 1) + 1) % 1;
  const a = (t + l.offset / 100) * Math.PI * 2;
  let x = l.x,
    y = l.y,
    angle = l.rotation,
    scale = l.scale / 100;
  if (l.motion === 'float') {
    x += (Math.sin(a) * l.amount) / 2;
    y += Math.cos(a) * l.amount;
  }
  if (l.motion === 'swing') angle += Math.sin(a) * l.amount;
  if (l.motion === 'pulse') scale *= 1 + (Math.sin(a) * l.amount) / 200;
  if (l.motion === 'spin') angle += t * 360;
  return { x, y, angle, scale };
}
function compose(t) {
  const key = JSON.stringify({...scene,active:undefined}) + (sceneMoves(true) ? t : 0);
  if (key === composingKey && composingCanvas) return composingCanvas;
  const c = makeCanvas(scene.width, scene.height),
    g = c.getContext('2d');
  if (!scene.clear) {
    g.fillStyle = scene.paper;
    g.fillRect(0, 0, c.width, c.height);
  }
  for (const l of scene.layers) {
    if (!l.visible || !l.opacity || (l.kind === 'overlay' && l.stage === 'after')) continue;
    const p = layerPose(l, t);
    g.save();
    g.globalAlpha = l.opacity / 100;
    g.globalCompositeOperation = l.blend;
    g.translate(p.x, p.y);
    g.rotate((p.angle * Math.PI) / 180);
    g.scale(p.scale * (l.flipX ? -1 : 1), p.scale * (l.flipY ? -1 : 1));
    if (l.kind === 'overlay') {
      drawOverlay(g, l, t);
    } else if (l.kind === 'text') {
      g.font = (l.bold ? 'bold ' : '') + l.size + 'px ' + fonts[l.font];
      g.textAlign = l.align;
      g.textBaseline = 'middle';
      g.fillStyle = layerFill(g, l, layerSize(l));
      const lines = l.text.split('\n'),
        box = layerSize(l);
      const x = l.align === 'left' ? -box.w / 2 : l.align === 'right' ? box.w / 2 : 0;
      lines.forEach((s, i) => g.fillText(s, x, (i - (lines.length - 1) / 2) * l.size * l.leading));
    } else if (l.kind === 'gradient') {
      const b = layerSize(l);
      g.fillStyle = layerFill(g, l, b);
      g.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
    } else {
      let id = l.asset;
      if (l.frames) {
        const time = ((((t + l.offset / 100) % 1) + 1) % 1) * l.duration;
        id = (l.frames.find((f) => time >= f.time && time < f.time + f.duration) || l.frames.at(-1))
          .asset;
      }
      const a = assets.get(id);
      if (a) g.drawImage(a.image, -a.width / 2, -a.height / 2);
    }
    g.restore();
  }
  composingKey = key;
  composingCanvas = c;
  return c;
}
function refreshSource(t) {
  sourceCanvas = compose(t);
  source = pixelsOf(sourceCanvas);
}
function pruneAssets() {
  const used = new Set();
  for (const s of [scene, ...history.map((h) => h.scene)])
    for (const l of s.layers) {
      if (l.asset) used.add(l.asset);
      for (const f of l.frames || []) used.add(f.asset);
    }
  for (const id of assets.keys()) if (!used.has(id)) assets.delete(id);
  // Long imported loops can outweigh many ordinary edits. Retire oldest undo
  // records before their shared image buffers fill the browser.
  const pixels = [...assets.values()].reduce((n, a) => n + a.width * a.height, 0);
  if (pixels > 90e6 && historyIndex > 0) {
    history.shift();
    historyIndex--;
    pruneAssets();
    syncHistory();
  }
}
function checkImageBudget(extra) {
  const ids = new Set();
  for (const l of scene.layers) {
    if (l.asset) ids.add(l.asset);
    for (const f of l.frames || []) ids.add(f.asset);
  }
  const current = [...ids].reduce((n, id) => {
    const a = assets.get(id);
    return n + a.width * a.height;
  }, 0);
  if (current + extra.reduce((n, a) => n + a.width * a.height, 0) > 60e6)
    throw Error(
      'This composition has a lot of frames already. Remove a loop layer or import a smaller sequence first.'
    );
}
async function setSource(image, name, mark = true) {
  pause();
  closeInk();
  const a = imageAsset(image),
    id = uid();
  assets.set(id, a);
  scene = {
    width: a.width,
    height: a.height,
    paper: '#fcf6e7',
    clear: true,
    layers: [],
    active: ''
  };
  const l = layerBase(name);
  l.asset = id;
  scene.layers.push(l);
  scene.active = l.id;
  sourceName = String(name).slice(0, 70);
  sourcePNG = a.png;
  phase = 0;
  fitView = true;
  revision++;
  pending = null;
  refreshSource(0);
  if (mark) remember();
  sync();
  requestPrint();
}
function changedLayer() {
  composingKey = '';
  remember();
  pruneAssets();
  sync();
  requestPrint();
}
async function addImage(image, name) {
  if (scene.layers.length >= 12)
    throw Error('There is room for 12 layers. Remove one before adding another.');
  const a = imageAsset(image),
    id = uid();
  checkImageBudget([a]);
  assets.set(id, a);
  const l = layerBase(name);
  l.asset = id;
  l.scale = Math.min(100, (scene.width / a.width) * 80, (scene.height / a.height) * 80);
  scene.layers.push(l);
  scene.active = l.id;
  changedLayer();
  showTab('layers');
}
function addText(words = 'HELLO,\nLITTLE WORLD.') {
  if (scene.layers.length >= 12) return toast('There is room for 12 layers.');
  const l = {
    ...layerBase('A few good words', 'text'),
    text: String(words).replace(/\\n/g, '\n').slice(0, 500).split('\n').slice(0, 12).join('\n'),
    font: 'bold',
    size: Math.max(4, Math.round(scene.width / 10)),
    colour: '#283e50',
    fillMode: 'solid',
    colour2: '#df8672',
    gradientAngle: 0,
    bold: false,
    align: 'center',
    leading: 1.12
  };
  scene.layers.push(l);
  scene.active = l.id;
  changedLayer();
  showTab('layers');
  $('layerText').focus();
}
function syncLayers() {
  if (!$('layerList')) return;
  const list = $('layerList');
  list.replaceChildren();
  for (const l of [...scene.layers].reverse()) {
    const row = document.createElement('div');
    row.className = 'layer-row' + (l.id === scene.active ? ' selected' : '');
    const eye = document.createElement('button');
    eye.textContent = l.visible ? '◉' : '○';
    eye.title = l.visible ? 'Hide layer' : 'Show layer';
    eye.setAttribute('aria-label', eye.title + ' ' + l.name);
    eye.onclick = () => {
      l.visible = !l.visible;
      changedLayer();
    };
    const pick = document.createElement('button');
    pick.className = 'layer-pick';
    pick.setAttribute('aria-pressed', String(l.id === scene.active));
    const thumb = makeCanvas(42, 34),
      g = thumb.getContext('2d'),
      a = assets.get(l.asset || l.frames?.[0]?.asset);
    if (a) {
      const r = Math.min(42 / a.width, 34 / a.height);
      g.drawImage(
        a.image,
        (42 - a.width * r) / 2,
        (34 - a.height * r) / 2,
        a.width * r,
        a.height * r
      );
    } else if (l.kind === 'overlay') {
      g.translate(21, 17);
      g.scale(42 / l.w, 34 / l.h);
      drawOverlay(g, { ...l, animation: 'none', dotSize: Math.max(l.dotSize, l.w / 12) }, 0);
    } else if (l.kind === 'gradient') {
      g.translate(21, 17);
      g.fillStyle = layerFill(g, l, { w: 42, h: 34 });
      g.fillRect(-21, -17, 42, 34);
    } else {
      g.fillStyle = l.colour;
      g.font = 'bold 20px Georgia';
      g.fillText('Aa', 4, 24);
    }
    const label = document.createElement('span');
    label.textContent = l.name;
    const small = document.createElement('small');
    small.textContent = l.frames
      ? l.frames.length + ' frames · loop'
      : l.kind === 'text'
        ? 'Editable text'
        : l.kind === 'gradient'
          ? 'Gradient'
          : l.kind === 'overlay'
            ? 'Overlay · ' + (l.stage === 'after' ? 'after print' : 'before print')
            : 'Image';
    label.append(small);
    pick.append(thumb, label);
    pick.onclick = () => {
      scene.active = l.id;
      syncLayers();
    };
    row.append(eye, pick);
    list.append(row);
  }
  const l = selectedLayer();
  $('layerSettings').hidden = !l;
  syncOverlay(l);
  if (l) {
    for (const el of document.querySelectorAll('[data-layer]')) {
      const value = l[el.dataset.layer];
      if (el.type === 'checkbox') el.checked = !!value;
      else if (document.activeElement !== el) el.value = value ?? '';
      const out = $(el.id + 'Value');
      if (out)
        out.textContent =
          value +
          (el.dataset.layer === 'rotation'
            ? '°'
            : ['opacity', 'scale'].includes(el.dataset.layer)
              ? '%'
              : '');
    }
    $('textSettings').hidden = l.kind !== 'text';
    $('fillSettings').hidden = !['text', 'gradient'].includes(l.kind);
    $('gradientSize').hidden = l.kind !== 'gradient';
    $('layerDelete').disabled = false;
    $('layerUp').disabled = scene.layers.indexOf(l) === scene.layers.length - 1;
    $('layerDown').disabled = scene.layers.indexOf(l) === 0;
    $('layerMotionHint').textContent = l.frames
      ? 'The imported frames play once per project loop. Changing loop length changes their speed.'
      : l.kind === 'overlay' && l.stage === 'after'
        ? 'Moves this whole overlay above the print. Twinkle and drift settings above animate the individual marks.'
        : 'This movement affects just this layer, before the print effect.';
  }
  $('sceneWidth').value = scene.width;
  $('sceneHeight').value = scene.height;
  $('scenePaper').value = scene.paper;
  $('sceneClear').checked = scene.clear;
  $('layerCount').textContent = scene.layers.length + ' / 12';
  $('layerBounds').hidden =
    !l ||
    !l.visible ||
    $('viewMode').value === 'split' ||
    document.querySelector('[data-tab="layers"]').getAttribute('aria-selected') !== 'true';
  updateBounds();
}
function updateBounds() {
  const l = selectedLayer();
  if (!l) return;
  const box = layerSize(l),
    p = layerPose(l, phase),
    el = $('layerBounds');
  el.dataset.layer = l.id;
  el.style.left = (p.x / scene.width) * 100 + '%';
  el.style.top = (p.y / scene.height) * 100 + '%';
  el.style.width = ((box.w * p.scale) / scene.width) * 100 + '%';
  el.style.height = ((box.h * p.scale) / scene.height) * 100 + '%';
  el.style.transform = 'translate(-50%,-50%) rotate(' + p.angle + 'deg)';
}
function projectObject() {
  const used = new Set();
  for (const l of scene.layers) {
    if (l.asset) used.add(l.asset);
    for (const f of l.frames || []) used.add(f.asset);
  }
  return {
    format: 'jago-dither',
    version: scene.layers.some((l) => l.kind === 'overlay') ? 4 : 3,
    name: sourceName,
    settings: opts,
    scene,
    assets: Object.fromEntries([...used].map((id) => [id, assets.get(id).png]))
  };
}
async function saveProject() {
  document.activeElement?.blur();
  if (pendingProjectSave) return toast('Your project is still saving.');
  const text = JSON.stringify(projectObject());
  if (text.length > 100 * 1024 * 1024)
    return toast('This project is too large to save. Remove a large loop layer first.');
  const previous = savedState,
    state = stateToSave();
  try {
    // Mark this exact snapshot before the download can trigger beforeunload.
    savedState = state;
    checkUnsaved();
    download(new Blob([text], { type: 'application/json' }), fileName('.jagodither'), (url) => {
      if (window.chrome?.webview) {
        pendingProjectSave = { url, previous, state };
        $('saveBtn').disabled = true;
      }
    });
    if (!window.chrome?.webview) toast('Project download ready. Keep the .jagodither file.');
  } catch (error) {
    savedState = previous;
    pendingProjectSave = null;
    $('saveBtn').disabled = false;
    checkUnsaved();
    throw error;
  }
}
function validateScene(s, prepared) {
  const num = (n, a, b) => typeof n === 'number' && Number.isFinite(n) && n >= a && n <= b;
  const str = (s, n) => typeof s === 'string' && s.length <= n;
  if (
    !s ||
    !Number.isInteger(s.width) ||
    !Number.isInteger(s.height) ||
    !num(s.width, 16, 2048) ||
    !num(s.height, 16, 2048) ||
    s.width * s.height > 2097152 ||
    !/^#[\da-f]{6}$/i.test(s.paper) ||
    typeof s.clear !== 'boolean' ||
    !Array.isArray(s.layers) ||
    s.layers.length > 12
  )
    throw Error('This project has an invalid canvas.');
  if(s.printDirections!==undefined){if(!Array.isArray(s.printDirections)||s.printDirections.length>8)throw Error('A project can keep eight print directions.');s.printDirections=s.printDirections.map(item=>{if(!item||typeof item.id!=='string'||item.id.length>80||typeof item.name!=='string'||item.name.length>60||typeof item.seed!=='string'||item.seed.length>64)throw Error('Invalid saved print direction.');return{id:item.id,name:item.name,seed:item.seed,settings:Dither.settings(item.settings)};});}
  if(s.exploreSeed!==undefined&&(typeof s.exploreSeed!=='string'||s.exploreSeed.length>64))throw Error('Invalid exploration seed.');
  const seen = new Set();
  for (const l of s.layers) {
    if (
      !l ||
      !str(l.id, 80) ||
      seen.has(l.id) ||
      !str(l.name, 60) ||
      !['image', 'text', 'gradient', 'overlay'].includes(l.kind) ||
      typeof l.visible !== 'boolean' ||
      !num(l.x, -2400, 3600) ||
      !num(l.y, -2400, 3600) ||
      !num(l.scale, 1, 400) ||
      !num(l.rotation, -180, 180) ||
      !num(l.opacity, 0, 100) ||
      !blends.includes(l.blend) ||
      !['none', 'float', 'swing', 'pulse', 'spin'].includes(l.motion) ||
      !num(l.amount, 0, 100) ||
      !num(l.offset, 0, 100) ||
      typeof l.flipX !== 'boolean' ||
      typeof l.flipY !== 'boolean'
    )
      throw Error('This project has an invalid layer.');
    seen.add(l.id);
    if (['text', 'gradient'].includes(l.kind)) {
      l.fillMode ??= 'solid';
      l.colour2 ??= '#df8672';
      l.gradientAngle ??= 0;
      if (
        !['solid', 'linear', 'radial'].includes(l.fillMode) ||
        !/^#[\da-f]{6}$/i.test(l.colour) ||
        !/^#[\da-f]{6}$/i.test(l.colour2) ||
        !num(l.gradientAngle, -180, 180)
      )
        throw Error('Invalid layer fill.');
    }
    if (l.kind === 'overlay') {
      validateOverlay(l);
    } else if (l.kind === 'gradient') {
      if (!num(l.w, 16, 2048) || !num(l.h, 16, 2048)) throw Error('Invalid gradient size.');
    } else if (l.kind === 'text') {
      if (
        !str(l.text, 500) ||
        l.text.split('\n').length > 12 ||
        !Object.hasOwn(fonts, l.font) ||
        !num(l.size, 4, 400) ||
        !num(l.leading, 0.7, 2) ||
        !/^#[\da-f]{6}$/i.test(l.colour) ||
        !['left', 'center', 'right'].includes(l.align) ||
        typeof l.bold !== 'boolean'
      )
        throw Error('This project has invalid text.');
    } else if (l.frames) {
      if (
        !Array.isArray(l.frames) ||
        !l.frames.length ||
        l.frames.length > 288 ||
        !num(l.duration, 0.25, 12)
      )
        throw Error('This loop is too long.');
      let end = 0;
      for (const f of l.frames) {
        if (
          !prepared.has(f.asset) ||
          !num(f.time, 0, 12) ||
          !num(f.duration, 0.001, 12) ||
          Math.abs(f.time - end) > 0.002
        )
          throw Error('This loop has missing frames or invalid timing.');
        end = f.time + f.duration;
      }
      if (Math.abs(end - l.duration) > 0.002) throw Error('This loop timing does not add up.');
    } else if (!prepared.has(l.asset)) throw Error('A layer image is missing.');
  }
  if (s.layers.length && !seen.has(s.active)) throw Error('The selected layer is missing.');
  return copy(s);
}
async function readProject(file, recipe = false) {
  if (!file) return;
  if (file.size > 100 * 1024 * 1024) throw Error('Use a project below 100 MB.');
  const obj = JSON.parse(await file.text());
  if (
    obj.format !== (recipe ? 'jago-dither-recipe' : 'jago-dither') ||
    !(recipe ? [1] : [1, 2, 3, 4]).includes(obj.version) ||
    typeof obj.name !== 'string' ||
    obj.name.length > 70
  )
    throw Error('Choose a Jago Dither ' + (recipe ? 'recipe' : 'project') + ' file.');
  const next = Dither.settings(obj.settings);
  let nextScene,
    prepared = new Map();
  if (!recipe && obj.version >= 2) {
    if (
      !obj.assets ||
      typeof obj.assets !== 'object' ||
      Array.isArray(obj.assets) ||
      Object.keys(obj.assets).length > 300
    )
      throw Error('Invalid project images.');
    let pixels = 0;
    for (const [id, png] of Object.entries(obj.assets)) {
      if (
        id.length > 80 ||
        typeof png !== 'string' ||
        png.length > 16e6 ||
        !/^data:image\/png;base64,[A-Za-z0-9+/=\r\n]+$/.test(png)
      )
        throw Error('Invalid project image.');
      const image = await decodeImage(png);
      pixels += image.naturalWidth * image.naturalHeight;
      if (image.naturalWidth > 1200 || image.naturalHeight > 1200 || pixels > 60e6)
        throw Error('This project contains too much image data.');
      prepared.set(id, { png, image, width: image.naturalWidth, height: image.naturalHeight });
    }
    nextScene = validateScene(obj.scene, prepared);
    // New identifiers prevent a loaded file replacing an image still used by Undo.
    const ids = new Map([...prepared.keys()].map((id) => [id, uid()]));
    for (const l of nextScene.layers) {
      if (l.asset) l.asset = ids.get(l.asset);
      for (const f of l.frames || []) f.asset = ids.get(f.asset);
    }
    prepared = new Map([...prepared].map(([id, a]) => [ids.get(id), a]));
  } else if (!recipe) {
    if (typeof obj.image !== 'string' || !/^data:image\/png;base64,/.test(obj.image))
      throw Error('Invalid project image.');
    const image = await decodeImage(obj.image);
    await setSource(image, obj.name, false);
  }
  pause();
  closeInk();
  if (nextScene) {
    for (const [id, a] of prepared) assets.set(id, a);
    scene = nextScene;
  }
  if (!recipe) sourceName = obj.name;
  opts = next;
  phase = 0;
  refreshSource(0);
  remember();
  pruneAssets();
  sync();
  requestPrint();
  if (!recipe) markSaved();
  toast(recipe ? 'Recipe ready to try.' : 'Project on the table, layers and all.');
}

// Read our stored PNG archives and normal deflated ZIPs without extracting files to disk.
async function unzip(bytes) {
  if (bytes.length > 100 * 1024 * 1024) throw Error('Use a PNG sequence ZIP below 100 MB.');
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    files = new Map();
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw Error('That is not a readable ZIP.');
  const count = v.getUint16(end + 10, true);
  let p = v.getUint32(end + 16, true),
    total = 0;
  if (count > 750 || v.getUint16(end + 4, true) || v.getUint16(end + 6, true))
    throw Error('Use a single PNG sequence ZIP.');
  for (let n = 0; n < count; n++) {
    if (p + 46 > bytes.length || v.getUint32(p, true) !== 0x02014b50)
      throw Error('The ZIP directory is damaged.');
    const flags = v.getUint16(p + 8, true),
      method = v.getUint16(p + 10, true),
      crc = v.getUint32(p + 16, true),
      compressed = v.getUint32(p + 20, true),
      size = v.getUint32(p + 24, true);
    const len = v.getUint16(p + 28, true),
      extra = v.getUint16(p + 30, true),
      comment = v.getUint16(p + 32, true),
      offset = v.getUint32(p + 42, true);
    if (p + 46 + len + extra + comment > bytes.length)
      throw Error('The ZIP directory is incomplete.');
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + len));
    p += 46 + len + extra + comment;
    if (
      flags & 1 ||
      ![0, 8].includes(method) ||
      size > 20e6 ||
      (total += size) > 220e6 ||
      name.includes('..') ||
      name.includes('\\') ||
      name.startsWith('/') ||
      files.has(name)
    )
      throw Error('This ZIP contains unsupported or oversized entries.');
    if (offset + 30 > bytes.length || v.getUint32(offset, true) !== 0x04034b50)
      throw Error('The ZIP entry is damaged.');
    const start = offset + 30 + v.getUint16(offset + 26, true) + v.getUint16(offset + 28, true);
    if (start + compressed > bytes.length) throw Error('The ZIP entry is incomplete.');
    let data = bytes.slice(start, start + compressed);
    if (method === 8) {
      const reader = new Blob([data])
          .stream()
          .pipeThrough(new DecompressionStream('deflate-raw'))
          .getReader(),
        parts = [];
      let length = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > size) {
          await reader.cancel();
          throw Error('Invalid compressed size.');
        }
        parts.push(value);
      }
      data = new Uint8Array(length);
      let at = 0;
      for (const part of parts) {
        data.set(part, at);
        at += part.length;
      }
    }
    if (data.length !== size || zipCrc(data) !== crc)
      throw Error('The ZIP failed its integrity check.');
    files.set(name, data);
  }
  return files;
}
async function importSequence(file) {
  if (!file) return;
  if (scene.layers.length >= 12) throw Error('Remove a layer before adding this loop.');
  pause();
  $('statusText').textContent = 'Unpacking a little movement…';
  const files = await unzip(new Uint8Array(await file.arrayBuffer()));
  if (!files.has('timing.json'))
    throw Error('Export PNG frames from Jago Wobble or Dither first. The ZIP needs timing.json.');
  const timing = JSON.parse(new TextDecoder().decode(files.get('timing.json')));
  if (
    timing.format !== 'jago-png-sequence' ||
    timing.version !== 1 ||
    !Array.isArray(timing.frames) ||
    !timing.frames.length ||
    timing.frames.length > 720
  )
    throw Error('This is not a supported Jago PNG sequence.');
  let duration = 0;
  for (const f of timing.frames) {
    if (
      typeof f.file !== 'string' ||
      !files.has(f.file) ||
      !Number.isFinite(f.time) ||
      !Number.isFinite(f.duration) ||
      f.duration <= 0 ||
      Math.abs(f.time - duration) > 0.002
    )
      throw Error('The sequence has missing frames or invalid timing.');
    duration = f.time + f.duration;
  }
  if (duration < 0.25 || duration > 12.002)
    throw Error('For this build, export a loop between ¼ second and 12 seconds.');
  const n = Math.min(288, timing.frames.length),
    max = Math.min(720, Math.floor(Math.sqrt(48e6 / n)));
  const prepared = new Map(),
    frames = [];
  let width = 0,
    height = 0,
    lastFile = '',
    id = '';
  for (let i = 0; i < n; i++) {
    const time = (i * duration) / n,
      entry =
        timing.frames.find((f) => time + 1e-7 >= f.time && time < f.time + f.duration) ||
        timing.frames.at(-1);
    if (entry.file !== lastFile) {
      const data = files.get(entry.file);
      if (data.length < 8 || data[0] !== 137 || data[1] !== 80 || data[2] !== 78 || data[3] !== 71)
        throw Error('The sequence contains a non-PNG frame.');
      const url = URL.createObjectURL(new Blob([data], { type: 'image/png' }));
      try {
        const img = await decodeImage(url),
          a = imageAsset(img, max);
        if (width && (width !== a.width || height !== a.height))
          throw Error('All sequence frames must have the same dimensions.');
        width = a.width;
        height = a.height;
        id = uid();
        prepared.set(id, a);
      } finally {
        URL.revokeObjectURL(url);
      }
      lastFile = entry.file;
    }
    frames.push({ asset: id, time, duration: duration / n });
  }
  checkImageBudget([...prepared.values()]);
  const label = typeof timing.name === 'string' ? timing.name : file.name.replace(/\.zip$/i, '');
  if (!scene.layers.length) {
    scene.width = width;
    scene.height = height;
  }
  for (const [id, a] of prepared) assets.set(id, a);
  const l = layerBase(label.slice(0, 60));
  l.frames = frames;
  l.duration = duration;
  l.scale = Math.min(100, (scene.width / width) * 100, (scene.height / height) * 100);
  scene.layers.push(l);
  scene.active = l.id;
  opts.seconds = Math.min(12, duration);
  opts.fps = 24;
  phase = 0;
  changedLayer();
  showTab('layers');
  toast(
    'Loop added: ' + n + ' frames at ' + width + ' × ' + height + '. Its original duration is kept.'
  );
}

function exportInfo() {
  const kind = $('exportFormat').value,
    scale = +$('exportScale').value,
    view = $('exportView').value;
  const w = latest?.outputWidth || opts.width,
    h = latest?.outputHeight || opts.width;
  const bridge = kind === 'jago',
    rate = bridge ? +$('bridgeRate').value : opts.fps;
  const count = kind === 'png' || kind === 'text' ? 1 : Math.round(opts.seconds * rate);
  $('exportView').disabled = ['jago', 'text'].includes(kind);
  $('exportScale').disabled = ['jago', 'text'].includes(kind);
  $('bridgeField').hidden = !bridge;
  $('separateInksField').hidden = !bridge;
  $('separateInks').disabled = afterOverlays();
  $('overlayExportHint').hidden = !afterOverlays();
  $('exportInfo').textContent =
    kind === 'text'
      ? 'A plain character grid. Choose Typewriter club first. After-print overlays are image effects and are not included in plain text.'
      : bridge
        ? count +
          ' flattened frames · ' +
          rate +
          ' fps · ' +
          opts.seconds +
          ' seconds. Wobble allows 48 frames. Choose a lower rate if needed.'
        : w * scale * (view === 'pair' ? 2 : 1) +
          ' × ' +
          h * scale +
          ' px · ' +
          count +
          ' frame' +
          (count === 1 ? '' : 's') +
          (count > 1 ? ' · ' + opts.seconds + ' seconds' : '');
}
function comparisonCanvas(printed, before, view, t) {
  if (view === 'print') return printed;
  const w = printed.width,
    h = printed.height,
    c = makeCanvas(view === 'pair' ? w * 2 : w, h),
    g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  const originalPage = makeCanvas(w, h);
  originalPage.getContext('2d').drawImage(before, 0, 0, w, h);
  paintAfterOverlays(originalPage, t);
  g.drawImage(originalPage, 0, 0);
  if (view === 'pair') g.drawImage(printed, w, 0);
  else {
    const split =
      view === 'wipe' ? 0.5 - 0.5 * Math.cos(t * Math.PI * 2) : +$('compare').value / 100;
    g.save();
    g.beginPath();
    g.rect(w * split, 0, w * (1 - split), h);
    g.clip();
    g.drawImage(printed, 0, 0);
    g.restore();
    g.fillStyle = '#ffffff';
    g.fillRect(Math.round(w * split) - 1, 0, 2, h);
  }
  return c;
}
async function exportPrint() {
  if (busy) return;
  pause();
  const kind = $('exportFormat').value,
    saved = copy(opts),
    bridge = kind === 'jago';
  const scale = ['jago', 'text'].includes(kind) ? 1 : +$('exportScale').value;
  const view = ['jago', 'text'].includes(kind) ? 'print' : $('exportView').value;
  const transferLayers =
    bridge && $('separateInks').checked && !afterOverlays()
      ? Dither.inkColours(saved).map((hex, i) => ({
          id: 'ink' + i,
          name: 'Ink ' + (i + 1) + ' · ' + hex,
          visible: true,
          locked: false,
          opacity: 1
        }))
      : [{ id: 'print', name: 'From the print table', visible: true, locked: false, opacity: 1 }];
  const rate = bridge ? +$('bridgeRate').value : saved.fps;
  const count = ['gif', 'frames', 'jago'].includes(kind)
    ? Math.max(1, Math.round(saved.seconds * rate))
    : 1;
  if (kind === 'text' && saved.method !== 'ascii')
    return toast('Choose Typewriter club in Print to export characters.');
  if (bridge && (count > 48 || Math.abs(count / rate - saved.seconds) > 0.002))
    return toast(
      'Wobble needs 48 frames or fewer and exact frame timing. Choose a different transfer rate or loop length.'
    );
  if (kind === 'gif' && saved.width * scale * (view === 'pair' ? 2 : 1) > 1280)
    return toast(
      'For GIF, keep the longest edge at 1280 px or below. Lower print resolution or pixel enlargement.'
    );
  busy = true;
  cancelled = false;
  document.body.classList.add('busy');
  $('doExport').disabled = true;
  $('cancelExport').hidden = false;
  $('exportProgress').hidden = false;
  $('exportProgress').value = 0;
  try {
    let gif,
      zip = kind === 'frames' ? new PNGSequenceZip() : null;
    const c = makeCanvas(1, 1),
      frames = [],
      timing = [];
    let w = 0,
      h = 0,
      projectBytes = 0;
    for (let i = 0; i < count; i++) {
      if (cancelled) break;
      const t = count === 1 ? phase : i / count,
        before = compose(t);
      const out = await callWorker({
        type: 'render',
        source: pixelsOf(before),
        opts: saved,
        phase: t
      });
      if (cancelled) break;
      if (kind === 'text') {
        const rows = Array.from({ length: out.height }, (_, y) =>
          out.glyphs.slice(y * out.width, (y + 1) * out.width).join('')
        );
        download(
          new Blob([rows.join('\n')], { type: 'text/plain;charset=utf-8' }),
          fileName('.txt')
        );
      } else {
        paintOutput(c, out, scale, t);
        const rendered = comparisonCanvas(c, before, view, t);
        w = rendered.width;
        h = rendered.height;
        if (kind === 'png')
          download(
            await canvasBlob(rendered),
            fileName(view === 'print' ? '.png' : '-comparison.png')
          );
        if (kind === 'gif') {
          if (!gif) gif = new GIFWriter(w, h, fixedGIFPalette(printGIFColours(saved)));
          const delay =
            (Math.round((((i + 1) * saved.seconds) / count) * 100) -
              Math.round(((i * saved.seconds) / count) * 100)) /
            100;
          gif.add(
            rendered.getContext('2d').getImageData(0, 0, w, h).data,
            delay,
            saved.transparent
          );
        }
        if (zip) {
          const name = 'frame-' + String(i + 1).padStart(4, '0') + '.png';
          zip.add(name, new Uint8Array(await (await canvasBlob(rendered)).arrayBuffer()));
          timing.push({
            file: name,
            time: (i * saved.seconds) / count,
            duration: saved.seconds / count
          });
        }
        if (bridge) {
          if (w < 16 || h < 16)
            throw Error(
              'Wobble needs both canvas sides to be at least 16 px. Use a less narrow sheet or a higher print resolution.'
            );
          const plates = transferLayers.length > 1 ? separateInkCanvases(c, saved) : [c];
          const contents = {};
          for (let j = 0; j < plates.length; j++) {
            const png = plates[j].toDataURL('image/png');
            projectBytes += png.length;
            if (projectBytes > 24e6)
              throw Error(
                'This Wobble project is too large. Lower the resolution or transfer rate, or turn off Separate ink layers.'
              );
            contents[transferLayers[j].id] = [
              { kind: 'image', src: png, x: 0, y: 0, w, h, opacity: 1 }
            ];
          }
          frames.push({ id: 'frame-' + i, hold: 1, contents });
        }
      }
      $('exportProgress').value = (i + 1) / count;
      await new Promise((r) => setTimeout(r, 0));
    }
    if (!cancelled) {
      if (gif) download(gif.finish(), fileName(view === 'print' ? '.gif' : '-comparison.gif'));
      if (zip) {
        zip.add(
          'timing.json',
          new TextEncoder().encode(
            JSON.stringify(
              {
                format: 'jago-png-sequence',
                sourceStudio:'dither',
                sourceProjectId:scene.suiteProjectId || crypto.randomUUID(),
                version: 1,
                name: sourceName,
                width: w,
                height: h,
                frameRate: count / saved.seconds,
                duration: saved.seconds,
                loop: 'loop',
                frames: timing
              },
              null,
              2
            )
          )
        );
        zip.add(
          'timing.txt',
          new TextEncoder().encode(
            count / saved.seconds +
              ' frames per second\n' +
              saved.seconds +
              ' seconds\nLoop frames in filename order.\n'
          )
        );
        download(zip.finish(), fileName('-frames.zip'));
      }
      if (bridge) {
        const project = {
          format: 'jago-loop-studio',
          version: 5,
          name: sourceName,
          width: w,
          height: h,
          paper: Dither.inkColours(saved).at(-1),
          transparent: saved.transparent,
          renderStyle: 'smooth',
          pixelSize: 1,
          wiggle: 0,
          boil: 8,
          wiggleEnabled: false,
          fps: rate,
          loop: 'loop',
          layers: transferLayers,
          frames,
          current: 0,
          activeLayer: transferLayers[0].id
        };
        download(
          new Blob([JSON.stringify(project)], { type: 'application/json' }),
          fileName('.jago')
        );
      }
      toast(
        bridge
          ? 'Open this .jago file in Wobble. Add new drawings on a layer above the print.'
          : 'Your print is ready.'
      );
      $('exportDialog').close();
    } else toast('Export cancelled.');
  } finally {
    busy = false;
    document.body.classList.remove('busy');
    $('doExport').disabled = false;
    $('cancelExport').hidden = true;
    $('exportProgress').hidden = true;
    requestPrint();
  }
}

Object.assign(methodHints, {
  burkes: 'A wide error scatter, with lovely soft transitions.',
  sierra: 'A light, three-neighbour scatter. A good crisp all-rounder.',
  crosshatch: 'Two crossing sets of lines, like a little patch of woven ink.',
  rings: 'Concentric bands with a slightly hypnotic printed rhythm.'
});
const showTabBase = showTab;
showTab = function (name) {
  showTabBase(name);
  syncLayers();
};
const syncCompareBase = syncCompare;
syncCompare = function () {
  syncCompareBase();
  syncLayers();
};
const syncTimelineBase = syncTimeline;
syncTimeline = function () {
  syncTimelineBase();
  updateBounds();
};
for (const el of document.querySelectorAll('[data-layer]')) {
  const update = () => {
    const l = selectedLayer();
    if (!l) return;
    const key = el.dataset.layer;
    let value =
      el.type === 'checkbox'
        ? el.checked
        : el.type === 'range' || el.type === 'number'
          ? +el.value
          : el.value;
    if (el.type === 'number' && (!Number.isFinite(value) || value < +el.min || value > +el.max)) {
      el.value = l[key];
      syncLayers();
      return toast('Keep that value between ' + el.min + ' and ' + el.max + '.');
    }
    if (key === 'text') {
      value = value.split('\n').slice(0, 12).join('\n').slice(0, 500);
    }
    if (['cycles', 'seed', 'count'].includes(key) && !Number.isInteger(value)) {
      el.value = l[key];
      return toast('Use a whole number for this setting.');
    }
    if (key === 'overlay' && Object.values(overlayNames).includes(l.name))
      l.name = overlayNames[value];
    l[key] = value;
    composingKey = '';
    syncLayers();
    requestPrint();
  };
  el.oninput = update;
  el.onchange = () => {
    update();
    remember();
  };
}
$('addText').onclick = () => addText();
$('addLayerImage').onclick = () => $('imageFile').click();
$('importLoop').onclick = () => $('sequenceFile').click();
$('sequenceFile').onchange = (e) =>
  safe(async () => {
    await importSequence(e.target.files[0]);
    e.target.value = '';
  });
$('layerDuplicate').onclick = () => {
  const l = selectedLayer();
  if (!l) return;
  if (scene.layers.length >= 12) return toast('There is room for 12 layers.');
  const n = {
    ...copy(l),
    id: uid(),
    name: (l.name + ' copy').slice(0, 60),
    x: Math.min(3600, l.x + 12),
    y: Math.min(3600, l.y + 12)
  };
  scene.layers.push(n);
  scene.active = n.id;
  changedLayer();
};
$('layerDelete').onclick = () => {
  scene.layers = scene.layers.filter((l) => l.id !== scene.active);
  scene.active = scene.layers.at(-1)?.id || '';
  changedLayer();
};
for (const [id, delta] of [
  ['layerUp', 1],
  ['layerDown', -1]
])
  $(id).onclick = () => {
    const i = scene.layers.findIndex((l) => l.id === scene.active),
      j = i + delta;
    if (i < 0 || j < 0 || j >= scene.layers.length) return;
    [scene.layers[i], scene.layers[j]] = [scene.layers[j], scene.layers[i]];
    changedLayer();
  };
$('centreLayer').onclick = () => {
  const l = selectedLayer();
  if (l) {
    l.x = scene.width / 2;
    l.y = scene.height / 2;
    changedLayer();
  }
};
$('fitLayer').onclick = () => {
  const l = selectedLayer();
  if (l) {
    const b = layerSize(l);
    l.scale = Math.max(1, Math.min(400, (scene.width / b.w) * 100, (scene.height / b.h) * 100));
    l.x = scene.width / 2;
    l.y = scene.height / 2;
    changedLayer();
  }
};
$('applyCanvas').onclick = () => {
  const w = +$('sceneWidth').value,
    h = +$('sceneHeight').value;
  if (
    !Number.isInteger(w) ||
    !Number.isInteger(h) ||
    w < 16 ||
    w > 2048 ||
    h < 16 ||
    h > 2048 ||
    w * h > 2097152
  )
    return toast('Use 16–2048 px per side, up to 2,097,152 pixels altogether.');
  const dx = (w - scene.width) / 2,
    dy = (h - scene.height) / 2;
  for (const l of scene.layers) {
    l.x = clamp(l.x + dx, -2400, 3600);
    l.y = clamp(l.y + dy, -2400, 3600);
  }
  scene.width = w;
  scene.height = h;
  changedLayer();
};
$('scenePaper').onchange = (e) => {
  scene.paper = e.target.value;
  changedLayer();
};
$('sceneClear').onchange = (e) => {
  scene.clear = e.target.checked;
  changedLayer();
};
$('canvasPreset').onchange = (e) => {
  if (!e.target.value) return;
  const [w, h] = e.target.value.split('x');
  $('sceneWidth').value = w;
  $('sceneHeight').value = h;
  $('applyCanvas').click();
  e.target.value = '';
};
$('blankCanvas').onclick = openNewSheet;
let splitDrag = false;
$('splitLine').onpointerdown = (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  splitDrag = true;
  e.currentTarget.setPointerCapture(e.pointerId);
};
$('splitLine').onpointermove = (e) => {
  if (!splitDrag) return;
  const r = $('paper').getBoundingClientRect();
  $('compare').value = clamp(((e.clientX - r.left) / r.width) * 100, 0, 100);
  syncCompare();
};
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'])
  $('splitLine').addEventListener(ev, () => (splitDrag = false));
$('splitLine').onkeydown = (e) => {
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
    e.preventDefault();
    $('compare').value =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? 100
          : clamp(
              +$('compare').value + (e.key === 'ArrowRight' ? 1 : -1) * (e.shiftKey ? 10 : 1),
              0,
              100
            );
    syncCompare();
  }
};
$('exportView').onchange = exportInfo;
$('bridgeRate').onchange = exportInfo;
$('swapInks').onclick = reverseInks;
$('newGrain').onclick = () => {
  opts.seed = Math.floor(Math.random() * 65536);
  remember();
  requestPrint();
};
// Keep imports atomic while decoding. Controls return immediately if a file fails.
async function loadingFile(action) {
  if (busy) return;
  busy = true;
  document.body.classList.add('busy');
  try {
    return await action();
  } finally {
    busy = false;
    document.body.classList.remove('busy');
    requestPrint();
  }
}
const loadProjectFile = readProject,
  loadSequenceFile = importSequence;
readProject = (file, recipe) => loadingFile(() => loadProjectFile(file, recipe));
importSequence = (file) => loadingFile(() => loadSequenceFile(file));
