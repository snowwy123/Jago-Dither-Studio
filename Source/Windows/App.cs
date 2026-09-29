// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Cameron Jago Lis Illustrates.
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

[assembly: AssemblyTitle("Jago Dither Studio")]
[assembly: AssemblyProduct("Jago Dither Studio")]
[assembly: AssemblyCompany("Cameron Jago Lis Illustrates")]
[assembly: AssemblyCopyright("Copyright (c) 2026 Cameron Jago Lis Illustrates")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]
static class Program
{
    internal static string Root, Files, Test;
    [DllImport("kernel32.dll", CharSet=CharSet.Unicode)]
    static extern bool SetDllDirectory(string path);
    [STAThread]
    static void Main(string[] args)
    {
        try
        {
            Test = args.Length==2 && args[0]=="--self-test" ? Path.GetFullPath(args[1]) : null;
            Root = Test ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Jago Dither Studio");
            string version;
            using(var sha=SHA256.Create()) using(var stream=File.OpenRead(Assembly.GetExecutingAssembly().Location))
                version=BitConverter.ToString(sha.ComputeHash(stream)).Replace("-", "").Substring(0,16);
            Files=Path.Combine(Root,"Application",version);
            Directory.CreateDirectory(Files);
            foreach(string name in new[]{"index.html","Microsoft.Web.WebView2.Core.dll","Microsoft.Web.WebView2.WinForms.dll","WebView2Loader.dll","WebView2-LICENSE.txt","WebView2-NOTICE.txt"}) {
                if(File.Exists(Path.Combine(Files,name)))continue;
                using(var input=Assembly.GetExecutingAssembly().GetManifestResourceStream("Dither."+name))
                using(var output=File.Create(Path.Combine(Files,name))) input.CopyTo(output);
            }
            AppDomain.CurrentDomain.AssemblyResolve+=(s,e)=>{
                string file=Path.Combine(Files,new AssemblyName(e.Name).Name+".dll");
                return File.Exists(file)?Assembly.LoadFrom(file):null;
            };
            SetDllDirectory(Files);
            Start();
        }
        catch(Exception e)
        {
            if(Test!=null){Directory.CreateDirectory(Test);File.WriteAllText(Path.Combine(Test,"result.txt"),"FAIL: "+e);}
            else MessageBox.Show("The Windows app could not start. Please check Microsoft WebView2 Runtime is installed, or open Jago-Dither-Studio.html in your browser.\n\n"+e.Message,"Jago Dither Studio");
        }
    }
    [MethodImpl(MethodImplOptions.NoInlining)]
    static void Start(){Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);Application.Run(new PrintWindow());}
}
sealed class PrintWindow:Form
{
    WebView2 browser=new WebView2();
    bool ready, closing, testing;
    public PrintWindow()
    {
        Text="Jago Dither Studio";ClientSize=new Size(1360,900);MinimumSize=new Size(800,620);
        Icon=Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location);
        browser.Dock=DockStyle.Fill;Controls.Add(browser);Shown+=async(s,e)=>await Initialise();
        FormClosing+=async(s,e)=>{
            if(closing||!ready||Program.Test!=null)return;
            e.Cancel=true;
            try{
                string unsaved=await browser.CoreWebView2.ExecuteScriptAsync("document.activeElement?.blur(); pendingProjectSave ? 'saving' : checkUnsaved()");
                if(unsaved=="\"saving\""){MessageBox.Show(this,"Please let the current save finish before closing.","Saving project");return;}
                if(unsaved=="true" && MessageBox.Show(this,"There are unsaved changes. Close the studio anyway?","Save your print first",MessageBoxButtons.YesNo,MessageBoxIcon.Question)!=DialogResult.Yes)return;
                closing=true;Close();
            }catch{closing=true;Close();}
        };
    }
    async Task Initialise()
    {
        try{
            var env=await CoreWebView2Environment.CreateAsync(null,Path.Combine(Program.Root,"Profile"));
            await browser.EnsureCoreWebView2Async(env);
            var core=browser.CoreWebView2;
            core.SetVirtualHostNameToFolderMapping("jagodither.example",Program.Files,CoreWebView2HostResourceAccessKind.DenyCors);
            core.Settings.IsStatusBarEnabled=false;
            core.NavigationStarting+=(s,e)=>{if(!e.Uri.StartsWith("https://jagodither.example/",StringComparison.OrdinalIgnoreCase)&&e.Uri!="about:blank")e.Cancel=true;};
            core.NewWindowRequested+=(s,e)=>{
                e.Handled=true;
                if(e.IsUserInitiated && (e.Uri=="https://cameronjagolis.co.uk/" || e.Uri=="https://ko-fi.com/cameronillustrates"))
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(e.Uri){UseShellExecute=true});
            };
            core.PermissionRequested+=(s,e)=>{
                if(e.Uri.StartsWith("https://jagodither.example/",StringComparison.OrdinalIgnoreCase) &&
                   e.PermissionKind==CoreWebView2PermissionKind.MultipleAutomaticDownloads)
                    e.State=CoreWebView2PermissionState.Allow;
            };
            core.DownloadStarting+=(s,e)=>{
                var operation=e.DownloadOperation;
                bool project=Path.GetExtension(e.ResultFilePath).Equals(".jagodither",StringComparison.OrdinalIgnoreCase),reported=false;
                Action<bool> report=ok=>{
                    if(!project||reported)return;
                    reported=true;
                    core.PostWebMessageAsJson("{\"type\":\"project-save\",\"url\":\""+operation.Uri.Replace("\\","\\\\").Replace("\"","\\\"")+"\",\"ok\":"+(ok?"true":"false")+"}");
                };
                operation.StateChanged+=(sender,args)=>{
                    if(operation.State==CoreWebView2DownloadState.Completed)report(true);
                    else if(operation.State==CoreWebView2DownloadState.Interrupted)report(false);
                };
                e.Handled=true;
                var deferral=e.GetDeferral();
                // Leave WebView's callback before showing the Windows dialog.
                BeginInvoke(new Action(()=>{
                    try{
                        string name=Path.GetFileName(e.ResultFilePath);
                        if(Program.Test!=null){
                            File.AppendAllText(Path.Combine(Program.Test,"downloads.txt"),name+"\n");
                            if(name.StartsWith("Cancel")){e.Cancel=true;report(false);}
                            else e.ResultFilePath=Path.Combine(Program.Test,name);
                            return;
                        }
                        using(var dialog=new SaveFileDialog()){
                            dialog.FileName=name;dialog.OverwritePrompt=true;dialog.AddExtension=true;
                            dialog.DefaultExt=Path.GetExtension(name).TrimStart('.');
                            if(dialog.ShowDialog(this)==DialogResult.OK)e.ResultFilePath=dialog.FileName;
                            else {e.Cancel=true;report(false);}
                        }
                    }catch(Exception error){
                        e.Cancel=true;report(false);
                        if(Program.Test!=null)Finish("FAIL: "+error.Message);
                        else MessageBox.Show(this,"The file could not be saved.\n\n"+error.Message,Text);
                    }finally{deferral.Complete();}
                }));
            };
            core.ProcessFailed+=(s,e)=>{if(Program.Test!=null)Finish("FAIL: WebView2 process stopped");};
            core.NavigationCompleted+=async(s,e)=>{
                if(!e.IsSuccess){if(Program.Test!=null)Finish("FAIL: Navigation "+e.WebErrorStatus);return;}
                ready=true;
                if(Program.Test!=null&&!testing){testing=true;await CheckApp();}
            };
            core.Navigate("https://jagodither.example/index.html");
        }catch(Exception e){if(Program.Test!=null)Finish("FAIL: "+e);else MessageBox.Show(this,"Please install Microsoft WebView2 Runtime or use the included HTML app.\n\n"+e.Message,Text);}
    }
    async Task CheckApp()
    {
        try{
            for(int i=0;i<120;i++){
                if(await browser.CoreWebView2.ExecuteScriptAsync("!!window.appReady && !!latest && !rendering")=="true")break;
                await Task.Delay(250);
            }
            string result=await browser.CoreWebView2.ExecuteScriptAsync("(()=>{if(!window.appReady||!latest)throw Error('No preview');return {ready:true,width:resultCanvas.width,height:resultCanvas.height,styles:Dither.methods.length};})()");
            File.WriteAllText(Path.Combine(Program.Test,"startup.json"),result);
            if(!result.Contains("\"ready\":true"))throw new Exception("Startup check failed: "+result);
            using(var shot=File.Create(Path.Combine(Program.Test,"preview.png")))await browser.CoreWebView2.CapturePreviewAsync(CoreWebView2CapturePreviewImageFormat.Png,shot);
            await browser.CoreWebView2.ExecuteScriptAsync("opts.motion='ripple';opts.width=320;opts.seconds=1;opts.fps=6;sync();requestPrint();window.desktopProbe='running';(async()=>{const out=await callWorker({type:'render',source:pixelsOf(compose(.25)),opts,phase:.25});if(out.data.length!==out.width*out.height*4)throw Error('Frame mismatch');const c=document.createElement('canvas');paintOutput(c,out,1);const gif=new GIFWriter(c.width,c.height);gif.add(c.getContext('2d').getImageData(0,0,c.width,c.height).data,1/6,false);if((await gif.finish().arrayBuffer()).byteLength<50)throw Error('GIF empty');window.desktopProbe='PASS';})().catch(e=>window.desktopProbe='FAIL: '+e.message)");
            string probe="";
            for(int i=0;i<120;i++){probe=await browser.CoreWebView2.ExecuteScriptAsync("window.desktopProbe");if(probe!="\"running\"")break;await Task.Delay(100);}
            if(probe!="\"PASS\"")throw new Exception(probe);
            string overlayCheck=await browser.CoreWebView2.ExecuteScriptAsync("(()=>{addOverlay();const l=selectedLayer();validateScene(scene,assets);const render=t=>{const c=makeCanvas(320,240);paintAfterOverlays(c,t);return c.toDataURL();};if(render(0)!==render(1)||render(0)===render(.25))return 'FAIL';return projectObject().version===4?'PASS':'FAIL';})()");
            if(overlayCheck!="\"PASS\"")throw new Exception("Overlay animation or project validation failed");
            await browser.CoreWebView2.ExecuteScriptAsync("sourceName='Saved-native-check';opts.contrast=21;remember();saveProject();");
            for(int i=0;i<120;i++){
                string state=await browser.CoreWebView2.ExecuteScriptAsync("!pendingProjectSave && !checkUnsaved()");
                if(state=="true")break;
                if(i==119)throw new Exception("Native save did not clear the close warning");
                await Task.Delay(100);
            }
            if(!File.Exists(Path.Combine(Program.Test,"Saved-native-check.jagodither")))throw new Exception("Project download missing");
            await browser.CoreWebView2.ExecuteScriptAsync("sourceName='Cancel-native-check';remember();");
            await browser.CoreWebView2.CallDevToolsProtocolMethodAsync("Runtime.evaluate","{\"expression\":\"saveProject()\",\"userGesture\":true}");
            for(int i=0;i<120;i++){
                string state=await browser.CoreWebView2.ExecuteScriptAsync("!pendingProjectSave && checkUnsaved()");
                if(state=="true")break;
                if(i==119)throw new Exception("Cancelled save state: "+await browser.CoreWebView2.ExecuteScriptAsync("JSON.stringify({pending:!!pendingProjectSave,dirty:checkUnsaved(),name:sourceName})"));
                await Task.Delay(100);
            }
            Finish("PASS: native startup, worker, motion, overlays, GIF, completed save and cancelled save.");

        }catch(Exception e){Finish("FAIL: "+e);}
    }
    void Finish(string text){File.WriteAllText(Path.Combine(Program.Test,"result.txt"),text);closing=true;Close();}
}
