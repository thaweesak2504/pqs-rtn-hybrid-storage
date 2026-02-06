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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(document_id, section_number),
            FOREIGN KEY (document_id) REFERENCES Documents(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create Sections table: {}", e))?;

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

    // Auto-create Section 101 (System-defined: Precautions)
    conn.execute(
        "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, display_order, is_system_defined)
         VALUES (?1, 100, 101, 'ข้อควรระมัดระวังอันตรายพื้นฐาน', '101 Precautions', 1, 1)",
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
    pub section_id: Option<i64>,
    pub parent_id: Option<String>,
    pub sequence: i32,
    pub content: String,
    pub is_header: bool,
    pub description: Option<String>,
    pub answer_type: Option<String>,
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
#[derive(serde::Serialize, serde::Deserialize, Debug)]
pub struct QuestionReference {
    pub id: i32,
    pub question_id: String,
    pub reference_id: i64,
    pub location_text: Option<String>,
    pub display_order: i32,
}

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
    // Updated to include section_id and answer_type
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
            FOREIGN KEY(document_id) REFERENCES Documents(id) ON DELETE CASCADE,
            FOREIGN KEY(parent_id) REFERENCES Questions(id) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create Questions table: {}", e))?;

    // Migration: Add new columns if missing (swallow errors if they exist)
    let _ = conn.execute("ALTER TABLE Questions ADD COLUMN section_id INTEGER", []);
    let _ = conn.execute("ALTER TABLE Questions ADD COLUMN answer_type VARCHAR(20) DEFAULT 'text'", []);

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

    // References Table - Reusable reference documents
    conn.execute(
        "CREATE TABLE IF NOT EXISTS DocumentReferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code VARCHAR(50) NOT NULL UNIQUE,
            title TEXT NOT NULL,
            short_name TEXT,
            category VARCHAR(50),
            is_common BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| format!("Failed to create DocumentReferences table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_doc_refs_code ON DocumentReferences(code)",
        [],
    ).map_err(|e| format!("Failed to create index on DocumentReferences.code: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_doc_refs_common ON DocumentReferences(is_common)",
        [],
    ).map_err(|e| format!("Failed to create index on DocumentReferences.is_common: {}", e))?;

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
        "SELECT id, document_id, section_id, parent_id, sequence, content, is_header, description, answer_type, metadata 
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
        "SELECT id, document_id, section_id, parent_id, sequence, content, is_header, description, answer_type, metadata 
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
                    dr.id, dr.code, dr.title, dr.short_name, dr.category, dr.is_common, dr.created_at, dr.updated_at
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
                    short_name: row.get(8)?,
                    category: row.get(9)?,
                    is_common: row.get(10)?,
                    created_at: row.get(11)?,
                    updated_at: row.get(12)?,
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
    pub document_id: String,
    pub section_id: Option<i64>,
    pub parent_id: Option<String>,
    pub content: String,
    pub is_header: bool,
    pub sequence: Option<i32>,
    pub answer_type: Option<String>,
    pub metadata: Option<String>,
}

fn sync_question_references(conn: &Connection, question_id: &str, metadata_json: Option<&str>) -> Result<(), String> {
    // 1. Always clear existing references first (simplest strategy for both create and update)
    conn.execute("DELETE FROM QuestionReferences WHERE question_id = ?1", params![question_id])
        .map_err(|e| e.to_string())?;

    // 2. Insert new references if metadata exists
    if let Some(json_str) = metadata_json {
        // Access serde_json directly. If not imported, we use full path.
        // Assuming serde_json crate is available.
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(json_str) {
            if let Some(refs) = v.get("references").and_then(|r| r.as_array()) {
                for (idx, r) in refs.iter().enumerate() {
                    // Extract fields. Be robust against missing/wrong types.
                    if let Some(ref_id) = r.get("id").and_then(|i| i.as_i64()) {
                        let page = r.get("page").and_then(|s| s.as_str()).unwrap_or("-");
                        
                        conn.execute(
                            "INSERT INTO QuestionReferences (question_id, reference_id, location_text, display_order)
                             VALUES (?1, ?2, ?3, ?4)",
                            params![question_id, ref_id, page, idx + 1]
                        ).map_err(|e| e.to_string())?;
                    }
                }
            }
        }
    }
    Ok(())
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
        "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, metadata) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![
            id, 
            args.document_id, 
            args.section_id, 
            args.parent_id, 
            sequence, 
            args.content, 
            args.is_header, 
            args.answer_type.unwrap_or("text".to_string()),
            args.metadata
        ]
    )
    .map_err(|e| e.to_string())?;

    // SYNC References from Metadata
    sync_question_references(&conn, &id, args.metadata.as_deref())?;

    Ok(id)
}

#[derive(serde::Deserialize)]
pub struct UpdateQuestionArgs {
    pub id: String,
    pub content: String,
    pub metadata: Option<String>,
}

pub fn update_question(args: UpdateQuestionArgs) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE Questions 
         SET content = ?2, metadata = ?3 
         WHERE id = ?1",
        params![
            args.id, 
            args.content, 
            args.metadata
        ]
    )
    .map_err(|e| e.to_string())?;

    // SYNC References from Metadata to Table
    sync_question_references(&conn, &args.id, args.metadata.as_deref())?;

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
        Some(pid) => {
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

/// Seed Section 200 Template (2xx.1 - 2xx.6)
fn seed_section_200_template(conn: &Connection, doc_id: &str, section_id: i64, section_num: i32) -> Result<(), String> {
    let p = to_thai_digit(section_num); // e.g. "๒๐๑"

    // Helper closure to insert question
    let insert_q = |parent: Option<String>, seq: i32, content: String, is_header: bool, ans_type: &str| -> Result<String, String> {
        let q_id = generate_uuid();
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![q_id, doc_id, section_id, parent, seq, content, is_header, ans_type]
        ).map_err(|e| e.to_string())?;
        Ok(q_id)
    };

    // 1. Function
    let q1 = insert_q(None, 1, format!("{}.๑ หน้าที่", p), true, "header")?;
    insert_q(Some(q1), 1, format!("{}.๑.๑ ระบบนี้ทำหน้าที่อะไร", p), false, "text")?;

    // 2. Components
    let q2 = insert_q(None, 2, format!("{}.๒ ส่วนประกอบและชิ้นส่วนในส่วนประกอบของระบบ", p), true, "header")?;
    insert_q(Some(q2), 1, "อ้างถึงเอกสารประกอบระบบ หรือตัวอุปกรณ์ เพื่อหาส่วนประกอบและชิ้นส่วนในส่วนประกอบ ดังต่อไปนี้ แล้วตอบคําถามที่กําหนด".to_string(), false, "info")?;

    // 3. Principles
    let q3 = insert_q(None, 3, format!("{}.๓ หลักการทํางาน", p), true, "header")?;
    insert_q(Some(q3), 1, format!("{}.๓.๑ ส่วนประกอบต่างๆ ทํางานร่วมกันในระบบอย่างไร", p), false, "text")?;

    // 4. Operating Parameters
    insert_q(None, 4, format!("{}.๔ ค่าทํางานปกติ ค่าสูงสุด ต่ำสุด ของการทํางาน", p), true, "text")?;

    // 5. System Interfaces
    insert_q(None, 5, format!("{}.๕ การเชื่อมต่อระบบ", p), true, "text")?;

    // 6. Safety Precautions
    insert_q(None, 6, format!("{}.๖ ข้อระมัดระวังอันตราย", p), true, "text")?;

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

/// Get sections by document ID
pub fn get_sections_by_document(document_id: String) -> Result<Vec<Section>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    let mut stmt = conn
        .prepare(
            "SELECT id, document_id, section_group, section_number, title_th, menu_label, 
                    display_order, is_system_defined, created_at, updated_at
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
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    
    Ok(sections)
}

/// Delete a section
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
                display_order, is_system_defined, created_at, updated_at
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
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        }
    )
    .map_err(|e| e.to_string())
}

// ===== Reference Management =====

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct DocumentReference {
    pub id: i64,
    pub code: String,
    pub title: String,
    pub short_name: Option<String>,
    pub category: Option<String>,
    pub is_common: bool,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct CreateReferenceRequest {
    pub code: String,
    pub title: String,
    pub short_name: Option<String>,
    pub category: Option<String>,
    pub is_common: bool,
    pub reference_type: Option<String>, // MANUAL, PROC, TM, SAFETY, LINK, OTHER
}

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
}

/// Helper to get Thai letter from display order (1=ก, 2=ข, etc.)
fn get_thai_letter(order: i32) -> String {
    let letters = ["ก", "ข", "ค", "ง", "จ", "ฉ", "ช", "ซ", "ฌ", "ญ"];
    letters
        .get((order - 1) as usize)
        .unwrap_or(&"?")
        .to_string()
}
/// Create a new reference document
pub fn create_reference(request: CreateReferenceRequest) -> Result<DocumentReference, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Auto-generate type-based sequential code if empty
    let final_code = if request.code.trim().is_empty() {
        let prefix = request.reference_type
            .as_ref()
            .and_then(|t| match t.as_str() {
                "MANUAL" => Some("MANUAL"),
                "PROC" => Some("PROC"),
                "TM" => Some("TM"),
                "SAFETY" => Some("SAFETY"),
                "LINK" => Some("LINK"),
                "OTHER" => Some("OTHER"),
                _ => None,
            })
            .unwrap_or("REF");
        
        let pattern = format!("{}_%", prefix);
        let prefix_len = prefix.len() + 1; // prefix + underscore
        
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
        
        format!("{}_{:03}", prefix, max_num + 1)
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
    
    // Insert
    conn.execute(
        "INSERT INTO DocumentReferences (code, title, short_name, category, is_common)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            final_code,
            request.title,
            request.short_name,
            request.category,
            request.is_common,
        ],
    )
    .map_err(|e| e.to_string())?;
    
    let id = conn.last_insert_rowid();
    
    // Return created reference
    get_reference_by_id(&conn, id)
}

/// Get all references (with optional filters)
pub fn get_references(
    search: Option<String>,
    category: Option<String>,
    common_only: bool,
) -> Result<Vec<DocumentReference>, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    let mut sql = "SELECT id, code, title, short_name, category, is_common, created_at, updated_at
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
    
    if common_only {
        sql.push_str(" AND is_common = 1");
    }
    
    sql.push_str(" ORDER BY is_common DESC, title ASC");
    
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    
    let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
    
    let refs = stmt
        .query_map(&params_refs[..], |row| {
            Ok(DocumentReference {
                id: row.get(0)?,
                code: row.get(1)?,
                title: row.get(2)?,
                short_name: row.get(3)?,
                category: row.get(4)?,
                is_common: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    
    Ok(refs)
}

/// Delete a reference (cascades to remove from all sections)
pub fn delete_reference(id: i64) -> Result<(), String> {
    let mut conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    let tx = conn.transaction().map_err(|e| format!("Failed to start transaction: {}", e))?;

    // 1. Remove from all sections first (Cascade logic)
    tx.execute("DELETE FROM SectionReferences WHERE reference_id = ?1", params![id])
        .map_err(|e| format!("Failed to remove reference links: {}", e))?;
    
    // 2. Delete the reference
    tx.execute("DELETE FROM DocumentReferences WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to delete reference: {}", e))?;
    
    tx.commit().map_err(|e| format!("Failed to commit transaction: {}", e))?;
    
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
                    dr.id, dr.code, dr.title, dr.short_name, dr.category, dr.is_common, dr.created_at, dr.updated_at
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
                    short_name: row.get(7)?,
                    category: row.get(8)?,
                    is_common: row.get(9)?,
                    created_at: row.get(10)?,
                    updated_at: row.get(11)?,
                },
                display_order,
                thai_letter: get_thai_letter(display_order),
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    // No need to re-assign if we trust DB display_order matches the visual intent.
    // However, if DB has gaps or 0, it might look weird. 
    // But consistency is key.
    // If we want aesthetic sort, we must update DB display_order to match it.
    // For now, let's fix consistency by respecting DB order.
    
    Ok(refs)
}

/// Helper function to get reference by ID
fn get_reference_by_id(conn: &Connection, id: i64) -> Result<DocumentReference, String> {
    conn.query_row(
        "SELECT id, code, title, short_name, category, is_common, created_at, updated_at
         FROM DocumentReferences WHERE id = ?1",
        params![id],
        |row| {
            Ok(DocumentReference {
                id: row.get(0)?,
                code: row.get(1)?,
                title: row.get(2)?,
                short_name: row.get(3)?,
                category: row.get(4)?,
                is_common: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| e.to_string())
}
