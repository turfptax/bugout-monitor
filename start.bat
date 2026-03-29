@echo off
REM ── Always run from the directory this script lives in ──
cd /d "%~dp0"

echo.
echo  Bugout Monitor
echo  --------------
echo.

REM Check if dist folder exists (production build)
if exist "dist\index.html" (
    echo  [Production Mode] Serving built app on port 8080
    echo.
    echo  Local:   http://localhost:8080
    echo  Network: http://%COMPUTERNAME%:8080
    echo.
    echo  Press Ctrl+C to stop.
    echo.
    call npx http-server dist -p 8080 -a 0.0.0.0 -c-1 --cors
) else (
    echo  [Dev Mode] No production build found. Starting Vite dev server...
    echo.
    echo  Local:   http://localhost:5173
    echo  Network: Will be shown below
    echo.
    echo  Press Ctrl+C to stop.
    echo.
    cd /d "%~dp0app"
    call npx vite --host 0.0.0.0 --port 5173
)
