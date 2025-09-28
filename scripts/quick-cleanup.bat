@echo off
REM Quick Cleanup Script for Port 1420 Management
REM This script provides quick cleanup for development processes

echo 🧹 Quick Cleanup Script
echo =====================

echo 🔍 Killing development processes...

REM Kill Node.js processes
taskkill /F /IM "node.exe" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Killed Node.js processes
) else (
    echo ✅ No Node.js processes found
)

REM Kill NPM processes
taskkill /F /IM "npm.exe" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Killed NPM processes
) else (
    echo ✅ No NPM processes found
)

REM Kill Vite processes
taskkill /F /F /IM "vite.exe" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Killed Vite processes
) else (
    echo ✅ No Vite processes found
)

REM Kill Tauri processes
taskkill /F /IM "tauri.exe" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Killed Tauri processes
) else (
    echo ✅ No Tauri processes found
)

REM Kill Cargo processes
taskkill /F /IM "cargo.exe" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Killed Cargo processes
) else (
    echo ✅ No Cargo processes found
)

REM Kill Rust compiler processes
taskkill /F /IM "rustc.exe" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Killed Rust compiler processes
) else (
    echo ✅ No Rust compiler processes found
)

REM Kill Chrome processes
taskkill /F /IM "chrome.exe" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Killed Chrome processes
) else (
    echo ✅ No Chrome processes found
)

REM Kill Edge processes
taskkill /F /IM "msedge.exe" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Killed Edge processes
) else (
    echo ✅ No Edge processes found
)

REM Kill Edge WebView2 processes
taskkill /F /IM "msedgewebview2.exe" 2>nul
if %errorlevel% equ 0 (
    echo ✅ Killed Edge WebView2 processes
) else (
    echo ✅ No Edge WebView2 processes found
)

REM Kill PowerShell processes (except current)
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq powershell.exe" /fo csv ^| find /c "powershell.exe"') do (
    if %%i gtr 1 (
        taskkill /F /IM "powershell.exe" /fi "PID ne %PID%" 2>nul
        echo ✅ Killed other PowerShell processes
    ) else (
        echo ✅ No other PowerShell processes found
    )
)

REM Kill CMD processes (except current)
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq cmd.exe" /fo csv ^| find /c "cmd.exe"') do (
    if %%i gtr 1 (
        taskkill /F /IM "cmd.exe" /fi "PID ne %PID%" 2>nul
        echo ✅ Killed other CMD processes
    ) else (
        echo ✅ No other CMD processes found
    )
)

REM Kill Console Host processes (except current)
for /f "tokens=2" %%i in ('tasklist /fi "imagename eq conhost.exe" /fo csv ^| find /c "conhost.exe"') do (
    if %%i gtr 1 (
        taskkill /F /IM "conhost.exe" /fi "PID ne %PID%" 2>nul
        echo ✅ Killed other Console Host processes
    ) else (
        echo ✅ No other Console Host processes found
    )
)

REM Check port 1420
echo 🔍 Checking port 1420...
netstat -ano | findstr :1420
if %errorlevel% equ 0 (
    echo ❌ Port 1420 is still in use
    echo 🔧 Killing processes on port 1420...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :1420') do (
        taskkill /F /PID %%a 2>nul
        echo ✅ Killed process on port 1420 (PID: %%a)
    )
) else (
    echo ✅ Port 1420 is available
)

REM Wait for processes to terminate
echo ⏳ Waiting for processes to terminate...
timeout /t 3 /nobreak >nul

REM Final verification
echo 🔍 Final verification...
tasklist | findstr "node.exe npm.exe vite.exe tauri.exe cargo.exe rustc.exe chrome.exe msedge.exe msedgewebview2.exe"
if %errorlevel% equ 0 (
    echo ⚠️  Some processes still running
) else (
    echo ✅ All development processes cleaned up
)

echo 🎉 Quick cleanup completed!
echo =====================
