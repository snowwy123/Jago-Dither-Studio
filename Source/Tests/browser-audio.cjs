const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const folder =
    process.env.JAGO_PROJECT_TEST_WORK ||
    path.resolve(__dirname, "../../Checks");
  fs.mkdirSync(folder, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const p = await browser.newPage({ acceptDownloads: true }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      require("node:url").pathToFileURL(
        path.resolve(__dirname, "../../index.html"),
      ).href,
    );
    await p.waitForFunction(() => window.appReady);
    await p.evaluate(async () => {
      const canvas = makeCanvas(160, 120),
        ctx = canvas.getContext("2d"),
        output = new Mediabunny.Output({
          format: new Mediabunny.WebMOutputFormat(),
          target: new Mediabunny.BufferTarget(),
        }),
        video = new Mediabunny.CanvasSource(canvas, {
          codec: "vp8",
          quality: new Mediabunny.Quality({ bitrate: 200000 }),
        }),
        audio = new Mediabunny.AudioBufferSource({
          codec: "opus",
          quality: new Mediabunny.Quality({ bitrate: 96000 }),
        });
      output.addVideoTrack(video, { frameRate: 12 });
      output.addAudioTrack(audio);
      await output.start();
      const buffer = new AudioBuffer({
        length: 144000,
        numberOfChannels: 2,
        sampleRate: 48000,
      });
      for (let c = 0; c < 2; c++) {
        const data = buffer.getChannelData(c);
        for (let i = 0; i < data.length; i++)
          data[i] =
            Math.sin((i / 48000) * Math.PI * 2 * (i < 72000 ? 440 : 880)) * 0.2;
      }
      await audio.add(buffer);
      audio.close();
      for (let i = 0; i < 36; i++) {
        ctx.fillStyle = i < 18 ? "#ff0000" : "#0000ff";
        ctx.fillRect(0, 0, 160, 120);
        await video.add(i / 12, 1 / 12);
      }
      video.close();
      await output.finalize();
      window.audioFixture = new File(
        [output.target.buffer],
        "Sound trim.webm",
        { type: "video/webm" },
      );
      window.importAudioTask = JagoDitherMotion.openVideo(audioFixture);
    });
    await p.waitForSelector("#clipKeepAudio");
    assert(await p.locator("#clipKeepAudio").isChecked());
    await p.locator("#clipStart").fill(".5");
    await p.locator("#clipEnd").fill("2.5");
    await p.locator("#clipApply").click();
    await p.evaluate(() => importAudioTask);
    assert(await p.evaluate(() => scene.clipAudio?.seconds === 2));
    const metrics = await p.evaluate(async () => {
      DitherClipAudio.validate(scene.clipAudio);
      const audio = await DitherClipAudio.buffer(scene.clipAudio, 2),
        data = audio.getChannelData(0),
        rms = Math.sqrt(data.reduce((n, v) => n + v * v, 0) / data.length);
      return {
        rms,
        duration: audio.duration,
        bytes: scene.clipAudio.src.length,
      };
    });
    assert(metrics.rms > 0.1 && metrics.rms < 0.2);
    assert.equal(metrics.duration, 2);
    await p.evaluate(async () => {
      const obj = projectObject();
      await readProject(new File([JSON.stringify(obj)], "sound.jagodither"));
    });
    assert(await p.evaluate(() => scene.clipAudio?.seconds === 2));
    const original=await p.evaluate(()=>JSON.stringify(projectObject()));
    const malformed=await p.evaluate(async()=>{const object=copy(projectObject());object.scene.clipAudio.seconds=11;try{await readProject(new File([JSON.stringify(object)],'bad-audio.jagodither'));return false;}catch{return true;}});assert(malformed);assert(await p.evaluate(original=>JSON.stringify(projectObject())===original,original),'Rejected audio must leave the live project unchanged');
    const results = [];
    for (const kind of ["webm", "mp4"]) {
      await p.evaluate((kind) => {
        opts = Dither.settings({
          ...opts,
          width: 320,
          studio: { ...opts.studio, family: "screen" },
        });
        sync();
        $("exportFormat").value = kind;
        $("exportScale").value = "1";
        $("exportView").value = "print";
        $("clipExportAudio").checked = true;
        $("exportDialog").showModal();
      }, kind);
      const download = p.waitForEvent("download", { timeout: 30000 });
      await p.evaluate(() => exportPrint());
      const file = await download,
        target = path.join(folder, "audio-screen." + kind);
      await file.saveAs(target);
      const bytes = Array.from(fs.readFileSync(target)),
        info = await p.evaluate(async (bytes) => {
          const input = new Mediabunny.Input({
            formats: Mediabunny.ALL_FORMATS,
            source: new Mediabunny.BlobSource(
              new Blob([Uint8Array.from(bytes)]),
            ),
          });
          try {
            const track = await input.getPrimaryAudioTrack(),
              video = await input.getPrimaryVideoTrack();
            if (!track) return {};
            let samples = 0,
              squared = 0;
            for await (const sample of new Mediabunny.AudioBufferSink(
              track,
            ).buffers(0, 2)) {
              const data = sample.buffer.getChannelData(0);
              samples += data.length;
              for (const n of data) squared += n * n;
            }
            return {
              duration: await track.computeDuration(),
              videoDuration: await video.computeDuration(),
              rms: Math.sqrt(squared / samples),
              samples,
            };
          } finally {
            input.dispose();
          }
        }, bytes);
      assert(info.samples > 90000);
      assert(info.rms > 0.1 && info.rms < 0.2);
      assert(Math.abs(info.videoDuration - 2) < 0.03);
      assert(Math.abs(info.duration - 2) < 0.08);
      results.push({ kind, ...info });
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(folder, "audio-result.json"),
      JSON.stringify({ ok: true, metrics, results, errors }, null, 2),
    );
    console.log(JSON.stringify({ ok: true, metrics, results }));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
