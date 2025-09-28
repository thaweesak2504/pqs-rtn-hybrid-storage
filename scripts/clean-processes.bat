@echo off
echo Cleaning up existing processes...

REM Kill any existing PQS RTN processes
taskkill /F /IM "PQS RTN.exe" >nul 2>&1
if %errorlevel% equ 0 (
    echo Killed existing PQS RTN processes
) else (
    echo No existing PQS RTN processes found
)

REM Kill Node.js processes using port 1420
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :1420') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Ready to start the application!
timeout /t 2 /nobreak >nul
