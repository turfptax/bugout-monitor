@echo off
REM ── Always run from the directory this script lives in ──
cd /d "%~dp0"

echo.
echo  ========================================================
echo   BUGOUT MONITOR - Server
echo  ========================================================
echo.
echo  Working directory: %CD%
echo.

REM ── Check for Node.js ──
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo.
    echo  Install Node.js from: https://nodejs.org/en/download
    echo  Then re-run this script.
    echo.
    pause
    exit /b 1
)

REM ── Check if dist/ exists ──
if not exist "dist\index.html" (
    echo  [ERROR] No production build found in dist\
    echo.
    echo  You need to run install.bat first to build the app.
    echo.
    echo  If you already ran install.bat and still see this error,
    echo  try running manually:
    echo    cd app
    echo    npx vite build
    echo    xcopy /E /Y /Q dist\* ..\dist\
    echo.
    pause
    exit /b 1
)

REM ── Get local IP for network URL ──
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    set "LOCAL_IP=%%a"
    goto :gotip
)
:gotip
set LOCAL_IP=%LOCAL_IP: =%

echo  Starting server on port 8080...
echo.
echo  ------------------------------------------------
echo   Local:    http://localhost:8080
echo   Network:  http://%LOCAL_IP%:8080
echo  ------------------------------------------------
echo.
echo  Share the Network URL with others on your WiFi.
echo  Press Ctrl+C to stop the server.
echo.
echo  If the server fails to start, try:
echo    npm install -g http-server
echo  Then re-run this script.
echo.

call npx http-server . -p 8080 -a 0.0.0.0 -c-1 --cors

REM ── If we get here, the server exited ──
echo.
echo  Server stopped.
echo.
pause
