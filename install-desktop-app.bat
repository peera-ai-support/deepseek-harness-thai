@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-desktop-app.ps1"
if errorlevel 1 (
  echo.
  echo [ERROR] Could not install the desktop app.
  pause
  exit /b 1
)
echo.
echo You can now open DeepSeek Harness from the Desktop or the Start menu.
pause
