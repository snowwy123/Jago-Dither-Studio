// Original showcase sources with editable type and independent animated artwork looks.
const{chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{const root=path.resolve(__dirname,'../..'),folder=path.join(root,'Examples/Live-Looks');fs.mkdirSync(folder,{recursive:true});const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({acceptDownloads:true,viewport:{width:1440,height:1000}}),records=[];await p.goto(require('node:url').pathToFileURL(path.join(root,'index.html')).href);await p.waitForFunction(()=>window.appReady&&window.JagoDitherLayers);
 for(const [source,name]of [['Chrome-Bloom','Chrome-Bloom-Live'],['Acid-Frequency','Acid-Frequency-Live']]){
  const project=JSON.parse(fs.readFileSync(path.join(root,'Examples/Showcase',source+'.jagodither'),'utf8'));
  await p.evaluate(async({project,name})=>{
   await readProject(new File([JSON.stringify(project)],name+'.jagodither'));sourceName=name;opts=Dither.settings({...opts,width:720,seconds:3,fps:12});
   const art=scene.layers.find(l=>l.kind==='image'),look=copy(opts);art.motion='pulse';art.amount=3;
   if(name.startsWith('Chrome')){look.studio.warp='wave';look.studio.warpAmount=3;look.studio.warpScale=1.2;look.studio.warpAnimate=true;Object.assign(look.studio.optics,{scanEnabled:true,scanRoll:true,scanStrength:.15,trailsEnabled:true,trails:.24});}
   else{look.motion='drift';look.amount=4;look.studio.warp='swirl';look.studio.warpAmount=8;look.studio.warpAnimate=true;}
   art.look={mode:'custom',settings:Dither.settings(look)};for(const l of scene.layers)if(l.kind==='text')l.look={mode:'original'};
   scene.active=art.id;composingKey='';phase=.25;refreshSource(phase);sync();requestPrint();
  },{project,name});await p.waitForFunction(()=>!rendering&&!pending);
  const result=await p.evaluate(async()=>{
   const a=await callWorker({type:'render',source:pixelsOf(compose(.25)),opts,phase:.25}),next=await callWorker({type:'render',source:pixelsOf(compose(.5)),opts,phase:.5});if(a.data.every((v,i)=>v===next.data[i]))throw Error('Loop has no visible motion');
   const doc=JSON.stringify(projectObject());await readProject(new File([doc],'live.jagodither'));const restored=await callWorker({type:'render',source:pixelsOf(compose(.25)),opts,phase:.25});if(!a.data.every((v,i)=>v===restored.data[i]))throw Error('Loop changed after reopen');
   const c=makeCanvas(1,1);paintOutput(c,a,1,.25);return{project:doc,png:c.toDataURL()};
  });fs.writeFileSync(path.join(folder,name+'.jagodither'),result.project);fs.writeFileSync(path.join(folder,name+'.png'),Buffer.from(result.png.split(',')[1],'base64'));
  const download=p.waitForEvent('download',{timeout:60000});await p.evaluate(()=>{opts.width=480;sync();$('exportFormat').value='webm';$('exportScale').value='1';$('exportView').value='print';$('exportDialog').showModal();return exportPrint();});await(await download).saveAs(path.join(folder,name+'.webm'));records.push({name,save_reopen_pixels:true,moving_frames:true,preview:'480px / 3 seconds / 12fps'});
 }
 fs.writeFileSync(path.join(folder,'Validation.json'),JSON.stringify({ok:true,examples:records},null,2));console.log(JSON.stringify({ok:true,records}));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
