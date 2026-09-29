# Jago Dither Studio

**Pictures into patterns.**

Drop a picture on the table, add some lettering, and find your print. Turn it into dots, checks, grain or typewriter marks. Mix a few inks. Give the whole thing a nudge, or let each layer do its own little dance.

## Come on in

Extract the ZIP and open **Jago-Dither-Studio.exe** on Windows, or **Jago-Dither-Studio.html** in your browser. Both work locally. The Windows app needs Microsoft WebView2 Runtime and is unsigned. The HTML app is another way to open the same studio.

Scroll over the page to zoom. Choose **Pan (H)** and drag, or use the middle mouse button. Press **0** to fit the page again, just like Wobble.

**New** offers the same page sizes as Wobble, plus your own dimensions, paper colour and starting mark size. Resize it later in **Layers → The sheet underneath**. This changes the paper without stretching your layers.

## What's on the table?

- **Print:** 26 style choices, from Bayer checks and error diffusion to halftone dots, crosshatching, rings and character art. There are seven diffusion algorithms, four ordered matrices, thirteen patterns including your own custom tile, plus threshold and character art. Adjust pattern placement, scatter reach and direction, tones, grain and edge detail.
- **Ink:** 13 ink sets to start from, with 2 to 8 colours, a compact colour wheel with Hex and RGB, palette extraction, two- or three-colour gradient maps and shareable recipes. Reverse inks swaps the colours in the print.
- **Layers:** up to 12 images, animated sequences, gradient backgrounds, editable text or atmospheric overlays. Text can have a solid, linear or radial gradient fill. Click a layer on the page, drag it to move, pull a corner to resize or use the round handle to rotate. You can also flip, duplicate, reorder and blend layers. Try a float, swing, breath or full turn on individual layers.
- **Move:** seven whole-print movements plus six independent texture animations that work with every style. Loops run up to 12 seconds. Switching movement keeps playback going; Still print pauses it.
- **Experiment:** blend two patterns across the tones with Tone duet, paint a repeating custom tile, or stack seven effects. Ink lantern makes a dithered glow. Try tape slip, block shuffle, colour separation, scanlines, dark corners or solarized tones.
- **Compare:** drag the before/after handle across the picture. Export the split, put both versions side by side, or make an animated reveal.
- **Make it yours:** Sketchbook, Charcoal, Warm Paper, Midnight Plum and Candy Cloud, just like Wobble. Themes and the shortcut guide live in **?**.

Save your work as **.jagodither** to keep the layers and their settings. A **.ditherrecipe** saves the print settings without the images. Older Dither projects still open. There is no automatic project backup, so save the good experiments before closing.

Export PNGs, GIFs, PNG frame sequences, character-grid text or a Wobble project. PNG keeps soft transparency; GIF uses on/off transparency. Text export is available with Typewriter club.

The four starter drawings now come from Wobble: a striped mug, a wonky pear, brush lettering and pencil hills. Press Play for curling steam, a moving leaf, swaying letters or passing birds. Their editable **.jago** originals are in **Examples/Wobble-originals**.

## A little atmosphere

Choose **Layers > + Overlay** for little stars, sparkles, soft lights or dust. Pick their colour, size and amount, then press Play to try Twinkle, Slow pulse or Gentle drift. Timing and scatter options sit underneath.

Use **Before dithering** for printed texture, or **After dithering** to keep the overlay's own colours above the print. Both work in PNG, GIF, frame sequences and Wobble transfers. After-print overlays use a combined layer when sent to Wobble; plain text exports leave them out. Projects with overlays need this release or newer.

Open [Lights over the hills](Examples/Lights-over-the-hills.jagodither) for an editable example, made with the Wobble hills drawing and a few twinkling stars.

## Two studios, one little experiment

In **Jago Wobble Studio**, export a **PNG sequence ZIP**. In Dither, choose **Layers → + Wobble loop**. Add lettering, colour and print texture to the moving drawing.

To go back, export a **Wobble project** and open the **.jago** file in Wobble. Add a new drawing layer above the print. Choose a single rendered layer or **Separate ink layers**. With separate inks, you can hide a printing colour, move it for a registration offset, or animate it in Wobble. Keep your .jagodither file for editing the original text and composition.

[A short guide to working between the studios](Use-with-Wobble.md) · [A few print experiments](Print-playbook.md)

## A few practical bits

Version **1.0.0**. PNG, JPEG and WebP images can be up to 20 MB and are resized to a longest edge of 1200 px. Pages can be 16–2048 px per side, up to 2,097,152 pixels in total, including Full HD. Print resolution goes up to 1024 px, with PNG enlargement up to 4×. GIF exports are limited to 1280 px across the longest edge, including comparison pairs.

Sequence imports accept Jago PNG ZIPs up to 100 MB and loops from ¼ second to 12 seconds. They keep up to 288 sampled frames and reduce image resolution to manage memory. Duration is preserved. Changing the project loop length changes the speed of imported loops. Video and animated GIF import are not included yet.

All artwork is processed on your device. No accounts, uploads or online fonts. System fonts can look different on another computer; exported images keep the appearance from the device that made them.

**Open source. Free forever.** Made by **Cameron Jago Lis Illustrates**.

[My website](https://cameronjagolis.co.uk/) · [Buy me a cuppa](https://ko-fi.com/cameronillustrates) · [GitHub](https://github.com/snowwy123/Jago-Dither-Studio)

Support is optional. All the tools stay free.

[MIT licence](LICENSE) · [Credits](Credits.md) · [Building from source](Source/README.md)
