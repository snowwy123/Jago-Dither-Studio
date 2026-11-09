// SPDX-License-Identifier: MIT
(function () {
  "use strict";
  const controls = document.createElement("span");
  controls.className = "comparison-tools";
  controls.innerHTML =
    '<button id="quickCompare" class="tiny" aria-pressed="false">Compare ↔</button><button id="detailCompare" class="tiny">Inspect detail…</button>';
  $("viewMode").after(controls);
  const labels = document.createElement("div");
  labels.className = "comparison-labels";
  labels.hidden = true;
  labels.innerHTML = "<span>Original</span><span>Print</span>";
  $("paper").append(labels);
  const oldCompare = syncCompare;
  syncCompare = function () {
    oldCompare();
    const split = $("viewMode").value === "split";
    labels.hidden = !split;
    $("quickCompare").setAttribute("aria-pressed", String(split));
  };
  $("quickCompare").onclick = () => {
    $("viewMode").value = $("viewMode").value === "split" ? "result" : "split";
    syncCompare();
  };
  let point = { x: 0.5, y: 0.5 };
  $("paper").addEventListener("pointermove", (e) => {
    const r = $("paper").getBoundingClientRect();
    point = {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  });
  function inspect() {
    if (busy || rendering || pending)
      return toast("Let the current print finish, then inspect its detail.");
    if (!result.width || !sourceCanvas) return;
    pause();
    const before = makeCanvas(result.width, result.height),
      after = makeCanvas(result.width, result.height);
    before
      .getContext("2d")
      .drawImage(sourceCanvas, 0, 0, before.width, before.height);
    paintAfterOverlays(before, phase);
    after.getContext("2d").drawImage(result, 0, 0);
    const dlg = document.createElement("dialog");
    dlg.className = "detail-dialog";
    dlg.innerHTML =
      '<header><h2>Inspect detail</h2><button data-close aria-label="Close detail view">×</button></header><p>Matching output pixels. Drag either image to move both; use arrow keys for precise steps.</p><div class="detail-controls"><label>Magnification <select data-zoom><option value="1">100% · one output pixel</option><option value="2" selected>200%</option><option value="4">400%</option><option value="8">800%</option></select></label><button data-centre>Centre</button><output data-position></output></div><div class="detail-pair"><figure><figcaption>Original · scaled to print dimensions</figcaption><canvas width="400" height="400" tabindex="0" aria-label="Original detail. Drag or use arrow keys to pan."></canvas></figure><figure><figcaption>Print · exact exported pixels</figcaption><canvas width="400" height="400" tabindex="0" aria-label="Print detail. Drag or use arrow keys to pan."></canvas></figure></div><p class="hint">This comparison is a paused snapshot. It does not alter artwork, masks or exports.</p>';
    let x = Math.round(point.x * (result.width - 1)),
      y = Math.round(point.y * (result.height - 1)),
      zoom = 2,
      drag = null;
    const canvases = [...dlg.querySelectorAll("canvas")];
    function draw() {
      x = Math.max(0, Math.min(before.width - 1, x));
      y = Math.max(0, Math.min(before.height - 1, y));
      for (let i = 0; i < 2; i++) {
        const c = canvases[i],
          size = Math.max(
            80,
            Math.round(c.getBoundingClientRect().width || 400),
          );
        if (c.width !== size) {
          c.width = size;
          c.height = size;
        }
        const g = c.getContext("2d"),
          source = i ? after : before;
        g.clearRect(0, 0, c.width, c.height);
        g.imageSmoothingEnabled = false;
        g.drawImage(
          source,
          c.width / 2 - x * zoom,
          c.height / 2 - y * zoom,
          source.width * zoom,
          source.height * zoom,
        );
        g.strokeStyle = "#ffffff99";
        g.lineWidth = 1;
        g.strokeRect(c.width / 2 - 0.5, c.height / 2 - 0.5, zoom, zoom);
      }
      dlg.querySelector("[data-position]").textContent =
        "Pixel " +
        Math.round(x) +
        ", " +
        Math.round(y) +
        " · " +
        before.width +
        " × " +
        before.height;
    }
    for (const c of canvases) {
      c.onpointerdown = (e) => {
        if (e.button !== 0) return;
        drag = { x: e.clientX, y: e.clientY, px: x, py: y, id: e.pointerId };
        c.setPointerCapture(e.pointerId);
        c.focus();
      };
      c.onpointermove = (e) => {
        if (!drag || drag.id !== e.pointerId) return;
        const scale = c.width / c.getBoundingClientRect().width;
        x = drag.px - ((e.clientX - drag.x) * scale) / zoom;
        y = drag.py - ((e.clientY - drag.y) * scale) / zoom;
        draw();
      };
      for (const ev of ["pointerup", "pointercancel", "lostpointercapture"])
        c.addEventListener(ev, () => (drag = null));
      c.onkeydown = (e) => {
        const step = e.shiftKey ? 10 : 1;
        if (
          ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
        ) {
          e.preventDefault();
          e.stopPropagation();
          x +=
            e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0;
          y += e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0;
          draw();
        }
      };
    }
    dlg.querySelector("[data-zoom]").onchange = (e) => {
      zoom = +e.target.value;
      draw();
    };
    dlg.querySelector("[data-centre]").onclick = () => {
      x = Math.floor(before.width / 2);
      y = Math.floor(before.height / 2);
      draw();
    };
    const close = () => {
      point = { x: x / (before.width - 1), y: y / (before.height - 1) };
      dlg.close();
      dlg.remove();
    };
    dlg.querySelector("[data-close]").onclick = close;
    dlg.oncancel = (e) => {
      e.preventDefault();
      close();
    };
    document.body.append(dlg);
    dlg.showModal();
    draw();
  }
  $("detailCompare").onclick = () => safe(inspect);
  window.JagoDitherComparison = { inspect };
  syncCompare();
  const fast = document.createElement("label");
  fast.className = "fast-sliders";
  fast.innerHTML =
    '<input type="checkbox" id="fastSliders" checked>Fast sliders';
  fast.title =
    "Use a smaller preview while dragging; restore full render detail when released.";
  document.querySelector(".layer-look-scope").append(fast);
  let drafting = false;
  try {
    $("fastSliders").checked =
      localStorage.getItem("jago-dither-fast-sliders") !== "off";
  } catch {}
  window.JagoDitherPreview = {
    width: (w) => (drafting && $("fastSliders").checked ? Math.min(480, w) : w),
    active: () => drafting,
  };
  $("fastSliders").onchange = () => {
    try {
      localStorage.setItem(
        "jago-dither-fast-sliders",
        $("fastSliders").checked ? "on" : "off",
      );
    } catch {}
  };
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (
        e.target.matches("input[type=range]") &&
        !e.target.closest("dialog") &&
        $("fastSliders").checked &&
        !busy &&
        !playing
      )
        drafting = true;
    },
    true,
  );
  const finish = () => {
    if (!drafting) return;
    drafting = false;
    requestPrint();
  };
  for (const event of ["pointerup", "pointercancel"])
    document.addEventListener(event, finish, true);
  window.addEventListener("blur", finish);
})();
