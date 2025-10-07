# Initialization Wizard Debug Report

## Issue
After deleting `database.db` and `media` folder, the initialization wizard was not appearing even though backups existed.

## Root Cause Analysis

### 1. Empty Database File
The main issue was that the database file existed but was **0 bytes** (empty):
```
FullName      : C:\Users\Thaweesak\AppData\Roaming\pqs-rtn-hybrid-storage\database.db
Length        : 0
LastWriteTime : 10/7/2025 10:30:46 PM
```

This empty file was created by the system but wasn't properly initialized, causing:
- `check_database_exists_and_valid()` to return `false` (correct behavior)
- But the file's existence may have caused confusion in the flow

### 2. Empty Media Directory
The media directory existed with only subdirectories (avatars, high_ranks) but no actual content files.

### 3. Backend Logs Showed Correct Detection
```
[INFO] ✅ 🔍 Checking system state for initialization
[WARN] ⚠️ Database exists but is missing required tables or data
[DEBUG] 📊 Database valid: false
[DEBUG] Media directory exists but is empty
[DEBUG] 📊 Media valid: false
[DEBUG] 📊 Backups available: true
[INFO] ✅ 📈 System state result: DB=false, Media=false, Backups=true
```

The backend was correctly detecting the system state and should have triggered the wizard.

## Solution

### Step 1: Clean State
Deleted the empty database file and media directory to achieve a clean state:
```powershell
Remove-Item "$env:APPDATA\pqs-rtn-hybrid-storage\database.db" -Force
Remove-Item "$env:APPDATA\pqs-rtn-hybrid-storage\media" -Recurse -Force
```

### Step 2: Verify Backups
Confirmed backups exist:
```
Name                         Length LastWriteTime       
----                         ------ -------------        
hybrid_backup_1759846987.zip 222143 10/7/2025 9:23:07 PM
```

### Step 3: Code Changes

#### InitializationContext.tsx
Added debugging and prevented double execution in React Strict Mode:
```typescript
const [hasChecked, setHasChecked] = useState(false);

useEffect(() => {
  if (hasChecked) {
    console.log('🎯 Frontend: Already checked initialization, skipping');
    return;
  }
  
  const checkInitialization = async () => {
    console.log('🎯 Frontend: Starting initialization check');
    setHasChecked(true);
    
    // ... rest of initialization logic
  };
  
  checkInitialization();
}, []);
```

#### Fixed Import Issue
Changed from lazy loading to direct import to avoid suspense issues:
```typescript
// Before: const InitializationWizard = React.lazy(() => import('../components/InitializationWizard'));
// After: import InitializationWizard from '../components/InitializationWizard';
```

## Testing Results

### Expected Behavior
1. ✅ Delete database.db → File does not exist
2. ✅ Delete media folder → Directory does not exist
3. ✅ Backups exist → 1 backup file available
4. ✅ App starts → Backend detects: DB=false, Media=false, Backups=true
5. 🔄 Frontend receives system state → Should show wizard

### Backend Detection Working
```
[INFO] ✅ 📈 System state result: DB=false, Media=false, Backups=true
```

### Frontend Should Trigger Wizard
When `state.backup_info.has_backups === true` and either DB or media is missing, the wizard should display.

## Verification Steps

1. **Clean State**: Ensure no database file or media directory exists
2. **Backup Available**: Verify at least one backup exists
3. **App Start**: Run `npm start` and observe console logs
4. **Wizard Display**: The initialization wizard should appear with options to restore from backup or create new database

## Next Steps

1. Monitor browser console for frontend logs:
   - `🎯 Frontend: System state received`
   - `🎯 Frontend: Backups found, SHOWING WIZARD`
   - `🎯 Frontend: RENDERING WIZARD`

2. If wizard still doesn't show, check for:
   - JavaScript errors in browser console
   - CSS display issues hiding the wizard
   - React rendering issues with the wizard component

## Files Modified

- `src/contexts/InitializationContext.tsx` - Added debugging, fixed import, prevented double execution
- `src-tauri/src/main.rs` - Skip automatic initialization, let frontend control
- `src-tauri/src/hybrid_backup.rs` - Added detailed logging for system state checking

## Cleanup TODO

Once wizard is confirmed working, remove:
- Debug console.log statements
- localStorage clearing line: `localStorage.removeItem('pqs_initialization_completed');`
- Unused warning in file_manager.rs about `check_media_exists_and_valid`
