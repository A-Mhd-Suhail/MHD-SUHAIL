@echo off
title MHD Hospital
cd /d "%~dp0.."

echo ============================================
echo   MHD Hospital - Starting...
echo ============================================
echo.

rem If the app is already running, just open it
curl -s -o nul --max-time 2 http://localhost:3000/
if %errorlevel%==0 (
    echo App is already running - opening it now...
    start http://localhost:3000
    timeout /t 2 >nul
    exit /b 0
)

echo First time on this PC? Run "npm install" once before this.
echo.
echo Starting server...
start /b npm run dev > "%TEMP%\mhd-hospital-dev.log" 2>&1

rem Wait for the server to come up, then open the browser
for /l %%i in (1,1,30) do (
    timeout /t 1 >nul
    curl -s -o nul --max-time 1 http://localhost:3000/
    if %errorlevel%==0 (
        start http://localhost:3000
        echo.
        echo ============================================
        echo   MHD Hospital is running!
        echo   Open:  http://localhost:3000
        echo   Keep this window OPEN while using the app.
        echo   To stop: close this window.
        echo ============================================
        timeout /t 5 >nul
        exit /b 0
    )
)

echo Something went wrong. Check the log:
echo   %TEMP%\mhd-hospital-dev.log
pause
