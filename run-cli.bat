@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title DeepSeek Harness - CLI

echo ===================================================
echo   DeepSeek Harness (dsh) - Interactive CLI
echo ===================================================
echo.

if exist "%APPDATA%\npm" (
    set "PATH=%APPDATA%\npm;%PATH%"
)

if "%~1"=="" (
    echo Usage:
    echo   run-cli.bat --help
    echo   run-cli.bat --profile headless "Your prompt/task here"
    echo.
    echo Running default --help:
    echo.
    call pnpm dsh --help
) else (
    call pnpm dsh %*
)

echo.
pause
