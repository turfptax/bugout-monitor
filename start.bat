@echo off
REM ── Always run from the directory this script lives in ──
cd /d "%~dp0"

echo.
echo  ========================================================
echo   BUGOUT MONITOR - Server
echo  ========================================================
echo.

REM ── Check if dist/ exists ──
if not exist "dist\index.html" (
    echo  [ERROR] No production build found in dist\
    echo.
    echo  Run install.bat first to build the app.
    echo.
    exit /b 1
)

echo  Serving from project root on port 8080
echo.
echo  Local:   http://localhost:8080
echo  Network: http://%COMPUTERNAME%:8080
echo.
echo  Press Ctrl+C to stop.
echo.
call npx http-server . -p 8080 -a 0.0.0.0 -c-1 --cors
