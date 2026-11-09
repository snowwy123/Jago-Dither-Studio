(async () => {
  try {
    for (let n = 0; n < 150 && !window.appReady; n++)
      await new Promise((r) => setTimeout(r, 100));
    const checks = [];
    JagoDitherMotion.demo();
    JagoDitherStudio.set({
      family: "screen",
      screenMask: "slots",
      warp: "wave",
      warpAnimate: true,
    });
    const source = pixelsOf(compose(0.25)),
      screen = await callWorker({
        type: "render",
        source,
        opts: { ...opts, width: 320 },
        phase: 0.25,
      });
    if (
      !screen.studio ||
      screen.outputWidth !== 320 ||
      !screen.data.some((v) => v > 20)
    )
      throw Error("Native screen renderer failed");
    checks.push(
      "Offline Windows host renders luminous cells and animated warp",
    );
    JagoDitherStudio.set({
      family: "characters",
      overrides: [{ x: 1, y: 1, ch: "Z" }],
    });
    const chars = await callWorker({
      type: "render",
      source,
      opts: { ...opts, width: 320 },
      phase: 0.25,
    });
    if (chars.characterGrid.glyphs[opts.studio.columns + 1] !== "Z")
      throw Error("Native font/grid failed");
    checks.push(
      "Bundled offline font and edited character grid render in Windows host",
    );
    const saved = projectObject();
    await readProject(
      new File([JSON.stringify(saved)], "native-studio.jagodither"),
    );
    if (
      opts.studio.family !== "characters" ||
      opts.studio.overrides[0].ch !== "Z"
    )
      throw Error("Native project reopen failed");
    checks.push("New settings and cell edits save and reopen");
    const captured = [];
    download = (blob, name) => captured.push({ blob, name });
    $("characterSVG").click();
    for (let i = 0; i < 100 && !captured.length; i++)
      await new Promise((r) => setTimeout(r, 50));
    if (
      !captured.length ||
      !(await captured[0].blob.text()).includes("<metadata>")
    )
      throw Error("Native SVG export failed");
    checks.push("Character SVG export includes font and licence metadata");
    const fixture = Uint8Array.from(atob(AUDIO_FIXTURE), (c) =>
      c.charCodeAt(0),
    );
    window.nativeAudioTask = JagoDitherMotion.openVideo(
      new File([fixture], "Synthetic audio.webm", { type: "video/webm" }),
    );
    for (let n = 0; n < 100 && !$("clipStart"); n++)
      await new Promise((r) => setTimeout(r, 50));
    $("clipStart").value = "0";
    $("clipEnd").value = "1";
    $("clipEnd").dispatchEvent(new Event("input"));
    $("clipApply").click();
    await nativeAudioTask;
    if (!scene.clipAudio || scene.clipAudio.seconds !== 1)
      throw Error("Native audio trim failed");
    DitherClipAudio.validate(scene.clipAudio);
    checks.push("Windows host imports and embeds selected clip audio");
    captured.length = 0;
    JagoDitherStudio.set({ family: "screen" });
    opts.width = 320;
    sync();
    $("exportFormat").value = "webm";
    $("exportScale").value = "1";
    $("exportView").value = "print";
    $("clipExportAudio").checked = true;
    $("exportDialog").showModal();
    await JagoDitherMotion.exportVideo();
    if (!captured.length) throw Error("Native audio/video export failed");
    const media = new Mediabunny.Input({
      formats: Mediabunny.ALL_FORMATS,
      source: new Mediabunny.BlobSource(captured[0].blob),
    });
    try {
      const track = await media.getPrimaryAudioTrack();
      if (!track || !(await track.canDecode()))
        throw Error("Native encoded soundtrack missing");
      if (Math.abs((await track.computeDuration()) - 1) > 0.08)
        throw Error("Native soundtrack duration incorrect");
    } finally {
      media.dispose();
    }
    checks.push(
      "Windows host exports a one-second screen treatment with an audio track",
    );
    opts = Dither.settings({...opts,width:320,studio:{...opts.studio,family:'screen',optics:{protectShadows:true,lensEnabled:true,lensType:'crt',textureEnabled:true,maskEnabled:true,target:'saturated',scanEnabled:true,scanStrength:.2}}});
    const combined=await callWorker({type:'render',source:pixelsOf(compose(.25)),opts,phase:.25,context:JagoDitherStudio.contextAt(.25,opts)});
    if(combined.outputWidth!==320 || !combined.data.some(v=>v>20))throw Error('Native combined optics failed');
    const opticsSaved=JSON.stringify(opts.studio.optics);
    await readProject(new File([JSON.stringify(projectObject())],'native-optics.jagodither'));
    if(JSON.stringify(opts.studio.optics)!==opticsSaved)throw Error('Native optics persistence failed');
    checks.push('Windows host renders combined lens, mask, texture and scanlines and restores all optics settings');
    const layer=scene.layers.find(l=>!(l.kind==='overlay'&&l.stage==='after'));layer.look={mode:'custom',settings:Dither.settings(copy(opts))};
    const scoped=await callWorker({type:'render',source:pixelsOf(compose(.25)),opts,phase:.25});
    if(!scoped.scoped)throw Error('Native per-layer render missing');
    await readProject(new File([JSON.stringify(projectObject())],'native-layers.jagodither'));
    const reopened=await callWorker({type:'render',source:pixelsOf(compose(.25)),opts,phase:.25});
    if(!scoped.data.every((v,i)=>v===reopened.data[i]))throw Error('Native layer look changed after reopen');
    checks.push('Windows host renders independent layer looks and reopens identical output');
    remember();const beforeGallery=JSON.stringify(projectObject());
    JagoSuiteExamples.open();
    if(document.querySelectorAll('.example-grid article').length!==20)throw Error('Native example catalog missing');
    document.querySelector('[data-open-example="chrome-live"]').click();
    for(let n=0;n<200&&(document.querySelector('.example-gallery')||busy||rendering||pending);n++)await new Promise(r=>setTimeout(r,50));
    if(sourceName!=='Chrome-Bloom-Live'||!JagoDitherLayers.active())throw Error('Native embedded example did not open');
    await restore(-1);
    if(JSON.stringify(projectObject())!==beforeGallery)throw Error('Native gallery Undo lost previous work');
    checks.push('Windows offline gallery opens embedded Live Looks and Undo restores the previous project');
    window.suiteTestResult = { ok: true, checks };
  } catch (error) {
    window.suiteTestResult = { ok: false, error: error.stack };
  }
})();
