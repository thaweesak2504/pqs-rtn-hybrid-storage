# Port 1420 Monitor Script
# This script monitors port 1420 usage and provides cleanup options

Write-Host "🔍 Port 1420 Monitor" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan

# Function to check port status
function Check-PortStatus {
    param(
        [int]$Port
    )
    
    Write-Host "🔍 Checking port $Port..." -ForegroundColor Yellow
    
    try {
        $connections = netstat -ano | findstr ":$Port"
        if ($connections) {
            Write-Host "   ❌ Port $Port is in use:" -ForegroundColor Red
            foreach ($line in $connections) {
                Write-Host "   $line" -ForegroundColor Red
            }
            return $true
        } else {
            Write-Host "   ✅ Port $Port is available" -ForegroundColor Green
            return $false
        }
    } catch {
        Write-Host "   ❌ Error checking port $Port" -ForegroundColor Red
        return $false
    }
}

# Function to get process information
function Get-ProcessInfo {
    param(
        [int]$Port
    )
    
    Write-Host "🔍 Getting process information for port $Port..." -ForegroundColor Yellow
    
    try {
        $connections = netstat -ano | findstr ":$Port"
        if ($connections) {
            foreach ($line in $connections) {
                if ($line -match '\s+(\d+)$') {
                    $pid = $matches[1]
                    try {
                        $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                        if ($process) {
                            Write-Host "   Process: $($process.Name) (PID: $pid)" -ForegroundColor Yellow
                            Write-Host "   Memory: $([math]::Round($process.WorkingSet64 / 1MB, 2)) MB" -ForegroundColor Yellow
                            Write-Host "   Start Time: $($process.StartTime)" -ForegroundColor Yellow
                        }
                    } catch {
                        Write-Host "   ❌ Could not get process info for PID $pid" -ForegroundColor Red
                    }
                }
            }
        }
    } catch {
        Write-Host "   ❌ Error getting process information" -ForegroundColor Red
    }
}

# Function to kill processes on port
function Kill-ProcessesOnPort {
    param(
        [int]$Port
    )
    
    Write-Host "🔍 Killing processes on port $Port..." -ForegroundColor Yellow
    
    try {
        $connections = netstat -ano | findstr ":$Port"
        if ($connections) {
            foreach ($line in $connections) {
                if ($line -match '\s+(\d+)$') {
                    $pid = $matches[1]
                    try {
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                        Write-Host "   ✅ Killed process on port $Port (PID: $pid)" -ForegroundColor Green
                    } catch {
                        Write-Host "   ❌ Failed to kill process on port $Port (PID: $pid)" -ForegroundColor Red
                    }
                }
            }
        } else {
            Write-Host "   ✅ No processes found on port $Port" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ❌ Error killing processes on port $Port" -ForegroundColor Red
    }
}

# Main monitoring process
Write-Host "🚀 Starting port monitoring..." -ForegroundColor Cyan

# Check port 1420
$portInUse = Check-PortStatus 1420

if ($portInUse) {
    Write-Host "⚠️  Port 1420 is in use!" -ForegroundColor Red
    Get-ProcessInfo 1420
    
    Write-Host "🔧 Would you like to kill processes on port 1420? (y/n)" -ForegroundColor Yellow
    $response = Read-Host
    
    if ($response -eq "y" -or $response -eq "Y") {
        Kill-ProcessesOnPort 1420
        Start-Sleep -Seconds 2
        Check-PortStatus 1420
    }
} else {
    Write-Host "✅ Port 1420 is available" -ForegroundColor Green
}

# Check other common development ports
$ports = @(3000, 8080, 5173, 4173)
foreach ($port in $ports) {
    Check-PortStatus $port
}

Write-Host "🎉 Port monitoring completed!" -ForegroundColor Green
Write-Host "===================" -ForegroundColor Cyan
