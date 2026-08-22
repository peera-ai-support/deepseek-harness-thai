$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Port = 13080
$AppUrl = "http://127.0.0.1:$Port"
$ProfileDir = Join-Path $env:LOCALAPPDATA 'DeepSeekHarness\chromium-profile'

if (Test-Path (Join-Path $env:APPDATA 'npm')) {
  $env:Path = "$(Join-Path $env:APPDATA 'npm');$env:Path"
}

function Test-AppReady {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $iar = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    $ok = $iar.AsyncWaitHandle.WaitOne(250, $false)
    if ($ok -and $client.Connected) {
      $client.Close()
      return $true
    }
    $client.Close()
    return $false
  } catch {
    return $false
  }
}

function Show-Error([string]$Message) {
  Add-Type -AssemblyName PresentationFramework | Out-Null
  [System.Windows.MessageBox]::Show($Message, 'DeepSeek Harness', 'OK', 'Error') | Out-Null
}

function Get-BrowserPath {
  $candidates = @(
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe"
  )
  foreach ($path in $candidates) {
    if (Test-Path -LiteralPath $path) { return $path }
  }
  return $null
}

$hostExe = Join-Path $Root 'desktop-dist\DeepSeekHarness.exe'
if (Test-Path -LiteralPath $hostExe) {
  Start-Process -FilePath $hostExe -WorkingDirectory $Root
  exit 0
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Show-Error "Node.js was not found. Install Node.js v22.19+ from https://nodejs.org/ then try again."
  exit 1
}

if (-not (Test-AppReady)) {
  if (-not (Test-Path (Join-Path $Root 'node_modules'))) {
    Show-Error "Dependencies are missing. Open the project folder and run pnpm install first."
    exit 1
  }

  $runner = $null
  $built = Join-Path $Root 'apps\cli\lib\bin.js'
  if (Test-Path -LiteralPath $built) {
    $node = Get-Command node -ErrorAction SilentlyContinue
    if ($node) { $runner = "`"$($node.Source)`" `"$built`"" }
  }
  if (-not $runner) {
    $pnpm = $null
    foreach ($name in @('pnpm.cmd', 'pnpm.exe', 'pnpm')) {
      $cmd = Get-Command $name -ErrorAction SilentlyContinue
      if ($cmd) { $pnpm = $cmd.Source; break }
    }
    if (-not $pnpm) {
      Show-Error "node and the built CLI were not found; run pnpm build in the project folder first."
      exit 1
    }
    $runner = "`"$pnpm`" dsh"
  }

  $overlay = Join-Path $Root 'desktop-host\pin-browse-picker.overlay.yml'
  $webArgs = "$runner web"
  if (Test-Path -LiteralPath $overlay) {
    $webArgs = "$webArgs --patch `"$overlay`""
  }
  $webArgs = "$webArgs --port $Port --no-open"
  Start-Process -FilePath 'cmd.exe' -ArgumentList @('/c', $webArgs) -WorkingDirectory $Root -WindowStyle Hidden | Out-Null

  $deadline = (Get-Date).AddSeconds(120)
  do {
    Start-Sleep -Milliseconds 250
    if (Test-AppReady) { break }
  } while ((Get-Date) -lt $deadline)

  if (-not (Test-AppReady)) {
    Show-Error "The DeepSeek Harness server did not start on port $Port."
    exit 1
  }
}

$browser = Get-BrowserPath
if (-not $browser) {
  Start-Process $AppUrl
  exit 0
}

New-Item -ItemType Directory -Force -Path $ProfileDir | Out-Null
Start-Process -FilePath $browser -ArgumentList @(
  "--app=$AppUrl",
  "--user-data-dir=$ProfileDir",
  '--no-first-run',
  '--no-default-browser-check',
  '--window-size=1360,880'
)
