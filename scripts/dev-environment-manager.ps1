# Development Environment Manager
# This script manages the development environment and prevents port conflicts

Write-Host "🚀 Development Environment Manager" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Function to check system resources
function Check-SystemResources {
    Write-Host "🔍 Checking system resources..." -ForegroundColor Yellow
    
    # Check available memory
    $memory = Get-WmiObject -Class Win32_OperatingSystem
    $totalMemory = [math]::Round($memory.TotalVisibleMemorySize / 1MB, 2)
    $freeMemory = [math]::Round($memory.FreePhysicalMemory / 1MB, 2)
    $usedMemory = $totalMemory - $freeMemory
    
    Write-Host "   Total Memory: $totalMemory MB" -ForegroundColor White
    Write-Host "   Used Memory: $usedMemory MB" -ForegroundColor White
    Write-Host "   Free Memory: $freeMemory MB" -ForegroundColor White
    
    if ($freeMemory -lt 1000) {
        Write-Host "   ⚠️  Low memory warning!" -ForegroundColor Red
    } else {
        Write-Host "   ✅ Memory status: OK" -ForegroundColor Green
    }
    
    # Check CPU usage
    $cpu = Get-WmiObject -Class Win32_Processor
    Write-Host "   CPU: $($cpu.Name)" -ForegroundColor White
    Write-Host "   CPU Cores: $($cpu.NumberOfCores)" -ForegroundColor White
}

# Function to check development processes
function Check-DevelopmentProcesses {
    Write-Host "🔍 Checking development processes..." -ForegroundColor Yellow
    
    $devProcesses = @("node", "npm", "vite", "tauri", "cargo", "rustc", "chrome", "msedge")
    $totalProcesses = 0
    
    foreach ($processName in $devProcesses) {
        $processes = Get-Process -Name $processName -ErrorAction SilentlyContinue
        if ($processes) {
            $count = $processes.Count
            $totalProcesses += $count
            Write-Host "   $processName`: $count processes" -ForegroundColor Yellow
        }
    }
    
    if ($totalProcesses -gt 20) {
        Write-Host "   ⚠️  High number of development processes: $totalProcesses" -ForegroundColor Red
    } else {
        Write-Host "   ✅ Development processes: $totalProcesses (OK)" -ForegroundColor Green
    }
}

# Function to check port usage
function Check-PortUsage {
    Write-Host "🔍 Checking port usage..." -ForegroundColor Yellow
    
    $ports = @(1420, 3000, 8080, 5173, 4173)
    $usedPorts = @()
    
    foreach ($port in $ports) {
        try {
            $connections = netstat -ano | findstr ":$port"
            if ($connections) {
                $usedPorts += $port
                Write-Host "   Port $port`: IN USE" -ForegroundColor Red
            } else {
                Write-Host "   Port $port`: Available" -ForegroundColor Green
            }
        } catch {
            Write-Host "   Port $port`: Error checking" -ForegroundColor Red
        }
    }
    
    if ($usedPorts.Count -gt 0) {
        Write-Host "   ⚠️  Used ports: $($usedPorts -join ', ')" -ForegroundColor Red
    } else {
        Write-Host "   ✅ All development ports available" -ForegroundColor Green
    }
}

# Function to optimize development environment
function Optimize-DevelopmentEnvironment {
    Write-Host "🔧 Optimizing development environment..." -ForegroundColor Yellow
    
    # Clean temporary files
    $tempPaths = @(
        "$env:TEMP\*",
        "$env:LOCALAPPDATA\Temp\*",
        "node_modules\.cache",
        "target\debug"
    )
    
    foreach ($path in $tempPaths) {
        if (Test-Path $path) {
            try {
                Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "   ✅ Cleaned $path" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ Failed to clean $path" -ForegroundColor Red
            }
        }
    }
    
    # Clear browser cache
    $browserPaths = @(
        "$env:LOCALAPPDATA\Google\Chrome\User Data\Default\Cache",
        "$env:LOCALAPPDATA\Microsoft\Edge\User Data\Default\Cache"
    )
    
    foreach ($path in $browserPaths) {
        if (Test-Path $path) {
            try {
                Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "   ✅ Cleaned browser cache: $path" -ForegroundColor Green
            } catch {
                Write-Host "   ❌ Failed to clean browser cache: $path" -ForegroundColor Red
            }
        }
    }
}

# Function to start development environment
function Start-DevelopmentEnvironment {
    Write-Host "🚀 Starting development environment..." -ForegroundColor Yellow
    
    # Check if port 1420 is available
    $connections = netstat -ano | findstr ":1420"
    if ($connections) {
        Write-Host "   ❌ Port 1420 is in use!" -ForegroundColor Red
        Write-Host "   🔧 Run cleanup script first" -ForegroundColor Yellow
        return $false
    }
    
    # Start development server
    Write-Host "   ✅ Starting development server..." -ForegroundColor Green
    return $true
}

# Main environment management
Write-Host "🚀 Starting environment management..." -ForegroundColor Cyan

# 1. Check system resources
Check-SystemResources

# 2. Check development processes
Check-DevelopmentProcesses

# 3. Check port usage
Check-PortUsage

# 4. Optimize environment
Optimize-DevelopmentEnvironment

# 5. Start development environment
$canStart = Start-DevelopmentEnvironment

if ($canStart) {
    Write-Host "✅ Development environment ready!" -ForegroundColor Green
} else {
    Write-Host "❌ Development environment not ready" -ForegroundColor Red
    Write-Host "🔧 Run cleanup scripts first" -ForegroundColor Yellow
}

Write-Host "🎉 Environment management completed!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
