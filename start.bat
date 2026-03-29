@echo off
echo.
echo  Starting Bugout Monitor...
echo.

REM Check if dist folder exists (production build)
if exist "dist\index.html" (
    echo  [Production Mode] Serving from dist/ on port 8080
    echo  Open: http://localhost:8080
    echo  LAN:  http://%COMPUTERNAME%:8080
    echo.
    echo  Press Ctrl+C to stop.
    npx http-server dist -p 8080 -a 0.0.0.0 -c-1 --cors
) else (
    echo  [Dev Mode] Starting Vite dev server on port 5173
    echo  Open: http://localhost:5173
    echo.
    echo  Press Ctrl+C to stop.
    cd app
    npx vite --host 0.0.0.0 --port 5173
)
