# Dither 1.9 preview validation

23 October 2026. Local Windows/Edge checks; other-PC testing remains useful.

- 104 engine/model/codec tests pass, including 18 optics tests: settings validation, soft colour/highlight/paint masks, alpha composition, distinct lenses, source/screen placement, shadow protection, texture combinations, cyclic scanlines, halation alpha, explicit-frame trails, after-treatment inks and halftone spread.
- 48 raw-output comparisons with the untouched 1.8 renderer match exactly when the new effects are unused. The comparison covers existing print/character/screen treatments, moving phases, two aspect ratios and mixed-alpha sources.
- Twelve combined-look browser checks cover family memory, editing a bypassed effect, exact bypass/restore, lens placement, nonexported guides, mask cancellation/apply, simultaneous screen/texture/inks/lens, rolling playback, seek-repeatable trails, project persistence, actual PNG output and narrow dark layout.
- Existing studio checks pass: editable character cells and actual TXT/SVG/grid downloads, embedded font metadata, project reopening, candidate cleanup, palette analysis and one undo step per slider gesture.
- Existing clip checks pass: trim, cancel without mutation, source-frame order, persisted directions/locks/favourites, actual MP4/WebM/GIF/frame exports and export cancellation.
- Audio import/persistence and actual MP4/WebM soundtracks pass. Independent FFmpeg decoding confirms 24 frames, the expected red/blue source cut, audio duration and 440 Hz then 880 Hz ordering. These are measured signals, not subjective listening tests.
- The compiled Windows EXE passes isolated screen/font/grid/project/SVG/audio/video checks and combined optics rendering/persistence. Two existing shared-host compiler warnings are unchanged.
- Twelve new local CPU benchmark cases cover 320, 720 and 1024 output widths at 4:3. Median render times were about 20–1,283 ms. The combined mask/lens/texture/halation/trail case measured about 137 ms at 320 and 620 ms at 720. This is not a real-time guarantee. Use the persistent resolution selector to trade preview detail for responsiveness; final exports retain exact frame times.
- Three additional original editable optics examples accompany the original signal studies. No private artwork, supplied Instagram screenshot or test capture is bundled.

Existing bounded clip budgets remain. The CPU path can be slow with many passes, especially at large output sizes. Trails are one previous processed sample, not unlimited accumulated persistence. The foundational public PDF is unchanged; the new Markdown guide describes this development preview. See Optics-research.md for sources and decisions.
