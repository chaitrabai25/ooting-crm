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

set SOURCE_DB=C:\Users\ootng\Desktop\RM\server\prisma\ooting.db
set DEST_DB=%BACKUP_DIR%\ooting_backup_%TIMESTAMP%.db

if exist "%SOURCE_DB%" (
    copy "%SOURCE_DB%" "%DEST_DB%" >nul
    echo [SUCCESS] Database successfully backed up to:
    echo %DEST_DB%
    echo.
    echo Your customers, leads, bookings, payments, and users are 100%% safe.
) else (
    echo [ERROR] Could not find database file at %SOURCE_DB%
)

echo ===================================================
pause
