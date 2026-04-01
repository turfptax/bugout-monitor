@echo off
REM ── Always run from the directory this script lives in ──
cd /d "%~dp0"

REM ── Set up logging ──
set "LOGFILE=%~dp0install-log.txt"
echo Install started: %DATE% %TIME% > "%LOGFILE%"
echo Working directory: %CD% >> "%LOGFILE%"
echo. >> "%LOGFILE%"

echo.
echo  ========================================================
echo   BUGOUT MONITOR - Windows Installer
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
    echo  Please install Node.js first:
    echo    https://nodejs.org/en/download
    echo.
    echo  Download the LTS version, run the installer, then re-run this script.
    echo.
    echo [ERROR] Node.js not found >> "%LOGFILE%"
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do (
    echo  [OK] Node.js found: %%v
    echo Node.js: %%v >> "%LOGFILE%"
)

REM ── Check for npm ──
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] npm is not installed. It should come with Node.js.
    echo.
    echo  Try reinstalling Node.js from https://nodejs.org
    echo.
    echo [ERROR] npm not found >> "%LOGFILE%"
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('npm -v') do (
    echo  [OK] npm found: %%v
    echo npm: %%v >> "%LOGFILE%"
)

echo.
echo  -- Step 1 of 4: Installing root dependencies --
echo.
echo [Step 1] npm install (root) >> "%LOGFILE%"
call npm install >> "%LOGFILE%" 2>&1
if not %ERRORLEVEL%==0 (
    echo  [ERROR] npm install failed for root project.
    echo  Check %LOGFILE% for details.
    echo.
    echo [ERROR] Root npm install failed >> "%LOGFILE%"
    pause
    exit /b 1
)
echo.
echo  [OK] Root dependencies installed.
echo [Step 1] OK >> "%LOGFILE%"

echo.
echo  -- Step 2 of 4: Installing React app dependencies --
echo.
echo [Step 2] npm install (app) >> "%LOGFILE%"
pushd "%~dp0app"
call npm install >> "%LOGFILE%" 2>&1
if not %ERRORLEVEL%==0 (
    popd
    echo  [ERROR] npm install failed for React app.
    echo  Check %LOGFILE% for details.
    echo.
    echo [ERROR] App npm install failed >> "%LOGFILE%"
    pause
    exit /b 1
)
popd
echo.
echo  [OK] React app dependencies installed.
echo [Step 2] OK >> "%LOGFILE%"

echo.
echo  -- Step 3 of 4: Installing MCP server dependencies --
echo.
echo [Step 3] npm install (mcp-server) >> "%LOGFILE%"
if exist "%~dp0mcp-server\package.json" (
    pushd "%~dp0mcp-server"
    call npm install >> "%LOGFILE%" 2>&1
    if not %ERRORLEVEL%==0 (
        echo  [WARNING] MCP server install had issues. MCP features may need manual setup.
        echo [WARNING] MCP npm install had issues >> "%LOGFILE%"
    ) else (
        echo  [OK] MCP server dependencies installed.
        echo [Step 3] OK >> "%LOGFILE%"
    )
    popd
) else (
    echo  [SKIP] No mcp-server/package.json found, skipping.
    echo [Step 3] SKIPPED - no mcp-server >> "%LOGFILE%"
)

echo.
echo  -- Step 4 of 4: Building the React app --
echo.
echo [Step 4] vite build >> "%LOGFILE%"
pushd "%~dp0app"
call npx vite build >> "%LOGFILE%" 2>&1
if not %ERRORLEVEL%==0 (
    echo.
    echo  [WARNING] React app build failed. You can still run in dev mode.
    echo  Run: cd app ^& npx vite --host
    echo.
    echo  Check %LOGFILE% for the error details.
    echo.
    echo [WARNING] Vite build failed >> "%LOGFILE%"
    popd
    goto :done
)
popd
echo.
echo  [OK] React app built successfully.
echo [Step 4] Build OK >> "%LOGFILE%"
if not exist "dist" mkdir "dist"
xcopy /E /Y /Q "app\dist\*" "dist\" >nul 2>&1
echo  [OK] Built files copied to dist\
echo [Step 4] Files copied to dist\ >> "%LOGFILE%"

:done
echo.
echo Install completed: %DATE% %TIME% >> "%LOGFILE%"
echo.
echo  ========================================================
echo   INSTALLATION COMPLETE!
echo  ========================================================
echo.
echo  QUICK START:
echo    Double-click start.bat to launch the app
echo    Or run: cd app ^& npx vite --host
echo.
echo  FIRST TIME SETUP:
echo    Open http://localhost:8080 in your browser
echo    The app will guide you through setup
echo.
echo  OPTIONAL - Daily threat scans:
echo    Run: node monitor\index.js
echo.
echo  OPTIONAL - Claude Code MCP integration:
echo    See README.md for setup instructions
echo.
echo  Documentation: https://github.com/turfptax/bugout-monitor
echo.
echo  Full install log saved to: %LOGFILE%
echo.
pause
