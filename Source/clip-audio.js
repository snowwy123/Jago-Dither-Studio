// SPDX-License-Identifier: MIT
// Bounded, offline audio trim. Decode only the selected interval and commit it
// alongside prepared video frames; project files never depend on a source path.
window.DitherClipAudio = {
  async trim(track, start, seconds, job) {
    const rate = 48000,
      length = Math.ceil(seconds * rate),
      context = new OfflineAudioContext(2, length, rate),
      sink = new Mediabunny.AudioBufferSink(track);
    let count = 0;
    for await (const sample of sink.buffers(start, start + seconds)) {
      if (job.cancelled) throw Error("Import cancelled.");
      const left = Math.max(start, sample.timestamp),
        right = Math.min(
          start + seconds,
          sample.timestamp + sample.buffer.duration,
        );
      if (right <= left) continue;
      const node = context.createBufferSource();
      node.buffer = sample.buffer;
      node.connect(context.destination);
      node.start(left - start, left - sample.timestamp, right - left);
      count++;
    }
    if (!count) return null;
    if (job.cancelled) throw Error("Import cancelled.");
    const buffer = await context.startRendering();
    if (job.cancelled) throw Error("Import cancelled.");
    const bytes = new Uint8Array(44 + length * 4),
      view = new DataView(bytes.buffer),
      text = (at, value) => {
        for (let i = 0; i < value.length; i++)
          bytes[at + i] = value.charCodeAt(i);
      };
    text(0, "RIFF");
    view.setUint32(4, bytes.length - 8, true);
    text(8, "WAVEfmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 2, true);
    view.setUint32(24, rate, true);
    view.setUint32(28, rate * 4, true);
    view.setUint16(32, 4, true);
    view.setUint16(34, 16, true);
    text(36, "data");
    view.setUint32(40, length * 4, true);
    for (let c = 0; c < 2; c++) {
      const channel = buffer.getChannelData(c);
      for (let i = 0; i < length; i++) {
        const n = Math.max(-1, Math.min(1, channel[i]));
        view.setInt16(44 + i * 4 + c * 2, n < 0 ? n * 32768 : n * 32767, true);
      }
    }
    let binary = "";
    for (let i = 0; i < bytes.length; i += 16384)
      binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
    return {
      src: "data:audio/wav;base64," + btoa(binary),
      seconds,
      name: "Clip soundtrack",
    };
  },
  validate(value) {
    if (value === undefined) return undefined;
    if (
      !value ||
      typeof value.src !== "string" ||
      value.src.length > 3100000 ||
      !/^data:audio\/wav;base64,[A-Za-z0-9+/]+={0,2}$/.test(value.src) ||
      !Number.isFinite(value.seconds) ||
      value.seconds < 0.25 ||
      value.seconds > 12.00001
    )
      throw Error("Invalid embedded clip soundtrack.");
    const binary = atob(value.src.slice(22)),
      header = new Uint8Array(44);
    for (let i = 0; i < 44; i++) header[i] = binary.charCodeAt(i);
    const view = new DataView(header.buffer),
      text = (at, n) => binary.slice(at, at + n),
      expected = Math.ceil(value.seconds * 48000) * 4;
    if (
      binary.length !== expected + 44 ||
      text(0, 4) !== "RIFF" ||
      text(8, 8) !== "WAVEfmt " ||
      text(36, 4) !== "data" ||
      view.getUint32(4, true) !== binary.length - 8 ||
      view.getUint32(16, true) !== 16 ||
      view.getUint16(20, true) !== 1 ||
      view.getUint16(22, true) !== 2 ||
      view.getUint32(24, true) !== 48000 ||
      view.getUint16(32, true) !== 4 ||
      view.getUint16(34, true) !== 16 ||
      view.getUint32(40, true) !== expected
    )
      throw Error(
        "Clip soundtracks must be bounded stereo 48 kHz PCM WAV data.",
      );
    return {
      src: value.src,
      seconds: value.seconds,
      name: String(value.name || "Clip soundtrack").slice(0, 120),
    };
  },
  async buffer(value, seconds) {
    const ctx = new OfflineAudioContext(2, Math.ceil(seconds * 48000), 48000),
      bytes = await (await fetch(value.src)).arrayBuffer(),
      decoded = await ctx.decodeAudioData(bytes),
      source = ctx.createBufferSource();
    source.buffer = decoded;
    source.connect(ctx.destination);
    source.start(0);
    return ctx.startRendering();
  },
};
