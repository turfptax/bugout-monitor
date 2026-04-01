@echo off
REM ── Always run from the directory this script lives in ──
cd /d "%~dp0"

REM ── Set up logging ──
set "LOGFILE=%~dp0start-log.txt"
echo Start attempted: %DATE% %TIME% > "%LOGFILE%"
echo Working directory: %CD% >> "%LOGFILE%"
echo. >> "%LOGFILE%"

echo.
echo  ========================================================
echo   BUGOUT MONITOR - Server
echo  ========================================================
echo.
echo  Working directory: %CD%
echo  Log file: %LOGFILE%
echo.

REM ── Check for Node.js ──
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo.
    echo  Install Node.js from: https://nodejs.org/en/download
    echo  Then re-run this script.
    echo.
    echo [ERROR] Node.js not found >> "%LOGFILE%"
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do (
    echo  [OK] Node.js: %%v
    echo Node.js: %%v >> "%LOGFILE%"
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
    echo [ERROR] dist\index.html not found >> "%LOGFILE%"
    dir dist >> "%LOGFILE%" 2>&1
    pause
    exit /b 1
)
echo  [OK] Production build found in dist\
echo [OK] dist\index.html exists >> "%LOGFILE%"

REM ── Check if port 8080 is already in use ──
netstat -ano 2>nul | findstr ":8080 " | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL%==0 (
    echo  [WARNING] Port 8080 is already in use by another process.
    echo  The server may fail to start. Close the other app or use a different port.
    echo.
    echo [WARNING] Port 8080 already in use >> "%LOGFILE%"
    netstat -ano | findstr ":8080 " | findstr "LISTENING" >> "%LOGFILE%" 2>&1
)

REM ── Get local IP for network URL ──
set "LOCAL_IP=unknown"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    set "LOCAL_IP=%%a"
    goto :gotip
)
:gotip
set LOCAL_IP=%LOCAL_IP: =%

echo.
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

echo Server starting: %DATE% %TIME% >> "%LOGFILE%"
echo URL: http://%LOCAL_IP%:8080 >> "%LOGFILE%"
echo. >> "%LOGFILE%"

call npx http-server dist -p 8080 -a 0.0.0.0 -c-1 --cors 2>> "%LOGFILE%"

REM ── If we get here, the server exited ──
echo.
echo  Server stopped (exit code: %ERRORLEVEL%).
echo.
echo Server exited: %DATE% %TIME% (code: %ERRORLEVEL%) >> "%LOGFILE%"

if not %ERRORLEVEL%==0 (
    echo  [ERROR] Server crashed. Check start-log.txt for details.
    echo.
    echo  Common fixes:
    echo    1. Port 8080 in use: close the other app, or edit this file to change the port
    echo    2. http-server not found: run "npm install -g http-server"
    echo    3. Permission denied: run as Administrator
    echo.
)
pause
