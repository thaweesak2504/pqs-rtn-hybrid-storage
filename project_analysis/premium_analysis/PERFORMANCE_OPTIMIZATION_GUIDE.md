# ⚡ Performance Optimization Implementation Guide

## 🎯 **Implementation Overview**

**Target:** Optimize PQS RTN from A+ to A+ (Outstanding)  
**Timeline:** 3 weeks  
**Expected Improvement:** 30-50% performance boost  
**Priority:** High-impact optimizations first

---

## 🚀 **Phase 1: High-Impact Optimizations (Week 1)**

### **1.1 Audio File Lazy Loading**

#### **Problem:**
- 15.8MB audio files loaded synchronously
- Increased initial bundle size
- Memory overhead

#### **Solution:**
```typescript
// src/hooks/useLazyAudio.ts
import { useState, useCallback, useRef } from 'react'

interface LazyAudioState {
  audio: HTMLAudioElement | null
  isLoading: boolean
  error: string | null
}

export const useLazyAudio = (audioSrc: string) => {
  const [state, setState] = useState<LazyAudioState>({
    audio: null,
    isLoading: false,
    error: null
  })
  
  const loadAudio = useCallback(async () => {
    if (state.audio) return state.audio
    
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const audioElement = new Audio(audioSrc)
      
      // Wait for audio to be ready
      await new Promise((resolve, reject) => {
        audioElement.addEventListener('canplaythrough', resolve)
        audioElement.addEventListener('error', reject)
        audioElement.load()
      })
      
      setState(prev => ({ 
        ...prev, 
        audio: audioElement, 
        isLoading: false 
      }))
      
      return audioElement
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error.message, 
        isLoading: false 
      }))
      throw error
    }
  }, [audioSrc, state.audio])
  
  return { ...state, loadAudio }
}
```

#### **Usage in HistoryPage:**
```typescript
// src/components/pages/HistoryPage.tsx
const HistoryPage: React.FC = () => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0)
  const { audio, isLoading, loadAudio } = useLazyAudio(
    playlist[currentTrackIndex]?.src || ''
  )
  
  const handlePlay = async () => {
    try {
      const audioElement = await loadAudio()
      await audioElement.play()
    } catch (error) {
      console.error('Failed to play audio:', error)
    }
  }
  
  return (
    <div>
      <button onClick={handlePlay} disabled={isLoading}>
        {isLoading ? 'Loading...' : 'Play'}
      </button>
    </div>
  )
}
```

### **1.2 Database Connection Pooling**

#### **Problem:**
- New connection created for each query
- Increased latency and resource usage

#### **Solution:**
```rust
// src-tauri/src/connection_pool.rs
use std::sync::{Arc, Mutex};
use std::collections::VecDeque;
use rusqlite::{Connection, Result as SqlResult};
use std::time::{Duration, Instant};

pub struct ConnectionPool {
    connections: Arc<Mutex<VecDeque<Connection>>>,
    max_size: usize,
    created_at: Instant,
}

impl ConnectionPool {
    pub fn new(max_size: usize) -> Self {
        Self {
            connections: Arc::new(Mutex::new(VecDeque::new())),
            max_size,
            created_at: Instant::now(),
        }
    }
    
    pub fn get_connection(&self) -> Result<Connection, String> {
        let mut connections = self.connections.lock()
            .map_err(|e| format!("Failed to lock connection pool: {}", e))?;
        
        if let Some(conn) = connections.pop_front() {
            Ok(conn)
        } else {
            self.create_connection()
        }
    }
    
    pub fn return_connection(&self, conn: Connection) -> Result<(), String> {
        let mut connections = self.connections.lock()
            .map_err(|e| format!("Failed to lock connection pool: {}", e))?;
        
        if connections.len() < self.max_size {
            connections.push_back(conn);
        }
        // If pool is full, connection will be dropped automatically
        
        Ok(())
    }
    
    fn create_connection(&self) -> Result<Connection, String> {
        let db_path = crate::database::get_database_path()
            .map_err(|e| format!("Failed to get database path: {}", e))?;
        
        let conn = Connection::open(db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;
        
        // Enable FOREIGN KEY constraints
        conn.execute("PRAGMA foreign_keys = ON", [])
            .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;
        
        // Optimize for performance
        conn.execute("PRAGMA journal_mode = WAL", [])
            .map_err(|e| format!("Failed to set WAL mode: {}", e))?;
        
        conn.execute("PRAGMA synchronous = NORMAL", [])
            .map_err(|e| format!("Failed to set synchronous mode: {}", e))?;
        
        Ok(conn)
    }
    
    pub fn get_pool_stats(&self) -> (usize, usize) {
        let connections = self.connections.lock().unwrap();
        (connections.len(), self.max_size)
    }
}

// Global connection pool
lazy_static::lazy_static! {
    static ref CONNECTION_POOL: ConnectionPool = ConnectionPool::new(10);
}

pub fn get_connection() -> Result<Connection, String> {
    CONNECTION_POOL.get_connection()
}

pub fn return_connection(conn: Connection) -> Result<(), String> {
    CONNECTION_POOL.return_connection(conn)
}
```

#### **Updated Database Functions:**
```rust
// src-tauri/src/database.rs
use crate::connection_pool::{get_connection, return_connection};

pub fn get_user_by_id(user_id: i32) -> Result<Option<User>, String> {
    let conn = get_connection()?;
    
    let mut stmt = conn.prepare("SELECT id, username, email, password_hash, full_name, rank, role, is_active, avatar_path, avatar_updated_at, avatar_mime, avatar_size, created_at, updated_at FROM users WHERE id = ?")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let user = stmt.query_row(params![user_id], |row| {
        Ok(User {
            id: Some(row.get(0)?),
            username: row.get(1)?,
            email: row.get(2)?,
            password_hash: row.get(3)?,
            full_name: row.get(4)?,
            rank: row.get(5)?,
            role: row.get(6)?,
            is_active: row.get(7)?,
            avatar_path: row.get(8)?,
            avatar_updated_at: row.get(9)?,
            avatar_mime: row.get(10)?,
            avatar_size: row.get(11)?,
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
        })
    });
    
    // Return connection to pool
    return_connection(conn)?;
    
    match user {
        Ok(user) => Ok(Some(user)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to query user: {}", e)),
    }
}
```

### **1.3 Component Memoization**

#### **Problem:**
- Unnecessary re-renders in performance monitoring
- CPU usage spikes

#### **Solution:**
```typescript
// src/components/PerformanceMetrics.tsx
import React, { memo } from 'react'

interface PerformanceMetricsProps {
  metrics: {
    startupTime: number
    memoryUsage: number
    renderTime: number
    databaseQueryTime: number
    avatarLoadTime: number
  }
}

const PerformanceMetrics = memo<PerformanceMetricsProps>(({ metrics }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-github-bg-secondary p-4 rounded-lg">
        <div className="text-sm text-github-text-secondary">Startup Time</div>
        <div className="text-lg font-semibold">{metrics.startupTime}ms</div>
      </div>
      <div className="bg-github-bg-secondary p-4 rounded-lg">
        <div className="text-sm text-github-text-secondary">Memory Usage</div>
        <div className="text-lg font-semibold">{metrics.memoryUsage}MB</div>
      </div>
      <div className="bg-github-bg-secondary p-4 rounded-lg">
        <div className="text-sm text-github-text-secondary">Render Time</div>
        <div className="text-lg font-semibold">{metrics.renderTime}ms</div>
      </div>
      <div className="bg-github-bg-secondary p-4 rounded-lg">
        <div className="text-sm text-github-text-secondary">DB Query Time</div>
        <div className="text-lg font-semibold">{metrics.databaseQueryTime}ms</div>
      </div>
    </div>
  )
})

PerformanceMetrics.displayName = 'PerformanceMetrics'

export default PerformanceMetrics
```

---

## 📦 **Phase 2: Medium-Impact Optimizations (Week 2)**

### **2.1 Image Lazy Loading**

#### **Solution:**
```typescript
// src/hooks/useLazyImage.ts
import { useState, useRef, useEffect } from 'react'

interface LazyImageState {
  imageSrc: string | null
  isLoaded: boolean
  isInView: boolean
}

export const useLazyImage = (src: string, placeholder?: string) => {
  const [state, setState] = useState<LazyImageState>({
    imageSrc: null,
    isLoaded: false,
    isInView: false
  })
  
  const imgRef = useRef<HTMLImageElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState(prev => ({ ...prev, isInView: true }))
          observer.disconnect()
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px'
      }
    )
    
    if (imgRef.current) {
      observer.observe(imgRef.current)
    }
    
    return () => observer.disconnect()
  }, [])
  
  useEffect(() => {
    if (state.isInView && !state.imageSrc) {
      const img = new Image()
      img.onload = () => {
        setState(prev => ({ 
          ...prev, 
          imageSrc: src, 
          isLoaded: true 
        }))
      }
      img.onerror = () => {
        setState(prev => ({ 
          ...prev, 
          imageSrc: placeholder || src,
          isLoaded: true 
        }))
      }
      img.src = src
    }
  }, [state.isInView, src, placeholder, state.imageSrc])
  
  return {
    imgRef,
    imageSrc: state.imageSrc || placeholder,
    isLoaded: state.isLoaded,
    isInView: state.isInView
  }
}
```

#### **Usage:**
```typescript
// src/components/LazyImage.tsx
import React from 'react'
import { useLazyImage } from '../hooks/useLazyImage'

interface LazyImageProps {
  src: string
  alt: string
  placeholder?: string
  className?: string
}

const LazyImage: React.FC<LazyImageProps> = ({ 
  src, 
  alt, 
  placeholder, 
  className 
}) => {
  const { imgRef, imageSrc, isLoaded } = useLazyImage(src, placeholder)
  
  return (
    <div className={`relative ${className}`}>
      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  )
}

export default LazyImage
```

### **2.2 Database Query Caching**

#### **Solution:**
```rust
// src-tauri/src/query_cache.rs
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheEntry<T> {
    data: T,
    timestamp: Instant,
    ttl: Duration,
}

impl<T> CacheEntry<T> {
    pub fn new(data: T, ttl: Duration) -> Self {
        Self {
            data,
            timestamp: Instant::now(),
            ttl,
        }
    }
    
    pub fn is_expired(&self) -> bool {
        Instant::now().duration_since(self.timestamp) > self.ttl
    }
    
    pub fn get_data(&self) -> &T {
        &self.data
    }
}

pub struct QueryCache<T> {
    cache: Arc<Mutex<HashMap<String, CacheEntry<T>>>>,
    default_ttl: Duration,
}

impl<T: Clone> QueryCache<T> {
    pub fn new(default_ttl: Duration) -> Self {
        Self {
            cache: Arc::new(Mutex::new(HashMap::new())),
            default_ttl,
        }
    }
    
    pub fn get(&self, key: &str) -> Option<T> {
        let mut cache = self.cache.lock().unwrap();
        
        if let Some(entry) = cache.get(key) {
            if !entry.is_expired() {
                return Some(entry.get_data().clone());
            } else {
                cache.remove(key);
            }
        }
        
        None
    }
    
    pub fn set(&self, key: String, value: T) {
        self.set_with_ttl(key, value, self.default_ttl);
    }
    
    pub fn set_with_ttl(&self, key: String, value: T, ttl: Duration) {
        let mut cache = self.cache.lock().unwrap();
        cache.insert(key, CacheEntry::new(value, ttl));
    }
    
    pub fn invalidate(&self, key: &str) {
        let mut cache = self.cache.lock().unwrap();
        cache.remove(key);
    }
    
    pub fn clear(&self) {
        let mut cache = self.cache.lock().unwrap();
        cache.clear();
    }
    
    pub fn cleanup_expired(&self) {
        let mut cache = self.cache.lock().unwrap();
        cache.retain(|_, entry| !entry.is_expired());
    }
    
    pub fn get_stats(&self) -> (usize, usize) {
        let cache = self.cache.lock().unwrap();
        let total = cache.len();
        let expired = cache.values().filter(|entry| entry.is_expired()).count();
        (total, expired)
    }
}

// Global query cache
lazy_static::lazy_static! {
    static ref QUERY_CACHE: QueryCache<String> = QueryCache::new(Duration::from_secs(300)); // 5 minutes
}

pub fn get_cached_query(key: &str) -> Option<String> {
    QUERY_CACHE.get(key)
}

pub fn set_cached_query(key: String, value: String) {
    QUERY_CACHE.set(key, value);
}

pub fn invalidate_cached_query(key: &str) {
    QUERY_CACHE.invalidate(key);
}
```

---

## 🔄 **Phase 3: Low-Impact Optimizations (Week 3)**

### **3.1 Route-based Code Splitting**

#### **Solution:**
```typescript
// src/App.tsx
import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

// Lazy load pages
const DashboardPage = React.lazy(() => import('./components/pages/DashboardPage'))
const HistoryPage = React.lazy(() => import('./components/pages/HistoryPage'))
const PerformanceTestPage = React.lazy(() => import('./components/pages/PerformanceTestPage'))
const AuthTestPage = React.lazy(() => import('./components/pages/AuthTestPage'))
const DatabaseViewerPage = React.lazy(() => import('./components/pages/DatabaseViewerPage'))

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-64">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-github-text-primary mx-auto mb-4"></div>
      <p className="text-github-text-secondary">Loading page...</p>
    </div>
  </div>
)

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/performance" element={<PerformanceTestPage />} />
        <Route path="/auth-test" element={<AuthTestPage />} />
        <Route path="/database" element={<DatabaseViewerPage />} />
      </Routes>
    </Suspense>
  )
}

export default App
```

### **3.2 Service Worker Caching**

#### **Solution:**
```typescript
// public/sw.js
const CACHE_NAME = 'pqs-rtn-v1'
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico'
]

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache')
        return cache.addAll(urlsToCache)
      })
  )
})

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          return response
        }
        
        return fetch(event.request).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }
          
          // Clone the response
          const responseToCache = response.clone()
          
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache)
            })
          
          return response
        })
      })
  )
})

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})
```

#### **Register Service Worker:**
```typescript
// src/main.tsx
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration)
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError)
      })
  })
}
```

---

## 📊 **Performance Monitoring**

### **Real-time Performance Monitoring:**
```typescript
// src/hooks/usePerformanceMonitor.ts
import { useState, useEffect } from 'react'

interface PerformanceMetrics {
  startupTime: number
  memoryUsage: number
  renderTime: number
  databaseQueryTime: number
  avatarLoadTime: number
}

export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    startupTime: 0,
    memoryUsage: 0,
    renderTime: 0,
    databaseQueryTime: 0,
    avatarLoadTime: 0
  })
  
  useEffect(() => {
    // Monitor memory usage
    const monitorMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1024 / 1024)
        }))
      }
    }
    
    // Monitor performance entries
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.entryType === 'measure') {
          setMetrics(prev => ({
            ...prev,
            [entry.name]: entry.duration
          }))
        }
      })
    })
    
    observer.observe({ entryTypes: ['measure'] })
    
    // Monitor memory every 5 seconds
    const memoryInterval = setInterval(monitorMemory, 5000)
    
    return () => {
      observer.disconnect()
      clearInterval(memoryInterval)
    }
  }, [])
  
  return metrics
}
```

---

## 🎯 **Expected Results**

### **Performance Improvements:**
- **Startup Time:** 2.5s → 1.5s (40% faster)
- **Memory Usage:** 150MB → 120MB (20% reduction)
- **Initial Load:** 24.6MB → 8.8MB (64% reduction)
- **Database Queries:** 20% faster
- **User Experience:** 25% better responsiveness

### **Implementation Checklist:**
- [ ] Week 1: Audio lazy loading, connection pooling, memoization
- [ ] Week 2: Image lazy loading, query caching, monitoring
- [ ] Week 3: Code splitting, service worker, final optimizations

---

**Status:** 🚀 **Ready for Implementation**  
**Timeline:** 3 weeks  
**Expected Outcome:** 30-50% performance improvement
