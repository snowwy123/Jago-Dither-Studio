# Optics and look-builder research

23 October 2026 · development preview 1.9

Primary references examined alongside the existing rendering research:

- OpenCV camera calibration: https://docs.opencv.org/4.x/dc/dbb/tutorial_py_calibration.html — radial/tangential distortion and the distinction between distorted and corrected coordinates. Dither uses original artistic inverse mappings, not measured camera coefficients.
- Libretro CRT Beans parameters: https://github.com/libretro/slang-shaders/blob/master/crt/shaders/crt-beans/docs/parameters.md — useful separation of masks, scanlines, curvature, brightness and glow. Physical-display subpixel alignment is deliberately outside Dither's exported artistic image-space masks.
- Libretro shader chains: https://docs.libretro.com/guides/shaders/ — staged processing and independently adjustable passes inform the workflow. Dither's implementation is its own bounded CPU-worker pipeline, with no copied shader source or presets.

Implementation decisions: inverse lens sampling avoids forward-mapping holes; bilinear interpolation uses premultiplied alpha before returning straight RGBA. Highlight halos accumulate in linear light and can extend soft alpha. Selection composition also uses premultiplied colours. Independent source selection and toned reference prevent exposure adjustments silently changing the meaning of a picked source colour. Soft ranges preserve a transition instead of clipping everything at a single brightness cutoff.

Rolling scanlines use an exact composition phase. Trails use an explicit previous sample rather than hidden render history, which keeps random seeking and export repeatable. This is a one-frame artistic echo, not a persistence simulator. Painted masks are bounded to 2,048 stamps, cached by dimensions and contents, and applied atomically from a cancellable local editor. New controls reuse the existing bound widgets and preserve per-style settings instead of cloning competing controls.

No new dependency or online runtime was added. Existing WebView2, Mediabunny and bundled font notices remain applicable. GPU acceleration, arbitrary stage graphs and physical-monitor mask calibration remain future work.
