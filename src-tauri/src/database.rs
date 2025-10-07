use std::path::PathBuf;
use rusqlite::{Connection, Result as SqlResult, params};
use tauri::api::path::app_data_dir;
use tauri::Config;
use serde::{Deserialize, Serialize};
use crate::logger;
// use crate::database_logger::{DB_LOGGER, DatabaseOperation}; // DISABLED - logging removed

// Global flag to prevent multiple database initialization
// static INIT_ONCE: Once = Once::new();

// User and Avatar structs
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    pub id: Option<i32>,
    pub username: String,
    pub email: String,
    pub password_hash: String,
    pub full_name: String,
    pub rank: Option<String>,
    pub role: String,
    pub is_active: bool,
    pub avatar_path: Option<String>,
    pub avatar_updated_at: Option<String>,
    pub avatar_mime: Option<String>,
    pub avatar_size: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

// DEPRECATED: Avatar struct - now using file-based storage
// This struct is kept for backward compatibility but should not be used
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Avatar {
    pub id: Option<i32>,
    pub user_id: i32,
    pub avatar_data: Vec<u8>,
    pub mime_type: String,
    pub file_size: i32,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

// DEPRECATED: Avatar validation functions - now using file-based storage
// These functions are kept for backward compatibility but should not be used
// DEPRECATED: MAX_AVATAR_SIZE removed - now using file-based storage

// DEPRECATED: validate_avatar_data function removed - now using file-based storage

// DEPRECATED: string_to_rusqlite_error function removed - now using file-based storage

// SQLite database operations
pub fn get_database_path() -> Result<PathBuf, String> {
    let app_data = app_data_dir(&Config::default())
        .ok_or("Failed to get app data directory")?;
    
    let db_dir = app_data.join("pqs-rtn-hybrid-storage");
    std::fs::create_dir_all(&db_dir)
        .map_err(|e| format!("Failed to create database directory: {}", e))?;
    
    Ok(db_dir.join("database.db"))
}

/// Get connection to existing database or create new one
/// WARNING: This will CREATE a new empty database file if it doesn't exist!
/// Use get_connection_readonly() if you only want to check without creating.
/// Use get_connection_safe() to prevent accidental database creation.
pub fn get_connection() -> SqlResult<Connection> {
    let db_path = get_database_path().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_ERROR),
        Some(e)
    ))?;
    
    let conn = Connection::open(db_path)?;
    
    // Enhanced SQLite configuration for desktop performance
    conn.execute("PRAGMA foreign_keys = ON", [])?;
    // Note: journal_mode can only be set on new databases
    // conn.execute("PRAGMA journal_mode = WAL", [])?; // Write-Ahead Logging for better concurrency
    conn.execute("PRAGMA synchronous = NORMAL", [])?; // Balance between safety and performance
    // Note: cache_size can only be set on new databases
    // conn.execute("PRAGMA cache_size = 10000", [])?; // Larger cache for better performance
    conn.execute("PRAGMA temp_store = MEMORY", [])?; // Use memory for temporary tables
    // Note: mmap_size and page_size can only be set on new databases
    // conn.execute("PRAGMA mmap_size = 268435456", [])?; // 256MB memory-mapped I/O
    // conn.execute("PRAGMA page_size = 4096", [])?; // 4KB page size for better performance
    // Note: auto_vacuum can only be set on new databases
    // conn.execute("PRAGMA auto_vacuum = INCREMENTAL", [])?; // Incremental vacuum for maintenance
    
    Ok(conn)
}

/// Safe wrapper for get_connection() that checks if database exists first
/// Returns error if database doesn't exist instead of creating an empty file
pub fn get_connection_safe() -> SqlResult<Connection> {
    let db_path = get_database_path().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_ERROR),
        Some(e)
    ))?;
    
    // Check if database file exists
    if !db_path.exists() {
        logger::warn("Database file does not exist - rejecting connection request");
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
            Some("Database not initialized. Please complete app initialization first.".to_string())
        ));
    }
    
    // Check if file is not empty
    let file_size = std::fs::metadata(&db_path)
        .map_err(|e| rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
            Some(format!("Cannot check database file: {}", e))
        ))?
        .len();
    
    if file_size == 0 {
        logger::warn("Database file is empty - removing and rejecting connection");
        let _ = std::fs::remove_file(&db_path);
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
            Some("Database file is empty. Please complete app initialization first.".to_string())
        ));
    }
    
    // Database exists and has content - safe to open
    // Use READWRITE mode (not CREATE) to avoid creating new file if it was deleted
    let conn = Connection::open_with_flags(
        &db_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_WRITE
    )?;
    
    // Apply same SQLite configuration as get_connection()
    conn.execute("PRAGMA foreign_keys = ON", [])?;
    conn.execute("PRAGMA synchronous = NORMAL", [])?;
    conn.execute("PRAGMA temp_store = MEMORY", [])?;
    
    Ok(conn)
}

/// Get read-only connection to database WITHOUT creating it if it doesn't exist
/// Returns error if database doesn't exist
pub fn get_connection_readonly() -> SqlResult<Connection> {
    let db_path = get_database_path().map_err(|e| rusqlite::Error::SqliteFailure(
        rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_ERROR),
        Some(e)
    ))?;
    
    // Check if file exists first
    if !db_path.exists() {
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
            Some("Database file does not exist".to_string())
        ));
    }
    
    // Open with read-only flag
    Connection::open_with_flags(
        db_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY
    )
}

pub fn initialize_database() -> Result<String, String> {
    logger::debug("Starting database initialization...");
    
    // Initialize database with comprehensive error handling
    match initialize_database_internal() {
        Ok(msg) => {
            Ok(msg)
        },
        Err(e) => {
            logger::critical(&format!("Database initialization failed: {}", e));
            logger::error("This may prevent the application from functioning correctly");
            Err(format!("Database initialization failed: {}", e))
        }
    }
}

/// Check if database exists and is valid (has required tables and data)
pub fn check_database_exists_and_valid() -> Result<bool, String> {
    let db_path = get_database_path()?;
    
    // Check if database file exists FIRST before trying to open it
    // Important: Connection::open() will CREATE an empty file if it doesn't exist!
    if !db_path.exists() {
        logger::debug("Database file does not exist");
        return Ok(false);
    }
    
    // Check if the file has content (not empty)
    let file_size = std::fs::metadata(&db_path)
        .map_err(|e| format!("Failed to check database file size: {}", e))?
        .len();
    
    if file_size == 0 {
        logger::warn("Database file exists but is empty (0 bytes) - removing it");
        // Delete the empty file so it doesn't interfere with initialization
        if let Err(e) = std::fs::remove_file(&db_path) {
            logger::error(&format!("Failed to remove empty database file: {}", e));
        }
        return Ok(false);
    }
    
    // Try to connect and check if database is valid
    // Use read-only connection to avoid creating/modifying the database
    match get_connection_readonly() {
        Ok(conn) => {
            // Check if required tables exist
            let users_table_exists = conn.query_row::<i32, _, _>(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users'",
                [],
                |row| Ok(row.get(0)?)
            ).unwrap_or(0) > 0;
            
            let officers_table_exists = conn.query_row::<i32, _, _>(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='high_ranking_officers'",
                [],
                |row| Ok(row.get(0)?)
            ).unwrap_or(0) > 0;
            
            // Check if admin user exists
            let admin_exists = conn.query_row::<i32, _, _>(
                "SELECT COUNT(*) FROM users WHERE role = 'admin'",
                [],
                |row| Ok(row.get(0)?)
            ).unwrap_or(0) > 0;
            
            let is_valid = users_table_exists && officers_table_exists && admin_exists;
            
            if is_valid {
                logger::debug("Database exists and is valid");
                Ok(true)
            } else {
                logger::warn("Database exists but is missing required tables or data");
                Ok(false)
            }
        },
        Err(e) => {
            logger::warn(&format!("Database exists but cannot connect: {}", e));
            Ok(false)
        }
    }
}

fn initialize_database_internal() -> Result<String, String> {
    // Use get_connection() here because we WANT to create a new database file
    let conn = get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    // Log database initialization - DISABLED
    // let _ = DB_LOGGER.log_table_change(
    //     DatabaseOperation::AlterTable,
    //     "database".to_string(),
    //     "Initializing database - checking and creating tables if needed".to_string()
    // );
    
    // Check if old users table exists and migrate if needed
    let table_exists = conn.query_row::<i32, _, _>(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users'",
        [],
        |row| Ok(row.get(0)?)
    ).unwrap_or(0) > 0;
    
    if table_exists {
        // Check if migration is needed - use a different approach
        let mut stmt = conn.prepare("PRAGMA table_info(users)").map_err(|e| format!("Failed to prepare pragma statement: {}", e))?;
        let mut has_username = false;
        let rows = stmt.query_map([], |row| {
            let name: String = row.get(1)?;
            Ok(name)
        }).map_err(|e| format!("Failed to query table info: {}", e))?;
        
        for row in rows {
            if let Ok(column_name) = row {
                if column_name == "username" {
                    has_username = true;
                    break;
                }
            }
        }
        
        if !has_username {
            // Migrate old table to new schema
            conn.execute("ALTER TABLE users RENAME TO users_old", [])
                .map_err(|e| format!("Failed to rename old users table: {}", e))?;
        }
    }
    
    // Create users table with new schema
    // let _ = DB_LOGGER.log_table_change(
    //     DatabaseOperation::CreateTable,
    //     "users".to_string(),
    //     "Creating users table with new schema".to_string()
    // );
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            rank TEXT,
            role TEXT NOT NULL DEFAULT 'visitor',
            is_active BOOLEAN NOT NULL DEFAULT 1,
            avatar_path TEXT,
            avatar_updated_at DATETIME,
            avatar_mime TEXT,
            avatar_size INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| format!("Failed to create users table: {}", e))?;
    
    // Create avatars table
    // let _ = DB_LOGGER.log_table_change(
    //     DatabaseOperation::CreateTable,
    //     "avatars".to_string(),
    //     "Creating avatars table".to_string()
    // );
    
    // Avatars table removed - now using file-based storage in media/avatars/ folder
    // The users table has avatar_path field for file-based avatar storage
    
    // Create high_ranking_officers table with file-based avatar support (if not exists)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS high_ranking_officers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            thai_name TEXT NOT NULL,
            position_thai TEXT NOT NULL,
            position_english TEXT NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0,
            avatar_path TEXT,
            avatar_updated_at DATETIME,
            avatar_mime TEXT,
            avatar_size INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| format!("Failed to create high_ranking_officers table: {}", e))?;
    
    // High ranking avatars table removed - now using file-based storage in media/high_ranks/ folder
    // The high_ranking_officers table has avatar_path field for file-based avatar storage
    
    
    // Check if admin user already exists
    let admin_exists = conn.query_row::<i32, _, _>(
        "SELECT COUNT(*) FROM users WHERE role = 'admin'",
        [],
        |row| Ok(row.get(0)?)
    ).unwrap_or(0) > 0;
    
    if !admin_exists {
        // Hash the admin password before storing
        let admin_password_hash = bcrypt::hash("Admin&21", bcrypt::DEFAULT_COST)
            .map_err(|e| format!("Failed to hash admin password: {}", e))?;
        
        // Insert new admin user with hashed password
        conn.execute(
            "INSERT INTO users (username, email, password_hash, full_name, rank, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
            params!["admin", "admin@pqs-rtn.com", admin_password_hash, "System Administrator", "ร.ต.", "admin", true],
        ).map_err(|e| format!("Failed to insert new admin user: {}", e))?;
    }
    
    // Insert default high ranking officers if they don't exist
    insert_default_high_ranking_officers(&conn)?;
    
    // Migrate existing plain text passwords to hashed passwords
    // migrate_plain_text_passwords(&conn)?; // DISABLED - causing issues
    
    Ok("Database initialized successfully".to_string())
}

// Function to migrate plain text passwords to hashed passwords
pub fn migrate_plain_text_passwords(conn: &rusqlite::Connection) -> Result<(), String> {
    // First check if users table exists
    let table_exists = conn.query_row::<i32, _, _>(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users'",
        [],
        |row| Ok(row.get(0)?)
    ).unwrap_or(0) > 0;
    
    if !table_exists {
        // No users table, nothing to migrate
        return Ok(());
    }
    
    // Check if there are any users with plain text passwords (not starting with $2b$)
    let mut stmt = conn.prepare("SELECT id, password_hash FROM users WHERE password_hash NOT LIKE '$2b$%'")
        .map_err(|e| format!("Failed to prepare migration statement: {}", e))?;
    
    let rows = stmt.query_map([], |row| {
        Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?))
    }).map_err(|e| format!("Failed to query users for migration: {}", e))?;
    
    let mut migrated_count = 0;
    for row in rows {
        let (user_id, plain_password) = row.map_err(|e| format!("Failed to read user data: {}", e))?;
        
        // Hash the plain text password
        let hashed_password = bcrypt::hash(&plain_password, bcrypt::DEFAULT_COST)
            .map_err(|e| format!("Failed to hash password for user {}: {}", user_id, e))?;
        
        // Update the user with hashed password
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            params![hashed_password, user_id]
        ).map_err(|e| format!("Failed to update password for user {}: {}", user_id, e))?;
        
        migrated_count += 1;
    }
    
    if migrated_count > 0 {
        println!("✅ Migrated {} plain text passwords to hashed passwords", migrated_count);
    }
    
    Ok(())
}

pub fn get_all_users() -> Result<Vec<User>, String> {
    let conn = get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    let mut stmt = conn.prepare("SELECT id, username, email, password_hash, full_name, rank, role, is_active, avatar_path, avatar_updated_at, avatar_mime, avatar_size, created_at, updated_at FROM users")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let user_iter = stmt.query_map([], |row| {
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
    }).map_err(|e| format!("Failed to query users: {}", e))?;
    
    let mut users = Vec::new();
    for user in user_iter {
        users.push(user.map_err(|e| format!("Failed to parse user: {}", e))?);
    }
    
    Ok(users)
}

pub fn get_user_by_id(id: i32) -> Result<Option<User>, String> {
    let conn = get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    let mut stmt = conn.prepare("SELECT id, username, email, password_hash, full_name, rank, role, is_active, avatar_path, avatar_updated_at, avatar_mime, avatar_size, created_at, updated_at FROM users WHERE id = ?")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let user = stmt.query_row(params![id], |row| {
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
    
    match user {
        Ok(user) => Ok(Some(user)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to query user: {}", e)),
    }
}

pub fn get_user_by_email(email: &str) -> Result<Option<User>, String> {
    let conn = get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    let mut stmt = conn.prepare("SELECT id, username, email, password_hash, full_name, rank, role, is_active, avatar_path, avatar_updated_at, avatar_mime, avatar_size, created_at, updated_at FROM users WHERE email = ?")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let user = stmt.query_row(params![email], |row| {
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
    
    match user {
        Ok(user) => Ok(Some(user)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to query user: {}", e)),
    }
}

pub fn create_user(username: &str, email: &str, password_hash: &str, full_name: &str, rank: Option<&str>, role: &str) -> Result<User, String> {
    let conn = get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    conn.execute(
        "INSERT INTO users (username, email, password_hash, full_name, rank, role, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)",
        params![username, email, password_hash, full_name, rank, role, true],
    ).map_err(|e| format!("Failed to create user: {}", e))?;
    
    let user_id = conn.last_insert_rowid() as i32;
    
    // Log user creation - DISABLED
    // let _ = DB_LOGGER.log_user_operation(
    //     DatabaseOperation::InsertUser,
    //     Some(user_id),
    //     format!("Created user: {} ({}) with role: {}", username, email, role)
    // );
    
    // Get the created user
    get_user_by_id(user_id)?
        .ok_or_else(|| "Failed to retrieve created user".to_string())
}

pub fn update_user(id: i32, username: &str, email: &str, password_hash: &str, full_name: &str, rank: Option<&str>, role: &str) -> Result<User, String> {
    let conn = get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    conn.execute(
        "UPDATE users SET username = ?, email = ?, password_hash = ?, full_name = ?, rank = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![username, email, password_hash, full_name, rank, role, id],
    ).map_err(|e| format!("Failed to update user: {}", e))?;
    
    // Log user update - DISABLED
    // let _ = DB_LOGGER.log_user_operation(
    //     DatabaseOperation::UpdateUser,
    //     Some(id),
    //     format!("Updated user: {} ({}) with role: {}", username, email, role)
    // );
    
    // Get the updated user
    get_user_by_id(id)?
        .ok_or_else(|| "User not found after update".to_string())
}

pub fn delete_user(id: i32) -> Result<bool, String> {
    let conn = get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    // Check if user exists before deletion
    let user_exists: bool = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?)",
        params![id],
        |row| Ok(row.get(0)?)
    ).map_err(|e| format!("Failed to check if user exists: {}", e))?;
    
    if !user_exists {
        return Ok(false); // User doesn't exist
    }
    
    // Check user role before deletion
    let user_role: String = conn.query_row(
        "SELECT role FROM users WHERE id = ?",
        params![id],
        |row| Ok(row.get(0)?)
    ).map_err(|e| format!("Failed to get user role: {}", e))?;
    
    // Prevent deletion of admin users
    if user_role == "admin" {
        return Err("Cannot delete admin users".to_string());
    }
    
    // Ensure foreign keys are enabled
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;
    
    // Delete user - this should cascade to avatars table
    let rows_affected = conn.execute(
        "DELETE FROM users WHERE id = ?",
        params![id],
    ).map_err(|e| format!("Failed to delete user: {}", e))?;
    
    // Avatar cleanup is now handled by file-based storage system
    // No need to manually delete from avatars table since it's removed
    
    Ok(rows_affected > 0)
}

// Clean up orphaned avatars (avatars without corresponding users) - DEPRECATED
// Now using file-based storage, this function is no longer needed
pub fn cleanup_orphaned_avatars() -> Result<i32, String> {
    // No-op since we're using file-based storage now
    Ok(0)
}

pub fn authenticate_user(username_or_email: &str, password: &str) -> Result<Option<User>, String> {
    let conn = get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    let mut stmt = conn.prepare("SELECT id, username, email, password_hash, full_name, rank, role, is_active, avatar_path, avatar_updated_at, avatar_mime, avatar_size, created_at, updated_at FROM users WHERE (email = ? OR username = ?) AND is_active = 1")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let user = stmt.query_row(params![username_or_email, username_or_email], |row| {
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
    
    match user {
        Ok(user) => {
            // Verify the provided password against the stored hash
            if bcrypt::verify(password, &user.password_hash).map_err(|e| format!("Password verification failed: {}", e))? {
                Ok(Some(user))
            } else {
                Ok(None) // Password does not match
            }
        },
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None), // User not found
        Err(e) => Err(format!("Failed to query user: {}", e)),
    }
}

// DEPRECATED: get_all_avatars - now using file-based storage
pub fn get_all_avatars() -> Result<Vec<Avatar>, String> {
    // Return empty vector since we're using file-based storage now
    Ok(Vec::new())
}

// DEPRECATED: get_avatar_by_user_id - now using file-based storage
pub fn get_avatar_by_user_id(_user_id: i32) -> Result<Option<Avatar>, String> {
    // Return None since we're using file-based storage now
    Ok(None)
}

// DEPRECATED: save_avatar - now using file-based storage
pub fn save_avatar(_user_id: i32, _avatar_data: Vec<u8>, _mime_type: &str) -> Result<Avatar, String> {
    // Return error since we're using file-based storage now
    Err("Avatar storage is now file-based. Use Hybrid Avatar System instead.".to_string())
}

// DEPRECATED: delete_avatar - now using file-based storage
pub fn delete_avatar(_user_id: i32) -> Result<bool, String> {
    // Return false since we're using file-based storage now
    Ok(false)
}


// High Ranking Officers structs and functions
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HighRankingOfficer {
    pub id: Option<i32>,
    pub thai_name: String,
    pub position_thai: String,
    pub position_english: String,
    pub order_index: i32,
    pub created_at: String,
    pub updated_at: String,
}

// DEPRECATED: HighRankingAvatar struct removed
// Now using file-based storage with HybridHighRankAvatarInfo


// Insert default high ranking officers
pub fn insert_default_high_ranking_officers(conn: &rusqlite::Connection) -> Result<(), String> {
    // Check if officers already exist
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM high_ranking_officers",
        [],
        |row| Ok(row.get(0)?)
    ).map_err(|e| format!("Failed to check existing officers: {}", e))?;
    
    if count > 0 {
        return Ok(()); // Officers already exist
    }
    
    let officers = vec![
        ("พลเรือเอก จิรพล ว่องวิทย์", "ผู้บัญชาการทหารเรือ", "Commander-in-Chief, Royal Thai Navy", 1),
        ("พลเรือเอก ชลธิศ นาวานุเคราะห์", "รองผู้บัญชาการทหารเรือ", "Deputy Commander-in-Chief, Royal Thai Navy", 2),
        ("พลเรือเอก ณัฏฐพล เดี่ยววานิช", "ผู้บัญชาการกองเรือยุทธการ", "Commander, Royal Thai Fleet", 3),
    ];
    
    for (thai_name, position_thai, position_english, order_index) in officers {
        conn.execute(
            "INSERT INTO high_ranking_officers (thai_name, position_thai, position_english, order_index) VALUES (?, ?, ?, ?)",
            params![thai_name, position_thai, position_english, order_index],
        ).map_err(|e| format!("Failed to insert officer {}: {}", thai_name, e))?;
    }
    
    Ok(())
}

// Get all high ranking officers
pub fn get_all_high_ranking_officers() -> Result<Vec<HighRankingOfficer>, String> {
    let conn = get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    let mut stmt = conn.prepare("SELECT id, thai_name, position_thai, position_english, order_index, created_at, updated_at FROM high_ranking_officers ORDER BY order_index")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let officer_iter = stmt.query_map([], |row| {
        Ok(HighRankingOfficer {
            id: Some(row.get(0)?),
            thai_name: row.get(1)?,
            position_thai: row.get(2)?,
            position_english: row.get(3)?,
            order_index: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| format!("Failed to query officers: {}", e))?;
    
    let mut officers = Vec::new();
    for officer in officer_iter {
        officers.push(officer.map_err(|e| format!("Failed to read officer: {}", e))?);
    }
    
    Ok(officers)
}

// DEPRECATED: save_high_ranking_avatar function removed
// Now using file-based storage with save_hybrid_high_rank_avatar command

// DEPRECATED: get_high_ranking_avatar_by_officer_id function removed
// Now using file-based storage with get_hybrid_high_rank_avatar_info command

// Update high ranking officer
pub fn update_high_ranking_officer(id: i32, thai_name: &str, position_thai: &str, position_english: &str, order_index: i32) -> Result<HighRankingOfficer, String> {
    let conn = get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    
    // Update the officer
    conn.execute(
        "UPDATE high_ranking_officers SET thai_name = ?, position_thai = ?, position_english = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![thai_name, position_thai, position_english, order_index, id],
    ).map_err(|e| format!("Failed to update officer: {}", e))?;
    
    // Get the updated officer
    let mut stmt = conn.prepare("SELECT id, thai_name, position_thai, position_english, order_index, created_at, updated_at FROM high_ranking_officers WHERE id = ?")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let officer = stmt.query_row(params![id], |row| {
        Ok(HighRankingOfficer {
            id: Some(row.get(0)?),
            thai_name: row.get(1)?,
            position_thai: row.get(2)?,
            position_english: row.get(3)?,
            order_index: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| format!("Failed to retrieve updated officer: {}", e))?;
    
    Ok(officer)
}
