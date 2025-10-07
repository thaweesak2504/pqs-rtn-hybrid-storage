# การวิเคราะห์การใช้ Memory เชิงลึก (Deep Memory Analysis)

## 📊 Executive Summary

โปรเจค `pqs-rtn-hybrid-storage` เป็น Desktop Application ที่พัฒนาด้วย Tauri (Rust Backend) + React (TypeScript Frontend) ซึ่งประสบปัญหา **Memory Corruption Crashes** และ **Performance Issues** โดยเฉพาะในส่วนของการจัดการ Window Events และการจัดการไฟล์ Avatar

### 🔴 ปัญหาหลักที่พบ
1. **Memory Corruption** จาก Tauri Event Listeners (Window Resize/Maximize)
2. **Memory Leaks** จาก React useEffect Dependencies
3. **Excessive Memory Allocation** ในการจัดการ Avatar (Vec<u8>)
4. **Event Handler Accumulation** ที่ไม่ได้ cleanup
5. **Mutex Contention** ใน FileManager Singleton

---

## 🔍 ส่วนที่ 1: Root Cause Analysis

### 1.1 Tauri Window Event Listeners - Memory Corruption

**ไฟล์:** `src/hooks/useWindowVisibility.ts`

**ปัญหา:**
```typescript
// PROBLEM: Event listeners ที่ไม่ stable กำลังสร้าง memory corruption
const unlistenResize = await currentWindow.listen('tauri://resize', () => {
    handleResize() // ถูกเรียกซ้ำซ้อนเกินความจำเป็น
})

const unlistenMaximize = await currentWindow.listen('tauri://maximize', () => {
    handleMaximizeChange() // CRITICAL: ทำให้เกิด memory corruption
})
```

**สาเหตุ:**
- Tauri's IPC (Inter-Process Communication) สร้าง **raw pointers** ระหว่าง Rust และ JavaScript
- เมื่อ component re-render, event listeners ไม่ได้ถูก cleanup อย่างถูกต้อง
- การเรียก `handleMaximizeChange()` ซ้ำซ้อนทำให้เกิด **dangling pointers**
- Rust side ยัง reference memory ที่ JavaScript side ปล่อยไปแล้ว

**Evidence from Crash Log:**
```
thread 'main' panicked at /rustc/.../slice::from_raw_parts_mut
memory access violation
```

**Current Fix Applied:**
```typescript
// DISABLED: Maximize/unmaximize listeners to prevent memory corruption
const handleMaximizeChange = useCallback(async () => {
    // Temporarily disabled to prevent memory corruption crashes
    return
}, [onMaximizeChange])
```

---

### 1.2 React useEffect Memory Leaks

**ไฟล์:** `src/components/BaseLayout.tsx`

**ปัญหา:**
```typescript
// PROBLEM: Multiple useEffect hooks with complex dependencies
useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
        const { userId } = event.detail
        if (Number(userId) === Number(user?.id)) {
            refreshAvatar() // อาจถูกเรียกซ้ำซ้อน
        }
    }
    window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener)
    return () => {
        window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener)
    }
}, [user?.id, refreshAvatar]) // Dependencies ที่อาจเปลี่ยนบ่อย
```

**สาเหตุ:**
- Component มี **6+ useEffect hooks** ที่ทำงานพร้อมกัน
- Dependencies เช่น `refreshAvatar` เป็น function ที่ re-create ทุกครั้งที่ render
- Event listeners ถูกเพิ่มและลบซ้ำซ้อน
- Race conditions เมื่อ multiple effects update state พร้อมกัน

**Memory Impact:**
- แต่ละ re-render สร้าง closure ใหม่ที่ capture ค่า state เก่า
- Event listeners เก่าอาจยังไม่ถูก cleanup เมื่อมีการสร้างใหม่
- เกิด **Memory Leaks** จากการสะสมของ closures

---

### 1.3 Avatar Data Management - Excessive Memory Allocation

**ไฟล์:** `src-tauri/src/database.rs` และ `src-tauri/src/hybrid_avatar.rs`

**ปัญหา:**
```rust
// DEPRECATED but still defined in code
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Avatar {
    pub id: Option<i32>,
    pub user_id: i32,
    pub avatar_data: Vec<u8>, // ⚠️ PROBLEM: Large binary data in memory
    pub mime_type: String,
    pub file_size: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}
```

**สาเหตุ:**
- `Vec<u8>` เก็บ **binary image data** ทั้งหมดใน memory
- การ `Clone` Avatar struct จะ copy binary data ทั้งก้อน (expensive)
- หนึ่ง avatar ขนาด 1MB จะกิน memory ≈ 1MB + overhead
- ถ้ามี 100 users, load พร้อมกัน = **100+ MB** memory usage

**Current Migration to File-Based:**
```rust
pub fn save_avatar(&self, user_id: i32, file_data: &[u8], mime_type: &str) -> Result<HybridAvatarInfo, String> {
    // ✅ Save to file instead of database
    let avatar_path = self.file_manager.save_avatar_file(user_id, file_data, mime_type)?;
    
    // ✅ Only store metadata in database
    conn.execute(
        "UPDATE users SET avatar_path = ?, avatar_updated_at = ?, avatar_mime = ?, avatar_size = ? WHERE id = ?",
        params![avatar_path, updated_at, mime_type, file_size, user_id]
    ).map_err(|e| format!("Failed to update user avatar: {}", e))?;
}
```

**Remaining Issues:**
- `file_data: &[u8]` ยังคงต้องโหลดทั้งหมดเข้า memory ก่อน save
- ไม่มี streaming/chunked upload
- Frontend ยัง load avatar เป็น base64 string (memory intensive)

---

### 1.4 FileManager Mutex Contention

**ไฟล์:** `src-tauri/src/file_manager.rs`

**ปัญหา:**
```rust
lazy_static! {
    static ref FILE_MANAGER_INSTANCE: Mutex<Option<FileManager>> = Mutex::new(None);
}

pub fn get_instance() -> Result<Self, String> {
    let mut instance = FILE_MANAGER_INSTANCE.lock()
        .map_err(|e| format!("Failed to lock FileManager mutex: {}", e))?;
    
    if instance.is_none() {
        *instance = Some(Self::new()?);
    }
    
    // Clone the paths (cheap operation for PathBuf)
    let fm = instance.as_ref().unwrap();
    Ok(FileManager {
        media_dir: fm.media_dir.clone(),
        avatars_dir: fm.avatars_dir.clone(),
        high_ranks_dir: fm.high_ranks_dir.clone(),
    })
}
```

**สาเหตุ:**
- **Global Mutex** ทำให้ทุก operation ต้องรอกัน (serialization)
- Multiple threads ที่ต้องการเข้าถึง FileManager พร้อมกัน = **Contention**
- Mutex lock ใน hot path (ทุกครั้งที่ save/load avatar)
- ถ้า lock fail → panic → crash

**Performance Impact:**
- การ save avatar 10 ครั้งพร้อมกันจะเป็น serial operation
- Latency เพิ่มขึ้นตามจำนวน concurrent requests
- UI freeze เมื่อมี blocking I/O operations

---

### 1.5 React Component Re-render Cascades

**ไฟล์:** `src/components/WindowControls.tsx`

**ปัญหา:**
```typescript
const WindowControls: React.FC = () => {
  const [windowApi, setWindowApi] = useState<any>(null)
  const [isMaximized, setIsMaximized] = useState(false)
  
  // ⚠️ useWindowVisibility causes re-renders
  useWindowVisibility({
    onMaximizeChange: (_maximized) => {
      // State tracking disabled to prevent crashes
    }
  })
  
  useEffect(() => {
    // ⚠️ Async operation in useEffect
    const initWindowApi = async () => {
      // ... initialization
    }
    initWindowApi()
  }, []) // Empty deps but async operation
  
  const handleMaximize = async () => {
    await windowApi.toggleMaximize()
    
    // ⚠️ Another async operation after state change
    setTimeout(async () => {
      const maximized = await windowApi.isMaximized()
      setIsMaximized(maximized) // Trigger re-render
    }, 10)
  }
}
```

**สาเหตุ:**
- Component มี **multiple state updates** ในลำดับเดียว
- Async operations ที่ไม่ได้ cancel เมื่อ component unmount
- `setTimeout` สร้าง pending callbacks ที่อาจ execute หลัง unmount
- `useWindowVisibility` hook trigger re-render จาก window events

**Memory Impact:**
- Pending async callbacks hold references to old state
- Component re-render สร้าง virtual DOM nodes ใหม่
- Reconciliation process ใช้ memory และ CPU
- เกิด **Memory Pressure** เมื่อมี rapid state changes

---

## 📈 ส่วนที่ 2: Memory Usage Metrics

### 2.1 ประมาณการ Memory Footprint

| Component | Idle State | Active State | Peak Usage | Notes |
|-----------|------------|--------------|------------|-------|
| Tauri Process (Rust) | 20-30 MB | 50-80 MB | 150+ MB | ขึ้นกับจำนวน window events |
| WebView (Chromium) | 50-70 MB | 100-150 MB | 300+ MB | React app + DOM |
| Avatar Cache (Memory) | 0 MB | 10-50 MB | 100+ MB | ถ้า load หลาย avatars |
| Event Listeners | 1-2 MB | 5-10 MB | 20+ MB | ถ้าไม่ cleanup |
| **Total** | **70-100 MB** | **165-290 MB** | **570+ MB** | ⚠️ ไม่ optimal |

### 2.2 Memory Leak Detection Points

#### Frontend (JavaScript/TypeScript)
```typescript
// 🔴 HIGH RISK: useEffect with function dependencies
useEffect(() => {
    // Memory leak if refreshAvatar recreated every render
}, [refreshAvatar])

// 🟡 MEDIUM RISK: Event listeners without proper cleanup
window.addEventListener('avatarUpdated', handler)

// 🔴 HIGH RISK: Async operations without cancellation
setTimeout(async () => {
    // May execute after component unmount
}, 100)
```

#### Backend (Rust)
```rust
// 🔴 HIGH RISK: Vec<u8> with large binary data
pub avatar_data: Vec<u8>,

// 🟡 MEDIUM RISK: Global mutex with long-held locks
FILE_MANAGER_INSTANCE.lock()

// 🟠 LOW RISK: Clone operations on large structs
avatar.clone()
```

---

## 🛠️ ส่วนที่ 3: Comprehensive Fix Plan

### Phase 1: Critical Fixes (Priority: 🔴 HIGH)

#### 1.1 Stabilize Tauri Event Listeners

**Target:** `src/hooks/useWindowVisibility.ts`

**Current Issue:**
- Event listeners causing memory corruption
- No proper cleanup mechanism

**Solution:**
```typescript
export const useWindowVisibility = (options: WindowVisibilityOptions = {}) => {
  const {
    onVisibilityChange,
    onFocusChange,
    onResize,
    onMaximizeChange,
    debounceMs = 100
  } = options

  // ✅ Use refs to maintain stable references
  const optionsRef = useRef({ onVisibilityChange, onFocusChange, onResize, onMaximizeChange })
  
  useEffect(() => {
    optionsRef.current = { onVisibilityChange, onFocusChange, onResize, onMaximizeChange }
  })

  // ✅ Memoize handlers to prevent recreation
  const handleResize = useCallback(() => {
    const { onResize } = optionsRef.current
    // Implementation with rate limiting
    requestIdleCallback(() => {
      onResize?.({ width: window.innerWidth, height: window.innerHeight })
    })
  }, []) // Empty deps - stable function

  useEffect(() => {
    let mounted = true
    let cleanupFunctions: (() => void)[] = []

    const setupTauriListeners = async () => {
      if (!mounted) return
      
      try {
        const { getCurrent } = await import('@tauri-apps/api/window')
        const currentWindow = getCurrent()

        // ✅ Proper error handling and cleanup tracking
        const unlistenResize = await currentWindow.listen('tauri://resize', (event) => {
          if (mounted) {
            handleResize()
          }
        })
        
        cleanupFunctions.push(unlistenResize)

        // ✅ Re-enable maximize listener with safety
        const unlistenMaximize = await currentWindow.listen('tauri://maximize', () => {
          if (mounted && optionsRef.current.onMaximizeChange) {
            requestIdleCallback(() => {
              if (mounted) {
                optionsRef.current.onMaximizeChange?.(true)
              }
            })
          }
        })
        
        cleanupFunctions.push(unlistenMaximize)

      } catch (error) {
        console.error('Failed to setup Tauri listeners:', error)
      }
    }

    setupTauriListeners()

    // ✅ Comprehensive cleanup
    return () => {
      mounted = false
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup()
        } catch (error) {
          console.warn('Error during listener cleanup:', error)
        }
      })
      cleanupFunctions = []
    }
  }, [handleResize]) // Only depend on stable handleResize

  return state
}
```

**Benefits:**
- ✅ Prevent memory corruption from dangling pointers
- ✅ Proper cleanup of all event listeners
- ✅ Stable function references reduce re-subscriptions
- ✅ Mounted flag prevents setState after unmount

---

#### 1.2 Optimize BaseLayout useEffect Dependencies

**Target:** `src/components/BaseLayout.tsx`

**Current Issue:**
- 6+ useEffect hooks with complex dependencies
- Function dependencies causing excessive re-runs

**Solution:**
```typescript
const BaseLayout: React.FC<BaseLayoutProps> = (props) => {
  // ✅ Use useCallback with proper dependencies
  const handleAvatarUpdate = useCallback((event: CustomEvent) => {
    const { userId } = event.detail
    if (Number(userId) === Number(user?.id)) {
      refreshAvatar()
    }
  }, [user?.id, refreshAvatar])

  // ✅ Separate concerns into custom hooks
  useAvatarSync(user?.id, handleAvatarUpdate)
  useLayoutTypeSync(layoutType, setLayoutType, setCurrentPage)
  useRightPanelControl(showRightPanel, closeRightPanel)

  // Rest of component...
}

// ✅ Custom hook for avatar synchronization
function useAvatarSync(userId: number | undefined, onUpdate: (event: CustomEvent) => void) {
  const onUpdateRef = useRef(onUpdate)
  
  useEffect(() => {
    onUpdateRef.current = onUpdate
  })

  useEffect(() => {
    if (!userId) return

    const handleEvent = (event: Event) => {
      onUpdateRef.current(event as CustomEvent)
    }

    window.addEventListener('avatarUpdated', handleEvent)
    
    return () => {
      window.removeEventListener('avatarUpdated', handleEvent)
    }
  }, [userId]) // Only re-run when userId changes
}

// ✅ Custom hook for layout synchronization
function useLayoutTypeSync(
  layoutType: string,
  setLayoutType: (type: string) => void,
  setCurrentPage: (page: string) => void
) {
  useEffect(() => {
    setLayoutType(layoutType)
    setCurrentPage(layoutType)
  }, [layoutType, setLayoutType, setCurrentPage])
}

// ✅ Custom hook for right panel control
function useRightPanelControl(
  showRightPanel: boolean,
  closeRightPanel: () => void
) {
  useEffect(() => {
    if (!showRightPanel) {
      closeRightPanel()
    }
  }, [showRightPanel, closeRightPanel])
}
```

**Benefits:**
- ✅ ลดจำนวน useEffect ใน main component
- ✅ แยก concerns ทำให้ debug ง่ายขึ้น
- ✅ Stable references ลด re-runs
- ✅ Better code organization

---

#### 1.3 Implement Streaming Avatar Upload

**Target:** `src-tauri/src/hybrid_avatar.rs`

**Current Issue:**
- Load entire file into memory before processing
- No chunked/streaming support

**Solution:**
```rust
use std::io::{Read, Write};
use std::fs::File;

impl HybridAvatarManager {
    /// Save avatar with streaming to reduce memory usage
    pub fn save_avatar_stream(
        &self,
        user_id: i32,
        mut reader: impl Read,
        mime_type: &str,
        expected_size: usize
    ) -> Result<HybridAvatarInfo, String> {
        // ✅ Verify user exists first
        let conn = get_connection().map_err(|e| format!("Database error: {}", e))?;
        
        let user_exists = conn.query_row::<i32, _, _>(
            "SELECT COUNT(*) FROM users WHERE id = ?",
            params![user_id],
            |row| Ok(row.get(0)?)
        ).map_err(|e| format!("Failed to check user: {}", e))?;
        
        if user_exists == 0 {
            return Err(format!("User {} not found", user_id));
        }

        // ✅ Delete old avatar
        if let Ok(Some(old_path)) = self.get_user_avatar_path(user_id) {
            let _ = self.file_manager.delete_avatar_file(&old_path);
        }

        // ✅ Stream write to file with buffer
        let extension = match mime_type {
            "image/jpeg" => "jpg",
            "image/png" => "png",
            "image/webp" => "webp",
            _ => return Err("Unsupported image type".to_string()),
        };

        let filename = format!("user_{}.{}", user_id, extension);
        let file_path = self.file_manager.avatars_dir.join(&filename);
        
        let mut file = File::create(&file_path)
            .map_err(|e| format!("Failed to create file: {}", e))?;

        // ✅ Stream copy with 8KB buffer chunks
        const BUFFER_SIZE: usize = 8 * 1024; // 8KB chunks
        let mut buffer = vec![0u8; BUFFER_SIZE];
        let mut total_written = 0usize;

        loop {
            let bytes_read = reader.read(&mut buffer)
                .map_err(|e| format!("Read error: {}", e))?;
            
            if bytes_read == 0 {
                break;
            }

            file.write_all(&buffer[..bytes_read])
                .map_err(|e| format!("Write error: {}", e))?;
            
            total_written += bytes_read;

            // ✅ Safety check for size limits
            if total_written > 10 * 1024 * 1024 { // 10MB limit
                let _ = fs::remove_file(&file_path);
                return Err("File too large (max 10MB)".to_string());
            }
        }

        file.flush().map_err(|e| format!("Flush error: {}", e))?;

        // ✅ Update database metadata
        let updated_at = chrono::Utc::now().to_rfc3339();
        let file_size = total_written as i32;
        
        conn.execute(
            "UPDATE users SET avatar_path = ?, avatar_updated_at = ?, avatar_mime = ?, avatar_size = ? WHERE id = ?",
            params![filename, updated_at, mime_type, file_size, user_id]
        ).map_err(|e| format!("Database update error: {}", e))?;

        Ok(HybridAvatarInfo {
            user_id,
            avatar_path: Some(filename),
            avatar_updated_at: Some(updated_at),
            avatar_mime: Some(mime_type.to_string()),
            avatar_size: Some(file_size),
            file_exists: true,
        })
    }
}
```

**Benefits:**
- ✅ ใช้ memory เพียง 8KB แทนที่จะเป็น entire file
- ✅ รองรับไฟล์ขนาดใหญ่โดยไม่ overflow memory
- ✅ Size validation ระหว่าง stream
- ✅ Safer error handling

---

#### 1.4 Replace FileManager Global Mutex with Arc

**Target:** `src-tauri/src/file_manager.rs`

**Current Issue:**
- Global Mutex causing contention
- Serialization of all file operations

**Solution:**
```rust
use std::sync::Arc;
use tokio::sync::RwLock; // Or std::sync::RwLock

#[derive(Clone)]
pub struct FileManager {
    media_dir: Arc<PathBuf>,
    avatars_dir: Arc<PathBuf>,
    high_ranks_dir: Arc<PathBuf>,
}

lazy_static! {
    static ref FILE_MANAGER_INSTANCE: RwLock<Option<FileManager>> = RwLock::new(None);
}

impl FileManager {
    pub fn new() -> Result<Self, String> {
        let app_data = app_data_dir(&Config::default())
            .ok_or("Failed to get app data directory")?;
        
        let media_dir = app_data.join("pqs-rtn-hybrid-storage").join("media");
        let avatars_dir = media_dir.join("avatars");
        let high_ranks_dir = media_dir.join("high_ranks");
        
        fs::create_dir_all(&avatars_dir)
            .map_err(|e| format!("Failed to create avatars directory: {}", e))?;
        
        fs::create_dir_all(&high_ranks_dir)
            .map_err(|e| format!("Failed to create high_ranks directory: {}", e))?;
        
        // ✅ Use Arc for shared ownership
        Ok(FileManager {
            media_dir: Arc::new(media_dir),
            avatars_dir: Arc::new(avatars_dir),
            high_ranks_dir: Arc::new(high_ranks_dir),
        })
    }
    
    /// Get or create singleton instance with RwLock for better concurrency
    pub async fn get_instance() -> Result<Self, String> {
        // ✅ Try read lock first (cheap, concurrent)
        {
            let instance = FILE_MANAGER_INSTANCE.read().await;
            if let Some(fm) = instance.as_ref() {
                return Ok(fm.clone()); // Arc clone is cheap
            }
        }
        
        // ✅ Upgrade to write lock only if needed
        let mut instance = FILE_MANAGER_INSTANCE.write().await;
        
        // ✅ Double-check pattern
        if instance.is_none() {
            *instance = Some(Self::new()?);
        }
        
        Ok(instance.as_ref().unwrap().clone())
    }
    
    // ✅ Synchronous version for compatibility
    pub fn get_instance_sync() -> Result<Self, String> {
        use std::sync::RwLock;
        
        lazy_static! {
            static ref SYNC_INSTANCE: RwLock<Option<FileManager>> = RwLock::new(None);
        }
        
        // Try read first
        {
            let instance = SYNC_INSTANCE.read()
                .map_err(|e| format!("Failed to read lock: {}", e))?;
            
            if let Some(fm) = instance.as_ref() {
                return Ok(fm.clone());
            }
        }
        
        // Write if needed
        let mut instance = SYNC_INSTANCE.write()
            .map_err(|e| format!("Failed to write lock: {}", e))?;
        
        if instance.is_none() {
            *instance = Some(Self::new()?);
        }
        
        Ok(instance.as_ref().unwrap().clone())
    }
}
```

**Benefits:**
- ✅ **RwLock** allows multiple readers concurrently
- ✅ **Arc** enables cheap cloning (reference counting)
- ✅ Write lock only when initializing
- ✅ Much better concurrency than Mutex

---

### Phase 2: Performance Optimizations (Priority: 🟡 MEDIUM)

#### 2.1 Implement Avatar Caching Strategy

**Target:** Frontend - New file `src/hooks/useAvatarCache.ts`

**Solution:**
```typescript
import { useEffect, useRef, useState } from 'react'

interface CacheEntry {
  data: string // base64 or blob URL
  timestamp: number
  size: number
}

class AvatarCache {
  private cache = new Map<string, CacheEntry>()
  private maxSize = 50 * 1024 * 1024 // 50MB
  private currentSize = 0

  set(key: string, data: string, size: number): void {
    // Evict old entries if needed
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictOldest()
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      size
    })
    
    this.currentSize += size
  }

  get(key: string): string | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    // Update timestamp (LRU)
    entry.timestamp = Date.now()
    return entry.data
  }

  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!
      this.cache.delete(oldestKey)
      this.currentSize -= entry.size
    }
  }

  clear(): void {
    this.cache.clear()
    this.currentSize = 0
  }
}

const avatarCache = new AvatarCache()

export function useAvatarCache(userId: number | undefined, fetchFn: () => Promise<string>) {
  const [avatar, setAvatar] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!userId) {
      setAvatar(null)
      return
    }

    const cacheKey = `avatar_${userId}`
    
    // Check cache first
    const cached = avatarCache.get(cacheKey)
    if (cached) {
      setAvatar(cached)
      return
    }

    // Fetch if not in cache
    setLoading(true)
    setError(null)

    fetchFn()
      .then((data) => {
        if (!mountedRef.current) return
        
        // Estimate size (base64 is ~1.33x original)
        const size = Math.ceil(data.length * 0.75)
        avatarCache.set(cacheKey, data, size)
        
        setAvatar(data)
        setLoading(false)
      })
      .catch((err) => {
        if (!mountedRef.current) return
        setError(err)
        setLoading(false)
      })
  }, [userId, fetchFn])

  return { avatar, loading, error }
}
```

---

#### 2.2 Debounce Window Resize Events

**Target:** `src/index.css`

**Solution:**
```css
/* ✅ Use CSS containment for better performance */
.resize-container {
  contain: layout style;
}

.resize-optimized {
  will-change: transform;
  transform: translateZ(0); /* Force GPU acceleration */
}

/* ✅ Reduce repaints during resize */
.resize-container * {
  backface-visibility: hidden;
  perspective: 1000px;
}

/* ✅ Disable transitions during resize */
.resizing * {
  transition: none !important;
}
```

**JavaScript:**
```typescript
// Add to useWindowVisibility.ts
let resizing = false
let resizeTimer: number

const handleResize = () => {
  if (!resizing) {
    resizing = true
    document.body.classList.add('resizing')
  }

  clearTimeout(resizeTimer)
  
  // Use requestAnimationFrame for smoother updates
  requestAnimationFrame(() => {
    const width = window.innerWidth
    const height = window.innerHeight
    
    setState(prev => ({
      ...prev,
      windowSize: { width, height }
    }))
    
    onResize?.({ width, height })
  })

  resizeTimer = setTimeout(() => {
    resizing = false
    document.body.classList.remove('resizing')
  }, 150)
}
```

---

#### 2.3 Lazy Load Components

**Target:** `src/App.tsx`

**Solution:**
```typescript
import { lazy, Suspense } from 'react'

// ✅ Lazy load heavy components
const AdminDashboard = lazy(() => import('./components/AdminDashboard'))
const UserProfile = lazy(() => import('./components/UserProfilePanel'))
const BaseLayout = lazy(() => import('./components/BaseLayout'))

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/profile" element={<UserProfile />} />
        {/* ... */}
      </Routes>
    </Suspense>
  )
}
```

---

### Phase 3: Long-term Improvements (Priority: 🟢 LOW)

#### 3.1 Implement Virtual Scrolling for Large Lists

**Use Case:** รายการ users หรือ avatars จำนวนมาก

**Library:** `react-window` หรือ `react-virtualized`

#### 3.2 Add Memory Profiling Tools

**Tools:**
- React DevTools Profiler
- Chrome Memory Profiler
- Rust `cargo-flamegraph`

#### 3.3 Implement Progressive Image Loading

**Technique:** BlurHash, LQIP (Low Quality Image Placeholder)

---

## 📊 ส่วนที่ 4: Testing & Validation Plan

### 4.1 Memory Leak Detection

**Tools:**
```bash
# Chrome DevTools Memory Profiler
1. Open DevTools → Memory tab
2. Take heap snapshot before action
3. Perform action (e.g., open/close profile)
4. Take heap snapshot after
5. Compare snapshots - look for "Detached DOM nodes"

# Rust memory profiling
cargo install cargo-flamegraph
cargo flamegraph --bin pqs-rtn-hybrid-storage
```

### 4.2 Performance Benchmarks

**Metrics to Track:**
- Initial load time
- Component render time
- Avatar load time
- Window resize FPS
- Memory usage over time

**Target Benchmarks:**
```
Initial Load: < 2 seconds
Avatar Load: < 500ms
Window Resize: 60 FPS
Memory Idle: < 150 MB
Memory Active: < 300 MB
```

### 4.3 Crash Testing

**Scenarios:**
1. Rapid window resize (50+ times)
2. Maximize/restore loop (100+ times)
3. Upload 50 avatars simultaneously
4. Open 10 profiles at once
5. Leave app running for 24 hours

---

## 📝 ส่วนที่ 5: Implementation Timeline

### Week 1: Critical Fixes
- [ ] Day 1-2: Fix Tauri event listeners (Phase 1.1)
- [ ] Day 3-4: Optimize BaseLayout useEffect (Phase 1.2)
- [ ] Day 5: Testing and validation

### Week 2: Avatar Optimization
- [ ] Day 1-2: Implement streaming upload (Phase 1.3)
- [ ] Day 3-4: Replace Mutex with Arc (Phase 1.4)
- [ ] Day 5: Testing and validation

### Week 3: Performance
- [ ] Day 1-2: Avatar caching (Phase 2.1)
- [ ] Day 3: Resize debouncing (Phase 2.2)
- [ ] Day 4: Lazy loading (Phase 2.3)
- [ ] Day 5: Full integration testing

### Week 4: Validation & Documentation
- [ ] Day 1-2: Memory profiling
- [ ] Day 3-4: Performance benchmarks
- [ ] Day 5: Documentation update

---

## 🎯 Success Criteria

### Memory Performance
- ✅ Idle memory usage < 150 MB
- ✅ Active memory usage < 300 MB
- ✅ No memory leaks after 24 hours
- ✅ No crashes during stress testing

### Application Performance
- ✅ Window resize at 60 FPS
- ✅ Avatar load < 500ms
- ✅ Initial load < 2 seconds
- ✅ Smooth UI interactions

### Code Quality
- ✅ All event listeners properly cleaned up
- ✅ No dangling pointers
- ✅ Proper error handling
- ✅ Comprehensive logging

---

## 📚 References

### Documentation
- [Tauri IPC Best Practices](https://tauri.app/v1/guides/features/command)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Rust Memory Management](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)

### Tools
- [Chrome DevTools Memory Profiler](https://developer.chrome.com/docs/devtools/memory-problems/)
- [React DevTools Profiler](https://react.dev/learn/react-developer-tools)
- [cargo-flamegraph](https://github.com/flamegraph-rs/flamegraph)

---

## 🔄 Change Log

| Date | Author | Changes |
|------|--------|---------|
| 2025-10-07 | AI Assistant | Initial deep memory analysis document |

---

## ✅ Next Steps

1. **Review** this document with the development team
2. **Prioritize** fixes based on impact and effort
3. **Implement** Phase 1 critical fixes first
4. **Test** thoroughly after each phase
5. **Monitor** memory usage in production
6. **Iterate** based on real-world data

---

**Status:** 📋 Draft for Review  
**Priority:** 🔴 Critical  
**Estimated Effort:** 3-4 weeks full-time development
