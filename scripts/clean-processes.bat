@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0clean-processes.ps1"
exit /b %errorlevel%
