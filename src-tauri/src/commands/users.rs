use crate::auth::{self, AuthSession, User};

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn get_all_users(session_token: String) -> Result<Vec<User>, String> {
    auth::require_role(&session_token, &["admin"])?;
    auth::get_all_users()
}

#[tauri::command]
pub fn get_user_by_id(id: i32, session_token: String) -> Result<Option<User>, String> {
    let requester = auth::require_auth_session(&session_token)?;
    if requester.role != "admin" && requester.id != Some(id) {
        return Err("You do not have permission to view this user".to_string());
    }
    auth::get_user_by_id(id)
}

#[tauri::command]
pub fn get_user_by_email(email: String, session_token: String) -> Result<Option<User>, String> {
    auth::require_role(&session_token, &["admin"])?;
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
    session_token: Option<String>,
) -> Result<User, String> {
    if role != "visitor" {
        let token = session_token.as_deref().unwrap_or_default();
        auth::require_role(token, &["admin"])?;
    }
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
#[allow(clippy::too_many_arguments)]
pub fn update_user(
    id: i32,
    username: String,
    email: String,
    password: Option<String>,
    full_name: String,
    rank: Option<String>,
    role: String,
    session_token: String,
) -> Result<User, String> {
    auth::require_role(&session_token, &["admin"])?;
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
pub fn change_password(
    user_id: i32,
    old_password: String,
    new_password: String,
    session_token: String,
) -> Result<(), String> {
    let requester = auth::require_auth_session(&session_token)?;
    if requester.id != Some(user_id) {
        return Err("You may only change your own password".to_string());
    }
    auth::change_password(user_id, &old_password, &new_password)
}

#[tauri::command]
pub fn delete_user(id: i32, session_token: String) -> Result<bool, String> {
    auth::require_role(&session_token, &["admin"])?;
    auth::delete_user(id)
}

#[tauri::command]
pub fn authenticate_user(
    username_or_email: String,
    password: String,
) -> Result<Option<AuthSession>, String> {
    auth::authenticate_user_session(&username_or_email, &password)
}

#[tauri::command]
pub fn validate_auth_session(token: String) -> Result<Option<User>, String> {
    auth::validate_auth_session(&token)
}

#[tauri::command]
pub fn revoke_auth_session(token: String) -> Result<(), String> {
    auth::revoke_auth_session(&token)
}

// Database initialization is handled by Tauri setup
// No need for separate command

#[tauri::command]
pub fn migrate_passwords(session_token: String) -> Result<String, String> {
    auth::require_role(&session_token, &["admin"])?;
    let conn =
        auth::get_connection_safe().map_err(|e| format!("Failed to connect to database: {}", e))?;
    auth::migrate_plain_text_passwords(&conn)?;
    Ok("Password migration completed successfully".to_string())
}
