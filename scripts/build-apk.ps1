# Gera o APK assinado localmente (Windows).
# O caminho da pasta tem "!" ("GO, JULLS!"), que quebra o Gradle/Java ("!/" é separador de .jar).
# Por isso o build roda por uma junction sem "!": %USERPROFILE%\gojulls -> esta pasta.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$link = Join-Path $env:USERPROFILE 'gojulls'
if (-not (Test-Path $link)) { New-Item -ItemType Junction -Path $link -Target $root | Out-Null }

if (-not $env:JAVA_HOME) { $env:JAVA_HOME = (Get-ChildItem "$env:USERPROFILE\devtools" -Directory -Filter 'jdk-17*' | Select-Object -First 1).FullName }
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk" }
$env:Path = "$env:JAVA_HOME\bin;$env:Path"

Set-Location $root
npm run build; if (-not $?) { exit 1 }
npx cap sync android; if (-not $?) { exit 1 }
Set-Location (Join-Path $link 'android')
.\gradlew.bat assembleRelease --no-daemon; if (-not $?) { exit 1 }

$version = (Get-Content (Join-Path $link 'package.json') | ConvertFrom-Json).version
New-Item -ItemType Directory -Force (Join-Path $link 'release') | Out-Null
Copy-Item "app\build\outputs\apk\release\go-julls-v$version.apk" (Join-Path $link 'release') -Force
Write-Host "APK: release\go-julls-v$version.apk"
