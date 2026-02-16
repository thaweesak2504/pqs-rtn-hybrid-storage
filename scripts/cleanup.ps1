# Get all conhost processes
$conhosts = Get-Process conhost -ErrorAction SilentlyContinue
foreach ($ch in $conhosts) {
    # Terminate background/headless processes
    if ($ch.MainWindowHandle -eq 0) {
        Write-Host "Terminating background conhost process (PID: $($ch.Id))"
        Stop-Process -Id $ch.Id -Force
    }
}

# Cleanup orphaned git and node processes
$others = Get-Process git, node, powershell -ErrorAction SilentlyContinue
foreach ($p in $others) {
    # If headless and not this current process
    if ($p.MainWindowHandle -eq 0 -and $p.Id -ne $PID) {
        Write-Host "Terminating background $($p.ProcessName) process (PID: $($p.Id))"
        Stop-Process -Id $p.Id -Force
    }
}

# Clear any input buffer if possible (Best effort)
[System.Console]::Flush() 2>$null

Write-Host "Comprehensive cleanup completed."
