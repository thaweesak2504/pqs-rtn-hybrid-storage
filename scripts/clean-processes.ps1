param(
    [int]$Port = 1420
)

$ErrorActionPreference = "Stop"

Write-Host "Checking PQS development processes..." -ForegroundColor Cyan

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Get-ListeningProcessIds {
    param([int]$LocalPort)

    $processIds = @()

    try {
        $processIds += Get-NetTCPConnection -State Listen -LocalPort $LocalPort -ErrorAction Stop |
            Select-Object -ExpandProperty OwningProcess
    }
    catch {
        Write-Verbose "Get-NetTCPConnection unavailable; using netstat fallback."
    }

    $netstatLines = & netstat.exe -ano -p tcp 2>$null
    foreach ($line in $netstatLines) {
        $parts = @($line.Trim() -split '\s+')
        if (
            $parts.Count -ge 5 -and
            $parts[0] -eq "TCP" -and
            $parts[1].EndsWith(":$LocalPort") -and
            $parts[3] -eq "LISTENING" -and
            $parts[4] -match '^\d+$'
        ) {
            $processIds += [int]$parts[4]
        }
    }

    return @($processIds | Sort-Object -Unique)
}

Get-Process -Name "PQS RTN Hybrid Storage", "PQS RTN" -ErrorAction SilentlyContinue |
    ForEach-Object {
        Write-Host "Stopping application process $($_.Id) ($($_.ProcessName))" -ForegroundColor Yellow
        Stop-Process -Id $_.Id -Force
    }

try {
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction Stop |
        Where-Object {
            $_.CommandLine -like "*$projectRoot*" -and
            ($_.CommandLine -like "*vite*" -or $_.CommandLine -like "*tauri*")
        } |
        ForEach-Object {
            Write-Host "Stopping project development process $($_.ProcessId)" -ForegroundColor Yellow
            Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        }
}
catch {
    Write-Verbose "Unable to inspect project Node command lines; continuing with port cleanup."
}

$listenerPids = @(Get-ListeningProcessIds -LocalPort $Port)

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

Start-Sleep -Milliseconds 300

if (@(Get-ListeningProcessIds -LocalPort $Port).Count -gt 0) {
    throw "Port $Port is still in use. Stop the owning process manually."
}

Write-Host "Port $Port is available." -ForegroundColor Green
