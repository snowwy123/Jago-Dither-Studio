from pathlib import Path
import subprocess,os,json,time,base64
root=Path(__file__).resolve().parents[2]
folder=Path(os.environ.get('JAGO_PROJECT_TEST_WORK',root/'Checks'))/('native-studio-'+time.strftime('%H%M%S'));folder.mkdir(parents=True)
fixture=Path(os.environ.get('DITHER_AUDIO_FIXTURE',root/'Checks/audio-screen.webm'))
code=(root/'Source/Native-probes/screen-character.js').read_text(encoding='utf-8').replace('AUDIO_FIXTURE',json.dumps(base64.b64encode(fixture.read_bytes()).decode()))
(folder/'probe.js').write_text(code,encoding='utf-8')
env=os.environ.copy();env['JAGO_SUITE_ROOT']=str(folder/'Suite');si=subprocess.STARTUPINFO();si.dwFlags=subprocess.STARTF_USESHOWWINDOW;si.wShowWindow=0
subprocess.run([str(root/'Jago-Dither.exe'),'--suite-test',str(folder)],env=env,startupinfo=si,timeout=70,check=True)
result=json.loads((folder/'result.json').read_text(encoding='utf-8-sig'));print(json.dumps({'folder':str(folder),'result':result}));assert result['ok'],result
