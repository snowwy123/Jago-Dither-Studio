# Dither 1.10 validation

23 October 2026 · local Windows / Edge

- 112 engine/model/codec tests pass. New model cases cover unchanged flattened routing, ordered layer runs, paper/transparent canvases, original/custom modes, non-normal blend boundaries, settings validation and gated layer animation.
- 48 raw-output cases match the untouched 1.9 renderer. Existing rendering maths is unchanged; independent passes are enabled only for visible non-following layers.
- Ten layer/comparison browser checks cover original-colour bypass, separate editor ownership, Cancel, one-step Undo/Redo, identical pixels after save/reopen, rejection of malformed settings without document replacement, mouse/keyboard wipe placement, linked detail pan/zoom, an actual PNG whose decoded pixels match the preview, and narrow layout.
- Seven authoring checks cover opacity applied once, blend against lower rendered passes, transparent areas, layer-only playback and seek-repeatability, stable-mode behaviour, draft-slider resolution followed by full-detail restoration without changing saved width, and a long brush jump that paints through its midpoint then undoes locally.
- Existing Look/Characters workflows pass, including actual character exports, mask cancellation, combined optics, guide exclusion, source/screen lens, palettes, per-gesture undo, animated candidate cleanup and project persistence.
- Existing clip workflows pass: trim/cancel, source cut, directions/locks/favourites, MP4/WebM/GIF/frame exports and cancellation. Audio import/persistence and actual soundtracks pass. Independent FFmpeg confirms frame counts, cut order and 440/880 Hz trim in MP4/WebM, plus GIF timing/palette and PNG sequence validity.
- The compiled Windows executable passes screen/font/grid/SVG/audio/video/combined-optics checks and renders/reopens an independent-layer project with identical pixels. Two existing shared-host compile warnings remain unchanged.
- Two original live projects contain visible motion and reopen with identical output. Phase 0 and phase 1 match exactly for both. Independent FFmpeg decoding confirms each WebM has 36 moving frames at 480 × 600 over three seconds.

Visual inspection covered the selected-layer editor, Original/Print wipe, detail crops, narrow window and the moving showcase sources. This is not a cross-PC performance certification. Each independent treatment adds work. Smaller interactive previews improve responsiveness; they do not constitute GPU acceleration. A bounded source/temporal sampling budget asks for a lower render resolution if a large independent stack exceeds it.

Documents containing independent looks use native project version 5. Combined raster output cannot promise independent fixed ink plates or one editable character grid. These export routes explain how to return to a single following treatment. No new dependency or online service is introduced. Prior portable previews and public installers are preserved.
