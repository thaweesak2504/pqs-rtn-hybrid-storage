use crate::content_database::connection::{self as db_conn, DbConn};
use crate::content_database::get_content_database_path;
use crate::logger;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand::{rngs::OsRng, RngCore};
use rusqlite::{params, Connection, OptionalExtension, Result as SqlResult, Row};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::time::{SystemTime, UNIX_EPOCH};
// use crate::database_logger::{DB_LOGGER, DatabaseOperation}; // DISABLED - logging removed

// Global flag to prevent multiple database initialization
// static INIT_ONCE: Once = Once::new();

/// Default admin credentials seeded on first launch.
///
/// These are intentionally trivial and documented — they are NOT a secret.
/// The seeded admin has `must_change_password = 1`, so the UI MUST force a
/// password change on first login before any other action is allowed.
/// This pattern guarantees a working admin exists in distributed desktop apps
/// while eliminating the risk of shipping a real hardcoded credential.
pub const DEFAULT_ADMIN_USERNAME: &str = "admin";
pub const DEFAULT_ADMIN_PASSWORD: &str = "admin";
pub const DEFAULT_ADMIN_EMAIL: &str = "admin@pqs-rtn.local";
const AUTH_SESSION_INACTIVITY_TTL_SECONDS: u64 = 30 * 24 * 60 * 60;

#[derive(Debug, Serialize, Clone)]
/// Public authenticated identity paired with an opaque persistent token.
pub struct AuthSession {
    /// Current public user data.
    pub user: User,
    /// Cryptographically random token used to validate the frontend session.
    pub token: String,
}

fn unix_timestamp() -> Result<u64, String> {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .map_err(|e| format!("System clock error: {}", e))
}

fn hash_auth_token(token: &str) -> String {
    URL_SAFE_NO_PAD.encode(Sha256::digest(token.as_bytes()))
}

fn session_expiration(now: u64) -> Result<u64, String> {
    now.checked_add(AUTH_SESSION_INACTIVITY_TTL_SECONDS)
        .ok_or_else(|| "Session expiration overflow".to_string())
}

fn issue_auth_session_with_conn(
    conn: &Connection,
    user: User,
    now: u64,
) -> Result<AuthSession, String> {
    let user_id = user
        .id
        .ok_or_else(|| "Authenticated user has no ID".to_string())?;
    let mut token_bytes = [0u8; 32];
    OsRng.fill_bytes(&mut token_bytes);
    let token = URL_SAFE_NO_PAD.encode(token_bytes);
    let token_hash = hash_auth_token(&token);
    let expires_at = session_expiration(now)?;

    conn.execute(
        "DELETE FROM auth_sessions WHERE expires_at <= ?1",
        params![now],
    )
    .map_err(|error| format!("Failed to clean expired authentication sessions: {}", error))?;
    conn.execute(
        "INSERT INTO auth_sessions (token_hash, user_id, expires_at, created_at, last_used_at)
         VALUES (?1, ?2, ?3, ?4, ?4)",
        params![token_hash, user_id, expires_at, now],
    )
    .map_err(|error| format!("Failed to persist authentication session: {}", error))?;

    Ok(AuthSession { user, token })
}

fn issue_auth_session(user: User) -> Result<AuthSession, String> {
    let conn = get_connection_safe()
        .map_err(|error| format!("Failed to connect to database: {}", error))?;
    issue_auth_session_with_conn(&conn, user, unix_timestamp()?)
}

fn validate_auth_session_with_conn(
    conn: &Connection,
    token: &str,
    now: u64,
) -> Result<Option<i32>, String> {
    if token.len() < 32 {
        return Ok(None);
    }

    let token_hash = hash_auth_token(token);
    conn.execute(
        "DELETE FROM auth_sessions WHERE expires_at <= ?1",
        params![now],
    )
    .map_err(|error| format!("Failed to clean expired authentication sessions: {}", error))?;

    let user_id = conn
        .query_row(
            "SELECT session.user_id
             FROM auth_sessions session
             JOIN users user ON user.id = session.user_id
             WHERE session.token_hash = ?1
               AND session.expires_at > ?2
               AND user.is_active = 1",
            params![token_hash, now],
            |row| row.get::<_, i32>(0),
        )
        .optional()
        .map_err(|error| format!("Failed to validate authentication session: {}", error))?;

    let Some(user_id) = user_id else {
        conn.execute(
            "DELETE FROM auth_sessions WHERE token_hash = ?1",
            params![token_hash],
        )
        .map_err(|error| format!("Failed to revoke invalid authentication session: {}", error))?;
        return Ok(None);
    };

    conn.execute(
        "UPDATE auth_sessions
         SET expires_at = ?1, last_used_at = ?2
         WHERE token_hash = ?3",
        params![session_expiration(now)?, now, token_hash],
    )
    .map_err(|error| format!("Failed to refresh authentication session: {}", error))?;

    Ok(Some(user_id))
}

fn revoke_auth_session_with_conn(conn: &Connection, token: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM auth_sessions WHERE token_hash = ?1",
        params![hash_auth_token(token)],
    )
    .map_err(|error| format!("Failed to revoke authentication session: {}", error))?;
    Ok(())
}

fn revoke_other_auth_sessions_with_conn(
    conn: &Connection,
    user_id: i32,
    current_token: &str,
) -> Result<(), String> {
    conn.execute(
        "DELETE FROM auth_sessions WHERE user_id = ?1 AND token_hash != ?2",
        params![user_id, hash_auth_token(current_token)],
    )
    .map_err(|error| format!("Failed to revoke other authentication sessions: {}", error))?;
    Ok(())
}

/// Public user data returned to the frontend via Tauri commands.
/// Credential material is intentionally absent from this DTO.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    /// Database primary key (`AUTOINCREMENT`). `None` only before insertion.
    pub id: Option<i32>,
    /// Unique login name.
    pub username: String,
    /// Unique email address.
    pub email: String,
    /// Display name (Thai or English).
    pub full_name: String,
    /// Military rank abbreviation, e.g. `"ร.ต."`.
    pub rank: Option<String>,
    /// Role: `"admin"`, `"editor"`, or `"visitor"`.
    pub role: String,
    /// Whether the account is enabled.
    pub is_active: bool,
    /// Relative path to the avatar image file (hybrid storage).
    pub avatar_path: Option<String>,
    /// ISO-8601 timestamp of the last avatar update.
    pub avatar_updated_at: Option<String>,
    /// MIME type of the avatar image, e.g. `"image/png"`.
    pub avatar_mime: Option<String>,
    /// Avatar file size in bytes.
    pub avatar_size: Option<i32>,
    /// ISO-8601 timestamp when the user was created.
    pub created_at: Option<String>,
    /// ISO-8601 timestamp of the last profile update.
    pub updated_at: Option<String>,
    /// When true, the user must change their password before the UI allows
    /// any other operation. Set to 1 for the seeded default admin.
    #[serde(default)]
    pub must_change_password: bool,
}

#[derive(Debug)]
struct CredentialUser {
    password_hash: String,
    user: User,
}

fn public_user_from_row(row: &Row<'_>) -> rusqlite::Result<User> {
    Ok(User {
        id: Some(row.get(0)?),
        username: row.get(1)?,
        email: row.get(2)?,
        full_name: row.get(3)?,
        rank: row.get(4)?,
        role: row.get(5)?,
        is_active: row.get(6)?,
        avatar_path: row.get(7)?,
        avatar_updated_at: row.get(8)?,
        avatar_mime: row.get(9)?,
        avatar_size: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
        must_change_password: row.get::<_, Option<bool>>(13)?.unwrap_or(false),
    })
}

fn credential_user_from_row(row: &Row<'_>) -> rusqlite::Result<CredentialUser> {
    Ok(CredentialUser {
        password_hash: row.get(0)?,
        user: User {
            id: Some(row.get(1)?),
            username: row.get(2)?,
            email: row.get(3)?,
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
            must_change_password: row.get::<_, Option<bool>>(14)?.unwrap_or(false),
        },
    })
}

/// Validate password strength. Returns Ok(()) if acceptable.
///
/// Rules:
/// - Minimum 8 characters
/// - Must not be a known weak password (e.g. "admin", "password", "12345678")
/// - Must not equal the username (when provided)
pub fn validate_password_strength(password: &str, username: Option<&str>) -> Result<(), String> {
    if password.len() < 8 {
        return Err("Password must be at least 8 characters long".to_string());
    }

    let weak_passwords = [
        "admin",
        "password",
        "12345678",
        "qwerty",
        "qwerty12",
        "00000000",
        "11111111",
        "admin123",
        "password1",
    ];
    let lower = password.to_ascii_lowercase();
    if weak_passwords.contains(&lower.as_str()) {
        return Err("Password is too common; please choose something stronger".to_string());
    }

    if let Some(u) = username {
        if !u.is_empty() && u.eq_ignore_ascii_case(password) {
            return Err("Password must not be the same as the username".to_string());
        }
    }

    Ok(())
}

fn validate_user_role(role: &str) -> Result<(), String> {
    if matches!(role, "admin" | "editor" | "visitor") {
        Ok(())
    } else {
        Err("Invalid user role".to_string())
    }
}

// NOTE: the former `ensure_user_schema_migrations` helper has been replaced by
// the versioned migration framework in `src-tauri/src/migrations.rs` (Phase 2).
// Schema evolution now flows through `migrations::run_pending_migrations` and
// is tracked in the `schema_migrations` table.

/// Get a pooled connection to the content database, creating the database
/// file on first use if necessary.
///
/// Phase 2C: this now delegates to the r2d2 pool built in
/// `content_database::connection`. Callers who kept the old `let conn = ...;`
/// pattern work unchanged because `DbConn: Deref<Target = Connection>`.
///
/// WARNING: This will CREATE a new (empty) database file if it doesn't exist.
/// Use `get_connection_readonly()` for existence checks without creating.
/// Use `get_connection_safe()` to refuse to operate on a missing/empty DB.
pub fn get_connection() -> Result<DbConn, String> {
    db_conn::get_content_connection()
}

/// Safe wrapper for `get_connection()` that checks if the database file
/// exists and is non-empty before returning a pooled connection.
///
/// The existence/size guard is retained from the pre-pool implementation to
/// keep the "refuse to silently init against an empty file" behaviour that
/// the rest of the codebase depends on (e.g. startup validation, backup
/// restore flows).
pub fn get_connection_safe() -> Result<DbConn, String> {
    let db_path = get_content_database_path()?;

    if !db_path.exists() {
        logger::warn("Database file does not exist - rejecting connection request");
        return Err(
            "Database not initialized. Please complete app initialization first.".to_string(),
        );
    }

    let file_size = std::fs::metadata(&db_path)
        .map_err(|e| format!("Cannot check database file: {}", e))?
        .len();

    if file_size == 0 {
        logger::warn("Database file is empty - removing and rejecting connection");
        let _ = std::fs::remove_file(&db_path);
        return Err(
            "Database file is empty. Please complete app initialization first.".to_string(),
        );
    }

    db_conn::get_content_connection()
}

/// Get read-only connection to database WITHOUT creating it if it doesn't exist
/// Returns error if database doesn't exist
pub fn get_connection_readonly() -> SqlResult<Connection> {
    let db_path = get_content_database_path().map_err(|e| {
        rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_ERROR),
            Some(e),
        )
    })?;

    // Check if file exists first
    if !db_path.exists() {
        return Err(rusqlite::Error::SqliteFailure(
            rusqlite::ffi::Error::new(rusqlite::ffi::SQLITE_CANTOPEN),
            Some("Database file does not exist".to_string()),
        ));
    }

    // Open with read-only flag
    Connection::open_with_flags(db_path, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)
}

pub fn initialize_database() -> Result<String, String> {
    // Initialize database with comprehensive error handling
    match initialize_database_internal() {
        Ok(msg) => Ok(msg),
        Err(e) => {
            logger::critical(format!("Database initialization failed: {}", e));
            logger::error("This may prevent the application from functioning correctly");
            Err(format!("Database initialization failed: {}", e))
        }
    }
}

/// Check if database exists and is valid (has required tables and data)
pub fn check_database_exists_and_valid() -> Result<bool, String> {
    let db_path = get_content_database_path()?;

    // Check if database file exists FIRST before trying to open it
    // Important: Connection::open() will CREATE an empty file if it doesn't exist!
    if !db_path.exists() {
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
            logger::error(format!("Failed to remove empty database file: {}", e));
        }
        return Ok(false);
    }

    // Try to connect and check if database is valid
    // Use read-only connection to avoid creating/modifying the database
    match get_connection_readonly() {
        Ok(conn) => {
            // Check if required tables exist
            let users_table_exists = conn
                .query_row::<i32, _, _>(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users'",
                    [],
                    |row| row.get(0),
                )
                .unwrap_or(0)
                > 0;

            let officers_table_exists = conn.query_row::<i32, _, _>(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='high_ranking_officers'",
                [],
                |row| row.get(0)
            ).unwrap_or(0) > 0;

            // Check if admin user exists
            let admin_exists = conn
                .query_row::<i32, _, _>(
                    "SELECT COUNT(*) FROM users WHERE role = 'admin'",
                    [],
                    |row| row.get(0),
                )
                .unwrap_or(0)
                > 0;

            let is_valid = users_table_exists && officers_table_exists && admin_exists;

            if is_valid {
                Ok(true)
            } else {
                logger::warn("Database exists but is missing required tables or data");
                Ok(false)
            }
        }
        Err(e) => {
            logger::warn(format!("Database exists but cannot connect: {}", e));
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
    let table_exists = conn
        .query_row::<i32, _, _>(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0)
        > 0;

    if table_exists {
        // Check if migration is needed - use a different approach
        let mut stmt = conn
            .prepare("PRAGMA table_info(users)")
            .map_err(|e| format!("Failed to prepare pragma statement: {}", e))?;
        let mut has_username = false;
        let rows = stmt
            .query_map([], |row| {
                let name: String = row.get(1)?;
                Ok(name)
            })
            .map_err(|e| format!("Failed to query table info: {}", e))?;

        for column_name in rows.flatten() {
            if column_name == "username" {
                has_username = true;
                break;
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
    )
    .map_err(|e| format!("Failed to create users table: {}", e))?;

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
    )
    .map_err(|e| format!("Failed to create high_ranking_officers table: {}", e))?;

    // High ranking avatars table removed - now using file-based storage in media/high_ranks/ folder
    // The high_ranking_officers table has avatar_path field for file-based avatar storage

    // Check if admin user already exists
    let admin_exists = conn
        .query_row::<i32, _, _>(
            "SELECT COUNT(*) FROM users WHERE role = 'admin'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0)
        > 0;

    if !admin_exists {
        // Seed default admin with documented credentials.
        // `must_change_password = 1` forces the UI to prompt a password change
        // on first login — guarantees a usable admin exists without shipping a real secret.
        let admin_password_hash = bcrypt::hash(DEFAULT_ADMIN_PASSWORD, bcrypt::DEFAULT_COST)
            .map_err(|e| format!("Failed to hash admin password: {}", e))?;

        conn.execute(
            "INSERT INTO users (username, email, password_hash, full_name, rank, role, is_active, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
            params![
                DEFAULT_ADMIN_USERNAME,
                DEFAULT_ADMIN_EMAIL,
                admin_password_hash,
                "System Administrator",
                "ร.ต.",
                "admin",
                true
            ],
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
    let table_exists = conn
        .query_row::<i32, _, _>(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='users'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0)
        > 0;

    if !table_exists {
        // No users table, nothing to migrate
        return Ok(());
    }

    // Check if there are any users with plain text passwords (not starting with $2b$)
    let mut stmt = conn
        .prepare("SELECT id, password_hash FROM users WHERE password_hash NOT LIKE '$2b$%'")
        .map_err(|e| format!("Failed to prepare migration statement: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?))
        })
        .map_err(|e| format!("Failed to query users for migration: {}", e))?;

    let mut migrated_count = 0;
    for row in rows {
        let (user_id, plain_password) =
            row.map_err(|e| format!("Failed to read user data: {}", e))?;

        // Hash the plain text password
        let hashed_password = bcrypt::hash(&plain_password, bcrypt::DEFAULT_COST)
            .map_err(|e| format!("Failed to hash password for user {}: {}", user_id, e))?;

        // Update the user with hashed password
        conn.execute(
            "UPDATE users SET password_hash = ? WHERE id = ?",
            params![hashed_password, user_id],
        )
        .map_err(|e| format!("Failed to update password for user {}: {}", user_id, e))?;

        migrated_count += 1;
    }

    if migrated_count > 0 {
        println!(
            "✅ Migrated {} plain text passwords to hashed passwords",
            migrated_count
        );
    }

    Ok(())
}

pub fn get_all_users() -> Result<Vec<User>, String> {
    let conn =
        get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    let mut stmt = conn.prepare("SELECT id, username, email, full_name, rank, role, is_active, avatar_path, avatar_updated_at, avatar_mime, avatar_size, created_at, updated_at, must_change_password FROM users")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let user_iter = stmt
        .query_map([], public_user_from_row)
        .map_err(|e| format!("Failed to query users: {}", e))?;

    let mut users = Vec::new();
    for user in user_iter {
        users.push(user.map_err(|e| format!("Failed to parse user: {}", e))?);
    }

    Ok(users)
}

pub fn get_user_by_id(id: i32) -> Result<Option<User>, String> {
    let conn =
        get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    let mut stmt = conn.prepare("SELECT id, username, email, full_name, rank, role, is_active, avatar_path, avatar_updated_at, avatar_mime, avatar_size, created_at, updated_at, must_change_password FROM users WHERE id = ?")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let user = stmt.query_row(params![id], public_user_from_row);

    match user {
        Ok(user) => Ok(Some(user)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to query user: {}", e)),
    }
}

pub fn get_user_by_email(email: &str) -> Result<Option<User>, String> {
    let conn =
        get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    let mut stmt = conn.prepare("SELECT id, username, email, full_name, rank, role, is_active, avatar_path, avatar_updated_at, avatar_mime, avatar_size, created_at, updated_at, must_change_password FROM users WHERE email = ?")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let user = stmt.query_row(params![email], public_user_from_row);

    match user {
        Ok(user) => Ok(Some(user)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to query user: {}", e)),
    }
}

/// Create a new user. Password is taken as plaintext and hashed server-side.
///
/// Phase 1 security: frontend MUST NOT pass a pre-hashed password. The backend
/// is the single source of truth for password hashing.
pub fn create_user(
    username: &str,
    email: &str,
    password: &str,
    full_name: &str,
    rank: Option<&str>,
    role: &str,
) -> Result<User, String> {
    validate_user_role(role)?;
    // Enforce password strength at the boundary. Admin seeding bypasses this
    // via `create_user_bypass_strength` — regular API calls must meet the bar.
    validate_password_strength(password, Some(username))?;

    let password_hash = bcrypt::hash(password, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Failed to hash password: {}", e))?;

    let conn =
        get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;

    conn.execute(
        "INSERT INTO users (username, email, password_hash, full_name, rank, role, is_active, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
        params![username, email, password_hash, full_name, rank, role, true],
    ).map_err(|e| format!("Failed to create user: {}", e))?;

    let user_id = conn.last_insert_rowid() as i32;

    get_user_by_id(user_id)?.ok_or_else(|| "Failed to retrieve created user".to_string())
}

/// Update user fields. If `new_password` is provided (Some & non-empty), it is
/// validated, hashed, and the `must_change_password` flag is cleared.
/// If `new_password` is None, the existing password hash is preserved.
///
/// Phase 1 security: replaces the old `password_hash: &str` parameter which
/// allowed frontend to write arbitrary hashes.
pub fn update_user(
    id: i32,
    username: &str,
    email: &str,
    new_password: Option<&str>,
    full_name: &str,
    rank: Option<&str>,
    role: &str,
) -> Result<User, String> {
    validate_user_role(role)?;
    let conn =
        get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;

    match new_password {
        Some(pw) if !pw.is_empty() => {
            validate_password_strength(pw, Some(username))?;
            let password_hash = bcrypt::hash(pw, bcrypt::DEFAULT_COST)
                .map_err(|e| format!("Failed to hash password: {}", e))?;
            conn.execute(
                "UPDATE users SET username = ?, email = ?, password_hash = ?, full_name = ?, rank = ?, role = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                params![username, email, password_hash, full_name, rank, role, id],
            ).map_err(|e| format!("Failed to update user: {}", e))?;
        }
        _ => {
            conn.execute(
                "UPDATE users SET username = ?, email = ?, full_name = ?, rank = ?, role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                params![username, email, full_name, rank, role, id],
            ).map_err(|e| format!("Failed to update user: {}", e))?;
        }
    }

    get_user_by_id(id)?.ok_or_else(|| "User not found after update".to_string())
}

/// Change a user's password after verifying the old one.
///
/// Rules:
/// - Verifies `old_password` against stored hash via bcrypt
/// - Validates `new_password` strength (see `validate_password_strength`)
/// - Rejects new_password equal to old_password
/// - Clears `must_change_password` flag on success
pub fn change_password(
    user_id: i32,
    old_password: &str,
    new_password: &str,
    current_session_token: &str,
) -> Result<(), String> {
    if old_password == new_password {
        return Err("New password must be different from the current password".to_string());
    }

    let mut conn =
        get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    let credentials: Option<(String, String)> = conn
        .query_row(
            "SELECT username, password_hash FROM users WHERE id = ?1 AND is_active = 1",
            params![user_id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .optional()
        .map_err(|e| format!("Failed to query user credentials: {}", e))?;
    let (username, password_hash) =
        credentials.ok_or_else(|| "User not found or inactive".to_string())?;

    let ok = bcrypt::verify(old_password, &password_hash)
        .map_err(|e| format!("Password verification failed: {}", e))?;
    if !ok {
        return Err("Current password is incorrect".to_string());
    }

    validate_password_strength(new_password, Some(&username))?;

    let new_hash = bcrypt::hash(new_password, bcrypt::DEFAULT_COST)
        .map_err(|e| format!("Failed to hash password: {}", e))?;

    let transaction = conn
        .transaction()
        .map_err(|e| format!("Failed to start password change: {}", e))?;
    transaction.execute(
        "UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![new_hash, user_id],
    )
    .map_err(|e| format!("Failed to update password: {}", e))?;
    revoke_other_auth_sessions_with_conn(&transaction, user_id, current_session_token)?;
    transaction
        .commit()
        .map_err(|e| format!("Failed to commit password change: {}", e))?;

    Ok(())
}

pub fn delete_user(id: i32) -> Result<bool, String> {
    let conn =
        get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;

    // Check if user exists before deletion
    let user_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM users WHERE id = ?)",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to check if user exists: {}", e))?;

    if !user_exists {
        return Ok(false); // User doesn't exist
    }

    // Check user role before deletion
    let user_role: String = conn
        .query_row("SELECT role FROM users WHERE id = ?", params![id], |row| {
            row.get(0)
        })
        .map_err(|e| format!("Failed to get user role: {}", e))?;

    // Prevent deletion of admin users
    if user_role == "admin" {
        return Err("Cannot delete admin users".to_string());
    }

    // Ensure foreign keys are enabled
    conn.execute("PRAGMA foreign_keys = ON", [])
        .map_err(|e| format!("Failed to enable foreign keys: {}", e))?;

    // Delete user - this should cascade to avatars table
    let rows_affected = conn
        .execute("DELETE FROM users WHERE id = ?", params![id])
        .map_err(|e| format!("Failed to delete user: {}", e))?;

    // Avatar cleanup is now handled by file-based storage system
    // No need to manually delete from avatars table since it's removed

    Ok(rows_affected > 0)
}

pub fn authenticate_user(username_or_email: &str, password: &str) -> Result<Option<User>, String> {
    let conn =
        get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    let mut stmt = conn.prepare("SELECT password_hash, id, username, email, full_name, rank, role, is_active, avatar_path, avatar_updated_at, avatar_mime, avatar_size, created_at, updated_at, must_change_password FROM users WHERE (email = ? OR username = ?) AND is_active = 1")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let user = stmt.query_row(
        params![username_or_email, username_or_email],
        credential_user_from_row,
    );

    match user {
        Ok(credentials) => {
            // Verify the provided password against the stored hash
            if bcrypt::verify(password, &credentials.password_hash)
                .map_err(|e| format!("Password verification failed: {}", e))?
            {
                Ok(Some(credentials.user))
            } else {
                Ok(None) // Password does not match
            }
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None), // User not found
        Err(e) => Err(format!("Failed to query user: {}", e)),
    }
}

/// Verify credentials and create a time-limited backend session.
pub fn authenticate_user_session(
    username_or_email: &str,
    password: &str,
) -> Result<Option<AuthSession>, String> {
    authenticate_user(username_or_email, password)?
        .map(issue_auth_session)
        .transpose()
}

/// Validate a backend-issued token and refresh the user from SQLite.
pub fn validate_auth_session(token: &str) -> Result<Option<User>, String> {
    let conn = get_connection_safe()
        .map_err(|error| format!("Failed to connect to database: {}", error))?;
    let Some(user_id) = validate_auth_session_with_conn(&conn, token, unix_timestamp()?)? else {
        return Ok(None);
    };
    drop(conn);

    let user = get_user_by_id(user_id)?;
    if user.as_ref().is_some_and(|value| value.is_active) {
        Ok(user)
    } else {
        revoke_auth_session(token)?;
        Ok(None)
    }
}

/// Return the authenticated user or a stable authorization error.
pub fn require_auth_session(token: &str) -> Result<User, String> {
    validate_auth_session(token)?.ok_or_else(|| "Authentication required".to_string())
}

/// Require an authenticated user whose role is in `allowed_roles`.
pub fn require_role(token: &str, allowed_roles: &[&str]) -> Result<User, String> {
    let user = require_auth_session(token)?;
    if user.must_change_password {
        return Err("Password change required before this action".to_string());
    }
    if allowed_roles.contains(&user.role.as_str()) {
        Ok(user)
    } else {
        Err("You do not have permission to perform this action".to_string())
    }
}

/// Revoke a backend-issued authentication token.
pub fn revoke_auth_session(token: &str) -> Result<(), String> {
    let conn = get_connection_safe()
        .map_err(|error| format!("Failed to connect to database: {}", error))?;
    revoke_auth_session_with_conn(&conn, token)
}

/// A high-ranking naval officer displayed on the cover page.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HighRankingOfficer {
    /// Database primary key.
    pub id: Option<i32>,
    /// Full name in Thai, e.g. `"พลเรือเอก จิรพล ว่องวิทย์"`.
    pub thai_name: String,
    /// Position title in Thai.
    pub position_thai: String,
    /// Position title in English.
    pub position_english: String,
    /// Display order (1 = Commander-in-Chief, 2 = Deputy, …).
    pub order_index: i32,
    /// ISO-8601 creation timestamp.
    pub created_at: String,
    /// ISO-8601 last-update timestamp.
    pub updated_at: String,
}

// DEPRECATED: HighRankingAvatar struct removed
// Now using file-based storage with HybridHighRankAvatarInfo

// Insert default high ranking officers
pub fn insert_default_high_ranking_officers(conn: &rusqlite::Connection) -> Result<(), String> {
    // Check if officers already exist
    let count: i32 = conn
        .query_row("SELECT COUNT(*) FROM high_ranking_officers", [], |row| {
            row.get(0)
        })
        .map_err(|e| format!("Failed to check existing officers: {}", e))?;

    if count > 0 {
        return Ok(()); // Officers already exist
    }

    let officers = vec![
        (
            "พลเรือเอก จิรพล ว่องวิทย์",
            "ผู้บัญชาการทหารเรือ",
            "Commander-in-Chief, Royal Thai Navy",
            1,
        ),
        (
            "พลเรือเอก ชลธิศ นาวานุเคราะห์",
            "รองผู้บัญชาการทหารเรือ",
            "Deputy Commander-in-Chief, Royal Thai Navy",
            2,
        ),
        (
            "พลเรือเอก ณัฏฐพล เดี่ยววานิช",
            "ผู้บัญชาการกองเรือยุทธการ",
            "Commander, Royal Thai Fleet",
            3,
        ),
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
    let conn =
        get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;

    let mut stmt = conn.prepare("SELECT id, thai_name, position_thai, position_english, order_index, created_at, updated_at FROM high_ranking_officers ORDER BY order_index")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let officer_iter = stmt
        .query_map([], |row| {
            Ok(HighRankingOfficer {
                id: Some(row.get(0)?),
                thai_name: row.get(1)?,
                position_thai: row.get(2)?,
                position_english: row.get(3)?,
                order_index: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed to query officers: {}", e))?;

    let mut officers = Vec::new();
    for officer in officer_iter {
        officers.push(officer.map_err(|e| format!("Failed to read officer: {}", e))?);
    }

    Ok(officers)
}

// Update high ranking officer
pub fn update_high_ranking_officer(
    id: i32,
    thai_name: &str,
    position_thai: &str,
    position_english: &str,
    order_index: i32,
) -> Result<HighRankingOfficer, String> {
    let conn =
        get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;

    // Update the officer
    conn.execute(
        "UPDATE high_ranking_officers SET thai_name = ?, position_thai = ?, position_english = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        params![thai_name, position_thai, position_english, order_index, id],
    ).map_err(|e| format!("Failed to update officer: {}", e))?;

    // Get the updated officer
    let mut stmt = conn.prepare("SELECT id, thai_name, position_thai, position_english, order_index, created_at, updated_at FROM high_ranking_officers WHERE id = ?")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let officer = stmt
        .query_row(params![id], |row| {
            Ok(HighRankingOfficer {
                id: Some(row.get(0)?),
                thai_name: row.get(1)?,
                position_thai: row.get(2)?,
                position_english: row.get(3)?,
                order_index: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed to retrieve updated officer: {}", e))?;

    Ok(officer)
}

#[cfg(test)]
mod tests {
    use super::*;

    // ── validate_password_strength ──────────────────────────────────────

    #[test]
    fn password_strength_rejects_short_passwords() {
        let err = validate_password_strength("short", None).unwrap_err();
        assert!(err.contains("at least 8"), "got: {}", err);
    }

    #[test]
    fn password_strength_rejects_default_admin_password() {
        // The documented default admin password itself must fail strength
        // validation — so the must_change_password flow cannot be bypassed
        // by "changing" to the same password. (The specific reason is
        // incidental: it happens to trip the length check first.)
        assert!(
            validate_password_strength(DEFAULT_ADMIN_PASSWORD, None).is_err(),
            "default admin password must fail strength validation"
        );
    }

    #[test]
    fn password_strength_rejects_common_weak_passwords() {
        for weak in &["password", "12345678", "qwerty12", "admin123"] {
            assert!(
                validate_password_strength(weak, None).is_err(),
                "expected weak password '{}' to be rejected",
                weak
            );
        }
    }

    #[test]
    fn password_strength_rejects_password_equal_to_username() {
        let err = validate_password_strength("johndoe1", Some("johndoe1")).unwrap_err();
        assert!(err.contains("same as the username"), "got: {}", err);
    }

    #[test]
    fn password_strength_accepts_strong_password() {
        assert!(validate_password_strength("R3dFish!Swim", Some("alice")).is_ok());
        assert!(validate_password_strength("correct-horse-battery-staple", Some("bob")).is_ok());
    }

    #[test]
    fn password_strength_ignores_empty_username() {
        // Regression: username checks must not trip when username is "".
        assert!(validate_password_strength("GoodPass123", Some("")).is_ok());
    }

    // NOTE: schema-migration tests (previously exercising the inline
    // ensure_user_schema_migrations helper) have moved to `migrations.rs`
    // alongside the framework that replaced them.

    // ── default admin constants sanity checks ────────────────────────────

    #[test]
    fn default_admin_constants_are_documented_trivials() {
        // These values ship in distributed app — the entire security model
        // depends on them being trivial AND combined with must_change_password=1.
        // If someone "upgrades" these to a real-looking credential, the seeded
        // admin will be unreachable. Prevent that via this canary test.
        assert_eq!(DEFAULT_ADMIN_USERNAME, "admin");
        assert_eq!(DEFAULT_ADMIN_PASSWORD, "admin");
        assert!(DEFAULT_ADMIN_EMAIL.ends_with("@pqs-rtn.local"));
    }

    #[test]
    fn public_user_serialization_never_contains_password_hash() {
        let user = User {
            id: Some(7),
            username: "tester".to_string(),
            email: "tester@example.test".to_string(),
            full_name: "Test User".to_string(),
            rank: None,
            role: "visitor".to_string(),
            is_active: true,
            avatar_path: None,
            avatar_updated_at: None,
            avatar_mime: None,
            avatar_size: None,
            created_at: None,
            updated_at: None,
            must_change_password: false,
        };

        let serialized = serde_json::to_value(user).expect("user should serialize");
        assert!(serialized.get("password_hash").is_none());
    }

    fn create_session_test_database() -> Connection {
        let conn = Connection::open_in_memory().expect("session test database should open");
        conn.execute_batch(
            "PRAGMA foreign_keys = ON;
             CREATE TABLE users (
                id INTEGER PRIMARY KEY,
                username TEXT NOT NULL,
                is_active BOOLEAN NOT NULL
             );
             CREATE TABLE auth_sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                created_at INTEGER NOT NULL,
                last_used_at INTEGER NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
             );
             INSERT INTO users (id, username, is_active) VALUES (42, 'session-user', 1);",
        )
        .expect("session test schema should initialize");
        conn
    }

    fn session_test_user() -> User {
        User {
            id: Some(42),
            username: "session-user".to_string(),
            email: "session@example.test".to_string(),
            full_name: "Session User".to_string(),
            rank: None,
            role: "visitor".to_string(),
            is_active: true,
            avatar_path: None,
            avatar_updated_at: None,
            avatar_mime: None,
            avatar_size: None,
            created_at: None,
            updated_at: None,
            must_change_password: false,
        }
    }

    #[test]
    fn persistent_session_stores_only_token_hash_and_survives_restart_boundary() {
        let conn = create_session_test_database();
        let now = 1_700_000_000;
        let session = issue_auth_session_with_conn(&conn, session_test_user(), now)
            .expect("session should be issued");

        assert_eq!(session.token.len(), 43);
        assert!(session
            .token
            .chars()
            .all(|character| character.is_ascii_alphanumeric()
                || character == '-'
                || character == '_'));

        let stored_hash: String = conn
            .query_row("SELECT token_hash FROM auth_sessions", [], |row| row.get(0))
            .expect("stored token hash should exist");
        assert_eq!(stored_hash, hash_auth_token(&session.token));
        assert_ne!(stored_hash, session.token);

        let restored_user_id = validate_auth_session_with_conn(&conn, &session.token, now + 60)
            .expect("persisted session should validate");
        assert_eq!(restored_user_id, Some(42));

        let refreshed_expiration: u64 = conn
            .query_row("SELECT expires_at FROM auth_sessions", [], |row| row.get(0))
            .expect("refreshed expiration should exist");
        assert_eq!(
            refreshed_expiration,
            now + 60 + AUTH_SESSION_INACTIVITY_TTL_SECONDS
        );

        revoke_auth_session_with_conn(&conn, &session.token).expect("session should be revoked");
        assert_eq!(
            validate_auth_session_with_conn(&conn, &session.token, now + 120)
                .expect("revoked token validation should succeed"),
            None
        );
    }

    #[test]
    fn persistent_session_expires_after_inactivity_window() {
        let conn = create_session_test_database();
        let now = 1_700_000_000;
        let session = issue_auth_session_with_conn(&conn, session_test_user(), now)
            .expect("session should be issued");

        let result = validate_auth_session_with_conn(
            &conn,
            &session.token,
            now + AUTH_SESSION_INACTIVITY_TTL_SECONDS + 1,
        )
        .expect("expired token validation should succeed");

        assert_eq!(result, None);
        let stored_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM auth_sessions", [], |row| row.get(0))
            .expect("session count should be readable");
        assert_eq!(stored_count, 0);
    }

    #[test]
    fn persistent_session_rejects_inactive_users() {
        let conn = create_session_test_database();
        let now = 1_700_000_000;
        let session = issue_auth_session_with_conn(&conn, session_test_user(), now)
            .expect("session should be issued");
        conn.execute("UPDATE users SET is_active = 0 WHERE id = 42", [])
            .expect("user should be disabled");

        assert_eq!(
            validate_auth_session_with_conn(&conn, &session.token, now + 1)
                .expect("inactive-user token validation should succeed"),
            None
        );
        let stored_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM auth_sessions", [], |row| row.get(0))
            .expect("session count should be readable");
        assert_eq!(stored_count, 0);
    }

    #[test]
    fn password_change_policy_keeps_current_session_and_revokes_others() {
        let conn = create_session_test_database();
        let now = 1_700_000_000;
        let current = issue_auth_session_with_conn(&conn, session_test_user(), now)
            .expect("current session should be issued");
        let other = issue_auth_session_with_conn(&conn, session_test_user(), now)
            .expect("other session should be issued");

        revoke_other_auth_sessions_with_conn(&conn, 42, &current.token)
            .expect("other sessions should be revoked");

        assert_eq!(
            validate_auth_session_with_conn(&conn, &current.token, now + 1)
                .expect("current token validation should succeed"),
            Some(42)
        );
        assert_eq!(
            validate_auth_session_with_conn(&conn, &other.token, now + 1)
                .expect("other token validation should succeed"),
            None
        );
    }
}
