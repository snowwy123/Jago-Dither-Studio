# Dither 1.8 preview validation

23 October 2026. Evidence is local Windows/Edge testing, not a cross-PC certification.

- 85 engine/model/codec tests pass, including original print/ASCII/riso behaviour, mask differences, deterministic warps, character overrides, Unicode graphemes, alpha handling, gradients, palette extraction, source/texture cycles and ink controls.
- Browser workflows verify screen-worker rendering, character cell editing, actual TXT/SVG/grid downloads, embedded font metadata, save/reopen, animated candidate cleanup, shared palette extraction, loop-end comparison, one undo step per slider gesture, stable-mode behaviour and narrow/dark styling.
- The established motion workflow still imports the known red/blue cut correctly; cancellation preserves the project; named directions and locks persist; MP4, WebM, GIF and PNG-sequence exports complete; export cancellation releases the busy state.
- An original generated stereo 440/880 Hz fixture is trimmed to two seconds, saved/reopened and exported with its audio. Malformed embedded audio is rejected without replacing the live project. Mediabunny decoding verifies video duration and non-silent audio in MP4/WebM.
- Independent FFmpeg decoding checks 24 video frames, the red/blue cut, approximately two seconds of audio and the correct 440 Hz then 880 Hz ordering. Small AAC/Opus padding is allowed rather than mistaken for video timing error. These are signal measurements, not a claim of listening tests.
- The actual Windows EXE, using isolated test storage, renders screen cells and the offline character font, restores edited cells, exports font-bearing SVG, imports embedded clip audio and exports a one-second screen treatment with an audio track.
- A 36-case worker benchmark covers 320/720/1024 output edges, 4:3/16:9/9:16 sources and classic/riso/screen/character treatments. Three measurements per case include message transfer. The recorded median range is about 4–255 ms on this PC; full-resolution live playback may drop frames, while final export uses exact frame times. This is why short-clip limits remain in place.
- Three redistributable native projects and PNG previews are generated from an original animated signal study. No supplied reference screenshot, client artwork, music or capture is included.

The Windows build retains two pre-existing asynchronous-call warnings in the shared host. They are not new renderer errors. The shared host was not changed in this pass.

## What still needs user testing

Portraits and difficult highlights at practical cell sizes; subjective glow and ringing; narrow-window comfort; physical high-DPI/multi-monitor behaviour; audio/video codecs on other PCs; perceptual loop joins and ghosting. The existing PDF describes the foundation; Screen-character-and-motion.md covers the preview additions. Public PDF and website refreshes belong to the later reviewed release.
