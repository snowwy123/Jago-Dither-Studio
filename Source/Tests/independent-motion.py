from pathlib import Path
import subprocess,json,zipfile,struct,re,os
from PIL import Image
b=Path(os.environ.get('JAGO_PROJECT_TEST_WORK',r'C:\Jago Studio Dev\work\Dither-motion-checks'));ff=os.environ.get('DITHER_FFMPEG',r'C:\Jago Studio Dev\work\Companion\Media-Verification-Tools\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe');checks=[]
for kind in ['webm','mp4']:
 p=subprocess.run([ff,'-hide_banner','-loglevel','error','-i',str(b/('clip.'+kind)),'-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True,check=True)
 framebytes=320*240*3;assert len(p.stdout)==24*framebytes,(kind,len(p.stdout));first=p.stdout[(100*320+150)*3:][:3];last=p.stdout[23*framebytes+(100*320+150)*3:][:3];assert first[0]>180 and first[2]<60,(kind,first);assert last[2]>180 and last[0]<60,(kind,last)
 for frame in range(24):
  pixel=p.stdout[frame*framebytes+(100*320+150)*3:][:3]
  assert (pixel[0]>180 and pixel[2]<60) if frame<18 else (pixel[2]>180 and pixel[0]<60),(kind,frame,pixel)
 probe=subprocess.run([ff,'-hide_banner','-i',str(b/('clip.'+kind)),'-f','null','-'],capture_output=True,text=True,check=True);assert '00:00:02.00' in probe.stderr and 'frame=   24' in probe.stderr;checks.append(kind.upper()+' independently decodes to 24 frames / 2 seconds with the expected source cut')
im=Image.open(b/'clip.gif');duration=0
for n in range(im.n_frames):im.seek(n);duration+=im.info.get('duration',0)
assert im.n_frames==24 and duration==2000,(im.n_frames,duration);checks.append('GIF independently decodes to 24 frames with 2000 ms total duration')
data=(b/'clip.gif').read_bytes();at=13;tables=[]
if data[10]&128:at+=3*(1<<((data[10]&7)+1))
while at<len(data):
 tag=data[at];at+=1
 if tag==0x3b:break
 if tag==0x21:at+=1
 elif tag==0x2c:
  packed=data[at+8];at+=9
  if packed&128:
   size=3*(1<<((packed&7)+1));tables.append(data[at:at+size]);at+=size
  at+=1
 else:raise AssertionError('Invalid GIF record')
 while data[at]:at+=1+data[at]
 at+=1
assert len(tables)==24 and len(set(tables))==1;checks.append('GIF uses the same colour table for every frame')
with zipfile.ZipFile(b/'clip.zip')as z:
 assert z.testzip() is None;timing=json.loads(z.read('timing.json'));assert len(timing['frames'])==24 and abs(sum(f['duration']for f in timing['frames'])-2)<1e-8
 for f in timing['frames']:
  from io import BytesIO
  im=Image.open(BytesIO(z.read(f['file'])));assert im.size==(320,240);im.load()
checks.append('PNG sequence has 24 valid images, consistent dimensions, exact duration and a valid ZIP')
(b/'independent-result.json').write_text(json.dumps({'ok':True,'checks':checks},indent=2));print(json.dumps({'ok':True,'checks':checks}))
