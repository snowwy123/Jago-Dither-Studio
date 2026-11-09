from pathlib import Path
import subprocess,json,struct,math,os
from array import array
folder=Path(os.environ.get('JAGO_PROJECT_TEST_WORK',Path(__file__).resolve().parents[2]/'Checks'))
ff=os.environ.get('DITHER_FFMPEG',r'C:\Jago Studio Dev\work\Companion\Media-Verification-Tools\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe')
results=[]
for kind in ['webm','mp4']:
 file=folder/('audio-screen.'+kind)
 raw=subprocess.run([ff,'-v','error','-i',str(file),'-vn','-f','f32le','-ac','1','-ar','48000','-'],capture_output=True,check=True).stdout
 samples=array('f');samples.frombytes(raw)
 rms=math.sqrt(sum(v*v for v in samples)/len(samples));assert .1<rms<.2
 def power(freq,start,end):
  values=samples[int(start*48000):int(end*48000)]
  real=sum(v*math.cos(i*freq*math.tau/48000) for i,v in enumerate(values))
  imag=sum(v*math.sin(i*freq*math.tau/48000) for i,v in enumerate(values))
  return real*real+imag*imag
 assert power(440,.2,.7)>power(880,.2,.7)*100
 assert power(880,1.2,1.7)>power(440,1.2,1.7)*100
 assert abs(len(samples)/48000-2)<.08
 video=subprocess.run([ff,'-v','error','-i',str(file),'-an','-f','rawvideo','-pix_fmt','rgb24','-'],capture_output=True,check=True).stdout
 size=320*240*3;assert len(video)==24*size
 first=video[:size];last=video[-size:]
 assert sum(first[0::3])>sum(first[2::3])*3
 assert sum(last[2::3])>sum(last[0::3])*3
 results.append({'format':kind,'frames':24,'audio_seconds':len(samples)/48000,'rms':rms,'trim':'440 Hz then 880 Hz confirmed independently','colour_cut':'red then blue screen cells'})
(folder/'independent-studio-result.json').write_text(json.dumps({'ok':True,'results':results},indent=2),encoding='utf-8')
print(json.dumps({'ok':True,'results':results}))
