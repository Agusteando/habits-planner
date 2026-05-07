@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Install Node.js first, or use START_HABIT_PLANNER.cmd to run the included dist build.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Installing dependencies from package.json...
  call npm install
  if errorlevel 1 (
    echo npm install failed.
    pause
    exit /b 1
  )
)

call npm run dev
pause
