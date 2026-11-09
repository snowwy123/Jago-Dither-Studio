# Building Jago Dither

Use Windows x64 and Microsoft Edge WebView2 Runtime. Install Node.js for the browser build and the .NET Framework C# compiler for the Windows host.

From this repository, run **Build.ps1** in PowerShell. The wrapper uses the included WebView2 SDK. Edit the files under **Source**, then rebuild; generated HTML is build output.

Keep licence notices with redistributed code and binaries.

## Treatment studio

`studio-engine.js` contains the bounded source/warp/treatment/surface renderer. `studio-ui.js` owns the corresponding controls, glyph atlas and character-grid exports. The legacy print renderer is still the default path. Fonts are embedded by `build.cjs`; keep the OFL notice with the source and package. `clip-audio.js` trims and validates embedded PCM before the existing media exporter encodes it.

Run the Node test files under Source/Tests with `node --test` (the files ending in `.test.cjs`). Browser checks require Playwright and local Edge. `browser-studio.cjs` checks the new workflows; `browser-audio.cjs` creates its own original video/audio fixture. `native-studio.py` runs the Windows EXE using isolated test storage and uses the generated Checks/audio-screen.webm fixture. Existing motion checks also accept DITHER_MEDIA_FIXTURE and JAGO_PROJECT_TEST_WORK where supported.

`browser-benchmark.cjs` records a resolution/aspect/treatment matrix. `independent-studio.py` accepts DITHER_FFMPEG and independently checks the audio/video exports. `make-studio-examples.cjs` rebuilds original redistributable signal-study projects. Test artifacts belong in Checks, not in the portable app folder.

Preview scope and evidence: Documentation/Screen-character-and-motion.md, Rendering-research.md and Preview-validation.md. Do not infer long-video, optical-flow or general node-graph support from the new bounded stages.


## Look builder and optics (1.9)

`Source/optics-engine.js` owns validated optional-stage settings and deterministic rendering helpers; `look-builder.js/.css` reorganize existing bound controls. New settings live under `studio.optics`. Keep settings selection separate from enabling, preserve per-family memories, and keep guides out of final pixels. Run optics unit tests, browser-look-workflows.cjs and existing studio/audio/motion checks after pipeline changes. `optics-benchmark.cjs` records local CPU costs. `parity-1.8.cjs` requires DITHER_BASELINE_ROOT pointing to an unmodified 1.8 source tree. Full optics projects and PNG/video are distinct from character-stage TXT/grid/SVG exports.


## Layer authoring (1.10)

`layer-look-model.js` validates per-layer scope and plans ordered runs. `layer-looks.js` captures bounded source/temporal snapshots before asynchronous work, invokes the existing worker for each treated run and composites once with the requested blend/opacity. No independent layers means the original flattened path. New projects containing overrides use version 5. Keep suite/export scope capture intact, reject fixed plate/grid export for a combined look, and never apply after-print overlays twice. `comparison-detail.js` owns non-document view state and bounded slider previews. Run browser-layer-looks.cjs, browser-authoring-details.cjs and native-studio.py as well as the existing clip/audio/character checks. The example-generation and verification scripts build redistributable artwork and assert save/reopen/loop-end parity.


## Embedded example gallery (1.10.1)

`example-gallery.json` lists source projects and Wobble drawings; build.cjs deduplicates embedded PNG assets by SHA-256, reuses matching starter frames and packs project templates/image data using Node built-in gzip. The browser inflates locally only when an example opens. No filesystem fetch or network is needed in HTML or Windows. Generated JPEG thumbnails live in Source/Brand/Example-thumbnails. Regenerate them with DITHER_BUILD_THUMBNAILS=1 and Source/Tests/browser-example-gallery.cjs, then rebuild. That workflow opens every card and verifies exact Undo restoration. Explore pages separate examples, recipe settings and saved/generated directions. Keep shortcuts pointing to the one gallery and update navigation tests when changing page visibility.
