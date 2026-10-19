// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Cameron Jago Lis Illustrates.
// GIF and ZIP writers shared with Jago Wobble Studio.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function quantizeRGBA(rgba) {
  const hist = new Map();
  // Sample a bounded number of pixels, preserving exact mean colours in each bucket.
  const stride = Math.max(1, Math.floor(rgba.length / 4 / 90000));
  for (let i = 0; i < rgba.length; i += 4 * stride) {
    if (rgba[i + 3] < 16) continue;
    const r = rgba[i],
      g = rgba[i + 1],
      b = rgba[i + 2],
      key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    let a = hist.get(key);
    if (!a) hist.set(key, (a = { n: 0, r: 0, g: 0, b: 0 }));
    a.n++;
    a.r += r;
    a.g += g;
    a.b += b;
  }
  const values = [...hist.values()].map((a) => ({
    n: a.n,
    r: a.r / a.n,
    g: a.g / a.n,
    b: a.b / a.n
  }));
  function box(v) {
    const min = [255, 255, 255],
      max = [0, 0, 0];
    let n = 0;
    for (const p of v) {
      n += p.n;
      ['r', 'g', 'b'].forEach((k, i) => {
        min[i] = Math.min(min[i], p[k]);
        max[i] = Math.max(max[i], p[k]);
      });
    }
    const ranges = max.map((a, i) => a - min[i]);
    return { v, n, ranges, score: Math.max(...ranges) * Math.sqrt(n) };
  }
  let boxes = values.length ? [box(values)] : [box([{ n: 1, r: 0, g: 0, b: 0 }])];
  while (boxes.length < 255) {
    let selected = -1,
      best = -1;
    boxes.forEach((b, i) => {
      if (b.v.length > 1 && b.score > best) {
        best = b.score;
        selected = i;
      }
    });
    if (selected < 0) break;
    const b = boxes[selected],
      axis = ['r', 'g', 'b'][b.ranges.indexOf(Math.max(...b.ranges))];
    b.v.sort((p, q) => p[axis] - q[axis]);
    let n = 0,
      split = 1;
    for (let i = 0; i < b.v.length - 1; i++) {
      n += b.v[i].n;
      split = i + 1;
      if (n >= b.n / 2) break;
    }
    boxes.splice(selected, 1, box(b.v.slice(0, split)), box(b.v.slice(split)));
  }
  const palette = new Uint8Array(768),
    colours = [];
  boxes.forEach((b, i) => {
    const rgb = ['r', 'g', 'b'].map((k) =>
      Math.round(b.v.reduce((a, p) => a + p[k] * p.n, 0) / b.n)
    );
    palette.set(rgb, (i + 1) * 3);
    colours.push(rgb);
  });
  const lookup = new Int16Array(32768);
  lookup.fill(-1);
  const indices = new Uint8Array(rgba.length / 4);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    if (rgba[i + 3] < 16) {
      indices[j] = 0;
      continue;
    }
    const r = rgba[i],
      g = rgba[i + 1],
      b = rgba[i + 2],
      key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let idx = lookup[key];
    if (idx < 0) {
      let distance = Infinity;
      colours.forEach((c, k) => {
        const d = (r - c[0]) ** 2 * 0.3 + (g - c[1]) ** 2 * 0.59 + (b - c[2]) ** 2 * 0.11;
        if (d < distance) {
          distance = d;
          idx = k + 1;
        }
      });
      lookup[key] = idx;
    }
    indices[j] = idx;
  }
  return { palette, indices };
}

function printGIFColours(settings){if(!settings.riso.enabled)return Dither.inkColours(settings);const paper=[1,3,5].map(i=>parseInt(settings.riso.paper.slice(i,i+2),16)),inks=settings.riso.inks.filter(i=>i.enabled).map(i=>[1,3,5].map(n=>parseInt(i.colour.slice(n,n+2),16))),colours=[];for(let mask=0;mask<1<<inks.length;mask++){const c=paper.slice();inks.forEach((ink,i)=>{if(mask&(1<<i))for(let n=0;n<3;n++)c[n]*=ink[n]/255;});colours.push('#'+c.map(n=>Math.round(n).toString(16).padStart(2,'0')).join(''));}return colours;}
function fixedGIFPalette(colours){const list=[],seen=new Set();const add=c=>{const key=c.join(',');if(!seen.has(key)&&list.length<255){seen.add(key);list.push(c);}};for(const hex of colours)add([1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));for(let r=0;r<6;r++)for(let g=0;g<6;g++)for(let b=0;b<6;b++)add([r*51,g*51,b*51]);const palette=new Uint8Array(768);list.forEach((c,i)=>palette.set(c,(i+1)*3));return{palette,colours:list,lookup:new Map()};}
function quantizeFixedRGBA(rgba,fixed){const indices=new Uint8Array(rgba.length/4);for(let p=0;p<indices.length;p++){const at=p*4;if(rgba[at+3]<16)continue;const key=(rgba[at]<<16)|(rgba[at+1]<<8)|rgba[at+2];let nearest=fixed.lookup.get(key);if(nearest===undefined){let distance=Infinity;fixed.colours.forEach((c,i)=>{const d=(rgba[at]-c[0])**2*.3+(rgba[at+1]-c[1])**2*.59+(rgba[at+2]-c[2])**2*.11;if(d<distance){distance=d;nearest=i+1;}});if(fixed.lookup.size<65536)fixed.lookup.set(key,nearest);}indices[p]=nearest;}return{palette:fixed.palette,indices};}
function lzwEncode(indices) {
  const bytes = [];
  let accum = 0,
    bitCount = 0,
    bits = 9,
    next = 258,
    dict = new Map();
  const write = (code) => {
    accum |= code << bitCount;
    bitCount += bits;
    while (bitCount >= 8) {
      bytes.push(accum & 255);
      accum >>>= 8;
      bitCount -= 8;
    }
  };
  write(256);
  if (indices.length) {
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i],
        key = prefix * 256 + k,
        found = dict.get(key);
      if (found !== undefined) {
        prefix = found;
        continue;
      }
      write(prefix);
      if (next < 4096) {
        dict.set(key, next++);
        if (next > 1 << bits && bits < 12) bits++;
      } else {
        write(256);
        dict = new Map();
        next = 258;
        bits = 9;
      }
      prefix = k;
    }
    write(prefix);
  }
  write(257);
  if (bitCount) bytes.push(accum & 255);
  return new Uint8Array(bytes);
}

class GIFWriter {
  constructor(w, h, palette = null) {
    this.fixedPalette=palette;
    this.chunks = [];
    this.w = w;
    this.h = h;
    this.push([
      ...Array.from('GIF89a', (c) => c.charCodeAt(0)),
      w & 255,
      w >> 8,
      h & 255,
      h >> 8,
      0x70,
      0,
      0,
      0x21,
      0xff,
      11,
      ...Array.from('NETSCAPE2.0', (c) => c.charCodeAt(0)),
      3,
      1,
      0,
      0,
      0
    ]);
  }
  push(a) {
    this.chunks.push(a instanceof Uint8Array ? a : new Uint8Array(a));
  }
  add(rgba, delay, transparent) {
    const { palette, indices } = this.fixedPalette?quantizeFixedRGBA(rgba,this.fixedPalette):quantizeRGBA(rgba),
      cs = clamp(Math.round(delay * 100), 2, 65535);
    this.push([
      0x21,
      0xf9,
      4,
      transparent ? 9 : 8,
      cs & 255,
      cs >> 8,
      0,
      0,
      0x2c,
      0,
      0,
      0,
      0,
      this.w & 255,
      this.w >> 8,
      this.h & 255,
      this.h >> 8,
      0x87
    ]);
    this.push(palette);
    this.push([8]);
    const data = lzwEncode(indices);
    for (let i = 0; i < data.length; i += 255) {
      const slice = data.subarray(i, i + 255);
      this.push([slice.length]);
      this.push(slice);
    }
    this.push([0]);
  }
  finish() {
    this.push([0x3b]);
    return new Blob(this.chunks, { type: 'image/gif' });
  }
}

// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Cameron Jago Lis Illustrates.
// A stored ZIP keeps PNG frames together without recompressing each image.

const zipCrcTable = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});

function zipCrc(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = zipCrcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

class PNGSequenceZip {
  constructor() {
    this.parts = [];
    this.directory = [];
    this.offset = 0;
    this.count = 0;
  }
  add(name, bytes) {
    const filename = new TextEncoder().encode(name),
      crc = zipCrc(bytes),
      header = new Uint8Array(30 + filename.length),
      v = new DataView(header.buffer);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x800, true);
    v.setUint16(12, 33, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, bytes.length, true);
    v.setUint32(22, bytes.length, true);
    v.setUint16(26, filename.length, true);
    header.set(filename, 30);
    const centre = new Uint8Array(46 + filename.length),
      d = new DataView(centre.buffer);
    d.setUint32(0, 0x02014b50, true);
    d.setUint16(4, 20, true);
    d.setUint16(6, 20, true);
    d.setUint16(8, 0x800, true);
    d.setUint16(14, 33, true);
    d.setUint32(16, crc, true);
    d.setUint32(20, bytes.length, true);
    d.setUint32(24, bytes.length, true);
    d.setUint16(28, filename.length, true);
    d.setUint32(42, this.offset, true);
    centre.set(filename, 46);
    if (this.offset + header.length + bytes.length > 256 * 1024 * 1024)
      throw Error('This sequence exceeds 256 MB. Use a smaller export size or lower frame rate.');
    this.parts.push(header, bytes);
    this.directory.push(centre);
    this.offset += header.length + bytes.length;
    this.count++;
  }
  finish() {
    const size = this.directory.reduce((n, p) => n + p.length, 0),
      end = new Uint8Array(22),
      v = new DataView(end.buffer);
    v.setUint32(0, 0x06054b50, true);
    v.setUint16(8, this.count, true);
    v.setUint16(10, this.count, true);
    v.setUint32(12, size, true);
    v.setUint32(16, this.offset, true);
    return new Blob([...this.parts, ...this.directory, end], { type: 'application/zip' });
  }
}
