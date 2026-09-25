@echo off
title Ooting CRM - Local Server
echo ===================================================
echo           OOTING CRM - STARTING SYSTEM
echo ===================================================
echo [1/3] Navigating to CRM folder...
cd /d "%~dp0"

echo [2/3] Starting Ooting CRM Backend and Frontend...
start "" cmd /c "npm run dev"

echo [3/3] Opening CRM in your web browser...
timeout /t 5 /nobreak >nul
start http://localhost:5173

echo ===================================================
echo   Ooting CRM is now running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000
echo   Database: MySQL 8.0 (localhost:3306/ooting_crm)
echo.
echo   All your CRM data is saved PERMANENTLY in MySQL 8.0.
echo   Data persists across page refresh, logout, restarts,
echo   and deployments.
echo   Do not close the Node/Vite window while using CRM.
echo ===================================================
pause
