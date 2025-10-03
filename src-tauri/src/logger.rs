//! Logging utility for PQS RTN Hybrid Storage
//! 
//! Provides debug, info, and error logging with conditional output
//! based on build configuration (debug vs release).

use std::fmt::Display;

/// Check if running in debug mode
#[inline]
pub fn is_debug_mode() -> bool {
    cfg!(debug_assertions)
}

/// Log debug message (only in debug builds)
pub fn debug<T: Display>(message: T) {
    if is_debug_mode() {
        println!("[DEBUG] {}", message);
    }
}

/// Log info message (always shown)
pub fn info<T: Display>(message: T) {
    println!("[INFO] ✅ {}", message);
}

/// Log warning message (always shown)
pub fn warn<T: Display>(message: T) {
    eprintln!("[WARN] ⚠️ {}", message);
}

/// Log error message (always shown)
pub fn error<T: Display>(message: T) {
    eprintln!("[ERROR] ❌ {}", message);
}

/// Log critical error (always shown with emphasis)
pub fn critical<T: Display>(message: T) {
    eprintln!("🚨 [CRITICAL ERROR] {}", message);
}

/// Log success message (always shown)
pub fn success<T: Display>(message: T) {
    println!("[SUCCESS] 🎉 {}", message);
}
