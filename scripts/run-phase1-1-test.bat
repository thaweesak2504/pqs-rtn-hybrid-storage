@echo off
REM Phase 1.1 Testing Launcher
REM This script will guide you through the testing process

echo ========================================
echo Phase 1.1 Testing Guide
echo ========================================
echo.

echo Step 1: Start the application
echo --------------------------------
echo Please open a SEPARATE terminal and run:
echo   npm run tauri
echo.
echo Wait until you see:
echo   [SUCCESS] Application setup completed
echo.
echo Step 2: Press any key here when application is running...
pause >nul

echo.
echo Step 3: Running test script...
echo --------------------------------
powershell.exe -ExecutionPolicy Bypass -File "%~dp0test-phase1-1.ps1"

echo.
echo ========================================
echo Testing Complete!
echo ========================================
pause
