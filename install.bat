@echo off
REM ── Always run from the directory this script lives in ──
cd /d "%~dp0"

echo.
echo  ========================================================
echo   BUGOUT MONITOR - Windows Installer
echo  ========================================================
echo.
echo  Working directory: %CD%
echo.

REM ── Check for Node.js ──
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] Node.js is not installed or not in PATH.
    echo.
    echo  Please install Node.js first:
    echo    https://nodejs.org/en/download
    echo.
    exit /b 1
)
for /f "tokens=*" %%v in ('node -v') do echo  [OK] Node.js found: %%v

REM ── Check for npm ──
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo  [ERROR] npm is not installed. It should come with Node.js.
    echo  Try reinstalling Node.js from https://nodejs.org
    exit /b 1
)
for /f "tokens=*" %%v in ('npm -v') do echo  [OK] npm found: %%v

echo.
echo  -- Step 1 of 4: Installing root dependencies --
echo.
call npm install
if not %ERRORLEVEL%==0 (
    echo  [ERROR] npm install failed for root project.
    exit /b 1
)
echo.
echo  [OK] Root dependencies installed.

echo.
echo  -- Step 2 of 4: Installing React app dependencies --
echo.
pushd "%~dp0app"
call npm install
if not %ERRORLEVEL%==0 (
    popd
    echo  [ERROR] npm install failed for React app.
    exit /b 1
)
popd
echo.
echo  [OK] React app dependencies installed.

echo.
echo  -- Step 3 of 4: Installing MCP server dependencies --
echo.
if exist "%~dp0mcp-server\package.json" (
    pushd "%~dp0mcp-server"
    call npm install
    if not %ERRORLEVEL%==0 (
        echo  [WARNING] MCP server install had issues. MCP features may need manual setup.
    ) else (
        echo  [OK] MCP server dependencies installed.
    )
    popd
) else (
    echo  [SKIP] No mcp-server/package.json found, skipping.
)

echo.
echo  -- Step 4 of 4: Building the React app --
echo.
pushd "%~dp0app"
call npx vite build
if not %ERRORLEVEL%==0 (
    echo.
    echo  [WARNING] React app build failed. You can still run in dev mode.
    echo  Run: cd app ^& npx vite --host
    popd
    goto :done
)
popd
echo.
echo  [OK] React app built successfully.
if not exist "dist" mkdir "dist"
xcopy /E /Y /Q "app\dist\*" "dist\" >nul 2>&1
echo  [OK] Built files copied to dist\

:done
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
