@echo off
REM Bugout Monitor — Install Windows Scheduled Task
REM Run this script as Administrator

echo Installing Bugout Monitor daily scheduled task...

set MONITOR_DIR=%~dp0..
set MONITOR_BAT=%~dp0run-monitor.bat

schtasks /create /tn "BugoutMonitor" /tr "%MONITOR_BAT%" /sc daily /st 06:00 /f

if %ERRORLEVEL% equ 0 (
    echo.
    echo SUCCESS: Scheduled task "BugoutMonitor" created.
    echo It will run daily at 6:00 AM.
    echo.
    echo To verify:  schtasks /query /tn "BugoutMonitor"
    echo To delete:  schtasks /delete /tn "BugoutMonitor" /f
    echo To run now: schtasks /run /tn "BugoutMonitor"
) else (
    echo.
    echo FAILED: Could not create scheduled task.
    echo Try running this script as Administrator.
)
pause
