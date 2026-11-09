// SPDX-License-Identifier: MIT
(function () {
  "use strict";
  const panel = document.querySelector('[data-panel="play"]'),
    oldSource = panel.querySelector("section"),
    directions = $("seededDirections"),
    looks = [...panel.children].filter((x) => x !== oldSource);
  const tabs = document.createElement("nav");
  tabs.className = "explore-pages";
  tabs.setAttribute("aria-label", "Explore sections");
  const examples = document.createElement("section");
  examples.id = "exploreExamples";
  examples.innerHTML =
    '<h2>Examples</h2><p>Original artwork, complete looks and moving projects—all in one gallery.</p><button id="browseExamples" class="primary">Browse examples…</button><p class="hint">20 examples · includes AFTER HOURS and Live Looks · works offline</p>';
  examples.querySelector(".hint").textContent =
    ditherExamples.length +
    " examples · includes AFTER HOURS and Live Looks · works offline";
  const dirPage = document.createElement("section");
  dirPage.id = "exploreDirections";
  dirPage.append(directions);
  const lookPage = document.createElement("div");
  lookPage.id = "exploreLooks";
  lookPage.append(...looks);
  lookPage.querySelector("h2").textContent = "Looks for your artwork";
  oldSource.remove();
  panel.replaceChildren(tabs, examples, lookPage, dirPage);
  const pages = { examples, looks: lookPage, directions: dirPage };
  let selected = "examples";
  function show(name) {
    selected = name;
    for (const [key, page] of Object.entries(pages)) page.hidden = key !== name;
    for (const b of tabs.children)
      b.setAttribute("aria-selected", String(b.dataset.explorePage === name));
  }
  for (const [key, name] of [
    ["examples", "Examples"],
    ["looks", "Looks & recipes"],
    ["directions", "Your directions"],
  ]) {
    const b = document.createElement("button");
    b.textContent = name;
    b.dataset.explorePage = key;
    b.id = "exploreTab-" + key;
    b.setAttribute("aria-controls", pages[key].id);
    pages[key].setAttribute("role", "tabpanel");
    pages[key].setAttribute("aria-labelledby", b.id);
    b.setAttribute("role", "tab");
    b.onclick = () => show(key);
    tabs.append(b);
  }
  tabs.setAttribute("role", "tablist");
  let currentDialog = null;
  let bankPromise = null;
  const unpack = async (value) =>
    new Response(
      new Blob([Uint8Array.from(atob(value), (c) => c.charCodeAt(0))])
        .stream()
        .pipeThrough(new DecompressionStream("gzip")),
    ).json();
  async function projectFor(item) {
    bankPromise ??= unpack(ditherExampleAssetsGzip);
    const bank = await bankPromise,
      doc = await unpack(item.projectGzip);
    for (const [id, key] of Object.entries(doc.assets)) {
      const value = bank[key];
      if (!value) throw Error("An example image is missing.");
      doc.assets[id] =
        typeof value === "string"
          ? value
          : starterArt[value.study].frames[value.frame];
    }
    return doc;
  }
  function open(filter = "all") {
    if (busy)
      return toast("Finish the current export before browsing examples.");
    showTab("play");
    show("examples");
    if (currentDialog) {
      currentDialog.querySelector("[data-motion]").value = filter;
      currentDialog.dispatchEvent(new Event("gallery-filter"));
      return;
    }
    const dlg = document.createElement("dialog");
    currentDialog = dlg;
    dlg.className = "example-gallery";
    dlg.innerHTML =
      '<header><div><h2>Examples</h2><p>Choose a project to explore. Your previous work remains available through Undo.</p></div><button data-close aria-label="Close examples">×</button></header><div class="example-filters"><label>Find<input data-search type="search" placeholder="Chrome, halftone, letters…"></label><label>Motion<select data-motion><option value="all">Still & moving</option><option value="still">Still</option><option value="moving">Moving</option></select></label><label>Collection<select data-group><option value="all">All collections</option></select></label><output data-count aria-live="polite"></output></div><p class="hint">Complete projects include their effects. Wobble source drawings keep your current look. Save your work first if you want a separate file.</p><p data-status role="status"></p><div class="example-grid"></div>';
    const grid = dlg.querySelector(".example-grid"),
      motion = dlg.querySelector("[data-motion]"),
      group = dlg.querySelector("[data-group]"),
      search = dlg.querySelector("[data-search]");
    motion.value = filter;
    for (const name of [...new Set(ditherExamples.map((x) => x.group))])
      group.add(new Option(name, name));
    let opening = false;
    function close() {
      if (opening) return;
      dlg.close();
      dlg.remove();
      currentDialog = null;
      $("browseExamples").focus();
    }
    dlg.querySelector("[data-close]").onclick = close;
    dlg.oncancel = (e) => {
      e.preventDefault();
      close();
    };
    function refresh() {
      const needle = search.value.trim().toLowerCase();
      let visible = 0;
      for (const card of grid.children) {
        const item = ditherExamples.find((x) => x.id === card.dataset.example);
        card.hidden =
          (motion.value !== "all" &&
            (item.moving ? "moving" : "still") !== motion.value) ||
          (group.value !== "all" && item.group !== group.value) ||
          !(item.name + " " + item.description + " " + item.group)
            .toLowerCase()
            .includes(needle);
        if (!card.hidden) visible++;
      }
      dlg.querySelector("[data-count]").textContent =
        visible + " of " + ditherExamples.length;
    }
    for (const input of [motion, group, search])
      input.addEventListener(input === search ? "input" : "change", refresh);
    dlg.addEventListener("gallery-filter", refresh);
    for (const item of ditherExamples) {
      const card = document.createElement("article");
      card.dataset.example = item.id;
      const img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      img.src =
        item.thumbnail ||
        "data:image/svg+xml," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#19303a"/></svg>',
          );
      const title = document.createElement("h3");
      title.textContent = item.name;
      const meta = document.createElement("small");
      meta.textContent =
        (item.moving ? "Moving" : "Still") +
        " · " +
        (item.study ? "Source drawing" : "Complete project");
      const desc = document.createElement("p");
      desc.textContent = item.description;
      const button = document.createElement("button");
      button.textContent = item.study ? "Use source drawing" : "Open project";
      button.dataset.openExample = item.id;
      button.onclick = () =>
        safe(async () => {
          if (opening || busy) return;
          opening = true;
          dlg.querySelectorAll("button").forEach((b) => (b.disabled = true));
          dlg.querySelector("[data-status]").textContent =
            "Opening " + item.name + "…";
          try {
            if (item.study) await loadStudy(item.study);
            else {
              const doc = await projectFor(item);
              await readProject(
                new File([JSON.stringify(doc)], item.id + ".jagodither", {
                  type: "application/json",
                }),
              );
            }
            opening = false;
            close();
            showTab(window.JagoDitherLayers?.active() ? "layers" : "print");
            toast(item.name + " ready. Undo returns to your previous work.");
          } catch (e) {
            opening = false;
            dlg.querySelectorAll("button").forEach((b) => (b.disabled = false));
            dlg.querySelector("[data-status]").textContent = e.message;
          }
        });
      card.append(img, title, meta, desc, button);
      grid.append(card);
    }
    document.body.append(dlg);
    refresh();
    dlg.showModal();
  }
  $("browseExamples").onclick = () => open();
  const moving = document
    .querySelector("#lookAllMethods")
    ?.parentElement?.querySelectorAll("button");
  for (const b of moving || [])
    if (b.textContent === "Load an editable moving study") {
      b.textContent = "Explore examples →";
      b.onclick = () => open();
    }
  $("motionDemo").textContent = "Browse moving examples…";
  $("motionDemo").onclick = () => open("moving");
  window.JagoDitherExplore = {
    show,
    open,
    examples: ditherExamples.map(({ id, name, moving, group, study }) => ({
      id,
      name,
      moving,
      group,
      study,
    })),
  };
  if(window.JagoSuite?.adapter)JagoSuite.adapter.openExamples=()=>open();
  show(selected);
})();
