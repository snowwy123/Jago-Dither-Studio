# Rendering research and decisions

23 October 2026 · Dither 1.8 development preview

## Screen masks

Primary references: [Libretro CRT Beans parameters](https://github.com/libretro/slang-shaders/blob/master/crt/shaders/crt-beans/docs/parameters.md), [subpixel mask include](https://raw.githubusercontent.com/libretro/slang-shaders/master/include/subpixel_masks.h), and [Slang shader development](https://docs.libretro.com/development/shader/slang-shaders/).

The useful distinction is between an artistic image-space mask and a mask intended to align with physical display subpixels. Dither needs a portable artistic result that exports consistently. Logical columns and cell aspect therefore belong to the artwork; canvas zoom and physical monitor layout do not choose them. A resolution warning catches under-resolved RGB triplets. Emitters are evaluated in linear light, with separable bounded halo blur and a crisp core; display encoding happens afterward. Transparency uses straight RGB at output to avoid double attenuation.

The implementation uses original CPU-worker maths. No Libretro shader code or preset was copied. A GPU implementation remains a possible performance project after image parity, transparent edges and final-output sizing are benchmarked. It is not required for offline use.

## Character art and stages

Reference projects reviewed: [enonforetsam/ascii](https://github.com/enonforetsam/ascii) and [enonforetsam/fluid](https://github.com/enonforetsam/fluid). Earlier pinned source/licence research remains in the suite's Fluid-ASCII-QR research note dated 22 October.

The adopted ideas are text-native output, separating logical sampling from display resolution, reusable glyph atlases, and an explicit source/transform/surface model. Dither's implementation measures a bundled font's glyph coverage, retains resolved marks and per-cell colour, supports authored overrides, and exports real rows or SVG text. Glyph size and density are separate controls. Stage order changes whether distortion bends the source or the marks. This is not an integration of either project's engine or generative presets; no source code from those projects was copied in this pass.

## Offline typography

[IBM Plex font source](https://github.com/IBM/plex/tree/master/packages/plex-mono/fonts/complete/ttf) and [the IBM Plex licence](https://raw.githubusercontent.com/IBM/plex/master/LICENSE.txt) permit the bundled unmodified font under SIL OFL 1.1. The build embeds the font in the offline HTML. SVG output includes it and its notice. Original font SHA-256: `7c6fbddca4b700be918f5f6183d9bd4464fa427fe435f0b480d77fe2bb8c5a43`. System fallback glyphs remain platform-dependent; character count uses grapheme segmentation rather than splitting combining marks into separate cells.

## Short-clip audio

Primary references: [Mediabunny media sinks](https://mediabunny.dev/guide/media-sinks) and [media sources](https://mediabunny.dev/guide/media-sources). The APIs were checked against the already bundled 1.61.4 code, rather than assuming current online documentation matched it.

AudioBufferSink decodes only the selected interval. An offline audio context schedules chunks by their timestamps into a bounded stereo 48 kHz buffer, trimming boundaries and preserving silence where a track has no samples. A PCM WAV is embedded in the project. AudioBufferSource encodes that buffer into the final MP4/WebM after track setup, with source closure and device capability checks. The embedded WAV header, sample count, channels, rate and size are validated before project use. No model, network service or background audio engine was added.

Independent FFmpeg decoding checks the resulting soundtrack's known 440/880 Hz ordering, video frame count and red/blue source cut. Device-specific codec support still needs user testing.

## Palette and temporal choices

The shared-palette extractor is an original bounded weighted colour-histogram/median-split implementation. Eight equally spaced composition samples produce an editable locked palette. Adaptive mode deliberately recomputes per frame and can shimmer; it is not described as stabilised colour grading. Frame blending reads an explicit previous phase rather than mutable render history, so exporting and seeking do not depend on playback order. Strong cuts are bypassed; residual ghosting is possible. A tail dissolve and end-frame comparison are assistance, not a guarantee of seamless motion.

Optical-flow diffusion, user-reorderable arbitrary shader graphs and long-video streaming are not implemented. The present controls expose source-first versus treatment-first warping and a final surface stage, rather than a general node editor.

## Performance and future work

The recorded local worker benchmark spans 36 combinations: three resolutions, three aspect ratios and four treatments, with three renders per case. It measures rendering and message transfer in local headless Edge. It does not represent every PC or sustained playback. Cell colour fitting is cached per logical cell instead of being repeated for each emitter pixel. Compositing cache keys omit embedded audio because it cannot change artwork.

Keep the short-clip bounds until sustained memory, cancellation and decode throughput are tested on slower machines. Next useful experiments are GPU parity for luminous masks, controlled motion-compensated temporal filtering, clearer colour-role recipes and user visual feedback on portraits and difficult highlights. Public PDF/website examples should be refreshed only after the preview is reviewed.
