//! Test Helper Module
//!
//! This module provides utilities for testing, including:
//! - In-memory database creation
//! - Temporary file/directory management
//! - Test data generators
//! - Common test fixtures

#[cfg(test)]
pub mod helpers {
    use rusqlite::{Connection, Result};
    use std::path::PathBuf;
    use tempfile::TempDir;

    /// Creates an in-memory SQLite database for testing
    ///
    /// # Returns
    /// A new `Connection` to an in-memory database `:memory:`
    ///
    /// # Example
    /// ```
    /// use crate::test_helpers::helpers::create_test_db;
    ///
    /// let conn = create_test_db();
    /// // Use conn for testing...
    /// ```
    pub fn create_test_db() -> Connection {
        Connection::open_in_memory().expect("Failed to create in-memory database for testing")
    }

    /// Creates a temporary database file in a temporary directory
    ///
    /// # Returns
    /// A tuple containing:
    /// - `TempDir`: The temporary directory (must be kept alive)
    /// - `PathBuf`: Path to the database file
    ///
    /// # Example
    /// ```
    /// use crate::test_helpers::helpers::create_temp_db;
    ///
    /// let (_temp_dir, db_path) = create_temp_db();
    /// // Use db_path for testing...
    /// // _temp_dir is automatically cleaned up when dropped
    /// ```
    pub fn create_temp_db() -> (TempDir, PathBuf) {
        let temp_dir = TempDir::new().expect("Failed to create temporary directory");
        let db_path = temp_dir.path().join("test.db");
        (temp_dir, db_path)
    }

    /// Creates a temporary directory for testing
    ///
    /// # Returns
    /// A `TempDir` that will be automatically cleaned up when dropped
    ///
    /// # Example
    /// ```
    /// use crate::test_helpers::helpers::create_temp_dir;
    ///
    /// let temp_dir = create_temp_dir();
    /// let file_path = temp_dir.path().join("test_file.txt");
    /// // Use temp_dir for testing...
    /// ```
    pub fn create_temp_dir() -> TempDir {
        TempDir::new().expect("Failed to create temporary directory")
    }

    /// Initializes a test database with content database schema
    ///
    /// # Arguments
    /// * `conn` - Database connection to initialize
    ///
    /// # Returns
    /// Result indicating success or failure
    pub fn init_content_schema(conn: &Connection) -> Result<()> {
        // This will be implemented to create all necessary tables
        // for content_database.rs testing

        // Example placeholder - will be expanded
        conn.execute(
            "CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                unit_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        Ok(())
    }

    /// Initializes a test database with user database schema
    ///
    /// # Arguments
    /// * `conn` - Database connection to initialize
    ///
    /// # Returns
    /// Result indicating success or failure
    pub fn init_user_schema(conn: &Connection) -> Result<()> {
        // This will be implemented to create users table schema
        // for database.rs testing

        conn.execute(
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        Ok(())
    }

    /// Creates sample test data for documents
    ///
    /// # Returns
    /// A tuple of (title, unit_id) for testing
    pub fn sample_document_data() -> (&'static str, &'static str) {
        ("ระบบเรดาร์ทดสอบ", "TEST001")
    }

    /// Creates sample test data for users
    ///
    /// # Returns
    /// A tuple of (username, password, role) for testing
    pub fn sample_user_data() -> (&'static str, &'static str, &'static str) {
        ("test_user", "test_password", "creator")
    }

    /// Asserts that a database file exists
    ///
    /// # Arguments
    /// * `path` - Path to check
    ///
    /// # Panics
    /// If the file does not exist
    pub fn assert_db_exists(path: &PathBuf) {
        assert!(path.exists(), "Database file should exist at: {:?}", path);
    }

    /// Asserts that a database file does not exist
    ///
    /// # Arguments
    /// * `path` - Path to check
    ///
    /// # Panics
    /// If the file exists
    pub fn assert_db_not_exists(path: &PathBuf) {
        assert!(
            !path.exists(),
            "Database file should not exist at: {:?}",
            path
        );
    }
}

#[cfg(test)]
mod tests {
    use super::helpers::*;

    #[test]
    fn test_create_test_db() {
        let conn = create_test_db();

        // Verify we can execute queries
        let result: Result<i32, _> = conn.query_row("SELECT 1 + 1", [], |row| row.get(0));

        assert_eq!(result.unwrap(), 2);
    }

    #[test]
    fn test_create_temp_db() {
        let (_temp_dir, db_path) = create_temp_db();

        // Verify path is valid
        assert!(db_path.to_str().is_some());
        assert!(db_path.ends_with("test.db"));

        // Create a connection to verify it works
        let _conn =
            rusqlite::Connection::open(&db_path).expect("Should be able to open temp database");
    }

    #[test]
    fn test_create_temp_dir() {
        let temp_dir = create_temp_dir();

        // Verify directory exists
        assert!(temp_dir.path().exists());
        assert!(temp_dir.path().is_dir());
    }

    #[test]
    fn test_init_content_schema() {
        let conn = create_test_db();

        // Initialize schema
        init_content_schema(&conn).expect("Should initialize content schema");

        // Verify table was created
        let table_exists: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='documents'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert!(table_exists, "Documents table should exist");
    }

    #[test]
    fn test_init_user_schema() {
        let conn = create_test_db();

        // Initialize schema
        init_user_schema(&conn).expect("Should initialize user schema");

        // Verify table was created
        let table_exists: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='users'",
                [],
                |row| row.get(0),
            )
            .unwrap();

        assert!(table_exists, "Users table should exist");
    }

    #[test]
    fn test_sample_document_data() {
        let (title, unit_id) = sample_document_data();

        assert_eq!(title, "ระบบเรดาร์ทดสอบ");
        assert_eq!(unit_id, "TEST001");
    }

    #[test]
    fn test_sample_user_data() {
        let (username, password, role) = sample_user_data();

        assert_eq!(username, "test_user");
        assert_eq!(password, "test_password");
        assert_eq!(role, "creator");
    }

    #[test]
    fn test_assert_db_exists_and_not_exists() {
        let (_temp_dir, db_path) = create_temp_db();

        // Create the file
        rusqlite::Connection::open(&db_path).expect("Should create database file");

        // Should not panic
        assert_db_exists(&db_path);

        // Remove the file
        std::fs::remove_file(&db_path).expect("Should remove file");

        // Should not panic
        assert_db_not_exists(&db_path);
    }
}
