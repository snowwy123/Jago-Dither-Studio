# Layer authoring: references and decisions

23 October 2026

- [W3C Compositing and Blending Level 1](https://www.w3.org/TR/compositing-1/) explains alpha composition, blend modes and why introducing group boundaries can change a blended result. Dither preserves the flattened path when no independent looks exist, groups adjacent following layers, and applies independent opacity/blend after rendering. Non-normal following blends receive their own isolated source and composite against the actual lower passes.
- [MDN imageSmoothingEnabled](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled) and [drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) document image sampling and source/destination drawing. Linked detail crops deliberately disable smoothing, share coordinates and use a backing canvas matched to the displayed size so magnification describes output pixels rather than a rescaled screenshot.

All new authoring code is original. Existing worker treatment engines, offline fonts and media libraries remain unchanged. No new dependency or online runtime is introduced. The layer editor stores a complete validated settings snapshot; editing a copy and checking document ownership before apply avoids half-written changes. Rendering captures each layer-run source and its temporal neighbours before asynchronous work. This keeps preview, seeking and export tied to the same source state.

The bounded preview is a responsiveness tradeoff, not a claim of GPU acceleration. Final exports use the requested dimensions. The mask brush interpolates stamps in pixel-distance space with spacing proportional to brush radius, and its local undo ring is capped. A general effect graph, per-layer keyframe timeline, automatic subject extraction and shared GPU rendering are not part of this pass.
