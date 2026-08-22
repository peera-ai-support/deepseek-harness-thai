@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title DeepSeek Harness - Dev Mode

echo ===================================================
echo   DeepSeek Harness (dsh) - Development Mode
echo ===================================================
echo.

:: Add npm global path for pnpm if needed
if exist "%APPDATA%\npm" (
    set "PATH=%APPDATA%\npm;%PATH%"
)

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not found in PATH.
    echo Please install Node.js ^(v22.19+ or v24+^) from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Check pnpm
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] pnpm is not detected. Attempting to install pnpm globally...
    call npm install -g pnpm@11.7.0
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install pnpm.
        pause
        exit /b 1
    )
)

:: Check dependencies
if not exist "node_modules" (
    echo [INFO] Installing dependencies with pnpm...
    call pnpm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] pnpm install failed.
        pause
        exit /b 1
    )
)

:: Build libs if missing
if not exist "apps\web\dist" (
    echo [INFO] Performing initial build...
    call pnpm run build
)

set PORT=13080
echo [INFO] Launching DeepSeek Harness in Dev Mode on port %PORT%...
echo [INFO] Open your browser at: http://127.0.0.1:%PORT%
echo.

call pnpm dsh web --port %PORT%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Process exited with code %ERRORLEVEL%.
)

echo.
echo Process stopped.
pause
