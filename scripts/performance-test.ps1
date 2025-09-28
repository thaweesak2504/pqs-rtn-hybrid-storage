# Performance Test Script for PQS RTN Desktop App
# Measures startup time, memory usage, and database performance

Write-Host "🚀 PQS RTN Performance Test" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# 1. Measure Startup Time
Write-Host "`n📊 1. Measuring Startup Time..." -ForegroundColor Yellow
$startTime = Get-Date

# Check if app is running
$appProcess = Get-Process | Where-Object {$_.ProcessName -like "*PQS*" -or $_.ProcessName -like "*pqs*"}
if ($appProcess) {
    $startupTime = ($appProcess.StartTime - $startTime).TotalSeconds
    Write-Host "✅ App startup time: $([math]::Round($startupTime, 2)) seconds" -ForegroundColor Green
} else {
    Write-Host "⚠️ App not running" -ForegroundColor Yellow
}

# 2. Measure Memory Usage
Write-Host "`n💾 2. Measuring Memory Usage..." -ForegroundColor Yellow
$appProcess = Get-Process | Where-Object {$_.ProcessName -like "*PQS*" -or $_.ProcessName -like "*pqs*"}
if ($appProcess) {
    $workingSet = [math]::Round($appProcess.WorkingSet / 1MB, 2)
    $virtualMemory = [math]::Round($appProcess.VirtualMemorySize / 1MB, 2)
    $cpuUsage = $appProcess.CPU
    
    Write-Host "✅ Working Set: $workingSet MB" -ForegroundColor Green
    Write-Host "✅ Virtual Memory: $virtualMemory MB" -ForegroundColor Green
    Write-Host "✅ CPU Time: $cpuUsage seconds" -ForegroundColor Green
} else {
    Write-Host "⚠️ App not running" -ForegroundColor Yellow
}

# 3. Measure Database Performance
Write-Host "`n🗄️ 3. Measuring Database Performance..." -ForegroundColor Yellow
$dbPath = "$env:APPDATA\pqs-rtn-tauri\database.db"
if (Test-Path $dbPath) {
    $dbSize = [math]::Round((Get-Item $dbPath).Length / 1KB, 2)
    $dbLastModified = (Get-Item $dbPath).LastWriteTime
    
    Write-Host "✅ Database size: $dbSize KB" -ForegroundColor Green
    Write-Host "✅ Last modified: $dbLastModified" -ForegroundColor Green
} else {
    Write-Host "⚠️ Database not found" -ForegroundColor Yellow
}

# 4. Measure Backup Performance
Write-Host "`n💾 4. Measuring Backup Performance..." -ForegroundColor Yellow
$backupDir = "$env:APPDATA\pqs-rtn-tauri\backups"
if (Test-Path $backupDir) {
    $backups = Get-ChildItem $backupDir | Sort-Object LastWriteTime -Descending
    $totalBackups = $backups.Count
    $totalSize = ($backups | Measure-Object -Property Length -Sum).Sum / 1MB
    
    Write-Host "✅ Total backups: $totalBackups" -ForegroundColor Green
    Write-Host "✅ Total backup size: $([math]::Round($totalSize, 2)) MB" -ForegroundColor Green
    
    if ($backups.Count -gt 0) {
        $latestBackup = $backups[0]
        Write-Host "✅ Latest backup: $($latestBackup.Name)" -ForegroundColor Green
        Write-Host "✅ Latest backup size: $([math]::Round($latestBackup.Length / 1KB, 2)) KB" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️ Backup directory not found" -ForegroundColor Yellow
}

# 5. Measure System Resources
Write-Host "`n🖥️ 5. Measuring System Resources..." -ForegroundColor Yellow
$totalMemory = [math]::Round((Get-WmiObject -Class Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)
$availableMemory = [math]::Round((Get-WmiObject -Class Win32_OperatingSystem).FreePhysicalMemory / 1MB, 2)
$cpuCount = (Get-WmiObject -Class Win32_ComputerSystem).NumberOfLogicalProcessors

Write-Host "✅ Total RAM: $totalMemory GB" -ForegroundColor Green
Write-Host "✅ Available RAM: $availableMemory MB" -ForegroundColor Green
Write-Host "✅ CPU Cores: $cpuCount" -ForegroundColor Green

# 6. Performance Summary
Write-Host "`n📈 6. Performance Summary..." -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Green

if ($appProcess) {
    $performanceScore = 100
    
    # Deduct points for high memory usage
    if ($workingSet -gt 100) { $performanceScore -= 20 }
    if ($workingSet -gt 200) { $performanceScore -= 30 }
    
    # Deduct points for high CPU usage
    if ($cpuUsage -gt 10) { $performanceScore -= 10 }
    if ($cpuUsage -gt 30) { $performanceScore -= 20 }
    
    # Deduct points for slow startup
    if ($startupTime -gt 5) { $performanceScore -= 15 }
    if ($startupTime -gt 10) { $performanceScore -= 25 }
    
    Write-Host "✅ Performance Score: $performanceScore/100" -ForegroundColor Green
    
    if ($performanceScore -ge 90) {
        Write-Host "🎉 Excellent Performance!" -ForegroundColor Green
    } elseif ($performanceScore -ge 70) {
        Write-Host "👍 Good Performance" -ForegroundColor Yellow
    } elseif ($performanceScore -ge 50) {
        Write-Host "⚠️ Average Performance" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Poor Performance" -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ Cannot calculate performance score - app not running" -ForegroundColor Yellow
}

Write-Host "`n✅ Performance test completed!" -ForegroundColor Green
