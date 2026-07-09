@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js belum terpasang atau belum masuk PATH.
    echo Install Node.js terlebih dahulu, lalu jalankan file ini lagi.
    pause
    exit /b 1
)

netstat -ano | findstr ":3000" >nul 2>nul
if not errorlevel 1 (
    echo Port 3000 sedang dipakai. Backend mungkin sudah berjalan di http://localhost:3000
    pause
    exit /b 0
)

echo Menjalankan backend Putroe Shop di http://localhost:3000
node server.js

if errorlevel 1 (
    echo.
    echo Backend berhenti karena terjadi error.
    pause
)