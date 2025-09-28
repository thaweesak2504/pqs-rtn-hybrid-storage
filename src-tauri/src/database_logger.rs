use std::fs::OpenOptions;
use std::io::Write;
use chrono::{DateTime, Utc};

/// Database operation types that we want to log
#[derive(Debug, Clone)]
pub enum DatabaseOperation {
    CreateTable,
    #[allow(dead_code)]
    DropTable,
    AlterTable,
    InsertUser,
    UpdateUser,
    DeleteUser,
    InsertAvatar,
    #[allow(dead_code)]
    UpdateAvatar,
    #[allow(dead_code)]
    DeleteAvatar,
    #[allow(dead_code)]
    TruncateTable,
    #[allow(dead_code)]
    ResetDatabase,
}

/// Log entry structure
#[derive(Debug, Clone)]
pub struct DatabaseLogEntry {
    pub timestamp: DateTime<Utc>,
    pub operation: DatabaseOperation,
    pub table_name: String,
    pub details: String,
    pub user_id: Option<i32>,
    pub affected_rows: Option<i32>,
}

impl DatabaseLogEntry {
    pub fn new(operation: DatabaseOperation, table_name: String, details: String) -> Self {
        Self {
            timestamp: Utc::now(),
            operation,
            table_name,
            details,
            user_id: None,
            affected_rows: None,
        }
    }

    pub fn with_user_id(mut self, user_id: i32) -> Self {
        self.user_id = Some(user_id);
        self
    }

    #[allow(dead_code)]
    pub fn with_affected_rows(mut self, rows: i32) -> Self {
        self.affected_rows = Some(rows);
        self
    }

    /// Format log entry for file output
    pub fn to_log_string(&self) -> String {
        let user_info = self.user_id.map_or("N/A".to_string(), |id| id.to_string());
        let rows_info = self.affected_rows.map_or("N/A".to_string(), |r| r.to_string());
        
        format!(
            "[{}] {} | Table: {} | User: {} | Rows: {} | Details: {}\n",
            self.timestamp.format("%Y-%m-%d %H:%M:%S UTC"),
            format!("{:?}", self.operation),
            self.table_name,
            user_info,
            rows_info,
            self.details
        )
    }
}

/// Database logger for tracking critical operations
pub struct DatabaseLogger {
    log_file_path: String,
}

impl DatabaseLogger {
    pub fn new() -> Self {
        Self {
            log_file_path: "database_operations.log".to_string(),
        }
    }

    /// Log a database operation
    pub fn log_operation(&self, entry: DatabaseLogEntry) -> Result<(), String> {
        // Check for dangerous operations
        self.check_dangerous_operations(&entry)?;
        
        // Write to log file
        self.write_to_log_file(&entry)?;
        
        // Also print to console for immediate visibility
        println!("🚨 DATABASE OPERATION: {}", entry.to_log_string().trim());
        
        Ok(())
    }

    /// Check for potentially dangerous operations
    fn check_dangerous_operations(&self, entry: &DatabaseLogEntry) -> Result<(), String> {
        match entry.operation {
            DatabaseOperation::CreateTable => {
                Err(format!("⚠️  DANGEROUS: Attempting to CREATE TABLE '{}' - This should not happen in production!", entry.table_name))
            },
            DatabaseOperation::DropTable => {
                Err(format!("🚨 CRITICAL: Attempting to DROP TABLE '{}' - This will cause data loss!", entry.table_name))
            },
            DatabaseOperation::TruncateTable => {
                Err(format!("🚨 CRITICAL: Attempting to TRUNCATE TABLE '{}' - This will delete all data!", entry.table_name))
            },
            DatabaseOperation::ResetDatabase => {
                Err(format!("🚨 CRITICAL: Attempting to RESET DATABASE - This will delete all data!"))
            },
            _ => Ok(()) // Other operations are generally safe
        }
    }

    /// Write log entry to file
    fn write_to_log_file(&self, entry: &DatabaseLogEntry) -> Result<(), String> {
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_file_path)
            .map_err(|e| format!("Failed to open log file: {}", e))?;

        file.write_all(entry.to_log_string().as_bytes())
            .map_err(|e| format!("Failed to write to log file: {}", e))?;

        file.flush()
            .map_err(|e| format!("Failed to flush log file: {}", e))?;

        Ok(())
    }

    /// Log user operations
    pub fn log_user_operation(&self, operation: DatabaseOperation, user_id: Option<i32>, details: String) -> Result<(), String> {
        let mut entry = DatabaseLogEntry::new(operation, "users".to_string(), details);
        if let Some(id) = user_id {
            entry = entry.with_user_id(id);
        }
        self.log_operation(entry)
    }

    /// Log avatar operations
    pub fn log_avatar_operation(&self, operation: DatabaseOperation, user_id: Option<i32>, details: String) -> Result<(), String> {
        let mut entry = DatabaseLogEntry::new(operation, "avatars".to_string(), details);
        if let Some(id) = user_id {
            entry = entry.with_user_id(id);
        }
        self.log_operation(entry)
    }

    /// Log table structure changes
    pub fn log_table_change(&self, operation: DatabaseOperation, table_name: String, details: String) -> Result<(), String> {
        let entry = DatabaseLogEntry::new(operation, table_name, details);
        self.log_operation(entry)
    }
}

impl Default for DatabaseLogger {
    fn default() -> Self {
        Self::new()
    }
}

lazy_static::lazy_static! {
    pub static ref DB_LOGGER: DatabaseLogger = DatabaseLogger::new();
}

/// Convenience macros for logging
#[macro_export]
macro_rules! log_user_insert {
    ($user_id:expr, $details:expr) => {
        DB_LOGGER.log_user_operation(DatabaseOperation::InsertUser, Some($user_id), $details)
    };
}

#[macro_export]
macro_rules! log_user_update {
    ($user_id:expr, $details:expr) => {
        DB_LOGGER.log_user_operation(DatabaseOperation::UpdateUser, Some($user_id), $details)
    };
}

#[macro_export]
macro_rules! log_user_delete {
    ($user_id:expr, $details:expr) => {
        DB_LOGGER.log_user_operation(DatabaseOperation::DeleteUser, Some($user_id), $details)
    };
}

#[macro_export]
macro_rules! log_avatar_insert {
    ($user_id:expr, $details:expr) => {
        DB_LOGGER.log_avatar_operation(DatabaseOperation::InsertAvatar, Some($user_id), $details)
    };
}

#[macro_export]
macro_rules! log_avatar_update {
    ($user_id:expr, $details:expr) => {
        DB_LOGGER.log_avatar_operation(DatabaseOperation::UpdateAvatar, Some($user_id), $details)
    };
}

#[macro_export]
macro_rules! log_avatar_delete {
    ($user_id:expr, $details:expr) => {
        DB_LOGGER.log_avatar_operation(DatabaseOperation::DeleteAvatar, Some($user_id), $details)
    };
}

#[macro_export]
macro_rules! log_table_operation {
    ($operation:expr, $table:expr, $details:expr) => {
        DB_LOGGER.log_table_change($operation, $table.to_string(), $details)
    };
}
