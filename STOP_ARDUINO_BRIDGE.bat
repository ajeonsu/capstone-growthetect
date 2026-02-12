@echo off
title Stop Arduino Bridge
color 0C

echo.
echo ========================================
echo   Stopping Arduino Bridge...
echo ========================================
echo.

REM Kill all node processes running arduino-bridge.js
taskkill /F /FI "WINDOWTITLE eq Arduino Bridge - GROWTHetect" /T >nul 2>&1

echo.
echo [*] Bridge stopped successfully!
echo.
echo You can now:
echo   - Unplug Arduino
echo   - Close this window
echo.
echo Press any key to close...
pause >nul
