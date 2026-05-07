@echo off
setlocal
cd /d "%~dp0"

if not exist "dist\index.html" (
  echo Could not find dist\index.html.
  echo Extract the zip to a normal folder first, then run this file from that extracted folder.
  echo.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve-dist.ps1"
if errorlevel 1 (
  echo.
  echo Failed to start the local app server.
  echo Make sure the zip is extracted to a normal folder and try again.
  echo.
  pause
)
