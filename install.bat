@echo off
setlocal enabledelayedexpansion

echo.
echo  ========================================================
echo   BUGOUT MONITOR - Windows Installer
echo  ========================================================
echo.
echo  This will set up the Bugout Monitor on your system.
echo  Requirements: Node.js 18+ and Git
echo.

REM ── Check for Node.js ──
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo.
    echo  Please install Node.js first:
    echo    https://nodejs.org/en/download
    echo.
    echo  Download the LTS version, run the installer, then re-run this script.
    echo.
    pause
    exit /b 1
)

REM ── Check Node version ──
for /f "tokens=1 delims=v" %%a in ('node -v') do set NODE_VER=%%a
for /f "tokens=1 delims=." %%a in ('node -v') do set NODE_MAJOR=%%a
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% LSS 18 (
    echo  [ERROR] Node.js version 18 or higher is required.
    echo  You have: %NODE_VER%
    echo  Please update: https://nodejs.org/en/download
    pause
    exit /b 1
)
echo  [OK] Node.js found:
node -v

REM ── Check for npm ──
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] npm is not installed. It should come with Node.js.
    echo  Try reinstalling Node.js from https://nodejs.org
    pause
    exit /b 1
)
echo  [OK] npm found:
npm -v

echo.
echo  ── Step 1: Installing root dependencies ──
echo.
call npm install
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] npm install failed for root project.
    pause
    exit /b 1
)
echo  [OK] Root dependencies installed.

echo.
echo  ── Step 2: Installing React app dependencies ──
echo.
cd app
call npm install
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] npm install failed for React app.
    cd ..
    pause
    exit /b 1
)
cd ..
echo  [OK] React app dependencies installed.

echo.
echo  ── Step 3: Installing MCP server dependencies ──
echo.
cd mcp-server
call npm install
if %ERRORLEVEL% neq 0 (
    echo  [WARNING] MCP server install failed. MCP features may not work.
    echo  You can install later with: cd mcp-server ^&^& npm install
)
cd ..
echo  [OK] MCP server dependencies installed.

echo.
echo  ── Step 4: Building the React app ──
echo.
cd app
call npx vite build
if %ERRORLEVEL% neq 0 (
    echo  [WARNING] React app build failed. You can still run in dev mode.
    echo  Run: cd app ^&^& npx vite --host
) else (
    echo  [OK] React app built successfully.
    REM Copy built files to root dist
    if not exist "..\dist" mkdir "..\dist"
    xcopy /E /Y /Q "dist\*" "..\dist\" >nul 2>&1
    echo  [OK] Built files copied to dist/
)
cd ..

echo.
echo  ── Step 5: Running setup wizard ──
echo.
echo  The setup wizard will configure the monitor for your location.
echo  You can skip this now and run it later with: node setup.js
echo.
set /p RUNSETUP="  Run setup wizard now? (Y/n): "
if /i "!RUNSETUP!"=="n" goto :SKIPSETUP
if /i "!RUNSETUP!"=="no" goto :SKIPSETUP

call node setup.js
goto :AFTERSETUP

:SKIPSETUP
echo.
echo  Skipped. Run "node setup.js" when you're ready.

:AFTERSETUP

echo.
echo  ========================================================
echo   INSTALLATION COMPLETE
echo  ========================================================
echo.
echo  To start the app (development mode):
echo    cd app
echo    npx vite --host
echo    Then open http://localhost:5173
echo.
echo  To start the app (production build):
echo    npx http-server dist -p 8080 -a 0.0.0.0 -c-1
echo    Then open http://localhost:8080
echo.
echo  To run a threat scan:
echo    node monitor/index.js
echo.
echo  To schedule daily scans (6:00 AM):
echo    schtasks /create /tn "BugoutThreatMonitor" /tr "%CD%\monitor\run-monitor.bat" /sc daily /st 06:00 /f
echo.
echo  To connect Claude Code via MCP:
echo    Add to your Claude settings:
echo    {
echo      "mcpServers": {
echo        "bugout-monitor": {
echo          "command": "node",
echo          "args": ["%CD%\mcp-server\index.js"]
echo        }
echo      }
echo    }
echo.
echo  Documentation: https://github.com/turfptax/bugout-monitor
echo.
pause
