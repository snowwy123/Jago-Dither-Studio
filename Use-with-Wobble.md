# A drawing goes to the print table

These steps work with Jago Wobble Studio v1.2.0. You do not need a new Wobble build.

## Wobble to Dither

1. Make or open a loop in Wobble.
2. Export a **PNG sequence ZIP**, at 12 or 24 fps. Use a loop up to 12 seconds.
3. Open Dither. Choose **New** for a fresh composition, or keep the layers already on your page.
4. Under **Layers**, choose **+ Wobble loop** and pick the exported ZIP. You can also drop it onto the preview.
5. Press Play. The imported frames move even with whole-print movement set to **Still print**.
6. Add text or images, choose your inks and experiment.

Your imported loop is an image layer. The rendered drawing and motion from Wobble are baked into those frames. Dither preserves the duration when importing, then plays it once per project loop. Changing Loop length stretches or speeds it up.

The importer keeps at most 288 evenly sampled frames. It reduces frame resolution to stay within its memory budget and tells you the imported size. Keep the original ZIP if you want to work at its original resolution later.

## Dither to Wobble

1. Save a **.jagodither** copy first. That is your editable Dither version.
2. Choose **Export → Wobble project**.
3. Choose a transfer rate. Wobble can hold 48 frames: 24 fps allows 2 seconds, 12 fps allows 4, 6 fps allows 8, or 4 fps allows 12.
4. Tick **Separate ink layers** if you want a named layer for each printing colour. Leave it off for a single layer.
5. Save the **.jago** file and open it in Wobble.
6. Add a drawing layer above the print, or work with the individual ink layers.

The frames are rendered pictures, with extra wiggle switched off. Separate ink layers preserve the finished pixels when shown together. They separate by printing colour, not by your original image or text layers. Text and layers remain editable in your saved Dither project, not inside the transferred picture. Lower transfer rates make the motion more stepped while preserving its duration. If your loop length does not fit an exact number of frames, choose a different rate or adjust the length.

For a single still image, PNG export and image import work between both studios too.

## Play with separate inks

Try hiding one ink for a stripped-back print. Offset a colour layer slightly for a loose screen-print look. Give one ink a gentle layer motion in Wobble while the others stay put, or draw highlights on a new layer above them. The extra layers can make the file larger; lower the transfer rate or print resolution if Wobble's file limit is reached.

## Share the transformation

Choose **Before / after** above the preview and drag the round handle across the picture. In Export, use **What to show** to choose the current split, a side-by-side pair or a moving reveal.

The reveal travels across the picture and back over one loop. GIF and PNG sequences include that movement. PNG saves the reveal at your current timeline position. Wobble transfer always contains the finished print.
