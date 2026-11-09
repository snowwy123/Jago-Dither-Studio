const{chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{const root=path.resolve(__dirname,'../..'),b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage();await p.goto(require('node:url').pathToFileURL(path.join(root,'index.html')).href);await p.waitForFunction(()=>window.appReady);
 const project=JSON.parse(fs.readFileSync(path.join(root,'Examples/Luminous-signal.jagodither'),'utf8'));
 await p.evaluate(async project=>readProject(new File([JSON.stringify(project)],'Signal.jagodither')),project);
 const out=await p.evaluate(async()=>{
  const base=copy(opts),results=[];
  const variants=[['Quiet colour',{protectShadows:true,cellLow:.04,cellHigh:.2,glowLow:.17,glowHigh:.45}],['Curved phosphor',{protectShadows:true,lensEnabled:true,lensType:'crt',lensAmount:.65,scanEnabled:true,scanStrength:.18,halationEnabled:true,halation:.2}],['Fisheye texture',{lensEnabled:true,lensType:'fisheye',lensAmount:.6,textureEnabled:true,textureMethod:'lines',textureStrength:.3,textureAngle:30}]];
  for(const[name,extra]of variants){opts=Dither.settings({...base,studio:{...base.studio,optics:extra}});sourceName=name;phase=.25;sync();const result=await callWorker({type:'render',source:pixelsOf(compose(phase)),opts,phase,context:JagoDitherStudio.contextAt(phase,opts)});const c=makeCanvas(result.width,result.height);c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(result.data),result.width,result.height),0,0);results.push({name,project:projectObject(),png:c.toDataURL()});}
  return results;
 });
 for(const r of out){const name=r.name.replaceAll(' ','-');fs.writeFileSync(path.join(root,'Examples',name+'.jagodither'),JSON.stringify(r.project));fs.writeFileSync(path.join(root,'Examples',name+'.png'),Buffer.from(r.png.split(',')[1],'base64'));}console.log('Created three original editable optics examples.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
