@echo off
echo Testing Arduino Bridge with Simulated Data
echo.
echo Sending test data to http://localhost:3000/api/arduino-bridge
echo Weight: 50.5 kg
echo Height: 165.2 cm
echo.

curl -X POST http://localhost:3000/api/arduino-bridge ^
  -H "Content-Type: application/json" ^
  -d "{\"weight\":50.5,\"height\":165.2,\"source\":\"test\"}"

echo.
echo.
echo Check your website now!
echo The Arduino status should show as Connected.
echo.
pause
