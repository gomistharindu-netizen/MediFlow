@echo off
cd /d "D:\tharindu\MediFlow"
set PATH=D:\tharindu\node-v24.19.0-win-x64;%PATH%
echo Starting MediFlow Development Server on Port 3001 (http://localhost:3001)...
npm.cmd run dev
pause
