use crate::auth::{self, User};

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
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

// Database initialization is handled by Tauri setup
// No need for separate command

#[tauri::command]
pub fn migrate_passwords() -> Result<String, String> {
    let conn =
        auth::get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    auth::migrate_plain_text_passwords(&conn)?;
    Ok("Password migration completed successfully".to_string())
}
