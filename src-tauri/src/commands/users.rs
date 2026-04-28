use crate::auth::{self, HighRankingOfficer, User};

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn get_all_users() -> Result<Vec<User>, String> {
    auth::get_all_users()
}

#[tauri::command]
pub fn get_user_by_id(id: i32) -> Result<Option<User>, String> {
    auth::get_user_by_id(id)
}

#[tauri::command]
pub fn get_user_by_email(email: String) -> Result<Option<User>, String> {
    auth::get_user_by_email(&email)
}

#[tauri::command]
pub fn create_user(
    username: String,
    email: String,
    password: String,
    full_name: String,
    rank: Option<String>,
    role: String,
) -> Result<User, String> {
    // Phase 1 security: password is hashed inside auth::create_user. The backend
    // is the single source of truth for password hashing; the frontend MUST pass plaintext.
    auth::create_user(
        &username,
        &email,
        &password,
        &full_name,
        rank.as_deref(),
        &role,
    )
}

#[tauri::command]
pub fn update_user(
    id: i32,
    username: String,
    email: String,
    password: Option<String>,
    full_name: String,
    rank: Option<String>,
    role: String,
) -> Result<User, String> {
    // Phase 1 security: `password` is optional plaintext. When None (or empty string),
    // the existing password hash is preserved. Backend hashes and validates strength.
    auth::update_user(
        id,
        &username,
        &email,
        password.as_deref(),
        &full_name,
        rank.as_deref(),
        &role,
    )
}

#[tauri::command]
pub fn change_password(user_id: i32, old_password: String, new_password: String) -> Result<(), String> {
    auth::change_password(user_id, &old_password, &new_password)
}

#[tauri::command]
pub fn delete_user(id: i32) -> Result<bool, String> {
    auth::delete_user(id)
}

#[tauri::command]
pub fn authenticate_user(username_or_email: String, password: String) -> Result<Option<User>, String> {
    auth::authenticate_user(&username_or_email, &password)
}

#[tauri::command]
pub fn migrate_passwords() -> Result<String, String> {
    let conn =
        auth::get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    auth::migrate_plain_text_passwords(&conn)?;
    Ok("Password migration completed successfully".to_string())
}

// High Ranking Officers Commands
#[tauri::command]
pub fn get_all_high_ranking_officers() -> Result<Vec<HighRankingOfficer>, String> {
    auth::get_all_high_ranking_officers()
}

#[tauri::command]
pub fn update_high_ranking_officer(
    id: i32,
    thai_name: String,
    position_thai: String,
    position_english: String,
    order_index: i32,
) -> Result<HighRankingOfficer, String> {
    auth::update_high_ranking_officer(
        id,
        &thai_name,
        &position_thai,
        &position_english,
        order_index,
    )
}

// Test cleanup commands
#[tauri::command]
pub fn delete_test_users() -> Result<String, String> {
    let conn =
        auth::get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;

    // First, check what users exist
    let user_count: i32 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count users: {}", e))?;

    // Check what roles exist
    let roles: Vec<String> = conn
        .prepare("SELECT DISTINCT role FROM users")
        .map_err(|e| format!("Failed to prepare roles query: {}", e))?
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to query roles: {}", e))?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| format!("Failed to collect roles: {}", e))?;

    // Delete all users except admin (role = 'admin')
    let rows_affected = conn
        .execute("DELETE FROM users WHERE role != 'admin'", [])
        .map_err(|e| format!("Failed to delete test users: {}", e))?;

    // Check users after deletion
    let remaining_count: i32 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count remaining users: {}", e))?;

    let remaining_roles: Vec<String> = conn
        .prepare("SELECT DISTINCT role FROM users")
        .map_err(|e| format!("Failed to prepare remaining roles query: {}", e))?
        .query_map([], |row| row.get::<_, String>(0))
        .map_err(|e| format!("Failed to query remaining roles: {}", e))?
        .collect::<Result<Vec<String>, _>>()
        .map_err(|e| format!("Failed to collect remaining roles: {}", e))?;

    Ok(format!(
        "Before: {} users, Roles: {:?}, Deleted: {} users, After: {} users, Remaining roles: {:?}",
        user_count, roles, rows_affected, remaining_count, remaining_roles
    ))
}

#[tauri::command]
pub fn get_users_count() -> Result<i32, String> {
    let conn =
        auth::get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;

    let count: i32 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| format!("Failed to count users: {}", e))?;

    Ok(count)
}
