param(
    [int]$Port = 1420
)

$ErrorActionPreference = "Stop"

Write-Host "Checking PQS development processes..." -ForegroundColor Cyan

Get-Process -Name "PQS RTN Hybrid Storage", "PQS RTN" -ErrorAction SilentlyContinue |
    ForEach-Object {
        Write-Host "Stopping application process $($_.Id) ($($_.ProcessName))" -ForegroundColor Yellow
        Stop-Process -Id $_.Id -Force
    }

$listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
$listenerPids = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)

foreach ($processId in $listenerPids) {
    if ($processId -eq $PID) {
        continue
    }

    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "Stopping listener $processId ($($process.ProcessName)) on port $Port" -ForegroundColor Yellow
        Stop-Process -Id $processId -Force
    }
}

if (Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue) {
    throw "Port $Port is still in use. Stop the owning process manually."
}

Write-Host "Port $Port is available." -ForegroundColor Green
