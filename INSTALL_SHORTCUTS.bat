@echo off
echo Creating desktop shortcuts...

REM Get desktop path
set DESKTOP=%USERPROFILE%\Desktop

REM Get current directory
set CURRENT_DIR=%~dp0

REM Create START shortcut
cscript //nologo "%CURRENT_DIR%create-shortcut.vbs" "%DESKTOP%\Start Arduino Bridge.lnk" "%CURRENT_DIR%START_ARDUINO_BRIDGE.bat" "%CURRENT_DIR%" "Start Arduino Bridge for GROWTHetect" "%SystemRoot%\System32\SHELL32.dll,137"

REM Create STOP shortcut
cscript //nologo "%CURRENT_DIR%create-shortcut.vbs" "%DESKTOP%\Stop Arduino Bridge.lnk" "%CURRENT_DIR%STOP_ARDUINO_BRIDGE.bat" "%CURRENT_DIR%" "Stop Arduino Bridge" "%SystemRoot%\System32\SHELL32.dll,131"

echo.
echo ========================================
echo   Desktop Shortcuts Created!
echo ========================================
echo.
echo Look on your desktop for:
echo   [*] Start Arduino Bridge
echo   [*] Stop Arduino Bridge
echo.
echo Press any key to close...
pause >nul
