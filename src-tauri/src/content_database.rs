use std::path::PathBuf;
use base64::{Engine as _, engine::general_purpose};
use rusqlite::{Connection, Result as SqlResult, params};
use tauri::api::path::app_data_dir;
use tauri::Config;
use crate::logger;

/// Get path to the content database file
pub fn get_content_database_path() -> Result<PathBuf, String> {
    let app_data = app_data_dir(&Config::default())
        .ok_or("Failed to get app data directory")?;
    
    let db_dir = app_data.join("pqs-rtn-hybrid-storage");
    std::fs::create_dir_all(&db_dir)
        .map_err(|e| format!("Failed to create database directory: {}", e))?;
    
    // Using 'content.db' as requested by user
    Ok(db_dir.join("content.db"))
}

pub fn get_portable_data_dir() -> Result<std::path::PathBuf, String> {
    // Strategy:
    // Dev Mode: Use AppData/pqs-rtn-hybrid-storage/storage to AVOID triggering watchers in src-tauri
    // Release Mode: Use exe_dir/data to keep it PORTABLE on USB
    
    if cfg!(debug_assertions) {
         let app_data = app_data_dir(&Config::default())
            .ok_or("Failed to get app data directory")?;
        
        let dev_storage = app_data.join("pqs-rtn-hybrid-storage").join("data");
        
        if !dev_storage.exists() {
            std::fs::create_dir_all(&dev_storage).map_err(|e| e.to_string())?;
        }
        Ok(dev_storage)
    } else {
        let mut p = std::env::current_exe().map_err(|e| e.to_string())?;
        p.pop();
        let data_dir = p.join("data");
        
        if !data_dir.exists() {
            std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
        }
        Ok(data_dir)
    }
}

/// Get connection to content database
pub fn get_content_connection() -> SqlResult<Connection> {
    let db_path = get_content_database_path().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_ERROR),
        Some(e)
    ))?;
    
    let conn = Connection::open(db_path)?;
    
    // Set busy timeout to 5 seconds to handle concurrency
    conn.busy_timeout(std::time::Duration::from_secs(5))?;

    // SQLite configuration for performance
    conn.execute("PRAGMA foreign_keys = ON", [])?;
    conn.execute("PRAGMA synchronous = NORMAL", [])?;
    conn.execute("PRAGMA temp_store = MEMORY", [])?;
    
    Ok(conn)
}

/// Initialize the content database (create tables if not exist)
pub fn initialize_content_database() -> Result<String, String> {
    logger::debug("Starting content database initialization...");
    
    let conn = get_content_connection().map_err(|e| format!("Failed to connect to content database: {}", e))?;
    
    // Create OwnerUnits table
    // This schema MUST match src/example/full_example/OwnerUnits.sql structure
    conn.execute(
        "CREATE TABLE IF NOT EXISTS OwnerUnits (
            unit_id VARCHAR(7) PRIMARY KEY,
            unit_name VARCHAR(255) NOT NULL,
            unit_abbr VARCHAR(100),
            parent_id VARCHAR(7),
            unit_level INT
        )",
        [],
    ).map_err(|e| format!("Failed to create OwnerUnits table: {}", e))?;

    // Create Documents table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS Documents (
            id VARCHAR(11) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_to TEXT,
            unit_owner_id VARCHAR(7),
            unit_code VARCHAR(5),
            doc_type VARCHAR(2),
            user_level CHAR(1),
            sequence INT,
            status VARCHAR(20) DEFAULT 'draft',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| format!("Failed to create Documents table: {}", e))?;

    // Create Sections table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS Sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id VARCHAR(11) NOT NULL,
            section_group INTEGER NOT NULL,
            section_number INTEGER NOT NULL,
            title_th TEXT NOT NULL,
            menu_label TEXT NOT NULL,
            display_order INTEGER,
            is_system_defined BOOLEAN DEFAULT 0,
            duration_value INTEGER,
            duration_unit VARCHAR(20) DEFAULT 'weeks',
            total_score INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(document_id, section_number),
            FOREIGN KEY (document_id) REFERENCES Documents(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create Sections table: {}", e))?;

    // Migration: Add scoring columns to Sections if missing
    let _ = conn.execute("ALTER TABLE Sections ADD COLUMN duration_value INTEGER", []);
    let _ = conn.execute("ALTER TABLE Sections ADD COLUMN duration_unit VARCHAR(20) DEFAULT 'weeks'", []);
    let _ = conn.execute("ALTER TABLE Sections ADD COLUMN total_score INTEGER", []);

    // Create indexes for Sections
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sections_document ON Sections(document_id)",
        [],
    ).map_err(|e| format!("Failed to create sections document index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sections_number ON Sections(document_id, section_number)",
        [],
    ).map_err(|e| format!("Failed to create sections number index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sections_group ON Sections(document_id, section_group)",
        [],
    ).map_err(|e| format!("Failed to create sections group index: {}", e))?;

    // Initialize Questions, Choices, References tables
    initialize_question_tables(&conn)?;

    // Migrate QuestionSectionLinks → L3 section_ref Questions (one-time)
    match migrate_section_links_to_ref_children() {
        Ok(count) => {
            if count > 0 {
                logger::info(&format!("Migrated {} section links to L3 section_ref Questions", count));
            }
        },
        Err(e) => logger::warn(&format!("Section link→L3 migration warning: {}", e)),
    }

    // Seed OwnerUnits if empty
    seed_owner_units(&conn)?;

    Ok("Content database initialized successfully".to_string())
}

/// Seed OwnerUnits from SQL file if table is empty
fn seed_owner_units(conn: &Connection) -> Result<(), String> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM OwnerUnits",
        [],
        |row| row.get(0)
    ).unwrap_or(0);

    if count == 0 {
        logger::info("Seeding OwnerUnits from embedded SQL...");
        let sql = include_str!("../../src/example/full_example/OwnerUnits.sql");
        conn.execute_batch(sql)
            .map_err(|e| format!("Failed to seed OwnerUnits: {}", e))?;
    }

    Ok(())
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct CreateDocumentArgs {
    pub name: String,
    pub unit_id: String, // 7-digit ID (e.g., "2272400")
    pub unit_code: String, // 5-digit code (e.g., "22724")
    pub applied_to: String,
    pub doc_type: String, // "10" or "20"
    pub user_level: String, // "0", "1", or "2"
}

/// Generate new Document ID
pub fn generate_document_id(unit_code: &str, doc_type: &str, user_level: &str) -> SqlResult<String> {
    let conn = get_content_connection()?;
    
    // Pattern to match existing sequences for this unit/type/level
    // ID format: UUUUU (5) + TT (2) + L (1) + SSS (3) = 11 digits
    // Match prefix: UUUUU + TT + L
    let prefix = format!("{}{}{}", unit_code, doc_type, user_level);
    
    // Find max sequence for this prefix
    let mut stmt = conn.prepare(
        "SELECT MAX(sequence) FROM Documents WHERE id LIKE ?1"
    )?;
    
    let max_seq: Option<i32> = stmt.query_row(
        params![format!("{}%", prefix)], 
        |row| row.get(0)
    ).unwrap_or(None);
    
    let next_seq = max_seq.unwrap_or(0) + 1;
    let new_id = format!("{}{:03}", prefix, next_seq);
    
    Ok(new_id)
}

/// Create a new document
pub fn create_document(args: CreateDocumentArgs) -> Result<String, String> {
    let conn = get_content_connection()
        .map_err(|e| format!("Failed to connect: {}", e))?;
        
    // Generate ID
    let new_id = generate_document_id(&args.unit_code, &args.doc_type, &args.user_level)
        .map_err(|e| format!("Failed to generate ID: {}", e))?;
        
    // Parse sequence for storage
    let sequence = new_id[8..11].parse::<i32>().unwrap_or(0);

    conn.execute(
        "INSERT INTO Documents (id, name, applied_to, unit_owner_id, unit_code, doc_type, user_level, sequence)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            new_id, 
            args.name, 
            args.applied_to, 
            args.unit_id, 
            args.unit_code, 
            args.doc_type, 
            args.user_level, 
            sequence
        ],
    ).map_err(|e| format!("Failed to insert document: {}", e))?;
    
    // Seed Template (100, 200, 300)
    // Need unit name for 200 System Description
    let unit_name: String = conn.query_row(
        "SELECT unit_name FROM OwnerUnits WHERE unit_id = ?1",
        params![args.unit_id], 
        |row| row.get(0)
    ).unwrap_or("Unknown Unit".to_string());

    seed_document_template(&conn, &new_id, &unit_name)
        .map_err(|e| format!("Failed to seed template: {}", e))?;

    // Auto-create Section 101 (System-defined: Precautions)
    conn.execute(
        "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, display_order, is_system_defined)
         VALUES (?1, 100, 101, 'ข้อควรระมัดระวังอันตรายพื้นฐาน', '101 Precautions', 1, 1)",
        params![new_id],
    ).map_err(|e| format!("Failed to create Section 101: {}", e))?;

    // Seed Section 101 Data (Mock Up)
    let section_101_id: i64 = conn.query_row(
        "SELECT id FROM Sections WHERE document_id = ?1 AND section_number = 101",
        params![new_id],
        |row| row.get(0)
    ).map_err(|e| format!("Failed to retrieve Section 101 ID: {}", e))?;

    seed_section_101_template(&conn, &new_id, section_101_id, 101)
        .map_err(|e| format!("Failed to seed Section 101 content: {}", e))?;

    Ok(new_id)
}

/// Seed content database from SQL file
pub fn seed_content_database_from_file(file_path: &str) -> Result<String, String> {
    logger::info(&format!("Seeding content database from file: {}", file_path));
    
    let sql_content = std::fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read SQL file: {}", e))?;
        
    let conn = get_content_connection().map_err(|e| format!("Failed to connect to content database: {}", e))?;
    
    conn.execute_batch(&sql_content)
        .map_err(|e| format!("Failed to execute SQL batch: {}", e))?;
        
    Ok("Content database seeded successfully".to_string())
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct OwnerUnit {
    pub unit_id: String,
    pub unit_name: String,
    pub unit_abbr: Option<String>,
    pub parent_id: Option<String>,
    pub unit_level: Option<i32>,
}

/// Get owner units, optionally filtered by parent_id
pub fn get_owner_units(parent_id: Option<String>) -> Result<Vec<OwnerUnit>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    let mut query = String::from("SELECT unit_id, unit_name, unit_abbr, parent_id, unit_level FROM OwnerUnits");
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(pid) = &parent_id {
        query.push_str(" WHERE parent_id = ?1");
        params.push(Box::new(pid.clone()));
    } else {
        // Top level (e.g. Navy itself or roots)
        // In our data, Level 1 roots have parent_id NULL or empty?
        // Let's assume NULL for roots based on SQL
        query.push_str(" WHERE parent_id IS NULL");
    }
    
    query.push_str(" ORDER BY unit_id");
    
    let mut stmt = conn.prepare(&query).map_err(|e| format!("Failed to prepare query: {}", e))?;
    
    let unit_iter = stmt.query_map(
        rusqlite::params_from_iter(params.iter()), 
        |row| {
            Ok(OwnerUnit {
                unit_id: row.get(0)?,
                unit_name: row.get(1)?,
                unit_abbr: row.get(2)?,
                parent_id: row.get(3)?,
                unit_level: row.get(4)?,
            })
        }
    ).map_err(|e| format!("Failed to query map: {}", e))?;
    
    let mut units = Vec::new();
    for unit in unit_iter {
        units.push(unit.map_err(|e| format!("Failed to retrieve unit row: {}", e))?);
    }
    
    Ok(units)
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct Document {
    pub id: String,
    pub name: String,
    pub applied_to: Option<String>,
    pub unit_owner_id: Option<String>,
    pub unit_code: Option<String>,
    pub doc_type: Option<String>,
    pub user_level: Option<String>,
    pub status: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

/// Search documents with filters
pub fn search_documents(
    unit_id_prefix: Option<String>,
    doc_type: Option<String>,
    name_part: Option<String>,
    status: Option<String>
) -> Result<Vec<Document>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    let mut query = String::from(
        "SELECT id, name, applied_to, unit_owner_id, unit_code, doc_type, user_level, status, created_at, updated_at 
         FROM Documents WHERE 1=1"
    );
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    // Filter by Unit Hierarchy (using LIKE 'prefix%')
    if let Some(prefix) = unit_id_prefix {
        if !prefix.is_empty() {
            query.push_str(" AND unit_owner_id LIKE ?");
            // If prefix is "227", match "227%"
            params.push(Box::new(format!("{}%", prefix)));
        }
    }
    
    // Filter by Doc Type
    if let Some(dtype) = doc_type {
        if !dtype.is_empty() {
             query.push_str(" AND doc_type = ?");
             params.push(Box::new(dtype));
        }
    }

    // Filter by Name (partial match)
    if let Some(name) = name_part {
        if !name.is_empty() {
            query.push_str(" AND name LIKE ?");
            params.push(Box::new(format!("%{}%", name)));
        }
    }

    // Filter by Status
    if let Some(st) = status {
        if !st.is_empty() {
            query.push_str(" AND status = ?");
            params.push(Box::new(st));
        }
    }
    
    query.push_str(" ORDER BY updated_at DESC, created_at DESC LIMIT 100"); // Sort by newest first, limit results

    let mut stmt = conn.prepare(&query).map_err(|e| format!("Failed to prepare query: {}", e))?;
    
    let doc_iter = stmt.query_map(
        rusqlite::params_from_iter(params.iter()),
        |row| {
            Ok(Document {
                id: row.get(0)?,
                name: row.get(1)?,
                applied_to: row.get(2)?,
                unit_owner_id: row.get(3)?,
                unit_code: row.get(4)?,
                doc_type: row.get(5)?,
                user_level: row.get(6)?,
                status: row.get(7)?,
                // SQLite DATETIME comes as string usually
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        }
    ).map_err(|e| format!("Failed to query map: {}", e))?;

    let mut docs = Vec::new();
    for doc in doc_iter {
        docs.push(doc.map_err(|e| format!("Failed to retrieve row: {}", e))?);
    }
    
    Ok(docs)
}

/// Delete a document by ID
pub fn delete_document(id: String) -> Result<String, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Check if document exists first
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM Documents WHERE id = ?1)",
        params![id],
        |row| row.get(0)
    ).unwrap_or(false);
    
    if !exists {
        return Err(format!("Document with ID {} not found", id));
    }
    
    // Perform delete
    conn.execute(
        "DELETE FROM Documents WHERE id = ?1",
        params![id]
    ).map_err(|e| format!("Failed to delete document: {}", e))?;
    
    Ok(format!("Document {} deleted successfully", id))
}

#[derive(serde::Deserialize)]
pub struct UpdateDocumentArgs {
    pub id: String,
    pub name: String,
    pub applied_to: String,
    pub doc_type: String,
    pub user_level: String,
}

/// Update an existing document
pub fn update_document(args: UpdateDocumentArgs) -> Result<String, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Check if document exists
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM Documents WHERE id = ?1)",
        params![args.id],
        |row| row.get(0)
    ).unwrap_or(false);
    
    if !exists {
        return Err(format!("Document with ID {} not found", args.id));
    }
    
    // Perform update
    conn.execute(
        "UPDATE Documents SET name = ?1, applied_to = ?2, doc_type = ?3, user_level = ?4, updated_at = CURRENT_TIMESTAMP WHERE id = ?5",
        params![args.name, args.applied_to, args.doc_type, args.user_level, args.id]
    ).map_err(|e| format!("Failed to update document: {}", e))?;
    
    Ok(format!("Document {} updated successfully", args.id))
}

#[derive(serde::Serialize)]
pub struct DocumentStats {
    pub total_count: i64,
    pub draft_count: i64,
}

/// Get statistics for the dashboard
pub fn get_document_stats() -> Result<DocumentStats, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    let total_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM Documents",
        [],
        |row| row.get(0)
    ).unwrap_or(0);
    
    let draft_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM Documents WHERE status = 'draft'",
        [],
        |row| row.get(0)
    ).unwrap_or(0);
    
    Ok(DocumentStats {
        total_count,
        draft_count,
    })
}

// ==========================================
// Advanced Question Logic & References
// ==========================================

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct Question {
    pub id: String, // UUID-like string
    pub document_id: String,
    pub section_id: Option<i64>,
    pub parent_id: Option<String>,
    pub sequence: i32,
    pub content: String,
    pub is_header: bool,
    pub description: Option<String>,
    pub answer_type: Option<String>,
    pub metadata: Option<String>, // JSON string
    pub score: Option<i32>,
    pub question_type: Option<String>,   // 'normal', 'exempted', 'required_instance'
    pub group_score: Option<i32>,
    pub display_text: Option<String>,    // e.g. "(ไม่ต้องปฏิบัติ)"
    pub is_group_header: Option<bool>,
    pub is_scored: Option<bool>,
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct QuestionChoice {
    pub id: i32,
    pub question_id: String,
    pub label: Option<String>, // ก. ข.
    pub content: String,
    pub is_correct: bool,
    pub sequence: i32,
}

#[allow(dead_code)]
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct Reference {
    pub id: i32,
    pub document_id: String,
    pub content: String,
    pub sequence: i32,
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct DocumentReference {
    pub id: i64,
    pub code: String,
    pub title: String,
    pub category: Option<String>,
    pub classification: Option<String>,
    pub resource_type: Option<String>, // New: DOCUMENT, WEBLINK, VIDEO, IMAGE, AUDIO, TEMPLATE
    pub file_path: Option<String>,
    pub created_at: String,
    pub updated_at: Option<String>,
}
#[allow(dead_code)]
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct QuestionReference {
    pub id: i32,
    pub question_id: String,
    pub reference_id: i64,
    pub location_text: Option<String>,
    pub display_order: i32,
}

#[allow(dead_code)]
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct UserAnswer {
    pub id: i32,
    pub user_id: String,
    pub question_id: String,
    pub document_id: String,
    pub answer_value: Option<String>,
    pub is_verified: bool,
    pub verified_by: Option<String>,
    pub updated_at: String,
}

/// Generate a pseudo-unique ID (Time based)
fn generate_uuid() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let start = SystemTime::now();
    let since_the_epoch = start.duration_since(UNIX_EPOCH).expect("Time went backwards");
    format!("{:x}", since_the_epoch.as_nanos()) 
    // Note: In a high-concurrency server this isn't safe, but for a single-user desktop app it's fine.
    // Ideally we'd mix in some random bits.
}

/// Initialize tables for Questions and References
// Called by main initialize_content_database, but we'll modify that function instead of adding a new one
// Use this to EXTEND existing initialization
pub fn initialize_question_tables(conn: &Connection) -> Result<(), String> {
    // Questions Table
    // Updated to include section_id, answer_type, and scoring columns
    conn.execute(
        "CREATE TABLE IF NOT EXISTS Questions (
            id TEXT PRIMARY KEY,
            document_id VARCHAR(11) NOT NULL,
            section_id INTEGER,
            parent_id TEXT,
            sequence INT NOT NULL,
            content TEXT NOT NULL,
            is_header BOOLEAN DEFAULT 0,
            description TEXT,
            answer_type VARCHAR(20) DEFAULT 'text',
            metadata TEXT,
            score INTEGER DEFAULT 0,
            question_type VARCHAR(20) DEFAULT 'normal',
            group_score INTEGER DEFAULT 0,
            display_text TEXT,
            is_group_header BOOLEAN DEFAULT 0,
            is_scored BOOLEAN DEFAULT 0,
            FOREIGN KEY(document_id) REFERENCES Documents(id) ON DELETE CASCADE,
            FOREIGN KEY(parent_id) REFERENCES Questions(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create Questions table: {}", e))?;

    // Migration: Add new columns if missing (swallow errors if they exist)
    let _ = conn.execute("ALTER TABLE Questions ADD COLUMN section_id INTEGER", []);
    let _ = conn.execute("ALTER TABLE Questions ADD COLUMN answer_type VARCHAR(20) DEFAULT 'text'", []);
    let _ = conn.execute("ALTER TABLE Questions ADD COLUMN score INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE Questions ADD COLUMN question_type VARCHAR(20) DEFAULT 'normal'", []);
    let _ = conn.execute("ALTER TABLE Questions ADD COLUMN group_score INTEGER DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE Questions ADD COLUMN display_text TEXT", []);
    let _ = conn.execute("ALTER TABLE Questions ADD COLUMN is_group_header BOOLEAN DEFAULT 0", []);
    let _ = conn.execute("ALTER TABLE Questions ADD COLUMN is_scored BOOLEAN DEFAULT 0", []);

    // Data migration: Fix existing Section 300 questions with correct scoring flags
    // Rule: L1 questions (parent_id IS NULL) with sequence 2-6 in section 300 docs → group headers
    // Rule: L2 questions (parent_id IS NOT NULL) with sequence 1-3 under seq=1 parent → not scored
    // Rule: L2 questions with sequence 4-5 under seq=1 parent → scored
    // Rule: L1 seq=7 children (seq 1-2) → not scored

    // Set is_group_header=1 for L1 questions (seq 2-6) in 300-series sections
    let _ = conn.execute(
        "UPDATE Questions SET is_group_header = 1, is_scored = 0
         WHERE parent_id IS NULL
           AND sequence BETWEEN 2 AND 6
           AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)",
        [],
    );

    // Set is_group_header=1, is_scored=0 for L1 seq=1 and seq=7 (non-scoring group headers)
    let _ = conn.execute(
        "UPDATE Questions SET is_group_header = 1, is_scored = 0
         WHERE parent_id IS NULL
           AND sequence IN (1, 7)
           AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)",
        [],
    );

    // Set is_scored=0 for L2 seq 1-3 under L1 seq=1 (prerequisites: 3xx.1.1-3xx.1.3)
    let _ = conn.execute(
        "UPDATE Questions SET is_scored = 0
         WHERE parent_id IN (
             SELECT id FROM Questions WHERE parent_id IS NULL AND sequence = 1
             AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)
         )
         AND sequence BETWEEN 1 AND 3",
        [],
    );

    // Set is_scored=1 for L2 seq 4-5 under L1 seq=1 (3xx.1.4-3xx.1.5)
    let _ = conn.execute(
        "UPDATE Questions SET is_scored = 1
         WHERE parent_id IN (
             SELECT id FROM Questions WHERE parent_id IS NULL AND sequence = 1
             AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)
         )
         AND sequence BETWEEN 4 AND 5",
        [],
    );

    // Set is_scored=0 for L2 children of L1 seq=7 (3xx.7.1-3xx.7.2)
    let _ = conn.execute(
        "UPDATE Questions SET is_scored = 0
         WHERE parent_id IN (
             SELECT id FROM Questions WHERE parent_id IS NULL AND sequence = 7
             AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)
         )",
        [],
    );

    // Set is_scored=1 for L2 children of L1 seq 2-6
    let _ = conn.execute(
        "UPDATE Questions SET is_scored = 1
         WHERE parent_id IN (
             SELECT id FROM Questions WHERE parent_id IS NULL AND sequence BETWEEN 2 AND 6
             AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)
         )
         AND is_scored = 0 AND question_type = 'normal'",
        [],
    );

    // DEBUG: Ensure 301.6 specifically is set as group header
    let _ = conn.execute(
        "UPDATE Questions SET is_group_header = 1, is_scored = 0
         WHERE parent_id IS NULL
           AND sequence = 6
           AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)",
        [],
    );

    // DEBUG: Ensure 301.6 children are scored
    let _ = conn.execute(
        "UPDATE Questions SET is_scored = 1
         WHERE parent_id IN (
             SELECT id FROM Questions WHERE parent_id IS NULL AND sequence = 6
             AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)
         )",
        [],
    );

    // Recalculate group_score for all L1 group headers in section 300
    let _ = conn.execute(
        "UPDATE Questions SET group_score = (
             SELECT COALESCE(SUM(c.score), 0)
             FROM Questions c
             WHERE c.parent_id = Questions.id AND c.is_scored = 1
         )
         WHERE is_group_header = 1
           AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)",
        [],
    );

    // Calculate and update total_score for all Section 300
    // Only count: individual scored questions (non-headers) + group headers' group_score
    // Avoid double-counting children of group headers
    let _ = conn.execute(
        "UPDATE Sections SET total_score = (
             SELECT COALESCE(SUM(
                 CASE 
                     WHEN q.is_group_header = 1 THEN q.group_score
                     WHEN q.is_scored = 1 AND q.is_group_header = 0 AND q.parent_id IS NULL THEN q.score
                     ELSE 0
                 END
             ), 0)
             FROM Questions q
             WHERE q.section_id = Sections.id
        )
        WHERE section_group = 300",
        [],
    );

    // QuestionChoices Table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS QuestionChoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id TEXT NOT NULL,
            label VARCHAR(10),
            content TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT 0,
            sequence INT NOT NULL,
            FOREIGN KEY(question_id) REFERENCES Questions(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create QuestionChoices table: {}", e))?;

    // QuestionReferences Table (Inline Citations) - NEW
    conn.execute(
        "CREATE TABLE IF NOT EXISTS QuestionReferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id TEXT NOT NULL,
            reference_id INTEGER NOT NULL,
            location_text VARCHAR(50),
            display_order INTEGER NOT NULL,
            FOREIGN KEY (question_id) REFERENCES Questions(id) ON DELETE CASCADE,
            FOREIGN KEY (reference_id) REFERENCES DocumentReferences(id) ON DELETE RESTRICT
        )",
        [],
    ).map_err(|e| format!("Failed to create QuestionReferences table: {}", e))?;

    // QuestionSectionLinks Table — links 3xx.1.4/1.5 questions to 100/200 Sections
    // Similar pattern to QuestionReferences but for Section selection
    conn.execute(
        "CREATE TABLE IF NOT EXISTS QuestionSectionLinks (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id   TEXT NOT NULL,
            section_id    INTEGER NOT NULL,
            score         INTEGER DEFAULT 0,
            display_order INTEGER NOT NULL,
            FOREIGN KEY (question_id) REFERENCES Questions(id) ON DELETE CASCADE,
            FOREIGN KEY (section_id) REFERENCES Sections(id) ON DELETE CASCADE,
            UNIQUE(question_id, section_id)
        )",
        [],
    ).map_err(|e| format!("Failed to create QuestionSectionLinks table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_qsl_question ON QuestionSectionLinks(question_id)",
        [],
    ).map_err(|e| format!("Failed to create QuestionSectionLinks index: {}", e))?;

    // UserAnswers Table (Data Storage) - NEW
    conn.execute(
        "CREATE TABLE IF NOT EXISTS UserAnswers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            question_id TEXT NOT NULL,
            document_id VARCHAR(11) NOT NULL,
            answer_value TEXT,
            is_verified BOOLEAN DEFAULT 0,
            verified_by TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, question_id, document_id),
            FOREIGN KEY(question_id) REFERENCES Questions(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create UserAnswers table: {}", e))?;

    // UserProgress Table - Track trainee scoring progress per section
    conn.execute(
        "CREATE TABLE IF NOT EXISTS UserProgress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            document_id VARCHAR(11) NOT NULL,
            section_id INTEGER,
            earned_score INTEGER DEFAULT 0,
            max_score INTEGER DEFAULT 0,
            completion_percentage REAL DEFAULT 0.0,
            is_passed BOOLEAN DEFAULT 0,
            passing_score INTEGER DEFAULT 70,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, document_id, section_id),
            FOREIGN KEY(document_id) REFERENCES Documents(id) ON DELETE CASCADE,
            FOREIGN KEY(section_id) REFERENCES Sections(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create UserProgress table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_progress_user ON UserProgress(user_id)",
        [],
    ).map_err(|e| format!("Failed to create index on UserProgress.user_id: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_progress_doc ON UserProgress(user_id, document_id)",
        [],
    ).map_err(|e| format!("Failed to create index on UserProgress: {}", e))?;

    // References Table - Reusable reference documents
    // Updated Schema 2026-02-09: Added classification, file_path. Removed usage of is_common/short_name
    conn.execute(
        "CREATE TABLE IF NOT EXISTS DocumentReferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code VARCHAR(50) NOT NULL UNIQUE,
            title TEXT NOT NULL,
            category VARCHAR(50),
            classification VARCHAR(20) DEFAULT 'Unclassified',
            file_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| format!("Failed to create DocumentReferences table: {}", e))?;

    // Migration: Add new columns if missing
    let _ = conn.execute("ALTER TABLE DocumentReferences ADD COLUMN classification VARCHAR(20) DEFAULT 'Unclassified'", []);
    let _ = conn.execute("ALTER TABLE DocumentReferences ADD COLUMN file_path TEXT", []);
    let _ = conn.execute("ALTER TABLE DocumentReferences ADD COLUMN category VARCHAR(50)", []);
    let _ = conn.execute("ALTER TABLE DocumentReferences ADD COLUMN resource_type VARCHAR(20) DEFAULT 'DOCUMENT'", []);

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_doc_refs_code ON DocumentReferences(code)",
        [],
    ).map_err(|e| format!("Failed to create index on DocumentReferences.code: {}", e))?;

    // SectionReferences Table - Many-to-many link between Sections and DocumentReferences
    conn.execute(
        "CREATE TABLE IF NOT EXISTS SectionReferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_id INTEGER NOT NULL,
            reference_id INTEGER NOT NULL,
            display_order INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(section_id, reference_id),
            FOREIGN KEY(section_id) REFERENCES Sections(id) ON DELETE CASCADE,
            FOREIGN KEY(reference_id) REFERENCES DocumentReferences(id) ON DELETE RESTRICT
        )",
        [],
    ).map_err(|e| format!("Failed to create SectionReferences table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_section_refs_section ON SectionReferences(section_id)",
        [],
    ).map_err(|e| format!("Failed to create index on SectionReferences.section_id: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_section_refs_reference ON SectionReferences(reference_id)",
        [],
    ).map_err(|e| format!("Failed to create index on SectionReferences.reference_id: {}", e))?;

    // OccupationBranches Table - Global main branches (สาขาอาชีพหลัก)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS OccupationBranches (
            code VARCHAR(10) PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| format!("Failed to create OccupationBranches table: {}", e))?;

    // OccupationSubBranches Table - Sub-branches (สาขาอาชีพย่อย)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS OccupationSubBranches (
            code VARCHAR(10) NOT NULL,
            branch_code VARCHAR(10) NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (branch_code, code),
            FOREIGN KEY (branch_code) REFERENCES OccupationBranches(code) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create OccupationSubBranches table: {}", e))?;

    // OccupationSubQuestions Table - Reusable sub-question templates
    conn.execute(
        "CREATE TABLE IF NOT EXISTS OccupationSubQuestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            branch_code VARCHAR(10) NOT NULL,
            sub_branch_code VARCHAR(10) NOT NULL,
            code VARCHAR(20) NOT NULL UNIQUE,
            text TEXT NOT NULL,
            always_checked BOOLEAN DEFAULT 0,
            sequence INTEGER DEFAULT 0,
            FOREIGN KEY (branch_code, sub_branch_code) REFERENCES OccupationSubBranches(branch_code, code) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create OccupationSubQuestions table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_occ_subq_branch ON OccupationSubQuestions(branch_code, sub_branch_code)",
        [],
    ).map_err(|e| format!("Failed to create index on OccupationSubQuestions: {}", e))?;

    Ok(())
}

/// Seed template questions for a new document
pub fn seed_document_template(conn: &Connection, doc_id: &str, unit_name: &str) -> Result<(), String> {
    // 100 Introduction
    let q100_id = generate_uuid();
    conn.execute(
        "INSERT INTO Questions (id, document_id, section_id, sequence, content, is_header, answer_type) VALUES (?1, ?2, 100, ?3, ?4, ?5, 'none')",
        params![q100_id, doc_id, 100, "100 Introduction", true]
    ).map_err(|e| format!("Failed to seed 100: {}", e))?;

    // 200 System Description (Using unit name as placeholder context)
    let q200_id = format!("{:x}2", SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos());
    conn.execute(
        "INSERT INTO Questions (id, document_id, section_id, sequence, content, is_header, answer_type) VALUES (?1, ?2, 200, ?3, ?4, ?5, 'none')",
        params![q200_id, doc_id, 200, format!("200 System Description ({})", unit_name), true]
    ).map_err(|e| format!("Failed to seed 200: {}", e))?;

    // 300 Operations
    let q300_id = format!("{:x}3", SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos());
    conn.execute(
        "INSERT INTO Questions (id, document_id, section_id, sequence, content, is_header, answer_type) VALUES (?1, ?2, 300, ?3, ?4, ?5, 'none')",
        params![q300_id, doc_id, 300, "300 Operations", true]
    ).map_err(|e| format!("Failed to seed 300: {}", e))?;

    Ok(())
}

use std::time::SystemTime;

pub fn get_document_questions(doc_id: String) -> Result<Vec<Question>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, document_id, section_id, parent_id, sequence, content, is_header, description, answer_type, metadata,
                score, question_type, group_score, display_text, is_group_header, is_scored
         FROM Questions WHERE document_id = ?1 ORDER BY sequence"
    ).map_err(|e| format!("Failed to prepare query: {}", e))?;

    let question_iter = stmt.query_map(params![doc_id], |row| {
        Ok(Question {
            id: row.get(0)?,
            document_id: row.get(1)?,
            section_id: row.get(2)?,
            parent_id: row.get(3)?,
            sequence: row.get(4)?,
            content: row.get(5)?,
            is_header: row.get(6)?,
            description: row.get(7)?,
            answer_type: row.get(8)?,
            metadata: row.get(9)?,
            score: row.get(10)?,
            question_type: row.get(11)?,
            group_score: row.get(12)?,
            display_text: row.get(13)?,
            is_group_header: row.get(14)?,
            is_scored: row.get(15)?,
        })
    }).map_err(|e| format!("Query map failed: {}", e))?;

    let mut questions = Vec::new();
    for q in question_iter {
        questions.push(q.map_err(|e| format!("Row error: {}", e))?);
    }

    Ok(questions)
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct QuestionReferenceDetail {
    pub id: i32,
    pub question_id: String,
    pub reference: DocumentReference,
    pub location_text: Option<String>,
    pub display_order: i32,
    pub thai_letter: String,
}

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct QuestionDetail {
    #[serde(flatten)]
    pub question: Question,
    pub choices: Vec<QuestionChoice>,
    pub references: Vec<QuestionReferenceDetail>,
}

pub fn get_document_questions_with_details(doc_id: String) -> Result<Vec<QuestionDetail>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // 1. Get Questions
    let mut stmt = conn.prepare(
        "SELECT id, document_id, section_id, parent_id, sequence, content, is_header, description, answer_type, metadata,
                score, question_type, group_score, display_text, is_group_header, is_scored
         FROM Questions WHERE document_id = ?1 ORDER BY sequence"
    ).map_err(|e| format!("Failed to prepare query: {}", e))?;

    let questions_iter = stmt.query_map(params![doc_id], |row| {
        Ok(Question {
            id: row.get(0)?,
            document_id: row.get(1)?,
            section_id: row.get(2)?,
            parent_id: row.get(3)?,
            sequence: row.get(4)?,
            content: row.get(5)?,
            is_header: row.get(6)?,
            description: row.get(7)?,
            answer_type: row.get(8)?,
            metadata: row.get(9)?,
            score: row.get(10)?,
            question_type: row.get(11)?,
            group_score: row.get(12)?,
            display_text: row.get(13)?,
            is_group_header: row.get(14)?,
            is_scored: row.get(15)?,
        })
    }).map_err(|e| format!("Query map failed: {}", e))?;

    let mut details = Vec::new();

    for q_res in questions_iter {
        let q = q_res.map_err(|e| e.to_string())?;
        
        // 2. Get Choices for this question
        let mut choice_stmt = conn.prepare(
            "SELECT id, question_id, label, content, is_correct, sequence 
             FROM QuestionChoices WHERE question_id = ?1 ORDER BY sequence"
        ).map_err(|e| e.to_string())?;
        
        let choices = choice_stmt.query_map(params![q.id], |row| {
             Ok(QuestionChoice {
                id: row.get(0)?,
                question_id: row.get(1)?,
                label: row.get(2)?,
                content: row.get(3)?,
                is_correct: row.get(4)?,
                sequence: row.get(5)?,
             })
        }).map_err(|e| e.to_string())?
          .collect::<Result<Vec<_>, _>>()
          .map_err(|e| e.to_string())?;

        // 3. Get References for this question
        // Optimized to Sort by Section Reference Order (Standard Order)
        // We JOIN SectionReferences (sr) on qr.reference_id AND the question's section_id.
        // NOTE: If section_id is NULL (unlikely for Section 100+), this might fail sorting.
        // Assuming all questions here have a valid section_id context or we use the linked one.
        
        // Let's use a subquery or join.
        // Filter by section_id from the question itself: q.section_id.
        let mut ref_stmt = conn.prepare(
            "SELECT qr.id, qr.question_id, qr.reference_id, qr.location_text, sr.display_order,
                    dr.id, dr.code, dr.title, dr.classification, dr.category, dr.resource_type, dr.file_path, dr.created_at, dr.updated_at
             FROM QuestionReferences qr
             JOIN DocumentReferences dr ON qr.reference_id = dr.id
             LEFT JOIN SectionReferences sr ON sr.reference_id = qr.reference_id AND sr.section_id = ?2
             WHERE qr.question_id = ?1
             ORDER BY sr.display_order"
        ).map_err(|e| e.to_string())?;

        let references = ref_stmt.query_map(params![q.id, q.section_id], |row| {
             // If sr.display_order is NULL (e.g. ad-hoc reference not in section list?), fallback to 0 or something.
             // But usually it should be there.
             let section_display_order: Option<i32> = row.get(4).unwrap_or(None);
             
             // Calculate Thai Letter based on Section Order, NOT Question Insertion Order
             let thai_letter = match section_display_order {
                 Some(order) => get_thai_letter(order),
                 None => "?".to_string() 
             };

            Ok(QuestionReferenceDetail {
                id: row.get(0)?,
                question_id: row.get(1)?,
                reference: DocumentReference {
                    id: row.get(5)?,
                    code: row.get(6)?,
                    title: row.get(7)?,
                    classification: row.get(8)?,
                    category: row.get(9)?,
                    resource_type: row.get(10)?,
                    file_path: row.get(11)?,
                    created_at: row.get(12)?,
                    updated_at: row.get(13)?,
                },
                location_text: row.get(3)?,
                display_order: section_display_order.unwrap_or(0),
                thai_letter,
            })
        }).map_err(|e| e.to_string())?
          .collect::<Result<Vec<_>, _>>()
          .map_err(|e| e.to_string())?;

        details.push(QuestionDetail {
            question: q,
            choices,
            references,
        });
    }

    Ok(details)
}

#[derive(serde::Deserialize)]
pub struct CreateQuestionArgs {
    pub id: Option<String>, // Allow manual ID (generated in frontend for image upload linking)
    pub document_id: String,
    pub section_id: Option<i64>,
    pub parent_id: Option<String>,
    pub content: String,
    pub is_header: bool,
    pub description: Option<String>,
    pub sequence: Option<i32>,
    pub answer_type: Option<String>,
    pub metadata: Option<String>,
    pub score: Option<i32>,
    pub question_type: Option<String>,
    pub group_score: Option<i32>,
    pub display_text: Option<String>,
    pub is_group_header: Option<bool>,
    pub is_scored: Option<bool>,
}

// fn sync_question_references(conn: &Connection, question_id: &str, metadata_json: Option<&str>) -> Result<(), String> {
//     // 1. Always clear existing references first (simplest strategy for both create and update)
//     conn.execute("DELETE FROM QuestionReferences WHERE question_id = ?1", params![question_id])
//         .map_err(|e| e.to_string())?;

//     // 2. Insert new references if metadata exists
//     if let Some(json_str) = metadata_json {
//         // Access serde_json directly. If not imported, we use full path.
//         // Assuming serde_json crate is available.
//         if let Ok(v) = serde_json::from_str::<serde_json::Value>(json_str) {
//             if let Some(refs) = v.get("references").and_then(|r| r.as_array()) {
//                 for (idx, r) in refs.iter().enumerate() {
//                     // Extract fields. Be robust against missing/wrong types.
//                     if let Some(ref_id) = r.get("id").and_then(|i| i.as_i64()) {
//                         let page = r.get("page").and_then(|s| s.as_str()).unwrap_or("-");
                        
//                         conn.execute(
//                             "INSERT INTO QuestionReferences (question_id, reference_id, location_text, display_order)
//                              VALUES (?1, ?2, ?3, ?4)",
//                             params![question_id, ref_id, page, idx + 1]
//                         ).map_err(|e| e.to_string())?;
//                     }
//                 }
//             }
//         }
//     }
//     Ok(())
// }

pub fn create_question(args: CreateQuestionArgs) -> Result<String, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Use provided ID or generate new one
    let id = args.id.unwrap_or_else(generate_uuid);

    // Default sequence: Max + 1
    let sequence = if let Some(seq) = args.sequence {
        seq
    } else {
        // Find max sequence in this context
        if let Some(pid) = &args.parent_id {
            let max_seq: Option<i32> = conn.query_row(
                "SELECT MAX(sequence) FROM Questions WHERE parent_id = ?1",
                params![pid],
                |row| row.get(0)
            ).unwrap_or(None);
            max_seq.unwrap_or(0) + 1
        } else {
            // Root level: Must filter by Document AND Section
            // Root level: Must filter by Document AND Section
            let max_seq_val: Option<i32> = if let Some(sid) = args.section_id {
                 conn.query_row(
                    "SELECT MAX(sequence) FROM Questions WHERE document_id = ?1 AND section_id = ?2 AND parent_id IS NULL",
                    params![args.document_id, sid],
                    |row| row.get(0)
                ).unwrap_or(None)
            } else {
                 conn.query_row(
                    "SELECT MAX(sequence) FROM Questions WHERE document_id = ?1 AND section_id IS NULL AND parent_id IS NULL",
                    params![args.document_id],
                    |row| row.get(0)
                ).unwrap_or(None)
            };
            max_seq_val.unwrap_or(0) + 1
        }
    };

    conn.execute(
        "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, description, answer_type, metadata, score, question_type, group_score, display_text, is_group_header, is_scored) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        params![
            id, 
            args.document_id, 
            args.section_id, 
            args.parent_id, 
            sequence, 
            args.content, 
            args.is_header, 
            args.description,
            args.answer_type.unwrap_or("text".to_string()),
            args.metadata,
            args.score.unwrap_or(0),
            args.question_type.unwrap_or("normal".to_string()),
            args.group_score.unwrap_or(0),
            args.display_text,
            args.is_group_header.unwrap_or(false),
            args.is_scored.unwrap_or(false)
        ]
    )
    .map_err(|e | e.to_string())?;

    // If this question has a parent, set parent as group header (is_group_header = 1, is_scored = 0)
    if let Some(ref parent_id) = args.parent_id {
        conn.execute(
            "UPDATE Questions SET is_group_header = 1, is_scored = 0 WHERE id = ?1",
            params![parent_id],
        ).map_err(|e| e.to_string())?;
    }

    // SYNC References from Metadata
    // DISABLED: We manage references via add_question_reference API now.
    // sync_question_references(&conn, &id, args.metadata.as_deref())?;

    Ok(id)
}

#[derive(serde::Deserialize)]
pub struct UpdateQuestionArgs {
    pub id: String,
    pub content: String,
    pub description: Option<String>,
    pub metadata: Option<String>,
    pub score: Option<i32>,
    pub question_type: Option<String>,
    pub group_score: Option<i32>,
    pub display_text: Option<String>,
    pub is_group_header: Option<bool>,
    pub is_scored: Option<bool>,
}

pub fn update_question(args: UpdateQuestionArgs) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| e.to_string())?;

    // Use COALESCE so scoring fields are preserved when not explicitly provided (None → keep DB value)
    conn.execute(
        "UPDATE Questions 
         SET content = ?2, description = ?3, metadata = ?4,
             score = COALESCE(?5, score),
             question_type = COALESCE(?6, question_type),
             group_score = COALESCE(?7, group_score),
             display_text = COALESCE(?8, display_text),
             is_group_header = COALESCE(?9, is_group_header),
             is_scored = COALESCE(?10, is_scored)
         WHERE id = ?1",
        params![
            args.id, 
            args.content, 
            args.description,
            args.metadata,
            args.score,
            args.question_type,
            args.group_score,
            args.display_text,
            args.is_group_header,
            args.is_scored
        ]
    )
    .map_err(|e| e.to_string())?;

    // SYNC References from Metadata to Table
    // DISABLED: We manage references via add_question_reference API now.
    // sync_question_references(&conn, &args.id, args.metadata.as_deref())?;

    Ok(())
}

pub fn delete_question(id: String) -> Result<(), String> {
    let mut conn = get_content_connection().map_err(|e| e.to_string())?;
    
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Get info before delete to handle re-indexing (context for siblings)
    // We need to know who are the siblings.
    // Siblings share same parent_id (if not null) OR (document_id + section_id + parent_id is null)
    let (document_id, section_id, parent_id, sequence): (String, Option<i64>, Option<String>, i32) = tx.query_row(
        "SELECT document_id, section_id, parent_id, sequence FROM Questions WHERE id = ?1",
        params![id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
    ).map_err(|e| format!("Question not found: {}", e))?;

    // 2. Delete the question (Cascade will remove children, choices, answers, refs)
    tx.execute(
        "DELETE FROM Questions WHERE id = ?1",
        params![id],
    ).map_err(|e| e.to_string())?;

    // 3. Re-index siblings (Shift Left)
    // Logic depends on whether parent_id exists
    match parent_id {
        Some(ref pid) => {
            // Sibling check by parent_id
             tx.execute(
                "UPDATE Questions 
                 SET sequence = sequence - 1 
                 WHERE parent_id = ?1 AND sequence > ?2",
                params![pid, sequence],
            ).map_err(|e| e.to_string())?;
        },
        None => {
            // Sibling check by document_id + section_id (for L1 roots)
             tx.execute(
                "UPDATE Questions 
                 SET sequence = sequence - 1 
                 WHERE document_id = ?1 AND section_id IS ?2 AND parent_id IS NULL AND sequence > ?3",
                params![document_id, section_id, sequence],
            ).map_err(|e| e.to_string())?;
        }
    }
    
    // 4. If this question had a parent, check if parent now has 0 children
    //    → revert parent's is_group_header=0, is_scored=1 and recalculate scores
    if let Some(ref pid) = parent_id {
        let child_count: i32 = tx.query_row(
            "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1",
            params![pid],
            |row| row.get(0),
        ).unwrap_or(0);

        if child_count == 0 {
            tx.execute(
                "UPDATE Questions SET is_group_header = 0, group_score = 0, is_scored = 1 WHERE id = ?1",
                params![pid],
            ).map_err(|e| e.to_string())?;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;

    // Recalculate scores after commit (needs its own connection)
    if let Some(ref pid) = parent_id {
        let conn2 = get_content_connection().map_err(|e| e.to_string())?;
        let _ = recalculate_group_score_chain(&conn2, pid);
    }
    
    Ok(())
}


/// Reorder questions by receiving an ordered list of question IDs.
/// Reassigns sequence = 1, 2, 3, ... in the given order.
pub fn reorder_questions(question_ids: Vec<String>) -> Result<(), String> {
    let mut conn = get_content_connection().map_err(|e| e.to_string())?;
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    for (index, id) in question_ids.iter().enumerate() {
        let new_seq = (index + 1) as i32;
        tx.execute(
            "UPDATE Questions SET sequence = ?1 WHERE id = ?2",
            params![new_seq, id],
        ).map_err(|e| format!("Failed to update sequence for {}: {}", id, e))?;
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}


#[derive(serde::Serialize)]
pub struct DocumentHierarchy {
    pub document: Document,
    pub hierarchy: Vec<String>, // [L4 Name, L3 Name, L2 Name, L1 Name] (Ordered from Leaf to Root or vice versa, user asked for L4+L3+L2+L1)
}

pub fn get_document_with_hierarchy(id: String) -> Result<DocumentHierarchy, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // 1. Fetch Document
    let doc: Document = conn.query_row(
        "SELECT id, name, applied_to, unit_owner_id, unit_code, doc_type, user_level, status, created_at, updated_at 
         FROM Documents WHERE id = ?1",
        params![id],
        |row| {
            Ok(Document {
                id: row.get(0)?,
                name: row.get(1)?,
                applied_to: row.get(2)?,
                unit_owner_id: row.get(3)?,
                unit_code: row.get(4)?,
                doc_type: row.get(5)?,
                user_level: row.get(6)?,
                status: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        }
    ).map_err(|e| format!("Document not found or error: {}", e))?;

    // 2. Resolve Hierarchy
    let mut hierarchy_names = Vec::new();
    if let Some(mut current_unit_id) = doc.unit_owner_id.clone() {
        loop {
            // Find current unit
             let unit_res: Result<(String, Option<String>), _> = conn.query_row(
                "SELECT unit_name, parent_id FROM OwnerUnits WHERE unit_id = ?1",
                params![current_unit_id],
                |row| Ok((row.get(0)?, row.get(1)?))
            );

            match unit_res {
                Ok((name, parent_id_opt)) => {
                    hierarchy_names.push(name);
                    if let Some(pid) = parent_id_opt {
                        current_unit_id = pid;
                    } else {
                        break; // No parent, root reached
                    }
                },
                Err(_) => break, // Unit not found
            }
        }
    }
    
    // User asked for 'L4' + 'L3' + 'L2' + 'L1'. 
    // Our loop collects [Leaf, Parent, Grandparent...]. 
    // So hierarchy_names is already [L4, L3, L2, L1].
    // We just return it as is.

    Ok(DocumentHierarchy {
        document: doc,
        hierarchy: hierarchy_names
    })
}

// ===== Section Management =====

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct Section {
    pub id: i64,
    pub document_id: String,
    pub section_group: i32,
    pub section_number: i32,
    pub title_th: String,
    pub menu_label: String,
    pub display_order: i32,
    pub is_system_defined: bool,
    pub duration_value: Option<i32>,
    pub duration_unit: Option<String>,
    pub total_score: Option<i32>,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CreateSectionRequest {
    pub document_id: String,
    pub section_group: i32,
    pub section_number: i32,
    pub title_th: String,
    pub menu_label: String,
}

/// Create a new section
pub fn create_section(request: CreateSectionRequest) -> Result<Section, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Validation: Check if number already exists
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM Sections WHERE document_id = ?1 AND section_number = ?2)",
            params![request.document_id, request.section_number],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    
    if exists {
        return Err(format!("Section {} already exists for this document", request.section_number));
    }
    
    // Validate section number range
    let valid_range = match request.section_group {
        100 => 101..=199,
        200 => 201..=299,
        300 => 301..=399,
        _ => return Err("Invalid section group. Must be 100, 200, or 300".to_string()),
    };
    
    if !valid_range.contains(&request.section_number) {
        return Err(format!("Section number must be in range {:?} for section group {}", valid_range, request.section_group));
    }
    
    // Block Section 101 from manual creation (it's auto-created)
    if request.section_number == 101 {
        return Err("Section 101 is system-defined and auto-created. Cannot create manually.".to_string());
    }
    
    // Get next display_order
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(display_order), 0) FROM Sections WHERE document_id = ?1 AND section_group = ?2",
            params![request.document_id, request.section_group],
            |row| row.get(0),
        )
        .unwrap_or(0);
    
    // Insert
    conn.execute(
        "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, display_order, is_system_defined)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
        params![
            request.document_id,
            request.section_group,
            request.section_number,
            request.title_th,
            request.menu_label,
            max_order + 1,
        ],
    )
    .map_err(|e| e.to_string())?;
    
    let id = conn.last_insert_rowid();

    // Auto-seed template for Section 200 series (201-299)
    if request.section_group == 200 && request.section_number >= 200 && request.section_number <= 299 {
       seed_section_200_template(&conn, &request.document_id, id, request.section_number)?;
    // Auto-seed template for Section 300 series (301-399)
    } else if request.section_group == 300 && request.section_number >= 300 && request.section_number <= 399 {
       seed_section_300_template(&conn, &request.document_id, id, request.section_number)?;
    } else if request.section_group == 100 && request.section_number == 102 {
       seed_section_102_template(&conn, &request.document_id, id, request.section_number)?;
    // } else if request.section_group == 100 && request.section_number == 101 {
    //    seed_section_101_template(&conn, &request.document_id, id, request.section_number)?;
    }
    
    // Return created section
    get_section_by_id(&conn, id)
}

/// Helper to convert Arabic number to Thai digits
fn to_thai_digit(n: i32) -> String {
    let thai_digits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
    n.to_string().chars().map(|c| {
        if let Some(d) = c.to_digit(10) {
            thai_digits[d as usize].to_string()
        } else {
            c.to_string()
        }
    }).collect()
}

/// Seed Section 300 Template (3xx.1 - 3xx.7)
/// Scoring rules:
///   3xx.1.1 - 3xx.1.3 → is_scored = false (prerequisites, no score)
///   3xx.1.4 - 3xx.1.5 → is_scored = true  (can have score)
///   3xx.2 - 3xx.6     → is_scored = true, is_group_header = true (score = sum of children)
///   3xx.7.1 - 3xx.7.2 → is_scored = false (knowledge test, separate evaluation)
fn seed_section_300_template(conn: &Connection, doc_id: &str, section_id: i64, _section_num: i32) -> Result<(), String> {
    // Helper closure with scoring fields
    let insert_q = |parent: Option<&str>, seq: i32, content: String, desc: Option<String>, is_scored: bool, is_group_header: bool, question_type: &str| -> Result<String, String> {
        let q_id = generate_uuid();
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, description, is_header, answer_type, score, question_type, group_score, is_group_header, is_scored) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, 'none', 0, ?8, 0, ?9, ?10)",
            params![q_id, doc_id, section_id, parent, seq, content, desc, question_type, is_group_header, is_scored]
        ).map_err(|e| e.to_string())?;
        Ok(q_id)
    };

    // 3xx.1 - คุณสมบัติก่อนการทดสอบ (group header, may have score from 1.4-1.5)
    let q1_desc = "เพื่อให้การทดสอบตาม มาตรฐานการทดสอบกำลังพลเกิดประโยชน์สูงสุด และสำเร็จตามวัตถุประสงค์ ผู้เข้ารับการทดสอบ ต้องมีคุณสมบัติ ดังต่อไปนี้".to_string();
    let q1_id = insert_q(None, 1, "คุณสมบัติก่อนการทดสอบ".to_string(), Some(q1_desc), false, true, "normal")?;
    
    // 3xx.1.1 - 3xx.1.3: NOT scored (prerequisites)
    insert_q(Some(&q1_id), 1, "ผ่านการอบรม".to_string(), None, false, false, "normal")?;
    insert_q(Some(&q1_id), 2, "ผ่านมาตรฐานการทดสอบกําลังพล".to_string(), None, false, false, "normal")?;
    insert_q(Some(&q1_id), 3, "ผ่านการปฏิบัติหน้าที่".to_string(), None, false, false, "normal")?;
    // 3xx.1.4 - 3xx.1.5: SCORED (can assign score)
    insert_q(Some(&q1_id), 4, "ผ่านการทดสอบความรู้พื้นฐาน".to_string(), None, true, false, "normal")?;
    insert_q(Some(&q1_id), 5, "ผ่านการทดสอบระบบ".to_string(), None, true, false, "normal")?;

    // 3xx.2 - 3xx.5: GROUP headers (auto-calc from children, not manually scored)
    insert_q(None, 2, "การทดสอบปฏิบัติงานปกติ".to_string(), None, false, true, "normal")?;
    insert_q(None, 3, "การทดสอบการปฏิบัติงานกรณีพิเศษ".to_string(), None, false, true, "normal")?;
    insert_q(None, 4, "การทดสอบการปฏิบัติงานกรณีเหตุขัดข้อง".to_string(), None, false, true, "normal")?;
    insert_q(None, 5, "การทดสอบการปฏิบัติงานกรณีเหตุฉุกเฉิน".to_string(), None, false, true, "normal")?;

    // 3xx.6: GROUP header (auto-calc from children, not manually scored)
    insert_q(None, 6, "การทดสอบการปฏิบัติงานประจําตําแหน่ง".to_string(), None, false, true, "normal")?;
    
    // 3xx.7: สอบความรู้ (group header, children NOT scored)
    let q7_id = insert_q(None, 7, "สอบความรู้".to_string(), None, false, true, "normal")?;
    insert_q(Some(&q7_id), 1, "สอบข้อเขียน".to_string(), Some("ขึ้นอยู่กับผู้บังคับหน่วยกำหนด".to_string()), false, false, "normal")?;
    insert_q(Some(&q7_id), 2, "สอบปากเปล่า".to_string(), Some("ขึ้นอยู่กับผู้บังคับหน่วยกำหนด".to_string()), false, false, "normal")?;

    Ok(())
}

/// Seed Section 200 Template (2xx.1 - 2xx.6)
fn seed_section_200_template(conn: &Connection, doc_id: &str, section_id: i64, _section_num: i32) -> Result<(), String> {
    // Prefix is handled dynamically by the frontend component (buildPrefix200)
    
    // Helper closure to insert question
    let insert_q = |seq: i32, content: String| -> Result<String, String> {
        let q_id = generate_uuid();
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type) 
             VALUES (?1, ?2, ?3, NULL, ?4, ?5, 1, 'text')",
            params![q_id, doc_id, section_id, seq, content]
        ).map_err(|e| e.to_string())?;
        Ok(q_id)
    };

    insert_q(1, "หน้าที่".to_string())?;
    insert_q(2, "ส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ".to_string())?;
    insert_q(3, "หลักการทำงาน".to_string())?;
    insert_q(4, "ค่าทำงานปกติ ค่าสูงสุด ต่ำสุด ของการทำงาน".to_string())?;
    insert_q(5, "การเชื่อมต่อระบบ".to_string())?;
    insert_q(6, "ข้อระมัดระวังอันตราย".to_string())?;

    Ok(())
}

/// Seed Section 102 Template (Prototype with Checkboxes)
fn seed_section_102_template(conn: &Connection, doc_id: &str, section_id: i64, section_num: i32) -> Result<(), String> {
    let p = to_thai_digit(section_num); // e.g. "๑๐๒"

    // Helper closure to insert question
    let insert_q = |parent: Option<String>, seq: i32, content: String, is_header: bool, ans_type: &str, metadata: Option<String>| -> Result<String, String> {
        let q_id = generate_uuid();
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, metadata) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![q_id, doc_id, section_id, parent, seq, content, is_header, ans_type, metadata]
        ).map_err(|e| e.to_string())?;
        Ok(q_id)
    };

    // 102.1 Level 1 Question
    let q1 = insert_q(None, 1, format!("{}.๑ คำถามทดสอบ Level 1", p), false, "checkbox", Some(r#"{"answerCheckboxes": [{"checked": true, "text": "ตัวเลือกทดสอบ ก."}, {"checked": false, "text": "ตัวเลือกทดสอบ ข."}]}"#.to_string()))?;

    // 102.1.1 Level 3 Sub-Question (Recursive)
    insert_q(Some(q1), 1, format!("{}.๑.๑ คำถามทดสอบ Level 3 (Sub-Question)", p), false, "checkbox", Some(r#"{"answerCheckboxes": [{"checked": true, "text": "นี่คือ Sub Question"}]}"#.to_string()))?;

    Ok(())
}

/// Seed Section 101 (Precautions) with Real Data - Full Implementation
fn seed_section_101_template(conn: &Connection, doc_id: &str, section_id: i64, section_num: i32) -> Result<(), String> {
    let p = to_thai_digit(section_num); // e.g. "๑๐๑"

    let insert_q = |parent: Option<String>, seq: i32, content: String, is_header: bool, ans_type: &str, metadata: Option<String>| -> Result<String, String> {
        let q_id = generate_uuid();
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, metadata) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![q_id, doc_id, section_id, parent, seq, content, is_header, ans_type, metadata]
        ).map_err(|e| e.to_string())?;
        Ok(q_id)
    };

    // 101.1
    insert_q(None, 1, format!("{}.๑ จุดประสงค์ของโปรแกรมการสั่งการในด้านความปลอดภัย (Command Safety Program) (ก.)", p), false, "checkbox", 
        Some(r#"{"answerCheckboxes": [{"checked": true, "text": "เป็นโปรแกรมที่เพิ่มประสิทธิภาพการวัดผลในการทํางานซึ่งเป็นการลดความถี่ในการปฏิบัติ และให้คําแนะนําอันตรายที่จะเกิดแก่บุคคลรวมทั้งลดค่าใช้จ่ายในการใช้อุปกรณ์และทรัพยสิน อันเกิดจากความเสียหายที่จะเกิดขึ้น"}]}"#.to_string()))?;

    // 101.2
    insert_q(None, 2, format!("{}.๒ หน่วยงานใดเป็นผู้ประเมินผลกระทบที่มีต่อโปรแกรมการสั่งการด้านความปลอดภัย (ก.)", p), false, "checkbox", 
        Some(r#"{"answerCheckboxes": [{"checked": true, "text": "องค์กรความปลอดภัย (The Safety Organization) ซึ่งก็คือ สภาและคณะกรรมการว่าด้วยความปลอดภัย(The Safety Council And Safety Committee)"}]}"#.to_string()))?;

    // 101.3
    insert_q(None, 3, format!("{}.๓ ใครคือผู้รับผิดชอบต่อการจัดการโปรแกรมในด้านความปลอดภัย (Command Safety Program) (ก.)", p), false, "checkbox", 
        Some(r#"{"answerCheckboxes": [{"checked": true, "text": "นายทหารความปลอดภัย (The Safety Officer) เป็นผู้ให้คําแนะนํากับนายทหารที่ทําหน้าที่เป็นผู้สั่งการ (Commanding Officer) ทุกคนในทุกเรื่องเกี่ยวกับความปลอดภัยนอกจากนั้นยังประสานงานการปฏิบัติงานเพื่อเพิ่มประสิทธิภาพและประเมินผลข้อสรุปที่มีผลกระทบต่อโปรแกรมความปลอดภัยรวมถึงพยายามกระตุ้นการทำงานของสภาและคณะกรรมการว่าด้วยความปลอดภัย"}]}"#.to_string()))?;

    // 101.9 (Complex with SubList)
    insert_q(None, 9, format!("{}.๙ อธิบายจุดประสงค์และการทํางานของ Circuit Breakers: CB (ข., ซ.)", p), false, "checkbox", 
        Some(r#"{"answerCheckboxes": [{"checked": true, "text": "จุดประสงค์ของ Circuit Breaker คือ เพื่อที่จะแยกไฟที่จะจ่ายไปให้แต่ละอุปกรณ์ กฎการปฏิบัติกับ Circuit Breakers มีดังต่อไปนี้", "subList": ["ขณะปฏิบัติงานกับ Circuit Breaker ให้ใช้มือข้างเดียว (One Hand) เท่านั้น", "พยายามอย่าให้มือข้างใดข้างหนึ่งไปสัมผัสส่วนอื่นของ Circuit Breaker ยกเว้นที่จับ (Operating Handles)", "สัมผัสหรือจับด้านเดียวเท่านั้นของมือจับ", "ปิดวงจรเบรกเกอร์ก่อนและหลังจากนั้นค่อยปิดวงจรสวิตช์", "อย่าทำให้ Circuit Breakers ไม่ทำงาน (Disable)"]}]}"#.to_string()))?;

    Ok(())
}

#[derive(serde::Deserialize)]
pub struct UpdateSectionArgs {
    pub id: i64,
    pub title_th: String,
    pub menu_label: String,
    pub duration_value: Option<i32>,
    pub duration_unit: Option<String>,
    pub total_score: Option<i32>,
}

/// Update a section (Title, Menu Label, Duration, Score)
pub fn update_section(args: UpdateSectionArgs) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    conn.execute(
        "UPDATE Sections SET title_th = ?1, menu_label = ?2, duration_value = ?3, duration_unit = ?4, total_score = ?5, updated_at = CURRENT_TIMESTAMP WHERE id = ?6",
        params![args.title_th, args.menu_label, args.duration_value, args.duration_unit, args.total_score, args.id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

/// Get sections by document ID
pub fn get_sections_by_document(document_id: String) -> Result<Vec<Section>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    let mut stmt = conn
        .prepare(
            "SELECT id, document_id, section_group, section_number, title_th, menu_label, 
                    display_order, is_system_defined, duration_value, duration_unit, total_score,
                    created_at, updated_at
             FROM Sections
             WHERE document_id = ?1
             ORDER BY section_group, section_number"
        )
        .map_err(|e| e.to_string())?;
    
    let sections = stmt
        .query_map(params![document_id], |row| {
            Ok(Section {
                id: row.get(0)?,
                document_id: row.get(1)?,
                section_group: row.get(2)?,
                section_number: row.get(3)?,
                title_th: row.get(4)?,
                menu_label: row.get(5)?,
                display_order: row.get(6)?,
                is_system_defined: row.get(7)?,
                duration_value: row.get(8)?,
                duration_unit: row.get(9)?,
                total_score: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    
    Ok(sections)
}

/// Delete a section and all its questions (cascade)
pub fn delete_section(id: i64) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Check if system-defined
    let is_system: bool = conn
        .query_row(
            "SELECT is_system_defined FROM Sections WHERE id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    
    if is_system {
        return Err("Cannot delete system-defined section (e.g., Section 101)".to_string());
    }
    
    // Delete all questions belonging to this section first
    // (QuestionChoices, QuestionReferences, UserAnswers cascade from Questions automatically)
    conn.execute("DELETE FROM Questions WHERE section_id = ?1", params![id])
        .map_err(|e| format!("Failed to delete section questions: {}", e))?;
    
    conn.execute("DELETE FROM Sections WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Update section (for display_order reordering, etc.)
pub fn update_section_order(id: i64, new_order: i32) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    conn.execute(
        "UPDATE Sections SET display_order = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![new_order, id],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Helper function to get section by ID
fn get_section_by_id(conn: &Connection, id: i64) -> Result<Section, String> {
    conn.query_row(
        "SELECT id, document_id, section_group, section_number, title_th, menu_label, 
                display_order, is_system_defined, duration_value, duration_unit, total_score,
                created_at, updated_at
         FROM Sections WHERE id = ?1",
        params![id],
        |row| {
            Ok(Section {
                id: row.get(0)?,
                document_id: row.get(1)?,
                section_group: row.get(2)?,
                section_number: row.get(3)?,
                title_th: row.get(4)?,
                menu_label: row.get(5)?,
                display_order: row.get(6)?,
                is_system_defined: row.get(7)?,
                duration_value: row.get(8)?,
                duration_unit: row.get(9)?,
                total_score: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        }
    )
    .map_err(|e| e.to_string())
}

// ===== Reference Management =====

// Duplicate struct removed as it is defined above.

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CreateReferenceRequest {
    pub code: String,
    pub title: String,
    pub category: Option<String>,
    pub classification: Option<String>,
    pub resource_type: Option<String>, // DOCUMENT, WEBLINK, VIDEO, IMAGE, AUDIO, TEMPLATE
    pub file_path: Option<String>,
    pub pqs_id: Option<String>, // Optional: PQS Document ID for folder organization
}

#[allow(dead_code)]
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SectionReference {
    pub id: i64,
    pub section_id: i64,
    pub reference_id: i64,
    pub display_order: i32,
    pub created_at: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SectionReferenceDetail {
    pub id: i64,
    pub section_id: i64,
    pub reference: DocumentReference,
    pub display_order: i32,
    pub thai_letter: String,
    pub usage_count: i64,
}

/// Helper to get Thai letter from display order (1=ก, 2=ข, etc.)
fn get_thai_letter(order: i32) -> String {
    let letters = ["ก", "ข", "ค", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "ญ"];
    letters
        .get((order - 1) as usize)
        .unwrap_or(&"?")
        .to_string()
}
/// Helper to bundle a file into the portable data directory
fn bundle_reference_file(code: &str, category: &str, source_path: &str, pqs_id: Option<&str>) -> Result<String, String> {
    if source_path.trim().is_empty() || source_path.starts_with("http") {
        return Ok(source_path.to_string());
    }

    let source = std::path::Path::new(source_path);
    if !source.exists() {
        // If it starts with 'data/', it's already portable
        if source_path.starts_with("data/") {
            return Ok(source_path.to_string());
        }
        return Ok(source_path.to_string()); // Fallback
    }

    let file_name = source.file_name()
        .ok_or_else(|| "Invalid file name".to_string())?
        .to_str()
        .ok_or_else(|| "Invalid file name encoding".to_string())?;

    let data_dir = get_portable_data_dir()?;
    
    // Use PQS ID as subfolder if provided, otherwise use 'COMMON' or just root
    let root_folder = pqs_id.unwrap_or("COMMON");
    
    // Flattened structure: data/{ID}/references/{CATEGORY}/{code}_{filename}
    let dest_dir = data_dir.join(root_folder).join("references").join(category);
    std::fs::create_dir_all(&dest_dir).map_err(|e| format!("Failed to create dest dir: {}", e))?;

    // NEW: Prefix with code for better organization
    let new_file_name = format!("{}_{}", code, file_name);
    let dest_path = dest_dir.join(&new_file_name);
    
    // Only copy if source and dest are different
    if source != dest_path {
        std::fs::copy(source, &dest_path).map_err(|e| format!("Failed to copy file from {} to {}: {}", source_path, dest_path.display(), e))?;
    }

    // Return relative path including the root folder (e.g., "data/100/references/CATEGORY/CODE_filename")
    Ok(format!("data/{}/references/{}/{}", root_folder, category, new_file_name))
}

/// Create a new reference document
pub fn create_reference(request: CreateReferenceRequest) -> Result<DocumentReference, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Auto-generate type-based sequential code if empty
    let final_code = if request.code.trim().is_empty() {
        let cat_prefix = match request.category.as_deref().unwrap_or("OTHER") {
            "MANUAL" => "MN",
            "PROC" => "PR",
            "TM" => "TM",
            "SAFETY" => "SF",
            "DIAGRAM" => "DG",
            _ => "OT",
        };

        let class_digit = match request.classification.as_deref().unwrap_or("Unclassified") {
            "Restricted" => "1",
            "Confidential" => "2",
            "Secret" => "3",
            "Top Secret" => "4",
            _ => "0", 
        };

        let pattern = format!("{}-{}%", cat_prefix, class_digit); 
        let prefix_len = cat_prefix.len() + 1 + 1; 

        let max_num: i32 = conn
            .query_row(
                &format!(
                    "SELECT COALESCE(MAX(CAST(SUBSTR(code, {}) AS INTEGER)), 0) 
                     FROM DocumentReferences 
                     WHERE code LIKE ? AND LENGTH(code) >= ?",
                    prefix_len + 1 
                ),
                params![pattern, prefix_len + 3], 
                |row| row.get(0),
            )
            .unwrap_or(0);
        
        format!("{}-{}{:03}", cat_prefix, class_digit, max_num + 1)
    } else {
        request.code.clone()
    };
    
    // Check if code already exists
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM DocumentReferences WHERE code = ?1)",
            params![final_code],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    
    if exists {
        return Err(format!("Reference with code '{}' already exists", final_code));
    }

    // Auto-Bundling: Copy file to data/ directory
    let final_file_path = if let Some(path) = &request.file_path {
        Some(bundle_reference_file(
            &final_code, 
            request.category.as_deref().unwrap_or("OTHER"), 
            path,
            request.pqs_id.as_deref()
        )?)
    } else {
        None
    };
    
    // Insert
    conn.execute(
        "INSERT INTO DocumentReferences (code, title, category, classification, resource_type, file_path)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
            final_code,
            request.title,
            request.category,
            request.classification.unwrap_or("Unclassified".to_string()),
            request.resource_type.unwrap_or("DOCUMENT".to_string()),
            final_file_path,
        ],
    )
    .map_err(|e| e.to_string())?;
    
    let id = conn.last_insert_rowid();
    
    // Return created reference
    get_reference_by_id(&conn, id)
}

/// Get all references (with optional filters)
// Removed common_only logic as is_common is deprecated
pub fn get_references(
    search: Option<String>,
    category: Option<String>,
) -> Result<Vec<DocumentReference>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    let mut sql = "SELECT id, code, title, category, classification, resource_type, file_path, created_at, updated_at
                   FROM DocumentReferences WHERE 1=1".to_string();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
    
    if let Some(s) = search {
        sql.push_str(" AND (code LIKE ?1 OR title LIKE ?1)");
        let search_pattern = format!("%{}%", s);
        params_vec.push(Box::new(search_pattern));
    }
    
    if let Some(cat) = category {
        let param_idx = params_vec.len() + 1;
        sql.push_str(&format!(" AND category = ?{}", param_idx));
        params_vec.push(Box::new(cat));
    }
    
    sql.push_str(" ORDER BY LENGTH(title) ASC, title ASC");
    
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    
    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
    
    let refs = stmt
        .query_map(&params_refs[..], |row| {
            Ok(DocumentReference {
                id: row.get(0)?,
                code: row.get(1)?,
                title: row.get(2)?,
                category: row.get(3)?,
                classification: row.get(4)?,
                resource_type: row.get(5)?,
                file_path: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    
    Ok(refs)
}

/// Delete a reference (cascades to remove from all sections and questions)
pub fn delete_reference(id: i64) -> Result<(), String> {
    let mut conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // 0. Get file path before deleting record
    let file_path: Option<String> = conn.query_row(
        "SELECT file_path FROM DocumentReferences WHERE id = ?1",
        params![id],
        |row| row.get(0)
    ).unwrap_or(None);

    let tx = conn.transaction().map_err(|e| format!("Failed to start transaction: {}", e))?;

    // 1. Remove from all sections first (Cascade logic)
    tx.execute("DELETE FROM SectionReferences WHERE reference_id = ?1", params![id])
        .map_err(|e| format!("Failed to remove section links: {}", e))?;
    
    // 2. Remove from all questions
    tx.execute("DELETE FROM QuestionReferences WHERE reference_id = ?1", params![id])
        .map_err(|e| format!("Failed to remove question links: {}", e))?;

    // 3. Delete master reference
    tx.execute("DELETE FROM DocumentReferences WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to remove master record: {}", e))?;
    
    tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;
    
    // 4. Delete physical file if it exists and is managed (starts with data/)
    if let Some(path) = file_path {
        if path.starts_with("data/") {
            if let Ok(data_dir) = get_portable_data_dir() {
                // Strip "data/" prefix to get relative path
                let relative_path = if path.starts_with("data/") {
                     path.strip_prefix("data/").unwrap_or(&path)
                } else {
                     path.strip_prefix("data\\").unwrap_or(&path)
                };
                
                let full_path = data_dir.join(relative_path);
                
                if full_path.exists() {
                     let _ = std::fs::remove_file(&full_path).map_err(|e| 
                        println!("Warning: Failed to delete physical file {}: {}", full_path.display(), e)
                     );
                     
                     // Optional: Try to remove parent directory if empty (cleanup)
                     if let Some(parent) = full_path.parent() {
                         let _ = std::fs::remove_dir(parent); 
                     }
                }
            }
        }
    }

    Ok(())
}

/// Delete all references from the master list (and all sections)
pub fn delete_all_references() -> Result<(), String> {
    let mut conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // 0. Get all file paths before deleting records
    let file_paths: Vec<String> = {
        let mut stmt = conn.prepare("SELECT file_path FROM DocumentReferences WHERE file_path IS NOT NULL")
            .map_err(|e| format!("Failed to prepare statement: {}", e))?;
        
        let paths = stmt.query_map([], |row| row.get(0))
            .map_err(|e| format!("Failed to fetch file paths: {}", e))?
            .collect::<Result<Vec<String>, _>>()
            .map_err(|e| format!("Failed to collect file paths: {}", e))?;
        paths
    };

    let tx = conn.transaction().map_err(|e| format!("Failed to start transaction: {}", e))?;

    // 1. Remove all links in sections
    tx.execute("DELETE FROM SectionReferences", [])
        .map_err(|e| format!("Failed to clear section links: {}", e))?;
    
    // 2. Remove all inline question references
    tx.execute("DELETE FROM QuestionReferences", [])
        .map_err(|e| format!("Failed to clear question references: {}", e))?;

    // 3. Delete all master references
    tx.execute("DELETE FROM DocumentReferences", [])
        .map_err(|e| format!("Failed to clear master references: {}", e))?;
    
    tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;
    
    // 4. Delete all physical files
    if let Ok(data_dir) = get_portable_data_dir() {
        for path in file_paths {
            if path.starts_with("data/") {
                 let relative_path = if path.starts_with("data/") {
                      path.strip_prefix("data/").unwrap_or(&path)
                 } else {
                      path.strip_prefix("data\\").unwrap_or(&path)
                 };
                
                 let full_path = data_dir.join(relative_path);
                 if full_path.exists() {
                     let _ = std::fs::remove_file(&full_path);
                 }
            }
        }
        // Optional: Clean up empty directories could be complex here, skipping for now
    }
    
    Ok(())
}

/// Add reference to a section
pub fn add_section_reference(
    section_id: i64,
    reference_id: i64,
    display_order: Option<i32>,
) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Check if already linked
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM SectionReferences WHERE section_id = ?1 AND reference_id = ?2)",
            params![section_id, reference_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    
    if exists {
        return Err("This reference is already linked to this section".to_string());
    }
    
    // Get next display_order if not provided
    let order = if let Some(o) = display_order {
        o
    } else {
        let max_order: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(display_order), 0) FROM SectionReferences WHERE section_id = ?1",
                params![section_id],
                |row| row.get(0),
            )
            .unwrap_or(0);
        max_order + 1
    };
    
    conn.execute(
        "INSERT INTO SectionReferences (section_id, reference_id, display_order)
         VALUES (?1, ?2, ?3)",
        params![section_id, reference_id, order],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Remove reference from section
/// Remove reference from section and re-index
pub fn remove_section_reference(section_ref_id: i64) -> Result<(), String> {
    let mut conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Get info before delete to handle re-indexing
    let (section_id, deleted_order): (i64, i32) = tx.query_row(
        "SELECT section_id, display_order FROM SectionReferences WHERE id = ?1",
        params![section_ref_id],
        |row| Ok((row.get(0)?, row.get(1)?))
    ).map_err(|e| format!("Reference not found: {}", e))?;

    // 1.5 Check dependency: Is this reference used by any question in this section?
    // We need to find the reference_id first. Wait, we selected section_id and display_order, but we need reference_id too.
    let reference_id: i64 = tx.query_row(
        "SELECT reference_id FROM SectionReferences WHERE id = ?1",
        params![section_ref_id],
        |row| row.get(0)
    ).map_err(|e| format!("Reference ID not found: {}", e))?;

    let usage_count: i64 = tx.query_row(
        "SELECT COUNT(*) 
         FROM QuestionReferences qr
         JOIN Questions q ON qr.question_id = q.id
         WHERE qr.reference_id = ?1 AND q.section_id = ?2",
        params![reference_id, section_id],
        |row| row.get(0)
    ).unwrap_or(0);

    if usage_count > 0 {
        return Err(format!("Cannot remove reference: It is currently used by {} question(s) in this section. Please unlink it from questions first.", usage_count));
    }

    // 2. Delete
    tx.execute(
        "DELETE FROM SectionReferences WHERE id = ?1",
        params![section_ref_id],
    ).map_err(|e| e.to_string())?;

    // 3. Re-index adjacent items (Shift Left)
    tx.execute(
        "UPDATE SectionReferences 
         SET display_order = display_order - 1 
         WHERE section_id = ?1 AND display_order > ?2",
        params![section_id, deleted_order],
    ).map_err(|e| e.to_string())?;
    
    tx.commit().map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Get all references for a section (with Thai letters)
pub fn get_section_references(section_id: i64) -> Result<Vec<SectionReferenceDetail>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Sort by Title Length (ASC) then Title (ASC) for aesthetics
    let mut stmt = conn
        .prepare(
            "SELECT sr.id, sr.section_id, sr.reference_id, sr.display_order,
                    dr.id, dr.code, dr.title, dr.category, dr.classification, dr.resource_type, dr.file_path, dr.created_at, dr.updated_at,
                    (SELECT COUNT(*) 
                     FROM QuestionReferences qr 
                     JOIN Questions q ON qr.question_id = q.id 
                     WHERE qr.reference_id = sr.reference_id AND q.section_id = sr.section_id) as usage_count
             FROM SectionReferences sr
             JOIN DocumentReferences dr ON sr.reference_id = dr.id
             WHERE sr.section_id = ?1
             ORDER BY sr.display_order ASC"
        )
        .map_err(|e| e.to_string())?;
    
    let refs = stmt
        .query_map(params![section_id], |row| {
            let display_order: i32 = row.get(3)?;
            
            Ok(SectionReferenceDetail {
                id: row.get(0)?,
                section_id: row.get(1)?,
                reference: DocumentReference {
                    id: row.get(4)?,
                    code: row.get(5)?,
                    title: row.get(6)?,
                    category: row.get(7)?,
                    classification: row.get(8)?,
                    resource_type: row.get(9)?,
                    file_path: row.get(10)?,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
                },
                display_order,
                thai_letter: get_thai_letter(display_order),
                usage_count: row.get(13)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(refs)
}

/// Helper function to get reference by ID
fn get_reference_by_id(conn: &Connection, id: i64) -> Result<DocumentReference, String> {
    conn.query_row(
        "SELECT id, code, title, category, classification, resource_type, file_path, created_at, updated_at
         FROM DocumentReferences WHERE id = ?1",
        params![id],
        |row| {
            Ok(DocumentReference {
                id: row.get(0)?,
                code: row.get(1)?,
                title: row.get(2)?,
                category: row.get(3)?,
                classification: row.get(4)?,
                resource_type: row.get(5)?,
                file_path: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}

#[derive(serde::Deserialize)]
pub struct UpdateReferenceArgs {
    pub id: i64,
    pub code: String,
    pub title: String,
    pub category: Option<String>,
    pub classification: Option<String>,
    pub resource_type: Option<String>,
    pub file_path: Option<String>,
    pub pqs_id: Option<String>,
}

/// Update an existing reference
pub fn update_reference(args: UpdateReferenceArgs) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Check if reference exists
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM DocumentReferences WHERE id = ?1)",
        params![args.id],
        |row| row.get(0)
    ).unwrap_or(false);
    
    if !exists {
        return Err(format!("Reference with ID {} not found", args.id));
    }
    
    // Check if new code conflicts with another reference
    let code_conflict: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM DocumentReferences WHERE code = ?1 AND id != ?2)",
        params![args.code, args.id],
        |row| row.get(0)
    ).unwrap_or(false);
    
    if code_conflict {
        return Err(format!("Reference code '{}' already exists", args.code));
    }

    // 1. Get existing file_path BEFORE update
    let old_file_path: Option<String> = conn.query_row(
        "SELECT file_path FROM DocumentReferences WHERE id = ?1",
        params![args.id],
        |row| row.get(0)
    ).unwrap_or(None);
    
    // Auto-Bundling on update
    let final_file_path = if let Some(path) = &args.file_path {
        Some(bundle_reference_file(
            &args.code, 
            args.category.as_deref().unwrap_or("OTHER"), 
            path,
            args.pqs_id.as_deref()
        )?)
    } else {
        None
    };
    
    // Perform update
    conn.execute(
        "UPDATE DocumentReferences 
         SET code = ?1, title = ?2, category = ?3, classification = ?4, resource_type = ?5, file_path = ?6, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?7",
        params![
            args.code, 
            args.title, 
            args.category, 
            args.classification.unwrap_or("Unclassified".to_string()), 
            args.resource_type.unwrap_or("DOCUMENT".to_string()),
            final_file_path, 
            args.id
        ]
    ).map_err(|e| format!("Failed to update reference: {}", e))?;
    
    // 2. Cleanup old file if path changed
    if let Some(old_path) = old_file_path {
        // If we have a new path, and it's different from the old one
        // OR if we set file_path to None (removal)
        let should_delete = match &final_file_path {
            Some(new_path) => new_path != &old_path,
            None => true, // If new is None, we deleted the file association
        };

        if should_delete && old_path.starts_with("data/") {
            if let Ok(data_dir) = get_portable_data_dir() {
                // Strip "data/" prefix to get relative path
                let relative_path = if old_path.starts_with("data/") {
                     old_path.strip_prefix("data/").unwrap_or(&old_path)
                } else {
                     old_path.strip_prefix("data\\").unwrap_or(&old_path)
                };
                
                let full_path = data_dir.join(relative_path);
                
                if full_path.exists() {
                     let _ = std::fs::remove_file(&full_path).map_err(|e| 
                        println!("Warning: Failed to delete old physical file {}: {}", full_path.display(), e)
                     );
                     
                     // Optional: Try to remove parent directory if empty
                     if let Some(parent) = full_path.parent() {
                         let _ = std::fs::remove_dir(parent); 
                     }
                }
            }
        }
    }

    Ok(())
}

/// Upload an image for a question (copies to data/{doc_id}/question-images/{prefix}_{filename})
pub fn upload_question_image(source_path: String, document_id: String, question_id: String, friendly_prefix: Option<String>) -> Result<String, String> {
    let data_dir = get_portable_data_dir().map_err(|e| e.to_string())?;
    
    // Target: data/{document_id}/question-images/
    let target_dir = data_dir.join(&document_id).join("question-images");
    
    if !target_dir.exists() {
        std::fs::create_dir_all(&target_dir).map_err(|e| format!("Failed to create images directory: {}", e))?;
    }

    let path = std::path::Path::new(&source_path);
    let extension = path.extension().and_then(|e| e.to_str()).unwrap_or("jpg");
    // Get original filename stem (without extension)
    let original_stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("image");

    // Construct filename:
    // If friendly_prefix ("101-1") is provided: "101-1_originalName.ext"
    // Else: "{question_id}_{uuid}.ext"
    let filename = if let Some(prefix) = friendly_prefix {
        // Sanitize prefix to be safe for filenames
        // Sanitize prefix to be safe for filenames (Allow . for 101.1 style)
        let safe_prefix = prefix.replace("/", "-").replace("\\", "-");
        let safe_stem = original_stem.replace(" ", "_"); // Basic sanitization
        format!("{}_{}.{}", safe_prefix, safe_stem, extension)
    } else {
        format!("{}_{}.{}", question_id, generate_uuid().chars().take(8).collect::<String>(), extension)
    };
    
    // Check collision, if exists, append short UUID
    let mut target_path = target_dir.join(&filename);
    if target_path.exists() {
        let new_filename = format!("{}_{}.{}", 
            filename.trim_end_matches(&format!(".{}", extension)), 
            generate_uuid().chars().take(4).collect::<String>(),
            extension
        );
        target_path = target_dir.join(&new_filename);
    }

    println!("DEBUG: Uploading image to {:?}", target_path);

    std::fs::copy(&source_path, &target_path).map_err(|e| format!("Failed to copy image: {}", e))?;

    // Return relative path: data/{document_id}/question-images/{filename}
    // Note: We return the relative path from "data" root or just the portable path string?
    // Frontend expects "data/..." string.
    let relative_filename = target_path.file_name().unwrap().to_string_lossy();
    Ok(format!("data/{}/question-images/{}", document_id, relative_filename))
}

pub fn delete_question_image(relative_path: String) -> Result<(), String> {
    if !relative_path.starts_with("data/") {
        return Ok(()); // Not a managed file, ignore
    }

    let data_dir = get_portable_data_dir().map_err(|e| e.to_string())?;
    // relative_path is "data/..."
    // strip "data/"
    let suffix = relative_path.strip_prefix("data/").unwrap_or(&relative_path);
    let target_path = data_dir.join(suffix);
    
    if target_path.exists() {
        std::fs::remove_file(target_path).map_err(|e| format!("Failed to delete image file: {}", e))?;
    }
    Ok(())
}

/// Resolve relative image path (data/images/...) to absolute system path
pub fn resolve_image_path(relative_path: String) -> Result<String, String> {
    if !relative_path.starts_with("data/") {
        return Ok(relative_path); // Return as is if not our format
    }

    let data_dir = get_portable_data_dir().map_err(|e| e.to_string())?;
    
    // relative_path is "data/images/xyz.jpg"
    // we want to join data_dir (which ends in "data") with "images/xyz.jpg"
    // OR if data_dir is the parent? 
    // get_portable_data_dir returns ".../data".
    // So if we strip "data/" from relative path, we get "images/xyz.jpg".
    
    let suffix = relative_path.strip_prefix("data/").unwrap_or(&relative_path);
    let abs_path = data_dir.join(suffix);
    
    Ok(abs_path.to_string_lossy().to_string())
}

/// Get image as Base64 string for reliable frontend display
pub fn get_question_image_base64(relative_path: String) -> Result<String, String> {
    let abs_path_str = resolve_image_path(relative_path)?;
    let path = std::path::Path::new(&abs_path_str);
    
    if !path.exists() {
        return Err(format!("Image file not found: {}", abs_path_str));
    }

    let data = std::fs::read(path).map_err(|e| format!("Failed to read image file: {}", e))?;
    
    // Simple mime type detection
    let extension = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg")
        .to_lowercase();
        
    let mime_type = match extension.as_str() {
        "png" => "image/png",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        _ => "image/jpeg",
    };

    let base64_data = general_purpose::STANDARD.encode(&data);
    
    Ok(format!("data:{};base64,{}", mime_type, base64_data))
}

// ==========================================
// Question Reference Management (L1 Linking)
// ==========================================

#[derive(serde::Deserialize)]
pub struct AddQuestionReferenceRequest {
    pub question_id: String,
    pub reference_id: i64,
    pub location_text: Option<String>,
}

/// Add a reference link to a specific question (with page number)
pub fn add_question_reference(req: AddQuestionReferenceRequest) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Check if already linked
    let exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM QuestionReferences WHERE question_id = ?1 AND reference_id = ?2)",
            params![req.question_id, req.reference_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    
    if exists {
        return Err("This reference is already linked to this question".to_string());
    }
    
    // Get next display_order for this question's references
    let max_order: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(display_order), 0) FROM QuestionReferences WHERE question_id = ?1",
            params![req.question_id],
            |row| row.get(0),
        )
        .unwrap_or(0);
        
    conn.execute(
        "INSERT INTO QuestionReferences (question_id, reference_id, location_text, display_order)
         VALUES (?1, ?2, ?3, ?4)",
        params![req.question_id, req.reference_id, req.location_text, max_order + 1],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Remove a reference link from a question
pub fn remove_question_reference(id: i32) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    conn.execute(
        "DELETE FROM QuestionReferences WHERE id = ?1",
        params![id],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

/// Update page number/location text for a question reference link
pub fn update_question_reference_location(id: i32, location_text: Option<String>) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    conn.execute(
        "UPDATE QuestionReferences SET location_text = ?1 WHERE id = ?2",
        params![location_text, id],
    )
    .map_err(|e| e.to_string())?;
    
    Ok(())
}




// ==========================================
// Occupation Branch Management (Global)
// ==========================================

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct OccupationBranch {
    pub code: String,
    pub name: String,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct OccupationSubBranch {
    pub code: String,
    pub branch_code: String,
    pub name: String,
}

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
pub struct OccupationSubQuestion {
    pub id: i64,
    pub branch_code: String,
    pub sub_branch_code: String,
    pub code: String,
    pub text: String,
    pub always_checked: bool,
    pub sequence: i32,
}

// --- Main Branches ---

/// Get all occupation branches
pub fn get_occupation_branches() -> Result<Vec<OccupationBranch>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    let mut stmt = conn.prepare("SELECT code, name FROM OccupationBranches ORDER BY code")
        .map_err(|e| e.to_string())?;
    let rows = stmt.query_map([], |row| {
        Ok(OccupationBranch { code: row.get(0)?, name: row.get(1)? })
    }).map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for r in rows { result.push(r.map_err(|e| e.to_string())?); }
    Ok(result)
}

/// Create a new occupation branch
pub fn create_occupation_branch(code: String, name: String) -> Result<OccupationBranch, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.execute(
        "INSERT INTO OccupationBranches (code, name) VALUES (?1, ?2)",
        params![code, name],
    ).map_err(|e| e.to_string())?;
    Ok(OccupationBranch { code, name })
}

/// Update an occupation branch name
pub fn update_occupation_branch(code: String, name: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.execute(
        "UPDATE OccupationBranches SET name = ?1 WHERE code = ?2",
        params![name, code],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// Delete an occupation branch (cascades to sub-branches and sub-questions)
pub fn delete_occupation_branch(code: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.execute("PRAGMA foreign_keys = ON", []).map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM OccupationBranches WHERE code = ?1",
        params![code],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// --- Sub-Branches ---

/// Get sub-branches for a given main branch
pub fn get_occupation_sub_branches(branch_code: String) -> Result<Vec<OccupationSubBranch>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    let mut stmt = conn.prepare(
        "SELECT code, branch_code, name FROM OccupationSubBranches WHERE branch_code = ?1 ORDER BY code"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![branch_code], |row| {
        Ok(OccupationSubBranch { code: row.get(0)?, branch_code: row.get(1)?, name: row.get(2)? })
    }).map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for r in rows { result.push(r.map_err(|e| e.to_string())?); }
    Ok(result)
}

/// Create a new sub-branch
pub fn create_occupation_sub_branch(code: String, branch_code: String, name: String) -> Result<OccupationSubBranch, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.execute(
        "INSERT INTO OccupationSubBranches (code, branch_code, name) VALUES (?1, ?2, ?3)",
        params![code, branch_code, name],
    ).map_err(|e| e.to_string())?;
    Ok(OccupationSubBranch { code, branch_code, name })
}

/// Update a sub-branch name
pub fn update_occupation_sub_branch(code: String, branch_code: String, name: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.execute(
        "UPDATE OccupationSubBranches SET name = ?1 WHERE branch_code = ?2 AND code = ?3",
        params![name, branch_code, code],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// Delete a sub-branch (cascades to sub-questions)
pub fn delete_occupation_sub_branch(code: String, branch_code: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.execute("PRAGMA foreign_keys = ON", []).map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM OccupationSubBranches WHERE branch_code = ?1 AND code = ?2",
        params![branch_code, code],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

// --- Sub-Questions ---

/// Get sub-questions for a given branch + sub-branch pair
pub fn get_occupation_sub_questions(branch_code: String, sub_branch_code: String) -> Result<Vec<OccupationSubQuestion>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    let mut stmt = conn.prepare(
        "SELECT id, branch_code, sub_branch_code, code, text, always_checked, sequence
         FROM OccupationSubQuestions WHERE branch_code = ?1 AND sub_branch_code = ?2
         ORDER BY sequence, id"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![branch_code, sub_branch_code], |row| {
        Ok(OccupationSubQuestion {
            id: row.get(0)?,
            branch_code: row.get(1)?,
            sub_branch_code: row.get(2)?,
            code: row.get(3)?,
            text: row.get(4)?,
            always_checked: row.get(5)?,
            sequence: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for r in rows { result.push(r.map_err(|e| e.to_string())?); }
    Ok(result)
}

/// Get ALL sub-questions for a given main branch (across all sub-branches)
pub fn get_all_sub_questions_for_branch(branch_code: String) -> Result<Vec<OccupationSubQuestion>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    let mut stmt = conn.prepare(
        "SELECT id, branch_code, sub_branch_code, code, text, always_checked, sequence
         FROM OccupationSubQuestions WHERE branch_code = ?1
         ORDER BY sub_branch_code, sequence, id"
    ).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![branch_code], |row| {
        Ok(OccupationSubQuestion {
            id: row.get(0)?,
            branch_code: row.get(1)?,
            sub_branch_code: row.get(2)?,
            code: row.get(3)?,
            text: row.get(4)?,
            always_checked: row.get(5)?,
            sequence: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;
    let mut result = Vec::new();
    for r in rows { result.push(r.map_err(|e| e.to_string())?); }
    Ok(result)
}

#[derive(serde::Deserialize)]
pub struct CreateSubQuestionRequest {
    pub branch_code: String,
    pub sub_branch_code: String,
    pub code: String,
    pub text: String,
    pub always_checked: Option<bool>,
}

/// Create a new sub-question
pub fn create_occupation_sub_question(req: CreateSubQuestionRequest) -> Result<OccupationSubQuestion, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Get next sequence
    let max_seq: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sequence), 0) FROM OccupationSubQuestions WHERE branch_code = ?1 AND sub_branch_code = ?2",
        params![req.branch_code, req.sub_branch_code],
        |row| row.get(0),
    ).unwrap_or(0);
    
    conn.execute(
        "INSERT INTO OccupationSubQuestions (branch_code, sub_branch_code, code, text, always_checked, sequence)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![req.branch_code, req.sub_branch_code, req.code, req.text, req.always_checked.unwrap_or(false), max_seq + 1],
    ).map_err(|e| e.to_string())?;
    
    let id = conn.last_insert_rowid();
    Ok(OccupationSubQuestion {
        id,
        branch_code: req.branch_code,
        sub_branch_code: req.sub_branch_code,
        code: req.code,
        text: req.text,
        always_checked: req.always_checked.unwrap_or(false),
        sequence: max_seq + 1,
    })
}

/// Update a sub-question text
pub fn update_occupation_sub_question(id: i64, text: String, always_checked: Option<bool>) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    if let Some(ac) = always_checked {
        conn.execute(
            "UPDATE OccupationSubQuestions SET text = ?1, always_checked = ?2 WHERE id = ?3",
            params![text, ac, id],
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE OccupationSubQuestions SET text = ?1 WHERE id = ?2",
            params![text, id],
        ).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Delete a sub-question
pub fn delete_occupation_sub_question(id: i64) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.execute("DELETE FROM OccupationSubQuestions WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ===== User Progress & Scoring =====

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct UserProgress {
    pub id: i64,
    pub user_id: String,
    pub document_id: String,
    pub section_id: Option<i64>,
    pub earned_score: i32,
    pub max_score: i32,
    pub completion_percentage: f64,
    pub is_passed: bool,
    pub passing_score: i32,
    pub last_updated: String,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct UpsertUserProgressArgs {
    pub user_id: String,
    pub document_id: String,
    pub section_id: Option<i64>,
    pub earned_score: i32,
    pub max_score: i32,
    pub passing_score: Option<i32>,
}

/// Upsert (insert or update) user progress for a section
pub fn upsert_user_progress(args: UpsertUserProgressArgs) -> Result<UserProgress, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let passing = args.passing_score.unwrap_or(70);
    let pct = if args.max_score > 0 {
        (args.earned_score as f64 / args.max_score as f64) * 100.0
    } else {
        0.0
    };
    let is_passed = pct >= passing as f64;

    conn.execute(
        "INSERT INTO UserProgress (user_id, document_id, section_id, earned_score, max_score, completion_percentage, is_passed, passing_score, last_updated)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, document_id, section_id) DO UPDATE SET
            earned_score = ?4, max_score = ?5, completion_percentage = ?6, is_passed = ?7, passing_score = ?8, last_updated = CURRENT_TIMESTAMP",
        params![args.user_id, args.document_id, args.section_id, args.earned_score, args.max_score, pct, is_passed, passing],
    ).map_err(|e| e.to_string())?;

    // Return the upserted row
    let progress = conn.query_row(
        "SELECT id, user_id, document_id, section_id, earned_score, max_score, completion_percentage, is_passed, passing_score, last_updated
         FROM UserProgress WHERE user_id = ?1 AND document_id = ?2 AND section_id IS ?3",
        params![args.user_id, args.document_id, args.section_id],
        |row| {
            Ok(UserProgress {
                id: row.get(0)?,
                user_id: row.get(1)?,
                document_id: row.get(2)?,
                section_id: row.get(3)?,
                earned_score: row.get(4)?,
                max_score: row.get(5)?,
                completion_percentage: row.get(6)?,
                is_passed: row.get(7)?,
                passing_score: row.get(8)?,
                last_updated: row.get(9)?,
            })
        }
    ).map_err(|e| e.to_string())?;

    Ok(progress)
}

/// Get all progress entries for a user in a document
pub fn get_user_progress(user_id: String, document_id: String) -> Result<Vec<UserProgress>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT id, user_id, document_id, section_id, earned_score, max_score, completion_percentage, is_passed, passing_score, last_updated
         FROM UserProgress WHERE user_id = ?1 AND document_id = ?2"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![user_id, document_id], |row| {
        Ok(UserProgress {
            id: row.get(0)?,
            user_id: row.get(1)?,
            document_id: row.get(2)?,
            section_id: row.get(3)?,
            earned_score: row.get(4)?,
            max_score: row.get(5)?,
            completion_percentage: row.get(6)?,
            is_passed: row.get(7)?,
            passing_score: row.get(8)?,
            last_updated: row.get(9)?,
        })
    }).map_err(|e| e.to_string())?
      .collect::<Result<Vec<_>, _>>()
      .map_err(|e| e.to_string())?;

    Ok(rows)
}

/// Calculate total score for a section by summing L1 group_scores + standalone scored questions
pub fn calculate_section_total_score(section_id: i64) -> Result<i32, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Sum L1 questions: group headers use group_score, others use score if is_scored
    // Only count top-level questions (parent_id IS NULL) to avoid double-counting
    let total: i32 = conn.query_row(
        "SELECT COALESCE(SUM(
            CASE 
                WHEN question_type = 'exempted' THEN 0
                WHEN is_group_header = 1 THEN group_score
                WHEN is_scored = 1 AND parent_id IS NULL THEN score
                ELSE 0
            END
        ), 0) FROM Questions WHERE section_id = ?1 AND parent_id IS NULL",
        params![section_id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    // Auto-update the section's total_score
    conn.execute(
        "UPDATE Sections SET total_score = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
        params![total, section_id],
    ).map_err(|e| e.to_string())?;

    Ok(total)
}

/// Calculate group_score for a parent question by summing children's scores
/// Children that are group headers contribute group_score; scored children contribute score
/// Returns the computed group_score and auto-updates the parent's group_score field
pub fn calculate_group_score(parent_id: String) -> Result<i32, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let total: i32 = conn.query_row(
        "SELECT COALESCE(SUM(
            CASE 
                WHEN question_type = 'exempted' THEN 0
                WHEN is_group_header = 1 THEN group_score
                WHEN is_scored = 1 THEN score
                ELSE 0
            END
        ), 0) FROM Questions WHERE parent_id = ?1",
        params![parent_id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    // Auto-update the parent's group_score
    conn.execute(
        "UPDATE Questions SET group_score = ?1 WHERE id = ?2",
        params![total, parent_id],
    ).map_err(|e| e.to_string())?;

    Ok(total)
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct UpdateQuestionScoreArgs {
    pub id: String,
    pub score: i32,
    pub is_scored: bool,
    pub question_type: String,
    pub display_text: Option<String>,
}

/// Update scoring fields for a single question
pub fn update_question_score(args: UpdateQuestionScoreArgs) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // When exempted, also clear group_score so the UI badge and parent chain are correct
    if args.question_type == "exempted" {
        // If this question has children, delete them all (allows L1 group headers to become exempted)
        conn.execute(
            "DELETE FROM Questions WHERE parent_id = ?1",
            params![args.id],
        ).map_err(|e| e.to_string())?;
        
        // Set question to exempted and revert group_header status, clear description
        conn.execute(
            "UPDATE Questions SET score = 0, is_scored = 0, question_type = ?2, display_text = ?3, group_score = 0, is_group_header = 0, description = NULL WHERE id = ?1",
            params![args.id, args.question_type, args.display_text],
        ).map_err(|e| e.to_string())?;
    } else {
        conn.execute(
            "UPDATE Questions SET score = ?2, is_scored = ?3, question_type = ?4, display_text = ?5 WHERE id = ?1",
            params![args.id, args.score, args.is_scored, args.question_type, args.display_text],
        ).map_err(|e| e.to_string())?;
    }

    // If this question has a parent, recalculate parent's group_score (L2 → L1)
    let parent_id: Option<String> = conn.query_row(
        "SELECT parent_id FROM Questions WHERE id = ?1",
        params![args.id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    if let Some(ref pid) = parent_id {
        // Sum children: group headers contribute group_score, scored items contribute score
        let group_total: i32 = conn.query_row(
            "SELECT COALESCE(SUM(
                CASE 
                    WHEN question_type = 'exempted' THEN 0
                    WHEN is_group_header = 1 THEN group_score
                    WHEN is_scored = 1 THEN score
                    ELSE 0
                END
            ), 0) FROM Questions WHERE parent_id = ?1",
            params![pid],
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE Questions SET group_score = ?1 WHERE id = ?2",
            params![group_total, pid],
        ).map_err(|e| e.to_string())?;

        // Also propagate up: if parent has a grandparent, recalculate grandparent's group_score (L1 → section)
        let grandparent_id: Option<String> = conn.query_row(
            "SELECT parent_id FROM Questions WHERE id = ?1",
            params![pid],
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;

        if let Some(ref gpid) = grandparent_id {
            let gp_total: i32 = conn.query_row(
                "SELECT COALESCE(SUM(
                    CASE 
                        WHEN question_type = 'exempted' THEN 0
                        WHEN is_group_header = 1 THEN group_score
                        WHEN is_scored = 1 THEN score
                        ELSE 0
                    END
                ), 0) FROM Questions WHERE parent_id = ?1",
                params![gpid],
                |row| row.get(0)
            ).map_err(|e| e.to_string())?;
            conn.execute(
                "UPDATE Questions SET group_score = ?1 WHERE id = ?2",
                params![gp_total, gpid],
            ).map_err(|e| e.to_string())?;
        }

        // Propagate to section total_score
        let section_id: Option<i64> = conn.query_row(
            "SELECT section_id FROM Questions WHERE id = ?1",
            params![pid],
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;

        if let Some(sid) = section_id {
            let section_total: i32 = conn.query_row(
                "SELECT COALESCE(SUM(
                    CASE 
                        WHEN question_type = 'exempted' THEN 0
                        WHEN is_group_header = 1 THEN group_score
                        WHEN is_scored = 1 AND parent_id IS NULL THEN score
                        ELSE 0
                    END
                ), 0) FROM Questions WHERE section_id = ?1 AND parent_id IS NULL",
                params![sid],
                |row| row.get(0)
            ).map_err(|e| e.to_string())?;

            conn.execute(
                "UPDATE Sections SET total_score = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                params![section_total, sid],
            ).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

// ============================================================
// QuestionSectionLinks — Link 3xx.1.4/1.5 to 100/200 Sections
// ============================================================

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct QuestionSectionLink {
    pub id: i64,
    pub question_id: String,
    pub section_id: i64,
    pub score: i32,
    pub display_order: i32,
    // Joined from Sections table (always live)
    pub section_number: i32,
    pub section_title: String,
    pub section_group: i32,
}

#[derive(serde::Deserialize)]
pub struct AddQuestionSectionLinkRequest {
    pub question_id: String,
    pub section_id: i64,
    pub score: Option<i32>,
}

/// Add a single section link to a question (3xx.1.4 or 3xx.1.5)
pub fn add_question_section_link(req: AddQuestionSectionLinkRequest) -> Result<QuestionSectionLink, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Check if already linked
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM QuestionSectionLinks WHERE question_id = ?1 AND section_id = ?2)",
        params![req.question_id, req.section_id],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?;

    if exists {
        return Err("This section is already linked to this question".to_string());
    }

    // Get next display_order
    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(display_order), 0) FROM QuestionSectionLinks WHERE question_id = ?1",
        params![req.question_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let score = req.score.unwrap_or(0);

    conn.execute(
        "INSERT INTO QuestionSectionLinks (question_id, section_id, score, display_order)
         VALUES (?1, ?2, ?3, ?4)",
        params![req.question_id, req.section_id, score, max_order + 1],
    ).map_err(|e| e.to_string())?;

    let id = conn.last_insert_rowid();

    // Return with joined section data
    get_question_section_link_by_id(&conn, id)
}

#[derive(serde::Deserialize)]
pub struct BatchAddQuestionSectionLinksRequest {
    pub question_id: String,
    pub section_ids: Vec<i64>,
}

/// Batch add multiple section links at once (for "Select All")
pub fn batch_add_question_section_links(req: BatchAddQuestionSectionLinksRequest) -> Result<Vec<QuestionSectionLink>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let max_order: i32 = conn.query_row(
        "SELECT COALESCE(MAX(display_order), 0) FROM QuestionSectionLinks WHERE question_id = ?1",
        params![req.question_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let mut created_ids: Vec<i64> = Vec::new();
    for (i, section_id) in req.section_ids.iter().enumerate() {
        // Skip if already linked
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM QuestionSectionLinks WHERE question_id = ?1 AND section_id = ?2)",
            params![req.question_id, section_id],
            |row| row.get(0),
        ).unwrap_or(true);

        if !exists {
            conn.execute(
                "INSERT INTO QuestionSectionLinks (question_id, section_id, score, display_order)
                 VALUES (?1, ?2, 0, ?3)",
                params![req.question_id, section_id, max_order + 1 + i as i32],
            ).map_err(|e| e.to_string())?;
            created_ids.push(conn.last_insert_rowid());
        }
    }

    // Return all links for this question (not just new ones)
    get_question_section_links_inner(&conn, &req.question_id)
}

/// Remove a single section link by its ID
pub fn remove_question_section_link(id: i64) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.execute("DELETE FROM QuestionSectionLinks WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Remove all section links for a question (for "Deselect All")
pub fn remove_all_question_section_links(question_id: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.execute("DELETE FROM QuestionSectionLinks WHERE question_id = ?1", params![question_id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

/// Get all section links for a question, joined with live Section data
pub fn get_question_section_links(question_id: String) -> Result<Vec<QuestionSectionLink>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    get_question_section_links_inner(&conn, &question_id)
}

fn get_question_section_links_inner(conn: &Connection, question_id: &str) -> Result<Vec<QuestionSectionLink>, String> {
    let mut stmt = conn.prepare(
        "SELECT qsl.id, qsl.question_id, qsl.section_id, qsl.score, qsl.display_order,
                s.section_number, s.title_th, s.section_group
         FROM QuestionSectionLinks qsl
         JOIN Sections s ON qsl.section_id = s.id
         WHERE qsl.question_id = ?1
         ORDER BY s.section_number"
    ).map_err(|e| e.to_string())?;

    let links = stmt.query_map(params![question_id], |row| {
        Ok(QuestionSectionLink {
            id: row.get(0)?,
            question_id: row.get(1)?,
            section_id: row.get(2)?,
            score: row.get(3)?,
            display_order: row.get(4)?,
            section_number: row.get(5)?,
            section_title: row.get(6)?,
            section_group: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?
      .collect::<Result<Vec<_>, _>>()
      .map_err(|e| e.to_string())?;

    Ok(links)
}

fn get_question_section_link_by_id(conn: &Connection, id: i64) -> Result<QuestionSectionLink, String> {
    conn.query_row(
        "SELECT qsl.id, qsl.question_id, qsl.section_id, qsl.score, qsl.display_order,
                s.section_number, s.title_th, s.section_group
         FROM QuestionSectionLinks qsl
         JOIN Sections s ON qsl.section_id = s.id
         WHERE qsl.id = ?1",
        params![id],
        |row| Ok(QuestionSectionLink {
            id: row.get(0)?,
            question_id: row.get(1)?,
            section_id: row.get(2)?,
            score: row.get(3)?,
            display_order: row.get(4)?,
            section_number: row.get(5)?,
            section_title: row.get(6)?,
            section_group: row.get(7)?,
        })
    ).map_err(|e| format!("Failed to get section link: {}", e))
}

#[derive(serde::Deserialize)]
pub struct UpdateSectionLinkScoreArgs {
    pub id: i64,
    pub score: i32,
}

/// Update score for a single section link
pub fn update_section_link_score(args: UpdateSectionLinkScoreArgs) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    conn.execute(
        "UPDATE QuestionSectionLinks SET score = ?1 WHERE id = ?2",
        params![args.score, args.id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Calculate the total score of all section links for a question (3xx.1.4 or 3xx.1.5),
/// then update the question's group_score, and propagate up to the parent (3xx.1) and section total.
pub fn recalculate_section_link_scores(question_id: String) -> Result<i32, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // 1. Sum all link scores for this question
    let link_total: i32 = conn.query_row(
        "SELECT COALESCE(SUM(score), 0) FROM QuestionSectionLinks WHERE question_id = ?1",
        params![question_id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    // 2. Update this question's group_score (3xx.1.4 or 3xx.1.5)
    conn.execute(
        "UPDATE Questions SET group_score = ?1 WHERE id = ?2",
        params![link_total, question_id],
    ).map_err(|e| e.to_string())?;

    // 3. Propagate up: get parent (3xx.1) and recalculate its group_score
    let parent_id: Option<String> = conn.query_row(
        "SELECT parent_id FROM Questions WHERE id = ?1",
        params![question_id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    if let Some(pid) = parent_id {
        // Sum group_score of scored children (3xx.1.4 + 3xx.1.5) + direct scores
        let parent_total: i32 = conn.query_row(
            "SELECT COALESCE(SUM(
                CASE 
                    WHEN question_type = 'exempted' THEN 0
                    WHEN is_group_header = 1 THEN group_score
                    WHEN is_scored = 1 THEN score
                    ELSE 0
                END
            ), 0) FROM Questions WHERE parent_id = ?1",
            params![pid],
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;

        conn.execute(
            "UPDATE Questions SET group_score = ?1 WHERE id = ?2",
            params![parent_total, pid],
        ).map_err(|e| e.to_string())?;

        // 4. Propagate to section total_score
        let section_id: Option<i64> = conn.query_row(
            "SELECT section_id FROM Questions WHERE id = ?1",
            params![pid],
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;

        if let Some(sid) = section_id {
            let section_total: i32 = conn.query_row(
                "SELECT COALESCE(SUM(
                    CASE 
                        WHEN question_type = 'exempted' THEN 0
                        WHEN is_group_header = 1 THEN group_score
                        WHEN is_scored = 1 AND is_group_header = 0 AND parent_id IS NULL THEN score
                        ELSE 0
                    END
                ), 0) FROM Questions WHERE section_id = ?1 AND parent_id IS NULL",
                params![sid],
                |row| row.get(0)
            ).map_err(|e| e.to_string())?;

            conn.execute(
                "UPDATE Sections SET total_score = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
                params![section_total, sid],
            ).map_err(|e| e.to_string())?;
        }
    }

    Ok(link_total)
}

// ============================================================
// Section-Ref L3 Children — 3xx.1.4/1.5 children as real Questions
// Each selected section becomes an L3 Question (question_type='section_ref')
// so the normal scoring chain L3→L2→L1→Section works naturally.
// ============================================================

/// Helper: recalculate group_score chain from a parent upward (parent → grandparent → section total)
fn recalculate_group_score_chain(conn: &Connection, parent_id: &str) -> Result<(), String> {
    // 1. Recalculate parent's group_score from its children
    let parent_total: i32 = conn.query_row(
        "SELECT COALESCE(SUM(
            CASE 
                WHEN question_type = 'exempted' THEN 0
                WHEN is_group_header = 1 THEN group_score
                WHEN is_scored = 1 THEN score
                ELSE 0
            END
        ), 0) FROM Questions WHERE parent_id = ?1",
        params![parent_id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE Questions SET group_score = ?1 WHERE id = ?2",
        params![parent_total, parent_id],
    ).map_err(|e| e.to_string())?;

    // 2. Get grandparent and propagate up
    let grandparent_id: Option<String> = conn.query_row(
        "SELECT parent_id FROM Questions WHERE id = ?1",
        params![parent_id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    if let Some(ref gpid) = grandparent_id {
        let gp_total: i32 = conn.query_row(
            "SELECT COALESCE(SUM(
                CASE 
                    WHEN question_type = 'exempted' THEN 0
                    WHEN is_group_header = 1 THEN group_score
                    WHEN is_scored = 1 THEN score
                    ELSE 0
                END
            ), 0) FROM Questions WHERE parent_id = ?1",
            params![gpid],
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;

        conn.execute(
            "UPDATE Questions SET group_score = ?1 WHERE id = ?2",
            params![gp_total, gpid],
        ).map_err(|e| e.to_string())?;
    }

    // 3. Propagate to section total_score
    let section_id: Option<i64> = conn.query_row(
        "SELECT section_id FROM Questions WHERE id = ?1",
        params![parent_id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    if let Some(sid) = section_id {
        let section_total: i32 = conn.query_row(
            "SELECT COALESCE(SUM(
                CASE 
                    WHEN question_type = 'exempted' THEN 0
                    WHEN is_group_header = 1 THEN group_score
                    WHEN is_scored = 1 AND parent_id IS NULL THEN score
                    ELSE 0
                END
            ), 0) FROM Questions WHERE section_id = ?1 AND parent_id IS NULL",
            params![sid],
            |row| row.get(0)
        ).map_err(|e| e.to_string())?;

        conn.execute(
            "UPDATE Sections SET total_score = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![section_total, sid],
        ).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[derive(Debug, serde::Serialize, Clone)]
pub struct SectionRefChild {
    pub id: String,
    pub parent_id: String,
    pub sequence: i32,
    pub content: String,
    pub score: i32,
    pub ref_section_id: i64,
    pub ref_section_number: i32,
}

/// Get all section-ref L3 children for a parent question (3xx.1.4 or 3xx.1.5)
pub fn get_section_ref_children(parent_id: String) -> Result<Vec<SectionRefChild>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    get_section_ref_children_inner(&conn, &parent_id)
}

fn get_section_ref_children_inner(conn: &Connection, parent_id: &str) -> Result<Vec<SectionRefChild>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, parent_id, sequence, content, score, metadata
         FROM Questions
         WHERE parent_id = ?1 AND question_type = 'section_ref'
         ORDER BY sequence"
    ).map_err(|e| e.to_string())?;

    let children = stmt.query_map(params![parent_id], |row| {
        let id: String = row.get(0)?;
        let parent_id: String = row.get(1)?;
        let sequence: i32 = row.get(2)?;
        let content: String = row.get(3)?;
        let score: i32 = row.get::<_, Option<i32>>(4)?.unwrap_or(0);
        let metadata: Option<String> = row.get(5)?;

        let (ref_section_id, ref_section_number) = if let Some(meta_str) = metadata {
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&meta_str) {
                let sid = v.get("refSectionId").and_then(|r| r.as_i64()).unwrap_or(0);
                let snum = v.get("refSectionNumber").and_then(|r| r.as_i64()).unwrap_or(0) as i32;
                (sid, snum)
            } else { (0, 0) }
        } else { (0, 0) };

        Ok(SectionRefChild { id, parent_id, sequence, content, score, ref_section_id, ref_section_number })
    }).map_err(|e| e.to_string())?
      .collect::<Result<Vec<_>, _>>()
      .map_err(|e| e.to_string())?;

    Ok(children)
}

#[derive(serde::Deserialize)]
pub struct AddSectionRefChildArgs {
    pub parent_id: String,
    pub document_id: String,
    pub section_id: i64,
    pub linked_section_id: i64,
    pub linked_section_number: i32,
    pub linked_section_title: String,
    pub score: Option<i32>,
}

/// Add a single section as an L3 child question under 3xx.1.4 or 3xx.1.5
pub fn add_section_ref_child(args: AddSectionRefChildArgs) -> Result<SectionRefChild, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Check if already exists
    let exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM Questions WHERE parent_id = ?1 AND question_type = 'section_ref' AND metadata LIKE ?2)",
        params![args.parent_id, format!("%\"refSectionId\":{}%", args.linked_section_id)],
        |row| row.get(0),
    ).unwrap_or(false);

    if exists {
        return Err("This section is already added as a child question".to_string());
    }

    let max_seq: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sequence), 0) FROM Questions WHERE parent_id = ?1",
        params![args.parent_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let id = generate_uuid();
    let score = args.score.unwrap_or(0);
    let sequence = max_seq + 1;
    let metadata = serde_json::json!({
        "refSectionId": args.linked_section_id,
        "refSectionNumber": args.linked_section_number
    }).to_string();

    conn.execute(
        "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, metadata, score, question_type, group_score, is_group_header, is_scored)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 'text', ?7, ?8, 'section_ref', 0, 0, 1)",
        params![id, args.document_id, args.section_id, args.parent_id, sequence, args.linked_section_title, metadata, score],
    ).map_err(|e| e.to_string())?;

    // Mark parent as group_header
    conn.execute(
        "UPDATE Questions SET is_group_header = 1 WHERE id = ?1",
        params![args.parent_id],
    ).map_err(|e| e.to_string())?;

    // Propagate scores up the chain
    recalculate_group_score_chain(&conn, &args.parent_id)?;

    Ok(SectionRefChild {
        id, parent_id: args.parent_id, sequence, content: args.linked_section_title,
        score, ref_section_id: args.linked_section_id, ref_section_number: args.linked_section_number,
    })
}

#[derive(serde::Deserialize)]
pub struct BatchAddSectionRefChildrenArgs {
    pub parent_id: String,
    pub document_id: String,
    pub section_id: i64,
    pub sections: Vec<BatchSectionItem>,
}

#[derive(serde::Deserialize)]
pub struct BatchSectionItem {
    pub linked_section_id: i64,
    pub linked_section_number: i32,
    pub linked_section_title: String,
}

/// Batch add multiple sections as L3 children (for "Select All")
pub fn batch_add_section_ref_children(args: BatchAddSectionRefChildrenArgs) -> Result<Vec<SectionRefChild>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut max_seq: i32 = conn.query_row(
        "SELECT COALESCE(MAX(sequence), 0) FROM Questions WHERE parent_id = ?1",
        params![args.parent_id],
        |row| row.get(0),
    ).unwrap_or(0);

    for item in &args.sections {
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM Questions WHERE parent_id = ?1 AND question_type = 'section_ref' AND metadata LIKE ?2)",
            params![args.parent_id, format!("%\"refSectionId\":{}%", item.linked_section_id)],
            |row| row.get(0),
        ).unwrap_or(true);

        if !exists {
            max_seq += 1;
            let id = generate_uuid();
            let metadata = serde_json::json!({
                "refSectionId": item.linked_section_id,
                "refSectionNumber": item.linked_section_number
            }).to_string();

            conn.execute(
                "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, metadata, score, question_type, group_score, is_group_header, is_scored)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 'text', ?7, 0, 'section_ref', 0, 0, 1)",
                params![id, args.document_id, args.section_id, args.parent_id, max_seq, item.linked_section_title, metadata],
            ).map_err(|e| e.to_string())?;
        }
    }

    // Mark parent as group_header
    conn.execute(
        "UPDATE Questions SET is_group_header = 1 WHERE id = ?1",
        params![args.parent_id],
    ).map_err(|e| e.to_string())?;

    recalculate_group_score_chain(&conn, &args.parent_id)?;

    get_section_ref_children_inner(&conn, &args.parent_id)
}

/// Remove a single section-ref L3 child question and recalculate scores
pub fn remove_section_ref_child(question_id: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let parent_id: Option<String> = conn.query_row(
        "SELECT parent_id FROM Questions WHERE id = ?1",
        params![question_id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM Questions WHERE id = ?1 AND question_type = 'section_ref'", params![question_id])
        .map_err(|e| e.to_string())?;

    if let Some(pid) = parent_id {
        recalculate_group_score_chain(&conn, &pid)?;
    }

    Ok(())
}

/// Remove all section-ref L3 children for a parent (for "Deselect All")
pub fn remove_all_section_ref_children(parent_id: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    conn.execute(
        "DELETE FROM Questions WHERE parent_id = ?1 AND question_type = 'section_ref'",
        params![parent_id],
    ).map_err(|e| e.to_string())?;

    recalculate_group_score_chain(&conn, &parent_id)?;

    Ok(())
}

/// Update score for a section-ref L3 child and propagate up
pub fn update_section_ref_score(question_id: String, score: i32) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    conn.execute(
        "UPDATE Questions SET score = ?1 WHERE id = ?2 AND question_type = 'section_ref'",
        params![score, question_id],
    ).map_err(|e| e.to_string())?;

    let parent_id: Option<String> = conn.query_row(
        "SELECT parent_id FROM Questions WHERE id = ?1",
        params![question_id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;

    if let Some(pid) = parent_id {
        recalculate_group_score_chain(&conn, &pid)?;
    }

    Ok(())
}

/// Migrate existing QuestionSectionLinks → L3 section_ref Questions
/// Call once to convert link-based data to proper L3 children
pub fn migrate_section_links_to_ref_children() -> Result<usize, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Check if there are any links to migrate
    let link_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM QuestionSectionLinks", [],
        |row| row.get(0)
    ).unwrap_or(0);

    if link_count == 0 { return Ok(0); }

    let mut stmt = conn.prepare(
        "SELECT qsl.id, qsl.question_id, qsl.section_id, qsl.score, qsl.display_order,
                s.section_number, s.title_th,
                q.document_id, q.section_id as q_section_id
         FROM QuestionSectionLinks qsl
         JOIN Sections s ON qsl.section_id = s.id
         JOIN Questions q ON qsl.question_id = q.id
         ORDER BY qsl.question_id, qsl.display_order"
    ).map_err(|e| e.to_string())?;

    let links: Vec<(i64, String, i64, i32, i32, i32, String, String, Option<i64>)> = stmt.query_map([], |row| {
        Ok((
            row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?,
            row.get(5)?, row.get(6)?, row.get(7)?, row.get(8)?,
        ))
    }).map_err(|e| e.to_string())?
      .collect::<Result<Vec<_>, _>>()
      .map_err(|e| e.to_string())?;

    let mut migrated = 0;
    let mut seen_parents: std::collections::HashSet<String> = std::collections::HashSet::new();

    for (_link_id, parent_id, section_id, score, display_order, section_number, section_title, document_id, q_section_id) in &links {
        // Check if L3 question already exists for this section ref
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM Questions WHERE parent_id = ?1 AND question_type = 'section_ref' AND metadata LIKE ?2)",
            params![parent_id, format!("%\"refSectionId\":{}%", section_id)],
            |row| row.get(0),
        ).unwrap_or(true);

        if !exists {
            let id = generate_uuid();
            let metadata = serde_json::json!({
                "refSectionId": section_id,
                "refSectionNumber": section_number
            }).to_string();

            conn.execute(
                "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, metadata, score, question_type, group_score, is_group_header, is_scored)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 'text', ?7, ?8, 'section_ref', 0, 0, 1)",
                params![id, document_id, q_section_id, parent_id, display_order, section_title, metadata, score],
            ).map_err(|e| e.to_string())?;

            migrated += 1;
        }

        seen_parents.insert(parent_id.clone());
    }

    // Mark all parents as group_header and recalculate scores
    for pid in &seen_parents {
        conn.execute(
            "UPDATE Questions SET is_group_header = 1 WHERE id = ?1",
            params![pid],
        ).map_err(|e| e.to_string())?;
        recalculate_group_score_chain(&conn, pid)?;
    }

    // Delete migrated links
    if migrated > 0 {
        conn.execute("DELETE FROM QuestionSectionLinks", []).map_err(|e| e.to_string())?;
    }

    Ok(migrated)
}

// ============================================================
// Required Count Children (3xx.2-3xx.6 L3 "ครั้งที่ X")
// ============================================================

fn thai_number(n: i32) -> String {
    match n {
        0 => "๐".to_string(),
        1 => "๑".to_string(),
        2 => "๒".to_string(),
        3 => "๓".to_string(),
        4 => "๔".to_string(),
        5 => "๕".to_string(),
        6 => "๖".to_string(),
        7 => "๗".to_string(),
        8 => "๘".to_string(),
        9 => "๙".to_string(),
        _ => n.to_string(),
    }
}

pub fn check_has_children(parent_id: String) -> Result<bool, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1",
        params![parent_id],
        |row| row.get(0),
    ).unwrap_or(0);
    Ok(count > 0)
}

#[derive(Debug, serde::Serialize, Clone)]
pub struct RequiredCountChild {
    pub id: String,
    pub parent_id: String,
    pub sequence: i32,
    pub content: String,
    pub score: i32,
    pub is_scored: bool,
}

/// Get all required_instance L3 children for an L2 question
pub fn get_required_count_children(parent_id: String) -> Result<Vec<RequiredCountChild>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    get_required_count_children_inner(&conn, &parent_id)
}

fn get_required_count_children_inner(conn: &Connection, parent_id: &str) -> Result<Vec<RequiredCountChild>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, parent_id, sequence, content, score, is_scored
         FROM Questions
         WHERE parent_id = ?1 AND question_type = 'required_instance'
         ORDER BY sequence"
    ).map_err(|e| e.to_string())?;

    let children = stmt.query_map(params![parent_id], |row| {
        Ok(RequiredCountChild {
            id: row.get(0)?,
            parent_id: row.get(1)?,
            sequence: row.get(2)?,
            content: row.get(3)?,
            score: row.get(4)?,
            is_scored: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?
      .collect::<Result<Vec<_>, _>>()
      .map_err(|e| e.to_string())?;

    Ok(children)
}

#[derive(serde::Deserialize)]
pub struct SyncRequiredCountArgs {
    pub parent_id: String,
    pub document_id: String,
    pub section_id: i64,
    pub desired_count: i32,
    pub score_per_instance: i32,
}

/// Sync L3 "ครั้งที่ X" children for an L2 question (3xx.2-3xx.6).
/// Creates/deletes children to match desired_count.
/// Each child: content = "{thai_alpha}. {parent_content} ครั้งที่ {N}", score = score_per_instance.
pub fn sync_required_count_children(args: SyncRequiredCountArgs) -> Result<Vec<RequiredCountChild>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Get parent question content, metadata, and answer_type to inherit
    let (parent_content, parent_metadata, parent_answer_type): (String, Option<String>, String) = conn.query_row(
        "SELECT content, metadata, COALESCE(answer_type, 'text') FROM Questions WHERE id = ?1",
        params![args.parent_id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
    ).map_err(|e| e.to_string())?;

    // Get existing required_instance children
    let existing = get_required_count_children_inner(&conn, &args.parent_id)?;
    let current_count = existing.len() as i32;

    if args.desired_count > current_count {
        // Add new children (inherit parent's metadata and answer_type)
        for i in (current_count + 1)..=(args.desired_count) {
            let id = generate_uuid();
            let content = format!("{} ครั้งที่ {}", parent_content, thai_number(i));

            conn.execute(
                "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, metadata, score, question_type, group_score, is_group_header, is_scored)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8, ?9, 'required_instance', 0, 0, 1)",
                params![id, args.document_id, args.section_id, args.parent_id, i, content, parent_answer_type, parent_metadata, args.score_per_instance],
            ).map_err(|e| e.to_string())?;
        }
    } else if args.desired_count < current_count {
        // Delete excess children (from the end)
        let ids_to_delete: Vec<String> = existing
            .iter()
            .skip(args.desired_count as usize)
            .map(|c| c.id.clone())
            .collect();

        for id in &ids_to_delete {
            conn.execute(
                "DELETE FROM Questions WHERE id = ?1 AND question_type = 'required_instance'",
                params![id],
            ).map_err(|e| e.to_string())?;
        }
    }

    // Update score, content, metadata, and answer_type for all remaining children
    // This ensures L3 children always inherit the latest sub-questions from L2 parent
    let remaining = get_required_count_children_inner(&conn, &args.parent_id)?;
    for child in &remaining {
        let new_content = format!("{} ครั้งที่ {}", parent_content, thai_number(child.sequence));
        conn.execute(
            "UPDATE Questions SET score = ?1, content = ?2, metadata = ?3, answer_type = ?4 WHERE id = ?5 AND question_type = 'required_instance'",
            params![args.score_per_instance, new_content, parent_metadata, parent_answer_type, child.id],
        ).map_err(|e| e.to_string())?;
    }

    // Mark parent as group_header if it has children, or unmark if count == 0
    if args.desired_count > 0 {
        conn.execute(
            "UPDATE Questions SET is_group_header = 1, is_scored = 0 WHERE id = ?1",
            params![args.parent_id],
        ).map_err(|e| e.to_string())?;
    } else {
        // No children — revert to scored leaf
        conn.execute(
            "UPDATE Questions SET is_group_header = 0, is_scored = 1 WHERE id = ?1",
            params![args.parent_id],
        ).map_err(|e| e.to_string())?;
    }

    // Recalculate scores up the chain
    recalculate_group_score_chain(&conn, &args.parent_id)?;

    get_required_count_children_inner(&conn, &args.parent_id)
}
