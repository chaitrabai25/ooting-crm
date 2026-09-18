@echo off
title Ooting CRM - Local Server
echo ===================================================
echo           OOTING CRM - STARTING SYSTEM
echo ===================================================
echo [1/3] Navigating to CRM folder...
cd /d "c:\Users\ootng\Desktop\RM"

echo [2/3] Starting Ooting CRM Backend and Frontend...
start "" cmd /c "npm run dev"

echo [3/3] Opening CRM in your web browser...
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo ===================================================
echo   Ooting CRM is now running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000
echo   Database: c:\Users\ootng\Desktop\RM\server\prisma\ooting.db
echo.
echo   All your data is saved PERMANENTLY in SQLite.
echo   Do not close the Node/Vite window while using CRM.
echo ===================================================
pause
