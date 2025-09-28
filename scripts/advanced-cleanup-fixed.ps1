# Advanced Process Cleanup Script for Port 1420 Management
# This script provides comprehensive cleanup for development processes

Write-Host "🧹 Advanced Process Cleanup Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Function to kill processes by name
function Kill-Processes {
    param(
        [string]$ProcessName,
        [string]$Description
    )
    
    Write-Host "🔍 Checking for $Description..." -ForegroundColor Yellow
    
    $processes = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if ($processes) {
        Write-Host "   Found $($processes.Count) $Description processes" -ForegroundColor Red
        foreach ($process in $processes) {
            try {
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                Write-Host "   ✅ Killed $Description (PID: $($process.Id))" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ Failed to kill $Description (PID: $($process.Id))" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "   ✅ No $Description processes found" -ForegroundColor Green
    }
}

# Function to kill processes by port
function Kill-ProcessesByPort {
    param(
        [int]$Port,
        [string]$Description
    )
    
    Write-Host "🔍 Checking port $Port for $Description..." -ForegroundColor Yellow
    
    try {
        $connections = netstat -ano | findstr ":$Port"
        if ($connections) {
            Write-Host "   Found connections on port $Port" -ForegroundColor Red
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
            Write-Host "   ✅ No connections found on port $Port" -ForegroundColor Green
        }
    } catch {
        Write-Host "   ❌ Error checking port $Port" -ForegroundColor Red
    }
}

# Main cleanup process
Write-Host "🚀 Starting advanced cleanup..." -ForegroundColor Cyan

# 1. Kill development processes
Kill-Processes "node" "Node.js"
Kill-Processes "npm" "NPM"
Kill-Processes "vite" "Vite"
Kill-Processes "tauri" "Tauri"
Kill-Processes "cargo" "Cargo"
Kill-Processes "rustc" "Rust Compiler"

# 2. Kill browser processes
Kill-Processes "chrome" "Chrome"
Kill-Processes "msedge" "Edge"
Kill-Processes "msedgewebview2" "Edge WebView2"
Kill-Processes "firefox" "Firefox"

# 3. Kill processes by port
Kill-ProcessesByPort 1420 "Development Server"
Kill-ProcessesByPort 3000 "React Dev Server"
Kill-ProcessesByPort 8080 "Web Server"

# 4. Wait for processes to terminate
Write-Host "⏳ Waiting for processes to terminate..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# 5. Final verification
Write-Host "🔍 Final verification..." -ForegroundColor Yellow
$remainingProcesses = Get-Process -Name "node", "npm", "vite", "tauri", "cargo", "rustc" -ErrorAction SilentlyContinue
if ($remainingProcesses) {
    Write-Host "   ⚠️  Some processes still running:" -ForegroundColor Yellow
    foreach ($process in $remainingProcesses) {
        Write-Host "   - $($process.Name) (PID: $($process.Id))" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ✅ All development processes cleaned up" -ForegroundColor Green
}

Write-Host "🎉 Advanced cleanup completed!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
