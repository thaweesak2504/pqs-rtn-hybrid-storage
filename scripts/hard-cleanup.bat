@echo off
echo Terminating background processes...
taskkill /F /IM conhost.exe /FI "WINDOWTITLE eq N/A" /T
taskkill /F /IM powershell.exe /FI "WINDOWTITLE eq N/A" /T
taskkill /F /IM git.exe /T
taskkill /F /IM node.exe /T
echo Cleanup complete.
