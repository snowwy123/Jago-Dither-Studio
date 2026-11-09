// SPDX-License-Identifier: MIT
(() => {
  "use strict";
  const host = document.createElement("section");
  host.id = "seededDirections";
  host.innerHTML =
    '<h3>Explore directions</h3><p class="hint">Compare four treatments of the same artwork or the current clip frame. Applying keeps your layers, timing and output size.</p><label>Print family<select id="directionFamily"><option value="any">All treatment families</option><option value="classic">Classic dither & patterns</option><option value="riso">Layered ink prints</option><option value="screen">Luminous screens</option><option value="characters">Character art</option></select></label><details><summary>Repeat a comparison</summary><label>Treatment seed<input id="directionSeed" maxlength="64" value="jago-print-1"></label></details><div class="row"><label class="check"><input id="directionLockPalette" type="checkbox" checked> Keep colours</label><label class="check"><input id="directionLockTexture" type="checkbox"> Keep texture controls</label><label class="check"><input id="directionLockMotion" type="checkbox" checked> Keep motion</label></div><div class="row"><button id="directionSurprise" class="primary">Try another set</button><button id="directionGenerate">Compare this set</button><button id="directionVariations">Stay close to this look</button></div><p class="hint">Try another set explores fresh treatments. Compare this set repeats the current seed with the same settings and locks. Stay close to this look makes smaller changes. Locks take priority over the family choice.</p><label>Saved directions · this project<select id="directionSaved"><option value="">Choose a favourite…</option></select></label><div class="row"><button id="directionRestore">Apply saved</button><button id="directionRename">Rename…</button><button id="directionRemove">Remove</button></div>';
  document.querySelector('[data-panel="play"] section').prepend(host);
  const exploreLink = document.createElement("button");
  exploreLink.textContent = "Explore directions…";
  exploreLink.onclick = () => {
    showTab("play");
    window.JagoDitherExplore?.show("directions");
    $("directionSurprise").focus();
  };
  document.querySelector('[data-panel="print"] section').prepend(exploreLink);
  function bank() {
    return Array.isArray(scene.printDirections) ? scene.printDirections : [];
  }
  function syncBank() {
    const selected = $("directionSaved").value;
    $("directionSaved").replaceChildren(new Option("Choose a favourite…", ""));
    for (const item of bank())
      if (typeof item.name === "string" && typeof item.id === "string")
        $("directionSaved").append(new Option(item.name, item.id));
    $("directionSaved").value = selected;
  }
  let seedOwner = scene;
  const oldSync = sync;
  sync = function () {
    oldSync();
    if (scene !== seedOwner) {
      $("directionSeed").value = scene.exploreSeed || "jago-print-1";
      seedOwner = scene;
    }
    syncBank();
  };
  function locks() {
    return {
      palette: $("directionLockPalette").checked,
      texture: $("directionLockTexture").checked,
      motion: $("directionLockMotion").checked,
    };
  }
  async function compare(mode) {
    if (busy) throw Error("Wait for the current job first.");
    pause();
    const seed = $("directionSeed").value.trim() || "jago-print-1",
      family = $("directionFamily").value,
      keep = locks(),
      owner = scene,
      saved = copy(opts),
      input = pixelsOf(compose(phase)),
      at = phase;
    const dlg = document.createElement("dialog");
    dlg.className = "print-directions motion-directions";
    dlg.innerHTML =
      '<button class="close" aria-label="Close">×</button><h2>Choose a direction</h2><p>Same artwork, four possibilities. Nothing replaces your current print until you choose Apply. Previews begin at the current frame. Preview loop animates a short sampled comparison without changing your project.</p><div class="print-directions-grid"></div><p class="hint">Keep a favourite to return to it in this project. Use Play after applying to assess the whole loop.</p>';
    document.body.append(dlg);
    const timers = [];
    let closed = false;
    const close = () => {
      closed = true;
      timers.forEach(clearInterval);
      dlg.close();
      dlg.remove();
    };
    dlg.querySelector(".close").onclick = close;
    dlg.addEventListener("cancel", (e) => {
      e.preventDefault();
      close();
    });
    dlg.showModal();
    for (let n = 0; n < 4 && !closed; n++) {
      let candidate = DitherMotion.direction(
        saved,
        seed + ":" + mode + ":" + n,
        family,
        keep,
      );
      if (mode === "variations") {
        candidate.method = saved.method;
        candidate.studio = copy(saved.studio);
        candidate.riso.enabled = saved.riso.enabled;
        candidate.riso.screen = saved.riso.screen;
        if (!keep.texture) {
          const r = DitherMotion.random(seed + ":fine:" + n);
          if (candidate.studio.family === "screen") {
            candidate.studio.screenColumns = Math.max(
              12,
              Math.min(240, saved.studio.screenColumns + (n - 1) * 8),
            );
            candidate.studio.screenGlow = Math.max(
              0,
              Math.min(1, saved.studio.screenGlow + (r() - 0.5) * 0.2),
            );
          }
          if (candidate.studio.family === "characters") {
            candidate.studio.columns = Math.max(
              12,
              Math.min(160, saved.studio.columns + (n - 1) * 8),
            );
            candidate.studio.glyphScale = Math.max(
              0.4,
              Math.min(1.4, saved.studio.glyphScale + (r() - 0.5) * 0.15),
            );
          }
          candidate.cell = Math.max(1, Math.min(16, saved.cell + (n % 3) - 1));
          candidate.contrast = Math.max(
            -100,
            Math.min(100, saved.contrast + (r() - 0.5) * 12),
          );
        }
        if (!keep.palette && n % 2 === 0) {
          candidate.palette = copy(saved.palette);
          candidate.mapMode = saved.mapMode;
          candidate.mapColours = copy(saved.mapColours);
          candidate.riso.inks.forEach((ink, i) => {
            ink.colour = saved.riso.inks[i].colour;
            ink.enabled = saved.riso.inks[i].enabled;
          });
          candidate.riso.paper = saved.riso.paper;
        }
      }
      candidate = Dither.settings(candidate);
      const out = await callWorker({
        type: "render",
        source: input,
        opts: { ...candidate, width: 320 },
        phase: at,
      });
      if (closed || scene !== owner) break;
      const canvas = makeCanvas(1, 1);
      paintOutput(canvas, out, 1, at);
      const card = document.createElement("section"),
        name = document.createElement("input");
      name.value =
        (candidate.studio.family !== "print"
          ? candidate.studio.family
          : candidate.riso.enabled
            ? "Layered " + candidate.riso.screen
            : candidate.method) +
        " · " +
        (n + 1);
      name.maxLength = 60;
      name.setAttribute("aria-label", "Favourite name");
      const actions = document.createElement("div");
      actions.className = "row";
      const apply = document.createElement("button");
      apply.textContent = "Apply";
      apply.onclick = () => {
        if (scene !== owner) return close();
        opts = candidate;
        scene.exploreSeed = seed;
        remember();
        sync();
        requestPrint();
        close();
      };
      const save = document.createElement("button");
      save.textContent = "Keep favourite";
      save.onclick = () => {
        if (scene !== owner) return close();
        if (bank().length >= 8)
          return toast(
            "This project has eight saved directions. Remove one to keep another.",
          );
        scene.printDirections = [
          ...bank(),
          {
            id: uid(),
            name: name.value.trim() || "Print direction",
            seed,
            settings: copy(candidate),
          },
        ];
        remember();
        syncBank();
        save.disabled = true;
        save.textContent = "Kept";
      };
      actions.append(apply, save);
      card.append(canvas, name, actions);
      const animate = document.createElement("button");
      animate.textContent = "Preview loop";
      animate.onclick = () =>
        safe(async () => {
          if (closed) return;
          animate.disabled = true;
          animate.textContent = "Preparing loop…";
          const sourceScene = JSON.stringify(scene),
            cache = [];
          for (let f = 0; f < 8; f++) {
            if (
              closed ||
              scene !== owner ||
              JSON.stringify(scene) !== sourceScene
            )
              return;
            const t = f / 8,
              pixels = pixelsOf(compose(t)),
              ctx = window.JagoDitherStudio?.contextAt(t, candidate),
              frame = await callWorker({
                type: "render",
                source: pixels,
                opts: { ...candidate, width: 320 },
                phase: t,
                context: ctx,
              });
            if (closed) return;
            const c = makeCanvas(1, 1);
            paintOutput(c, frame, 1, t);
            cache.push(c);
          }
          animate.textContent = "Playing loop";
          let frame = 0,
            previewPaused = false;
          animate.disabled = false;
          animate.textContent = "Pause loop";
          animate.onclick = () => {
            previewPaused = !previewPaused;
            animate.textContent = previewPaused ? "Play loop" : "Pause loop";
          };
          const timer = setInterval(
            () => {
              if (closed || !dlg.open || scene !== owner) {
                clearInterval(timer);
                return;
              }
              if (!previewPaused)
                canvas
                  .getContext("2d")
                  .drawImage(cache[frame++ % cache.length], 0, 0);
            },
            Math.max(80, (candidate.seconds * 1000) / 8),
          );
          timers.push(timer);
        });
      actions.append(animate);
      dlg.querySelector(".print-directions-grid").append(card);
    }
    if (!closed && scene !== owner) close();
  }
  $("directionSurprise").onclick = () =>
    safe(() => {
      $("directionSeed").value = String(
        crypto.getRandomValues(new Uint32Array(1))[0],
      );
      return compare("directions");
    });
  $("directionGenerate").onclick = () => safe(() => compare("directions"));
  $("directionVariations").onclick = () => safe(() => compare("variations"));
  $("directionRestore").onclick = () =>
    safe(() => {
      if (busy) return;
      const item = bank().find((i) => i.id === $("directionSaved").value);
      if (!item) return toast("Choose a saved direction first.");
      const candidate = Dither.settings(item.settings);
      opts = {
        ...candidate,
        width: opts.width,
        seconds: opts.seconds,
        fps: opts.fps,
        transparent: opts.transparent,
      };
      remember();
      sync();
      requestPrint();
      toast(
        "Saved print direction applied. Undo returns to your previous print.",
      );
    });
  $("directionRemove").onclick = () => {
    if (busy || !$("directionSaved").value) return;
    scene.printDirections = bank().filter(
      (i) => i.id !== $("directionSaved").value,
    );
    remember();
    syncBank();
  };
  $("directionRename").onclick = () => {
    const item = bank().find((i) => i.id === $("directionSaved").value);
    if (!item || busy) return;
    const dlg = document.createElement("dialog"),
      name = document.createElement("input"),
      save = document.createElement("button");
    name.value = item.name;
    name.maxLength = 60;
    save.textContent = "Save name";
    save.onclick = () => {
      item.name = name.value.trim() || item.name;
      remember();
      syncBank();
      dlg.close();
      dlg.remove();
    };
    dlg.append(document.createTextNode("Rename saved direction"), name, save);
    dlg.addEventListener("cancel", () => dlg.remove());
    document.body.append(dlg);
    dlg.showModal();
    name.focus();
  };
  window.JagoDitherDirections = { compare, bank, syncBank };
  syncBank();
})();
