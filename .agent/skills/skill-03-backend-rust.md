# Skill: Rust Backend & SQLite Standards

## Objective
Define the rules for interacting with SQLite and writing Tauri Commands in Rust.

## Tauri Command Patterns
1. **Naming**: Use snake_case for command functions (`pub fn get_user_answers(...)`).
2. **Error Handling**: Commands must return `Result<T, String>`. Never use `.unwrap()` or `.expect()` in a way that can crash the Tauri application.
   ```rust
   #[tauri::command]
   pub fn fetch_data() -> Result<Data, String> {
       let conn = get_connection().map_err(|e| e.to_string())?;
       // ... logic
       Ok(data)
   }
   ```
3. **Arguments**: Pass parameters as structured types or standard Strings/Integers.

## SQLite (rusqlite) Rules
1. **Connections**: Use `src-tauri/src/content_database/` logic to get DB connections. Do not open raw paths directly.
2. **Prepared Statements**: ALWAYS use prepared statements with parameter binding to prevent SQL injection.
   ```rust
   let mut stmt = conn.prepare("SELECT * FROM Questions WHERE document_id = ?1")
       .map_err(|e| format!("Prepare failed: {}", e))?;
   let rows = stmt.query_map(params![doc_id], |row| { ... });
   ```
3. **Transactions**: Use transactions when making multiple structural changes (e.g., adding a question + reordering sequence + updating metadata) to prevent database corruption.
   ```rust
   let tx = conn.transaction().map_err(|e| e.to_string())?;
   // ... perform updates
   tx.commit().map_err(|e| e.to_string())?;
   ```

## Type Synchronization
- Structs returned to the frontend must exactly match `src/types/content.ts`.
- Ensure proper use of `Option<T>` for nullable database fields, which translate to `T | null` in TypeScript.
