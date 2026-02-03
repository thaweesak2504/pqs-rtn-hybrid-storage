use std::path::PathBuf;
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

/// Get connection to content database
pub fn get_content_connection() -> SqlResult<Connection> {
    let db_path = get_content_database_path().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_ERROR),
        Some(e)
    ))?;
    
    let conn = Connection::open(db_path)?;
    
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

    // Initialize Questions, Choices, References tables
    initialize_question_tables(&conn)?;

    Ok("Content database initialized successfully".to_string())
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
    name_part: Option<String>
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
    
    query.push_str(" ORDER BY created_at DESC LIMIT 100"); // Sort by newest first, limit results

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
        "UPDATE Documents SET name = ?1, applied_to = ?2, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
        params![args.name, args.applied_to, args.id]
    ).map_err(|e| format!("Failed to update document: {}", e))?;
    
    Ok(format!("Document {} updated successfully", args.id))
}

// ==========================================
// Advanced Question Logic & References
// ==========================================

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct Question {
    pub id: String, // UUID-like string
    pub document_id: String,
    pub parent_id: Option<String>,
    pub sequence: i32,
    pub content: String,
    pub is_header: bool,
    pub description: Option<String>,
    pub metadata: Option<String>, // JSON string
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

#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct Reference {
    pub id: i32,
    pub document_id: String,
    pub content: String,
    pub sequence: i32,
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
    conn.execute(
        "CREATE TABLE IF NOT EXISTS Questions (
            id TEXT PRIMARY KEY,
            document_id VARCHAR(11) NOT NULL,
            parent_id TEXT,
            sequence INT NOT NULL,
            content TEXT NOT NULL,
            is_header BOOLEAN DEFAULT 0,
            description TEXT,
            metadata TEXT,
            FOREIGN KEY(document_id) REFERENCES Documents(id) ON DELETE CASCADE,
            FOREIGN KEY(parent_id) REFERENCES Questions(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create Questions table: {}", e))?;

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

    // References Table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS References (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id VARCHAR(11) NOT NULL,
            content TEXT NOT NULL,
            sequence INT NOT NULL,
            FOREIGN KEY(document_id) REFERENCES Documents(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create References table: {}", e))?;

    Ok(())
}

/// Seed template questions for a new document
pub fn seed_document_template(conn: &Connection, doc_id: &str, unit_name: &str) -> Result<(), String> {
    // 100 Introduction
    let q100_id = generate_uuid();
    conn.execute(
        "INSERT INTO Questions (id, document_id, sequence, content, is_header) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![q100_id, doc_id, 100, "100 Introduction", true]
    ).map_err(|e| format!("Failed to seed 100: {}", e))?;

    // 200 System Description (Using unit name as placeholder context)
    let q200_id = format!("{:x}2", SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos());
    conn.execute(
        "INSERT INTO Questions (id, document_id, sequence, content, is_header) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![q200_id, doc_id, 200, format!("200 System Description ({})", unit_name), true]
    ).map_err(|e| format!("Failed to seed 200: {}", e))?;

    // 300 Operations
    let q300_id = format!("{:x}3", SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos());
    conn.execute(
        "INSERT INTO Questions (id, document_id, sequence, content, is_header) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![q300_id, doc_id, 300, "300 Operations", true]
    ).map_err(|e| format!("Failed to seed 300: {}", e))?;

    Ok(())
}

use std::time::SystemTime;

pub fn get_document_questions(doc_id: String) -> Result<Vec<Question>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, document_id, parent_id, sequence, content, is_header, description, metadata 
         FROM Questions WHERE document_id = ?1 ORDER BY sequence"
    ).map_err(|e| format!("Failed to prepare query: {}", e))?;

    let question_iter = stmt.query_map(params![doc_id], |row| {
        Ok(Question {
            id: row.get(0)?,
            document_id: row.get(1)?,
            parent_id: row.get(2)?,
            sequence: row.get(3)?,
            content: row.get(4)?,
            is_header: row.get(5)?,
            description: row.get(6)?,
            metadata: row.get(7)?,
        })
    }).map_err(|e| format!("Query map failed: {}", e))?;

    let mut questions = Vec::new();
    for q in question_iter {
        questions.push(q.map_err(|e| format!("Row error: {}", e))?);
    }

    Ok(questions)
}

#[derive(serde::Deserialize)]
pub struct CreateQuestionArgs {
    pub document_id: String,
    pub parent_id: Option<String>,
    pub content: String,
    pub is_header: bool,
    pub sequence: Option<i32>,
}

pub fn create_question(args: CreateQuestionArgs) -> Result<String, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    let id = generate_uuid();
    // Default sequence: Max + 1
    let sequence = if let Some(seq) = args.sequence {
        seq
    } else {
        // Find max sequence in this context
        let sql = if args.parent_id.is_some() {
            "SELECT MAX(sequence) FROM Questions WHERE parent_id = ?1"
        } else {
            "SELECT MAX(sequence) FROM Questions WHERE document_id = ?1 AND parent_id IS NULL"
        };
        
        let param = if let Some(pid) = &args.parent_id { pid.clone() } else { args.document_id.clone() };
        
        let max_seq: Option<i32> = conn.query_row(sql, params![param], |row| row.get(0)).unwrap_or(None);
        max_seq.unwrap_or(0) + 1
    };

    conn.execute(
        "INSERT INTO Questions (id, document_id, parent_id, sequence, content, is_header) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, args.document_id, args.parent_id, sequence, args.content, args.is_header]
    ).map_err(|e| format!("Failed to insert question: {}", e))?;

    Ok(id)
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
