@echo off
title Arduino Bridge - LOCAL MODE
color 0E

echo.
echo ========================================
echo   Arduino Bridge - LOCAL MODE
echo   Testing with localhost:3000
echo ========================================
echo.

REM Change to project directory
cd /d "%~dp0"

echo [*] Checking Arduino connection...
echo [*] Will connect to: http://localhost:3000
echo.
echo IMPORTANT: Make sure your Next.js dev server is running!
echo Run "npm run dev" in another terminal first.
echo.
pause

REM Set environment to local mode
set API_MODE=local

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
