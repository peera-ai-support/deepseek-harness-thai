@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title DeepSeek Harness - Desktop App

echo ===================================================
echo   DeepSeek Harness (dsh) - Desktop App Launcher
echo ===================================================
echo.

if exist "%APPDATA%\npm" (
    set "PATH=%APPDATA%\npm;%PATH%"
)

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in PATH.
    echo Please install Node.js ^(v22.19+ or v24+^) from https://nodejs.org/
    pause
    exit /b 1
)

:: Check dependencies
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call pnpm install
)

:: Check .env
if not exist ".env" (
    echo [WARNING] .env file not found. Creating from .env.example...
    copy ".env.example" ".env" >nul
)

if exist "desktop-dist\DeepSeekHarness.exe" (
    echo [INFO] Opening DeepSeek Harness desktop window...
    start "" "%~dp0desktop-dist\DeepSeekHarness.exe"
    exit /b 0
)

set PORT=13080
set APP_URL=http://127.0.0.1:%PORT%

:: Find Browser for Standalone Window Mode
set BROWSER_CMD=
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_CMD=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_CMD=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_CMD=C:\Program Files\Google\Chrome\Application\chrome.exe"
)

echo [INFO] Starting Backend Server on port %PORT%...
if exist "%~dp0apps\cli\lib\bin.js" (
    echo [INFO] Starting Backend Server on port %PORT% (built)...
    if exist "%~dp0desktop-host\pin-browse-picker.overlay.yml" (
        start /b "" node "%~dp0apps\cli\lib\bin.js" web --patch "%~dp0desktop-host\pin-browse-picker.overlay.yml" --port %PORT% --no-open
    ) else (
        start /b "" node "%~dp0apps\cli\lib\bin.js" web --port %PORT% --no-open
    )
) else (
    echo [INFO] Starting Backend Server on port %PORT% (source)...
    if exist "%~dp0desktop-host\pin-browse-picker.overlay.yml" (
        start /b "" pnpm dsh web --patch "%~dp0desktop-host\pin-browse-picker.overlay.yml" --port %PORT% --no-open
    ) else (
        start /b "" pnpm dsh web --port %PORT% --no-open
    )
)

echo [INFO] Waiting for server to initialize...
timeout /t 3 /nobreak >nul

if defined BROWSER_CMD (
    echo [INFO] Launching Desktop Window...
    start "" "%BROWSER_CMD%" --app=%APP_URL% --window-size=1360,880
) else (
    echo [INFO] Opening default browser...
    start %APP_URL%
)

echo.
echo ===================================================
echo   DeepSeek Harness is running in Desktop Mode!
echo   Close this window to stop the backend server.
echo ===================================================
echo.

:: Keep process alive to keep backend running, stop when user closes
pause
