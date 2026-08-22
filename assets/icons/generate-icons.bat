@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"
title Generate Icon Assets - DeepSeek Harness

echo ===================================================
echo   DeepSeek Harness - Icon Asset Generator
echo ===================================================
echo.

where dotnet >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] .NET SDK (dotnet) was not found in PATH.
    echo Please install .NET SDK 10 or later to run this generator.
    echo.
    pause
    exit /b 1
)

if not exist "%~dp0icon-512.png" (
    echo [ERROR] Base image "icon-512.png" not found in %~dp0
    echo Please place your 512x512 PNG icon as "icon-512.png" and run again.
    echo.
    pause
    exit /b 1
)

echo Generating multi-resolution PNGs and ICO files from icon-512.png...
echo.

dotnet run --project "%~dp0generator\IconTool.csproj"
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Icon generation failed.
    echo.
    pause
    exit /b 1
)

echo.
echo ===================================================
echo   Icon generation completed successfully!
echo ===================================================
echo.
pause
