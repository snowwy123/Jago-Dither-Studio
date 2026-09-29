# SPDX-License-Identifier: MIT
# Copyright (c) 2026 Cameron Jago Lis Illustrates.
param([string]$SdkDirectory)
$ErrorActionPreference='Stop'
$suiteRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$sdk=Join-Path $PSScriptRoot '.sdk\WebView2'
if ($SdkDirectory) { $sdk=[IO.Path]::GetFullPath($SdkDirectory) }
if (-not (Test-Path -LiteralPath (Join-Path $sdk 'lib\net462\Microsoft.Web.WebView2.Core.dll'))) {
    $cache=Join-Path $PSScriptRoot '.sdk'
    [IO.Directory]::CreateDirectory($cache) | Out-Null
    $archive=Join-Path $cache 'WebView2.zip'
    [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -UseBasicParsing -Uri 'https://api.nuget.org/v3-flatcontainer/microsoft.web.webview2/1.0.4191.47/microsoft.web.webview2.1.0.4191.47.nupkg' -OutFile $archive
    Expand-Archive -LiteralPath $archive -DestinationPath $sdk -Force
}
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$compileArgs=@('/nologo','/target:winexe','/platform:x64','/optimize+','/utf8output',
    ('/out:'+(Join-Path $suiteRoot 'Jago-Dither-Studio.exe')),
    ('/win32icon:'+(Join-Path $PSScriptRoot 'studio.ico')),
    ('/win32manifest:'+(Join-Path $PSScriptRoot 'app.manifest')),
    '/reference:System.dll','/reference:System.Core.dll','/reference:System.Drawing.dll','/reference:System.Windows.Forms.dll',
    ('/reference:'+(Join-Path $sdk 'lib\net462\Microsoft.Web.WebView2.Core.dll')),
    ('/reference:'+(Join-Path $sdk 'lib\net462\Microsoft.Web.WebView2.WinForms.dll')))
$resources=@{
    'index.html'=(Join-Path $suiteRoot 'index.html');
    'Microsoft.Web.WebView2.Core.dll'=(Join-Path $sdk 'lib\net462\Microsoft.Web.WebView2.Core.dll');
    'Microsoft.Web.WebView2.WinForms.dll'=(Join-Path $sdk 'lib\net462\Microsoft.Web.WebView2.WinForms.dll');
    'WebView2Loader.dll'=(Join-Path $sdk 'runtimes\win-x64\native\WebView2Loader.dll');
    'WebView2-LICENSE.txt'=(Join-Path $sdk 'LICENSE.txt');
    'WebView2-NOTICE.txt'=(Join-Path $sdk 'NOTICE.txt')
}
foreach($name in $resources.Keys){$compileArgs+='/resource:'+$resources[$name]+',Dither.'+$name}
$compileArgs+=(Join-Path $PSScriptRoot 'App.cs')
& $compiler @compileArgs
if($LASTEXITCODE -ne 0){throw 'Windows build failed.'}
Write-Output 'Windows app rebuilt.'
