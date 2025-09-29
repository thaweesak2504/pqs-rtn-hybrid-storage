use rusqlite::Connection;
use tauri::api::path::app_data_dir;
use tauri::Config;
use std::path::PathBuf;

fn get_database_path() -> Result<PathBuf, String> {
    let app_data = app_data_dir(&Config::default())
        .ok_or("Failed to get app data directory")?;
    
    let db_dir = app_data.join("pqs-rtn-hybrid-storage");
    std::fs::create_dir_all(&db_dir)
        .map_err(|e| format!("Failed to create database directory: {}", e))?;
    
    Ok(db_dir.join("database.db"))
}

fn main() {
    println!("🔍 Checking database users...");
    
    let db_path = match get_database_path() {
        Ok(path) => path,
        Err(e) => {
            println!("❌ Failed to get database path: {}", e);
            return;
        }
    };
    
    println!("📁 Database path: {}", db_path.display());
    
    match Connection::open(&db_path) {
        Ok(conn) => {
            // Get all users
            let mut stmt = conn.prepare("SELECT id, username, email, role FROM users ORDER BY id").unwrap();
            let user_iter = stmt.query_map([], |row| {
                Ok((row.get::<_, i32>(0)?, row.get::<_, String>(1)?, row.get::<_, String>(2)?, row.get::<_, String>(3)?))
            }).unwrap();
            
            let mut users = Vec::new();
            for user in user_iter {
                users.push(user.unwrap());
            }
            
            println!("📊 Found {} users:", users.len());
            for (id, username, email, role) in users {
                println!("  - ID: {}, Username: {}, Email: {}, Role: {}", id, username, email, role);
            }
            
            // Check avatars table
            let mut stmt = conn.prepare("SELECT COUNT(*) FROM avatars").unwrap();
            let avatar_count: i32 = stmt.query_row([], |row| row.get(0)).unwrap();
            println!("🖼️  Found {} avatars in database", avatar_count);
        },
        Err(e) => {
            println!("❌ Database connection failed: {}", e);
        }
    }
}
