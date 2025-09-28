# 🗄️ Database Implementation Guide

## 🎯 **Implementation Overview**

**Target:** Transform PQS RTN database from basic to enterprise-grade system  
**Timeline:** 4 weeks  
**Expected Outcome:** A+ database system with 10x performance improvement  
**Priority:** Critical foundation for enterprise growth

---

## 🚀 **Phase 1: Migration Framework Setup (Week 1)**

### **1.1 Migration System Implementation**

#### **Core Migration Manager:**
```rust
// src-tauri/src/migrations/mod.rs
use rusqlite::{Connection, Result as SqlResult};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Migration {
    pub id: String,
    pub version: String,
    pub name: String,
    pub up_sql: String,
    pub down_sql: String,
    pub dependencies: Vec<String>,
    pub description: String,
}

pub struct MigrationManager {
    connection: Connection,
    migrations: HashMap<String, Migration>,
}

impl MigrationManager {
    pub fn new(connection: Connection) -> Self {
        Self {
            connection,
            migrations: HashMap::new(),
        }
    }
    
    pub fn register_migration(&mut self, migration: Migration) {
        self.migrations.insert(migration.id.clone(), migration);
    }
    
    pub fn run_migrations(&self) -> Result<(), String> {
        self.create_migration_table()?;
        let applied_migrations = self.get_applied_migrations()?;
        let pending_migrations = self.get_pending_migrations(&applied_migrations)?;
        
        for migration in pending_migrations {
            self.apply_migration(&migration)?;
        }
        
        Ok(())
    }
    
    fn apply_migration(&self, migration: &Migration) -> Result<(), String> {
        println!("Applying migration: {}", migration.name);
        
        let tx = self.connection.transaction()
            .map_err(|e| format!("Failed to start transaction: {}", e))?;
        
        tx.execute(&migration.up_sql, [])
            .map_err(|e| format!("Failed to execute migration SQL: {}", e))?;
        
        tx.execute(
            "INSERT INTO migration_history (migration_name, migration_version, applied_by, status) VALUES (?, ?, ?, ?)",
            [&migration.name, &migration.version, "system", "success"]
        ).map_err(|e| format!("Failed to record migration: {}", e))?;
        
        tx.commit()
            .map_err(|e| format!("Failed to commit migration: {}", e))?;
        
        println!("Successfully applied migration: {}", migration.name);
        Ok(())
    }
}
```

### **1.2 Migration Definitions**

#### **Enhanced Users Table Migration:**
```rust
// src-tauri/src/migrations/definitions.rs
pub fn register_all_migrations(manager: &mut MigrationManager) {
    // Migration 001: Enhanced users table
    manager.register_migration(Migration {
        id: "001".to_string(),
        version: "1.0.0".to_string(),
        name: "enhance_users_table".to_string(),
        up_sql: r#"
            -- Add new columns
            ALTER TABLE users ADD COLUMN last_login_at DATETIME;
            ALTER TABLE users ADD COLUMN login_count INTEGER DEFAULT 0;
            ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
            ALTER TABLE users ADD COLUMN locked_until DATETIME;
            
            -- Create performance indexes
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
            CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
            CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);
        "#.to_string(),
        down_sql: r#"
            DROP INDEX IF EXISTS idx_users_username;
            DROP INDEX IF EXISTS idx_users_email;
            DROP INDEX IF EXISTS idx_users_role;
            DROP INDEX IF EXISTS idx_users_active;
            DROP INDEX IF EXISTS idx_users_last_login;
        "#.to_string(),
        dependencies: vec![],
        description: "Add performance indexes and user tracking fields".to_string(),
    });
}
```

---

## 🏗️ **Phase 2: Enhanced Schema Implementation (Week 2)**

### **2.1 Documents Table Implementation**

#### **Documents Schema:**
```sql
-- Documents Table for PQS Document Management
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    section INTEGER NOT NULL,
    document_number INTEGER NOT NULL,
    template_id INTEGER,
    content TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    metadata JSON,
    status TEXT NOT NULL DEFAULT 'draft',
    version INTEGER NOT NULL DEFAULT 1,
    created_by INTEGER NOT NULL,
    updated_by INTEGER,
    reviewed_by INTEGER,
    approved_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    approved_at DATETIME,
    
    FOREIGN KEY (template_id) REFERENCES templates(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Performance Indexes
CREATE INDEX idx_documents_section ON documents(section);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created_by ON documents(created_by);
CREATE INDEX idx_documents_updated_at ON documents(updated_at);
CREATE INDEX idx_documents_section_number ON documents(section, document_number);
CREATE UNIQUE INDEX idx_documents_unique ON documents(section, document_number);
```

### **2.2 Templates Table Implementation**

#### **Templates Schema:**
```sql
-- Templates Table
CREATE TABLE templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    section INTEGER NOT NULL,
    template_content TEXT NOT NULL,
    template_hash TEXT NOT NULL,
    fields JSON NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    is_system BOOLEAN NOT NULL DEFAULT 0,
    created_by INTEGER NOT NULL,
    updated_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Performance Indexes
CREATE INDEX idx_templates_section ON templates(section);
CREATE INDEX idx_templates_active ON templates(is_active);
CREATE INDEX idx_templates_system ON templates(is_system);
CREATE INDEX idx_templates_created_by ON templates(created_by);
```

---

## ⚡ **Phase 3: Performance Optimization (Week 3)**

### **3.1 Connection Pooling Implementation**

#### **Connection Pool Manager:**
```rust
// src-tauri/src/database/pool.rs
use std::sync::{Arc, Mutex};
use std::collections::VecDeque;
use rusqlite::Connection;

pub struct ConnectionPool {
    connections: Arc<Mutex<VecDeque<Connection>>>,
    max_size: usize,
    current_size: Arc<Mutex<usize>>,
}

impl ConnectionPool {
    pub fn new(max_size: usize) -> Self {
        Self {
            connections: Arc::new(Mutex::new(VecDeque::new())),
            max_size,
            current_size: Arc::new(Mutex::new(0)),
        }
    }
    
    pub fn get_connection(&self) -> Result<PooledConnection, String> {
        let mut connections = self.connections.lock().unwrap();
        
        if let Some(conn) = connections.pop_front() {
            return Ok(PooledConnection::new(conn, self.connections.clone()));
        }
        
        let mut current_size = self.current_size.lock().unwrap();
        if *current_size < self.max_size {
            let conn = self.create_connection()?;
            *current_size += 1;
            return Ok(PooledConnection::new(conn, self.connections.clone()));
        }
        
        Err("Connection pool exhausted".to_string())
    }
    
    fn create_connection(&self) -> Result<Connection, String> {
        let db_path = get_database_path()?;
        let conn = Connection::open(db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;
        
        // Optimize connection settings
        conn.execute("PRAGMA foreign_keys = ON", [])?;
        conn.execute("PRAGMA journal_mode = WAL", [])?;
        conn.execute("PRAGMA synchronous = NORMAL", [])?;
        conn.execute("PRAGMA cache_size = 10000", [])?;
        conn.execute("PRAGMA temp_store = MEMORY", [])?;
        
        Ok(conn)
    }
}
```

### **3.2 Query Performance Monitoring**

#### **Performance Monitor:**
```rust
// src-tauri/src/database/performance.rs
use std::time::Instant;
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryMetrics {
    pub sql: String,
    pub execution_time_ms: u64,
    pub rows_affected: usize,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

pub struct PerformanceMonitor {
    metrics: Vec<QueryMetrics>,
    slow_query_threshold_ms: u64,
}

impl PerformanceMonitor {
    pub fn new(slow_query_threshold_ms: u64) -> Self {
        Self {
            metrics: Vec::new(),
            slow_query_threshold_ms,
        }
    }
    
    pub fn record_query<F, R>(&mut self, sql: &str, f: F) -> Result<R, String>
    where
        F: FnOnce() -> Result<R, String>,
    {
        let start = Instant::now();
        let result = f()?;
        let duration = start.elapsed();
        
        let metrics = QueryMetrics {
            sql: sql.to_string(),
            execution_time_ms: duration.as_millis() as u64,
            rows_affected: 0,
            timestamp: chrono::Utc::now(),
        };
        
        self.metrics.push(metrics.clone());
        
        if metrics.execution_time_ms > self.slow_query_threshold_ms {
            println!("Slow query detected: {}ms - {}", metrics.execution_time_ms, sql);
        }
        
        Ok(result)
    }
}
```

---

## 💾 **Phase 4: Backup & Recovery (Week 4)**

### **4.1 Backup System Implementation**

#### **Backup Manager:**
```rust
// src-tauri/src/backup/mod.rs
use std::path::PathBuf;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct BackupConfig {
    pub backup_directory: PathBuf,
    pub retention_days: u32,
    pub compression_enabled: bool,
    pub schedule: BackupSchedule,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum BackupSchedule {
    Daily { hour: u8 },
    Weekly { day: u8, hour: u8 },
    Manual,
}

pub struct BackupManager {
    config: BackupConfig,
    connection: Connection,
}

impl BackupManager {
    pub fn new(config: BackupConfig, connection: Connection) -> Self {
        Self { config, connection }
    }
    
    pub async fn create_backup(&self, backup_type: BackupType) -> Result<BackupResult, String> {
        let backup_path = self.generate_backup_path(backup_type);
        
        std::fs::create_dir_all(&backup_path.parent().unwrap())
            .map_err(|e| format!("Failed to create backup directory: {}", e))?;
        
        let start_time = Instant::now();
        let backup_size = self.perform_backup(&backup_path, backup_type).await?;
        let duration = start_time.elapsed();
        
        let backup_record = BackupRecord {
            id: uuid::Uuid::new_v4().to_string(),
            backup_type,
            backup_path: backup_path.clone(),
            backup_size,
            status: BackupStatus::Success,
            created_at: Utc::now(),
            duration,
            error_message: None,
        };
        
        self.record_backup(backup_record.clone()).await?;
        
        Ok(BackupResult {
            backup_path,
            backup_size,
            duration,
        })
    }
    
    async fn perform_backup(&self, backup_path: &PathBuf, backup_type: BackupType) -> Result<u64, String> {
        match backup_type {
            BackupType::Full => self.create_full_backup(backup_path).await,
            BackupType::Incremental => self.create_incremental_backup(backup_path).await,
            BackupType::Manual => self.create_manual_backup(backup_path).await,
        }
    }
    
    async fn create_full_backup(&self, backup_path: &PathBuf) -> Result<u64, String> {
        let tables = self.get_all_tables()?;
        
        let mut backup_sql = String::new();
        backup_sql.push_str("BEGIN TRANSACTION;\n");
        
        for table in tables {
            backup_sql.push_str(&format!("DELETE FROM {};\n", table));
            backup_sql.push_str(&format!("INSERT INTO {} SELECT * FROM main.{};\n", table, table));
        }
        
        backup_sql.push_str("COMMIT;\n");
        
        std::fs::write(backup_path, backup_sql)
            .map_err(|e| format!("Failed to write backup file: {}", e))?;
        
        let metadata = std::fs::metadata(backup_path)
            .map_err(|e| format!("Failed to get backup file metadata: {}", e))?;
        
        Ok(metadata.len())
    }
}
```

### **4.2 Recovery System**

#### **Recovery Implementation:**
```rust
impl BackupManager {
    pub async fn restore_backup(&self, backup_path: &PathBuf) -> Result<(), String> {
        println!("Starting backup restoration from: {:?}", backup_path);
        
        self.validate_backup_file(backup_path)?;
        let restore_point = self.create_restore_point().await?;
        
        match self.perform_restore(backup_path).await {
            Ok(_) => {
                println!("Backup restored successfully");
                Ok(())
            }
            Err(e) => {
                println!("Restore failed, rolling back to restore point");
                self.rollback_to_restore_point(restore_point).await?;
                Err(format!("Restore failed: {}", e))
            }
        }
    }
    
    async fn perform_restore(&self, backup_path: &PathBuf) -> Result<(), String> {
        let backup_content = std::fs::read_to_string(backup_path)
            .map_err(|e| format!("Failed to read backup file: {}", e))?;
        
        self.connection.execute_batch(&backup_content)
            .map_err(|e| format!("Failed to execute backup SQL: {}", e))?;
        
        self.verify_restoration()?;
        Ok(())
    }
    
    fn verify_restoration(&self) -> Result<(), String> {
        let tables = self.get_all_tables()?;
        
        for table in tables {
            let count: i64 = self.connection.query_row(
                &format!("SELECT COUNT(*) FROM {}", table),
                [],
                |row| Ok(row.get(0)?)
            ).map_err(|e| format!("Failed to count rows in {}: {}", table, e))?;
            
            if count == 0 {
                return Err(format!("Table {} is empty after restoration", table));
            }
        }
        
        Ok(())
    }
}
```

---

## 📊 **Implementation Timeline**

### **Week 1: Migration Framework**
- [ ] Day 1-2: Migration system architecture
- [ ] Day 3-4: Migration definitions and registry
- [ ] Day 5-6: Migration testing and validation
- [ ] Day 7: Migration documentation

### **Week 2: Enhanced Schema**
- [ ] Day 1-2: Enhanced users table with indexes
- [ ] Day 3-4: Documents and templates tables
- [ ] Day 5-6: User sessions and activity tracking
- [ ] Day 7: Schema testing and validation

### **Week 3: Performance Optimization**
- [ ] Day 1-2: Connection pooling implementation
- [ ] Day 3-4: Query caching and optimization
- [ ] Day 5-6: Performance monitoring
- [ ] Day 7: Performance testing and benchmarks

### **Week 4: Backup & Recovery**
- [ ] Day 1-2: Backup system implementation
- [ ] Day 3-4: Recovery system and validation
- [ ] Day 5-6: Automated backup scheduling
- [ ] Day 7: Backup testing and documentation

---

## 🎯 **Expected Results**

### **Performance Improvements:**
- **Query Performance:** 2x faster with optimized indexes
- **Connection Management:** 2.5x faster with connection pooling
- **Scalability:** 10x more users with multi-user schema
- **Data Safety:** 100% backup coverage with automated system
- **Migration Safety:** Zero-downtime migrations with rollback

### **Database Grade Projection:**
- **Current Grade:** B+ (Good Foundation)
- **After Implementation:** A+ (Enterprise-Grade)

---

**Status:** 🚀 **Ready for Database Implementation**  
**Timeline:** 4 weeks for complete database optimization  
**Expected Outcome:** A+ enterprise-grade database system
