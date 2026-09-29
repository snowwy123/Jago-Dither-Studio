# Working on the studio

The browser app has no build dependencies beyond Node.js.

From the main folder:

    node Source/build.cjs
    node --test Source/Tests/*.test.cjs

This rebuilds both HTML files from the same source. Open either file in a modern browser. Serve index.html if you want to host it on a website. The worker is bundled into the HTML, so it also works offline.

- **engine.js:** image processing, custom thresholds, diffusion, gradient mapping, palette-safe effects and periodic motion. Runs in a worker in the app and directly in the tests.
- **app.js:** print controls, timeline, worker, preview and colour picker.
- **workspace.js:** composition, image/text layers, file validation, ZIP import, comparisons and exports.
- **overlays.js:** seeded shapes, alpha lights, twinkling, drifting and before/after-print placement.
- **alignment.js:** view zoom and pan, page setup, layer handles and save tracking.
- **features.js:** gradient fills, custom tile controls, ink separation, shortcuts and expanded recipes.
- **studies.js:** loads the four built-in Wobble loops. **starter-art.json** contains their rendered PNG frames, embedded by the build so the app stays offline. The editable drawings are in Examples/Wobble-originals.
- **codecs.js:** the GIF and stored-ZIP writers shared with Jago Wobble Studio.
- **shell.html**, **style.css:** the interface and themes.

For Windows, build the browser version first, then run:

    .\Source\Windows\Build.ps1

The script uses the .NET Framework C# compiler and downloads the pinned Microsoft WebView2 SDK if necessary. Add -SdkDirectory followed by an SDK folder path to use an existing copy. The Windows app stores its supporting files and profile in %LOCALAPPDATA%\Jago Dither Studio.

An isolated Windows smoke test is available:

    .\Jago-Dither-Studio.exe --self-test C:\path\to\new-test-folder

Check result.txt in that folder. The test uses a separate profile.

Project format version 4 stores a canvas, layer records, validated print settings and embedded PNG assets. History shares immutable assets rather than copying image data on every edit. Version 1 projects still open as a single image layer. Version 2 compositions still open, with solid fills as the default for older text layers. Version 3 adds gradient layers and editable gradient fills. Version 4 adds procedural overlay layers. Projects without overlays still save as version 3. Recipes stay at version 1 and include settings only.

Saving records the exact project state. Undoing back to that state clears the close warning. The Windows wrapper confirms download completion or cancellation before reporting the result; browser downloads use the normal browser save flow.

The worker receives a composed source with each render request. Only the newest requested preview is displayed; exports use fixed settings and block editing until complete. Static compositions are cached between animation steps.

PNG sequence imports read timing.json from Jago archives. They verify ZIP checksums and sizes before decoding frames. Wobble exports use its version 5 project format with either a single image layer or one layer per printing ink, and a maximum of 48 frames. Each pixel belongs to one ink plate; its original RGBA is retained so the plates recombine without changing the print. The separate studios keep their own editable project formats.

`overlays.js` draws seeded stars, sparkles, soft lights and dust. Marks are deterministic, with integer cycles so animation loops close cleanly. Before-print overlays join the source composition; after-print overlays are composited onto the output in preview and exports. They do not pass through whole-print motion or palette mapping.
