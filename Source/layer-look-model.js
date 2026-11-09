// SPDX-License-Identifier: MIT
// Small, serializable layer authoring model. Rendering remains in the app worker.
(function (root) {
  "use strict";
  function validate(value, settings) {
    if (value === undefined) return undefined;
    if (!value || !["inherit", "original", "custom"].includes(value.mode))
      throw Error("Invalid layer look.");
    if (
      value.mode === "custom" &&
      (!value.settings ||
        typeof value.settings !== "object" ||
        Array.isArray(value.settings))
    )
      throw Error("A custom layer needs valid look settings.");
    return value.mode === "custom"
      ? { mode: "custom", settings: settings(value.settings) }
      : { mode: value.mode };
  }
  function active(layers) {
    return layers.some(
      (l) =>
        l.visible &&
        l.opacity > 0 &&
        !(l.kind === "overlay" && l.stage === "after") &&
        l.look &&
        l.look.mode !== "inherit",
    );
  }
  function groups(layers, clear = false) {
    if (!active(layers)) return null;
    const result = [];
    let run = { mode: "inherit", paper: !clear, layers: [] };
    const flush = () => {
      if (run.paper || run.layers.length) result.push(run);
      run = { mode: "inherit", paper: false, layers: [] };
    };
    for (const l of layers) {
      if (
        !l.visible ||
        !l.opacity ||
        (l.kind === "overlay" && l.stage === "after")
      )
        continue;
      const mode = l.look?.mode || "inherit";
      if (mode === "inherit" && l.blend === "source-over") {
        run.layers.push(l);
        continue;
      }
      if (mode === "inherit") {
        flush();
        result.push({
          mode,
          paper: false,
          layers: [l],
          isolated: true,
          opacity: l.opacity,
          blend: l.blend,
        });
        continue;
      }
      flush();
      result.push({
        mode,
        paper: false,
        layers: [l],
        settings: l.look.settings,
        opacity: l.opacity,
        blend: l.blend,
      });
    }
    flush();
    return result;
  }
  function animated(s) {
    return (
      s.motion !== "none" ||
      s.temporal !== "none" ||
      s.animateEffects ||
      s.riso.registrationMotion > 0 ||
      (s.studio.optics.warpEnabled &&
        s.studio.warpAnimate &&
        s.studio.warp !== "off") ||
      (s.studio.optics.finishEnabled &&
        s.studio.optics.scanEnabled &&
        s.studio.optics.scanRoll &&
        s.studio.optics.scanStrength > 0)
    );
  }
  const api = { validate, active, groups, animated };
  if (typeof module !== "undefined") module.exports = api;
  else root.DitherLayerLookModel = api;
})(globalThis);
