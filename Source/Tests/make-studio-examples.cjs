// Rebuild redistributable examples from an original JAGO signal animation.
const { chromium } = require("playwright"),
  fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const root = path.resolve(__dirname, "../.."),
    folder = path.join(root, "Examples"),
    browser = await chromium.launch({ channel: "msedge", headless: true });
  try {
    const p = await browser.newPage();
    await p.goto(
      require("node:url").pathToFileURL(path.join(root, "index.html")).href,
    );
    await p.waitForFunction(() => window.appReady && window.JagoDitherStudio);
    const results = await p.evaluate(async () => {
      JagoDitherMotion.demo();
      await document.fonts.load('42px JagoPlex');
      scene.width=480;scene.height=360;scene.paper='#070c18';const layer=scene.layers[0];layer.x=240;layer.y=180;layer.name='Original signal animation';
      for(let n=0;n<24;n++){
        const c=makeCanvas(480,360),g=c.getContext('2d'),a=n/24*Math.PI*2;g.fillStyle='#070c18';g.fillRect(0,0,480,360);
        g.strokeStyle='#183346';g.lineWidth=1;for(let x=24;x<480;x+=24){g.beginPath();g.moveTo(x,78);g.lineTo(x,320);g.stroke();}
        const radius=87+Math.sin(a)*5,orb=g.createRadialGradient(278,143,4,278,143,radius);orb.addColorStop(0,'#f7cbad');orb.addColorStop(.35,'#ed4d98');orb.addColorStop(.7,'#2677a1');orb.addColorStop(1,'#070c18');g.fillStyle=orb;g.beginPath();g.arc(278,143,radius,0,Math.PI*2);g.fill();
        g.strokeStyle='#7ee9d5';g.lineWidth=2;g.beginPath();g.ellipse(268,153,147,48,-.3,0,Math.PI*2);g.stroke();
        const signal=g.createLinearGradient(20,0,460,0);signal.addColorStop(0,'#4bc4c5');signal.addColorStop(.5,'#ed4d98');signal.addColorStop(1,'#f5c47f');g.strokeStyle=signal;g.lineWidth=5;g.beginPath();for(let x=20;x<461;x++){const y=269+Math.sin(x/47+a)*23+Math.sin(x/15-a)*8;if(x===20)g.moveTo(x,y);else g.lineTo(x,y);}g.stroke();
        g.fillStyle='#f8e2c5';g.font='42px JagoPlex';g.fillText('SIGNAL',25,61);g.font='12px JagoPlex';g.fillStyle='#8ec7cb';g.fillText('JAGO / ORIGINAL MOTION STUDY',25,335);
        assets.set(layer.frames[n].asset,imageAsset(c));
      }
      composingKey='';
      const base = Dither.settings({ ...opts, width: 720 }),
        settings = [
          Dither.settings({
            ...base,
            studio: {
              ...base.studio,
              family: "screen",
              screenMask: "slots",
              screenColumns: 64,
              screenGap: 0.25,
              screenGlow: 0.32,
              screenColour: "source",
            },
            palette: ["#121527", "#ec6297", "#6199b4", "#f8c478"],
          }),
          Dither.settings({
            ...base,
            studio: {
              ...base.studio,
              family: "characters",
              columns: 70,
              ink: "#bceba1",
              background: "#07131e",
              charset: " .:-=+*#%@",
            },
          }),
          Dither.settings({
            ...base,
            riso: {
              ...base.riso,
              enabled: true,
              screen: "crosshatch",
              paperFibres: 0.3,
              absorption: 0.25,
              inks: base.riso.inks.map((ink, i) => ({
                ...ink,
                enabled: i < 2,
                spacingScale: i ? 1.3 : 1,
                roughness: 0.15,
              })),
            },
            studio: { ...base.studio, family: "print" },
          }),
        ],
        names = ["Luminous signal", "Terminal signal", "Two-ink crosshatch"],
        results = [];
      scene.printDirections = settings.map((s, i) => ({
        id: "study-" + i,
        name: names[i],
        seed: "jago-study-20261023",
        settings: s,
      }));
      for (let i = 0; i < settings.length; i++) {
        opts = settings[i];
        sourceName = names[i];
        phase = 0.25;
        sync();
        const output = await callWorker({
            type: "render",
            source: pixelsOf(compose(phase)),
            opts,
            phase,
          }),
          canvas = makeCanvas(1, 1);
        paintOutput(canvas, output, 1, phase);
        results.push({
          name: names[i].replaceAll(" ", "-"),
          project: JSON.stringify(projectObject(), null, 2),
          png: canvas.toDataURL("image/png").split(",")[1],
        });
      }
      return results;
    });
    for (const item of results) {
      fs.writeFileSync(
        path.join(folder, item.name + ".jagodither"),
        item.project,
      );
      fs.writeFileSync(
        path.join(folder, item.name + ".png"),
        Buffer.from(item.png, "base64"),
      );
    }
    console.log(JSON.stringify({ examples: results.map((i) => i.name) }));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
