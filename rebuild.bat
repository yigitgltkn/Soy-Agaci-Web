@echo off
REM Double-click this file to rebuild index.html from the template + data.js.
REM Calls rebuild.ps1 with execution policy bypassed (needed on stock Windows).

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0rebuild.ps1"
echo.
pause
