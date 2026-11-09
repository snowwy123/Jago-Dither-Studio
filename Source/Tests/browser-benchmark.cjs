const { chromium } = require("playwright"),
  fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const p = await browser.newPage();
    await p.goto(
      require("node:url").pathToFileURL(
        path.resolve(__dirname, "../../index.html"),
      ).href,
    );
    await p.waitForFunction(() => window.appReady && window.JagoDitherStudio);
    const results = await p.evaluate(async () => {
      pause();
      const records = [];
      for (const [w, h] of [
        [480, 360],
        [640, 360],
        [360, 640],
      ]) {
        const c = makeCanvas(w, h),
          g = c.getContext("2d"),
          gradient = g.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, "#063b74");
        gradient.addColorStop(0.4, "#e47eaf");
        gradient.addColorStop(1, "#ffe7a0");
        g.fillStyle = gradient;
        g.fillRect(0, 0, w, h);
        g.fillStyle = "#132333";
        g.beginPath();
        g.arc(w * 0.5, h * 0.5, Math.min(w, h) * 0.3, 0, Math.PI * 2);
        g.fill();
        const source = pixelsOf(c);
        for (const width of [320, 720, 1024])
          for (const family of ["print", "riso", "screen", "characters"]) {
            const settings = Dither.settings({
                width,
                riso: { enabled: family === "riso", screen: "crosshatch" },
                studio: { family: family === "riso" ? "print" : family },
              }),
              times = [];
            let output;
            for (let n = 0; n < 3; n++) {
              const start = performance.now();
              output = await callWorker({
                type: "render",
                source,
                opts: settings,
                phase: n / 3,
                context: {},
              });
              times.push(performance.now() - start);
            }
            times.sort((a, b) => a - b);
            records.push({
              source: w + "x" + h,
              resolution: width,
              family,
              output: output.outputWidth + "x" + output.outputHeight,
              median_ms: +times[1].toFixed(1),
              max_ms: +times[2].toFixed(1),
            });
          }
      }
      return records;
    });
    const folder =
      process.env.JAGO_PROJECT_TEST_WORK ||
      path.resolve(__dirname, "../../Checks");
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(
      path.join(folder, "benchmark.json"),
      JSON.stringify(
        {
          environment:
            "Local headless Edge, worker rendering including message transfer; three renders per case, not a cross-PC guarantee.",
          results,
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        cases: results.length,
        range_ms: [
          Math.min(...results.map((r) => r.median_ms)),
          Math.max(...results.map((r) => r.median_ms)),
        ],
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
