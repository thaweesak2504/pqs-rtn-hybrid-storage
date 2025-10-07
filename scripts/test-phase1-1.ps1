# Phase 1.1 Manual Test Script
# Test window operations to verify memory safety improvements

Write-Host "=== Phase 1.1: Window Operations Test ===" -ForegroundColor Cyan
Write-Host ""

# Check if application is running (try multiple process name patterns)
$process = Get-Process -ErrorAction SilentlyContinue | Where-Object { 
    $_.ProcessName -like '*pqs-rtn-hybrid-storage*' -or 
    $_.ProcessName -like 'pqs-rtn-hybrid-storage' -or
    $_.MainWindowTitle -like '*pqs-rtn-hybrid-storage*'
} | Select-Object -First 1

if ($process) {
    Write-Host "[OK] Application is running (PID: $($process.Id))" -ForegroundColor Green
    
    # Get initial memory usage
    $initialMemory = [math]::Round($process.WorkingSet64 / 1MB, 2)
    Write-Host "[INFO] Initial Memory: $initialMemory MB" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Manual Testing Instructions:" -ForegroundColor Cyan
    Write-Host "================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Test 1: Window Minimize - 20 times" -ForegroundColor White
    Write-Host "  * Click minimize button 20 times"
    Write-Host "  * Check for any crashes or freezes"
    Write-Host "  * Verify window restores correctly each time"
    Write-Host ""
    
    Write-Host "Test 2: Window Maximize/Restore - 50 times rapidly" -ForegroundColor White
    Write-Host "  * Click maximize button rapidly 50 times"
    Write-Host "  * Check for memory corruption crashes"
    Write-Host "  * Verify icon changes correctly (square <-> double rectangle)"
    Write-Host "  * No flickering or lag"
    Write-Host ""
    
    Write-Host "Test 3: Window Resize - 30 times" -ForegroundColor White
    Write-Host "  * Drag window corners 30 times"
    Write-Host "  * Check for smooth resizing at 60 FPS"
    Write-Host "  * Verify content resizes properly"
    Write-Host "  * No white flashing or artifacts"
    Write-Host ""
    
    Write-Host "Test 4: Window Drag - 10 times" -ForegroundColor White
    Write-Host "  * Drag window around screen 10 times"
    Write-Host "  * Check for smooth dragging"
    Write-Host "  * Verify window position updates correctly"
    Write-Host ""
    
    Write-Host "Test 5: Console Check" -ForegroundColor White
    Write-Host "  * Open DevTools with F12"
    Write-Host "  * Check Console for any warnings or errors"
    Write-Host "  * Look for setState after unmount warnings"
    Write-Host "  * Look for memory related errors"
    Write-Host ""
    
    Write-Host "Test 6: Leave Running - 10 minutes" -ForegroundColor White
    Write-Host "  * Leave application running for 10 minutes"
    Write-Host "  * Perform random window operations"
    Write-Host "  * Monitor memory usage below"
    Write-Host ""
    
    Write-Host "Press Enter when ready to check memory after testing..." -ForegroundColor Yellow
    Read-Host
    
    # Get process again (might have been restarted)
    $process = Get-Process -ErrorAction SilentlyContinue | Where-Object { 
        $_.ProcessName -like '*pqs-rtn-hybrid-storage*' -or 
        $_.ProcessName -like 'pqs-rtn-hybrid-storage' -or
        $_.MainWindowTitle -like '*pqs-rtn-hybrid-storage*'
    } | Select-Object -First 1
    
    if ($process) {
        $finalMemory = [math]::Round($process.WorkingSet64 / 1MB, 2)
        $memoryDiff = $finalMemory - $initialMemory
        
        Write-Host ""
        Write-Host "=== Memory Analysis ===" -ForegroundColor Cyan
        Write-Host "Initial Memory: $initialMemory MB" -ForegroundColor White
        Write-Host "Final Memory: $finalMemory MB" -ForegroundColor White
        
        if ($memoryDiff -gt 50) {
            Write-Host "Difference: $memoryDiff MB" -ForegroundColor Red
        } elseif ($memoryDiff -gt 20) {
            Write-Host "Difference: $memoryDiff MB" -ForegroundColor Yellow
        } else {
            Write-Host "Difference: $memoryDiff MB" -ForegroundColor Green
        }
        Write-Host ""
        
        if ($memoryDiff -gt 50) {
            Write-Host "[WARNING] Memory increased by more than 50MB - possible memory leak!" -ForegroundColor Red
        } elseif ($memoryDiff -gt 20) {
            Write-Host "[CAUTION] Memory increased by more than 20MB - monitor carefully" -ForegroundColor Yellow
        } else {
            Write-Host "[GOOD] Memory increase is acceptable" -ForegroundColor Green
        }
        
        Write-Host ""
        Write-Host "=== Test Results Summary ===" -ForegroundColor Cyan
        Write-Host "Did the application crash during testing? (Y/N): " -NoNewline
        $crashed = Read-Host
        
        Write-Host "Were there any console errors? (Y/N): " -NoNewline
        $errors = Read-Host
        
        Write-Host "Was performance smooth at 60 FPS? (Y/N): " -NoNewline
        $smooth = Read-Host
        
        Write-Host "Did maximize icon change correctly? (Y/N): " -NoNewline
        $iconChange = Read-Host
        
        Write-Host ""
        Write-Host "=== Final Verdict ===" -ForegroundColor Cyan
        
        $passCount = 0
        if ($crashed -eq "N") { 
            $passCount++
            Write-Host "[PASS] No crashes" -ForegroundColor Green 
        } else { 
            Write-Host "[FAIL] Application crashed" -ForegroundColor Red 
        }
        
        if ($errors -eq "N") { 
            $passCount++
            Write-Host "[PASS] No console errors" -ForegroundColor Green 
        } else { 
            Write-Host "[FAIL] Console errors found" -ForegroundColor Red 
        }
        
        if ($smooth -eq "Y") { 
            $passCount++
            Write-Host "[PASS] Smooth performance" -ForegroundColor Green 
        } else { 
            Write-Host "[FAIL] Performance issues" -ForegroundColor Red 
        }
        
        if ($iconChange -eq "Y") { 
            $passCount++
            Write-Host "[PASS] Icon changes correctly" -ForegroundColor Green 
        } else { 
            Write-Host "[FAIL] Icon issues" -ForegroundColor Red 
        }
        
        if ($memoryDiff -le 20) { 
            $passCount++
            Write-Host "[PASS] Memory usage acceptable" -ForegroundColor Green 
        } else { 
            Write-Host "[FAIL] Memory usage high" -ForegroundColor Red 
        }
        
        Write-Host ""
        if ($passCount -eq 5) {
            Write-Host "Score: $passCount/5" -ForegroundColor Green
        } elseif ($passCount -ge 3) {
            Write-Host "Score: $passCount/5" -ForegroundColor Yellow
        } else {
            Write-Host "Score: $passCount/5" -ForegroundColor Red
        }
        
        if ($passCount -eq 5) {
            Write-Host ""
            Write-Host "[SUCCESS] Phase 1.1 PASSED - Ready to proceed to Phase 1.2" -ForegroundColor Green
        } elseif ($passCount -ge 3) {
            Write-Host ""
            Write-Host "[PARTIAL] Phase 1.1 PARTIAL PASS - Review issues before continuing" -ForegroundColor Yellow
        } else {
            Write-Host ""
            Write-Host "[FAILED] Phase 1.1 FAILED - Must fix issues before continuing" -ForegroundColor Red
        }
        
    } else {
        Write-Host "[ERROR] Application is no longer running - possible crash!" -ForegroundColor Red
    }
    
} else {
    Write-Host "[ERROR] Application is not running. Please start it first with: npm run tauri" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test completed at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
