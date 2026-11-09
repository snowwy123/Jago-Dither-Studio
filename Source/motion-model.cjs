// SPDX-License-Identifier: MIT
(function (root) {
  "use strict";
  function seedNumber(seed) {
    let value = 2166136261;
    for (const c of String(seed).slice(0, 256))
      value = Math.imul(value ^ c.charCodeAt(0), 16777619);
    return value >>> 0;
  }
  function random(seed) {
    let n = seedNumber(seed);
    return () => {
      n += 0x6d2b79f5;
      let t = Math.imul(n ^ (n >>> 15), 1 | n);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function plan({
    start = 0,
    end,
    duration,
    fps = 12,
    maxEdge = 640,
    width,
    height,
  }) {
    if (
      ![start, end, duration, fps, maxEdge, width, height].every(
        Number.isFinite,
      ) ||
      start < 0 ||
      end > duration + 0.00001 ||
      end <= start ||
      end - start < 0.25 ||
      end - start > 12.00001 ||
      ![6, 12, 24].includes(fps) ||
      width < 16 ||
      height < 16 ||
      ![320, 480, 640, 960].includes(maxEdge)
    )
      throw Error(
        "Choose a valid range from ¼ to 12 seconds, a supported frame rate and image size.",
      );
    const seconds = end - start,
      count = Math.max(1, Math.round(seconds * fps));
    if (count > 288) throw Error("Use at most 288 frames.");
    const ratio = Math.min(
        1,
        maxEdge / Math.max(width, height),
        Math.sqrt(40000000 / count / (width * height)),
      ),
      w = Math.floor(width * ratio),
      h = Math.floor(height * ratio);
    if (w < 16 || h < 16) throw Error("This clip is too narrow to import.");
    return {
      start,
      end,
      seconds,
      count,
      width: w,
      height: h,
      fps: count / seconds,
      times: Array.from(
        { length: count },
        (_, i) => start + (i * seconds) / count,
      ),
      durations: Array(count).fill(seconds / count),
      pixels: w * h * count,
    };
  }
  function direction(base, seed, group = "any", locks = {}) {
    if (!["any", "classic", "riso", "screen", "characters"].includes(group))
      throw Error("Choose a print family.");
    const rng = random(seed),
      pick = (a) => a[Math.floor(rng() * a.length)],
      next = JSON.parse(JSON.stringify(base)),
      chosen =
        group === "any"
          ? pick(["classic", "classic", "riso", "screen", "characters"])
          : group,
      riso = chosen === "riso";
    next.seed = locks.texture ? base.seed : seedNumber(seed) % 65536;
    next.riso.seed = locks.texture
      ? base.riso.seed
      : seedNumber(seed) % 1000000;
    const palettes = [
      ["#193943", "#dc7554", "#f6e8c8"],
      ["#292338", "#ac658b", "#edb89b", "#faf1d6"],
      ["#183d35", "#6b865c", "#d8dba2", "#fff5df"],
      ["#24272e", "#e9dfcc"],
      ["#1b2c48", "#227d9c", "#e4b94c", "#f5efdd"],
    ];
    if (!locks.palette) {
      next.palette = pick(palettes);
      next.mapMode = "off";
      next.reverseInks = false;
      next.riso.paper = next.palette.at(-1);
      if (next.studio) {
        next.studio.ink = next.palette.at(-1);
        next.studio.background = next.palette[0];
        next.studio.charColour = pick(["mono", "source", "palette"]);
      }
      next.riso.inks.forEach((ink, i) => {
        ink.colour = next.palette[i % (next.palette.length - 1)];
        ink.enabled = i < next.palette.length - 1;
      });
    }
    if (!locks.texture) {
      next.riso.enabled = riso;
      if (next.studio) {
        next.studio.family = ["screen", "characters"].includes(chosen)
          ? chosen
          : "print";
        next.studio.screenMask = pick(["rgb", "bgr", "dots", "slots"]);
        next.studio.screenColumns = pick([48, 64, 80, 96]);
        next.studio.screenGlow = pick([0.15, 0.3, 0.5]);
        next.studio.columns = pick([48, 64, 80]);
        next.studio.charPolarity = "light";
        next.studio.charset = pick([" .:-=+*#%@", " .oO@", " ░▒▓█"]);
        next.studio.overrides = [];
        next.studio.warp = pick(["off", "off", "wave", "swirl"]);
        next.studio.warpAmount = pick([8, 16, 24]);
        next.studio.temporalBlend = base.studio.temporalBlend;
        next.studio.seamBlend = base.studio.seamBlend;
      }
      next.riso.solo = -1;
      next.method = pick([
        "bayer2",
        "bayer4",
        "bayer8",
        "atkinson",
        "dots",
        "lines",
        "weave",
        "diamonds",
      ]);
      next.cell = pick([2, 3, 4, 5, 6]);
      next.contrast = pick([5, 15, 25, 35]);
      next.brightness = pick([-5, 0, 5]);
      next.grain = pick([0, 4, 8]);
      next.riso.screen = pick([
        "grain",
        "dots",
        "lines",
        "squares",
        "diamonds",
        "ellipses",
        "crosshatch",
      ]);
      next.riso.spacing = pick([4, 6, 8, 10]);
      next.riso.gain = pick([0, 8, 16]);
      next.riso.paperGrain = pick([6, 12, 18]);
    }
    if (!locks.motion) {
      next.motion = "none";
      if (next.studio)
        next.studio.warpAnimate = next.studio.warp !== "off" && rng() < 0.5;
      next.temporal = pick(["none", "none", "tide", "shimmer", "weave"]);
      next.animateEffects = false;
      next.riso.registrationMotion =
        next.temporal === "none" ? 0 : pick([0, 1, 2]);
    }
    return next;
  }
  function stable(value) {
    return {
      ...value,
      studio: value.studio
        ? { ...value.studio, warpAnimate: false, paletteMode: "locked",optics:value.studio.optics?{...value.studio.optics,scanRoll:false}:undefined }
        : undefined,
      motion: "none",
      temporal: "none",
      animateEffects: false,
      riso: { ...value.riso, registrationMotion: 0 },
    };
  }
  const api = { seedNumber, random, plan, direction, stable };
  if (typeof module !== "undefined") module.exports = api;
  root.DitherMotion = api;
})(typeof globalThis === "undefined" ? this : globalThis);
