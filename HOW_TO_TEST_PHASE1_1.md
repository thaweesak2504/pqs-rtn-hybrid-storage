# Quick Start Guide for Phase 1.1 Testing

## 🎯 Easy Method (Recommended)

### Option 1: Using the Batch File

1. **Open Terminal 1** (for running the app):
   ```powershell
   cd D:\pqs-rtn-hybrid-storage
   npm run tauri
   ```
   
   Wait for: `[SUCCESS] 🎉 Application setup completed`

2. **Open Terminal 2** (for testing):
   ```powershell
   cd D:\pqs-rtn-hybrid-storage
   .\scripts\run-phase1-1-test.bat
   ```
   
   Follow the on-screen instructions!

---

## 📝 Manual Method

### Terminal 1: Start Application
```powershell
cd D:\pqs-rtn-hybrid-storage
npm run tauri
```

**Wait for these messages:**
```
[INFO] ✅ Starting application setup...
[DEBUG] Starting database initialization...
[SUCCESS] 🎉 Database initialization successful
[SUCCESS] 🎉 File manager initialized successfully
[SUCCESS] 🎉 Main window shown successfully
[SUCCESS] 🎉 Application setup completed
```

### Terminal 2: Run Test Script
```powershell
cd D:\pqs-rtn-hybrid-storage
.\scripts\test-phase1-1.ps1
```

---

## ✅ Test Checklist

The script will guide you through:

1. **Window Minimize Test** (20 times)
   - Click minimize button repeatedly
   - Verify window restores correctly

2. **Window Maximize/Restore Test** (50 times)
   - Click maximize button rapidly
   - Check icon changes (□ ↔ ▣)
   - No crashes or lag

3. **Window Resize Test** (30 times)
   - Drag window corners
   - Smooth 60 FPS performance
   - Content resizes properly

4. **Window Drag Test** (10 times)
   - Drag window around screen
   - Smooth movement

5. **Console Check**
   - Press F12 to open DevTools
   - Check Console tab for errors
   - Look for warnings

6. **Memory Test** (10 minutes)
   - Leave app running
   - Perform random operations
   - Script will measure memory usage

---

## 📊 What the Script Does

1. ✅ Detects if application is running
2. ✅ Measures initial memory usage
3. ✅ Guides you through manual tests
4. ✅ Measures final memory usage
5. ✅ Calculates memory difference
6. ✅ Asks you about test results
7. ✅ Gives you a score (0-5)
8. ✅ Determines if Phase 1.1 passed

---

## 🎯 Success Criteria

**Must achieve 5/5:**
- ✅ No crashes during testing
- ✅ No console errors
- ✅ Smooth 60 FPS performance
- ✅ Maximize icon changes correctly
- ✅ Memory increase < 20 MB

---

## 🔍 Troubleshooting

### "Application is not running"
**Solution:** Start the app first in Terminal 1:
```powershell
npm run tauri
```

### "Failed to lock FileManager mutex"
**Solution:** Close all instances and restart

### PowerShell execution policy error
**Solution:** Run as Administrator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\scripts\test-phase1-1.ps1
```

---

## 📸 Expected Results

### ✅ PASS Example
```
=== Final Verdict ===
✅ No crashes
✅ No console errors
✅ Smooth performance
✅ Icon changes correctly
✅ Memory usage acceptable

Score: 5/5
🎉 Phase 1.1 PASSED - Ready to proceed to Phase 1.2
```

### ❌ FAIL Example
```
=== Final Verdict ===
❌ Application crashed
✅ No console errors
❌ Performance issues
✅ Icon changes correctly
⚠️ Memory usage high

Score: 2/5
❌ Phase 1.1 FAILED - Must fix issues before continuing
```

---

## 🚀 After Testing

### If PASSED (5/5):
1. Update test report with results
2. Commit test results
3. **Proceed to Phase 1.2**

### If FAILED (< 3/5):
1. Review error messages
2. Check console logs
3. Fix identified issues
4. Re-test

---

## 💡 Tips

1. **Don't rush** - Take your time with each test
2. **Watch the console** - Press F12 and keep DevTools open
3. **Monitor memory** - Use Task Manager to see real-time memory
4. **Take notes** - Document any unusual behavior
5. **Multiple runs** - If unsure, run test again

---

## 📞 Need Help?

If you encounter issues:
1. Check the application logs in Terminal 1
2. Check for error messages in DevTools Console (F12)
3. Review PHASE1_1_SUMMARY.md for troubleshooting
4. Create an issue with error details

---

**Created:** October 7, 2025  
**Phase:** 1.1 Testing  
**Status:** Ready for testing
