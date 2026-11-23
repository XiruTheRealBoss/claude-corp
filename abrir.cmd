@echo off
rem Starts the Claude Corp server (minimized) and opens it as an app window.
cd /d "%~dp0"
start "Claude Corp server" /min node server.js
timeout /t 1 /nobreak >nul
start "" msedge --app=http://localhost:4747
