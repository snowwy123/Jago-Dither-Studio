// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Cameron Jago Lis Illustrates.
// Frames rendered by Wobble. The editable drawings live in Examples/Wobble-originals.
async function loadStudy(kind, mark = true) {
  const study = starterArt[kind];
  if (!study) throw Error('That drawing is not on the shelf.');
  return loadingFile(async () => {
    const ready = [];
    for (const png of study.frames) {
      const image = await decodeImage(png);
      ready.push({ png, image, width: study.width, height: study.height });
    }
    pause();
    closeInk();
    scene = {
      width: study.width,
      height: study.height,
      paper: '#f6f0df',
      clear: false,
      layers: [],
      active: ''
    };
    const layer = layerBase(study.name);
    layer.duration = study.seconds;
    layer.frames = ready.map((asset, i) => {
      const id = uid();
      assets.set(id, asset);
      return {
        asset: id,
        time: (i * study.seconds) / ready.length,
        duration: study.seconds / ready.length
      };
    });
    scene.layers.push(layer);
    scene.active = layer.id;
    sourceName = study.name;
    sourcePNG = ready[0].png;
    opts.seconds = study.seconds;
    phase = 0;
    fitView = true;
    revision++;
    pending = null;
    refreshSource(0);
    if (mark) remember();
    pruneAssets();
    sync();
    requestPrint();
  });
}
