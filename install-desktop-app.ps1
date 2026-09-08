$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$HostProject = Join-Path $Root 'desktop-host\DeepSeekHarness.csproj'
$OutDir = Join-Path $Root 'desktop-dist'
$Exe = Join-Path $OutDir 'DeepSeekHarness.exe'
$Icon = Join-Path $Root 'desktop-host\app.ico'

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
  throw 'dotnet was not found. Install the .NET 10 SDK, then run this script again.'
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
dotnet publish $HostProject -c Release -r win-x64 --self-contained false -o $OutDir
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $Exe)) {
  throw 'Failed to build DeepSeekHarness.exe'
}

function New-AppShortcut([string]$Path) {
  $dir = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($Path)
  $shortcut.TargetPath = $Exe
  $shortcut.WorkingDirectory = $Root
  $shortcut.WindowStyle = 1
  $shortcut.Description = 'DeepSeek Harness'
  if (Test-Path -LiteralPath $Icon) {
    $shortcut.IconLocation = "$Icon,0"
  } else {
    $shortcut.IconLocation = "$Exe,0"
  }
  $shortcut.Save()
}

$desktop = Join-Path ([Environment]::GetFolderPath('Desktop')) 'DeepSeek Harness.lnk'
$startMenu = Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs\DeepSeek Harness.lnk'
New-AppShortcut $desktop
New-AppShortcut $startMenu

Write-Host "Installed DeepSeek Harness as a desktop app."
Write-Host "Desktop shortcut: $desktop"
Write-Host "Start menu shortcut: $startMenu"
Write-Host "Double-click the shortcut to open the app window."
