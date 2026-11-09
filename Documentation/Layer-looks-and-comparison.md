# Looks per layer, comparison and live examples

Dither 1.10 development preview

## Give artwork and lettering different treatments

Open **Layers**, select a layer, then use **Look for this layer**:

- **Follow whole look:** use the main Look controls. This is the default.
- **Keep original colours:** keep this layer free of print, screen and lens treatment. Useful for clean lettering, a logo or a background.
- **Use own look:** open an independent editor for this layer. Treatment, Colour, Light, Lens and Finish have a live selected-layer preview. Apply makes one undo step; Cancel changes nothing.

**Edit layer look** opens the same editor without switching the mode first. **Start from whole look** copies the current main settings into the local editor. It does not change the document until Apply. Invalid values keep Apply disabled until corrected. Saved projects embed the independent settings, source artwork and editable type.

The main Look page is labelled **Whole look · defaults for following layers**. Its shortcut takes you to the selected layer's scope controls. The layer list marks Own look and Original colours, so scope remains visible.

Layer position, scale, rotation and source animation happen before its look. Independent-layer opacity and blend happen afterward, once. Effects can therefore extend around a transformed layer. A lens uses the page coordinates, not a separate cropped lens centred on each object's bounds. Transparent layer areas stay transparent; a character treatment on a separate layer does not paint an opaque full-page background.

Adjacent following layers are treated together. Independent layers split these into separate runs while preserving the stack; a non-normal blend is applied against the lower rendered passes. Consequently, switching one layer to an independent mode can change how neighbouring shared layers are grouped. There is no second global effect pass over the final assembled image. A document with no independent looks retains the established flattened rendering path.

After-print overlays already sit outside treatment and keep their existing stage controls. Independent looks are raster-composited for final output: PNG and video include the complete result; native projects retain the layers. Separate fixed ink plates and character-native grid/TXT/SVG exports require returning layers to Follow whole look. Combined suite transfers retain the native original when requested.

## Compare without losing your place

**Compare ↔** above the canvas opens the Original/Print wipe. Drag the visible handle. Focus it and use arrows for small steps, Shift+arrows for larger steps, or Home/End for the extremes. Click Compare again to return to Print. The existing view selector remains available.

**Inspect detail** opens matching Original and Print crops. Point at a part of the main canvas before opening it to start near that location. Drag either crop to pan both, use arrow keys for exact output-pixel steps, and choose 100%, 200%, 400% or 800%. Centre recentres the crops. The original is scaled to the print's dimensions for a fair comparison; nearest-neighbour drawing keeps enlarged output pixels clear. This is a paused snapshot and never changes exported pixels or the project. Wait for the current render to finish before inspecting.

## Faster editing and better painted selections

**Fast sliders**, beside the whole-look scope label, uses at most 480 pixels while dragging a main slider, then restores the chosen render resolution on release. The setting is remembered locally. It never changes your saved output width, and exports use the requested full resolution. Turn it off to judge fine cells during a drag. The independent layer editor also uses a bounded preview, with more detail for dense screen cells; final output still uses the project resolution.

Painted output selections now fill the spaces between pointer samples. **Undo stroke** or Ctrl+Z inside the mask editor removes the last local stroke; Clear can also be undone. Up to 24 local stroke states are retained. Apply remains one document undo step; Cancel remains non-destructive. The existing 2,048-stamp limit applies.

## Try the live looks

In 1.10.1, open **Explore → Examples → Browse examples**, then choose the **Showcase** collection. All bundled examples now open directly from this gallery. See [Explore examples](Explore-examples.md).


Open **Examples/Live-Looks/Chrome-Bloom-Live.jagodither** or **Acid-Frequency-Live.jagodither**. Press Play. Each has independently treated moving artwork and clean editable text. Open the artwork layer's own look to adjust it, or switch a text layer back to Follow whole look to compare.

The included WebM files are quick 480-pixel previews. Projects open at 720 pixels, run for three seconds at 12 fps and retain their editable settings. Both examples were checked for visible motion, exact matching start/end pixels and identical output after reopening.

Independent passes cost more than one flattened treatment. Large stacks of different effects may need a smaller working resolution. The source-sampling budget is bounded; if an especially complex animated stack exceeds it, the app asks you to lower Render resolution. GPU acceleration and longer streaming videos remain future work.
