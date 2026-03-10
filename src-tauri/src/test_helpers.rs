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
        conn.execute("PRAGMA foreign_keys = ON", [])?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS Documents (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                unit_id TEXT NOT NULL,
                unit_code TEXT NOT NULL,
                applied_to TEXT NOT NULL,
                doc_type TEXT NOT NULL,
                user_level TEXT NOT NULL,
                occupation_branch_main TEXT,
                occupation_branch_sub TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

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
                duration_value INTEGER,
                duration_unit VARCHAR(20) DEFAULT 'weeks',
                total_score INTEGER,
                is_template BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(document_id, section_number),
                FOREIGN KEY (document_id) REFERENCES Documents(id) ON DELETE CASCADE
            )",
            [],
        )?;

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
                score INTEGER DEFAULT 0,
                question_type VARCHAR(20) DEFAULT 'normal',
                group_score INTEGER DEFAULT 0,
                display_text TEXT,
                is_group_header BOOLEAN DEFAULT 0,
                is_scored BOOLEAN DEFAULT 0,
                is_exempted BOOLEAN DEFAULT 0,
                is_template BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(document_id) REFERENCES Documents(id) ON DELETE CASCADE,
                FOREIGN KEY(section_id) REFERENCES Sections(id) ON DELETE CASCADE,
                FOREIGN KEY(parent_id) REFERENCES Questions(id) ON DELETE CASCADE
            )",
            [],
        )?;
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS QuestionAnswerKeys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_id TEXT NOT NULL,
                sub_question_code TEXT NOT NULL,
                answer_key_text TEXT,
                is_required BOOLEAN DEFAULT 1,
                order_index INTEGER DEFAULT 0,
                FOREIGN KEY(question_id) REFERENCES Questions(id) ON DELETE CASCADE,
                UNIQUE(question_id, sub_question_code)
            )",
            [],
        )?;
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS OccupationBranches (
                code VARCHAR(10) PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS references_tbl (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id TEXT NOT NULL,
                ref_code TEXT NOT NULL,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(document_id, ref_code),
                FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
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
    use rusqlite::params;

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

    #[test]
    fn test_document_crud_operations() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Should initialize schema");

        conn.execute(
            "INSERT INTO documents (id, title, unit_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
            params!["DOC001", "Original Title", "UNIT001"],
        )
        .expect("Insert document should succeed");

        let title: String = conn
            .query_row(
                "SELECT title FROM documents WHERE id = ?1",
                params!["DOC001"],
                |row| row.get(0),
            )
            .expect("Should read inserted document");
        assert_eq!(title, "Original Title");

        conn.execute(
            "UPDATE documents SET title = ?1, updated_at = datetime('now') WHERE id = ?2",
            params!["Updated Title", "DOC001"],
        )
        .expect("Update document should succeed");

        let updated_title: String = conn
            .query_row(
                "SELECT title FROM documents WHERE id = ?1",
                params!["DOC001"],
                |row| row.get(0),
            )
            .expect("Should read updated document");
        assert_eq!(updated_title, "Updated Title");

        conn.execute("DELETE FROM documents WHERE id = ?1", params!["DOC001"])
            .expect("Delete document should succeed");

        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM documents WHERE id = ?1)",
                params!["DOC001"],
                |row| row.get(0),
            )
            .expect("Exists check should succeed");
        assert!(!exists, "Document should be deleted");
    }

    #[test]
    fn test_section_crud_operations() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Should initialize schema");

        conn.execute(
            "INSERT INTO documents (id, title, unit_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
            params!["DOC100", "Doc For Section", "UNIT001"],
        )
        .expect("Insert document should succeed");

        conn.execute(
            "INSERT INTO sections (document_id, section_number, title, created_at, updated_at)
             VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
            params!["DOC100", 201, "Section 201"],
        )
        .expect("Insert section should succeed");

        let section_id: i64 = conn
            .query_row(
                "SELECT id FROM sections WHERE document_id = ?1 AND section_number = ?2",
                params!["DOC100", 201],
                |row| row.get(0),
            )
            .expect("Should read inserted section");

        conn.execute(
            "UPDATE sections SET title = ?1, updated_at = datetime('now') WHERE id = ?2",
            params!["Section 201 Updated", section_id],
        )
        .expect("Update section should succeed");

        let title: String = conn
            .query_row(
                "SELECT title FROM sections WHERE id = ?1",
                params![section_id],
                |row| row.get(0),
            )
            .expect("Should read updated section");
        assert_eq!(title, "Section 201 Updated");

        conn.execute("DELETE FROM sections WHERE id = ?1", params![section_id])
            .expect("Delete section should succeed");

        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM sections WHERE id = ?1",
                params![section_id],
                |row| row.get(0),
            )
            .expect("Count query should succeed");
        assert_eq!(count, 0, "Section should be deleted");
    }

    #[test]
    fn test_question_crud_operations() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Should initialize schema");

        conn.execute(
            "INSERT INTO documents (id, title, unit_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
            params!["DOC200", "Doc For Question", "UNIT001"],
        )
        .expect("Insert document should succeed");

        conn.execute(
            "INSERT INTO sections (document_id, section_number, title, created_at, updated_at)
             VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
            params!["DOC200", 202, "Section 202"],
        )
        .expect("Insert section should succeed");

        let section_id: i64 = conn
            .query_row(
                "SELECT id FROM sections WHERE document_id = ?1 AND section_number = ?2",
                params!["DOC200", 202],
                |row| row.get(0),
            )
            .expect("Should read section id");

        conn.execute(
            "INSERT INTO questions (id, document_id, section_id, content, sequence, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'), datetime('now'))",
            params!["Q-001", "DOC200", section_id, "Original question", 1],
        )
        .expect("Insert question should succeed");

        conn.execute(
            "UPDATE questions SET content = ?1, updated_at = datetime('now') WHERE id = ?2",
            params!["Updated question", "Q-001"],
        )
        .expect("Update question should succeed");

        let content: String = conn
            .query_row(
                "SELECT content FROM questions WHERE id = ?1",
                params!["Q-001"],
                |row| row.get(0),
            )
            .expect("Should read updated question");
        assert_eq!(content, "Updated question");

        conn.execute("DELETE FROM questions WHERE id = ?1", params!["Q-001"])
            .expect("Delete question should succeed");

        let exists: bool = conn
            .query_row(
                "SELECT EXISTS(SELECT 1 FROM questions WHERE id = ?1)",
                params!["Q-001"],
                |row| row.get(0),
            )
            .expect("Exists check should succeed");
        assert!(!exists, "Question should be deleted");
    }

    #[test]
    fn test_reference_crud_operations() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Should initialize schema");

        conn.execute(
            "INSERT INTO documents (id, title, unit_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
            params!["DOC300", "Doc For References", "UNIT001"],
        )
        .expect("Insert document should succeed");

        conn.execute(
            "INSERT INTO references_tbl (document_id, ref_code, title, created_at, updated_at)
             VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
            params!["DOC300", "REF-001", "Reference One"],
        )
        .expect("Insert reference should succeed");

        let ref_id: i64 = conn
            .query_row(
                "SELECT id FROM references_tbl WHERE document_id = ?1 AND ref_code = ?2",
                params!["DOC300", "REF-001"],
                |row| row.get(0),
            )
            .expect("Should read inserted reference");

        conn.execute(
            "UPDATE references_tbl SET title = ?1, updated_at = datetime('now') WHERE id = ?2",
            params!["Reference One Updated", ref_id],
        )
        .expect("Update reference should succeed");

        let title: String = conn
            .query_row(
                "SELECT title FROM references_tbl WHERE id = ?1",
                params![ref_id],
                |row| row.get(0),
            )
            .expect("Should read updated reference");
        assert_eq!(title, "Reference One Updated");

        conn.execute("DELETE FROM references_tbl WHERE id = ?1", params![ref_id])
            .expect("Delete reference should succeed");

        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM references_tbl WHERE id = ?1",
                params![ref_id],
                |row| row.get(0),
            )
            .expect("Count query should succeed");
        assert_eq!(count, 0, "Reference should be deleted");
    }

    #[test]
    fn test_document_cascade_delete_to_sections_questions_and_references() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Should initialize schema");

        conn.execute(
            "INSERT INTO documents (id, title, unit_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
            params!["DOC400", "Cascade Doc", "UNIT001"],
        )
        .expect("Insert document should succeed");

        conn.execute(
            "INSERT INTO sections (document_id, section_number, title, created_at, updated_at)
             VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
            params!["DOC400", 203, "Section For Cascade"],
        )
        .expect("Insert section should succeed");

        let section_id: i64 = conn
            .query_row(
                "SELECT id FROM sections WHERE document_id = ?1 AND section_number = ?2",
                params!["DOC400", 203],
                |row| row.get(0),
            )
            .expect("Should read section id");

        conn.execute(
            "INSERT INTO questions (id, document_id, section_id, content, sequence, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, datetime('now'), datetime('now'))",
            params!["Q-CASCADE", "DOC400", section_id, "Question", 1],
        )
        .expect("Insert question should succeed");

        conn.execute(
            "INSERT INTO references_tbl (document_id, ref_code, title, created_at, updated_at)
             VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
            params!["DOC400", "REF-CASCADE", "Reference"],
        )
        .expect("Insert reference should succeed");

        conn.execute("DELETE FROM documents WHERE id = ?1", params!["DOC400"])
            .expect("Delete document should succeed");

        let section_count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM sections WHERE document_id = ?1",
                params!["DOC400"],
                |row| row.get(0),
            )
            .expect("Section count should succeed");
        let question_count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM questions WHERE document_id = ?1",
                params!["DOC400"],
                |row| row.get(0),
            )
            .expect("Question count should succeed");
        let reference_count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM references_tbl WHERE document_id = ?1",
                params!["DOC400"],
                |row| row.get(0),
            )
            .expect("Reference count should succeed");

        assert_eq!(section_count, 0, "Sections should cascade delete");
        assert_eq!(question_count, 0, "Questions should cascade delete");
        assert_eq!(reference_count, 0, "References should cascade delete");
    }

    #[test]
    fn test_transaction_rollback_on_unique_violation() {
        let mut conn = create_test_db();
        init_content_schema(&conn).expect("Should initialize schema");

        let tx = conn
            .transaction()
            .expect("Should start transaction for rollback test");

        tx.execute(
            "INSERT INTO documents (id, title, unit_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
            params!["DOC500", "Rollback Doc", "UNIT001"],
        )
        .expect("Initial insert should succeed");

        let duplicate = tx.execute(
            "INSERT INTO documents (id, title, unit_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))",
            params!["DOC500", "Rollback Doc Duplicate", "UNIT001"],
        );

        assert!(duplicate.is_err(), "Duplicate key should fail");

        tx.rollback().expect("Rollback should succeed");

        let count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM documents WHERE id = ?1",
                params!["DOC500"],
                |row| row.get(0),
            )
            .expect("Count query should succeed");

        assert_eq!(count, 0, "No rows should remain after rollback");
    }
}
