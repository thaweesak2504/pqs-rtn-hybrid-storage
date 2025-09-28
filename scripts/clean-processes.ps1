# PowerShell script to clean up processes before starting the app
Write-Host "Cleaning up existing processes..." -ForegroundColor Yellow

# Kill any existing PQS RTN processes
$processes = Get-Process -Name "PQS RTN" -ErrorAction SilentlyContinue
if ($processes) {
    Write-Host "Found $($processes.Count) existing PQS RTN process(es)" -ForegroundColor Red
    $processes | ForEach-Object { 
        Write-Host "Killing process ID: $($_.Id)" -ForegroundColor Red
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
    Write-Host "Processes cleaned up successfully" -ForegroundColor Green
} else {
    Write-Host "No existing PQS RTN processes found" -ForegroundColor Green
}

# Kill any Node.js processes using port 1420
$portProcesses = netstat -ano | Select-String ":1420" | ForEach-Object {
    $parts = $_ -split '\s+'
    if ($parts.Count -ge 5) {
        $parts[-1]
    }
} | Sort-Object -Unique

if ($portProcesses) {
    Write-Host "Found processes using port 1420" -ForegroundColor Red
    $portProcesses | ForEach-Object {
        Write-Host "Killing process ID: $_" -ForegroundColor Red
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
    Write-Host "Port 1420 cleaned up successfully" -ForegroundColor Green
} else {
    Write-Host "Port 1420 is available" -ForegroundColor Green
}

Write-Host "Ready to start the application!" -ForegroundColor Cyan
