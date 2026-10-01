@echo off
set "PATH=%PATH%;C:\Program Files\nodejs"
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js was not found. Install it from nodejs.org, restart the PC, then run this again. & pause & exit /b 1)
if not exist server\node_modules (echo Installing server packages, please wait... & pushd server & call npm install & popd)
if not exist client\node_modules (echo Installing dashboard packages, please wait... & pushd client & call npm install & popd)
start "Leadlane API (keep open)" cmd /k "cd /d %~dp0server && npm run dev"
start "Leadlane Dashboard (keep open)" cmd /k "cd /d %~dp0client && npm run dev"
echo Opening the app in Edge...
timeout /t 8 >nul
start msedge http://localhost:5173
