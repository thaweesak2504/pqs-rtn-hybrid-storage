# Run Rust Tests
# Supports filtering, coverage reporting, and various output formats

param(
    [string]$Filter = "",
    [switch]$Coverage,
    [switch]$Watch,
    [switch]$Verbose,
    [switch]$NoCap,
    [string]$Format = "pretty"  # pretty, terse, json
)

$ErrorActionPreference = "Stop"

# Navigate to src-tauri directory
$originalLocation = Get-Location
Set-Location "$PSScriptRoot\..\src-tauri"

try {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Running Rust Tests" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    if ($Coverage) {
        # ===== COVERAGE MODE =====
        Write-Host "Mode: Coverage Report" -ForegroundColor Yellow
        Write-Host ""
        
        # Check if tarpaulin is installed
        Write-Host "Checking for cargo-tarpaulin..." -ForegroundColor Gray
        $tarpaulinInstalled = cargo install --list | Select-String "cargo-tarpaulin"
        
        if (-not $tarpaulinInstalled) {
            Write-Host "  ⚠️  cargo-tarpaulin not found" -ForegroundColor Yellow
            Write-Host "  Installing cargo-tarpaulin (this may take a few minutes)..." -ForegroundColor Yellow
            
            cargo install cargo-tarpaulin
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "  ❌ Failed to install cargo-tarpaulin" -ForegroundColor Red
                exit 1
            }
            
            Write-Host "  ✅ cargo-tarpaulin installed" -ForegroundColor Green
        } else {
            Write-Host "  ✅ cargo-tarpaulin already installed" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "Generating coverage report..." -ForegroundColor Yellow
        
        # Create coverage directory
        $coverageDir = "..\coverage\rust"
        if (-not (Test-Path $coverageDir)) {
            New-Item -ItemType Directory -Force -Path $coverageDir | Out-Null
        }
        
        # Build tarpaulin command
        $tarpaulinArgs = @(
            "tarpaulin",
            "--out", "Html",
            "--output-dir", $coverageDir,
            "--exclude-files", "main.rs",
            "--exclude-files", "test_helpers.rs",
            "--ignore-tests"
        )
        
        if ($Filter) {
            $tarpaulinArgs += @("--", $Filter)
        }
        
        # Run tarpaulin
        & cargo @tarpaulinArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ Coverage report generated" -ForegroundColor Green
            Write-Host "   Report: coverage\rust\index.html" -ForegroundColor Cyan
            Write-Host ""
            
            # Also generate JSON for CI
            cargo tarpaulin --out Json --output-dir $coverageDir --exclude-files "main.rs" --exclude-files "test_helpers.rs" --ignore-tests | Out-Null
        } else {
            Write-Host ""
            Write-Host "❌ Coverage generation failed" -ForegroundColor Red
            exit 1
        }
        
    } elseif ($Watch) {
        # ===== WATCH MODE =====
        Write-Host "Mode: Watch (auto-rerun on changes)" -ForegroundColor Yellow
        Write-Host ""
        
        # Check if cargo-watch is installed
        $watchInstalled = cargo install --list | Select-String "cargo-watch"
        
        if (-not $watchInstalled) {
            Write-Host "Installing cargo-watch..." -ForegroundColor Yellow
            cargo install cargo-watch
            
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Failed to install cargo-watch" -ForegroundColor Red
                exit 1
            }
        }
        
        # Build watch command
        $watchArgs = @("watch", "-x")
        
        if ($Filter) {
            $watchArgs += "test $Filter"
        } else {
            $watchArgs += "test --lib"
        }
        
        if ($NoCap) {
            $watchArgs += @("--", "--nocapture")
        }
        
        cargo @watchArgs
        
    } else {
        # ===== NORMAL TEST MODE =====
        Write-Host "Mode: Run Tests" -ForegroundColor Yellow
        
        if ($Filter) {
            Write-Host "Filter: $Filter" -ForegroundColor Gray
        }
        
        Write-Host ""
        
        # Build test command
        $testArgs = @("test")
        
        if ($Filter) {
            $testArgs += $Filter
        }
        
        # Add format
        $testArgs += @("--", "--format", $Format)
        
        if ($NoCap) {
            $testArgs += "--nocapture"
        }
        
        if ($Verbose) {
            $testArgs += "--show-output"
        }
        
        # Run tests
        Write-Host "Running: cargo $($testArgs -join ' ')" -ForegroundColor Gray
        Write-Host ""
        
        cargo @testArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ All tests passed" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "❌ Some tests failed" -ForegroundColor Red
            exit 1
        }
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Set-Location $originalLocation
}
