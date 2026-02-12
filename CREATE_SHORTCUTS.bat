@echo off
title Create Desktop Shortcuts - Simple Method
color 0B

echo.
echo ========================================
echo   Creating Desktop Shortcuts
echo ========================================
echo.

REM Get desktop path
set DESKTOP=%USERPROFILE%\Desktop

REM Get current directory
set CURRENT_DIR=%~dp0

echo Creating shortcuts on desktop...
echo.

REM Create shortcut using PowerShell (more reliable)
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP%\Start Arduino Bridge.lnk'); $s.TargetPath = '%CURRENT_DIR%START_ARDUINO_BRIDGE.bat'; $s.WorkingDirectory = '%CURRENT_DIR%'; $s.Description = 'Start Arduino Bridge'; $s.Save()"

powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%DESKTOP%\Stop Arduino Bridge.lnk'); $s.TargetPath = '%CURRENT_DIR%STOP_ARDUINO_BRIDGE.bat'; $s.WorkingDirectory = '%CURRENT_DIR%'; $s.Description = 'Stop Arduino Bridge'; $s.Save()"

echo.
echo ========================================
echo   Desktop Shortcuts Created!
echo ========================================
echo.
echo Check your desktop for:
echo   [*] Start Arduino Bridge
echo   [*] Stop Arduino Bridge
echo.
echo You can now:
echo   1. Plug Arduino into USB
echo   2. Double-click "Start Arduino Bridge"
echo   3. Open: https://capstone-growthetect.vercel.app
echo.
echo Press any key to close...
pause >nul
