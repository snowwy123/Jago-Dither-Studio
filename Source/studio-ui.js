// SPDX-License-Identifier: MIT
// Screen, character and shared finishing controls. Project state remains in opts.studio.
(() => {
  "use strict";
  const panel = document.querySelector('[data-panel="print"]'),
    classic = $("method").closest("section");
  const host = document.createElement("section");
  host.id = "treatmentStudio";
  host.innerHTML = `
<h3>Treatment studio</h3><p class="hint">Choose a treatment, then tune its marks. Prepare image and the Ink tab remain shared.</p>
<label>Treatment<select id="studioFamily"><option value="print">Print · dither & layered inks</option><option value="screen">Screen · luminous RGB cells</option><option value="characters">Characters · editable text grid</option></select></label>
<label>Starting look<select id="studioRecipe"><option value="">Choose a recipe…</option><option value="clean">Clean RGB screen</option><option value="crt">Soft phosphor</option><option value="slots">Staggered luminous slots</option><option value="terminal">Green terminal</option><option value="type">Paper type</option><option value="colour">Colour character mosaic</option><option value="ink">Two-colour crosshatch</option></select></label>
<div id="studioResolution"></div>
<div data-studio-family="screen"><h4>Screen cells</h4><p class="hint">An artistic screen texture, independent of your monitor's physical pixels. More columns make smaller cells; glow fills their dark gaps.</p></div>
<div data-studio-family="characters"><h4>Character grid</h4><p class="hint">Glyph density is measured from our bundled offline font. Edit individual cells and export real text or an SVG grid.</p><div class="row"><button id="editCharacterGrid">Edit cells…</button><button id="characterTXT">Text</button><button id="characterSVG">SVG</button><button id="characterJSON">Grid data</button></div><button id="clearCharacterCells">Clear cell edits</button><p class="hint">Text and SVG export the character stage before final warping, surface effects and overlays. PNG/video include the full finish.</p></div>
<details id="studioWarp"><summary>Warp · stage order</summary><p class="hint">Warp first bends the source inside its marks. Treatment first bends the marks themselves.</p></details>
<details id="studioSurface"><summary>Surface · sharpen, ringing & scanlines</summary></details>
<details id="studioMotion"><summary>Clip colours · stability & loop join</summary><p class="hint">Locked uses your Colours palette for every frame. Adaptive extracts a new palette per frame and can shimmer. Previous-frame blending is deterministic when seeking; strong scene cuts are protected.</p><button id="analyseClipPalette">Find a shared clip palette</button><button id="inspectLoopSeam">Compare loop ends…</button><p class="hint">End dissolve gently blends the end towards the first frame. It cannot repair a hard cut or mismatched subject movement.</p></details>`;
  panel.prepend(host);
  $("studioResolution").append($("width").closest("label"));
  const movingStudy = document.createElement("button");
  movingStudy.textContent = "Try a moving study";
  movingStudy.title =
    "Replaces the page with an editable example. Undo returns to your work.";
  movingStudy.onclick = () => safe(() => JagoDitherMotion.demo());
  host.querySelector("p").after(movingStudy);
  const controls = [];
  function control(parent, key, label, type, extra) {
    const box = document.createElement("label");
    box.textContent = label;
    let input;
    if (type === "select") {
      input = document.createElement("select");
      for (const [value, name] of extra) input.append(new Option(name, value));
    } else {
      input = document.createElement("input");
      input.type = type;
      if (type === "range" || type === "number") {
        const [min, max, step] = extra;
        Object.assign(input, { min, max, step });
      }
    }
    input.id = "studio_" + key;
    box.append(input);
    let output;
    if (type === "range") {
      output = document.createElement("output");
      box.append(output);
    }
    parent.append(box);
    controls.push({ key, input, output });
    input.addEventListener(
      type === "range" || type === "color" ? "input" : "change",
      () =>
        safe(() => {
          if (busy) return;
          const value =
            type === "checkbox"
              ? input.checked
              : ["range", "number"].includes(type)
                ? Number(input.value)
                : input.value;
          set({ [key]: value }, !["range", "color"].includes(type));
        }),
    );
    if (["range", "color"].includes(type))
      input.addEventListener("change", () => {
        if (!busy) remember();
      });
    return input;
  }
  function set(values, record = true) {
    opts = Dither.settings({
      ...opts,
      riso:
        values.family && values.family !== "print"
          ? { ...opts.riso, enabled: false }
          : opts.riso,
      studio: { ...opts.studio, ...values },
    });
    if (record) remember();
    sync();
    requestPrint();
  }
  const screen = host.querySelector('[data-studio-family="screen"]'),
    chars = host.querySelector('[data-studio-family="characters"]'),
    warp = $("studioWarp"),
    surface = $("studioSurface"),
    motion = $("studioMotion");
  for (const [key, label, type, extra] of [
    [
      "screenMask",
      "Cell mask",
      "select",
      [
        ["rgb", "RGB stripes"],
        ["bgr", "BGR stripes"],
        ["dots", "RGB dots"],
        ["slots", "Staggered slots"],
      ],
    ],
    ["screenColumns", "Columns", "range", [12, 240, 1]],
    ["screenAspect", "Cell height", "range", [0.5, 3, 0.05]],
    ["screenGap", "Dark gaps", "range", [0, 0.8, 0.01]],
    ["screenGain", "Light output", "range", [0.5, 6, 0.1]],
    ["screenBlack", "Black cutoff", "range", [0, 0.6, 0.01]],
    ["screenGlow", "Glow", "range", [0, 1, 0.01]],
    ["screenRadius", "Glow radius", "range", [1, 12, 1]],
    [
      "screenColour",
      "Cell colours",
      "select",
      [
        ["source", "Original image"],
        ["palette", "Colours palette"],
      ],
    ],
    ["screenVertical", "Rotate stripes", "checkbox"],
  ])
    control(screen, key, label, type, extra);
  for (const [key, label, type, extra] of [
    ["columns", "Grid columns", "range", [12, 160, 1]],
    ["cellAspect", "Cell height", "range", [0.8, 2.5, 0.05]],
    ["charset", "Character marks · sparse to dense", "text"],
    ["density", "Sort by measured glyph density", "checkbox"],
    [
      "charPolarity",
      "Mark brightness",
      "select",
      [
        ["light", "Light marks on dark"],
        ["dark", "Dark marks on light"],
      ],
    ],
    ["glyphScale", "Glyph size", "range", [0.4, 1.4, 0.02]],
    [
      "charColour",
      "Mark colours",
      "select",
      [
        ["mono", "One ink"],
        ["source", "Original image"],
        ["palette", "Colours palette"],
      ],
    ],
    ["ink", "Ink", "color"],
    ["background", "Background", "color"],
  ])
    control(chars, key, label, type, extra);
  for (const [key, label, type, extra] of [
    [
      "order",
      "Stage order",
      "select",
      [
        ["warp-first", "Source → warp → treatment → surface"],
        ["treatment-first", "Source → treatment → warp → surface"],
      ],
    ],
    [
      "warp",
      "Warp",
      "select",
      [
        ["off", "Off"],
        ["wave", "Wave"],
        ["swirl", "Swirl"],
        ["mirror", "Mirror fold"],
        ["pinch", "Pinch"],
      ],
    ],
    ["warpAmount", "Amount", "range", [0, 100, 1]],
    ["warpScale", "Wave frequency", "range", [0.25, 8, 0.25]],
    ["warpAnimate", "Animate warp · one cycle per loop", "checkbox"],
    ["wrap", "Wrap edges", "checkbox"],
  ])
    control(warp, key, label, type, extra);
  for (const [key, label, type, extra] of [
    ["surface", "Enable surface finish", "checkbox"],
    ["sharpen", "Sharpen", "range", [0, 2, 0.05]],
    ["ringing", "Horizontal ringing", "range", [0, 1, 0.02]],
    ["scan", "Scanlines", "range", [0, 1, 0.02]],
    ["noise", "Fine noise", "range", [0, 0.4, 0.01]],
  ])
    control(surface, key, label, type, extra);
  for (const [key, label, type, extra] of [
    [
      "paletteMode",
      "Palette behaviour",
      "select",
      [
        ["locked", "Locked · stable across frames"],
        ["adaptive", "Adaptive · follows each frame"],
      ],
    ],
    ["paletteCount", "Extracted colours", "range", [2, 8, 1]],
    ["temporalBlend", "Previous-frame blend", "range", [0, 0.7, 0.05]],
    ["seamBlend", "End dissolve · fraction of loop", "range", [0, 0.4, 0.02]],
  ])
    control(motion, key, label, type, extra);
  const gradientTools = document.createElement("details");
  gradientTools.innerHTML =
    '<summary>Gradient balance & light</summary><p class="hint">With a two- or three-colour gradient enabled, move its middle stop or blend in linear light for a brighter transition. Screen and character treatments share these controls.</p>';
  $("mapMode").closest("label").after(gradientTools);
  control(
    gradientTools,
    "gradientMid",
    "Middle stop · three-colour gradient",
    "range",
    [0.05, 0.95, 0.01],
  );
  control(gradientTools, "gradientSpace", "Blend colours", "select", [
    ["srgb", "Standard colour mix"],
    ["linear", "Linear light · brighter mix"],
  ]);
  $("studioFamily").onchange = () =>
    safe(() => {
      if (!busy) set({ family: $("studioFamily").value });
    });
  $("studioRecipe").onchange = () =>
    safe(() => {
      if (busy) return;
      const k = $("studioRecipe").value;
      if (!k) return;
      let next = { ...DitherStudio.defaults, overrides: [] };
      if (["clean", "crt", "slots"].includes(k)) {
        Object.assign(next, {
          family: "screen",
          screenColumns: k === "clean" ? 80 : 65,
          screenMask: k === "slots" ? "slots" : "rgb",
          screenGlow: k === "clean" ? 0.12 : 0.5,
          screenGap: k === "clean" ? 0.18 : 0.3,
          scan: k === "crt" ? 0.2 : 0,
        });
      } else if (k === "ink") {
        opts = {
          ...opts,
          riso: {
            ...opts.riso,
            enabled: true,
            screen: "crosshatch",
            inks: opts.riso.inks.map((ink, i) => ({ ...ink, enabled: i < 2 })),
          },
        };
      } else
        Object.assign(next, {
          family: "characters",
          columns: 70,
          charColour: k === "colour" ? "source" : "mono",
          charPolarity: k === "type" ? "dark" : "light",
          ink: k === "type" ? "#243342" : "#bceba1",
          background: k === "type" ? "#faf2de" : "#07131e",
          charset: k === "type" ? " .,:;+=*#%@" : " .:-=+*#%@",
        });
      set(next);
      $("studioRecipe").value = "";
    });
  const screenHint = document.createElement("p");
  screenHint.className = "hint";
  const screenFine = document.createElement("details");
  screenFine.innerHTML =
    "<summary>Cell shape, light output & finer controls</summary>";
  for (const key of [
    "screenAspect",
    "screenGap",
    "screenGain",
    "screenBlack",
    "screenRadius",
    "screenVertical",
  ])
    screenFine.append($("studio_" + key).closest("label"));
  screen.append(screenHint, screenFine);
  const characterFine = document.createElement("details");
  characterFine.innerHTML = "<summary>Type shape & density</summary>";
  for (const key of ["cellAspect", "density", "charPolarity", "glyphScale"])
    characterFine.append($("studio_" + key).closest("label"));
  chars.append(characterFine);
  // Keep the familiar print method above shared advanced stages.
  const finishing = document.createElement("section");
  finishing.id = "studioFinishing";
  finishing.append(warp, surface, motion);
  classic.after(finishing);
  const oldSync = sync;
  sync = function () {
    oldSync();
    const s = opts.studio;
    $("studioFamily").value = s.family;
    classic.hidden = s.family !== "print";
    $("rowSlip").closest("section").hidden = s.family !== "print";
    $("selectiveColourTools").hidden = s.family !== "print";
    if (
      s.family !== "print" &&
      $("selectivePick").textContent.startsWith("Picking")
    )
      $("selectivePick").click();
    for (const group of host.querySelectorAll("[data-studio-family]"))
      group.hidden = group.dataset.studioFamily !== s.family;
    for (const { key, input, output } of controls) {
      if (input !== document.activeElement) {
        if (input.type === "checkbox") input.checked = s[key];
        else input.value = s[key];
      }
      if (output) output.value = String(s[key]);
    }
    const horizontalPixels =
        (opts.width * scene.width) / Math.max(scene.width, scene.height),
      pitch = horizontalPixels / s.screenColumns;
    screenHint.textContent =
      pitch < 4
        ? "These cells are less than four output pixels wide. Fewer columns or a higher resolution will resolve their RGB stripes more clearly."
        : "Screen pitch: about " +
          pitch.toFixed(1) +
          " output pixels per cell.";
    const paletteTreatment =
      s.family === "print" ||
      (s.family === "screen" && s.screenColour === "palette") ||
      (s.family === "characters" && s.charColour === "palette");
    $("studio_paletteMode").disabled =
      opts.riso.enabled || opts.mapMode !== "off" || !paletteTreatment;
    gradientTools.hidden = opts.mapMode === "off" || opts.riso.enabled;
    $("analyseClipPalette").disabled = opts.riso.enabled;
    $("studio_paletteMode").title = opts.riso.enabled
      ? "Layered ink colours are authored in Print bench."
      : opts.mapMode !== "off"
        ? "Gradient maps use their authored colours."
        : !paletteTreatment
          ? "Choose Colours palette in this treatment to use palette extraction."
          : "Choose a fixed or per-frame extracted palette.";
  };
  // Atlases stay out of projects and are cached by marks, never by frame or phase.
  const atlasCache = new Map();
  async function atlasFor(settings) {
    const marks = [
      ...new Set([
        ...DitherStudio.graphemes(settings.studio.charset),
        ...settings.studio.overrides.map((c) => c.ch),
        ...Array.from(settings.chars),
      ]),
    ];
    if (marks.length > 256)
      throw Error("Use at most 256 different edited character marks.");
    const key = marks.join("\u0001");
    if (atlasCache.has(key)) return atlasCache.get(key);
    await document.fonts.load("28px JagoPlex");
    const canvas = makeCanvas(24, 40),
      ctx = canvas.getContext("2d", { willReadFrequently: true }),
      glyphs = {};
    for (const ch of marks) {
      ctx.clearRect(0, 0, 24, 40);
      ctx.fillStyle = "#fff";
      ctx.font = "28px JagoPlex";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ch, 12, 20);
      const pixels = ctx.getImageData(0, 0, 24, 40).data,
        mask = new Uint8Array(960);
      let sum = 0;
      for (let i = 0; i < 960; i++) {
        mask[i] = pixels[i * 4 + 3];
        sum += mask[i];
      }
      glyphs[ch] = { mask, density: sum / (960 * 255) };
    }
    const atlas = { width: 24, height: 40, glyphs };
    if (atlasCache.size >= 6) atlasCache.delete(atlasCache.keys().next().value);
    atlasCache.set(key, atlas);
    return atlas;
  }
  const workerCall = callWorker;
  callWorker = async function (data) {
    if (data.type !== "render") return workerCall(data);
    const s = Dither.settings(data.opts),
      context = data.context
        ? { ...data.context }
        : contextAt(data.phase || 0, s);
    if (
      s.studio.family === "characters" ||
      (s.method === "ascii" &&
        (DitherOptics.active(s.studio.optics,s.studio,s.riso.enabled) || s.studio.warp !== "off" ||
          s.studio.sharpen ||
          s.studio.scan ||
          s.studio.noise))
    )
      context.atlas = await atlasFor(s);
    return workerCall({ ...data, opts: s, context });
  };
  // Supply exact neighbouring source frames at the render call site, so queued jobs
  // and candidate previews never accidentally sample a later live scene.
  window.JagoDitherStudio = { atlasFor, set };
  function contextAt(t, settings) {
    const s = settings.studio,
      result = {};
    if (s.temporalBlend)
      result.previousSource = pixelsOf(
        compose(
          Math.max(
            0,
            t - 1 / Math.max(1, Math.round(settings.seconds * settings.fps)),
          ),
        ),
      );
    if(s.optics.finishEnabled&&s.optics.trailsEnabled&&s.optics.trails){result.trailPhase=((t-1/Math.max(1,Math.round(settings.seconds*settings.fps)))%1+1)%1;result.trailSource=pixelsOf(compose(result.trailPhase));}
    if (s.seamBlend) result.seamSource = pixelsOf(compose(0));
    return result;
  }
  window.JagoDitherStudio.contextAt = contextAt;
  // Ink-level controls use the same validated recipe and undo system as Print bench.
  for (const [value, label] of [
    ["ellipses", "Elliptical halftone"],
    ["crosshatch", "Crosshatch"],
  ])
    $("benchScreen").append(new Option(label, value));
  const inkExtra = [];
  for (let i = 0; i < 3; i++)
    for (const [key, label, min, max, step] of [
      ["spacingScale", "Screen size multiplier", 0.5, 2, 0.05],
      ["roughness", "Ink edge roughness", 0, 1, 0.02],
      ["spread", "Extra ink spread", -30, 30, 1],
    ]) {
      const labelEl = document.createElement("label");
      labelEl.textContent = label;
      const input = document.createElement("input");
      Object.assign(input, { type: "range", min, max, step });
      const value = document.createElement("output");
      labelEl.append(input, value);
      $("benchInks").querySelectorAll("details")[i].append(labelEl);
      input.oninput = () => {
        if (busy) return;
        JagoDitherBench.change((r) => (r.inks[i][key] = +input.value), false);
      };
      input.onchange = () => {
        if (!busy) remember();
      };
      inkExtra.push({ input, value, key, i });
    }
  for (const [key, label] of [
    ["paperFibres", "Paper fibres"],
    ["absorption", "Paper absorption"],
  ]) {
    const box = document.createElement("label");
    box.textContent = label;
    const input = document.createElement("input");
    Object.assign(input, { type: "range", min: 0, max: 1, step: 0.02 });
    box.append(input);
    $("benchPaperGrain").closest("label").after(box);
    input.oninput = () => {
      if (!busy) JagoDitherBench.change((r) => (r[key] = +input.value), false);
    };
    input.onchange = () => {
      if (!busy) remember();
    };
    inkExtra.push({ input, key });
  }
  const inkSync = sync;
  sync = function () {
    inkSync();
    for (const c of inkExtra) {
      const value =
        c.i === undefined ? opts.riso[c.key] : opts.riso.inks[c.i][c.key];
      if (document.activeElement !== c.input) c.input.value = value;
      if (c.value) c.value.value = value;
    }
  };
  const audioTools = document.createElement("div");
  audioTools.innerHTML =
    '<h4>Clip soundtrack</h4><label class="check"><input id="clipPreviewAudio" type="checkbox"> Hear soundtrack with Play</label><audio id="clipSoundtrack" controls preload="metadata" style="width:100%"></audio><button id="clipRemoveAudio">Remove soundtrack</button><p class="hint">The selected audio is embedded in your project. If you lengthen the composition, the remaining audio is silence. GIF and PNG have no audio.</p>';
  $("motionWorkshop").append(audioTools);
  const exportAudio = document.createElement("label");
  exportAudio.className = "check";
  exportAudio.innerHTML =
    '<input id="clipExportAudio" type="checkbox" checked> Include clip soundtrack · MP4 / WebM';
  $("exportInfo").before(exportAudio);
  let audioSrc = "";
  const audioSync = sync;
  sync = function () {
    audioSync();
    const src = scene.clipAudio?.src || "";
    if (src !== audioSrc) {
      $("clipSoundtrack").pause();
      $("clipSoundtrack").src = src;
      audioSrc = src;
    }
    audioTools.hidden = !src;
    exportAudio.hidden = !src;
    $("clipRemoveAudio").disabled = busy;
  };
  $("clipRemoveAudio").onclick = () => {
    if (busy) return;
    pause();
    delete scene.clipAudio;
    remember();
    sync();
  };
  const basePause = pause;
  pause = function () {
    basePause();
    $("clipSoundtrack").pause();
  };
  const basePlay = togglePlay;
  togglePlay = function () {
    basePlay();
    if (playing && scene.clipAudio && $("clipPreviewAudio").checked) {
      const audio = $("clipSoundtrack");
      audio.currentTime = Math.min(
        phase * opts.seconds,
        scene.clipAudio.seconds,
      );
      audio
        .play()
        .catch(() =>
          toast(
            "Use the soundtrack Play control to enable audio on this device.",
          ),
        );
    }
  };
  $("playBtn").onclick = togglePlay;
  $("clipPreviewAudio").onchange = () => {
    if (!$("clipPreviewAudio").checked) $("clipSoundtrack").pause();
  };
  const baseTick = tick;
  tick = function (now) {
    baseTick(now);
    const audio = $("clipSoundtrack");
    if (
      playing &&
      scene.clipAudio &&
      $("clipPreviewAudio").checked &&
      !busy &&
      !document.hidden
    ) {
      const t = phase * opts.seconds;
      if (t >= scene.clipAudio.seconds) {
        if (!audio.paused) audio.pause();
      } else {
        if (Math.abs(audio.currentTime - t) > 0.2) audio.currentTime = t;
        if (audio.paused) audio.play().catch(() => {});
      }
    } else if (!audio.paused && playing) audio.pause();
  };
  async function currentGrid(generated = false) {
    if(window.JagoDitherLayers?.active())throw Error("Independent layer looks form a combined image. Export PNG/video, or return layers to Follow whole look for character grids.");
    const settings = copy(opts),
      t = phase,
      source = pixelsOf(compose(t));
    if (generated) settings.studio.overrides = [];
    const out = await callWorker({
      type: "render",
      source,
      opts: settings,
      phase: t,
      context: contextAt(t, settings),
    });
    if (!out.characterGrid)
      throw Error("Choose the Characters treatment first.");
    return out.characterGrid;
  }
  const escapeXML = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
  async function exportGrid(type) {
    const g = await currentGrid(),
      rows = Array.from({ length: g.rows }, (_, y) =>
        g.glyphs.slice(y * g.columns, (y + 1) * g.columns).join(""),
      );
    let body, mime;
    if (type === "txt") {
      body = rows.join("\n");
      mime = "text/plain;charset=utf-8";
    } else if (type === "json") {
      body = JSON.stringify(
        { format: "jago-character-grid", version: 1, ...g },
        null,
        2,
      );
      mime = "application/json";
    } else {
      const font = document
        .querySelector("style")
        .textContent.match(/data:font\/ttf;base64,[A-Za-z0-9+/=]+/)[0];
      body =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${g.width}" height="${g.height}" viewBox="0 0 ${g.width} ${g.height}"><defs><style>@font-face{font-family:JagoPlex;src:url(${font})}</style></defs>` +
        (g.transparent
          ? ""
          : `<rect width="100%" height="100%" fill="${g.background}"/>`);
      for (let y = 0; y < g.rows; y++)
        for (let x = 0; x < g.columns; x++) {
          const i = y * g.columns + x;
          if (g.glyphs[i] === " ") continue;
          body += `<text x="${(x + 0.5) * g.cellWidth}" y="${(y + 0.5) * g.cellHeight}" font-family="JagoPlex,monospace" font-size="${g.cellHeight * 0.7 * g.scale}" text-anchor="middle" dominant-baseline="central" fill="rgb(${g.colours[i].map(Math.round).join(",")})" opacity="${g.transparent ? g.alpha[i] / 255 : 1}">${escapeXML(g.glyphs[i])}</text>`;
        }
      body += "<metadata>" + escapeXML(studioFontNotice) + "</metadata></svg>";
      mime = "image/svg+xml";
    }
    download(new Blob([body], { type: mime }), fileName("-characters." + type));
  }
  const baseExport = exportPrint;
  exportPrint = async function () {
    if (
      $("exportFormat").value === "text" &&
      opts.studio.family === "characters"
    ) {
      await exportGrid("txt");
      $("exportDialog").close();
      return;
    }
    return baseExport();
  };
  $("doExport").onclick = () => safe(exportPrint);
  for (const type of ["TXT", "SVG", "JSON"])
    $("character" + type).onclick = () =>
      safe(() => exportGrid(type.toLowerCase()));
  $("clearCharacterCells").onclick = () => {
    if (!busy) set({ overrides: [] });
  };
  $("editCharacterGrid").onclick = () =>
    safe(async () => {
      pause();
      const owner = scene,
        original = copy(opts),
        grid = await currentGrid(true),
        dialog = document.createElement("dialog");
      dialog.className = "character-editor";
      dialog.innerHTML =
        '<button class="close" aria-label="Close">×</button><h2>Edit character cells</h2><p>Click or drag to paint. Right-click a cell to restore its generated mark. Apply creates one undo step.</p><label>Paint mark<input id="paintCharacter" value="#" maxlength="12"></label><div class="character-scroll"></div><div class="row"><button class="primary" data-apply>Apply edits</button><button data-cancel>Cancel</button></div>';
      const canvas = makeCanvas(grid.columns * 12, grid.rows * 18),
        ctx = canvas.getContext("2d"),
        edits = new Map(
          original.studio.overrides.map((c) => [c.y * grid.columns + c.x, c]),
        );
      function draw() {
        ctx.fillStyle = grid.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = "14px JagoPlex";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        for (let i = 0; i < grid.glyphs.length; i++) {
          ctx.fillStyle =
            "rgb(" + grid.colours[i].map(Math.round).join(",") + ")";
          ctx.fillText(
            edits.get(i)?.ch ?? grid.glyphs[i],
            ((i % grid.columns) + 0.5) * 12,
            (Math.floor(i / grid.columns) + 0.5) * 18,
          );
        }
      }
      let drawing = false,
        erase = false;
      function paint(e) {
        const b = canvas.getBoundingClientRect(),
          x = Math.floor(((e.clientX - b.left) / b.width) * grid.columns),
          y = Math.floor(((e.clientY - b.top) / b.height) * grid.rows);
        if (x < 0 || y < 0 || x >= grid.columns || y >= grid.rows) return;
        const k = y * grid.columns + x;
        if (erase) edits.delete(k);
        else {
          const ch = DitherStudio.graphemes(
            dialog.querySelector("input").value,
          )[0];
          if (!ch || /[\r\n\t]/.test(ch)) return;
          if (edits.size >= 2048 && !edits.has(k))
            return toast("This grid supports 2048 edited cells.");
          edits.set(k, { x, y, ch });
        }
        draw();
      }
      canvas.onpointerdown = (e) => {
        drawing = true;
        erase = e.button === 2;
        canvas.setPointerCapture(e.pointerId);
        paint(e);
      };
      canvas.onpointermove = (e) => {
        if (drawing) paint(e);
      };
      canvas.onpointerup = () => (drawing = false);
      canvas.onpointercancel = () => (drawing = false);
      canvas.oncontextmenu = (e) => e.preventDefault();
      dialog.querySelector(".character-scroll").append(canvas);
      const close = () => {
        dialog.close();
        dialog.remove();
      };
      dialog.querySelector(".close").onclick = dialog.querySelector(
        "[data-cancel]",
      ).onclick = close;
      dialog.oncancel = (e) => {
        e.preventDefault();
        close();
      };
      dialog.querySelector("[data-apply]").onclick = () =>
        safe(() => {
          if (
            scene !== owner ||
            JSON.stringify(opts) !== JSON.stringify(original)
          )
            throw Error("The project changed. Reopen the grid.");
          set({ overrides: [...edits.values()] });
          close();
        });
      document.body.append(dialog);
      dialog.showModal();
      draw();
    });
  $("analyseClipPalette").onclick = () =>
    safe(async () => {
      if (busy) return;
      pause();
      const owner = scene,
        snapshot = JSON.stringify(scene),
        settings = copy(opts),
        frames = [];
      for (let i = 0; i < 8; i++) {
        frames.push(DitherStudio.resized(pixelsOf(compose(i / 8)), 64));
        await new Promise((r) => setTimeout(r, 0));
        if (scene !== owner || JSON.stringify(scene) !== snapshot)
          throw Error("Project changed; palette analysis cancelled.");
      }
      const data = new Uint8ClampedArray(
        frames.reduce((n, f) => n + f.data.length, 0),
      );
      let at = 0;
      for (const f of frames) {
        data.set(f.data, at);
        at += f.data.length;
      }
      const palette = DitherStudio.palette(
        { data },
        Math.round(settings.studio.paletteCount),
      );
      if (JSON.stringify(opts) !== JSON.stringify(settings))
        throw Error("Settings changed; palette analysis cancelled.");
      opts = Dither.settings({
        ...opts,
        palette,
        studio: { ...opts.studio, paletteMode: "locked" },
      });
      remember();
      sync();
      requestPrint();
      toast(
        "Shared palette found from eight equally spaced frames. Colours shows the editable result.",
      );
    });
  $("inspectLoopSeam").onclick = () =>
    safe(async () => {
      if (busy) return;
      pause();
      const settings = copy(opts),
        end = 1 - 1 / Math.max(1, Math.round(settings.seconds * settings.fps)),
        sources = [pixelsOf(compose(0)), pixelsOf(compose(end))],
        contexts = [contextAt(0, settings), contextAt(end, settings)],
        dlg = document.createElement("dialog");
      dlg.innerHTML =
        '<button class="close">×</button><h2>Loop join · first and last frames</h2><p>A dissolve can soften this join; it does not guarantee matching movement.</p><div class="print-directions-grid"></div>';
      document.body.append(dlg);
      dlg.showModal();
      dlg.querySelector(".close").onclick = () => {
        dlg.close();
        dlg.remove();
      };
      for (let i = 0; i < 2; i++) {
        const out = await callWorker({
            type: "render",
            source: sources[i],
            opts: { ...settings, width: 320 },
            phase: i ? end : 0,
            context: contexts[i],
          }),
          canvas = makeCanvas(1, 1);
        if (!dlg.open) return;
        paintOutput(canvas, out, 1);
        dlg.querySelector(".print-directions-grid").append(canvas);
      }
    });
  sync();
  requestPrint();
})();
