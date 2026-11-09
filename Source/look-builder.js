// SPDX-License-Identifier: MIT
// Reuse existing controls and bindings; selecting settings never enables a stage.
(() => {
  "use strict";
  const O = DitherOptics,
    panel = document.querySelector('[data-panel="print"]'),
    classic = $("method").closest("section"),
    host = $("treatmentStudio");
  const root = document.createElement("section");
  root.id = "lookBuilder";
  root.innerHTML = `<div class="look-title"><h2>Build your look</h2><button id="lookCompare" title="Switch between original and finished preview">Before / after</button></div><p class="hint">Choose a treatment. Add or bypass effects without losing their settings.</p><nav id="lookSteps" aria-label="Look settings"></nav><div id="lookStages" aria-label="Your effect switches"></div><p id="lookStageHint" class="hint" role="status"></p><label>Quick starting look<select id="lookRecipe"><option value="">Choose a starting point…</option><option value="quiet">Colour from the dark</option><option value="colourOnly">Saturated colour only</option><option value="glass">Curved phosphor screen</option><option value="wide">Fisheye colour print</option><option value="poster">Classic dot poster</option><option value="combined">Dither + line texture</option><option value="terminal">Terminal with scanlines</option></select></label><p class="hint">Starting looks replace effects; they keep artwork, timing and saved directions.</p>`;
  panel.prepend(root);
  const pages = {};
  let current = "treat";
  const stageDefs = [
    ["treatmentEnabled", "Treatment", "treat"],
    ["textureEnabled", "Texture", "treat"],
    ["inks", "Inks", "colour"],
    ["warpEnabled", "Warp", "treat"],
    ["lightEnabled", "Light", "light"],
    ["lensEnabled", "Lens", "lens"],
    ["finishEnabled", "Finish", "finish"],
  ];
  for (const [id, label] of [
    ["treat", "Treat"],
    ["colour", "Colour"],
    ["light", "Light"],
    ["lens", "Lens"],
    ["finish", "Finish"],
  ]) {
    const button = document.createElement("button");
    button.textContent = label;
    button.dataset.lookStep = id;
    button.onclick = () => open(id, true);
    $("lookSteps").append(button);
    const page = document.createElement("div");
    page.dataset.lookPage = id;
    panel.append(page);
    pages[id] = page;
  }
  const dock = document.createElement("div");
  dock.id = "lookDock";
  dock.append($("lookSteps"));
  const effectsLink = document.createElement("button");
  effectsLink.id = "lookEffectsLink";
  effectsLink.onclick = () => scrollInspector(root);
  dock.append(effectsLink);
  panel.prepend(dock);
  function scrollInspector(target) {
    const inspector = panel.closest(".inspector"),
      top =
        target.getBoundingClientRect().top -
        inspector.getBoundingClientRect().top;
    inspector.scrollTop = Math.max(
      0,
      inspector.scrollTop + top - 57 - dock.getBoundingClientRect().height - 10,
    );
  }
  function open(id, scroll = false) {
    current = id;
    for (const [key, page] of Object.entries(pages)) page.hidden = key !== id;
    for (const b of $("lookSteps").children) {
      b.setAttribute("aria-pressed", b.dataset.lookStep === id);
      b.classList.toggle("active", b.dataset.lookStep === id);
    }
    const key = stageDefs.find((d) => d[2] === id)?.[0],
      on = stageOn(key);
    $("lookStageHint").textContent =
      id === "colour"
        ? "Palette and overlapping inks are separate: inks can print over any treatment."
        : on
          ? "Settings below · your other effects stay enabled."
          : "Bypassed · edit freely, then enable above.";
    effectsLink.textContent =
      (id === "colour"
        ? "Inks"
        : id === "treat"
          ? "Treatment"
          : id[0].toUpperCase() + id.slice(1)) +
      " " +
      (on ? "on" : "off") +
      " · switches ↑";
    if (scroll) scrollInspector(pages[id]);
  }
  function applyOpt(values, record = true) {
    const s = opts.studio,
      o = { ...s.optics, ...values };
    for (const [lo, hi] of [
      ["cellLow", "cellHigh"],
      ["glowLow", "glowHigh"],
      ["targetLow", "targetHigh"],
      ["satLow", "satHigh"],
    ]) {
      if (o[lo] >= o[hi]) {
        if (lo in values) o[hi] = Math.min(1, o[lo] + 0.02);
        else o[lo] = Math.max(0, o[hi] - 0.02);
      }
    }
    const family =
      values.inkStage === "integrated" && opts.riso.enabled
        ? "print"
        : s.family;
    if (values.inkStage === "integrated" && opts.riso.enabled)
      o.printGroup = "halftone";
    opts = Dither.settings({ ...opts, studio: { ...s, family, optics: o } });
    if (record) remember();
    sync();
    requestPrint();
  }
  function lightConfigured() {
    const s = opts.studio,
      o = s.optics;
    return (
      (s.family === "screen" && s.screenGlow > 0) ||
      (o.protectShadows && s.family === "screen") ||
      o.halationEnabled
    );
  }
  function finishConfigured() {
    const s = opts.studio,
      o = s.optics;
    return (
      o.scanEnabled ||
      o.fringeEnabled ||
      o.vignetteEnabled ||
      o.trailsEnabled ||
      (s.surface && (s.sharpen || s.ringing || s.scan || s.noise)) ||
      opts.rowSlip ||
      opts.blockShift ||
      opts.rgbSplit ||
      opts.bloom ||
      opts.scanlines ||
      opts.vignette ||
      opts.solarize
    );
  }
  function stageOn(key) {
    const o = opts.studio.optics;
    if (key === "inks")
      return (
        opts.riso.enabled && (o.inkStage === "after" || o.treatmentEnabled)
      );
    if (key === "warpEnabled")
      return o.warpEnabled && opts.studio.warp !== "off";
    if (key === "lightEnabled") return o.lightEnabled && lightConfigured();
    if (key === "finishEnabled") return o.finishEnabled && finishConfigured();
    return o[key];
  }
  for (const [key, label, page] of stageDefs) {
    const row = document.createElement("div");
    row.className = "look-stage";
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.id = "lookStage_" + key;
    toggle.setAttribute("aria-label", "Enable " + label.toLowerCase());
    toggle.onchange = () =>
      safe(() => {
        if (busy) return;
        if (key === "inks") {
          opts = Dither.settings({
            ...opts,
            riso: { ...opts.riso, enabled: toggle.checked },
            studio: {
              ...opts.studio,
              optics: { ...opts.studio.optics, inkStage: "after" },
            },
          });
          remember();
          sync();
          requestPrint();
        } else if (
          key === "warpEnabled" &&
          toggle.checked &&
          opts.studio.warp === "off"
        ) {
          opts = Dither.settings({
            ...opts,
            studio: {
              ...opts.studio,
              warp: "wave",
              optics: { ...opts.studio.optics, warpEnabled: true },
            },
          });
          remember();
          sync();
          requestPrint();
        } else if (
          key === "lightEnabled" &&
          toggle.checked &&
          !lightConfigured()
        )
          applyOpt({ lightEnabled: true, halationEnabled: true });
        else if (
          key === "finishEnabled" &&
          toggle.checked &&
          !finishConfigured()
        )
          applyOpt({ finishEnabled: true, scanEnabled: true });
        else applyOpt({ [key]: toggle.checked });
      });
    const edit = document.createElement("button");
    edit.id = "lookEdit_" + key;
    edit.onclick = () => {
      showTab("print");
      open(page, true);
      if (key === "textureEnabled") textureBox.open = true;
      if (key === "warpEnabled") $("studioWarp").open = true;
    };
    row.append(toggle, edit);
    $("lookStages").append(row);
  }
  const controls = [];
  function field(parent, key, label, type, extra) {
    const box = document.createElement("label");
    box.textContent = label;
    const input = document.createElement(
      type === "select" ? "select" : "input",
    );
    if (type === "select")
      for (const [v, t] of extra) input.append(new Option(t, v));
    else {
      input.type = type;
      if (type === "range" || type === "number") {
        const [min, max, step] = extra;
        Object.assign(input, { min, max, step });
      }
    }
    input.id = "look_" + key;
    box.append(input);
    const value = type === "range" ? document.createElement("output") : null;
    if (value) box.append(value);
    parent.append(box);
    controls.push({ key, input, value });
    input.addEventListener(
      ["range", "color"].includes(type) ? "input" : "change",
      () =>
        safe(() => {
          if (busy) return;
          const v =
            type === "checkbox"
              ? input.checked
              : ["range", "number"].includes(type)
                ? +input.value
                : input.value;
          applyOpt({ [key]: v }, !["range", "color"].includes(type));
        }),
    );
    if (["range", "color"].includes(type))
      input.addEventListener("change", () => {
        if (!busy) remember();
      });
    return input;
  }
  function note(parent, text) {
    const p = document.createElement("p");
    p.className = "hint";
    p.textContent = text;
    parent.append(p);
    return p;
  }
  function details(parent, title) {
    const d = document.createElement("details");
    d.append(
      Object.assign(document.createElement("summary"), { textContent: title }),
    );
    parent.append(d);
    return d;
  }
  const families = document.createElement("div");
  families.className = "look-families";
  families.id = "lookFamilies";
  pages.treat.append(families);
  for (const [id, name, sub] of [
    ["dither", "Dither", "Ordered, scattered & error diffusion"],
    ["halftone", "Halftone", "Dots, ellipses, lines & crosshatch"],
    ["characters", "Characters", "Editable text cells"],
    ["screen", "Luminous screen", "RGB cells, dots & slots"],
  ]) {
    const b = document.createElement("button");
    b.dataset.lookFamily = id;
    b.innerHTML = "<strong>" + name + "</strong><span>" + sub + "</span>";
    b.onclick = () => safe(() => chooseFamily(id));
    families.append(b);
  }
  const styleGrid = document.createElement("div");
  styleGrid.className = "look-style-grid";
  styleGrid.id = "lookStyles";
  pages.treat.append(styleGrid);
  const shapes = {
    dither: [
      ["bayer2", "Bold ordered"],
      ["bayer4", "Classic ordered"],
      ["bayer8", "Fine ordered"],
      ["atkinson", "Soft diffusion"],
      ["floyd", "Detailed diffusion"],
      ["grain", "Scattered grain"],
    ],
    halftone: [
      ["dots", "Round dots"],
      ["ellipse", "Elliptical dots"],
      ["lines", "Lines"],
      ["crosshatch", "Crosshatch"],
      ["diamonds", "Diamonds"],
      ["rings", "Rings"],
    ],
  };
  const styleButtons = [];
  for (const [group, items] of Object.entries(shapes))
    for (const [method, label] of items) {
      const b = document.createElement("button");
      b.dataset.styleGroup = group;
      b.dataset.method = method;
      const canvas = makeCanvas(94, 54);
      b.append(canvas, document.createTextNode(label));
      b.onclick = () =>
        safe(() => {
          if (busy) return;
          const o = opts.studio.optics;
          if (
            opts.riso.enabled &&
            o.inkStage === "integrated" &&
            group === "halftone"
          ) {
            const screen = method === "ellipse" ? "ellipses" : method;
            opts = Dither.settings({
              ...opts,
              riso: { ...opts.riso, screen },
              studio: { ...opts.studio, optics: { ...o, printGroup: group } },
            });
          } else
            opts = Dither.settings({
              ...opts,
              method,
              studio: { ...opts.studio, optics: { ...o, printGroup: group } },
            });
          remember();
          sync();
          requestPrint();
        });
      styleButtons.push({ b, canvas, method, group });
      styleGrid.append(b);
    }
  function groupOf() {
    const s = opts.studio,
      o = s.optics;
    if (s.family !== "print") return s.family;
    if (opts.riso.enabled && o.inkStage === "integrated") return "halftone";
    return o.printGroup !== "auto"
      ? o.printGroup
      : [
            "dots",
            "ellipse",
            "lines",
            "crosshatch",
            "diamonds",
            "rings",
            "weave",
          ].includes(opts.method)
        ? "halftone"
        : "dither";
  }
  function chooseFamily(id) {
    if (busy) return;
    const previous = groupOf(),
      o = copy(opts.studio.optics);
    if (
      ["dither", "halftone"].includes(previous) &&
      !(opts.riso.enabled && o.inkStage === "integrated")
    )
      o.memory[previous] = {
        method: opts.method,
        cell: opts.cell,
        patternScale: opts.patternScale,
        patternAngle: opts.patternAngle,
      };
    const next = { ...opts, studio: { ...opts.studio, optics: o } };
    if (["dither", "halftone"].includes(id)) {
      Object.assign(next, o.memory[id]);
      next.studio.family = "print";
      o.printGroup = id;
    } else next.studio.family = id;
    if (opts.riso.enabled) o.inkStage = "after";
    opts = Dither.settings(next);
    remember();
    sync();
    requestPrint();
  }
  const primaryPrint = document.createElement("div");
  primaryPrint.id = "lookPrintPrimary";
  const primaryClassic = document.createElement("div"),
    primaryInk = document.createElement("div");
  for (const id of ["cell", "patternScale", "patternAngle"])
    primaryClassic.append($(id).closest(".range") || $(id).closest("label"));
  field(
    primaryClassic,
    "dotGain",
    "Halftone ink spread",
    "range",
    [-50, 50, 1],
  );
  const firstAngle = $("benchInks").querySelector(
    '[data-bench-ink="0"][data-property="angle"]',
  );
  firstAngle.closest("label").firstChild.textContent = "First ink angle";
  primaryInk.append(
    $("benchSpacing").closest("label"),
    $("benchGain").closest("label"),
    firstAngle.closest("label"),
  );
  primaryPrint.append(primaryClassic, primaryInk);
  pages.treat.append(primaryPrint);
  const allMethods = details(pages.treat, "All dither & pattern controls");
  allMethods.id = "lookAllMethods";
  allMethods.append(classic);
  pages.treat.append(host);
  host.querySelector("h3").hidden = true;
  host.querySelector("p").hidden = true;
  $("studioFamily").closest("label").hidden = true;
  $("studioRecipe").closest("label").hidden = true;
  const movingStudy = [...host.querySelectorAll("button")].find(
    (b) => b.textContent === "Try a moving study",
  );
  if (movingStudy) {
    movingStudy.textContent = "Load an editable moving study";
    pages.treat.append(movingStudy);
  }
  const textureBox = details(
    pages.treat,
    "Additional texture · combine with any treatment",
  );
  textureBox.id = "lookTexture";
  note(
    textureBox,
    "Texture is an optional extra pass, not a replacement for the base treatment. Enable Texture above; then choose shape, size and strength.",
  );
  for (const [k, label, type, extra] of [
    [
      "textureMethod",
      "Texture shape",
      "select",
      [
        ["dots", "Round dots"],
        ["ellipses", "Elliptical dots"],
        ["lines", "Lines"],
        ["crosshatch", "Crosshatch"],
        ["diamonds", "Diamonds"],
        ["grain", "Grain"],
      ],
    ],
    ["textureSize", "Texture size", "range", [2, 40, 1]],
    ["textureAngle", "Angle", "range", [-180, 180, 1]],
    ["textureStrength", "Ink strength", "range", [0, 1, 0.02]],
    ["textureColour", "Texture ink", "color"],
    [
      "textureStage",
      "Apply texture",
      "select",
      [
        ["surface", "Over the treated image"],
        ["source", "To the source before treatment"],
      ],
    ],
  ])
    field(textureBox, k, label, type, extra);
  pages.treat.append($("studioWarp"));
  const prep = details(pages.treat, "Prepare the source image");
  prep.append($("brightness").closest("section"));
  const resolution = $("width").closest("label");
  resolution.classList.add("look-resolution");
  resolution.firstChild.textContent = "Render ";
  resolution.title =
    "Longest rendered edge. Choose a smaller size while exploring; increase it for final export.";
  const dockRow = document.createElement("div");
  dockRow.className = "look-dock-row";
  dockRow.append(effectsLink, resolution);
  dock.append(dockRow);
  // Colour is one destination; preserve existing palette and ink bindings.
  const colourContext = document.createElement("div"),
    colourHint = note(colourContext, "");
  pages.colour.append(colourContext);
  for (const id of [
    "studio_screenColour",
    "studio_charColour",
    "studio_ink",
    "studio_background",
  ])
    colourContext.append($(id).closest("label"));
  for (const section of [
    ...document.querySelector('[data-panel="ink"]').children,
  ])
    pages.colour.append(section);
  const inkPosition = document.createElement("section");
  inkPosition.innerHTML = "<h3>Overlapping printing inks</h3>";
  pages.colour.append(inkPosition);
  field(inkPosition, "inkStage", "Ink placement", "select", [
    ["after", "Print over the current treatment"],
    ["integrated", "Integrated layered print · its own screen"],
  ]);
  note(
    inkPosition,
    "Enable Layered inks above. Over treatment combines inks with dither, characters or RGB cells. Integrated print uses its own ink-screen treatment, so Treatment bypass also bypasses those inks. Use Over treatment for independent stages. Coverage plate kits are available for integrated printing.",
  );
  for (const section of [
    ...document.querySelector('[data-panel="bench"]').children,
  ])
    pages.colour.append(section);
  $("benchEnabled").closest("label").hidden = true;
  $("benchBypass").hidden = true;
  pages.colour.append($("studioMotion"));
  // Light: keep the actual screen controls, not copies of them.
  pages.light.innerHTML = "<h3>Light against quiet shadows</h3>";
  note(
    pages.light,
    "Light can keep dark areas quiet while preserving coloured emitters. Visible cells and their halo have separate soft thresholds.",
  );
  const screenGlow = document.createElement("div");
  screenGlow.id = "lookScreenGlow";
  for (const id of ["studio_screenGlow", "studio_screenRadius"])
    screenGlow.append($(id).closest("label"));
  pages.light.append(screenGlow);
  field(
    pages.light,
    "protectShadows",
    "Protect shadows · screen cells & glow",
    "checkbox",
  );
  for (const [k, label] of [
    ["cellLow", "Cells · begin appearing"],
    ["cellHigh", "Cells · fully visible"],
    ["glowLow", "Glow · begin appearing"],
    ["glowHigh", "Glow · full strength"],
  ])
    field(pages.light, k, label, "range", [
      k.endsWith("Low") ? 0 : 0.02,
      k.endsWith("Low") ? 0.98 : 1,
      0.01,
    ]);
  field(
    pages.light,
    "halationEnabled",
    "Add a soft highlight halo",
    "checkbox",
  );
  field(pages.light, "halation", "Halo amount", "range", [0, 1, 0.02]);
  const haloFine = details(pages.light, "Halo colour, radius & threshold");
  field(haloFine, "halationRadius", "Halo radius", "range", [1, 20, 1]);
  field(
    haloFine,
    "halationThreshold",
    "Highlight threshold",
    "range",
    [0, 1, 0.01],
  );
  field(haloFine, "halationTint", "Halo tint", "color");
  const scope = details(pages.light, "Where the whole look applies");
  scope.id = "lookScope";
  note(
    scope,
    "Choose source highlights, saturated colours, picked colours or a painted output area. Untreated areas keep the prepared source. This limits the complete look, including lens and finish.",
  );
  field(scope, "maskEnabled", "Limit effects to this selection", "checkbox");
  field(scope, "target", "Target", "select", [
    ["all", "Everything"],
    ["highlights", "Source highlights"],
    ["saturated", "Saturated source colours"],
    ["picked", "Picked source colours"],
    ["painted", "Painted output area"],
  ]);
  for (const [k, label] of [
    ["targetLow", "Highlights · begin"],
    ["targetHigh", "Highlights · full"],
    ["satLow", "Saturation · begin"],
    ["satHigh", "Saturation · full"],
  ])
    field(scope, k, label, "range", [
      k.endsWith("Low") ? 0 : 0.02,
      k.endsWith("Low") ? 0.98 : 1,
      0.01,
    ]);
  field(scope, "tolerance", "Picked-colour tolerance", "range", [0, 1, 0.01]);
  field(
    scope,
    "maskSoftness",
    "Colour edge softness",
    "range",
    [0.01, 1, 0.01],
  );
  field(scope, "maskInvert", "Invert selection", "checkbox");
  const picks = document.createElement("div");
  picks.innerHTML =
    '<div class="row"><input type="color" id="lookPickColour" value="#ec6197" aria-label="Selection colour"><button id="lookAddPick">Add colour</button><button id="lookPickOriginal">Pick from Original</button></div><div id="lookPicked" class="row"></div><button id="lookPaintMask">Paint / erase mask…</button><label class="check"><input type="checkbox" id="lookMaskPreview"> Show selection on Original · guide only</label>';
  scope.append(picks);
  pages.lens.innerHTML = "<h3>Lens & curved glass</h3>";
  note(
    pages.lens,
    "Curve the source to keep its cells straight, or curve the finished screen so the marks bend with the glass. Enable Lens above when ready.",
  );
  for (const [k, label, type, extra] of [
    [
      "lensType",
      "Lens style",
      "select",
      [
        ["crt", "Subtle CRT glass"],
        ["fisheye", "Fisheye"],
        ["barrel", "Barrel"],
        ["pincushion", "Pincushion"],
      ],
    ],
    ["lensAmount", "Curvature", "range", [0, 1, 0.02]],
    [
      "lensStage",
      "Lens position",
      "select",
      [
        ["source", "Before treatment · straight cells"],
        ["screen", "Finished screen · curved cells"],
      ],
    ],
    ["lensAutoFrame", "Automatically fill the frame", "checkbox"],
    ["lensZoom", "Framing zoom", "range", [0.5, 3, 0.02]],
  ])
    field(pages.lens, k, label, type, extra);
  const lensFine = details(pages.lens, "Lens centre & edge handling");
  field(lensFine, "lensX", "Centre · horizontal", "range", [0, 1, 0.01]);
  field(lensFine, "lensY", "Centre · vertical", "range", [0, 1, 0.01]);
  field(lensFine, "lensEdge", "Uncovered edges", "select", [
    ["black", "Black"],
    ["transparent", "Transparent"],
    ["clamp", "Extend edge pixels"],
    ["mirror", "Reflect image"],
  ]);
  pages.finish.innerHTML = "<h3>Scanlines & finishing</h3>";
  note(
    pages.finish,
    "Each finish keeps its settings when bypassed. Enable Finish above to include these in the result.",
  );
  field(pages.finish, "scanEnabled", "Scanlines on", "checkbox");
  for (const [k, label, type, extra] of [
    [
      "scanMode",
      "Scanline style",
      "select",
      [
        ["display", "Subtle display lines"],
        ["crt", "CRT beam lines"],
        ["bands", "Broad analogue bands"],
      ],
    ],
    ["scanStrength", "Line strength", "range", [0, 1, 0.02]],
    ["scanSpacing", "Spacing · output pixels", "range", [2, 32, 1]],
    ["scanThickness", "Line thickness", "range", [0.03, 0.95, 0.01]],
    ["scanSoftness", "Line softness", "range", [0, 1, 0.02]],
    ["scanRoll", "Slow rolling movement", "checkbox"],
    ["scanCycles", "Roll cycles per loop", "range", [1, 8, 1]],
  ])
    field(pages.finish, k, label, type, extra);
  for (const [k, label, amount, max] of [
    ["fringeEnabled", "Colour fringing", "fringe", 12],
    ["vignetteEnabled", "Soft vignette", "vignette", 1],
    ["trailsEnabled", "One-frame phosphor trail", "trails", 0.8],
  ]) {
    field(pages.finish, k, label, "checkbox");
    field(pages.finish, amount, "Amount", "range", [
      0,
      max,
      max === 12 ? 0.25 : 0.02,
    ]);
  }
  field(
    pages.finish,
    "trailThreshold",
    "Trail · highlight threshold",
    "range",
    [0, 1, 0.02],
  );
  note(
    pages.finish,
    "Trails use one exact previous rendered frame, including across the loop join. Seeking and export give the same result; they do not accumulate playback history.",
  );
  pages.finish.append($("studioSurface"));
  $("studioSurface").querySelector("summary").textContent =
    "Sharpening, ringing, grain & original scanlines";
  const oldEffects = details(pages.finish, "Original before-print effects");
  oldEffects.append($("rowSlip").closest("section"));
  const oldFinish = $("studioFinishing");
  if (oldFinish && !oldFinish.children.length) oldFinish.remove();
  // Route old shortcuts to the same controls, rather than leaving duplicate panels.
  const oldTab = showTab;
  showTab = function (id) {
    if (["print", "ink", "bench"].includes(id)) {
      oldTab("print");
      open(id === "print" ? current : "colour");
    } else oldTab(id);
  };
  document.querySelector('[data-tab="print"]').textContent = "Look";
  document.querySelector('[data-tab="ink"]').hidden = true;
  document.querySelector('[data-tab="bench"]').hidden = true;
  document.querySelector('[data-tab="play"]').textContent = "Explore";
  document.querySelector(
    '[data-tab="print"]',
  ).parentElement.style.gridTemplateColumns = "repeat(4,minmax(0,1fr))";
  $("lookCompare").onclick = () => {
    $("viewMode").value =
      $("viewMode").value === "original" ? "result" : "original";
    drawOriginal(phase);
    syncCompare();
  };
  $("method").addEventListener(
    "change",
    () => {
      const group = [
        "dots",
        "ellipse",
        "lines",
        "crosshatch",
        "diamonds",
        "rings",
        "weave",
      ].includes($("method").value)
        ? "halftone"
        : "dither";
      opts.studio.optics.printGroup = group;
    },
    true,
  );
  const oldSync = sync;
  sync = function () {
    oldSync();
    const o = opts.studio.optics,
      group = groupOf();
    for (const [key, label] of stageDefs) {
      $("lookStage_" + key).checked = !!stageOn(key);
      $("lookEdit_" + key).textContent =
        label + " · " + (stageOn(key) ? "on" : "off");
    }
    for (const { key, input, value } of controls) {
      if (document.activeElement !== input) {
        if (input.type === "checkbox") input.checked = o[key];
        else input.value = o[key];
      }
      if (value) value.value = String(o[key]);
    }
    for (const b of families.children)
      b.setAttribute("aria-pressed", b.dataset.lookFamily === group);
    for (const { b, method, group: g } of styleButtons) {
      b.hidden = g !== group;
      b.setAttribute(
        "aria-pressed",
        opts.riso.enabled && o.inkStage === "integrated"
          ? opts.riso.screen === (method === "ellipse" ? "ellipses" : method)
          : opts.method === method,
      );
    }
    primaryPrint.hidden = opts.studio.family !== "print";
    const integrated = opts.riso.enabled && o.inkStage === "integrated";
    primaryClassic.hidden = integrated;
    primaryInk.hidden = !integrated;
    if (document.activeElement !== firstAngle)
      firstAngle.value = opts.riso.inks[0].angle;
    $("look_dotGain").closest("label").hidden = group !== "halftone";
    allMethods.hidden =
      opts.studio.family !== "print" ||
      (opts.riso.enabled && o.inkStage === "integrated");
    const paletteTreatment =
      opts.studio.family === "print" ||
      (opts.studio.family === "screen" &&
        opts.studio.screenColour === "palette") ||
      (opts.studio.family === "characters" &&
        opts.studio.charColour === "palette");
    $("studio_paletteMode").disabled =
      integrated || opts.mapMode !== "off" || !paletteTreatment;
    $("analyseClipPalette").disabled = integrated;
    $("studio_gradientMid").closest("details").hidden =
      integrated || opts.mapMode === "off";
    for (const key of ["targetLow", "targetHigh"])
      $("look_" + key).closest("label").hidden = o.target !== "highlights";
    for (const key of ["satLow", "satHigh"])
      $("look_" + key).closest("label").hidden = o.target !== "saturated";
    for (const key of ["tolerance", "maskSoftness"])
      $("look_" + key).closest("label").hidden = o.target !== "picked";
    $("lookPickColour").parentElement.hidden = o.target !== "picked";
    $("lookPicked").hidden = o.target !== "picked";
    screenGlow.hidden = opts.studio.family !== "screen";
    $("studio_screenColour").closest("label").hidden =
      opts.studio.family !== "screen";
    for (const id of ["studio_charColour", "studio_background"])
      $(id).closest("label").hidden = opts.studio.family !== "characters";
    $("studio_ink").closest("label").hidden =
      opts.studio.family !== "characters" || opts.studio.charColour !== "mono";
    colourHint.textContent =
      opts.studio.family === "screen"
        ? "Choose original image colours or map the screen cells to your palette. Layered inks can then print over the result."
        : opts.studio.family === "characters"
          ? "Choose one ink, original image colours or the shared palette for your characters. Background applies when source transparency is off."
          : "The palette and gradient colour your treatment. Overlapping inks can add a further printed pass.";
    $("look_protectShadows").disabled = opts.studio.family !== "screen";
    for (const key of ["cellLow", "cellHigh", "glowLow", "glowHigh"])
      $("look_" + key).closest("label").hidden =
        opts.studio.family !== "screen";
    $("lookPicked").replaceChildren();
    for (const colour of o.picked) {
      const b = document.createElement("button");
      b.textContent = colour + " ×";
      b.style.borderLeft = "8px solid " + colour;
      b.onclick = () =>
        applyOpt({ picked: o.picked.filter((c) => c !== colour) });
      $("lookPicked").append(b);
    }
    open(current);
  };
  let picking = false;
  $("lookAddPick").onclick = () => {
    if (busy) return;
    const colour = $("lookPickColour").value;
    if (opts.studio.optics.picked.length >= 16)
      return toast("Keep up to 16 picked colours.");
    applyOpt({ picked: [...new Set([...opts.studio.optics.picked, colour])] });
  };
  $("lookPickOriginal").onclick = () => {
    picking = !picking;
    $("lookPickOriginal").textContent = picking
      ? "Picking · click Original"
      : "Pick from Original";
    $("viewMode").value = "original";
    drawOriginal(phase);
    syncCompare();
  };
  original.addEventListener(
    "pointerdown",
    (e) => {
      if (!picking) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const rect = original.getBoundingClientRect(),
        c = compose(phase),
        x = Math.min(
          c.width - 1,
          Math.max(
            0,
            Math.floor(((e.clientX - rect.left) / rect.width) * c.width),
          ),
        ),
        y = Math.min(
          c.height - 1,
          Math.max(
            0,
            Math.floor(((e.clientY - rect.top) / rect.height) * c.height),
          ),
        ),
        d = c.getContext("2d").getImageData(x, y, 1, 1).data;
      $("lookPickColour").value =
        "#" +
        Array.from(d.slice(0, 3))
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("");
      $("lookAddPick").click();
      picking = false;
      $("lookPickOriginal").textContent = "Pick from Original";
    },
    true,
  );
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && picking) {
      picking = false;
      $("lookPickOriginal").textContent = "Pick from Original";
    }
  });
  const baseOriginal = drawOriginal;
  drawOriginal = function (t = phase) {
    baseOriginal(t);
    if (!$("lookMaskPreview").checked) return;
    const c = compose(t),
      small = OImage(c, 320),
      weights = O.mask(small, opts.studio.optics),
      guide = makeCanvas(small.width, small.height),
      ctx = guide.getContext("2d"),
      data = ctx.createImageData(small.width, small.height);
    for (let i = 0; i < weights.length; i++)
      data.data.set([50, 220, 150, Math.round(weights[i] * 140)], i * 4);
    ctx.putImageData(data, 0, 0);
    original
      .getContext("2d")
      .drawImage(guide, 0, 0, original.width, original.height);
  };
  function OImage(c, edge = 720) {
    return DitherStudio.resized(pixelsOf(c), edge);
  }
  $("lookMaskPreview").onchange = () => {
    $("viewMode").value = "original";
    drawOriginal(phase);
    syncCompare();
  };
  async function paintDialog() {
    if (busy) return;
    pause();
    const owner = scene,
      ownerKey = renderSceneKey(),
      settings = copy(opts),
      at = phase,
      saved = copy(opts.studio.optics),
      stamps = copy(saved.paint),
      c = compose(phase),
      dlg = document.createElement("dialog");
    const previewSettings=copy(settings);previewSettings.studio.optics.maskEnabled=false;
    const preview = await callWorker({
        type: "render",
        source: pixelsOf(c),
        opts: {
          ...settings,
          studio: {
            ...settings.studio,
            optics: { ...saved, maskEnabled: false },
          },
        },
        phase: at,
        context: JagoDitherStudio.contextAt(at, previewSettings),
      }),
      previewCanvas = makeCanvas(1, 1);
    paintOutput(previewCanvas, preview, 1, at);
    if (
      scene !== owner ||
      renderSceneKey() !== ownerKey ||
      JSON.stringify(opts) !== JSON.stringify(settings)
    )
      throw Error(
        "The project changed while preparing the mask. Open it again.",
      );
    const source = OImage(previewCanvas);
    dlg.className = "look-mask-dialog";
    dlg.innerHTML =
      '<button class="close" aria-label="Cancel">×</button><h2>Paint the output selection</h2><p>Paint adds; Erase removes. The green guide is not exported. Apply makes one undo step.</p><div class="row"><label>Brush<select data-tool><option value="1">Paint</option><option value="-1">Erase</option></select></label><label>Size<input data-size type="range" min=".01" max=".3" step=".01" value=".08"></label><label>Softness<input data-soft type="range" min="0" max="1" step=".05" value=".5"></label></div><div class="look-mask-scroll"></div><div class="row"><button data-stroke-undo>Undo stroke</button><button data-clear>Clear mask</button><button data-apply class="primary">Apply mask</button><button data-cancel>Cancel</button></div>';
    const canvas = makeCanvas(source.width, source.height),
      ctx = canvas.getContext("2d");
    const strokeHistory=[];
    let lastStamp=null;
    const checkpoint=()=>{strokeHistory.push(copy(stamps));if(strokeHistory.length>24)strokeHistory.shift();};
    let drawing = false,
      pending = false;
    function draw() {
      pending = false;
      ctx.putImageData(
        new ImageData(source.data, source.width, source.height),
        0,
        0,
      );
      const weights = O.paintMask(source.width, source.height, stamps),
        data = ctx.createImageData(source.width, source.height);
      for (let i = 0; i < weights.length; i++)
        data.data.set([50, 220, 150, weights[i] * 150], i * 4);
      const overlay = makeCanvas(source.width, source.height);
      overlay.getContext("2d").putImageData(data, 0, 0);
      ctx.drawImage(overlay, 0, 0);
    }
    function stamp(e) {
      if (stamps.length >= 2048)
        return toast(
          "This mask has 2048 brush stamps. Clear it or apply the current mask.",
        );
      const rect = canvas.getBoundingClientRect();
      const point={x:Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width)),y:Math.max(0,Math.min(1,(e.clientY-rect.top)/rect.height))},r=+dlg.querySelector('[data-size]').value;
      const distance=lastStamp?Math.hypot((point.x-lastStamp.x)*source.width,(point.y-lastStamp.y)*source.height)/Math.min(source.width,source.height):0;
      const steps=lastStamp?Math.max(1,Math.ceil(distance/Math.max(.002,r*.35))):1;
      for(let n=1;n<=steps&&stamps.length<2048;n++)stamps.push({x:lastStamp?lastStamp.x+(point.x-lastStamp.x)*n/steps:point.x,y:lastStamp?lastStamp.y+(point.y-lastStamp.y)*n/steps:point.y,r,softness:+dlg.querySelector('[data-soft]').value,amount:+dlg.querySelector('[data-tool]').value});
      lastStamp=point;
      if (!pending) {
        pending = true;
        requestAnimationFrame(draw);
      }
    }
    canvas.onpointerdown = (e) => {
      if(e.button!==0)return;checkpoint();lastStamp=null;
      drawing = true;
      canvas.setPointerCapture(e.pointerId);
      stamp(e);
    };
    canvas.onpointermove = (e) => {
      if (drawing) stamp(e);
    };
    canvas.onpointerup = canvas.onpointercancel = () => {drawing=false;lastStamp=null;};
    dlg.querySelector(".look-mask-scroll").append(canvas);
    const close = () => {
      dlg.close();
      dlg.remove();
    };
    dlg.querySelector(".close").onclick = dlg.querySelector(
      "[data-cancel]",
    ).onclick = close;
    dlg.oncancel = (e) => {
      e.preventDefault();
      close();
    };
    dlg.querySelector("[data-stroke-undo]").onclick=()=>{const previous=strokeHistory.pop();if(previous){stamps.splice(0,stamps.length,...previous);lastStamp=null;draw();}};
    dlg.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="z"){e.preventDefault();e.stopPropagation();dlg.querySelector("[data-stroke-undo]").click();}});
    dlg.querySelector("[data-clear]").onclick = () => {
      checkpoint();stamps.length = 0;
      draw();
    };
    dlg.querySelector("[data-apply]").onclick = () =>
      safe(() => {
        if (
          scene !== owner ||
          renderSceneKey() !== ownerKey ||
          JSON.stringify(opts.studio.optics) !== JSON.stringify(saved)
        )
          throw Error("The project changed. Reopen the mask.");
        applyOpt({ paint: stamps, target: "painted", maskEnabled: true });
        $("lookMaskPreview").checked = false;
        $("viewMode").value = "result";
        syncCompare();
        close();
      });
    document.body.append(dlg);
    dlg.showModal();
    draw();
  }
  $("lookPaintMask").onclick = () => safe(paintDialog);
  const recipes = {
    colourOnly: {
      family: "screen",
      screenColumns: 96,
      screenGlow: 0.3,
      optics: {
        lightEnabled: true,
        protectShadows: true,
        maskEnabled: true,
        target: "saturated",
        satLow: 0.12,
        satHigh: 0.5,
      },
    },
    quiet: {
      family: "screen",
      method: "bayer4",
      screenColumns: 96,
      screenGlow: 0.35,
      optics: {
        lightEnabled: true,
        protectShadows: true,
        cellLow: 0.04,
        cellHigh: 0.22,
        glowLow: 0.12,
        glowHigh: 0.45,
      },
    },
    glass: {
      family: "screen",
      screenMask: "slots",
      screenGlow: 0.4,
      optics: {
        lensEnabled: true,
        lensType: "crt",
        lensAmount: 0.45,
        lightEnabled: true,
        protectShadows: true,
        finishEnabled: true,
        scanEnabled: true,
        scanStrength: 0.16,
      },
    },
    wide: {
      family: "print",
      method: "bayer4",
      optics: {
        printGroup: "dither",
        lensEnabled: true,
        lensType: "fisheye",
        lensAmount: 0.65,
      },
    },
    poster: {
      family: "print",
      method: "dots",
      cell: 2,
      optics: { printGroup: "halftone" },
    },
    combined: {
      family: "print",
      method: "atkinson",
      optics: {
        printGroup: "dither",
        textureEnabled: true,
        textureMethod: "lines",
        textureStrength: 0.3,
        textureSize: 8,
      },
    },
    terminal: {
      family: "characters",
      optics: {
        finishEnabled: true,
        scanEnabled: true,
        scanStrength: 0.25,
        scanSpacing: 3,
      },
    },
  };
  $("lookRecipe").onchange = () =>
    safe(() => {
      if (busy || !recipes[$("lookRecipe").value]) return;
      const r = recipes[$("lookRecipe").value],
        next = copy(opts);
      next.riso.enabled = false;
      next.method = r.method || next.method;
      next.cell = r.cell || next.cell;
      next.studio = {
        ...DitherStudio.defaults,
        ...Object.fromEntries(
          Object.entries(r).filter(
            ([k]) => !["method", "cell", "optics"].includes(k),
          ),
        ),
        optics: {
          ...O.defaults,
          ...r.optics,
          memory: copy(opts.studio.optics.memory),
        },
      };
      opts = Dither.settings(next);
      remember();
      sync();
      requestPrint();
      $("lookRecipe").value = "";
    });
  async function thumbnails() {
    const source = {
      width: 96,
      height: 64,
      data: new Uint8ClampedArray(96 * 64 * 4),
    };
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 96; x++) {
        const i = (y * 96 + x) * 4,
          v = Math.round(255 * (0.15 + (0.7 * x) / 96));
        source.data.set([v, v, v, 255], i);
      }
    for (const { canvas, method } of styleButtons) {
      const settings = Dither.settings({
        width: 320,
        method,
        cell: 2,
        palette: ["#223d4a", "#f9ecd1"],
      });
      const out = await callWorker({
          type: "render",
          source,
          opts: settings,
          phase: 0,
          context: {},
        }),
        full = makeCanvas(1, 1);
      paintOutput(full, out, 1);
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(full, 0, 0, canvas.width, canvas.height);
    }
  }
  window.JagoDitherLook = {
    open,
    apply: applyOpt,
    chooseFamily,
    groupOf,
    paintDialog,
    recipes,
  };
  sync();
  open("treat");
  safe(thumbnails);
})();
