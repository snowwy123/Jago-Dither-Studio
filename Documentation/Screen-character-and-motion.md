# Screen, characters & motion

For the current 1.9 layout and optional combined effects, see [Look builder and optics](Look-builder-and-optics.md). Some control routes below describe the earlier 1.8 layout.

Jago Dither 1.8 development preview · 23 October 2026

## Find a look quickly

Open **Print → Treatment** and choose Print, Screen or Characters. **Starting look** supplies seven editable recipes. **Try a moving study** makes an original blinking-pattern example; Undo returns to your work. Add your own artwork or video from the top **Add image / clip** button.

**Print** retains the dither patterns and layered inks. **Screen** builds each sampled cell from separate RGB emitters. **Characters** makes a real text grid using an offline bundled font.

Output resolution controls the longest rendered edge. Columns control the number of logical cells. Increasing output resolution preserves the composition of the cells while giving their marks more pixels. For RGB stripes, aim for at least four output pixels per cell; the panel warns when they become too small to resolve clearly. Canvas zoom changes viewing size, not the exported mask.

## Luminous screens

Start with Clean RGB screen, Soft phosphor or Staggered luminous slots. The main controls are mask, columns, glow and source/palette colours. Open **Cell shape, light output & finer controls** for aspect, gaps, brightness, black cutoff, halo radius and stripe orientation. RGB, BGR, dots and staggered slots are distinct artistic treatments; they do not depend on your physical monitor layout.

Source colours retain the image's sampled RGB. Colours palette deliberately maps those cells to the inks in **Ink**. Glow is calculated in linear light, then converted to the display colour space. Keep source transparency preserves existing cutout edges; it does not remove a photograph's background.

## Editable characters

Choose a starting recipe or enter 2–64 character marks. Density sorting measures each glyph rather than assuming every font's punctuation is equally dense. Type shape & density contains aspect, mark size and light/dark polarity. Choose one ink, source colours or the shared palette, and set the background independently.

**Edit cells** opens a scrollable grid. Enter a paint mark, then click or drag. Right-click restores the generated character. Apply is one undo step; Cancel leaves the project untouched. A project supports 2,048 edited cells and 240 distinct authored marks. Reducing the grid width hides edits outside that width without wrapping them into other rows.

**Text** exports actual Unicode rows. **SVG** exports editable text cells with the bundled font and its licence embedded. **Grid data** exports resolved marks, per-cell colours and geometry. These describe the character stage before the final warp, surface finish and after-print overlays. Use PNG/video for the complete finished appearance. Custom marks outside the bundled font may use a system fallback; text export preserves them, but their appearance can vary between systems.

## Warp and finish

Below the treatment controls, **Warp · stage order** offers wave, swirl, mirror fold and pinch. Source → warp → treatment bends the image inside its cells. Source → treatment → warp bends the marks themselves. Animate warp adds a repeatable cycle; wrap edges is optional. Ordinary whole-image movement and texture movement also work with Screen and Characters.

**Surface** adds optional sharpening, horizontal ringing, scanlines and fine noise after the treatment. Bypass the surface to compare. Print's original effects bench remains available in Print; Screen and Characters use their own surface controls. Selective colour treatment belongs to Print.

In Ink, enable a two- or three-colour gradient to expose **Gradient balance & light**. Adjust the middle stop or select a brighter linear-light mix. Layered inks have their own colours in Print bench.

## Deeper layered inks

Print bench adds elliptical halftones and crosshatching, paper fibres and absorption. Each ink has a screen-size multiplier, edge roughness and extra spread, alongside its angle, density and registration. All texture is seeded. Ink plate kits export the ink stage without the additional studio warp/surface stages; export PNG/video for the fully finished composition. Coverage masks remain creative RGB separations rather than calibrated press profiles.

## Explore and keep directions

**Try it → Explore directions** compares four candidates. Choose all families or narrow to classic print, layered inks, luminous screens or characters. Generate repeats a seed from the same starting settings; Surprise me chooses a new seed. Variations stays near the current treatment. Locks take priority over the family choice.

**Preview loop** prepares eight sampled phases of a candidate. Play/Pause controls that comparison only; close the dialog to release it. Apply changes the current treatment; Keep favourite stores a named direction in this project. Save the project to retain up to eight favourites. The comparison is a sampled overview; use the main Play button for the full frame rate.

## Clips, palettes and loop joins

Import a supported local MP4/WebM/MOV, trim it, and choose sampling rate and size. If an audio track is decodable, **Keep selected audio** embeds the same interval in the project. When adding a layer, this replaces the composition's clip soundtrack only if checked. Without it, an existing soundtrack is retained. New compositions start with their selected audio or no soundtrack.

**Move → Clip soundtrack** provides audio playback and removal. Hear soundtrack with Play is optional. MP4/WebM export has an Include clip soundtrack checkbox. Extending the composition pads the end with silence; GIF, PNG sequences and ordinary frame transfers contain no audio. Export audio is trimmed to the composition length. Unsupported device codecs produce an explanation and a silent-export option.

**Clip colours · stability & loop join** distinguishes a fixed palette from per-frame extraction. Adaptive palettes can shimmer; they apply to Print or to Screen/Character palette mapping, not to original RGB or one-ink marks. A gradient uses its authored colours. **Find a shared clip palette** samples eight points across the composition and puts the result in Ink for manual editing. Layered inks use their own authored colours.

Previous-frame blending can soften changing source frames. It is deterministic when seeking and skips very strong cuts, but may cause ghosting; it is not optical flow or motion-compensated diffusion. **Compare loop ends** shows the first and last output frames. End dissolve blends the tail towards the first frame. It helps a join, but does not guarantee seamless movement through an arbitrary clip.

## Working limits

Core work is offline. No account, model or network service is required. Device video/audio codec support still varies.

Clips remain bounded to ¼–12 seconds and up to 288 sampled frames. Import may reduce dimensions to stay within 40 million decoded pixels; the input cap is 250 MB and new embedded PNG data is capped at 64 MB. Video output is opaque, at most 2,048 pixels per edge and four million pixels. These are short creative treatments, not a long-film editor. Use smaller resolution for responsive preview, then increase it for final export; exact-frame export does not depend on real-time playback speed.
