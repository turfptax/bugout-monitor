@echo off
REM Bugout Monitor — Run threat scan
cd /d "%~dp0.."
node monitor/index.js >> monitor/logs/scheduler.log 2>&1
