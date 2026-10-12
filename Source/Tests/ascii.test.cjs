// SPDX-License-Identifier: MIT
const {test}=require('node:test');const assert=require('node:assert/strict');const D=require('../engine.js');
function ramp(low=0,high=255){const w=720,h=15,data=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const v=Math.round(low+(high-low)*x/(w-1));data.set([v,v,v,255],(y*w+x)*4);}return {width:w,height:h,data};}
const render=(src,extra={})=>D.render(src,D.settings({method:'ascii',width:720,cell:5,motion:'none',contrast:0,...extra}),0);
test('default ASCII ramp reaches every configured mark from light to dark',()=>{const out=render(ramp()),marks=new Set(out.glyphs);for(const c of ' .:-=+*#%@')assert(marks.has(c),c);assert.equal(out.glyphs[0],'@');assert.equal(out.glyphs[out.width-1],' ');});
test('changed character list removes old glyphs from subsequent output',()=>{const out=render(ramp(),{chars:' .oX'});assert(out.glyphs.every(c=>' .oX'.includes(c)));assert(!out.glyphs.includes('-'));assert(out.glyphs.includes('X'));});
test('optional tonal range gives a pale image access to dense characters',()=>{const src=ramp(175,245),natural=render(src),spread=render(src,{asciiStretch:true});assert(!natural.glyphs.includes('@'));for(const c of '*#%@')assert(spread.glyphs.includes(c),c);});
test('constant tone remains finite and does not manufacture contrast',()=>{assert.deepEqual(render(ramp(200,200),{asciiStretch:true}).glyphs,render(ramp(200,200)).glyphs);});
test('tonal range is validated and older settings keep the original mapping',()=>{assert.equal(D.settings({}).asciiStretch,false);assert.throws(()=>D.settings({asciiStretch:'yes'}));});
