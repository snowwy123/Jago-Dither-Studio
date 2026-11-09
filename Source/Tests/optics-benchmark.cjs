// Local CPU benchmark. Does not promise a frame rate on other computers.
const D=require('../engine.js'),fs=require('node:fs'),path=require('node:path');
const rows=[];
for(const width of [320,720,1024]){
 const height=Math.round(width*.75),data=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)data.set([x/width*255,y/height*255,128,255],(y*width+x)*4);
 for(const kind of ['screen','lens','halo','combined']){
  const optics=kind==='screen'?{}:kind==='lens'?{lensEnabled:true,lensType:'crt'}:kind==='halo'?{halationEnabled:true,protectShadows:true}:{lensEnabled:true,protectShadows:true,halationEnabled:true,textureEnabled:true,maskEnabled:true,target:'saturated',scanEnabled:true,trailsEnabled:true};
  const opts=D.settings({width,studio:{family:'screen',optics}}),times=[];
  for(let n=0;n<4;n++){const start=performance.now();D.render({width,height,data},opts,.3,{trailPhase:.25,trailSource:{width,height,data}});times.push(performance.now()-start);}
  times.shift();times.sort((a,b)=>a-b);rows.push({width,height,kind,median_ms:+times[1].toFixed(2)});
 }
}
const folder=process.env.JAGO_PROJECT_TEST_WORK||path.resolve(__dirname,'../../Checks');fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(path.join(folder,'optics-benchmark.json'),JSON.stringify({local_cpu_only:true,rows},null,2));console.log(JSON.stringify(rows));
