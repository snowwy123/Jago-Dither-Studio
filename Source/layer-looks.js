// SPDX-License-Identifier: MIT
(function () {
  "use strict";
  const Model = DitherLayerLookModel,
    baseCall = callWorker;
  const eligible = (l) => l && !(l.kind === "overlay" && l.stage === "after");
  const active = () => Model.active(scene.layers);
  const moving = () =>
    scene.layers.some(
      (l) =>
        eligible(l) &&
        l.visible &&
        l.opacity &&
        l.look?.mode === "custom" &&
        Model.animated(l.look.settings),
    );
  function sampled(t, layers, paper, width) {
    const full = compose(t, { layers, paper });
    if (full.width === width) return pixelsOf(full);
    const c = makeCanvas(
      width,
      Math.max(1, Math.round((full.height * width) / full.width)),
    );
    c.getContext("2d").drawImage(full, 0, 0, c.width, c.height);
    return pixelsOf(c);
  }
  function capture(t, settings) {
    const groups = Model.groups(scene.layers, scene.clear);
    if (!groups) return null;
    let pixels = 0;
    return groups.map((group) => {
      const own = group.mode === "custom" ? group.settings : settings;
      const local = Dither.settings({
        ...copy(own),
        width: settings.width,
        seconds: settings.seconds,
        fps: settings.fps,
        transparent: !group.paper || settings.transparent,
      });
      const layers =
        group.mode === "inherit" && !group.isolated
          ? group.layers
          : group.layers.map((l) => ({
              ...l,
              opacity: 100,
              blend: "source-over",
            }));
      const sample = (at) => {
        const p = sampled(at, layers, group.paper, settings.width);
        pixels += p.width * p.height;
        if (pixels > 24000000)
          throw Error(
            "Many independent layer passes are active. Lower Render resolution to 720 or 480.",
          );
        return p;
      };
      const source = sample(t),
        context = {};
      if (group.mode !== "original") {
        const s = local.studio,
          dt = 1 / Math.max(1, Math.round(local.seconds * local.fps));
        if (s.temporalBlend)
          context.previousSource = sample(Math.max(0, t - dt));
        if (s.seamBlend) context.seamSource = sample(0);
        if (
          s.optics.finishEnabled &&
          s.optics.trailsEnabled &&
          s.optics.trails
        ) {
          context.trailPhase = (((t - dt) % 1) + 1) % 1;
          context.trailSource = sample(context.trailPhase);
        }
      }
      return {
        mode: group.mode,
        paper: group.paper,
        source,
        opts: local,
        context,
        opacity: group.opacity ?? 100,
        blend: group.blend || "source-over",
      };
    });
  }
  const oldContext = JagoDitherStudio.contextAt;
  JagoDitherStudio.contextAt = function (t, settings) {
    return { ...oldContext(t, settings), layerPlan: capture(t, settings) };
  };
  async function renderPlan(plan, t) {
    const w = plan[0].source.width,
      h = plan[0].source.height,
      c = makeCanvas(w, h),
      g = c.getContext("2d");
    for (const entry of plan) {
      const layer = makeCanvas(w, h);
      if (entry.mode === "original")
        layer
          .getContext("2d")
          .putImageData(
            new ImageData(new Uint8ClampedArray(entry.source.data), w, h),
            0,
            0,
          );
      else {
        const out = await baseCall({
          type: "render",
          source: entry.source,
          opts: entry.opts,
          phase: t,
          context: entry.context,
        });
        paintOutput(layer, out, 1);
      }
      g.globalAlpha = entry.opacity / 100;
      g.globalCompositeOperation = entry.blend;
      g.drawImage(layer, 0, 0, w, h);
    }
    const data = g.getImageData(0, 0, w, h).data;
    return {
      data,
      width: w,
      height: h,
      outputWidth: w,
      outputHeight: h,
      scoped: true,
      layerPasses: plan.length,
      transparent: true,
    };
  }
  callWorker = async function (data) {
    if (data.type !== "render" || data.flatLayers) return baseCall(data);
    const hasPlan = data.context && Object.hasOwn(data.context, "layerPlan");
    const plan = hasPlan
      ? data.context.layerPlan
      : active() &&
          data.source?.width === scene.width &&
          data.source?.height === scene.height
        ? capture(data.phase || 0, data.opts)
        : null;
    if (plan) return renderPlan(plan, data.phase || 0);
    if (hasPlan) {
      const context = { ...data.context };
      delete context.layerPlan;
      return baseCall({ ...data, context });
    }
    return baseCall(data);
  };
  const box = document.createElement("section");
  box.className = "layer-look-tools";
  box.innerHTML =
    '<h3>Look for this layer</h3><label>Effect scope<select id="layerLookMode"><option value="inherit">Follow whole look</option><option value="original">Keep original colours · no treatment</option><option value="custom">Use own look…</option></select></label><button id="editLayerLook">Edit layer look…</button><p id="layerLookNote" class="hint"></p>';
  $("layerSettings").prepend(box);
  const scope = document.createElement("p");
  scope.className = "layer-look-scope";
  scope.innerHTML =
    '<strong>Whole look · defaults for following layers</strong><button id="layerLooksJump" class="tiny">Looks per layer →</button>';
  $("lookDock").after(scope);
  $("layerLooksJump").onclick = () => {
    showTab("layers");
    box.scrollIntoView({ block: "nearest" });
  };
  function syncTools() {
    const l = selectedLayer(),
      ok = eligible(l);
    box.hidden = !l;
    $("layerLookMode").disabled = !ok || busy;
    $("editLayerLook").disabled = !ok || busy;
    if (document.activeElement !== $("layerLookMode"))
      $("layerLookMode").value = l?.look?.mode || "inherit";
    $("layerLookNote").textContent = !ok
      ? "This overlay is already placed after the print treatment."
      : l?.look?.mode === "custom"
        ? "Independent settings. Transform, opacity and blend still belong to this layer."
        : l?.look?.mode === "original"
          ? "This layer keeps its source colours in its place in the stack."
          : "Uses the main Look controls. Adjacent following layers are treated together.";
    document.querySelectorAll("#layerList .layer-row").forEach((row, i) => {
      const layer = [...scene.layers].reverse()[i],
        small = row.querySelector("small");
      if (small) {
        small.textContent = small.textContent.replace(
          / · (Own look|Original colours)/g,
          "",
        );
        if (layer?.look && layer.look.mode !== "inherit")
          small.textContent +=
            " · " +
            (layer.look.mode === "custom" ? "Own look" : "Original colours");
      }
    });
  }
  const oldSyncLayers = syncLayers;
  syncLayers = function () {
    oldSyncLayers();
    syncTools();
  };
  function setMode(mode) {
    if (busy) return;
    const l = selectedLayer();
    if (!eligible(l)) return;
    if (mode === "custom") return edit(l);
    l.look = { mode };
    changedLayer();
  }
  $("layerLookMode").onchange = () =>
    safe(() => setMode($("layerLookMode").value));
  $("editLayerLook").onclick = () => safe(() => edit(selectedLayer()));
  async function edit(l) {
    if (!eligible(l) || busy) return;
    pause();
    const owner = scene,
      id = l.id,
      before = JSON.stringify(l.look),
      ownerKey = renderSceneKey(),
      at = phase;
    let valid = true,
      local = Dither.settings(
        copy(l.look?.mode === "custom" ? l.look.settings : opts),
      ),
      generation = 0,
      closed = false,
      scheduled = false,
      working = false,
      needsPreview = false;
    const dlg = document.createElement("dialog");
    dlg.className = "layer-look-dialog";
    dlg.innerHTML =
      '<header><div><h2>Own look</h2><p class="layer-look-name"></p></div><button data-close aria-label="Close layer look">×</button></header><div class="layer-look-body"><div class="layer-look-preview"><canvas aria-label="Selected layer preview"></canvas><p class="hint">Selected layer only · transparent areas shown on a checkerboard</p><p data-error role="status"></p></div><div class="layer-look-fields"><nav aria-label="Layer look sections"></nav></div></div><footer><button data-copy>Start from whole look</button><button data-cancel>Cancel</button><button data-apply class="primary">Apply to this layer</button></footer>';
    dlg.querySelector(".layer-look-name").textContent = l.name;
    const fields = dlg.querySelector(".layer-look-fields"),
      nav = fields.querySelector("nav");
    const panels = {};
    for (const name of ["Treatment", "Colour", "Light", "Lens", "Finish"]) {
      const b = document.createElement("button");
      b.textContent = name;
      b.type = "button";
      b.dataset.page = name;
      nav.append(b);
      const s = document.createElement("section");
      s.hidden = name !== "Treatment";
      panels[name] = s;
      fields.append(s);
      b.onclick = () => {
        for (const [key, p] of Object.entries(panels)) p.hidden = key !== name;
        nav
          .querySelectorAll("button")
          .forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      };
      b.setAttribute("aria-pressed", String(name === "Treatment"));
    }
    const bindings = [];
    const get = (obj, path) => path.split(".").reduce((a, k) => a[k], obj);
    function put(path, value) {
      const next = copy(local),
        keys = path.split("."),
        last = keys.pop();
      let target = next;
      for (const key of keys) target = target[key];
      target[last] = value;
      try {
        local = Dither.settings(next);
        valid = true;
        dlg.querySelector("[data-apply]").disabled = false;
        dlg.querySelector("[data-error]").textContent = "";
        refresh();
        queue();
      } catch (e) {
        valid = false;
        dlg.querySelector("[data-apply]").disabled = true;
        dlg.querySelector("[data-error]").textContent = e.message;
      }
    }
    function control(page, label, path, type, options, min, max, step) {
      const row = document.createElement("label");
      row.textContent = label;
      const el = document.createElement(type === "select" ? "select" : "input");
      el.dataset.setting = path;
      if (type === "select")
        for (const [v, t] of options) el.add(new Option(t, v));
      else {
        el.type = type;
        if (min !== undefined) {
          el.min = min;
          el.max = max;
          el.step = step;
        }
      }
      row.append(el);
      const output = document.createElement("output");
      if (type === "range") row.append(output);
      panels[page].append(row);
      bindings.push({ el, path, output });
      el.addEventListener(
        type === "range" || type === "color" ? "input" : "change",
        () =>
          put(
            path,
            type === "checkbox"
              ? el.checked
              : ["number", "range"].includes(type)
                ? +el.value
                : el.value,
          ),
      );
      return row;
    }
    const select = (p, n, k, vs) =>
      control(
        p,
        n,
        k,
        "select",
        vs.map((v) => (Array.isArray(v) ? v : [v, v])),
      );
    const range = (p, n, k, a, b, s) =>
      control(p, n, k, "range", null, a, b, s);
    const tick = (p, n, k) => control(p, n, k, "checkbox");
    select("Treatment", "Main treatment", "studio.family", [
      ["print", "Dither / halftone"],
      ["screen", "Luminous screen"],
      ["characters", "Characters"],
    ]);
    select(
      "Treatment",
      "Dither / halftone method",
      "method",
      Dither.methods.map((v) => [v, methodHints[v]?.split(".")[0] || v]),
    );
    range("Treatment", "Pattern cell size", "cell", 1, 24, 1);
    range("Treatment", "Halftone pattern size", "patternScale", 0.5, 6, 0.05);
    range("Treatment", "Pattern angle", "patternAngle", -180, 180, 1);
    range("Treatment", "Screen columns", "studio.screenColumns", 12, 240, 1);
    select("Treatment", "Screen cells", "studio.screenMask", [
      "rgb",
      "bgr",
      "dots",
      "slots",
    ]);
    range("Treatment", "Cell gap", "studio.screenGap", 0, 0.8, 0.01);
    range("Treatment", "Screen brightness", "studio.screenGain", 0.5, 6, 0.1);
    range("Treatment", "Character columns", "studio.columns", 12, 160, 1);
    range("Treatment", "Character size", "studio.glyphScale", 0.4, 1.4, 0.02);
    control("Treatment", "Character set", "studio.charset", "text");
    range("Colour", "Brightness", "brightness", -100, 100, 1);
    range("Colour", "Contrast", "contrast", -90, 100, 1);
    range("Colour", "Gamma", "gamma", 0.25, 3, 0.05);
    range("Colour", "Saturation", "saturation", 0, 200, 1);
    const pal = document.createElement("label");
    pal.textContent = "Palette · 2–8 hex colours, separated by spaces";
    const inkInput = document.createElement("input");
    inkInput.dataset.palette = "";
    pal.append(inkInput);
    panels.Colour.append(pal);
    inkInput.onchange = () => {
      try {
        local = Dither.settings({
          ...local,
          palette: inkInput.value.trim().split(/[\s,]+/),
        });
        valid = true;
        dlg.querySelector("[data-apply]").disabled = false;
        dlg.querySelector("[data-error]").textContent = "";
        queue();
      } catch (e) {
        valid = false;
        dlg.querySelector("[data-apply]").disabled = true;
        dlg.querySelector("[data-error]").textContent = e.message;
      }
    };
    select("Colour", "Screen colour", "studio.screenColour", [
      "source",
      "palette",
    ]);
    select("Colour", "Character colour", "studio.charColour", [
      "mono",
      "source",
      "palette",
    ]);
    control("Colour", "Character ink", "studio.ink", "color");
    control("Colour", "Character background", "studio.background", "color");
    tick("Colour", "Layered inks", "riso.enabled");
    select("Colour", "Ink placement", "studio.optics.inkStage", [
      ["integrated", "Integrated print"],
      ["after", "After treatment"],
    ]);
    for (let n = 0; n < 3; n++) {
      tick("Colour", "Use ink " + (n + 1), "riso.inks." + n + ".enabled");
      control(
        "Colour",
        "Ink " + (n + 1) + " colour",
        "riso.inks." + n + ".colour",
        "color",
      );
    }
    range("Light", "Screen glow", "studio.screenGlow", 0, 1, 0.01);
    tick("Light", "Protect dark areas", "studio.optics.protectShadows");
    tick("Light", "Highlight halation", "studio.optics.halationEnabled");
    range("Light", "Halo strength", "studio.optics.halation", 0, 1, 0.01);
    control("Light", "Halo tint", "studio.optics.halationTint", "color");
    tick("Lens", "Enable lens", "studio.optics.lensEnabled");
    select("Lens", "Lens style", "studio.optics.lensType", [
      "crt",
      "fisheye",
      "barrel",
      "pincushion",
    ]);
    range("Lens", "Lens strength", "studio.optics.lensAmount", 0, 1, 0.01);
    select("Lens", "Apply lens to", "studio.optics.lensStage", [
      ["source", "Source artwork"],
      ["screen", "Finished screen"],
    ]);
    tick("Lens", "Automatically fill frame", "studio.optics.lensAutoFrame");
    tick("Finish", "Additional texture", "studio.optics.textureEnabled");
    select("Finish", "Texture", "studio.optics.textureMethod", [
      "dots",
      "ellipses",
      "lines",
      "crosshatch",
      "diamonds",
      "grain",
    ]);
    range(
      "Finish",
      "Texture strength",
      "studio.optics.textureStrength",
      0,
      1,
      0.01,
    );
    tick("Finish", "Scanlines", "studio.optics.scanEnabled");
    range(
      "Finish",
      "Scanline strength",
      "studio.optics.scanStrength",
      0,
      1,
      0.01,
    );
    tick("Finish", "Rolling scanlines", "studio.optics.scanRoll");
    tick("Finish", "Colour fringe", "studio.optics.fringeEnabled");
    range("Finish", "Fringe width", "studio.optics.fringe", 0, 12, 0.1);
    tick("Finish", "Phosphor trail", "studio.optics.trailsEnabled");
    range("Finish", "Trail strength", "studio.optics.trails", 0, 1, 0.01);
    tick("Finish", "Vignette", "studio.optics.vignetteEnabled");
    tick("Treatment", "Enable treatment", "studio.optics.treatmentEnabled");
    select("Treatment", "Warp", "studio.warp", [
      "off",
      "wave",
      "swirl",
      "mirror",
      "pinch",
    ]);
    range("Treatment", "Warp strength", "studio.warpAmount", 0, 100, 1);
    tick("Treatment", "Animate warp", "studio.warpAnimate");
    tick("Light", "Enable light stage", "studio.optics.lightEnabled");
    tick("Finish", "Enable finish stage", "studio.optics.finishEnabled");
    const clean = [{ ...copy(l), opacity: 100, blend: "source-over" }],
      source = sampled(at, clean, false, Math.min(opts.width, 720)),
      prev = sampled(
        (((at - 1 / (opts.seconds * opts.fps)) % 1) + 1) % 1,
        clean,
        false,
        Math.min(opts.width, 720),
      ),
      seam = sampled(0, clean, false, Math.min(opts.width, 720)),
      preview = dlg.querySelector("canvas");
    preview.width = source.width;
    preview.height = source.height;
    preview
      .getContext("2d")
      .putImageData(
        new ImageData(source.data, source.width, source.height),
        0,
        0,
      );
    function refresh() {
      for (const { el, path, output } of bindings) {
        const v = get(local, path);
        el.closest("label").hidden =
          path.startsWith("studio.screen") ||
          path === "studio.optics.protectShadows"
            ? local.studio.family !== "screen"
            : path === "studio.charset" ||
                path === "studio.columns" ||
                path === "studio.glyphScale" ||
                [
                  "studio.charColour",
                  "studio.ink",
                  "studio.background",
                ].includes(path)
              ? local.studio.family !== "characters"
              : ["method", "cell", "patternScale", "patternAngle"].includes(
                    path,
                  )
                ? local.studio.family !== "print"
                : false;
        if (document.activeElement !== el) {
          if (el.type === "checkbox") el.checked = v;
          else el.value = v;
        }
        output.textContent = el.type === "range" ? v : "";
      }
      if (document.activeElement !== inkInput)
        inkInput.value = local.palette.join(" ");
    }
    async function run() {
      if (working || closed) return;
      scheduled = false;
      working = true;
      needsPreview = false;
      const token = ++generation;
      try {
        if (scene !== owner)
          throw Error("The project changed. Reopen the layer look.");
        const settings = Dither.settings({
            ...local,
            width: Math.min(
              opts.width,
              local.studio.family === "screen" ? 720 : 480,
            ),
            seconds: opts.seconds,
            fps: opts.fps,
            transparent: true,
          }),
          context = {
            previousSource: prev,
            trailSource: prev,
            trailPhase: (((at - 1 / (opts.seconds * opts.fps)) % 1) + 1) % 1,
            seamSource: seam,
          };
        const out = await baseCall({
          type: "render",
          source,
          opts: settings,
          phase: at,
          context,
        });
        if (!closed && token === generation) {
          paintOutput(preview, out, 1);
          preview.dataset.ready = "true";
        }
      } catch (e) {
        if (!closed) dlg.querySelector("[data-error]").textContent = e.message;
      } finally {
        working = false;
        if (needsPreview && !closed) queue();
      }
    }
    function queue() {
      needsPreview = true;
      if (!scheduled && !working) {
        scheduled = true;
        requestAnimationFrame(run);
      }
    }
    function close() {
      closed = true;
      generation++;
      dlg.close();
      dlg.remove();
      syncTools();
    }
    dlg.querySelector("[data-close]").onclick = dlg.querySelector(
      "[data-cancel]",
    ).onclick = close;
    dlg.oncancel = (e) => {
      e.preventDefault();
      close();
    };
    dlg.querySelector("[data-copy]").onclick = () => {
      local = copy(opts);
      valid = true;
      dlg.querySelector("[data-apply]").disabled = false;
      dlg.querySelector("[data-error]").textContent = "";
      refresh();
      queue();
    };
    dlg.querySelector("[data-apply]").onclick = () =>
      safe(() => {
        if (!valid) return;
        if (
          scene !== owner ||
          renderSceneKey() !== ownerKey ||
          JSON.stringify(l.look) !== before ||
          !scene.layers.some((x) => x.id === id)
        )
          throw Error("The project changed. Reopen the layer look.");
        l.look = { mode: "custom", settings: Dither.settings(local) };
        close();
        changedLayer();
      });
    document.body.append(dlg);
    refresh();
    dlg.showModal();
    queue();
  }
  window.JagoDitherLayers = {
    active,
    moving,
    capture,
    renderPlan,
    setMode,
    edit,
  };
  syncTools();
})();
