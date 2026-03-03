@echo off
title Arduino Bridge - AUTO MODE
color 0B

echo.
echo ========================================
echo   Arduino Bridge - AUTO MODE
echo   Smart Detection (Localhost + Cloud)
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
echo [*] Mode: AUTO (tries localhost first, then cloud)
echo.

REM Start the bridge in auto mode (default)
node arduino-bridge.js

REM If bridge stops, show message
echo.
echo ========================================
echo   Bridge Stopped
echo ========================================
echo.
echo Press any key to close this window...
pause >nul
