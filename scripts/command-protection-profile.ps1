# PowerShell Command Protection Profile
# Enhanced PowerShell configuration for safe command execution
# 
# This profile addresses the critical issue of commands with Thai characters
# (like "แ") causing terminal commands to hang or freeze, disrupting development workflow.
#
# Features:
# - Command sanitization and validation
# - Safe command execution with timeout
# - Real-time monitoring and logging
# - Error handling and recovery
# - Performance metrics and analytics

# Set consistent encoding for all operations
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

# Default parameter values for consistent encoding
$PSDefaultParameterValues = @{
    'Out-File:Encoding' = 'utf8'
    'Export-Csv:Encoding' = 'utf8'
    'Import-Csv:Encoding' = 'utf8'
    'Get-Content:Encoding' = 'utf8'
    'Set-Content:Encoding' = 'utf8'
}

# Command Protection Configuration
$CommandProtectionConfig = @{
    EnableSanitization = $true
    EnableTimeout = $true
    DefaultTimeout = 30
    MaxTimeout = 300
    EnableLogging = $true
    EnableAlerts = $true
    MaxCommandLength = 1000
    LogFile = "$env:TEMP\command-protection.log"
}

# Command execution history
$CommandHistory = @()
$MaxHistorySize = 1000

# Alert thresholds
$AlertThresholds = @{
    FailureRate = 0.2  # 20%
    TimeoutRate = 0.1  # 10%
    ExecutionTime = 10000  # 10 seconds
    SuspiciousCommands = 5  # 5 suspicious commands in a row
}

# Function to remove problematic characters from commands
function Remove-ProblematicCharacters {
    param(
        [Parameter(Mandatory=$true)]
        [string]$InputString
    )
    
    if ([string]::IsNullOrEmpty($InputString)) {
        return ""
    }
    
    # Remove Thai characters (U+0E00-U+0E7F)
    $cleaned = $InputString -replace '[\u0E00-\u0E7F]', ''
    
    # Remove invisible characters (Zero-width space, Zero-width non-joiner, Zero-width joiner, BOM)
    $cleaned = $cleaned -replace '[\u200B-\u200D\uFEFF]', ''
    
    # Remove control characters (ASCII control chars + extended control chars)
    $cleaned = $cleaned -replace '[\u0000-\u001F\u007F-\u009F]', ''
    
    return $cleaned.Trim()
}

# Function to validate command safety
function Test-CommandSafety {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Command
    )
    
    $issues = @()
    
    # Check for Thai characters
    if ($Command -match '[\u0E00-\u0E7F]') {
        $issues += "Contains Thai characters"
    }
    
    # Check for invisible characters
    if ($Command -match '[\u200B-\u200D\uFEFF]') {
        $issues += "Contains invisible characters"
    }
    
    # Check for control characters
    if ($Command -match '[\u0000-\u001F\u007F-\u009F]') {
        $issues += "Contains control characters"
    }
    
    # Check for empty command
    if ([string]::IsNullOrWhiteSpace($Command)) {
        $issues += "Empty command"
    }
    
    # Check for dangerous patterns
    $dangerousPatterns = @(
        'rm\s+-rf',
        'del\s+/s',
        'taskkill\s+/f',
        'format\s+',
        'shutdown\s+',
        'reboot\s+'
    )
    
    foreach ($pattern in $dangerousPatterns) {
        if ($Command -match $pattern) {
            $issues += "Contains dangerous command pattern: $pattern"
            break
        }
    }
    
    # Check for very long commands
    if ($Command.Length -gt $CommandProtectionConfig.MaxCommandLength) {
        $issues += "Command too long (over $($CommandProtectionConfig.MaxCommandLength) characters)"
    }
    
    return @{
        IsSafe = $issues.Count -eq 0
        Issues = $issues
        CleanedCommand = Remove-ProblematicCharacters -InputString $Command
    }
}

# Function to categorize command
function Get-CommandCategory {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Command
    )
    
    $cmd = $Command.ToLower()
    
    if ($cmd.StartsWith('git ')) { return 'git' }
    if ($cmd.StartsWith('npm ')) { return 'npm' }
    if ($cmd.StartsWith('yarn ')) { return 'yarn' }
    if ($cmd.StartsWith('node ')) { return 'node' }
    if ($cmd.StartsWith('cd ') -or $cmd.StartsWith('pushd ') -or $cmd.StartsWith('popd ')) { return 'navigation' }
    if ($cmd.StartsWith('ls') -or $cmd.StartsWith('dir') -or $cmd.StartsWith('pwd')) { return 'listing' }
    if ($cmd.StartsWith('mkdir ') -or $cmd.StartsWith('touch ') -or $cmd.StartsWith('cp ') -or $cmd.StartsWith('mv ')) { return 'file_operation' }
    if ($cmd.StartsWith('rm ') -or $cmd.StartsWith('del ')) { return 'deletion' }
    if ($cmd.StartsWith('taskkill ') -or $cmd.StartsWith('kill ') -or $cmd.StartsWith('ps ')) { return 'process_management' }
    if ($cmd.Contains('build') -or $cmd.Contains('compile')) { return 'build' }
    if ($cmd.Contains('test') -or $cmd.Contains('spec')) { return 'test' }
    
    return 'other'
}

# Function to assess risk level
function Get-CommandRiskLevel {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Command
    )
    
    $cmd = $Command.ToLower()
    
    # Critical risk
    if ($cmd.Contains('rm -rf') -or $cmd.Contains('format') -or $cmd.Contains('shutdown')) {
        return 'critical'
    }
    
    # High risk
    if ($cmd.Contains('taskkill /f') -or $cmd.Contains('del /s') -or $cmd.Contains('chmod 777')) {
        return 'high'
    }
    
    # Medium risk
    if ($cmd.Contains('git push') -or $cmd.Contains('npm install') -or $cmd.Contains('chmod')) {
        return 'medium'
    }
    
    return 'low'
}

# Function to log command execution
function Write-CommandLog {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        [Parameter(Mandatory=$false)]
        [string]$Level = 'INFO'
    )
    
    if ($CommandProtectionConfig.EnableLogging) {
        $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        $logEntry = "[$timestamp] [$Level] $Message"
        
        # Write to console
        switch ($Level) {
            'ERROR' { Write-Host $logEntry -ForegroundColor Red }
            'WARNING' { Write-Host $logEntry -ForegroundColor Yellow }
            'INFO' { Write-Host $logEntry -ForegroundColor Green }
            default { Write-Host $logEntry }
        }
        
        # Write to log file
        try {
            Add-Content -Path $CommandProtectionConfig.LogFile -Value $logEntry -Encoding UTF8
        }
        catch {
            Write-Warning "Failed to write to log file: $($_.Exception.Message)"
        }
    }
}

# Function to add command to history
function Add-CommandToHistory {
    param(
        [Parameter(Mandatory=$true)]
        [string]$OriginalCommand,
        [Parameter(Mandatory=$true)]
        [string]$SanitizedCommand,
        [Parameter(Mandatory=$true)]
        [bool]$Success,
        [Parameter(Mandatory=$true)]
        [int]$ExecutionTime,
        [Parameter(Mandatory=$false)]
        [string]$Error = $null
    )
    
    $commandEntry = @{
        Timestamp = Get-Date
        OriginalCommand = $OriginalCommand
        SanitizedCommand = $SanitizedCommand
        Success = $Success
        ExecutionTime = $ExecutionTime
        Error = $Error
        Category = Get-CommandCategory -Command $SanitizedCommand
        RiskLevel = Get-CommandRiskLevel -Command $SanitizedCommand
    }
    
    $script:CommandHistory = @($commandEntry) + $script:CommandHistory
    
    # Keep only recent history
    if ($script:CommandHistory.Count -gt $MaxHistorySize) {
        $script:CommandHistory = $script:CommandHistory[0..($MaxHistorySize - 1)]
    }
}

# Function to check for alerts
function Test-CommandAlerts {
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$CommandEntry
    )
    
    if (-not $CommandProtectionConfig.EnableAlerts) {
        return
    }
    
    # Check for high failure rate
    $recentCommands = $script:CommandHistory[0..49]  # Last 50 commands
    if ($recentCommands.Count -ge 10) {
        $failureRate = ($recentCommands | Where-Object { -not $_.Success }).Count / $recentCommands.Count
        if ($failureRate -gt $AlertThresholds.FailureRate) {
            Write-CommandLog "High failure rate detected: $([math]::Round($failureRate * 100, 1))%" 'WARNING'
        }
    }
    
    # Check for timeout
    if ($CommandEntry.ExecutionTime -gt ($AlertThresholds.ExecutionTime / 1000)) {
        Write-CommandLog "Slow command execution: $($CommandEntry.ExecutionTime)s for $($CommandEntry.SanitizedCommand)" 'WARNING'
    }
    
    # Check for suspicious commands
    if ($CommandEntry.RiskLevel -eq 'critical' -or $CommandEntry.RiskLevel -eq 'high') {
        Write-CommandLog "Suspicious command detected: $($CommandEntry.SanitizedCommand)" 'WARNING'
    }
}

# Main safe command execution function
function Invoke-SafeCommand {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Command,
        [Parameter(Mandatory=$false)]
        [int]$TimeoutSeconds = $CommandProtectionConfig.DefaultTimeout,
        [Parameter(Mandatory=$false)]
        [switch]$SkipValidation,
        [Parameter(Mandatory=$false)]
        [switch]$SkipSanitization
    )
    
    $startTime = Get-Date
    
    try {
        # Step 1: Validate command safety
        if (-not $SkipValidation) {
            $validation = Test-CommandSafety -Command $Command
            if (-not $validation.IsSafe) {
                $errorMessage = "Unsafe command detected: $($validation.Issues -join ', ')"
                Write-CommandLog $errorMessage 'ERROR'
                throw $errorMessage
            }
        }
        
        # Step 2: Sanitize command
        $cleanCommand = if ($SkipSanitization) { $Command } else { (Test-CommandSafety -Command $Command).CleanedCommand }
        
        if ([string]::IsNullOrWhiteSpace($cleanCommand)) {
            throw "Command is empty after sanitization"
        }
        
        # Step 3: Log original and cleaned command
        if ($Command -ne $cleanCommand) {
            Write-CommandLog "Original: $Command" 'INFO'
            Write-CommandLog "Cleaned:  $cleanCommand" 'INFO'
        }
        
        # Step 4: Execute with timeout
        $job = Start-Job -ScriptBlock { 
            param($cmd)
            Invoke-Expression $cmd
        } -ArgumentList $cleanCommand
        
        try {
            $result = Wait-Job $job -Timeout $TimeoutSeconds
            
            if ($result) {
                $output = Receive-Job $job
                Remove-Job $job
                
                $executionTime = [math]::Round((Get-Date - $startTime).TotalSeconds, 2)
                
                # Add to history
                Add-CommandToHistory -OriginalCommand $Command -SanitizedCommand $cleanCommand -Success $true -ExecutionTime $executionTime
                
                # Check for alerts
                $commandEntry = @{
                    SanitizedCommand = $cleanCommand
                    Success = $true
                    ExecutionTime = $executionTime
                    RiskLevel = Get-CommandRiskLevel -Command $cleanCommand
                }
                Test-CommandAlerts -CommandEntry $commandEntry
                
                Write-CommandLog "Command executed successfully in ${executionTime}s: $cleanCommand" 'INFO'
                return $output
            } else {
                Stop-Job $job
                Remove-Job $job
                throw "Command timed out after $TimeoutSeconds seconds"
            }
        } catch {
            if ($job.State -eq 'Running') {
                Stop-Job $job
                Remove-Job $job
            }
            throw $_.Exception
        }
        
    } catch {
        $executionTime = [math]::Round((Get-Date - $startTime).TotalSeconds, 2)
        $errorMessage = $_.Exception.Message
        
        # Add to history
        Add-CommandToHistory -OriginalCommand $Command -SanitizedCommand $cleanCommand -Success $false -ExecutionTime $executionTime -Error $errorMessage
        
        # Check for alerts
        $commandEntry = @{
            SanitizedCommand = $cleanCommand
            Success = $false
            ExecutionTime = $executionTime
            RiskLevel = Get-CommandRiskLevel -Command $cleanCommand
        }
        Test-CommandAlerts -CommandEntry $commandEntry
        
        Write-CommandLog "Command failed after ${executionTime}s: $errorMessage" 'ERROR'
        throw $_.Exception
    }
}

# Function to get command statistics
function Get-CommandStatistics {
    $total = $script:CommandHistory.Count
    $successful = ($script:CommandHistory | Where-Object { $_.Success }).Count
    $failed = $total - $successful
    $successRate = if ($total -gt 0) { [math]::Round(($successful / $total) * 100, 2) } else { 0 }
    $avgExecutionTime = if ($total -gt 0) { [math]::Round(($script:CommandHistory | Measure-Object -Property ExecutionTime -Average).Average, 2) } else { 0 }
    
    $categoryBreakdown = $script:CommandHistory | Group-Object Category | ForEach-Object {
        [PSCustomObject]@{
            Category = $_.Name
            Count = $_.Count
            Percentage = [math]::Round(($_.Count / $total) * 100, 2)
        }
    }
    
    $riskLevelBreakdown = $script:CommandHistory | Group-Object RiskLevel | ForEach-Object {
        [PSCustomObject]@{
            RiskLevel = $_.Name
            Count = $_.Count
            Percentage = [math]::Round(($_.Count / $total) * 100, 2)
        }
    }
    
    return @{
        TotalCommands = $total
        SuccessfulCommands = $successful
        FailedCommands = $failed
        SuccessRate = $successRate
        AverageExecutionTime = $avgExecutionTime
        CategoryBreakdown = $categoryBreakdown
        RiskLevelBreakdown = $riskLevelBreakdown
    }
}

# Function to export command history
function Export-CommandHistory {
    param(
        [Parameter(Mandatory=$false)]
        [string]$Path = "$env:TEMP\command-history.json",
        [Parameter(Mandatory=$false)]
        [string]$Format = 'json'
    )
    
    if ($Format -eq 'csv') {
        $csvPath = $Path -replace '\.json$', '.csv'
        $script:CommandHistory | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
        Write-CommandLog "Command history exported to: $csvPath" 'INFO'
    } else {
        $script:CommandHistory | ConvertTo-Json -Depth 3 | Set-Content -Path $Path -Encoding UTF8
        Write-CommandLog "Command history exported to: $Path" 'INFO'
    }
}

# Function to clear command history
function Clear-CommandHistory {
    $script:CommandHistory = @()
    Write-CommandLog "Command history cleared" 'INFO'
}

# Create aliases for easy use
Set-Alias -Name "safe" -Value "Invoke-SafeCommand"
Set-Alias -Name "cmdstats" -Value "Get-CommandStatistics"
Set-Alias -Name "cmdhistory" -Value "Export-CommandHistory"
Set-Alias -Name "clearcmd" -Value "Clear-CommandHistory"

# Enhanced prompt function
function prompt {
    $currentPath = (Get-Location).Path
    $gitBranch = ""
    
    # Check if in git repository
    if (Test-Path ".git") {
        try {
            $gitBranch = git branch --show-current 2>$null
            if ($gitBranch) {
                $gitBranch = " [$gitBranch]"
            }
        } catch {
            # Ignore git errors
        }
    }
    
    # Show command protection status
    $protectionStatus = if ($CommandProtectionConfig.EnableSanitization) { "🛡️" } else { "⚠️" }
    
    Write-Host "PS " -NoNewline -ForegroundColor Blue
    Write-Host "$currentPath" -NoNewline -ForegroundColor Green
    Write-Host "$gitBranch" -NoNewline -ForegroundColor Yellow
    Write-Host " $protectionStatus" -NoNewline -ForegroundColor Cyan
    Write-Host "> " -NoNewline -ForegroundColor Blue
    
    return " "
}

# Load profile message
Write-Host "🛡️ Command Protection Profile loaded successfully!" -ForegroundColor Green
Write-Host "📋 Available commands:" -ForegroundColor Cyan
Write-Host "   safe <command>     - Execute command safely with protection" -ForegroundColor White
Write-Host "   cmdstats           - Show command execution statistics" -ForegroundColor White
Write-Host "   cmdhistory         - Export command history" -ForegroundColor White
Write-Host "   clearcmd           - Clear command history" -ForegroundColor White
Write-Host "   Test-CommandSafety <command> - Validate command safety" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Configuration:" -ForegroundColor Cyan
Write-Host "   Sanitization: $($CommandProtectionConfig.EnableSanitization)" -ForegroundColor White
Write-Host "   Timeout: $($CommandProtectionConfig.DefaultTimeout)s" -ForegroundColor White
Write-Host "   Logging: $($CommandProtectionConfig.EnableLogging)" -ForegroundColor White
Write-Host "   Alerts: $($CommandProtectionConfig.EnableAlerts)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Example usage:" -ForegroundColor Cyan
Write-Host "   safe 'git add .'    - Safe git command execution" -ForegroundColor White
Write-Host "   safe 'npm install'  - Safe npm command execution" -ForegroundColor White
Write-Host ""
