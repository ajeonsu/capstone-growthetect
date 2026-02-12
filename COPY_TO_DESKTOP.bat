@echo off
title Copy to Desktop - Easiest Method
color 0B

echo.
echo ========================================
echo   Copy Bridge Files to Desktop
echo ========================================
echo.
echo This will copy the start/stop files
echo directly to your desktop for easy access!
echo.

REM Get desktop path
set DESKTOP=%USERPROFILE%\Desktop

REM Get current directory
set CURRENT_DIR=%~dp0

echo Copying files...
echo From: %CURRENT_DIR%
echo To: %DESKTOP%
echo.

REM Copy the BAT files directly to desktop (fix path)
copy "%~dp0START_ARDUINO_BRIDGE.bat" "%DESKTOP%\START Arduino Bridge.bat"
copy "%~dp0STOP_ARDUINO_BRIDGE.bat" "%DESKTOP%\STOP Arduino Bridge.bat"

echo.
echo ========================================
echo   Files Copied to Desktop!
echo ========================================
echo.
echo Look on your desktop for:
echo   [*] START Arduino Bridge.bat
echo   [*] STOP Arduino Bridge.bat
echo.
echo Just double-click these files to use!
echo.
echo Press any key to close...
pause >nul
