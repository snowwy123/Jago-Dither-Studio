# Building a look in Dither

For independent layer treatments, linked detail inspection and faster slider previews, see [Layer looks and comparison](Layer-looks-and-comparison.md).

Start in **Look → Treat**. Choose Dither, Halftone, Characters or Screen, then a visible style. Dither and Halftone remember their own pattern size, angle and method when you move between them. The full method list and source preparation remain available below the quick choices.

The five Look pages follow the work: **Treat → Colour → Light → Lens → Finish**. Their navigation and render-resolution selector remain at the top of the sidebar while it scrolls. Move holds animation and clip controls; Layers holds artwork; Explore holds generated alternatives and saved directions.

## Quick starting points

The starting-look menu includes Colour from dark, Saturated colour only, Curved phosphor, Fisheye colour print, Dot poster, Dither + lines and Terminal scanlines. They replace effect settings while keeping your artwork, composition timing and saved directions. Save your editable project to retain the full result.

Use the effect-switch link near the navigation to enable or bypass Treatment, Texture, Inks, Warp, Light, Lens and Finish. **Edit opens controls; the checkbox enables the stage.** Adjusting a bypassed effect does not silently enable it. Bypassing retains its settings. A bare stage with nothing configured is shown as off; enabling empty Light or Finish supplies a starting halo or scanline effect.

## Combine treatments and textures

The main treatment chooses the basic image: dither, halftone, characters or luminous screen cells. Optional **Additional texture** can add dots, ellipses, lines, crosshatch, diamonds or grain over any of these. Its position chooses whether texture belongs to the source before treatment or to the treated surface.

Colour contains the palette/gradient, screen or character colour controls, and overlapping inks. Ink placement has two meanings:

- **Integrated print:** the established layered-ink print renderer supplies the base treatment. Treatment bypass therefore bypasses this integrated result too.
- **After treatment:** an additional ink pass recolours the existing Screen, Characters or ordinary treatment. This allows screen cells, halftone texture and overlapping inks together. Individual plate exports remain available only for the integrated print workflow.

Halftone has direct pattern size, angle and ink-spread controls. In integrated print mode the quick controls edit its actual ink bench; individual ink angles remain in Colour. Extra effects are optional, not replacement radio buttons.

## Colour emerging from darkness

For the reference's luminous colour against black, choose **Colour from dark**, then Screen. In Light, shadow protection separates two soft ranges: where the cells become visible and where their glow begins. Raise the glow threshold to keep dark areas quiet without removing lit cells. The original black cutoff remains a separate fine control.

Halation adds a thresholded, tinted highlight halo. Radius and strength are independent. On transparent artwork it can extend a soft halo outside the cutout; it does not fill the entire image with an opaque backdrop.

**Where the look appears** limits the finished treatment to highlights, saturated colour, picked source colours or a painted selection. Each can be inverted. Softness avoids a hard cut around the selected pixels. This whole-look selection is distinct from the Screen family's own cell/glow thresholds.

Pick colours from Original or use the colour swatches. The optional green selection guide is for inspection only and never enters exported pixels. Painted selection opens a preview of the current finished look: paint to include, erase to remove, adjust brush size/softness, then Apply. Cancel leaves the project untouched; Apply makes one undo step and shows the actual print. Painted coordinates belong to the output frame. Later framing changes may require adjusting the mask.

## Lens and glass

CRT glass, fisheye, barrel and pincushion are deliberately different artistic mappings. Set strength, centre and edge handling. **Source** bends the artwork before its cells are drawn; **Finished screen** also bends the cells and surface. Auto framing fills the frame at zoom 1; lowering manual framing zoom can intentionally reveal the chosen edge fill. Transparent edges stay transparent.

These are creative lens effects, not a camera-calibration tool. Changing output aspect ratio changes the artistic result; inspect the intended export size.

## Scanlines and finishing

Three scanline styles have independent spacing, thickness, softness and strength. Rolling lines animate cyclically when enabled. Fringe, vignette and phosphor trail each have their own checkbox. Fine surface controls retain sharpen, ringing and grain; earlier before-print effects remain in their own disclosure.

Phosphor trail samples one explicit previous processed frame, so seeking to the same time gives the same pixels. It is a controlled short echo, not a simulation with indefinitely accumulating history. For a moving source it uses the neighbouring source frame; animated finishing can also leave a subtle echo on a static source.

## Working comfortably

Use a smaller render resolution while combining costly effects, then raise it for export. Masks, curved glass, inks, glow and trails together cost more than a plain dither. Numeric controls stay focused during edits; new slider gestures produce one undo entry. Original/Print comparison and the nonexported mask guide serve different purposes.

Projects retain all optics, textures, masks and stage switches. PNG and short video exports include the complete visible result. Character TXT/grid/SVG outputs describe the character stage rather than raster lens/glow effects. Combined full-colour suite transfers cannot represent independent fixed ink plates, so they travel as a combined image.

Clips retain their existing bounded short-loop limits: ¼–12 seconds, up to 288 sampled frames, and video output no larger than 2048 pixels per edge or four million pixels. Video output is opaque. This preview adds no network service or new runtime dependency.
