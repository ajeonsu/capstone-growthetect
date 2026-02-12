@echo off
title Arduino Bridge Setup
color 0B

echo.
echo ========================================
echo   GROWTHetect - Arduino Bridge Setup
echo ========================================
echo.
echo This will create easy-to-use shortcuts
echo on your desktop!
echo.
echo After setup, you'll have:
echo   [*] Start Arduino Bridge (double-click to start)
echo   [*] Stop Arduino Bridge (double-click to stop)
echo.
echo Press any key to continue setup...
pause >nul

cls
echo.
echo Installing...
echo.

REM Install desktop shortcuts
call INSTALL_SHORTCUTS.bat

echo.
echo ========================================
echo   Setup Complete! 
echo ========================================
echo.
echo Look on your desktop for these icons:
echo   - Start Arduino Bridge
echo   - Stop Arduino Bridge
echo.
echo QUICK START:
echo   1. Plug Arduino into USB
echo   2. Double-click "Start Arduino Bridge"
echo   3. Open: https://capstone-growthetect.vercel.app
echo   4. Start measuring students!
echo.
echo Press any key to close...
pause >nul
