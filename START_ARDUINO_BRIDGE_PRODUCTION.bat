@echo off
title Arduino Bridge - PRODUCTION MODE
color 0A

echo.
echo ========================================
echo   Arduino Bridge - PRODUCTION MODE
echo   Sending to Vercel Cloud
echo ========================================
echo.

REM Change to bridge directory
cd /d "%~dp0bridge"

REM Install dependencies if node_modules missing
if not exist "node_modules" (
  echo [*] Installing bridge dependencies...
  npm install
  echo.
)

echo [*] Checking Arduino connection...
echo [*] Will connect to: https://capstone-growthetect.vercel.app
echo.

REM Set environment to production mode
set API_MODE=production

REM Start the bridge
node arduino-bridge.js

REM If bridge stops, show message
echo.
echo ========================================
echo   Bridge Stopped
echo ========================================
echo.
echo Press any key to close this window...
pause >nul
