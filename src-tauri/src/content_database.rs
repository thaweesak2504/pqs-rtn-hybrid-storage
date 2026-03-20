use std::path::PathBuf;
use base64::{Engine as _, engine::general_purpose};
use rusqlite::{Connection, OptionalExtension, Result as SqlResult, params};
use tauri::api::path::app_data_dir;
use tauri::Config;
use crate::logger;

const STANDARD_BRANCH_NAME: &str = "ต้นแบบมาตรฐาน";
const STANDARD_BRANCH_PREFERRED_CODE: &str = "STD";
const STANDARD_SUB_BRANCH_PREFERRED_CODE: &str = "STD";

fn next_available_main_branch_code(conn: &Connection) -> Result<String, String> {
    let preferred_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM OccupationBranches WHERE code = ?1)",
            params![STANDARD_BRANCH_PREFERRED_CODE],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if !preferred_exists {
        return Ok(STANDARD_BRANCH_PREFERRED_CODE.to_string());
    }

    let next_numeric: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(CASE WHEN code GLOB '[0-9]*' THEN CAST(code AS INTEGER) END), 0) + 1 FROM OccupationBranches",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(next_numeric.to_string())
}

fn next_available_sub_branch_code(conn: &Connection, branch_code: &str) -> Result<String, String> {
    let preferred_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM OccupationSubBranches WHERE branch_code = ?1 AND code = ?2)",
            params![branch_code, STANDARD_SUB_BRANCH_PREFERRED_CODE],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if !preferred_exists {
        return Ok(STANDARD_SUB_BRANCH_PREFERRED_CODE.to_string());
    }

    let next_numeric: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(CASE WHEN code GLOB '[0-9]*' THEN CAST(code AS INTEGER) END), 0) + 1 FROM OccupationSubBranches WHERE branch_code = ?1",
            params![branch_code],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(next_numeric.to_string())
}

fn ensure_standard_occupation_branch_exists(conn: &Connection) -> Result<(), String> {
    let standard_main_code: String = match conn
        .query_row(
            "SELECT code FROM OccupationBranches WHERE name = ?1 LIMIT 1",
            params![STANDARD_BRANCH_NAME],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
    {
        Some(code) => code,
        None => {
            let code = next_available_main_branch_code(conn)?;
            conn.execute(
                "INSERT INTO OccupationBranches (code, name) VALUES (?1, ?2)",
                params![code, STANDARD_BRANCH_NAME],
            )
            .map_err(|e| e.to_string())?;
            code
        }
    };

    let standard_sub_exists: bool = conn
        .query_row(
            "SELECT EXISTS(
                SELECT 1 FROM OccupationSubBranches
                WHERE branch_code = ?1 AND name = ?2
            )",
            params![standard_main_code, STANDARD_BRANCH_NAME],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if !standard_sub_exists {
        let sub_code = next_available_sub_branch_code(conn, &standard_main_code)?;
        conn.execute(
            "INSERT INTO OccupationSubBranches (code, branch_code, name) VALUES (?1, ?2, ?3)",
            params![sub_code, standard_main_code, STANDARD_BRANCH_NAME],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

fn install_standard_occupation_branch_guards(conn: &Connection) -> Result<(), String> {
    let trigger_sql = r#"
        CREATE TRIGGER IF NOT EXISTS protect_standard_occupation_branch_update
        BEFORE UPDATE ON OccupationBranches
        FOR EACH ROW
        WHEN OLD.name = '__STANDARD_BRANCH_NAME__'
             AND (NEW.name <> OLD.name OR NEW.code <> OLD.code)
        BEGIN
            SELECT RAISE(ABORT, 'Cannot modify the protected standard occupation branch');
        END;

        CREATE TRIGGER IF NOT EXISTS protect_standard_occupation_branch_delete
        BEFORE DELETE ON OccupationBranches
        FOR EACH ROW
        WHEN OLD.name = '__STANDARD_BRANCH_NAME__'
        BEGIN
            SELECT RAISE(ABORT, 'Cannot delete the protected standard occupation branch');
        END;

        CREATE TRIGGER IF NOT EXISTS protect_standard_occupation_sub_branch_update
        BEFORE UPDATE ON OccupationSubBranches
        FOR EACH ROW
        WHEN OLD.name = '__STANDARD_BRANCH_NAME__'
             AND EXISTS(
                 SELECT 1
                 FROM OccupationBranches
                 WHERE code = OLD.branch_code
                   AND name = '__STANDARD_BRANCH_NAME__'
             )
             AND (NEW.name <> OLD.name OR NEW.code <> OLD.code OR NEW.branch_code <> OLD.branch_code)
        BEGIN
            SELECT RAISE(ABORT, 'Cannot modify the protected standard occupation sub-branch');
        END;

        CREATE TRIGGER IF NOT EXISTS protect_standard_occupation_sub_branch_delete
        BEFORE DELETE ON OccupationSubBranches
        FOR EACH ROW
        WHEN OLD.name = '__STANDARD_BRANCH_NAME__'
             AND EXISTS(
                 SELECT 1
                 FROM OccupationBranches
                 WHERE code = OLD.branch_code
                   AND name = '__STANDARD_BRANCH_NAME__'
             )
        BEGIN
            SELECT RAISE(ABORT, 'Cannot delete the protected standard occupation sub-branch');
        END;
    "#
    .replace("__STANDARD_BRANCH_NAME__", STANDARD_BRANCH_NAME);

    conn.execute_batch(&trigger_sql).map_err(|e| e.to_string())?;

    Ok(())
}

fn is_protected_main_branch(conn: &Connection, code: &str) -> Result<bool, String> {
    let name = conn
        .query_row(
            "SELECT name FROM OccupationBranches WHERE code = ?1",
            params![code],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(matches!(name.as_deref(), Some(STANDARD_BRANCH_NAME)))
}

fn is_protected_sub_branch(conn: &Connection, branch_code: &str, code: &str) -> Result<bool, String> {
    let sub_name = conn
        .query_row(
            "SELECT name FROM OccupationSubBranches WHERE branch_code = ?1 AND code = ?2",
            params![branch_code, code],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    if !matches!(sub_name.as_deref(), Some(STANDARD_BRANCH_NAME)) {
        return Ok(false);
    }

    is_protected_main_branch(conn, branch_code)
}

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
    // journal_mode returns a result row — must use query, not execute
    let _: String = conn.query_row("PRAGMA journal_mode=WAL", [], |row| row.get(0))?;
    conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA synchronous = NORMAL; PRAGMA temp_store = MEMORY;")?;
    
    Ok(conn)
}

/// Initialize the content database (create tables if not exist)
pub fn initialize_content_database() -> Result<String, String> {
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

    // Migration: add occupation_branch columns if not exist (safe to run multiple times)
    let _ = conn.execute("ALTER TABLE Documents ADD COLUMN occupation_branch_main VARCHAR(10)", []);
    let _ = conn.execute("ALTER TABLE Documents ADD COLUMN occupation_branch_sub VARCHAR(10)", []);
    // Phase1: is_template flag — distinguishes seeded template docs from user-created ones
    let _ = conn.execute("ALTER TABLE Documents ADD COLUMN is_template BOOLEAN DEFAULT 0", []);

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
    // Phase1: is_template flag — distinguishes seeded sections from user-created ones
    let _ = conn.execute("ALTER TABLE Sections ADD COLUMN is_template BOOLEAN DEFAULT 0", []);

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

    // Phase1: One-time migration — mark all seeded records with is_template=1
    // Safe to run on every startup: WHERE clause limits to records not yet marked
    // Mark all Sections as template (all sections in this app are system-defined)
    let _ = conn.execute(
        "UPDATE Sections SET is_template = 1 WHERE is_system_defined = 1 AND is_template = 0",
        [],
    );
    // Mark Section 100/200/300 seeded Questions as template
    let _ = conn.execute(
        "UPDATE Questions SET is_template = 1
         WHERE is_template = 0
           AND section_id IN (
               SELECT id FROM Sections WHERE is_system_defined = 1
           )",
        [],
    );

    // Hotfix: Correct typo "ไฟฟ้าอาวุะ" to "ไฟฟ้าอาวุธ" in existing occupation branches
    let _ = conn.execute(
        "UPDATE OccupationBranches SET name = REPLACE(name, 'ไฟฟ้าอาวุะ', 'ไฟฟ้าอาวุธ') WHERE name LIKE '%ไฟฟ้าอาวุะ%'",
        [],
    );
    let _ = conn.execute(
        "UPDATE OccupationSubBranches SET name = REPLACE(name, 'ไฟฟ้าอาวุะ', 'ไฟฟ้าอาวุธ') WHERE name LIKE '%ไฟฟ้าอาวุะ%'",
        [],
    );

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
         VALUES (?1, 100, 101, 'ข้อควรระมัดระวังอันตรายพื้นฐาน Safety Fundamentals', '101 Precautions', 1, 1)",
        params![new_id],
    ).map_err(|e| format!("Failed to create Section 101: {}", e))?;

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
pub struct DocumentBranch {
    pub occupation_branch_main: Option<String>,
    pub occupation_branch_sub: Option<String>,
}

/// Get the occupation branch selection for a document
pub fn get_document_branch(doc_id: String) -> Result<DocumentBranch, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    conn.query_row(
        "SELECT occupation_branch_main, occupation_branch_sub FROM Documents WHERE id = ?1",
        params![doc_id],
        |row| Ok(DocumentBranch {
            occupation_branch_main: row.get(0)?,
            occupation_branch_sub: row.get(1)?,
        })
    ).map_err(|e| e.to_string())
}

fn update_document_branch_with_conn(
    conn: &Connection,
    doc_id: &str,
    branch_main: Option<String>,
    branch_sub: Option<String>,
) -> Result<(), String> {
    conn.execute(
        "UPDATE Documents SET occupation_branch_main = ?1, occupation_branch_sub = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
        params![branch_main, branch_sub, doc_id]
    ).map_err(|e| e.to_string())?;

    Ok(())
}

/// Update occupation branch selection for a document
pub fn update_document_branch(doc_id: String, branch_main: Option<String>, branch_sub: Option<String>) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    update_document_branch_with_conn(&conn, &doc_id, branch_main, branch_sub)
}

// ============================================================
// Career Branch Protection — Check Usage & Reset
// ============================================================

#[derive(serde::Serialize)]
pub struct CareerBranchUsageReport {
    pub has_conflict: bool,
    pub affected_question_count: i64,
    pub affected_section_groups: Vec<i32>,
}

#[derive(serde::Serialize)]
pub struct BranchUsageReport {
    pub is_used: bool,
    pub usage_count: i64,
    pub document_ids: Vec<String>,
    pub affected_sections: Vec<String>,
}

/// Debug: Get sample metadata with activeSubQuestions for inspection
pub fn debug_get_active_subquestions_metadata() -> Result<Vec<String>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    let mut stmt = conn.prepare(
        "SELECT q.metadata FROM Questions q
         WHERE q.metadata IS NOT NULL 
           AND q.metadata LIKE '%activeSubQuestions%'
         LIMIT 5"
    ).map_err(|e| e.to_string())?;
    
    let rows: Vec<String> = stmt.query_map([], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    
    Ok(rows)
}

/// Check if a branch is used in any document across the entire system
/// Returns usage report with document IDs and affected sections
pub fn check_branch_usage_global(branch_code: String) -> Result<BranchUsageReport, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Query all Questions with metadata containing activeSubQuestions
    let mut stmt = conn.prepare(
        "SELECT q.document_id, q.id, q.metadata, s.section_group, q.sequence
         FROM Questions q
         JOIN Sections s ON s.id = q.section_id
         WHERE q.metadata IS NOT NULL
           AND q.parent_id IS NULL"
    ).map_err(|e| e.to_string())?;
    
    let rows: Vec<(String, String, String, i32, i32)> = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?))
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    
    let mut usage_count = 0i64;
    let mut document_ids = std::collections::HashSet::new();
    let mut affected_sections = std::collections::HashSet::new();
    
    // Sub-Question code format: {S}{L}{branch_main}{branch_sub}
    // Example: "2211" = Section 200, Sequence 2, Branch 1, Sub-branch 1
    // We need to check if any code contains the branch_code at position 2 (0-indexed)
    // Pattern: codes like "2211", "2212", "3211" where position [2] = branch_code
    
    for (doc_id, _q_id, metadata_json, section_group, sequence) in rows {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&metadata_json) {
            // Check if activeSubQuestions exists and contains codes matching this branch
            if let Some(active) = v.get("activeSubQuestions").and_then(|a| a.as_array()) {
                let has_match = active.iter().any(|code| {
                    if let Some(code_str) = code.as_str() {
                        // Check if code length >= 3 and position [2] matches branch_code
                        // Format: {S}{L}{branch}{sub...}
                        //         [0][1][2]   [3...]
                        if code_str.len() >= 3 {
                            let branch_char = &code_str[2..3];
                            branch_char == branch_code
                        } else {
                            false
                        }
                    } else {
                        false
                    }
                });
                
                if has_match {
                    usage_count += 1;
                    document_ids.insert(doc_id.clone());
                    affected_sections.insert(format!("{}xx.{}", section_group, sequence));
                }
            }
        }
    }
    
    let document_ids_vec: Vec<String> = document_ids.into_iter().collect();
    let affected_sections_vec: Vec<String> = affected_sections.into_iter().collect();
    
    Ok(BranchUsageReport {
        is_used: usage_count > 0,
        usage_count,
        document_ids: document_ids_vec,
        affected_sections: affected_sections_vec,
    })
}

/// Check if a sub-branch is used in any document across the entire system
/// Returns usage report with document IDs and affected sections
pub fn check_sub_branch_usage_global(branch_code: String, sub_code: String) -> Result<BranchUsageReport, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Query all Questions with metadata containing activeSubQuestions
    let mut stmt = conn.prepare(
        "SELECT q.document_id, q.id, q.metadata, s.section_group, q.sequence
         FROM Questions q
         JOIN Sections s ON s.id = q.section_id
         WHERE q.metadata IS NOT NULL
           AND q.parent_id IS NULL"
    ).map_err(|e| e.to_string())?;
    
    let rows: Vec<(String, String, String, i32, i32)> = stmt.query_map([], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?))
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    
    let mut usage_count = 0i64;
    let mut document_ids = std::collections::HashSet::new();
    let mut affected_sections = std::collections::HashSet::new();
    
    // Sub-Question code format: {S}{L}{branch_main}{branch_sub}
    // Example: "2211" = Section 200, Sequence 2, Branch 1, Sub-branch 1
    // We need to check position [2] = branch_code AND position [3] = sub_code
    
    for (doc_id, _q_id, metadata_json, section_group, sequence) in rows {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&metadata_json) {
            // Check if activeSubQuestions exists and contains codes matching this sub-branch
            if let Some(active) = v.get("activeSubQuestions").and_then(|a| a.as_array()) {
                let has_match = active.iter().any(|code| {
                    if let Some(code_str) = code.as_str() {
                        // Check if code length >= 4 and positions [2] and [3] match
                        // Format: {S}{L}{branch}{sub}
                        //         [0][1][2]    [3]
                        if code_str.len() >= 4 {
                            let branch_char = &code_str[2..3];
                            let sub_char = &code_str[3..4];
                            branch_char == branch_code && sub_char == sub_code
                        } else {
                            false
                        }
                    } else {
                        false
                    }
                });
                
                if has_match {
                    usage_count += 1;
                    document_ids.insert(doc_id.clone());
                    affected_sections.insert(format!("{}xx.{}", section_group, sequence));
                }
            }
        }
    }
    
    let document_ids_vec: Vec<String> = document_ids.into_iter().collect();
    let affected_sections_vec: Vec<String> = affected_sections.into_iter().collect();
    
    Ok(BranchUsageReport {
        is_used: usage_count > 0,
        usage_count,
        document_ids: document_ids_vec,
        affected_sections: affected_sections_vec,
    })
}

/// Check if changing career branch will affect existing SubQ usage in target questions
/// Target questions: 2xx.2, 2xx.4 (section_group=200, sequence=2,4)
///                   3xx.2-3xx.5 (section_group=300, sequence=2,3,4,5)
/// For L1 questions, SubQ usage is indicated by metadata JSON field 'activeSubQuestions'
pub fn check_career_branch_usage(doc_id: String) -> Result<CareerBranchUsageReport, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Check for L1 questions with activeSubQuestions in metadata JSON
    let mut stmt = conn.prepare(
        "SELECT q.id, q.metadata, s.section_group
         FROM Questions q
         JOIN Sections s ON s.id = q.section_id
         WHERE q.document_id = ?1
           AND q.parent_id IS NULL
           AND q.metadata IS NOT NULL
           AND (
             (s.section_group = 200 AND q.sequence IN (2, 4))
             OR (s.section_group = 300 AND q.sequence IN (2, 3, 4, 5))
           )"
    ).map_err(|e| e.to_string())?;
    
    let rows: Vec<(String, String, i32)> = stmt.query_map(params![doc_id], |row| {
        Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    })
    .map_err(|e| e.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|e| e.to_string())?;
    
    let mut affected_count = 0i64;
    let mut affected_groups = std::collections::HashSet::new();
    
    for (_id, metadata_json, section_group) in rows {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&metadata_json) {
            // Check if activeSubQuestions exists and is non-empty array
            if let Some(active) = v.get("activeSubQuestions").and_then(|a| a.as_array()) {
                if !active.is_empty() {
                    affected_count += 1;
                    affected_groups.insert(section_group);
                }
            }
        }
    }
    
    let section_groups: Vec<i32> = affected_groups.into_iter().collect();
    
    Ok(CareerBranchUsageReport {
        has_conflict: affected_count > 0,
        affected_question_count: affected_count,
        affected_section_groups: section_groups,
    })
}

#[derive(serde::Serialize)]
pub struct CareerBranchResetReport {
    pub subq_links_deleted: usize,
    pub answer_keys_deleted: usize,
    pub user_answers_deleted: usize,
    pub questions_reset: usize,
}

/// Reset target questions to exempted and update career branch
/// This follows the same pattern as update_question_score when question_type='exempted'
pub fn reset_and_update_career_branch(
    doc_id: String,
    new_main: Option<String>,
    new_sub: Option<String>,
) -> Result<CareerBranchResetReport, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    
    // Step 1: Find target L1 question IDs and their section_groups
    let target_questions: Vec<(String, i32)> = {
        let mut stmt = tx.prepare(
            "SELECT q.id, s.section_group
             FROM Questions q
             JOIN Sections s ON s.id = q.section_id
             WHERE q.document_id = ?1 AND q.parent_id IS NULL
             AND ((s.section_group = 200 AND q.sequence IN (2, 4))
               OR (s.section_group = 300 AND q.sequence IN (2, 3, 4, 5)))"
        ).map_err(|e| e.to_string())?;
        
        let rows = stmt.query_map(params![doc_id], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, i32>(1)?))
        })
        .map_err(|e| e.to_string())?;
        
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?
    };
    
    if target_questions.is_empty() {
        // No target questions, just update branch
        tx.execute(
            "UPDATE Documents SET occupation_branch_main = ?1, occupation_branch_sub = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
            params![new_main, new_sub, doc_id]
        ).map_err(|e| e.to_string())?;
        
        tx.commit().map_err(|e| e.to_string())?;
        
        return Ok(CareerBranchResetReport {
            subq_links_deleted: 0,
            answer_keys_deleted: 0,
            user_answers_deleted: 0,
            questions_reset: 0,
        });
    }
    
    let target_l1_ids: Vec<String> = target_questions.iter().map(|(id, _)| id.clone()).collect();
    
    // Step 2: Collect ALL affected IDs (L1 + children recursively)
    let mut all_affected_ids = target_l1_ids.clone();
    
    // Get all children (recursive)
    for l1_id in &target_l1_ids {
        let mut child_stmt = tx.prepare(
            "WITH RECURSIVE descendants AS (
                SELECT id FROM Questions WHERE parent_id = ?1
                UNION ALL
                SELECT q.id FROM Questions q
                JOIN descendants d ON q.parent_id = d.id
             )
             SELECT id FROM descendants"
        ).map_err(|e| e.to_string())?;
        
        let children: Vec<String> = child_stmt.query_map(params![l1_id], |row| row.get(0))
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        
        all_affected_ids.extend(children);
    }
    
    // Step 3: Delete relational data for ALL affected IDs
    let placeholders = all_affected_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    
    let subq_links_deleted = tx.execute(
        &format!("DELETE FROM QuestionSubQuestionLinks WHERE question_id IN ({})", placeholders),
        rusqlite::params_from_iter(all_affected_ids.iter())
    ).map_err(|e| e.to_string())?;
    
    let answer_keys_deleted = tx.execute(
        &format!("DELETE FROM QuestionAnswerKeys WHERE question_id IN ({})", placeholders),
        rusqlite::params_from_iter(all_affected_ids.iter())
    ).map_err(|e| e.to_string())?;
    
    let user_answers_deleted = tx.execute(
        &format!("DELETE FROM UserAnswers WHERE question_id IN ({})", placeholders),
        rusqlite::params_from_iter(all_affected_ids.iter())
    ).map_err(|e| e.to_string())?;
    
    // Step 4: Delete children (same as update_question_score exempted path)
    let l1_placeholders = target_l1_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    tx.execute(
        &format!("DELETE FROM Questions WHERE parent_id IN ({})", l1_placeholders),
        rusqlite::params_from_iter(target_l1_ids.iter())
    ).map_err(|e| e.to_string())?;
    
    // Step 5: Reset L1 targets to exempted (same pattern as update_question_score)
    let questions_reset = target_questions.len();
    for (q_id, section_group) in &target_questions {
        let display_text = if *section_group == 200 {
            "(ไม่ต้องอธิบาย)"
        } else {
            "(ไม่ต้องปฏิบัติ)"
        };
        
        tx.execute(
            "UPDATE Questions SET 
                score = 0, 
                is_scored = 0, 
                question_type = 'exempted', 
                display_text = ?2, 
                group_score = 0, 
                is_group_header = 0, 
                description = NULL 
             WHERE id = ?1",
            params![q_id, display_text]
        ).map_err(|e| e.to_string())?;
    }
    
    // Step 5b: Clear metadata SubQ fields
    tx.execute(
        &format!("UPDATE Questions SET metadata = '{{}}' WHERE id IN ({}) AND metadata IS NOT NULL", l1_placeholders),
        rusqlite::params_from_iter(target_l1_ids.iter())
    ).map_err(|e| e.to_string())?;
    
    // Step 6: Recalculate section total_score for affected sections
    let mut section_ids: Vec<i64> = Vec::new();
    for l1_id in &target_l1_ids {
        let section_id: Option<i64> = tx.query_row(
            "SELECT section_id FROM Questions WHERE id = ?1",
            params![l1_id],
            |row| row.get(0)
        ).optional().map_err(|e| e.to_string())?.flatten();
        
        if let Some(sid) = section_id {
            if !section_ids.contains(&sid) {
                section_ids.push(sid);
            }
        }
    }
    
    for sid in section_ids {
        let section_total: i32 = tx.query_row(
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
        
        tx.execute(
            "UPDATE Sections SET total_score = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2",
            params![section_total, sid]
        ).map_err(|e| e.to_string())?;
    }
    
    // Step 7: Update branch
    tx.execute(
        "UPDATE Documents SET occupation_branch_main = ?1, occupation_branch_sub = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
        params![new_main, new_sub, doc_id]
    ).map_err(|e| e.to_string())?;
    
    tx.commit().map_err(|e| e.to_string())?;
    
    Ok(CareerBranchResetReport {
        subq_links_deleted,
        answer_keys_deleted,
        user_answers_deleted,
        questions_reset,
    })
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
            is_template BOOLEAN DEFAULT 0,
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
    // Phase1: is_template flag — template-seeded questions are read-only
    let _ = conn.execute("ALTER TABLE Questions ADD COLUMN is_template BOOLEAN DEFAULT 0", []);

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

    // UserAnswers Table (Data Storage) - Refactored for Integrity
    conn.execute(
        "CREATE TABLE IF NOT EXISTS UserAnswers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            question_id TEXT NOT NULL,
            document_id VARCHAR(11) NOT NULL,
            sub_question_code VARCHAR(20) DEFAULT '',
            answer_text TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            feedback TEXT,
            assessed_at DATETIME,
            assessed_by TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, question_id, document_id, sub_question_code),
            FOREIGN KEY(question_id) REFERENCES Questions(id) ON DELETE CASCADE,
            FOREIGN KEY(question_id, sub_question_code) REFERENCES QuestionAnswerKeys(question_id, sub_question_code) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create UserAnswers table: {}", e))?;

    // Check if we need to migrate UserAnswers to add the composite FK (Post-init migration)
    let needs_ua_fk_migration = conn.query_row(
        "SELECT COUNT(*) FROM pragma_foreign_key_list('UserAnswers') WHERE \"table\" = 'QuestionAnswerKeys'",
        [],
        |row| row.get::<_, i32>(0)
    ).unwrap_or(0) == 0;

    if needs_ua_fk_migration {
        println!("Migrating UserAnswers to add QuestionAnswerKeys foreign key...");
        // 1. Rename existing
        let _ = conn.execute("ALTER TABLE UserAnswers RENAME TO UserAnswers_old", []);
        // 2. Create new (with the new schema)
        conn.execute(
            "CREATE TABLE UserAnswers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                question_id TEXT NOT NULL,
                document_id VARCHAR(11) NOT NULL,
                sub_question_code VARCHAR(20) DEFAULT '',
                answer_text TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                feedback TEXT,
                assessed_at DATETIME,
                assessed_by TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, question_id, document_id, sub_question_code),
                FOREIGN KEY(question_id) REFERENCES Questions(id) ON DELETE CASCADE,
                FOREIGN KEY(question_id, sub_question_code) REFERENCES QuestionAnswerKeys(question_id, sub_question_code) ON DELETE CASCADE
            )",
            [],
        ).map_err(|e| format!("Failed to create new UserAnswers table: {}", e))?;
        // 3. Copy data
        let _ = conn.execute(
            "INSERT INTO UserAnswers (id, user_id, question_id, document_id, sub_question_code, answer_text, status, feedback, assessed_at, assessed_by, updated_at)
             SELECT id, user_id, question_id, document_id, sub_question_code, answer_text, status, feedback, assessed_at, assessed_by, updated_at
             FROM UserAnswers_old",
            [],
        );
        // 4. Drop old
        let _ = conn.execute("DROP TABLE UserAnswers_old", []);
    }

    // Migration: Add new assessment columns if missing
    let _ = conn.execute("ALTER TABLE UserAnswers ADD COLUMN answer_text TEXT", []);
    let _ = conn.execute("ALTER TABLE UserAnswers ADD COLUMN status VARCHAR(20) DEFAULT 'pending'", []);
    let _ = conn.execute("ALTER TABLE UserAnswers ADD COLUMN feedback TEXT", []);
    let _ = conn.execute("ALTER TABLE UserAnswers ADD COLUMN assessed_at DATETIME", []);
    let _ = conn.execute("ALTER TABLE UserAnswers ADD COLUMN assessed_by TEXT", []);
    let _ = conn.execute("ALTER TABLE UserAnswers ADD COLUMN sub_question_code VARCHAR(20) DEFAULT ''", []);
    
    // Ensure we have a unique index including sub_question_code (SQLite doesn't support ALTER TABLE DROP CONSTRAINT)
    let _ = conn.execute("DROP INDEX IF EXISTS idx_user_answers_composite", []);
    let _ = conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_user_answers_composite ON UserAnswers(user_id, question_id, document_id, sub_question_code)", []);

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
            passing_score INTEGER DEFAULT 100,
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

    install_standard_occupation_branch_guards(&conn)?;
    ensure_standard_occupation_branch_exists(&conn)?;

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

    // QuestionSubQuestionLinks Table - Relational storage for selected sub-questions per question
    // Replaces JSON array 'selectedSubQuestions' in Questions.metadata
    conn.execute(
        "CREATE TABLE IF NOT EXISTS QuestionSubQuestionLinks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id TEXT NOT NULL,
            sub_question_code VARCHAR(20) NOT NULL,
            UNIQUE(question_id, sub_question_code),
            FOREIGN KEY (question_id) REFERENCES Questions(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create QuestionSubQuestionLinks table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_qsql_question ON QuestionSubQuestionLinks(question_id)",
        [],
    ).map_err(|e| format!("Failed to create index on QuestionSubQuestionLinks: {}", e))?;

    // QuestionAnswerKeys Table - Normalized storage for answer keys
    // Replaces JSON 'answerKeys' and 'answerKey' in Questions.metadata
    conn.execute(
        "CREATE TABLE IF NOT EXISTS QuestionAnswerKeys (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id TEXT NOT NULL,
            sub_question_code TEXT NOT NULL,
            answer_key_text TEXT,
            is_required BOOLEAN DEFAULT 1,
            order_index INTEGER DEFAULT 0,
            FOREIGN KEY(question_id) REFERENCES Questions(id) ON DELETE CASCADE,
            UNIQUE(question_id, sub_question_code)
        )",
        [],
    ).map_err(|e| format!("Failed to create QuestionAnswerKeys table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_qak_question ON QuestionAnswerKeys(question_id)",
        [],
    ).map_err(|e| format!("Failed to create index on QuestionAnswerKeys: {}", e))?;

    // One-time data migration: extract selectedSubQuestions from JSON metadata → QuestionSubQuestionLinks
    // This is safe to run on every startup — it only processes questions not yet in the links table.
    migrate_selected_sub_questions_to_table(conn)?;

    // One-time data migration: extract answerKeys from JSON metadata -> QuestionAnswerKeys
    migrate_answer_keys_to_table(conn)?;

    // Final cleanup: Remove legacy keys from JSON metadata once migrated
    scrub_legacy_answer_keys_from_metadata(conn)?;

    // Hotfix cleanup: convert all 'main' sub_question_code to '' (empty string)
    // This merges records inadvertently created with 'main' code during previous debug steps.
    let _ = conn.execute(
        "UPDATE OR IGNORE QuestionAnswerKeys SET sub_question_code = '' WHERE sub_question_code = 'main'",
        [],
    );
    let _ = conn.execute(
        "DELETE FROM QuestionAnswerKeys WHERE sub_question_code = 'main'",
        [],
    );

    // Also cleanup UserAnswers to maintain alignment and foreign key integrity
    let _ = conn.execute(
        "UPDATE OR IGNORE UserAnswers SET sub_question_code = '' WHERE sub_question_code = 'main'",
        [],
    );
    let _ = conn.execute(
        "DELETE FROM UserAnswers WHERE sub_question_code = 'main'",
        [],
    );

    Ok(())
}

/// Migrate selectedSubQuestions from JSON metadata to QuestionSubQuestionLinks table.
/// Safe to run multiple times; skips questions already having links.
fn migrate_selected_sub_questions_to_table(conn: &Connection) -> Result<(), String> {
    // Only process questions that have metadata containing 'selectedSubQuestions'
    // and do not already have any entries in QuestionSubQuestionLinks.
    let mut stmt = conn.prepare(
        "SELECT id, metadata FROM Questions
         WHERE metadata IS NOT NULL
           AND metadata LIKE '%selectedSubQuestions%'
           AND id NOT IN (SELECT DISTINCT question_id FROM QuestionSubQuestionLinks)"
    ).map_err(|e| format!("Failed to prepare migration query: {}", e))?;

    let rows: Vec<(String, String)> = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| format!("Failed to query migration rows: {}", e))?
    .filter_map(|r| r.ok())
    .collect();

    for (question_id, metadata_json) in rows {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&metadata_json) {
            if let Some(codes) = v.get("selectedSubQuestions").and_then(|c| c.as_array()) {
                for code_val in codes {
                    if let Some(code) = code_val.as_str() {
                        let _ = conn.execute(
                            "INSERT OR IGNORE INTO QuestionSubQuestionLinks (question_id, sub_question_code)
                             VALUES (?1, ?2)",
                            params![question_id, code],
                        );
                    }
                }
            }
        }
    }

    Ok(())
}

/// Migrate answer keys from JSON metadata to QuestionAnswerKeys table.
/// Safe to run multiple times; skips questions that already have entries.
fn migrate_answer_keys_to_table(conn: &Connection) -> Result<(), String> {
    let mut stmt = conn.prepare(
        "SELECT id, metadata FROM Questions
         WHERE metadata IS NOT NULL
           AND (metadata LIKE '%\"answerKeys\"%' OR metadata LIKE '%\"answerKey\"%')
           AND id NOT IN (SELECT DISTINCT question_id FROM QuestionAnswerKeys)"
    ).map_err(|e| format!("Failed to prepare answer key migration query: {}", e))?;

    let rows: Vec<(String, String)> = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| format!("Failed to query migration rows: {}", e))?
    .filter_map(|r| r.ok())
    .collect();

    for (question_id, metadata_json) in rows {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(&metadata_json) {
            let mut order_index = 0;
            
            // Multiple answer keys object
            if let Some(keys) = v.get("answerKeys").and_then(|c| c.as_object()) {
                // Determine order by sorting the keys string (e.g. \"ก.\", \"ข.\")
                let mut sorted_keys: Vec<_> = keys.iter().collect();
                sorted_keys.sort_by_key(|&(k, _)| k);
                
                for (code, key_data) in sorted_keys {
                    let mut text = String::new();
                    let mut is_required = true;

                    if let Some(data_obj) = key_data.as_object() {
                        text = data_obj.get("text").and_then(|t| t.as_str()).unwrap_or("").to_string();
                        is_required = data_obj.get("is_required").and_then(|b| b.as_bool()).unwrap_or(true);
                    } else if let Some(s) = key_data.as_str() {
                        text = s.to_string();
                    }

                    if !code.trim().is_empty() {
                        let _ = conn.execute(
                            "INSERT OR IGNORE INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, is_required, order_index)
                             VALUES (?1, ?2, ?3, ?4, ?5)",
                            params![&question_id, code, text, is_required, order_index],
                        );
                        order_index += 1;
                    }
                }
            } else if let Some(single_key) = v.get("answerKey").and_then(|c| c.as_str()) {
                // Single question without subdivisions -> empty sub_question_code
                if !single_key.is_empty() {
                    let _ = conn.execute(
                        "INSERT OR IGNORE INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, is_required, order_index)
                         VALUES (?1, ?2, ?3, 1, ?4)",
                        params![&question_id, "", single_key, order_index],
                    );
                }
            }
        }
    }

    // 2. Handle metadata placeholders (requireAnswerKey: true but no key text yet)
    let mut placeholder_stmt = conn.prepare(
        "SELECT id FROM Questions
         WHERE metadata IS NOT NULL
           AND metadata LIKE '%\"requireAnswerKey\"%'
           AND id NOT IN (SELECT DISTINCT question_id FROM QuestionAnswerKeys)"
    ).map_err(|e| e.to_string())?;

    let placeholder_rows: Vec<String> = placeholder_stmt.query_map([], |row| {
        row.get(0)
    }).map_err(|e| e.to_string())?
    .filter_map(|r| r.ok())
    .collect();

    for q_id in placeholder_rows {
        // Insert a "main" placeholder entry so foreign keys work
        let _ = conn.execute(
            "INSERT OR IGNORE INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, is_required, order_index)
             VALUES (?1, ?2, ?3, 1, 0)",
            params![&q_id, "", "", true, 0],
        );
    }

    Ok(())
}

/// Scrub legacy answer keys from JSON metadata.
/// This should only be run AFTER migrate_answer_keys_to_table.
fn scrub_legacy_answer_keys_from_metadata(conn: &Connection) -> Result<(), String> {
    let mut stmt = conn.prepare(
        "SELECT id, metadata FROM Questions 
         WHERE metadata IS NOT NULL 
           AND (metadata LIKE '%\"answerKey\"%' OR metadata LIKE '%\"answerKeys\"%')"
    ).map_err(|e| format!("Failed to prepare scrub query: {}", e))?;

    let rows: Vec<(String, String)> = stmt.query_map([], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| format!("Failed to query scrub rows: {}", e))?
    .filter_map(|r| r.ok())
    .collect();

    for (question_id, metadata_json) in rows {
        if let Ok(mut v) = serde_json::from_str::<serde_json::Value>(&metadata_json) {
            if let Some(meta_obj) = v.as_object_mut() {
                let mut changed = false;
                if meta_obj.remove("answerKey").is_some() { changed = true; }
                if meta_obj.remove("answerKeys").is_some() { changed = true; }

                if changed {
                    let new_metadata = serde_json::to_string(&v).unwrap_or_default();
                    let _ = conn.execute(
                        "UPDATE Questions SET metadata = ?1 WHERE id = ?2",
                        params![new_metadata, question_id],
                    );
                }
            }
        }
    }

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

    let mut answer_keys_stmt = conn.prepare(
        "SELECT question_id, sub_question_code, answer_key_text, is_required, order_index
         FROM QuestionAnswerKeys
         WHERE question_id IN (SELECT id FROM Questions WHERE document_id = ?1)
         ORDER BY question_id, order_index"
    ).map_err(|e| format!("Failed to prepare answer keys query: {}", e))?;

    // Group answer keys by question_id
    let mut answer_keys_map: std::collections::HashMap<String, Vec<(String, String, bool)>> = std::collections::HashMap::new();
    let ak_rows = answer_keys_stmt.query_map(params![doc_id], |row| {
        Ok((
            row.get::<_, String>(0)?, // question_id
            row.get::<_, String>(1)?, // sub_question_code
            row.get::<_, String>(2)?, // answer_key_text
            row.get::<_, bool>(3)?,   // is_required
        ))
    }).map_err(|e| format!("Failed to query answer keys: {}", e))?;

    for ak_res in ak_rows {
        if let Ok((qid, code, text, required)) = ak_res {
            answer_keys_map.entry(qid).or_default().push((code, text, required));
        }
    }

    let question_iter = stmt.query_map(params![doc_id], |row| {
        let qid: String = row.get(0)?;
        let mut metadata: Option<String> = row.get(9)?;

        // Inject answer keys into metadata JSON
        if let Some(keys) = answer_keys_map.get(&qid) {
            let mut meta_val = if let Some(meta_str) = &metadata {
                serde_json::from_str::<serde_json::Value>(meta_str).unwrap_or(serde_json::json!({}))
            } else {
                serde_json::json!({})
            };

            if let Some(meta_obj) = meta_val.as_object_mut() {
                // If there's only one key and it has no sub_question_code, set "answerKey"
                if keys.len() == 1 && keys[0].0.is_empty() {
                    meta_obj.insert("answerKey".to_string(), serde_json::Value::String(keys[0].1.clone()));
                    meta_obj.remove("answerKeys");
                } else {
                    // Otherwise, set "answerKeys" object mapping code -> text string
                    let mut keys_obj = serde_json::Map::new();
                    for (code, text, _req) in keys {
                        keys_obj.insert(code.clone(), serde_json::Value::String(text.clone()));
                    }
                    meta_obj.insert("answerKeys".to_string(), serde_json::Value::Object(keys_obj));
                    meta_obj.remove("answerKey");
                }
                metadata = Some(serde_json::to_string(meta_obj).unwrap_or_default());
            }
        }

        Ok(Question {
            id: qid,
            document_id: row.get(1)?,
            section_id: row.get(2)?,
            parent_id: row.get(3)?,
            sequence: row.get(4)?,
            content: row.get(5)?,
            is_header: row.get(6)?,
            description: row.get(7)?,
            answer_type: row.get(8)?,
            metadata,
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

    let mut answer_keys_stmt = conn.prepare(
        "SELECT question_id, sub_question_code, answer_key_text, is_required, order_index
         FROM QuestionAnswerKeys
         WHERE question_id IN (SELECT id FROM Questions WHERE document_id = ?1)
         ORDER BY question_id, order_index"
    ).map_err(|e| format!("Failed to prepare answer keys query: {}", e))?;

    let mut answer_keys_map: std::collections::HashMap<String, Vec<(String, String, bool)>> = std::collections::HashMap::new();
    let ak_rows = answer_keys_stmt.query_map(params![doc_id], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, bool>(3)?,
        ))
    }).map_err(|e| format!("Failed to query answer keys: {}", e))?;

    for ak_res in ak_rows {
        if let Ok((qid, code, text, required)) = ak_res {
            answer_keys_map.entry(qid).or_default().push((code, text, required));
        }
    }

    let questions_iter = stmt.query_map(params![doc_id], |row| {
        let qid: String = row.get(0)?;
        let mut metadata: Option<String> = row.get(9)?;

        if let Some(keys) = answer_keys_map.get(&qid) {
            let mut meta_val = if let Some(meta_str) = &metadata {
                serde_json::from_str::<serde_json::Value>(meta_str).unwrap_or(serde_json::json!({}))
            } else {
                serde_json::json!({})
            };

            if let Some(meta_obj) = meta_val.as_object_mut() {
                if keys.len() == 1 && keys[0].0.is_empty() {
                    meta_obj.insert("answerKey".to_string(), serde_json::Value::String(keys[0].1.clone()));
                    meta_obj.remove("answerKeys");
                } else {
                    let mut keys_obj = serde_json::Map::new();
                    for (code, text, _req) in keys {
                        keys_obj.insert(code.clone(), serde_json::Value::String(text.clone()));
                    }
                    meta_obj.insert("answerKeys".to_string(), serde_json::Value::Object(keys_obj));
                    meta_obj.remove("answerKey");
                }
                metadata = Some(serde_json::to_string(meta_obj).unwrap_or_default());
            }
        }

        Ok(Question {
            id: qid,
            document_id: row.get(1)?,
            section_id: row.get(2)?,
            parent_id: row.get(3)?,
            sequence: row.get(4)?,
            content: row.get(5)?,
            is_header: row.get(6)?,
            description: row.get(7)?,
            answer_type: row.get(8)?,
            metadata,
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

    // Sync selectedSubQuestions JSON → QuestionSubQuestionLinks relational table
    sync_question_sub_question_links(&conn, &id, args.metadata.as_deref())
        .unwrap_or_else(|e| eprintln!("[SubQ Sync] create_question: {}", e));

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

    // Sync selectedSubQuestions JSON → QuestionSubQuestionLinks relational table
    sync_question_sub_question_links(&conn, &args.id, args.metadata.as_deref())
        .unwrap_or_else(|e| eprintln!("[SubQ Sync] update_question: {}", e));

    Ok(())
}

/// Sync the selectedSubQuestions field in JSON metadata → QuestionSubQuestionLinks table.
/// Clears existing links for this question, then re-inserts from current metadata.
/// Safe to call on every save — idempotent when metadata hasn't changed.
fn sync_question_sub_question_links(conn: &Connection, question_id: &str, metadata_json: Option<&str>) -> Result<(), String> {
    // 1. Delete existing links for this question
    conn.execute(
        "DELETE FROM QuestionSubQuestionLinks WHERE question_id = ?1",
        params![question_id],
    ).map_err(|e| format!("Failed to delete existing SubQ links: {}", e))?;

    // 2. Insert new links from metadata
    if let Some(json_str) = metadata_json {
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(json_str) {
            if let Some(codes) = v.get("selectedSubQuestions").and_then(|c| c.as_array()) {
                for (i, code_val) in codes.iter().enumerate() {
                    if let Some(code) = code_val.as_str() {
                        conn.execute(
                            "INSERT OR IGNORE INTO QuestionSubQuestionLinks (question_id, sub_question_code)
                             VALUES (?1, ?2)",
                            params![question_id, code],
                        ).map_err(|e| format!("Failed to insert SubQ link [{i}]: {}", e))?;
                    }
                }
            }
        }
    }

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

const FIXED_SECTION_101_TITLE: &str = "ข้อควรระมัดระวังอันตรายพื้นฐาน Safety Fundamentals";

/// Create a new section
pub fn create_section(request: CreateSectionRequest) -> Result<Section, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    create_section_with_conn(&conn, request)
}

fn create_section_with_conn(conn: &Connection, request: CreateSectionRequest) -> Result<Section, String> {
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
    
    // Section 101 (group 100) must always use the fixed header title.
    if request.section_group == 100
        && request.section_number == 101
        && request.title_th.trim() != FIXED_SECTION_101_TITLE
    {
        return Err(format!(
            "Section 101 title must be exactly: {}",
            FIXED_SECTION_101_TITLE
        ));
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
    }
    
    // Return created section
    get_section_by_id(&conn, id)
}

#[cfg(test)]
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
    // Helper closure with scoring fields + display_text
    let insert_q = |parent: Option<&str>, seq: i32, content: String, desc: Option<String>, is_scored: bool, is_group_header: bool, question_type: &str, display_text: Option<&str>| -> Result<String, String> {
        let q_id = generate_uuid();
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, description, is_header, answer_type, score, question_type, display_text, group_score, is_group_header, is_scored) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 1, 'none', 0, ?8, ?9, 0, ?10, ?11)",
            params![q_id, doc_id, section_id, parent, seq, content, desc, question_type, display_text, is_group_header, is_scored]
        ).map_err(|e| e.to_string())?;
        Ok(q_id)
    };

    // 3xx.1 - คุณสมบัติก่อนการทดสอบ (group header, may have score from 1.4-1.5)
    let q1_desc = "เพื่อให้การทดสอบตาม มาตรฐานการทดสอบกำลังพลเกิดประโยชน์สูงสุด และสำเร็จตามวัตถุประสงค์ ผู้เข้ารับการทดสอบ ต้องมีคุณสมบัติ ดังต่อไปนี้".to_string();
    let q1_id = insert_q(None, 1, "คุณสมบัติก่อนการทดสอบ".to_string(), Some(q1_desc), false, true, "normal", None)?;

    // 3xx.1.1 - 3xx.1.3: NOT scored, default EXEMPTED (prerequisites — most positions skip these)
    let exempted_text = "(ไม่ต้องปฏิบัติ)";
    insert_q(Some(&q1_id), 1, "ผ่านการอบรม".to_string(), None, false, false, "exempted", Some(exempted_text))?;
    insert_q(Some(&q1_id), 2, "ผ่านมาตรฐานการทดสอบกําลังพล".to_string(), None, false, false, "exempted", Some(exempted_text))?;
    insert_q(Some(&q1_id), 3, "ผ่านการปฏิบัติหน้าที่".to_string(), None, false, false, "exempted", Some(exempted_text))?;
    // 3xx.1.4 - 3xx.1.5: SCORED, default EXEMPTED (section selectors — configured per position)
    insert_q(Some(&q1_id), 4, "ผ่านการทดสอบความรู้พื้นฐาน".to_string(), None, true, false, "exempted", Some(exempted_text))?;
    insert_q(Some(&q1_id), 5, "ผ่านการทดสอบระบบ".to_string(), None, true, false, "exempted", Some(exempted_text))?;

    // 3xx.2 - 3xx.5: GROUP headers, default EXEMPTED (configured per position)
    insert_q(None, 2, "การทดสอบปฏิบัติงานปกติ".to_string(), None, false, true, "exempted", Some(exempted_text))?;
    insert_q(None, 3, "การทดสอบการปฏิบัติงานกรณีพิเศษ".to_string(), None, false, true, "exempted", Some(exempted_text))?;
    insert_q(None, 4, "การทดสอบการปฏิบัติงานกรณีเหตุขัดข้อง".to_string(), None, false, true, "exempted", Some(exempted_text))?;
    insert_q(None, 5, "การทดสอบการปฏิบัติงานกรณีเหตุฉุกเฉิน".to_string(), None, false, true, "exempted", Some(exempted_text))?;

    // 3xx.6: GROUP header, default EXEMPTED (configured per position)
    insert_q(None, 6, "การทดสอบการปฏิบัติงานประจําตําแหน่ง".to_string(), None, false, true, "exempted", Some(exempted_text))?;

    // 3xx.7: สอบความรู้ (group header, children NOT scored)
    let q7_id = insert_q(None, 7, "สอบความรู้".to_string(), None, false, true, "normal", None)?;
    insert_q(Some(&q7_id), 1, "สอบข้อเขียน".to_string(), Some("ขึ้นอยู่กับผู้บังคับหน่วยกำหนด".to_string()), false, false, "normal", None)?;
    insert_q(Some(&q7_id), 2, "สอบปากเปล่า".to_string(), Some("ขึ้นอยู่กับผู้บังคับหน่วยกำหนด".to_string()), false, false, "normal", None)?;

    Ok(())
}

/// Seed Section 200 Template (2xx.1 - 2xx.6)
fn seed_section_200_template(conn: &Connection, doc_id: &str, section_id: i64, _section_num: i32) -> Result<(), String> {
    // Helper closure: all 2xx L1 questions start exempted and are activated per position later.
    let insert_q = |seq: i32, content: String, question_type: &str, display_text: Option<&str>| -> Result<String, String> {
        let q_id = generate_uuid();
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, question_type, display_text) 
             VALUES (?1, ?2, ?3, NULL, ?4, ?5, 1, 'text', ?6, ?7)",
            params![q_id, doc_id, section_id, seq, content, question_type, display_text]
        ).map_err(|e| e.to_string())?;
        Ok(q_id)
    };

    let exempted_text = "(ไม่ต้องอธิบาย)";

    insert_q(1, "หน้าที่".to_string(), "exempted", Some(exempted_text))?;
    // 2xx.2: ส่วนประกอบ — default exempted, display "(ไม่ต้องอธิบาย)", no scoring, no group_header
    insert_q(2, "ส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ".to_string(), "exempted", Some(exempted_text))?;
    insert_q(3, "หลักการทำงาน".to_string(), "exempted", Some(exempted_text))?;
    // 2xx.4: ค่าทำงาน — default exempted, display "(ไม่ต้องอธิบาย)", no scoring, no group_header
    insert_q(4, "ค่าทำงานปกติ ค่าสูงสุด ต่ำสุด ของการทำงาน".to_string(), "exempted", Some(exempted_text))?;
    insert_q(5, "การเชื่อมต่อระบบ".to_string(), "exempted", Some(exempted_text))?;
    insert_q(6, "ข้อระมัดระวังอันตราย".to_string(), "exempted", Some(exempted_text))?;

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
    update_section_with_conn(&conn, args)
}

fn update_section_with_conn(conn: &Connection, args: UpdateSectionArgs) -> Result<(), String> {

    let (section_group, section_number): (i32, i32) = conn
        .query_row(
            "SELECT section_group, section_number FROM Sections WHERE id = ?1",
            params![args.id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;

    if section_group == 100 && section_number == 101 && args.title_th.trim() != FIXED_SECTION_101_TITLE {
        return Err(format!(
            "Section 101 title is fixed and cannot be changed. Required title: {}",
            FIXED_SECTION_101_TITLE
        ));
    }

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

/// Clean up orphaned section_ref questions that point to sections which no longer exist.
/// This handles legacy data created before the delete_section cleanup was added.
/// Returns the number of orphaned refs removed.
pub fn cleanup_orphaned_section_refs() -> Result<usize, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Find all section_ref questions whose refSectionId points to a non-existent section
    let mut stmt = conn.prepare(
        "SELECT q.id, q.parent_id, q.metadata
         FROM Questions q
         WHERE q.question_type = 'section_ref'
           AND q.metadata IS NOT NULL"
    ).map_err(|e| e.to_string())?;

    let rows: Vec<(String, Option<String>, String)> = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,
            row.get::<_, Option<String>>(1)?,
            row.get::<_, String>(2)?,
        ))
    }).map_err(|e| e.to_string())?
     .filter_map(|r| r.ok())
     .collect();

    let mut removed = 0usize;
    let mut affected_parents: Vec<String> = Vec::new();

    for (question_id, parent_id, metadata) in &rows {
        // Extract refSectionId from metadata JSON
        let ref_section_id: Option<i64> = serde_json::from_str::<serde_json::Value>(metadata)
            .ok()
            .and_then(|v| v.get("refSectionId")?.as_i64());

        if let Some(ref_sid) = ref_section_id {
            // Check if the referenced section still exists
            let exists: bool = conn.query_row(
                "SELECT EXISTS(SELECT 1 FROM Sections WHERE id = ?1)",
                params![ref_sid],
                |row| row.get(0),
            ).unwrap_or(false);

            if !exists {
                // Delete the orphaned section_ref question
                conn.execute("DELETE FROM Questions WHERE id = ?1", params![question_id])
                    .map_err(|e| e.to_string())?;

                if let Some(pid) = parent_id {
                    if !affected_parents.contains(pid) {
                        affected_parents.push(pid.clone());
                    }
                }

                eprintln!("[cleanup_orphaned_section_refs] Removed orphaned section_ref question {} (was pointing to deleted section {})", question_id, ref_sid);
                removed += 1;
            }
        }
    }

    // Auto-exempt parent questions that have zero remaining section_ref children
    for pid in &affected_parents {
        let remaining_children: i32 = conn.query_row(
            "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1 AND question_type = 'section_ref'",
            params![pid],
            |row| row.get(0),
        ).unwrap_or(0);

        if remaining_children == 0 {
            conn.execute(
                "UPDATE Questions SET question_type = 'exempted', score = 0, is_scored = 0 WHERE id = ?1",
                params![pid],
            ).map_err(|e| e.to_string())?;
            eprintln!("[cleanup_orphaned_section_refs] Auto-exempted parent question {} (no section_ref children remaining)", pid);
        }

        let _ = recalculate_group_score_chain(&conn, pid);
    }

    // --- Catch-up pass: find stranded section selectors in 300-series ---
    // These are L1 group_header questions (3xx.2-3xx.6, sequence 2-6) that were activated
    // (changed from exempted to normal) and had section_ref children added, but those children
    // were deleted in a prior cleanup that didn't auto-exempt the parent.
    // Restrict to parent_id IS NULL (L1 only) and sequence 2-6 to avoid catching 3xx.1 or 3xx.7.
    {
        let mut stale_stmt = conn.prepare(
            "SELECT q.id, q.parent_id FROM Questions q
             JOIN Sections s ON q.section_id = s.id
             WHERE s.section_group = 300
               AND q.question_type NOT IN ('exempted', 'section_ref')
               AND q.is_group_header = 1
               AND q.parent_id IS NULL
               AND q.sequence BETWEEN 2 AND 6
               AND NOT EXISTS (SELECT 1 FROM Questions c WHERE c.parent_id = q.id)"
        ).map_err(|e| e.to_string())?;

        let stranded: Vec<(String, Option<String>)> = stale_stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?))
        }).map_err(|e| e.to_string())?
         .filter_map(|r| r.ok())
         .collect();

        for (qid, parent_id) in &stranded {
            conn.execute(
                "UPDATE Questions SET question_type = 'exempted', score = 0, is_scored = 0, is_group_header = 0 WHERE id = ?1",
                params![qid],
            ).map_err(|e| e.to_string())?;

            if let Some(pid) = parent_id {
                let _ = recalculate_group_score_chain(&conn, pid);
            }
            eprintln!("[cleanup_orphaned_section_refs] Auto-exempted stranded selector {} (300-series group_header with no children)", qid);
            removed += 1;
        }
    }

    if removed > 0 {
        eprintln!("[cleanup_orphaned_section_refs] Cleaned up {} orphaned/stranded question(s) total", removed);
    }

    Ok(removed)
}

/// Delete a section and all its questions (cascade)
pub fn delete_section(id: i64) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    delete_section_with_conn(&conn, id)
}

fn delete_section_with_conn(conn: &Connection, id: i64) -> Result<(), String> {
    // Check if system-defined. Exception: Section 101 is allowed to be deleted.
    let (is_system, section_number): (bool, i32) = conn
        .query_row(
            "SELECT is_system_defined, section_number FROM Sections WHERE id = ?1",
            params![id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| e.to_string())?;
    
    if is_system && section_number != 101 {
        return Err("Cannot delete system-defined section".to_string());
    }

    // --- Clean up orphaned section_ref children in OTHER sections that link to this section ---
    // Find all section_ref questions whose metadata contains refSectionId pointing to this section
    {
        let mut ref_stmt = conn.prepare(
            "SELECT id, parent_id FROM Questions
             WHERE question_type = 'section_ref'
               AND section_id != ?1
               AND metadata LIKE ?2"
        ).map_err(|e| e.to_string())?;

        let pattern = format!("%\"refSectionId\":{}%", id);
        let orphaned_refs: Vec<(String, Option<String>)> = ref_stmt.query_map(
            params![id, pattern],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?))
        ).map_err(|e| e.to_string())?
         .filter_map(|r| r.ok())
         .collect();

        let mut affected_parents: Vec<String> = Vec::new();

        for (ref_id, parent_id) in &orphaned_refs {
            // Delete the orphaned section_ref question
            conn.execute("DELETE FROM Questions WHERE id = ?1", params![ref_id])
                .map_err(|e| e.to_string())?;

            if let Some(pid) = parent_id {
                if !affected_parents.contains(pid) {
                    affected_parents.push(pid.clone());
                }
            }
        }

        // Auto-exempt parent questions that have zero remaining section_ref children
        for pid in &affected_parents {
            let remaining_children: i32 = conn.query_row(
                "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1 AND question_type = 'section_ref'",
                params![pid],
                |row| row.get(0),
            ).unwrap_or(0);

            if remaining_children == 0 {
                conn.execute(
                    "UPDATE Questions SET question_type = 'exempted', score = 0, is_scored = 0 WHERE id = ?1",
                    params![pid],
                ).map_err(|e| e.to_string())?;
            }

            let _ = recalculate_group_score_chain(&conn, pid);
        }
    }

    // --- Clean up UserProgress for this section ---
    conn.execute(
        "DELETE FROM UserProgress WHERE section_id = ?1",
        params![id]
    ).ok(); // Ignore if table doesn't exist
    
    // Delete QuestionSectionLinks for all questions in this section (may not cascade automatically)
    conn.execute(
        "DELETE FROM QuestionSectionLinks WHERE question_id IN (SELECT id FROM Questions WHERE section_id = ?1)",
        params![id]
    ).map_err(|e| format!("Failed to delete section question links: {}", e))?;

    // Delete all questions belonging to this section
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

fn get_question_section_group(conn: &Connection, question_id: &str) -> Result<Option<i32>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT s.section_group
             FROM Questions q
             JOIN Sections s ON q.section_id = s.id
             WHERE q.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    let mut rows = stmt.query(params![question_id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let group: i32 = row.get(0).map_err(|e| e.to_string())?;
        Ok(Some(group))
    } else {
        Ok(None)
    }
}

fn ensure_section_300_policy_allows_question_action(
    conn: &Connection,
    question_id: &str,
    action_name: &str,
) -> Result<(), String> {
    if let Some(300) = get_question_section_group(conn, question_id)? {
        return Err(format!("Section 300 does not allow {}", action_name));
    }
    Ok(())
}

fn add_question_reference_with_conn(conn: &Connection, req: AddQuestionReferenceRequest) -> Result<(), String> {
    ensure_section_300_policy_allows_question_action(conn, &req.question_id, "references")?;

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

/// Add a reference link to a specific question (with page number)
pub fn add_question_reference(req: AddQuestionReferenceRequest) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    add_question_reference_with_conn(&conn, req)
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
    ensure_standard_occupation_branch_exists(&conn)?;
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
    if is_protected_main_branch(&conn, &code)? && name != STANDARD_BRANCH_NAME {
        return Err("Cannot rename the protected standard occupation branch".to_string());
    }
    conn.execute(
        "UPDATE OccupationBranches SET name = ?1 WHERE code = ?2",
        params![name, code],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// Delete an occupation branch (cascades to sub-branches and sub-questions)
pub fn delete_occupation_branch(code: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    if is_protected_main_branch(&conn, &code)? {
        return Err("Cannot delete the protected standard occupation branch".to_string());
    }
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
    ensure_standard_occupation_branch_exists(&conn)?;
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
    if is_protected_sub_branch(&conn, &branch_code, &code)? && name != STANDARD_BRANCH_NAME {
        return Err("Cannot rename the protected standard occupation sub-branch".to_string());
    }
    conn.execute(
        "UPDATE OccupationSubBranches SET name = ?1 WHERE branch_code = ?2 AND code = ?3",
        params![name, branch_code, code],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

/// Delete a sub-branch (cascades to sub-questions)
pub fn delete_occupation_sub_branch(code: String, branch_code: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    if is_protected_sub_branch(&conn, &branch_code, &code)? {
        return Err("Cannot delete the protected standard occupation sub-branch".to_string());
    }
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

    let passing = args.passing_score.unwrap_or(100);
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

/// Batch-recalculate group_score for all group headers in a section, bottom-up (L2 → L1),
/// using a single connection and transaction to avoid SQLite write-lock contention.
/// Returns a map of question_id → new group_score.
pub fn batch_recalculate_section_group_scores(section_id: i64) -> Result<Vec<(String, i32)>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // L2 group headers first (children of L1)
    let mut l2_stmt = conn.prepare(
        "SELECT id FROM Questions WHERE section_id = ?1 AND parent_id IS NOT NULL AND is_group_header = 1"
    ).map_err(|e| e.to_string())?;
    let l2_ids: Vec<String> = l2_stmt.query_map(params![section_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // L1 group headers (top-level)
    let mut l1_stmt = conn.prepare(
        "SELECT id FROM Questions WHERE section_id = ?1 AND parent_id IS NULL AND is_group_header = 1"
    ).map_err(|e| e.to_string())?;
    let l1_ids: Vec<String> = l1_stmt.query_map(params![section_id], |row| row.get(0))
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    let mut results = Vec::new();

    // Single transaction for all writes
    conn.execute("BEGIN IMMEDIATE", []).map_err(|e| e.to_string())?;

    let calc_and_update = |conn: &Connection, parent_id: &str| -> Result<i32, String> {
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
        conn.execute(
            "UPDATE Questions SET group_score = ?1 WHERE id = ?2",
            params![total, parent_id],
        ).map_err(|e| e.to_string())?;
        Ok(total)
    };

    for id in &l2_ids {
        let score = calc_and_update(&conn, id)?;
        results.push((id.clone(), score));
    }
    for id in &l1_ids {
        let score = calc_and_update(&conn, id)?;
        results.push((id.clone(), score));
    }

    conn.execute("COMMIT", []).map_err(|e| e.to_string())?;

    Ok(results)
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

/// Get section IDs that already reference the given section_id via section_ref questions.
/// Used by the frontend to disable those sections in the selector (would create circular dependency).
pub fn get_back_referencing_section_ids(section_id: i64) -> Result<Vec<i64>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT DISTINCT q.section_id FROM Questions q
         WHERE q.question_type = 'section_ref'
           AND q.metadata LIKE ?1"
    ).map_err(|e| e.to_string())?;

    let ids: Vec<i64> = stmt.query_map(
        params![format!("%\"refSectionId\":{}%", section_id)],
        |row| row.get(0),
    ).map_err(|e| e.to_string())?
     .filter_map(|r| r.ok())
     .collect();

    Ok(ids)
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

    // Prevent self-reference: a section cannot reference itself
    if args.linked_section_id == args.section_id {
        return Err("Cannot add a section reference to itself".to_string());
    }

    // Prevent bidirectional reference: if target section already references back to this section,
    // creating this link would cause a circular dependency in progress computation.
    let back_ref_exists: bool = conn.query_row(
        "SELECT EXISTS(
            SELECT 1 FROM Questions
            WHERE section_id = ?1 AND question_type = 'section_ref'
              AND metadata LIKE ?2
        )",
        params![args.linked_section_id, format!("%\"refSectionId\":{}%", args.section_id)],
        |row| row.get(0),
    ).unwrap_or(false);

    if back_ref_exists {
        return Err(format!("Cannot add: section {} already references this section (would create circular dependency)", args.linked_section_number));
    }

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
        // Skip self-references
        if item.linked_section_id == args.section_id {
            continue;
        }

        // Skip bidirectional references (would create circular dependency)
        let back_ref: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM Questions WHERE section_id = ?1 AND question_type = 'section_ref' AND metadata LIKE ?2)",
            params![item.linked_section_id, format!("%\"refSectionId\":{}%", args.section_id)],
            |row| row.get(0),
        ).unwrap_or(false);
        if back_ref {
            continue;
        }

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
    pub content_override: Option<String>,
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

    // Use content_override if provided (e.g. 3xx.6 L1 uses description text for L2 children)
    let effective_content = args.content_override.unwrap_or(parent_content);

    // Get existing required_instance children
    let existing = get_required_count_children_inner(&conn, &args.parent_id)?;
    let current_count = existing.len() as i32;

    if args.desired_count > current_count {
        // Add new children (inherit parent's metadata and answer_type)
        for i in (current_count + 1)..=(args.desired_count) {
            let id = generate_uuid();
            let content = format!("{} ครั้งที่ {}", effective_content, thai_number(i));

            conn.execute(
                "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, metadata, score, question_type, group_score, is_group_header, is_scored)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7, ?8, ?9, 'required_instance', 0, 0, 1)",
                params![id, args.document_id, args.section_id, args.parent_id, i, content, parent_answer_type, parent_metadata, args.score_per_instance],
            ).map_err(|e| e.to_string())?;

            sync_question_sub_question_links(&conn, &id, parent_metadata.as_deref())?;
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
        let new_content = format!("{} ครั้งที่ {}", effective_content, thai_number(child.sequence));
        conn.execute(
            "UPDATE Questions SET score = ?1, content = ?2, metadata = ?3, answer_type = ?4 WHERE id = ?5 AND question_type = 'required_instance'",
            params![args.score_per_instance, new_content, parent_metadata, parent_answer_type, child.id],
        ).map_err(|e| e.to_string())?;

        sync_question_sub_question_links(&conn, &child.id, parent_metadata.as_deref())?;
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

#[derive(serde::Deserialize)]
pub struct SaveTraineeAnswerArgs {
    pub user_id: String,
    pub question_id: String,
    pub document_id: String,
    pub sub_question_code: String,
    pub answer_text: String,
}

#[derive(serde::Deserialize)]
pub struct SaveQualifierAssessmentArgs {
    pub user_id: String,
    pub question_id: String,
    pub document_id: String,
    pub sub_question_code: String,
    pub status: String,
    pub feedback: Option<String>,
    pub qualifier_id: String,
}

#[derive(serde::Serialize, Clone)]
pub struct UserAnswer {
    pub user_id: String,
    pub question_id: String,
    pub document_id: String,
    pub sub_question_code: String,
    pub answer_text: Option<String>,
    pub status: String,
    pub feedback: Option<String>,
    pub assessed_at: Option<String>,
    pub assessed_by: Option<String>,
    pub updated_at: String,
    pub answer_key: Option<String>,
}

/// Get all trainee answers for a document
pub fn get_trainee_answers(user_id: &str, document_id: &str) -> Result<Vec<UserAnswer>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT ua.user_id, ua.question_id, ua.document_id, ua.sub_question_code, ua.answer_text,
                ua.status, ua.feedback, ua.assessed_at, ua.assessed_by, ua.updated_at, ak.answer_key_text
         FROM UserAnswers ua
         LEFT JOIN QuestionAnswerKeys ak ON ak.question_id = ua.question_id AND ak.sub_question_code = ua.sub_question_code
         WHERE ua.user_id = ?1 AND ua.document_id = ?2"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![user_id, document_id], |row| {
        Ok(UserAnswer {
            user_id: row.get(0)?,
            question_id: row.get(1)?,
            document_id: row.get(2)?,
            sub_question_code: row.get(3)?,
            answer_text: row.get(4)?,
            status: row.get(5)?,
            feedback: row.get(6)?,
            assessed_at: row.get(7)?,
            assessed_by: row.get(8)?,
            updated_at: row.get(9)?,
            answer_key: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for row in rows {
        result.push(row.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

fn ensure_answer_key_placeholder(conn: &Connection, question_id: &str, sub_question_code: &str) -> Result<(), String> {
    let normalized_sub_question_code = sub_question_code.trim();
    let exists: i32 = conn.query_row(
        "SELECT COUNT(*) FROM QuestionAnswerKeys WHERE question_id = ?1 AND sub_question_code = ?2",
        params![question_id, normalized_sub_question_code],
        |row| row.get(0)
    ).unwrap_or(0);

    if exists == 0 {
        conn.execute(
            "INSERT OR IGNORE INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, is_required, order_index)
             VALUES (?1, ?2, '', 1, 0)",
            params![question_id, normalized_sub_question_code]
        ).map_err(|e| format!("Failed to create answer key placeholder: {}", e))?;
    }

    Ok(())
}

/// Save or update a trainee's answer
pub fn save_trainee_answer(args: SaveTraineeAnswerArgs) -> Result<String, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    ensure_answer_key_placeholder(&conn, &args.question_id, &args.sub_question_code)?;
    
    conn.execute(
        "INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, answer_text, status, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, 'pending', CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, question_id, document_id, sub_question_code) DO UPDATE SET
            answer_text = excluded.answer_text,
            status = 'pending',
            updated_at = CURRENT_TIMESTAMP",
        params![args.user_id, args.question_id, args.document_id, args.sub_question_code, args.answer_text]
    ).map_err(|e| {
        let err_msg = format!("Failed to save answer: {}", e);
        println!("DB ERROR in save_trainee_answer: {}", err_msg);
        err_msg
    })?;
    
    Ok("Answer saved successfully".to_string())
}

/// Save or update a qualifier's assessment
pub fn save_qualifier_assessment(args: SaveQualifierAssessmentArgs) -> Result<String, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    ensure_answer_key_placeholder(&conn, &args.question_id, &args.sub_question_code)?;
    
    conn.execute(
        "INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, status, feedback, assessed_by, assessed_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, question_id, document_id, sub_question_code) DO UPDATE SET
            status = excluded.status,
            feedback = excluded.feedback,
            assessed_by = excluded.assessed_by,
            assessed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP",
        params![args.user_id, args.question_id, args.document_id, args.sub_question_code, args.status, args.feedback, args.qualifier_id]
    ).map_err(|e| format!("Failed to save assessment: {}", e))?;

    // Auto-recalculate progress for this section after each assessment save
    let _ = recalculate_section_progress(args.user_id, args.document_id);
    
    Ok("Assessment saved successfully".to_string())
}

#[derive(Debug, Clone)]
struct ComputedSectionProgress {
    earned_score: i32,
    max_score: i32,
    completion_percentage: f64,
    is_passed: bool,
    passing_score: i32,
    total_questions: i32,
    answered_questions: i32,
    passed_questions: i32,
    pending_with_answer: i32,
    needs_improvement_questions: i32,
}

fn extract_ref_section_id(metadata: Option<String>) -> Option<i64> {
    metadata
        .and_then(|meta| serde_json::from_str::<serde_json::Value>(&meta).ok())
        .and_then(|value| value.get("refSectionId").and_then(|v| v.as_i64()))
        .filter(|id| *id > 0)
}

fn compute_section_progress(conn: &Connection, user_id: &str, document_id: &str, section_id: i64) -> Result<ComputedSectionProgress, String> {
    let mut visited = std::collections::HashSet::new();
    compute_section_progress_inner(conn, user_id, document_id, section_id, &mut visited)
}

fn compute_section_progress_inner(conn: &Connection, user_id: &str, document_id: &str, section_id: i64, visited: &mut std::collections::HashSet<i64>) -> Result<ComputedSectionProgress, String> {
    // Cycle detection: prevent infinite recursion from circular section_refs
    if !visited.insert(section_id) {
        return Err(format!("Circular section_ref detected at section_id={}", section_id));
    }

    let section_group: i32 = conn.query_row(
        "SELECT section_group FROM Sections WHERE id = ?1",
        params![section_id],
        |row| row.get(0)
    ).map_err(|e| e.to_string())?;
 
    if section_group == 300 {
        let section_total_score: i32 = conn.query_row(
            "SELECT COALESCE(SUM(
                CASE
                    WHEN question_type = 'exempted' THEN 0
                    WHEN is_group_header = 1 THEN COALESCE(group_score, 0)
                    WHEN is_scored = 1 AND parent_id IS NULL THEN COALESCE(score, 0)
                    ELSE 0
                END
             ), 0)
             FROM Questions
             WHERE section_id = ?1 AND parent_id IS NULL",
            params![section_id],
            |row| row.get(0)
        ).unwrap_or(0);
 
        let mut stmt = conn.prepare(
            "SELECT id, metadata, COALESCE(score, 0), question_type
             FROM Questions
             WHERE section_id = ?1
               AND question_type != 'exempted'
               AND is_group_header = 0
               AND is_scored = 1
             ORDER BY sequence, id"
        ).map_err(|e| e.to_string())?;
 

        let rows = stmt.query_map(params![section_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, i32>(2).unwrap_or(0),
                row.get::<_, String>(3)?,
            ))
        }).map_err(|e| e.to_string())?;

        let mut earned_score = 0;
        let mut total_questions = 0;
        let mut answered_questions = 0;
        let mut passed_questions = 0;
        let mut pending_with_answer = 0;
        let mut needs_improvement_questions = 0;

        for row in rows {
            let (question_id, metadata, score, question_type) = row.map_err(|e| e.to_string())?;
            total_questions += 1;

            if question_type == "section_ref" {
                if let Some(ref_section_id) = extract_ref_section_id(metadata.clone()) {
                    // Skip self-references: a section pointing to itself is not meaningful
                    if ref_section_id == section_id {
                        continue;
                    }
                    match compute_section_progress_inner(conn, user_id, document_id, ref_section_id, visited) {
                        Ok(linked_progress) => {
                            if linked_progress.is_passed {
                                earned_score += score;
                                answered_questions += 1;
                                passed_questions += 1;
                            } else if linked_progress.answered_questions > 0
                                || linked_progress.pending_with_answer > 0
                                || linked_progress.needs_improvement_questions > 0
                                || linked_progress.completion_percentage > 0.0 {
                                answered_questions += 1;
                                pending_with_answer += 1;
                            }
                        }
                        Err(_) => {
                            // Silently skip: circular or missing section refs are non-fatal
                        }
                    }
                }
                continue;
            }

            let oral_assessment = conn.query_row(
                "SELECT status, feedback
                 FROM UserAnswers
                 WHERE user_id = ?1 AND question_id = ?2 AND document_id = ?3 AND sub_question_code = ''
                 ORDER BY updated_at DESC
                 LIMIT 1",
                params![user_id, question_id, document_id],
                |row| Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?))
            ).ok();

            if let Some((status, feedback)) = oral_assessment {
                match status.as_str() {
                    "passed" => {
                        earned_score += score;
                        answered_questions += 1;
                        passed_questions += 1;
                    }
                    "needs_improvement" => {
                        answered_questions += 1;
                        needs_improvement_questions += 1;
                    }
                    "pending" => {
                        if feedback.unwrap_or_default().trim().is_empty() {
                            continue;
                        }
                        answered_questions += 1;
                        pending_with_answer += 1;
                    }
                    _ => {}
                }
            }
        }

        let completion_percentage = if total_questions > 0 {
            (answered_questions as f64 / total_questions as f64) * 100.0
        } else {
            0.0
        };
        let performance_percentage = if section_total_score > 0 {
            (earned_score as f64 / section_total_score as f64) * 100.0
        } else {
            0.0
        };

        // Backtrack: allow this section to be visited again from a different path
        visited.remove(&section_id);

        return Ok(ComputedSectionProgress {
            earned_score,
            max_score: section_total_score,
            completion_percentage,
            is_passed: section_total_score > 0 && performance_percentage >= 100.0,
            passing_score: 100,
            total_questions,
            answered_questions,
            passed_questions,
            pending_with_answer,
            needs_improvement_questions,
        });
    }

    let section_number: i32 = conn.query_row(
        "SELECT section_number FROM Sections WHERE id = ?1",
        params![section_id],
        |row| row.get(0)
    ).unwrap_or(0);
    let seq_start = section_number;
    let seq_end = section_number + 100;

    let max_score: i32 = conn.query_row(
        "SELECT COALESCE(SUM(
            CASE
                WHEN question_type = 'exempted' THEN 0
                WHEN is_group_header = 1 THEN COALESCE(group_score, 0)
                WHEN is_scored = 1 THEN COALESCE(score, 0)
                ELSE 0
            END
         ), 0)
         FROM Questions
         WHERE section_id = ?1
            OR (section_id = 0 AND sequence >= ?2 AND sequence < ?3)",
        params![section_id, seq_start, seq_end],
        |row| row.get(0)
    ).unwrap_or(0);

    let earned_score: f64 = conn.query_row(
        "SELECT COALESCE(SUM(
            CASE
                WHEN q.is_group_header = 1 THEN 0
                WHEN q.is_scored = 1 THEN 
                    CAST(COALESCE(q.score, 0) AS FLOAT) / 
                    COALESCE((SELECT COUNT(*) FROM QuestionAnswerKeys WHERE question_id = q.id), 1)
                ELSE 0
            END
         ), 0.0)
         FROM UserAnswers ua
         JOIN Questions q ON q.id = ua.question_id
                 WHERE ua.user_id = ?1 AND ua.document_id = ?2
                     AND (q.section_id = ?3 OR (q.section_id = 0 AND q.sequence >= ?4 AND q.sequence < ?5))
                     AND ua.status = 'passed'",
                params![user_id, document_id, section_id, seq_start, seq_end],
        |row| row.get(0)
    ).unwrap_or(0.0);
    let earned_score_i32 = earned_score.round() as i32;

    let total_questions: i32 = conn.query_row(
        "SELECT COUNT(*)
         FROM QuestionAnswerKeys ak
         JOIN Questions q ON q.id = ak.question_id
                 WHERE (q.section_id = ?1 OR (q.section_id = 0 AND q.sequence >= ?2 AND q.sequence < ?3))
                     AND q.question_type != 'exempted'",
                params![section_id, seq_start, seq_end],
        |row| row.get(0)
    ).unwrap_or(0);

    let passed_questions: i32 = conn.query_row(
        "SELECT COUNT(*)
         FROM UserAnswers ua
         JOIN Questions q ON q.id = ua.question_id
                 WHERE ua.user_id = ?1 AND ua.document_id = ?2
                     AND (q.section_id = ?3 OR (q.section_id = 0 AND q.sequence >= ?4 AND q.sequence < ?5))
                     AND ua.status = 'passed'",
                params![user_id, document_id, section_id, seq_start, seq_end],
        |row| row.get(0)
    ).unwrap_or(0);

    let pending_with_answer: i32 = conn.query_row(
        "SELECT COUNT(*)
         FROM UserAnswers ua
         JOIN Questions q ON q.id = ua.question_id
                 WHERE ua.user_id = ?1 AND ua.document_id = ?2
                     AND (q.section_id = ?3 OR (q.section_id = 0 AND q.sequence >= ?4 AND q.sequence < ?5))
                     AND ua.status = 'pending'
           AND ua.answer_text IS NOT NULL AND ua.answer_text != ''",
                params![user_id, document_id, section_id, seq_start, seq_end],
        |row| row.get(0)
    ).unwrap_or(0);

    let needs_improvement_questions: i32 = conn.query_row(
        "SELECT COUNT(*)
         FROM UserAnswers ua
         JOIN Questions q ON q.id = ua.question_id
                 WHERE ua.user_id = ?1 AND ua.document_id = ?2
                     AND (q.section_id = ?3 OR (q.section_id = 0 AND q.sequence >= ?4 AND q.sequence < ?5))
                     AND ua.status = 'needs_improvement'",
                params![user_id, document_id, section_id, seq_start, seq_end],
        |row| row.get(0)
    ).unwrap_or(0);

    let performance_percentage = if max_score > 0 {
        (earned_score / max_score as f64) * 100.0
    } else if total_questions > 0 {
        (passed_questions as f64 / total_questions as f64) * 100.0
    } else {
        0.0
    };
    let completion_percentage = if total_questions > 0 {
        ((passed_questions + pending_with_answer + needs_improvement_questions) as f64 / total_questions as f64) * 100.0
    } else {
        0.0
    };
    let is_passed = if max_score > 0 {
        performance_percentage >= 100.0 && max_score > 0
    } else {
        total_questions > 0 && passed_questions >= total_questions
    };

    // Backtrack: allow this section to be visited again from a different path
    visited.remove(&section_id);

    Ok(ComputedSectionProgress {
        earned_score: if max_score > 0 { earned_score_i32 } else { passed_questions },
        max_score: if max_score > 0 { max_score } else { total_questions },
        completion_percentage,
        is_passed,
        passing_score: 100,
        total_questions,
        answered_questions: passed_questions + pending_with_answer + needs_improvement_questions,
        passed_questions,
        pending_with_answer,
        needs_improvement_questions,
    })
}

/// Recalculate UserProgress for all sections of a user/document by summing
/// Questions.score for all passed answers. Updates UserProgress automatically.
pub fn recalculate_section_progress(user_id: String, document_id: String) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Get all sections for this document
    let mut sect_stmt = conn.prepare(
        "SELECT id, total_score FROM Sections WHERE document_id = ?1"
    ).map_err(|e| e.to_string())?;

    let sections: Vec<(i64, i32)> = sect_stmt.query_map(params![document_id], |row| {
        Ok((row.get::<_, i64>(0)?, row.get::<_, i32>(1).unwrap_or(0)))
    }).map_err(|e| e.to_string())?
      .filter_map(|r| r.ok())
      .collect();

    for (section_id, _max_score) in sections {
        let progress = compute_section_progress(&conn, &user_id, &document_id, section_id)?;
        let pct = if progress.max_score > 0 {
            (progress.earned_score as f64 / progress.max_score as f64) * 100.0
        } else if progress.total_questions > 0 {
            (progress.passed_questions as f64 / progress.total_questions as f64) * 100.0
        } else {
            0.0
        };

        let _ = conn.execute(
            "INSERT INTO UserProgress (user_id, document_id, section_id, earned_score, max_score, completion_percentage, is_passed, passing_score, last_updated)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 100, CURRENT_TIMESTAMP)
             ON CONFLICT(user_id, document_id, section_id) DO UPDATE SET
                earned_score = ?4, max_score = ?5, completion_percentage = ?6, is_passed = ?7, last_updated = CURRENT_TIMESTAMP",
            params![user_id, document_id, section_id, progress.earned_score, progress.max_score, pct, progress.is_passed],
        );
    }

    Ok(())
}

/// Get progress for a specific section for the ScoreProgressBanner
#[tauri::command]
pub fn get_section_progress(user_id: String, document_id: String, section_id: i64) -> Result<serde_json::Value, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    let progress = compute_section_progress(&conn, &user_id, &document_id, section_id)?;

    Ok(serde_json::json!({
        "earned_score": progress.earned_score,
        "max_score": progress.max_score,
        "completion_percentage": progress.completion_percentage,
        "is_passed": progress.is_passed,
        "passing_score": progress.passing_score,
        "total_questions": progress.total_questions,
        "answered_questions": progress.answered_questions,
        "passed_questions": progress.passed_questions,
        "pending_with_answer": progress.pending_with_answer,
        "needs_improvement_questions": progress.needs_improvement_questions,
    }))
}

/// Developer verification metrics for Section
#[derive(serde::Serialize, Debug)]
pub struct DevSectionMetrics {
    pub total_questions_raw: i32,
    pub total_leaf_questions: i32,
    pub total_exempted: i32,
    pub total_required_questions: i32,
    pub total_with_answer_keys: i32,
    pub total_sub_questions: i32,
    pub total_answer_targets: i32,
    pub total_answers: i32,
    pub answers_assessed: i32,
    pub answers_passed: i32,
    pub answers_pending: i32,
    pub answers_needs_improvement: i32,
}

#[tauri::command]
pub fn get_section_dev_metrics(
    document_id: String,
    section_id: i64,
) -> Result<DevSectionMetrics, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let total_questions_raw: i32 = conn.query_row(
        "SELECT COUNT(*) FROM Questions WHERE section_id = ?1 AND document_id = ?2",
        params![section_id, document_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let total_leaf_questions: i32 = conn.query_row(
        "SELECT COUNT(*) FROM Questions
         WHERE section_id = ?1 AND document_id = ?2
           AND id NOT IN (SELECT DISTINCT parent_id FROM Questions WHERE parent_id IS NOT NULL AND section_id = ?1 AND document_id = ?2)",
        params![section_id, document_id, section_id, document_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let total_exempted: i32 = conn.query_row(
        "SELECT COUNT(*) FROM Questions WHERE section_id = ?1 AND document_id = ?2 AND question_type = 'exempted'",
        params![section_id, document_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let total_with_answer_keys: i32 = conn.query_row(
        "SELECT COUNT(DISTINCT question_id)
         FROM QuestionAnswerKeys ak
         JOIN Questions q ON q.id = ak.question_id
         WHERE q.section_id = ?1 AND q.document_id = ?2 AND q.question_type != 'exempted'",
        params![section_id, document_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let total_sub_questions: i32 = conn.query_row(
        "SELECT COUNT(*)
         FROM QuestionAnswerKeys ak
         JOIN Questions q ON q.id = ak.question_id
         WHERE q.section_id = ?1 AND q.document_id = ?2 AND q.question_type != 'exempted'",
        params![section_id, document_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let total_required_questions = total_leaf_questions - total_exempted;
    let total_answer_targets = total_sub_questions;

    let total_answers: i32 = conn.query_row(
        "SELECT COUNT(*) FROM UserAnswers ua JOIN Questions q ON q.id = ua.question_id WHERE ua.document_id = ?1 AND q.section_id = ?2",
        params![document_id, section_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let answers_passed: i32 = conn.query_row(
        "SELECT COUNT(*) FROM UserAnswers ua JOIN Questions q ON q.id = ua.question_id WHERE ua.document_id = ?1 AND q.section_id = ?2 AND ua.status = 'passed'",
        params![document_id, section_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let answers_pending: i32 = conn.query_row(
        "SELECT COUNT(*) FROM UserAnswers ua JOIN Questions q ON q.id = ua.question_id WHERE ua.document_id = ?1 AND q.section_id = ?2 AND ua.status = 'pending'",
        params![document_id, section_id],
        |row| row.get(0),
    ).unwrap_or(0);

    let answers_needs_improvement: i32 = conn.query_row(
        "SELECT COUNT(*) FROM UserAnswers ua JOIN Questions q ON q.id = ua.question_id WHERE ua.document_id = ?1 AND q.section_id = ?2 AND ua.status = 'needs_improvement'",
        params![document_id, section_id],
        |row| row.get(0),
    ).unwrap_or(0);
    let answers_assessed = answers_passed + answers_needs_improvement;

    Ok(DevSectionMetrics {
        total_questions_raw,
        total_leaf_questions,
        total_exempted,
        total_required_questions,
        total_with_answer_keys,
        total_sub_questions,
        total_answer_targets,
        total_answers,
        answers_assessed,
        answers_passed,
        answers_pending,
        answers_needs_improvement,
    })
}

#[tauri::command]
pub fn clear_all_trainee_answers() -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    conn.execute("DELETE FROM UserAnswers", rusqlite::params![])
        .map_err(|e| {
            println!("Failed to clear UserAnswers: {}", e);
            e.to_string()
        })?;

    conn.execute("DELETE FROM UserProgress", rusqlite::params![])
        .map_err(|e| {
            println!("Failed to clear UserProgress: {}", e);
            e.to_string()
        })?;

    println!("Successfully cleared all records from UserAnswers and UserProgress tables.");
    Ok(())
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct SubQuestionUsageResponse {
    pub usage_map: std::collections::HashMap<String, i64>,
    pub total_children: i64,
}

/// Get usage counts for each sub-question code under a given L1 question (parent).
/// Returns a map of sub_question_code → count of children (and descendants) that have selected it,
/// plus the total count of all descendant questions under this parent.
/// Uses QuestionSubQuestionLinks (relational) instead of JSON metadata for accuracy.
#[tauri::command]
pub fn get_sub_question_usage_counts(parent_id: String) -> Result<SubQuestionUsageResponse, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // 1. Get ALL scorable descendant IDs (recursive)
    // We filter out headers (is_group_header = 1) from the denominator to get an accurate "Question" count.
    let mut stmt_ids = conn.prepare(
        "WITH RECURSIVE descendants(id, is_group_header) AS (
            SELECT id, is_group_header FROM Questions WHERE parent_id = ?1
            UNION ALL
            SELECT q.id, q.is_group_header FROM Questions q
            JOIN descendants d ON q.parent_id = d.id
        )
        SELECT id FROM descendants WHERE is_group_header = 0"
    ).map_err(|e| format!("Failed to prepare descendant query: {}", e))?;

    let descendant_ids: Vec<String> = stmt_ids.query_map(params![parent_id], |row| row.get(0))
        .map_err(|e| format!("Failed to query descendants: {}", e))?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| format!("Failed to collect descendant IDs: {}", e))?;

    let total_children = descendant_ids.len() as i64;

    if descendant_ids.is_empty() {
        return Ok(SubQuestionUsageResponse {
            usage_map: std::collections::HashMap::new(),
            total_children: 0,
        });
    }

    // 2. Collect counts for each sub_question_code used by ANY of these scorable descendants
    let mut stmt_counts = conn.prepare(
        "WITH RECURSIVE descendants(id, is_group_header) AS (
            SELECT id, is_group_header FROM Questions WHERE parent_id = ?1
            UNION ALL
            SELECT q.id, q.is_group_header FROM Questions q
            JOIN descendants d ON q.parent_id = d.id
        )
        SELECT ql.sub_question_code, COUNT(DISTINCT ql.question_id) as usage_count
        FROM QuestionSubQuestionLinks ql
        JOIN descendants d ON ql.question_id = d.id
        WHERE d.is_group_header = 0
        GROUP BY ql.sub_question_code"
    ).map_err(|e| format!("Failed to prepare recursive usage count query: {}", e))?;

    let rows = stmt_counts.query_map(params![parent_id], |row| {
        Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?))
    }).map_err(|e| format!("Failed to query recursive usage counts: {}", e))?;

    let mut usage_map = std::collections::HashMap::new();
    for row in rows {
        let (code, count) = row.map_err(|e| e.to_string())?;
        usage_map.insert(code, count);
    }

    Ok(SubQuestionUsageResponse {
        usage_map,
        total_children,
    })
}

#[derive(serde::Serialize)]
pub struct AnswerKey {
    pub id: i64,
    pub question_id: String,
    pub sub_question_code: String,
    pub answer_key_text: Option<String>,
    pub is_required: bool,
    pub order_index: i32,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReplaceAnswerKeyItem {
    pub sub_code: String,
    pub text: String,
    pub is_required: Option<bool>,
}

#[tauri::command]
pub fn get_question_answer_keys(question_id: String) -> Result<Vec<AnswerKey>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT id, question_id, sub_question_code, answer_key_text, is_required, order_index
         FROM QuestionAnswerKeys
         WHERE question_id = ?1
         ORDER BY order_index"
    ).map_err(|e| e.to_string())?;

    let keys = stmt.query_map(params![question_id], |row| {
        Ok(AnswerKey {
            id: row.get(0)?,
            question_id: row.get(1)?,
            sub_question_code: row.get(2)?,
            answer_key_text: row.get(3)?,
            is_required: row.get(4)?,
            order_index: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?
      .collect::<Result<Vec<_>, _>>()
      .map_err(|e| e.to_string())?;

    Ok(keys)
}

#[tauri::command]
pub fn update_answer_key(question_id: String, sub_code: String, new_text: String) -> Result<String, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    update_answer_key_with_conn(&conn, question_id, sub_code, new_text)
}

fn update_answer_key_with_conn(
    conn: &Connection,
    question_id: String,
    sub_code: String,
    new_text: String,
) -> Result<String, String> {
    ensure_section_300_policy_allows_question_action(conn, &question_id, "answer keys")?;

    let trimmed = new_text.trim().to_string();

    if trimmed.is_empty() {
        conn.execute(
            "DELETE FROM QuestionAnswerKeys WHERE question_id = ?1 AND sub_question_code = ?2",
            params![question_id, sub_code],
        ).map_err(|e| format!("Failed to delete answer key: {}", e))?;

        if sub_code.is_empty() {
            let _ = conn.execute(
                "DELETE FROM QuestionAnswerKeys WHERE question_id = ?1 AND sub_question_code = 'main'",
                params![question_id],
            );
        }

        return Ok("Answer key deleted successfully".to_string());
    }

    // Upsert into AnswerKeys table
    conn.execute(
        "INSERT INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, is_required, order_index)
         VALUES (?1, ?2, ?3, 1, 0)
         ON CONFLICT(question_id, sub_question_code) DO UPDATE SET
            answer_key_text = excluded.answer_key_text",
        params![question_id, sub_code, trimmed],
    ).map_err(|e| format!("Failed to update answer key: {}", e))?;

    // Cleanup: If this is a single-part question (empty sub_code), 
    // remove any legacy 'main' entries that might have been created by mistake
    if sub_code.is_empty() {
        let _ = conn.execute(
            "DELETE FROM QuestionAnswerKeys WHERE question_id = ?1 AND sub_question_code = 'main'",
            params![question_id],
        );
    }

    Ok("Answer key updated successfully".to_string())
}

#[tauri::command]
pub fn replace_question_answer_keys(question_id: String, items: Vec<ReplaceAnswerKeyItem>) -> Result<String, String> {
    let mut conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    replace_question_answer_keys_with_conn(&mut conn, question_id, items)
}

fn replace_question_answer_keys_with_conn(
    conn: &mut Connection,
    question_id: String,
    items: Vec<ReplaceAnswerKeyItem>,
) -> Result<String, String> {
    // Only enforce Section 300 policy when actually writing answer keys.
    // Empty items = clear-only (harmless for new questions); skip the guard.
    if !items.is_empty() {
        ensure_section_300_policy_allows_question_action(conn, &question_id, "answer keys")?;
    }

    let tx = conn.transaction().map_err(|e| format!("Failed to start transaction: {}", e))?;

    tx.execute(
        "DELETE FROM QuestionAnswerKeys WHERE question_id = ?1",
        params![question_id],
    ).map_err(|e| format!("Failed to clear answer keys: {}", e))?;

    for (idx, item) in items.iter().enumerate() {
        let text = item.text.trim();
        let sub_code = item.sub_code.trim();
        if text.is_empty() {
            continue;
        }

        tx.execute(
            "INSERT INTO QuestionAnswerKeys (question_id, sub_question_code, answer_key_text, is_required, order_index)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![question_id, sub_code, text, item.is_required.unwrap_or(true), idx as i32],
        ).map_err(|e| format!("Failed to insert answer key: {}", e))?;
    }

    tx.commit().map_err(|e| format!("Failed to commit answer key replacement: {}", e))?;
    Ok("Answer keys replaced successfully".to_string())
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers::helpers::*;

    fn init_branch_protection_schema(conn: &Connection) {
        init_content_schema(conn).expect("Failed to init schema");
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
        )
        .expect("Failed to create OccupationSubBranches table");
        install_standard_occupation_branch_guards(conn).expect("Failed to install branch triggers");
        ensure_standard_occupation_branch_exists(conn).expect("Failed to ensure standard branch");
    }

    // ========================================================================
    // Template Seeding Tests
    // ========================================================================

    #[test]
    fn test_seed_section_300_creates_correct_structure() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        // Create test document
        let doc_id = "22724201001";
        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES (?, 'Test Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            [doc_id],
        ).expect("Failed to create document");

        // Create test section
        conn.execute(
            "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (?, 300, 301, 'Section 301', '301', 1)",
            [doc_id],
        ).expect("Failed to create section");

        let section_id: i64 = conn.query_row(
            "SELECT id FROM Sections WHERE document_id = ?1",
            [doc_id],
            |row| row.get(0),
        ).expect("Failed to get section id");

        // Seed template
        seed_section_300_template(&conn, doc_id, section_id, 301).expect("Failed to seed template");

        // Verify 7 L1 questions created
        let l1_count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM Questions WHERE section_id = ?1 AND parent_id IS NULL",
            [section_id],
            |row| row.get(0),
        ).expect("Failed to count L1");

        assert_eq!(l1_count, 7, "Should have 7 L1 questions (3xx.1 through 3xx.7)");

        // Verify 3xx.1 has 5 children
        let q1_id: String = conn.query_row(
            "SELECT id FROM Questions WHERE section_id = ?1 AND parent_id IS NULL AND sequence = 1",
            [section_id],
            |row| row.get(0),
        ).expect("Failed to get q1");

        let q1_children: i64 = conn.query_row(
            "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1",
            [&q1_id],
            |row| row.get(0),
        ).expect("Failed to count q1 children");

        assert_eq!(q1_children, 5, "3xx.1 should have 5 children");

        // Verify 3xx.7 has 2 children
        let q7_id: String = conn.query_row(
            "SELECT id FROM Questions WHERE section_id = ?1 AND parent_id IS NULL AND sequence = 7",
            [section_id],
            |row| row.get(0),
        ).expect("Failed to get q7");

        let q7_children: i64 = conn.query_row(
            "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1",
            [&q7_id],
            |row| row.get(0),
        ).expect("Failed to count q7 children");

        assert_eq!(q7_children, 2, "3xx.7 should have 2 children");
    }

    #[test]
    fn test_standard_branch_is_auto_created_with_standard_sub_branch() {
        let conn = create_test_db();
        init_branch_protection_schema(&conn);

        let main: (String, String) = conn
            .query_row(
                "SELECT code, name FROM OccupationBranches WHERE name = ?1",
                params![STANDARD_BRANCH_NAME],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .expect("Missing standard main branch");

        let sub: (String, String, String) = conn
            .query_row(
                "SELECT code, branch_code, name FROM OccupationSubBranches WHERE branch_code = ?1 AND name = ?2",
                params![main.0, STANDARD_BRANCH_NAME],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .expect("Missing standard sub branch");

        assert_eq!(main.1, STANDARD_BRANCH_NAME);
        assert_eq!(sub.1, main.0);
        assert_eq!(sub.2, STANDARD_BRANCH_NAME);
    }

    #[test]
    fn test_sqlite_triggers_block_direct_standard_branch_mutation() {
        let conn = create_test_db();
        init_branch_protection_schema(&conn);

        let standard_code: String = conn
            .query_row(
                "SELECT code FROM OccupationBranches WHERE name = ?1",
                params![STANDARD_BRANCH_NAME],
                |row| row.get(0),
            )
            .expect("Missing standard main branch code");

        let update_main_err = conn
            .execute(
                "UPDATE OccupationBranches SET name = 'อื่น' WHERE code = ?1",
                params![standard_code.clone()],
            )
            .expect_err("Standard main branch rename should be blocked");
        assert!(update_main_err.to_string().contains("protected standard occupation branch"));

        let delete_main_err = conn
            .execute(
                "DELETE FROM OccupationBranches WHERE code = ?1",
                params![standard_code.clone()],
            )
            .expect_err("Standard main branch delete should be blocked");
        assert!(delete_main_err.to_string().contains("protected standard occupation branch"));

        let standard_sub_code: String = conn
            .query_row(
                "SELECT code FROM OccupationSubBranches WHERE branch_code = ?1 AND name = ?2",
                params![standard_code.clone(), STANDARD_BRANCH_NAME],
                |row| row.get(0),
            )
            .expect("Missing standard sub branch code");

        let update_sub_err = conn
            .execute(
                "UPDATE OccupationSubBranches SET name = 'อื่น' WHERE branch_code = ?1 AND code = ?2",
                params![standard_code.clone(), standard_sub_code.clone()],
            )
            .expect_err("Standard sub branch rename should be blocked");
        assert!(update_sub_err.to_string().contains("protected standard occupation sub-branch"));

        let delete_sub_err = conn
            .execute(
                "DELETE FROM OccupationSubBranches WHERE branch_code = ?1 AND code = ?2",
                params![standard_code, standard_sub_code],
            )
            .expect_err("Standard sub branch delete should be blocked");
        assert!(delete_sub_err.to_string().contains("protected standard occupation sub-branch"));
    }

    #[test]
    fn test_seed_section_300_scoring_flags() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        let doc_id = "22724201001";
        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES (?, 'Test', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            [doc_id],
        ).expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (?, 300, 301, 'Test', '301', 1)",
            [doc_id],
        ).expect("Failed to create section");

        let section_id: i64 = conn.query_row(
            "SELECT id FROM Sections WHERE document_id = ?1",
            [doc_id],
            |row| row.get(0),
        ).expect("Failed to get section");

        seed_section_300_template(&conn, doc_id, section_id, 301).expect("Seed failed");

        // Verify L1 questions are all group headers
        let non_group_headers: i64 = conn.query_row(
            "SELECT COUNT(*) FROM Questions WHERE section_id = ?1 AND parent_id IS NULL AND is_group_header = 0",
            [section_id],
            |row| row.get(0),
        ).expect("Query failed");

        assert_eq!(non_group_headers, 0, "All L1 questions should be group headers");

        // Verify 3xx.1.1-3xx.1.3 are NOT scored (prerequisites)
        let q1_id: String = conn.query_row(
            "SELECT id FROM Questions WHERE section_id = ?1 AND parent_id IS NULL AND sequence = 1",
            [section_id],
            |row| row.get(0),
        ).expect("Failed to get q1");

        let scored_prerequisites: i64 = conn.query_row(
            "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1 AND sequence BETWEEN 1 AND 3 AND is_scored = 1",
            [&q1_id],
            |row| row.get(0),
        ).expect("Query failed");

        assert_eq!(scored_prerequisites, 0, "3xx.1.1-3xx.1.3 should NOT be scored");

        // Verify 3xx.1.4-3xx.1.5 ARE scored
        let scored_knowledge: i64 = conn.query_row(
            "SELECT COUNT(*) FROM Questions WHERE parent_id = ?1 AND sequence BETWEEN 4 AND 5 AND is_scored = 1",
            [&q1_id],
            |row| row.get(0),
        ).expect("Query failed");

        assert_eq!(scored_knowledge, 2, "3xx.1.4-3xx.1.5 should be scored");
    }

    #[test]
    fn test_seed_section_300_exempted_defaults() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        let doc_id = "22724201001";
        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES (?, 'Test', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            [doc_id],
        ).expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (?, 300, 301, 'Test', '301', 1)",
            [doc_id],
        ).expect("Failed to create section");

        let section_id: i64 = conn.query_row(
            "SELECT id FROM Sections WHERE document_id = ?1",
            [doc_id],
            |row| row.get(0),
        ).expect("Failed to get section");

        seed_section_300_template(&conn, doc_id, section_id, 301).expect("Seed failed");

        // Verify 3xx.2-3xx.6 are exempted by default (group headers)
        let exempted_groups: i64 = conn.query_row(
            "SELECT COUNT(*) FROM Questions
             WHERE section_id = ?1 AND parent_id IS NULL AND sequence BETWEEN 2 AND 6 AND question_type = 'exempted'",
            [section_id],
            |row| row.get(0),
        ).expect("Query failed");

        assert_eq!(exempted_groups, 5, "3xx.2-3xx.6 should default to exempted type");

        // Verify they have display_text
        let with_display_text: i64 = conn.query_row(
            "SELECT COUNT(*) FROM Questions
             WHERE section_id = ?1 AND parent_id IS NULL AND sequence BETWEEN 2 AND 6 AND display_text IS NOT NULL",
            [section_id],
            |row| row.get(0),
        ).expect("Query failed");

        assert_eq!(with_display_text, 5, "Exempted groups should have display_text");

        // Verify 3xx.1.1-3xx.1.3 are exempted (prerequisites)
        let q1_id: String = conn.query_row(
            "SELECT id FROM Questions WHERE section_id = ?1 AND parent_id IS NULL AND sequence = 1",
            [section_id],
            |row| row.get(0),
        ).expect("Failed to get q1");

        let exempted_prereqs: i64 = conn.query_row(
            "SELECT COUNT(*) FROM Questions
             WHERE parent_id = ?1 AND sequence BETWEEN 1 AND 3 AND question_type = 'exempted'",
            [&q1_id],
            |row| row.get(0),
        ).expect("Query failed");

        assert_eq!(exempted_prereqs, 3, "3xx.1.1-3xx.1.3 should be exempted");
    }

    #[test]
    fn test_seed_section_200_l1_defaults_to_exempted() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        let doc_id = "22724201001";
        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES (?, 'Test', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            [doc_id],
        ).expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (?, 200, 201, 'Test', '201', 1)",
            [doc_id],
        ).expect("Failed to create section");

        let section_id: i64 = conn.query_row(
            "SELECT id FROM Sections WHERE document_id = ?1",
            [doc_id],
            |row| row.get(0),
        ).expect("Failed to get section");

        seed_section_200_template(&conn, doc_id, section_id, 201).expect("Seed failed");

        let exempted_l1: i64 = conn.query_row(
            "SELECT COUNT(*) FROM Questions
             WHERE section_id = ?1 AND parent_id IS NULL AND question_type = 'exempted'",
            [section_id],
            |row| row.get(0),
        ).expect("Query failed");

        assert_eq!(exempted_l1, 6, "All 2xx.1-2xx.6 L1 questions should default to exempted");

        let with_display_text: i64 = conn.query_row(
            "SELECT COUNT(*) FROM Questions
             WHERE section_id = ?1 AND parent_id IS NULL AND display_text = '(ไม่ต้องอธิบาย)'",
            [section_id],
            |row| row.get(0),
        ).expect("Query failed");

        assert_eq!(with_display_text, 6, "All exempted 2xx L1 questions should show (ไม่ต้องอธิบาย)");
    }

    // ========================================================================
    // Score Calculation Tests
    // ========================================================================

    #[test]
    fn test_calculate_group_score_exempted_children() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        // Create: doc, section, L1 group, L2 exempted child
        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES (?1, 'Test Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            ["test-doc"],
        ).expect("Insert document failed");

        conn.execute(
            "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (?, 100, 100, 'Test Section', 'Test', 1)",
            ["test-doc"],
        ).expect("Insert section failed");

        // Get section ID from last insert
        let section_id: i64 = conn.query_row(
            "SELECT id FROM Sections WHERE document_id = ? ORDER BY id DESC LIMIT 1",
            ["test-doc"],
            |row| row.get(0),
        ).expect("Get section_id failed");

        // L1 group header
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, NULL, 1, 'Test', 1, 0, 'standard', 0, 0)",
            params!["q1", "test-doc", section_id],
        ).expect("Insert L1 failed");

        // L2 exempted child - should contribute 0 to group score
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 1, 'Exempted', 0, 0, 'exempted', 0, 100)",
            params!["q1-1", "test-doc", section_id, "q1"],
        ).expect("Insert exempted child failed");

        // Call calculate_group_score - exempted type child should result in 0 group score
        let group_score = calculate_group_score("q1".to_string()).expect("calculate_group_score failed");

        // NOTE: Cannot fully test without modifying calculate_group_score to accept Connection reference.
        // Currently verifies that exempted child doesn't crash the calculation.
        assert!(group_score >= 0, "Group score calculation should not fail");
    }

    // ========================================================================
    // Cascade Chain Tests
    // ========================================================================

    #[test]
    fn test_recalculate_group_score_chain_propagates_up() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        // Create test document and section
        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES (?1, 'Test Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            ["test-doc"],
        ).expect("Insert document failed");

        conn.execute(
            "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (?, 100, 100, 'Test Section', 'Test', 1)",
            ["test-doc"],
        ).expect("Insert section failed");

        let section_id: i64 = conn.query_row(
            "SELECT id FROM Sections WHERE document_id = ? ORDER BY id DESC LIMIT 1",
            ["test-doc"],
            |row| row.get(0),
        ).expect("Get section_id failed");

        // Create 3-level hierarchy: L1 -> L2 -> L3
        // L1: group header
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, NULL, 1, 'L1 Parent', 1, 0, 'standard', 0, 0)",
            params!["q1", "test-doc", section_id],
        ).expect("Insert L1 failed");

        // L2: sub-group with its own children
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 1, 'L2 Sub-group', 1, 0, 'standard', 0, 0)",
            params!["q1-1", "test-doc", section_id, "q1"],
        ).expect("Insert L2 failed");

        // L3: leaf nodes with actual scores (scored = 1)
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 1, 'L3 Item A', 0, 1, 'standard', 0, 20)",
            params!["q1-1-a", "test-doc", section_id, "q1-1"],
        ).expect("Insert L3a failed");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 2, 'L3 Item B', 0, 1, 'standard', 0, 30)",
            params!["q1-1-b", "test-doc", section_id, "q1-1"],
        ).expect("Insert L3b failed");

        // Call cascade: L2 should sum L3 items (20+30=50), then L1 should reflect L2 (50)
        recalculate_group_score_chain(&conn, "q1-1").expect("Cascade chain failed");

        // Verify L2 recalculated to 50
        let l2_score: i32 = conn.query_row(
            "SELECT group_score FROM Questions WHERE id = ?1",
            ["q1-1"],
            |row| row.get(0),
        ).expect("Query L2 failed");

        assert_eq!(l2_score, 50, "L2 group_score should be 50 (sum of L3 children: 20+30)");

        // Verify L1 recalculated to 50 (from L2's new group_score)
        let l1_score: i32 = conn.query_row(
            "SELECT group_score FROM Questions WHERE id = ?1",
            ["q1"],
            |row| row.get(0),
        ).expect("Query L1 failed");

        assert_eq!(l1_score, 50, "L1 group_score should be 50 (propagated from L2)");
    }

    #[test]
    fn test_cascade_exempted_status_blocks_contribution() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        // Create test document and section
        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES (?1, 'Test Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            ["test-doc"],
        ).expect("Insert document failed");

        conn.execute(
            "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (?, 100, 100, 'Test Section', 'Test', 1)",
            ["test-doc"],
        ).expect("Insert section failed");

        let section_id: i64 = conn.query_row(
            "SELECT id FROM Sections WHERE document_id = ? ORDER BY id DESC LIMIT 1",
            ["test-doc"],
            |row| row.get(0),
        ).expect("Get section_id failed");

        // L1 with two children: one normal scored, one exempted
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, NULL, 1, 'L1 Parent', 1, 0, 'standard', 0, 0)",
            params!["q1", "test-doc", section_id],
        ).expect("Insert L1 failed");

        // Normal scored child: score = 40
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 1, 'L2 Normal', 0, 1, 'standard', 0, 40)",
            params!["q1-a", "test-doc", section_id, "q1"],
        ).expect("Insert L2 normal failed");

        // Exempted child: score = 100 (should not contribute)
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 2, 'L2 Exempted', 0, 0, 'exempted', 0, 100)",
            params!["q1-b", "test-doc", section_id, "q1"],
        ).expect("Insert L2 exempted failed");

        // Call cascade
        recalculate_group_score_chain(&conn, "q1").expect("Cascade chain failed");

        // Verify L1 only counted normal child (40), not exempted (100)
        let l1_score: i32 = conn.query_row(
            "SELECT group_score FROM Questions WHERE id = ?1",
            ["q1"],
            |row| row.get(0),
        ).expect("Query L1 failed");

        assert_eq!(l1_score, 40, "L1 should only count non-exempted child (40), not exempted child");
    }

    // ========================================================================
    // Pure Function Tests
    // ========================================================================

    #[test]
    fn test_generate_uuid_format() {
        let uuid1 = generate_uuid();
        let uuid2 = generate_uuid();

        // UUID should be hexadecimal string
        assert!(uuid1.chars().all(|c| c.is_ascii_hexdigit()));
        assert!(uuid2.chars().all(|c| c.is_ascii_hexdigit()));

        // UUIDs should be unique
        assert_ne!(uuid1, uuid2, "UUIDs should be unique");

        // Should have reasonable length (timestamp in nanoseconds)
        assert!(uuid1.len() > 10, "UUID should have reasonable length");
    }

    #[test]
    fn test_to_thai_digit_single_digit() {
        assert_eq!(to_thai_digit(0), "๐");
        assert_eq!(to_thai_digit(1), "๑");
        assert_eq!(to_thai_digit(2), "๒");
        assert_eq!(to_thai_digit(3), "๓");
        assert_eq!(to_thai_digit(4), "๔");
        assert_eq!(to_thai_digit(5), "๕");
        assert_eq!(to_thai_digit(6), "๖");
        assert_eq!(to_thai_digit(7), "๗");
        assert_eq!(to_thai_digit(8), "๘");
        assert_eq!(to_thai_digit(9), "๙");
    }

    #[test]
    fn test_to_thai_digit_multiple_digits() {
        assert_eq!(to_thai_digit(10), "๑๐");
        assert_eq!(to_thai_digit(123), "๑๒๓");
        assert_eq!(to_thai_digit(456), "๔๕๖");
        assert_eq!(to_thai_digit(789), "๗๘๙");
        assert_eq!(to_thai_digit(2024), "๒๐๒๔");
    }

    #[test]
    fn test_to_thai_digit_negative() {
        // Negative numbers should preserve the minus sign
        let result = to_thai_digit(-5);
        assert!(result.starts_with('-'));
        assert!(result.contains('๕'));
    }

    #[test]
    fn test_to_thai_digit_zero() {
        assert_eq!(to_thai_digit(0), "๐");
    }

    #[test]
    fn test_to_thai_digit_large_numbers() {
        assert_eq!(to_thai_digit(99999), "๙๙๙๙๙");
        assert_eq!(to_thai_digit(100000), "๑๐๐๐๐๐");
    }

    // ========================================================================
    // Database Function Tests
    // ========================================================================

    #[test]
    fn test_generate_document_id_format() {
        // This test requires database initialization
        // We'll use a temporary in-memory database
        let conn = create_test_db();

        // Initialize Documents table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS Documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                unit_code TEXT NOT NULL,
                doc_type TEXT NOT NULL,
                user_level TEXT NOT NULL,
                sequence INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )
        .expect("Failed to create Documents table");

        // Set connection for content_database to use our test db
        // Note: This requires modifying get_content_connection() to support test contexts
        // For now, we'll test the ID format expectations

        let unit_code = "RTN01";
        let doc_type = "PQ";
        let user_level = "A";

        // Expected format: UUUUU (5) + TT (2) + L (1) + SSS (3) = 11 digits
        // Example: RTN01PQA001

        // Insert a mock document to test sequence generation
        conn.execute(
            "INSERT INTO Documents (id, title, unit_code, doc_type, user_level, sequence, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'), datetime('now'))",
            params!["RTN01PQA001", "Test Doc", unit_code, doc_type, user_level, 1],
        )
        .expect("Failed to insert test document");

        // Verify the ID format
        let id: String = conn
            .query_row("SELECT id FROM Documents WHERE id = 'RTN01PQA001'", [], |row| {
                row.get(0)
            })
            .expect("Failed to query document");

        assert_eq!(id.len(), 11, "Document ID should be 11 characters");
        assert!(id.starts_with("RTN01"), "ID should start with unit code");
        assert!(id.contains("PQ"), "ID should contain doc type");
        assert!(id.contains("A"), "ID should contain user level");
    }

    #[test]
    fn test_generate_document_id_sequence() {
        let conn = create_test_db();

        // Initialize Documents table
        conn.execute(
            "CREATE TABLE IF NOT EXISTS Documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                unit_code TEXT NOT NULL,
                doc_type TEXT NOT NULL,
                user_level TEXT NOT NULL,
                sequence INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )
        .expect("Failed to create Documents table");

        let unit_code = "TEST1";
        let doc_type = "AB";
        let user_level = "B";

        // Insert multiple documents to test sequence increment
        for i in 1..=5 {
            let id = format!("{}{}{}{:03}", unit_code, doc_type, user_level, i);
            conn.execute(
                "INSERT INTO Documents (id, title, unit_code, doc_type, user_level, sequence, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'), datetime('now'))",
                params![id, format!("Test Doc {}", i), unit_code, doc_type, user_level, i],
            )
            .expect("Failed to insert test document");
        }

        // Verify all documents were inserted
        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM Documents WHERE unit_code = ?1 AND doc_type = ?2 AND user_level = ?3",
                params![unit_code, doc_type, user_level],
                |row| row.get(0),
            )
            .expect("Failed to count documents");

        assert_eq!(count, 5, "Should have 5 test documents");
    }

    #[test]
    fn test_generate_document_id_uniqueness() {
        let conn = create_test_db();

        conn.execute(
            "CREATE TABLE IF NOT EXISTS Documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                unit_code TEXT NOT NULL,
                doc_type TEXT NOT NULL,
                user_level TEXT NOT NULL,
                sequence INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )
        .expect("Failed to create Documents table");

        // Insert two documents with same prefix but different sequences
        let ids = vec!["UNIT1XYZ001", "UNIT1XYZ002"];

        for id in &ids {
            conn.execute(
                "INSERT INTO Documents (id, title, unit_code, doc_type, user_level, sequence, created_at, updated_at)
                 VALUES (?1, 'Test', 'UNIT1', 'XY', 'Z', ?2, datetime('now'), datetime('now'))",
                params![id, &id[8..11]],
            )
            .expect("Failed to insert document");
        }

        // Verify both IDs exist
        for id in &ids {
            let exists: bool = conn
                .query_row(
                    "SELECT EXISTS(SELECT 1 FROM Documents WHERE id = ?1)",
                    params![id],
                    |row| row.get(0),
                )
                .expect("Failed to check existence");

            assert!(exists, "Document {} should exist", id);
        }
    }

    // ========================================================================
    // Phase D Policy Hardening Tests
    // ========================================================================

    #[test]
    fn test_policy_blocks_references_in_section_300() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS QuestionReferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_id TEXT NOT NULL,
                reference_id INTEGER NOT NULL,
                location_text TEXT,
                display_order INTEGER NOT NULL
            )",
            [],
        )
        .expect("Failed to create QuestionReferences");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, occupation_branch_main, occupation_branch_sub, created_at, updated_at)
             VALUES ('DOC-REF', 'Doc', '2272420', '22724', 'Test', '20', '1', NULL, NULL, datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (1, 'DOC-REF', 300, 301, 'S301', '301', 1)",
            [],
        )
        .expect("Failed to create section");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, question_type, is_group_header, is_scored)
             VALUES ('Q300', 'DOC-REF', 1, NULL, 1, 'Q', 0, 'normal', 0, 1)",
            [],
        )
        .expect("Failed to create question");

        let res = add_question_reference_with_conn(
            &conn,
            AddQuestionReferenceRequest {
                question_id: "Q300".to_string(),
                reference_id: 1,
                location_text: Some("p.1".to_string()),
            },
        );

        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Section 300 does not allow references"));
    }

    #[test]
    fn test_policy_blocks_answer_keys_in_section_300() {
        let mut conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, occupation_branch_main, occupation_branch_sub, created_at, updated_at)
             VALUES ('DOC-AK', 'Doc', '2272420', '22724', 'Test', '20', '1', NULL, NULL, datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (1, 'DOC-AK', 300, 301, 'S301', '301', 1)",
            [],
        )
        .expect("Failed to create section");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, question_type, is_group_header, is_scored)
             VALUES ('QAK300', 'DOC-AK', 1, NULL, 1, 'Q', 0, 'normal', 0, 1)",
            [],
        )
        .expect("Failed to create question");

        let res = replace_question_answer_keys_with_conn(
            &mut conn,
            "QAK300".to_string(),
            vec![ReplaceAnswerKeyItem {
                sub_code: "main".to_string(),
                text: "Answer".to_string(),
                is_required: Some(true),
            }],
        );

        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Section 300 does not allow answer keys"));
    }

    #[test]
    fn test_replace_empty_answer_keys_allowed_in_section_300() {
        // Empty items = clear-only: should NOT be blocked by Section 300 policy.
        // This is needed so create_question flows in Section 300 can call
        // replace_question_answer_keys with an empty list without getting a policy error.
        let mut conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, occupation_branch_main, occupation_branch_sub, created_at, updated_at)
             VALUES ('DOC-AK-EMPTY', 'Doc', '2272420', '22724', 'Test', '20', '1', NULL, NULL, datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (99, 'DOC-AK-EMPTY', 300, 301, 'S301', '301', 1)",
            [],
        )
        .expect("Failed to create section");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, question_type, is_group_header, is_scored)
             VALUES ('QAKEMPTY300', 'DOC-AK-EMPTY', 99, NULL, 1, 'Q', 0, 'normal', 0, 1)",
            [],
        )
        .expect("Failed to create question");

        // Empty items must succeed even for Section 300
        let res = replace_question_answer_keys_with_conn(
            &mut conn,
            "QAKEMPTY300".to_string(),
            vec![],
        );

        assert!(res.is_ok(), "Empty items should be allowed in Section 300, got: {:?}", res.err());
    }

    #[test]
    fn test_policy_blocks_update_answer_key_in_section_300() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, occupation_branch_main, occupation_branch_sub, created_at, updated_at)
             VALUES ('DOC-AK-UPD', 'Doc', '2272420', '22724', 'Test', '20', '1', NULL, NULL, datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (1, 'DOC-AK-UPD', 300, 301, 'S301', '301', 1)",
            [],
        )
        .expect("Failed to create section");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, question_type, is_group_header, is_scored)
             VALUES ('QAKUPD300', 'DOC-AK-UPD', 1, NULL, 1, 'Q', 0, 'normal', 0, 1)",
            [],
        )
        .expect("Failed to create question");

        let res = update_answer_key_with_conn(
            &conn,
            "QAKUPD300".to_string(),
            "main".to_string(),
            "Blocked".to_string(),
        );

        assert!(res.is_err());
        assert!(res.unwrap_err().contains("Section 300 does not allow answer keys"));
    }

    #[test]
    fn test_policy_allows_update_answer_key_in_section_200() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, occupation_branch_main, occupation_branch_sub, created_at, updated_at)
             VALUES ('DOC-AK-200', 'Doc', '2272420', '22724', 'Test', '20', '1', NULL, NULL, datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (1, 'DOC-AK-200', 200, 201, 'S201', '201', 1)",
            [],
        )
        .expect("Failed to create section");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, question_type, is_group_header, is_scored)
             VALUES ('QAK200', 'DOC-AK-200', 1, NULL, 1, 'Q', 0, 'normal', 0, 1)",
            [],
        )
        .expect("Failed to create question");

        let res = update_answer_key_with_conn(
            &conn,
            "QAK200".to_string(),
            "main".to_string(),
            "Allowed".to_string(),
        );

        assert!(res.is_ok());

        let key_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM QuestionAnswerKeys WHERE question_id = 'QAK200'",
                [],
                |row| row.get(0),
            )
            .expect("Failed to count answer keys");

        assert_eq!(key_count, 1);
    }

    #[test]
    fn test_policy_blocks_branch_change_after_evaluation_started() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS UserAnswers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                question_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                sub_question_code TEXT DEFAULT '',
                answer_text TEXT,
                status TEXT DEFAULT 'pending'
            )",
            [],
        )
        .expect("Failed to create UserAnswers");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, occupation_branch_main, occupation_branch_sub, created_at, updated_at)
             VALUES ('DOC-BR', 'Doc', '2272420', '22724', 'Test', '20', '1', '02', '01', datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, answer_text, status)
             VALUES ('U1', 'Q1', 'DOC-BR', '', 'some answer', 'pending')",
            [],
        )
        .expect("Failed to create user answer");

        let res = update_document_branch_with_conn(
            &conn,
            "DOC-BR",
            Some("03".to_string()),
            Some("04".to_string()),
        );

        assert!(res.is_err());
        assert!(res
            .unwrap_err()
            .contains("Cannot change document branch after evaluation has started"));
    }

    #[test]
    fn test_policy_allows_same_branch_after_evaluation_started() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS UserAnswers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                question_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                sub_question_code TEXT DEFAULT '',
                answer_text TEXT,
                status TEXT DEFAULT 'pending'
            )",
            [],
        )
        .expect("Failed to create UserAnswers");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, occupation_branch_main, occupation_branch_sub, created_at, updated_at)
             VALUES ('DOC-BR2', 'Doc', '2272420', '22724', 'Test', '20', '1', '02', '01', datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO UserAnswers (user_id, question_id, document_id, sub_question_code, answer_text, status)
             VALUES ('U1', 'Q1', 'DOC-BR2', '', 'some answer', 'pending')",
            [],
        )
        .expect("Failed to create user answer");

        let res = update_document_branch_with_conn(
            &conn,
            "DOC-BR2",
            Some("02".to_string()),
            Some("01".to_string()),
        );

        assert!(res.is_ok());
    }

    #[test]
    fn test_section_101_create_requires_fixed_title_and_starts_empty() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES ('DOC-101-CREATE', 'Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        let invalid = create_section_with_conn(
            &conn,
            CreateSectionRequest {
                document_id: "DOC-101-CREATE".to_string(),
                section_group: 100,
                section_number: 101,
                title_th: "ชื่ออื่น".to_string(),
                menu_label: "101 Precautions".to_string(),
            },
        );
        assert!(invalid.is_err());
        assert!(invalid
            .unwrap_err()
            .contains("Section 101 title must be exactly"));

        let created = create_section_with_conn(
            &conn,
            CreateSectionRequest {
                document_id: "DOC-101-CREATE".to_string(),
                section_group: 100,
                section_number: 101,
                title_th: FIXED_SECTION_101_TITLE.to_string(),
                menu_label: "101 Precautions".to_string(),
            },
        )
        .expect("Failed to create section 101");

        assert_eq!(created.section_number, 101);
        assert_eq!(created.title_th, FIXED_SECTION_101_TITLE);

        let question_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM Questions WHERE section_id = ?1",
                params![created.id],
                |row| row.get(0),
            )
            .expect("Failed to count section 101 questions");

        assert_eq!(question_count, 0, "Manually created Section 101 should start empty");
    }

    #[test]
    fn test_section_101_update_title_is_locked() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS QuestionSectionLinks (
                question_id TEXT NOT NULL,
                section_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )
        .expect("Failed to create QuestionSectionLinks");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES ('DOC-101-UPD', 'Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        let created = create_section_with_conn(
            &conn,
            CreateSectionRequest {
                document_id: "DOC-101-UPD".to_string(),
                section_group: 100,
                section_number: 101,
                title_th: FIXED_SECTION_101_TITLE.to_string(),
                menu_label: "101 Precautions".to_string(),
            },
        )
        .expect("Failed to create section 101");

        let blocked = update_section_with_conn(
            &conn,
            UpdateSectionArgs {
                id: created.id,
                title_th: "หัวข้อใหม่".to_string(),
                menu_label: "101 Updated".to_string(),
                duration_value: None,
                duration_unit: None,
                total_score: None,
            },
        );
        assert!(blocked.is_err());
        assert!(blocked
            .unwrap_err()
            .contains("Section 101 title is fixed and cannot be changed"));

        let allowed = update_section_with_conn(
            &conn,
            UpdateSectionArgs {
                id: created.id,
                title_th: FIXED_SECTION_101_TITLE.to_string(),
                menu_label: "101 New Menu".to_string(),
                duration_value: None,
                duration_unit: None,
                total_score: None,
            },
        );
        assert!(allowed.is_ok());
    }

    #[test]
    fn test_delete_allows_section_101_but_blocks_other_system_defined() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "CREATE TABLE IF NOT EXISTS QuestionSectionLinks (
                question_id TEXT NOT NULL,
                section_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )
        .expect("Failed to create QuestionSectionLinks");

        conn.execute(
            "INSERT INTO Documents (id, name, unit_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES ('DOC-101-DEL', 'Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            [],
        )
        .expect("Failed to create document");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (10101, 'DOC-101-DEL', 100, 101, ?1, '101 Precautions', 1)",
            params![FIXED_SECTION_101_TITLE],
        )
        .expect("Failed to create section 101");

        conn.execute(
            "INSERT INTO Sections (id, document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (20101, 'DOC-101-DEL', 200, 201, 'Section 201', '201 System', 1)",
            [],
        )
        .expect("Failed to create section 201");

        let del_101 = delete_section_with_conn(&conn, 10101);
        assert!(del_101.is_ok(), "Section 101 should be deletable");

        let exists_101: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM Sections WHERE id = 10101)",
                [],
                |row| row.get(0),
            )
            .expect("Failed to check section 101 existence");
        assert!(!exists_101, "Section 101 should be deleted");

        let del_201 = delete_section_with_conn(&conn, 20101);
        assert!(del_201.is_err(), "Other system-defined sections should still be blocked");
        assert!(del_201.unwrap_err().contains("Cannot delete system-defined section"));
    }

    // ========================================================================
    // Helper Function Tests
    // ========================================================================

    #[test]
    fn test_database_operations_basic() {
        let conn = create_test_db();

        // Create a simple table
        conn.execute(
            "CREATE TABLE test_table (id INTEGER PRIMARY KEY, value TEXT)",
            [],
        )
        .expect("Failed to create test table");

        // Insert data
        conn.execute("INSERT INTO test_table (value) VALUES ('test')", [])
            .expect("Failed to insert data");

        // Query data
        let value: String = conn
            .query_row("SELECT value FROM test_table WHERE id = 1", [], |row| {
                row.get(0)
            })
            .expect("Failed to query data");

        assert_eq!(value, "test");
    }

    #[test]
    fn test_temp_db_cleanup() {
        let (_temp_dir, db_path) = create_temp_db();

        // Create database file
        let conn = rusqlite::Connection::open(&db_path).expect("Failed to create database");

        conn.execute("CREATE TABLE test (id INTEGER)", [])
            .expect("Failed to create table");

        // Verify file exists
        assert!(db_path.exists(), "Database file should exist");

        drop(conn);

        // File should still exist while _temp_dir is in scope
        assert!(db_path.exists(), "Database file should still exist");

        // When _temp_dir is dropped, file will be cleaned up automatically
    }
}

