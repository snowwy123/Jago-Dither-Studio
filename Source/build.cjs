// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Cameron Jago Lis Illustrates.
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm");
const dir = __dirname,
  root = path.dirname(dir),
  read = (name) => fs.readFileSync(path.join(dir, name), "utf8");
const zlib = require("node:zlib"),
  crypto = require("node:crypto"),
  assetBank = {};
const starter = JSON.parse(read("starter-art.json")),
  starterRefs = new Map();
const keyOf = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
for (const [study, art] of Object.entries(starter))
  art.frames.forEach((png, frame) =>
    starterRefs.set(keyOf(png), { study, frame }),
  );
const pack = (value) =>
  zlib
    .gzipSync(Buffer.from(JSON.stringify(value)), { level: 9 })
    .toString("base64");
const gallery = JSON.parse(read("example-gallery.json")).map((item) => {
  const entry = { ...item };
  if (item.file) {
    const doc = JSON.parse(fs.readFileSync(path.join(root, item.file), "utf8")),
      o = doc.settings || {};
    entry.moving =
      (doc.scene?.layers || []).some(
        (l) =>
          l.visible !== false &&
          ((l.frames?.length || 0) > 1 ||
            (l.motion && l.motion !== "none") ||
            (l.look?.mode === "custom" && moving(l.look.settings))),
      ) || moving(o);
    for (const [id, png] of Object.entries(doc.assets || {})) {
      const key = keyOf(png);
      assetBank[key] = starterRefs.get(key) || png;
      doc.assets[id] = key;
    }
    entry.projectGzip = pack(doc);
  } else entry.moving = starter[item.study].frames.length > 1;
  const thumb = path.join(dir, "Brand/Example-thumbnails", item.id + ".jpg");
  entry.thumbnail = fs.existsSync(thumb)
    ? "data:image/jpeg;base64," + fs.readFileSync(thumb).toString("base64")
    : "";
  return entry;
});
function moving(o) {
  return !!(
    (o.motion && o.motion !== "none") ||
    (o.temporal && o.temporal !== "none") ||
    o.animateEffects ||
    o.riso?.registrationMotion ||
    o.studio?.warpAnimate ||
    o.studio?.optics?.scanRoll
  );
}
let html = read("shell.html");
for (const [marker, content] of [
  [
    "STYLE",
    "@font-face{font-family:JagoPlex;src:url(data:font/ttf;base64," +
      fs
        .readFileSync(path.join(dir, "Fonts/IBMPlexMono-Regular.ttf"))
        .toString("base64") +
      ")}\n" +
      read("style.css") +
      "\n" +
      read("look-builder.css") +
      "\n" +
      read("layer-looks.css") +
      "\n" +
      read("example-gallery.css"),
  ],
  ["MEDIA", read("Vendor/mediabunny.min.js")],
  ["MOTION_MODEL", read("motion-model.cjs")],
  [
    "ENGINE",
    read("riso.js") +
      "\n" +
      read("optics-engine.js") +
      "\n" +
      read("studio-engine.js") +
      "\n" +
      read("engine.js"),
  ],
  [
    "DEMOS",
    "const starterArt = " +
      JSON.stringify(JSON.parse(read("starter-art.json"))) +
      ";\n" +
      read("studies.js"),
  ],
  ["CODECS", read("codecs.js")],
  [
    "APP",
    "const studioFontNotice = " +
      JSON.stringify(
        fs.readFileSync(
          path.join(root, "Notices/IBM-Plex-Mono-OFL.txt"),
          "utf8",
        ),
      ) +
      ";\nconst engineSource = " +
      JSON.stringify(
        read("riso.js") +
          "\n" +
          read("optics-engine.js") +
          "\n" +
          read("studio-engine.js") +
          "\n" +
          read("engine.js"),
      ) +
      ";\n" +
      read("layer-look-model.js") +
      "\n" +
      read("app.js") +
      "\n" +
      read("workspace.js") +
      "\n" +
      read("overlays.js") +
      "\n" +
      read("alignment.js") +
      "\n" +
      read("features.js") +
      "\n" +
      read("suite-bridge.js") +
      "\n" +
      read("suite-adapter.js") +
      "\n" +
      read("suite-round.js") +
      "\n" +
      read("print-bench.js") +
      "\n" +
      read("explore.js") +
      "\n" +
      read("clip-audio.js") +
      "\n" +
      read("motion-workshop.js") +
      "\n" +
      read("directions.js") +
      "\n" +
      read("studio-ui.js") +
      "\n" +
      read("look-builder.js") +
      "\n" +
      read("layer-looks.js") +
      "\n" +
      read("comparison-detail.js") +
      "\nconst ditherExampleAssetsGzip=" +
      JSON.stringify(pack(assetBank)) +
      ";\nconst ditherExamples=" +
      JSON.stringify(gallery) +
      ";\n" +
      read("example-gallery.js"),
  ],
]) {
  const slot = "/* " + marker + " */";
  if (html.split(slot).length !== 2)
    throw Error("Missing or repeated slot: " + marker);
  html = html.replace(slot, () => content);
}
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/g))
  new vm.Script(match[1]);
const previewInjectionAt=html.lastIndexOf('</body>');html=html.slice(0,previewInjectionAt)+'<script>'+fs.readFileSync(path.join(__dirname,'project-preview.js'),'utf8').replace(/<\/script/gi,'<\\/script')+'</script>'+html.slice(previewInjectionAt);
for (const name of ["index.html", "Jago-Dither-Studio.html"])
  fs.writeFileSync(path.join(root, name), html);
console.log("Built browser and offline app.");
