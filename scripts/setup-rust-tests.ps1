# Setup Rust Testing Infrastructure
# Phase A, Step A1
# This script installs test dependencies and prepares the Rust testing environment

param(
    [switch]$SkipInstall,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Rust Testing Infrastructure Setup" -ForegroundColor Cyan
Write-Host "  Phase A, Step A1" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to src-tauri directory
$originalLocation = Get-Location
Set-Location "$PSScriptRoot\..\src-tauri"

try {
    # Step 1: Verify Cargo.toml has dev-dependencies
    Write-Host "[1/4] Verifying Cargo.toml configuration..." -ForegroundColor Yellow
    
    $cargoContent = Get-Content "Cargo.toml" -Raw
    
    if ($cargoContent -match "\[dev-dependencies\]") {
        Write-Host "  ✅ [dev-dependencies] section found" -ForegroundColor Green
        
        # Check for required dependencies
        $hasTemplfile = $cargoContent -match 'tempfile\s*='
        $hasSerialTest = $cargoContent -match 'serial_test\s*='
        $hasMockall = $cargoContent -match 'mockall\s*='
        
        Write-Host "  ✅ tempfile: $hasTemplfile" -ForegroundColor $(if($hasTemplfile){"Green"}else{"Yellow"})
        Write-Host "  ✅ serial_test: $hasSerialTest" -ForegroundColor $(if($hasSerialTest){"Green"}else{"Yellow"})
        Write-Host "  ✅ mockall: $hasMockall" -ForegroundColor $(if($hasMockall){"Green"}else{"Yellow"})
    } else {
        Write-Host "  ❌ [dev-dependencies] section NOT found" -ForegroundColor Red
        Write-Host "  Please add [dev-dependencies] section to Cargo.toml" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    
    # Step 2: Install dependencies
    if (-not $SkipInstall) {
        Write-Host "[2/4] Installing test dependencies..." -ForegroundColor Yellow
        Write-Host "  Running: cargo fetch" -ForegroundColor Gray
        
        cargo fetch
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Dependencies fetched successfully" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Failed to fetch dependencies" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "[2/4] Skipping dependency installation (--SkipInstall)" -ForegroundColor Gray
    }
    
    Write-Host ""
    
    # Step 3: Verify test_helpers.rs exists
    Write-Host "[3/4] Verifying test helper module..." -ForegroundColor Yellow
    
    if (Test-Path "src/test_helpers.rs") {
        Write-Host "  ✅ test_helpers.rs exists" -ForegroundColor Green
        
        # Check if it's imported in main.rs
        $mainContent = Get-Content "src/main.rs" -Raw
        if ($mainContent -match "mod test_helpers") {
            Write-Host "  ✅ test_helpers module declared in main.rs" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  test_helpers module NOT declared in main.rs" -ForegroundColor Yellow
            Write-Host "     Add this line to main.rs:" -ForegroundColor Yellow
            Write-Host "     #[cfg(test)]" -ForegroundColor Cyan
            Write-Host "     mod test_helpers;" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  ❌ test_helpers.rs NOT found" -ForegroundColor Red
        Write-Host "     Create src/test_helpers.rs with test utilities" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    
    # Step 4: Pre-compile tests
    Write-Host "[4/4] Pre-compiling test suite..." -ForegroundColor Yellow
    Write-Host "  Running: cargo test --no-run" -ForegroundColor Gray
    
    if ($Verbose) {
        cargo test --no-run
    } else {
        cargo test --no-run 2>&1 | Out-Null
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Tests compiled successfully" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Test compilation failed" -ForegroundColor Red
        Write-Host "     Run with -Verbose to see details" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  ✅ Setup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Write your first test in a module" -ForegroundColor White
    Write-Host "  2. Run tests with: .\scripts\run-rust-tests.ps1" -ForegroundColor White
    Write-Host "  3. Check coverage with: .\scripts\run-rust-tests.ps1 -Coverage" -ForegroundColor White
    Write-Host ""
    Write-Host "Test helper functions are available in test_helpers::helpers" -ForegroundColor Cyan
    Write-Host "  - create_test_db() - In-memory database" -ForegroundColor Gray
    Write-Host "  - create_temp_db() - Temporary file database" -ForegroundColor Gray
    Write-Host "  - create_temp_dir() - Temporary directory" -ForegroundColor Gray
    Write-Host "  - init_content_schema() - Initialize content DB schema" -ForegroundColor Gray
    Write-Host "  - init_user_schema() - Initialize user DB schema" -ForegroundColor Gray
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ Error during setup: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Return to original location
    Set-Location $originalLocation
}
