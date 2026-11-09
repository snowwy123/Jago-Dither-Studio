const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const out =
    process.env.JAGO_PROJECT_TEST_WORK ||
    path.resolve(__dirname, "../../Checks");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const p = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        acceptDownloads: true,
      }),
      errors = [],
      checks = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      require("node:url").pathToFileURL(
        path.resolve(__dirname, "../../index.html"),
      ).href,
    );
    await p.waitForFunction(() => window.appReady && window.JagoDitherStudio);
    await p.evaluate(() => JagoDitherMotion.demo());
    await p.evaluate(() => showTab("print"));
    await p.locator('[data-look-family="screen"]').click();
    await p.waitForFunction(
      () => latest?.studio && opts.studio.family === "screen",
    );
    await p.locator("#studio_screenMask").selectOption("dots");
    await p.waitForFunction(() => !rendering && !pending);
    await p.screenshot({ path: path.join(out, "screen-studio.png") });
    checks.push(
      "Screen treatment renders in worker with mode-specific controls",
    );
    await p.selectOption("#lookRecipe", "terminal");
    await p.waitForFunction(() => latest?.characterGrid);
    await p.locator("#editCharacterGrid").click();
    await p.waitForSelector(".character-editor canvas");
    await p.locator("#paintCharacter").fill("Z");
    await p
      .locator(".character-editor canvas")
      .click({ position: { x: 20, y: 30 } });
    await p.getByRole("button", { name: "Apply edits", exact: true }).click();
    assert(
      await p.evaluate(() => opts.studio.overrides.some((c) => c.ch === "Z")),
    );
    checks.push("Character cells paint and apply as a single project edit");
    for (const type of ["TXT", "SVG", "JSON"]) {
      const wait = p.waitForEvent("download");
      await p.locator("#character" + type).click();
      const d = await wait,
        file = path.join(out, "characters." + type.toLowerCase());
      await d.saveAs(file);
      const text = fs.readFileSync(file, "utf8");
      assert(text.includes("Z"));
      if (type === "SVG") assert(text.includes("@font-face"));
    }
    checks.push(
      "Actual TXT, SVG with offline font, and resolved-grid exports contain cell edits",
    );
    const saved = await p.evaluate(() => projectObject());
    await p.evaluate(
      async (saved) =>
        readProject(
          new File([JSON.stringify(saved)], "screen-test.jagodither"),
        ),
      saved,
    );
    assert(
      await p.evaluate(() => opts.studio.overrides.some((c) => c.ch === "Z")),
    );
    checks.push(
      "New treatment settings and edited grid survive save and reopen",
    );
    await p.evaluate(() => (showTab("play"),window.JagoDitherExplore?.show("directions")));
    await p.selectOption("#directionFamily", "screen");
    await p.locator("#directionGenerate").click();
    await p.waitForFunction(
      () =>
        document.querySelectorAll(
          ".motion-directions .print-directions-grid section",
        ).length === 4,
    );
    await p
      .locator(".motion-directions")
      .getByRole("button", { name: "Preview loop", exact: true })
      .first()
      .click();
    await p.waitForFunction(() =>
      [...document.querySelectorAll(".motion-directions button")].some(
        (b) => b.textContent === "Pause loop",
      ),
    );
    await p.locator(".motion-directions .close").click();
    checks.push("Animated candidate previews prepare and close cleanly");
    await p.evaluate(() => {
      JagoDitherStudio.set({ family: "screen", paletteCount: 4 });
      showTab("print");JagoDitherLook.open("colour");
      $("studioMotion").open = true;
    });
    await p.locator("#analyseClipPalette").click();
    await p.waitForFunction(
      () => opts.studio.paletteMode === "locked" && opts.palette.length === 4,
    );
    await p.locator("#inspectLoopSeam").click();
    await p.waitForFunction(() =>
      [...document.querySelectorAll("dialog[open]")].some(
        (d) => d.querySelectorAll("canvas").length === 2,
      ),
    );
    await p.locator("dialog[open] .close").click();
    checks.push(
      "Shared palette extraction and loop end comparison run on moving composition",
    );
    const undo=await p.evaluate(async()=>{const before=opts.studio.screenColumns,index=historyIndex,input=$('studio_screenColumns');for(const value of [before+1,before+2]){input.value=value;input.dispatchEvent(new Event('input'));}input.dispatchEvent(new Event('change'));const steps=historyIndex-index;await restore(-1);return{steps,before,after:opts.studio.screenColumns};});assert.equal(undo.steps,1);assert.equal(undo.after,undo.before);checks.push('Live slider gesture creates one undo step');
    await p.evaluate(()=>{showTab('move');opts.studio.warpAnimate=true;opts.studio.paletteMode='adaptive';sync();$('motionStable').checked=true;$('motionStable').dispatchEvent(new Event('change'));});assert(await p.evaluate(()=>opts.studio.paletteMode==='locked'&&!opts.studio.warpAnimate&&opts.seconds===2));checks.push('Stable print includes the new animation/palette settings without changing clip timing');
    await p.evaluate(()=>{showTab('print');document.documentElement.dataset.theme='charcoal';document.documentElement.dataset.jagoTheme='charcoal';document.querySelector('[data-panel="print"]').scrollTop=0;});
    const background=await p.locator('#studioFamily').evaluate(e=>getComputedStyle(e).backgroundColor);assert(Number(background.match(/\d+/)[0])<100,background);
    await p.setViewportSize({ width: 900, height: 760 });
    await p.screenshot({ path: path.join(out, "studio-narrow.png") });
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(out, "studio-result.json"),
      JSON.stringify({ ok: true, checks, errors }, null, 2),
    );
    console.log(JSON.stringify({ ok: true, checks }));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
