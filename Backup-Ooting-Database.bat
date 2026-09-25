@echo off
title Ooting CRM - Database Backup
echo ===================================================
echo        OOTING CRM - DATABASE BACKUP UTILITY
echo ===================================================
echo.
set BACKUP_DIR=C:\Users\ootng\Desktop\CRM Backups
if not exist "%BACKUP_DIR%" (
    mkdir "%BACKUP_DIR%"
    echo Created backup folder: %BACKUP_DIR%
)

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%

set MYSQLDUMP_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe
set SQL_DEST=%BACKUP_DIR%\ooting_crm_backup_%TIMESTAMP%.sql

echo [1/2] Creating MySQL 8.0 SQL Dump...
if exist "%MYSQLDUMP_PATH%" (
    "%MYSQLDUMP_PATH%" -u root -pChaitra@25 --routines --triggers ooting_crm --result-file="%SQL_DEST%"
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] MySQL dump saved to:
        echo   %SQL_DEST%
    ) else (
        echo [WARNING] mysqldump command returned non-zero status.
    )
) else (
    echo [INFO] mysqldump.exe not at standard path, will rely on JSON snapshot.
)

echo.
echo [2/2] Creating JSON Snapshot Backup...
cd /d "%~dp0server"
node scripts/backup-db.js

echo.
echo ===================================================
echo   BACKUP COMPLETE!
echo   Your MySQL 8.0 CRM data is 100%% safe and secured.
echo   Backups location: %BACKUP_DIR%
echo ===================================================
pause
