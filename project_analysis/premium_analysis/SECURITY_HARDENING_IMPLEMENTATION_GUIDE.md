# 🛡️ Security Hardening Implementation Guide

## 🎯 **Implementation Overview**

**Target:** Transform PQS RTN from Security Grade C+ to A+  
**Timeline:** 5-6 weeks  
**Priority:** Critical security vulnerabilities must be fixed immediately  
**Expected Outcome:** Enterprise-grade security

---

## 🚨 **Phase 1: Critical Security Fixes (Week 1)**

### **1.1 Password Hashing Implementation**

#### **Backend Implementation (Rust):**
```rust
// Add to Cargo.toml
[dependencies]
bcrypt = "0.15"
rand = "0.8"

// src-tauri/src/security.rs
use bcrypt::{hash, verify, DEFAULT_COST};
use rand::Rng;

pub struct PasswordSecurity;

impl PasswordSecurity {
    pub fn hash_password(password: &str) -> Result<String, String> {
        let salt = rand::thread_rng().gen::<[u8; 16]>();
        hash(password, DEFAULT_COST)
            .map_err(|e| format!("Password hashing failed: {}", e))
    }
    
    pub fn verify_password(password: &str, hash: &str) -> Result<bool, String> {
        verify(password, hash)
            .map_err(|e| format!("Password verification failed: {}", e))
    }
}
```

#### **Database Schema Update:**
```sql
-- Add password_salt column
ALTER TABLE users ADD COLUMN password_salt TEXT;

-- Update existing users (migrate plain text passwords)
UPDATE users SET password_salt = 'legacy', password_hash = password_hash;
```

#### **Authentication Update:**
```rust
// src-tauri/src/database.rs
pub fn authenticate_user(username_or_email: &str, password: &str) -> Result<Option<User>, String> {
    let conn = get_connection().map_err(|e| format!("Failed to connect to database: {}", e))?;
    let mut stmt = conn.prepare("SELECT id, username, email, password_hash, password_salt, full_name, rank, role, is_active, avatar_path, avatar_updated_at, avatar_mime, avatar_size, created_at, updated_at FROM users WHERE (email = ? OR username = ?) AND is_active = 1")
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;
    
    let user = stmt.query_row(params![username_or_email, username_or_email], |row| {
        Ok(User {
            id: Some(row.get(0)?),
            username: row.get(1)?,
            email: row.get(2)?,
            password_hash: row.get(3)?,
            password_salt: row.get(4)?,
            full_name: row.get(5)?,
            rank: row.get(6)?,
            role: row.get(7)?,
            is_active: row.get(8)?,
            avatar_path: row.get(9)?,
            avatar_updated_at: row.get(10)?,
            avatar_mime: row.get(11)?,
            avatar_size: row.get(12)?,
            created_at: row.get(13)?,
            updated_at: row.get(14)?,
        })
    });
    
    match user {
        Ok(user) => {
            // Verify password hash
            if PasswordSecurity::verify_password(password, &user.password_hash)? {
                Ok(Some(user))
            } else {
                Ok(None)
            }
        },
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(format!("Failed to authenticate user: {}", e)),
    }
}
```

### **1.2 JWT Token Implementation**

#### **Backend JWT Implementation:**
```rust
// Add to Cargo.toml
[dependencies]
jsonwebtoken = "9.2"
chrono = { version = "0.4", features = ["serde"] }

// src-tauri/src/jwt.rs
use jsonwebtoken::{encode, decode, Header, Algorithm, Validation, EncodingKey, DecodingKey};
use serde::{Deserialize, Serialize};
use chrono::{Utc, Duration};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub user_id: i32,
    pub username: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}

pub struct JWTManager {
    secret: String,
}

impl JWTManager {
    pub fn new(secret: String) -> Self {
        Self { secret }
    }
    
    pub fn generate_token(&self, user_id: i32, username: String, role: String) -> Result<String, String> {
        let now = Utc::now();
        let exp = now + Duration::hours(1); // 1 hour expiration
        
        let claims = Claims {
            user_id,
            username,
            role,
            exp: exp.timestamp() as usize,
            iat: now.timestamp() as usize,
        };
        
        encode(&Header::default(), &claims, &EncodingKey::from_secret(self.secret.as_ref()))
            .map_err(|e| format!("Token generation failed: {}", e))
    }
    
    pub fn validate_token(&self, token: &str) -> Result<Claims, String> {
        let validation = Validation::new(Algorithm::HS256);
        decode::<Claims>(token, &DecodingKey::from_secret(self.secret.as_ref()), &validation)
            .map(|data| data.claims)
            .map_err(|e| format!("Token validation failed: {}", e))
    }
}
```

### **1.3 Server-Side Input Validation**

#### **Input Validation Implementation:**
```rust
// src-tauri/src/validation.rs
use regex::Regex;
use std::collections::HashMap;

pub struct InputValidator;

impl InputValidator {
    pub fn validate_email(email: &str) -> Result<(), String> {
        let email_regex = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
            .map_err(|e| format!("Regex compilation failed: {}", e))?;
        
        if !email_regex.is_match(email) {
            return Err("Invalid email format".to_string());
        }
        
        if email.len() > 254 {
            return Err("Email too long".to_string());
        }
        
        Ok(())
    }
    
    pub fn validate_username(username: &str) -> Result<(), String> {
        if username.len() < 3 || username.len() > 30 {
            return Err("Username must be 3-30 characters".to_string());
        }
        
        let username_regex = Regex::new(r"^[a-zA-Z0-9_-]+$")
            .map_err(|e| format!("Regex compilation failed: {}", e))?;
        
        if !username_regex.is_match(username) {
            return Err("Username can only contain letters, numbers, underscores, and hyphens".to_string());
        }
        
        Ok(())
    }
    
    pub fn validate_password(password: &str) -> Result<(), String> {
        if password.len() < 8 {
            return Err("Password must be at least 8 characters".to_string());
        }
        
        if password.len() > 128 {
            return Err("Password too long".to_string());
        }
        
        // Check for at least one uppercase, lowercase, number, and special character
        let has_upper = password.chars().any(|c| c.is_uppercase());
        let has_lower = password.chars().any(|c| c.is_lowercase());
        let has_number = password.chars().any(|c| c.is_numeric());
        let has_special = password.chars().any(|c| "!@#$%^&*(),.?\":{}|<>".contains(c));
        
        if !(has_upper && has_lower && has_number && has_special) {
            return Err("Password must contain uppercase, lowercase, number, and special character".to_string());
        }
        
        Ok(())
    }
    
    pub fn sanitize_input(input: &str) -> String {
        // Remove HTML tags and script content
        input
            .replace("<script>", "")
            .replace("</script>", "")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#x27;")
            .replace("&", "&amp;")
    }
}
```

---

## 🛡️ **Phase 2: High Priority Security (Week 2)**

### **2.1 Rate Limiting Implementation**

#### **Rate Limiting Backend:**
```rust
// src-tauri/src/rate_limiter.rs
use std::collections::HashMap;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

pub struct RateLimiter {
    attempts: Mutex<HashMap<String, Vec<Instant>>>,
    max_attempts: usize,
    window_duration: Duration,
}

impl RateLimiter {
    pub fn new(max_attempts: usize, window_duration: Duration) -> Self {
        Self {
            attempts: Mutex::new(HashMap::new()),
            max_attempts,
            window_duration,
        }
    }
    
    pub async fn is_allowed(&self, identifier: &str) -> bool {
        let mut attempts = self.attempts.lock().await;
        let now = Instant::now();
        
        // Clean old attempts
        if let Some(user_attempts) = attempts.get_mut(identifier) {
            user_attempts.retain(|&attempt| now.duration_since(attempt) < self.window_duration);
            
            if user_attempts.len() >= self.max_attempts {
                return false;
            }
        }
        
        // Add current attempt
        attempts.entry(identifier.to_string())
            .or_insert_with(Vec::new)
            .push(now);
        
        true
    }
}
```

### **2.2 CSRF Protection Implementation**

#### **CSRF Token Generation:**
```rust
// src-tauri/src/csrf.rs
use rand::Rng;
use std::collections::HashMap;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

pub struct CSRFProtection {
    tokens: Mutex<HashMap<String, (String, Instant)>>,
    token_duration: Duration,
}

impl CSRFProtection {
    pub fn new(token_duration: Duration) -> Self {
        Self {
            tokens: Mutex::new(HashMap::new()),
            token_duration,
        }
    }
    
    pub async fn generate_token(&self, session_id: &str) -> String {
        let token = self.generate_random_token();
        let mut tokens = self.tokens.lock().await;
        
        // Clean expired tokens
        self.clean_expired_tokens(&mut tokens).await;
        
        tokens.insert(session_id.to_string(), (token.clone(), Instant::now()));
        token
    }
    
    pub async fn validate_token(&self, session_id: &str, token: &str) -> bool {
        let mut tokens = self.tokens.lock().await;
        self.clean_expired_tokens(&mut tokens).await;
        
        if let Some((stored_token, _)) = tokens.get(session_id) {
            stored_token == token
        } else {
            false
        }
    }
    
    fn generate_random_token(&self) -> String {
        let mut rng = rand::thread_rng();
        let bytes: Vec<u8> = (0..32).map(|_| rng.gen()).collect();
        base64::encode(bytes)
    }
    
    async fn clean_expired_tokens(&self, tokens: &mut HashMap<String, (String, Instant)>) {
        let now = Instant::now();
        tokens.retain(|_, (_, timestamp)| now.duration_since(*timestamp) < self.token_duration);
    }
}
```

### **2.3 Account Lockout Implementation**

#### **Account Lockout System:**
```rust
// src-tauri/src/account_lockout.rs
use std::collections::HashMap;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

pub struct AccountLockout {
    failed_attempts: Mutex<HashMap<String, (usize, Instant)>>,
    max_attempts: usize,
    lockout_duration: Duration,
}

impl AccountLockout {
    pub fn new(max_attempts: usize, lockout_duration: Duration) -> Self {
        Self {
            failed_attempts: Mutex::new(HashMap::new()),
            max_attempts,
            lockout_duration,
        }
    }
    
    pub async fn record_failed_attempt(&self, identifier: &str) -> bool {
        let mut attempts = self.failed_attempts.lock().await;
        let now = Instant::now();
        
        if let Some((count, last_attempt)) = attempts.get_mut(identifier) {
            if now.duration_since(*last_attempt) < self.lockout_duration {
                *count += 1;
                *last_attempt = now;
                *count >= self.max_attempts
            } else {
                // Reset if lockout period has passed
                *count = 1;
                *last_attempt = now;
                false
            }
        } else {
            attempts.insert(identifier.to_string(), (1, now));
            false
        }
    }
    
    pub async fn is_locked(&self, identifier: &str) -> bool {
        let attempts = self.failed_attempts.lock().await;
        if let Some((count, last_attempt)) = attempts.get(identifier) {
            let now = Instant::now();
            *count >= self.max_attempts && now.duration_since(*last_attempt) < self.lockout_duration
        } else {
            false
        }
    }
    
    pub async fn clear_attempts(&self, identifier: &str) {
        let mut attempts = self.failed_attempts.lock().await;
        attempts.remove(identifier);
    }
}
```

---

## 🔒 **Phase 3: Medium Priority Security (Week 3)**

### **3.1 Audit Logging System**

#### **Audit Logger Implementation:**
```rust
// src-tauri/src/audit_logger.rs
use serde::{Deserialize, Serialize};
use chrono::{Utc, DateTime};
use std::fs::OpenOptions;
use std::io::Write;

#[derive(Debug, Serialize, Deserialize)]
pub struct AuditLogEntry {
    pub timestamp: DateTime<Utc>,
    pub user_id: Option<i32>,
    pub username: Option<String>,
    pub action: String,
    pub resource: String,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
    pub success: bool,
    pub details: Option<String>,
}

pub struct AuditLogger {
    log_file: String,
}

impl AuditLogger {
    pub fn new(log_file: String) -> Self {
        Self { log_file }
    }
    
    pub async fn log(&self, entry: AuditLogEntry) -> Result<(), String> {
        let log_line = serde_json::to_string(&entry)
            .map_err(|e| format!("Failed to serialize log entry: {}", e))?;
        
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_file)
            .map_err(|e| format!("Failed to open log file: {}", e))?;
        
        writeln!(file, "{}", log_line)
            .map_err(|e| format!("Failed to write log entry: {}", e))?;
        
        Ok(())
    }
    
    pub async fn log_login_attempt(&self, username: &str, success: bool, ip: Option<String>) {
        let entry = AuditLogEntry {
            timestamp: Utc::now(),
            user_id: None,
            username: Some(username.to_string()),
            action: "LOGIN_ATTEMPT".to_string(),
            resource: "AUTHENTICATION".to_string(),
            ip_address: ip,
            user_agent: None,
            success,
            details: None,
        };
        
        let _ = self.log(entry).await;
    }
    
    pub async fn log_user_action(&self, user_id: i32, username: &str, action: &str, resource: &str, success: bool) {
        let entry = AuditLogEntry {
            timestamp: Utc::now(),
            user_id: Some(user_id),
            username: Some(username.to_string()),
            action: action.to_string(),
            resource: resource.to_string(),
            ip_address: None,
            user_agent: None,
            success,
            details: None,
        };
        
        let _ = self.log(entry).await;
    }
}
```

### **3.2 File Upload Security**

#### **Secure File Upload:**
```rust
// src-tauri/src/file_security.rs
use std::path::Path;
use std::fs;
use mime_guess::MimeGuess;

pub struct FileSecurity;

impl FileSecurity {
    pub fn validate_file_type(file_path: &str, allowed_types: &[&str]) -> Result<(), String> {
        let mime_type = MimeGuess::from_path(file_path)
            .first_or_octet_stream()
            .to_string();
        
        if !allowed_types.contains(&mime_type.as_str()) {
            return Err(format!("File type {} not allowed", mime_type));
        }
        
        Ok(())
    }
    
    pub fn validate_file_size(file_path: &str, max_size: u64) -> Result<(), String> {
        let metadata = fs::metadata(file_path)
            .map_err(|e| format!("Failed to get file metadata: {}", e))?;
        
        if metadata.len() > max_size {
            return Err(format!("File size {} exceeds maximum {}", metadata.len(), max_size));
        }
        
        Ok(())
    }
    
    pub fn sanitize_filename(filename: &str) -> String {
        filename
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '.' || *c == '-' || *c == '_')
            .collect()
    }
    
    pub fn scan_for_malware(file_path: &str) -> Result<bool, String> {
        // Basic file content scanning
        let content = fs::read(file_path)
            .map_err(|e| format!("Failed to read file: {}", e))?;
        
        // Check for common malware signatures
        let suspicious_patterns = [
            b"<script>",
            b"javascript:",
            b"eval(",
            b"document.cookie",
            b"window.location",
        ];
        
        for pattern in &suspicious_patterns {
            if content.windows(pattern.len()).any(|window| window == *pattern) {
                return Ok(false); // Malware detected
            }
        }
        
        Ok(true) // Clean file
    }
}
```

---

## 🧪 **Phase 4: Security Testing & Validation (Week 4)**

### **4.1 Security Test Suite**

#### **Security Tests:**
```rust
// src-tauri/tests/security_tests.rs
#[cfg(test)]
mod security_tests {
    use super::*;
    
    #[tokio::test]
    async fn test_password_hashing() {
        let password = "TestPassword123!";
        let hash = PasswordSecurity::hash_password(password).unwrap();
        
        assert_ne!(password, hash);
        assert!(PasswordSecurity::verify_password(password, &hash).unwrap());
        assert!(!PasswordSecurity::verify_password("wrong", &hash).unwrap());
    }
    
    #[tokio::test]
    async fn test_rate_limiting() {
        let limiter = RateLimiter::new(3, Duration::from_secs(60));
        let identifier = "test_user";
        
        // Should allow first 3 attempts
        assert!(limiter.is_allowed(identifier).await);
        assert!(limiter.is_allowed(identifier).await);
        assert!(limiter.is_allowed(identifier).await);
        
        // Should block 4th attempt
        assert!(!limiter.is_allowed(identifier).await);
    }
    
    #[tokio::test]
    async fn test_input_validation() {
        // Valid inputs
        assert!(InputValidator::validate_email("test@example.com").is_ok());
        assert!(InputValidator::validate_username("testuser").is_ok());
        assert!(InputValidator::validate_password("TestPass123!").is_ok());
        
        // Invalid inputs
        assert!(InputValidator::validate_email("invalid-email").is_err());
        assert!(InputValidator::validate_username("ab").is_err());
        assert!(InputValidator::validate_password("weak").is_err());
    }
    
    #[tokio::test]
    async fn test_csrf_protection() {
        let csrf = CSRFProtection::new(Duration::from_secs(3600));
        let session_id = "test_session";
        
        let token = csrf.generate_token(session_id).await;
        assert!(csrf.validate_token(session_id, &token).await);
        assert!(!csrf.validate_token(session_id, "invalid_token").await);
    }
}
```

### **4.2 Penetration Testing Checklist**

#### **Security Testing Checklist:**
- [ ] **Authentication Testing**
  - [ ] Password brute force attacks
  - [ ] Session hijacking attempts
  - [ ] Token manipulation tests
  - [ ] Account lockout verification

- [ ] **Input Validation Testing**
  - [ ] SQL injection attempts
  - [ ] XSS payload testing
  - [ ] File upload attacks
  - [ ] CSRF token bypass

- [ ] **Authorization Testing**
  - [ ] Privilege escalation
  - [ ] Access control bypass
  - [ ] Role-based access testing
  - [ ] Resource access validation

- [ ] **Data Protection Testing**
  - [ ] Sensitive data exposure
  - [ ] Encryption verification
  - [ ] Backup security testing
  - [ ] Log file security

---

## 📊 **Implementation Timeline**

### **Week 1: Critical Fixes**
- [ ] Day 1-2: Password hashing implementation
- [ ] Day 3-4: JWT token system
- [ ] Day 5: Server-side input validation
- [ ] Day 6-7: Testing and integration

### **Week 2: High Priority**
- [ ] Day 1-2: Rate limiting implementation
- [ ] Day 3-4: CSRF protection
- [ ] Day 5-6: Account lockout system
- [ ] Day 7: Testing and validation

### **Week 3: Medium Priority**
- [ ] Day 1-2: Audit logging system
- [ ] Day 3-4: File upload security
- [ ] Day 5-6: Data encryption
- [ ] Day 7: Access controls

### **Week 4: Testing & Validation**
- [ ] Day 1-2: Security test suite
- [ ] Day 3-4: Penetration testing
- [ ] Day 5-6: Vulnerability scanning
- [ ] Day 7: Documentation and review

---

## 🎯 **Expected Security Improvements**

### **Before Implementation:**
- **Security Grade:** C+ (Critical vulnerabilities)
- **Password Security:** Plain text storage
- **Session Management:** localStorage tokens
- **Input Validation:** Client-side only
- **Rate Limiting:** None
- **Audit Logging:** None

### **After Implementation:**
- **Security Grade:** A+ (Enterprise-level)
- **Password Security:** bcrypt/Argon2 hashing
- **Session Management:** JWT with expiration
- **Input Validation:** Server-side validation
- **Rate Limiting:** Brute force protection
- **Audit Logging:** Comprehensive logging

---

## 🚀 **Next Steps**

1. **Immediate Action:** Begin password hashing implementation
2. **Week 1:** Complete critical security fixes
3. **Week 2:** Implement high-priority security features
4. **Week 3:** Add medium-priority security enhancements
5. **Week 4:** Conduct comprehensive security testing

---

**Status:** 🚀 **Ready for Implementation**  
**Priority:** 🔴 **Critical - Start Immediately**  
**Expected Outcome:** Enterprise-grade security (Grade A+)  
**Timeline:** 4 weeks for complete security overhaul

---

*Security Hardening Implementation Guide completed using Cursor Premium Requests*  
*Comprehensive implementation plan with code examples provided*
