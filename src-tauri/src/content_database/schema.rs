use super::*;
use crate::logger;
use rusqlite::{params, Connection, OptionalExtension};

pub const STANDARD_BRANCH_NAME: &str = "ต้นแบบมาตรฐาน";
pub const STANDARD_BRANCH_PREFERRED_CODE: &str = "STD";
const STANDARD_SUB_BRANCH_PREFERRED_CODE: &str = "STD";

fn execute_best_effort(conn: &Connection, sql: &str, context: &str) {
    if let Err(e) = conn.execute(sql, []) {
        let message = e.to_string();
        if message.contains("duplicate column name")
            || message.contains("already exists")
            || message.contains("no such index")
        {
        } else {
            logger::warn(format!(
                "Best-effort schema step '{}' failed: {}",
                context, e
            ));
        }
    }
}

pub fn next_available_main_branch_code(conn: &Connection) -> Result<String, String> {
    let preferred_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM OccupationBranches WHERE code = ?1)",
            params![STANDARD_BRANCH_PREFERRED_CODE],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if !preferred_exists {
        return Ok(STANDARD_BRANCH_PREFERRED_CODE.to_string());
    }

    let next_numeric: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(CASE WHEN code GLOB '[0-9]*' THEN CAST(code AS INTEGER) END), 0) + 1 FROM OccupationBranches",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(next_numeric.to_string())
}
pub fn next_available_sub_branch_code(
    conn: &Connection,
    branch_code: &str,
) -> Result<String, String> {
    let preferred_exists: bool = conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM OccupationSubBranches WHERE branch_code = ?1 AND code = ?2)",
            params![branch_code, STANDARD_SUB_BRANCH_PREFERRED_CODE],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if !preferred_exists {
        return Ok(STANDARD_SUB_BRANCH_PREFERRED_CODE.to_string());
    }

    let next_numeric: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(CASE WHEN code GLOB '[0-9]*' THEN CAST(code AS INTEGER) END), 0) + 1 FROM OccupationSubBranches WHERE branch_code = ?1",
            params![branch_code],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(next_numeric.to_string())
}
pub fn ensure_standard_occupation_branch_exists(conn: &Connection) -> Result<(), String> {
    let standard_main_code: String = match conn
        .query_row(
            "SELECT code FROM OccupationBranches WHERE name = ?1 LIMIT 1",
            params![STANDARD_BRANCH_NAME],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?
    {
        Some(code) => code,
        None => {
            let code = next_available_main_branch_code(conn)?;
            conn.execute(
                "INSERT INTO OccupationBranches (code, name) VALUES (?1, ?2)",
                params![code, STANDARD_BRANCH_NAME],
            )
            .map_err(|e| e.to_string())?;
            code
        }
    };

    let standard_sub_exists: bool = conn
        .query_row(
            "SELECT EXISTS(
                SELECT 1 FROM OccupationSubBranches
                WHERE branch_code = ?1 AND name = ?2
            )",
            params![standard_main_code, STANDARD_BRANCH_NAME],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if !standard_sub_exists {
        let sub_code = next_available_sub_branch_code(conn, &standard_main_code)?;
        conn.execute(
            "INSERT INTO OccupationSubBranches (code, branch_code, name) VALUES (?1, ?2, ?3)",
            params![sub_code, standard_main_code, STANDARD_BRANCH_NAME],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
fn install_standard_occupation_branch_guards(conn: &Connection) -> Result<(), String> {
    let trigger_sql = r#"
        CREATE TRIGGER IF NOT EXISTS protect_standard_occupation_branch_update
        BEFORE UPDATE ON OccupationBranches
        FOR EACH ROW
        WHEN OLD.name = '__STANDARD_BRANCH_NAME__'
             AND (NEW.name <> OLD.name OR NEW.code <> OLD.code)
        BEGIN
            SELECT RAISE(ABORT, 'Cannot modify the protected standard occupation branch');
        END;

        CREATE TRIGGER IF NOT EXISTS protect_standard_occupation_branch_delete
        BEFORE DELETE ON OccupationBranches
        FOR EACH ROW
        WHEN OLD.name = '__STANDARD_BRANCH_NAME__'
        BEGIN
            SELECT RAISE(ABORT, 'Cannot delete the protected standard occupation branch');
        END;

        CREATE TRIGGER IF NOT EXISTS protect_standard_occupation_sub_branch_update
        BEFORE UPDATE ON OccupationSubBranches
        FOR EACH ROW
        WHEN OLD.name = '__STANDARD_BRANCH_NAME__'
             AND EXISTS(
                 SELECT 1
                 FROM OccupationBranches
                 WHERE code = OLD.branch_code
                   AND name = '__STANDARD_BRANCH_NAME__'
             )
             AND (NEW.name <> OLD.name OR NEW.code <> OLD.code OR NEW.branch_code <> OLD.branch_code)
        BEGIN
            SELECT RAISE(ABORT, 'Cannot modify the protected standard occupation sub-branch');
        END;

        CREATE TRIGGER IF NOT EXISTS protect_standard_occupation_sub_branch_delete
        BEFORE DELETE ON OccupationSubBranches
        FOR EACH ROW
        WHEN OLD.name = '__STANDARD_BRANCH_NAME__'
             AND EXISTS(
                 SELECT 1
                 FROM OccupationBranches
                 WHERE code = OLD.branch_code
                   AND name = '__STANDARD_BRANCH_NAME__'
             )
        BEGIN
            SELECT RAISE(ABORT, 'Cannot delete the protected standard occupation sub-branch');
        END;
    "#
    .replace("__STANDARD_BRANCH_NAME__", STANDARD_BRANCH_NAME);

    conn.execute_batch(&trigger_sql)
        .map_err(|e| e.to_string())?;

    Ok(())
}
pub fn is_protected_main_branch(conn: &Connection, code: &str) -> Result<bool, String> {
    let name = conn
        .query_row(
            "SELECT name FROM OccupationBranches WHERE code = ?1",
            params![code],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(matches!(name.as_deref(), Some(STANDARD_BRANCH_NAME)))
}
pub fn is_protected_sub_branch(
    conn: &Connection,
    branch_code: &str,
    code: &str,
) -> Result<bool, String> {
    let sub_name = conn
        .query_row(
            "SELECT name FROM OccupationSubBranches WHERE branch_code = ?1 AND code = ?2",
            params![branch_code, code],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;

    if !matches!(sub_name.as_deref(), Some(STANDARD_BRANCH_NAME)) {
        return Ok(false);
    }

    is_protected_main_branch(conn, branch_code)
}
pub fn initialize_content_database() -> Result<String, String> {
    let mut conn = get_content_connection()
        .map_err(|e| format!("Failed to connect to content database: {}", e))?;

    // Users table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            rank TEXT,
            role TEXT NOT NULL DEFAULT 'visitor',
            is_active BOOLEAN NOT NULL DEFAULT 1,
            avatar_path TEXT,
            avatar_updated_at DATETIME,
            avatar_mime TEXT,
            avatar_size INTEGER,
            must_change_password BOOLEAN NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )
    .map_err(|e| format!("Failed to create users table: {}", e))?;

    // High ranking officers table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS high_ranking_officers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            thai_name TEXT NOT NULL,
            position_thai TEXT NOT NULL,
            position_english TEXT NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0,
            avatar_path TEXT,
            avatar_updated_at DATETIME,
            avatar_mime TEXT,
            avatar_size INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )
    .map_err(|e| format!("Failed to create high_ranking_officers table: {}", e))?;

    // Seed admin user if not exists
    let admin_exists: i32 = conn
        .query_row(
            "SELECT COUNT(*) FROM users WHERE role = 'admin'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if admin_exists == 0 {
        // Seed default admin with documented credentials. The `must_change_password`
        // flag is set so the UI MUST force a password change on first login.
        // This pattern guarantees a usable admin exists in distributed desktop apps
        // without shipping a real secret.
        let admin_password_hash =
            bcrypt::hash(crate::auth::DEFAULT_ADMIN_PASSWORD, bcrypt::DEFAULT_COST)
                .map_err(|e| format!("Failed to hash admin password: {}", e))?;

        conn.execute(
            "INSERT INTO users (username, email, password_hash, full_name, rank, role, is_active, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
            rusqlite::params![
                crate::auth::DEFAULT_ADMIN_USERNAME,
                crate::auth::DEFAULT_ADMIN_EMAIL,
                admin_password_hash,
                "System Administrator",
                "ร.ต.",
                "admin",
                true
            ],
        ).map_err(|e| format!("Failed to insert admin user: {}", e))?;
    }

    // Seed default high ranking officers if not exists
    let officer_count: i32 = conn
        .query_row("SELECT COUNT(*) FROM high_ranking_officers", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);

    if officer_count == 0 {
        let officers = vec![
            (
                "พลเรือเอก จิรพล ว่องวิทย์",
                "ผู้บัญชาการทหารเรือ",
                "Commander-in-Chief, Royal Thai Navy",
                1,
            ),
            (
                "พลเรือเอก ชลธิศ นาวานุเคราะห์",
                "รองผู้บัญชาการทหารเรือ",
                "Deputy Commander-in-Chief, Royal Thai Navy",
                2,
            ),
            (
                "พลเรือเอก ณัฏฐพล เดี่ยววานิช",
                "ผู้บัญชาการกองเรือยุทธการ",
                "Commander, Royal Thai Fleet",
                3,
            ),
        ];

        for (thai_name, position_thai, position_english, order_index) in officers {
            conn.execute(
                "INSERT INTO high_ranking_officers (thai_name, position_thai, position_english, order_index) VALUES (?, ?, ?, ?)",
                rusqlite::params![thai_name, position_thai, position_english, order_index],
            ).map_err(|e| format!("Failed to insert officer {}: {}", thai_name, e))?;
        }
    }
    // ── End consolidated tables ─────────────────────────────────────────

    // Create OwnerUnits table
    // This schema MUST match sql/OwnerUnits.sql structure
    conn.execute(
        "CREATE TABLE IF NOT EXISTS OwnerUnits (
            unit_id VARCHAR(7) PRIMARY KEY,
            unit_name VARCHAR(255) NOT NULL,
            unit_abbr VARCHAR(100),
            parent_id VARCHAR(7),
            unit_level INT
        )",
        [],
    )
    .map_err(|e| format!("Failed to create OwnerUnits table: {}", e))?;

    // Create Documents table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS Documents (
            id VARCHAR(11) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            applied_to TEXT,
            unit_owner_id VARCHAR(7),
            unit_code VARCHAR(5),
            doc_type VARCHAR(2),
            user_level CHAR(1),
            sequence INT,
            status VARCHAR(20) DEFAULT 'draft',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
         )",
        [],
    )
    .map_err(|e| format!("Failed to create Documents table: {}", e))?;

    // Migration: add occupation_branch columns if not exist (safe to run multiple times)
    execute_best_effort(
        &conn,
        "ALTER TABLE Documents ADD COLUMN occupation_branch_main VARCHAR(10)",
        "add Documents.occupation_branch_main",
    );
    execute_best_effort(
        &conn,
        "ALTER TABLE Documents ADD COLUMN occupation_branch_sub VARCHAR(10)",
        "add Documents.occupation_branch_sub",
    );
    // Phase1: is_template flag — distinguishes seeded template docs from user-created ones
    execute_best_effort(
        &conn,
        "ALTER TABLE Documents ADD COLUMN is_template BOOLEAN DEFAULT 0",
        "add Documents.is_template",
    );

    // Create Sections table
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
             created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
             UNIQUE(document_id, section_number),
             FOREIGN KEY (document_id) REFERENCES Documents(id) ON DELETE CASCADE
         )",
        [],
    )
    .map_err(|e| format!("Failed to create Sections table: {}", e))?;

    // Migration: Add scoring columns to Sections if missing
    execute_best_effort(
        &conn,
        "ALTER TABLE Sections ADD COLUMN duration_value INTEGER",
        "add Sections.duration_value",
    );
    execute_best_effort(
        &conn,
        "ALTER TABLE Sections ADD COLUMN duration_unit VARCHAR(20) DEFAULT 'weeks'",
        "add Sections.duration_unit",
    );
    execute_best_effort(
        &conn,
        "ALTER TABLE Sections ADD COLUMN total_score INTEGER",
        "add Sections.total_score",
    );
    // Phase1: is_template flag — distinguishes seeded sections from user-created ones
    execute_best_effort(
        &conn,
        "ALTER TABLE Sections ADD COLUMN is_template BOOLEAN DEFAULT 0",
        "add Sections.is_template",
    );

    // Create indexes for Sections
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sections_document ON Sections(document_id)",
        [],
    )
    .map_err(|e| format!("Failed to create sections document index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sections_number ON Sections(document_id, section_number)",
        [],
    )
    .map_err(|e| format!("Failed to create sections number index: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_sections_group ON Sections(document_id, section_group)",
        [],
    )
    .map_err(|e| format!("Failed to create sections group index: {}", e))?;

    // Initialize Questions, Choices, References tables
    initialize_question_tables(&conn)?;

    // Migrate QuestionSectionLinks → L3 section_ref Questions (one-time)
    match migrate_section_links_to_ref_children() {
        Ok(count) => {
            if count > 0 {
                logger::info(format!(
                    "Migrated {} section links to L3 section_ref Questions",
                    count
                ));
            }
        }
        Err(e) => logger::warn(format!("Section link→L3 migration warning: {}", e)),
    }

    // Seed OwnerUnits if empty
    seed_owner_units(&conn)?;

    // Phase1: One-time migration — mark all seeded records with is_template=1
    // Safe to run on every startup: WHERE clause limits to records not yet marked
    // Mark all Sections as template (all sections in this app are system-defined)
    execute_best_effort(
        &conn,
        "UPDATE Sections SET is_template = 1 WHERE is_system_defined = 1 AND is_template = 0",
        "mark seeded Sections as template",
    );
    // Mark Section 100/200/300 seeded Questions as template
    execute_best_effort(
        &conn,
        "UPDATE Questions SET is_template = 1
          WHERE is_template = 0
            AND section_id IN (
                SELECT id FROM Sections WHERE is_system_defined = 1
            )",
        "mark seeded Questions as template",
    );

    // Hotfix: Correct typo "ไฟฟ้าอาวุะ" to "ไฟฟ้าอาวุธ" in existing occupation branches
    execute_best_effort(
         &conn,
         "UPDATE OccupationBranches SET name = REPLACE(name, 'ไฟฟ้าอาวุะ', 'ไฟฟ้าอาวุธ') WHERE name LIKE '%ไฟฟ้าอาวุะ%'",
         "normalize OccupationBranches typo",
     );
    execute_best_effort(
         &conn,
         "UPDATE OccupationSubBranches SET name = REPLACE(name, 'ไฟฟ้าอาวุะ', 'ไฟฟ้าอาวุธ') WHERE name LIKE '%ไฟฟ้าอาวุะ%'",
         "normalize OccupationSubBranches typo",
     );

    // Phase 2: run versioned schema migrations AFTER all CREATE TABLE IF NOT
    // EXISTS statements so fresh installs have a complete schema to baseline
    // against, and legacy DBs get pending ALTERs applied in strict version order.
    // See `src-tauri/src/migrations.rs` for framework details.
    let report =
        crate::migrations::run_pending_migrations(&mut conn, &crate::migrations::all_migrations())?;
    if !report.applied.is_empty() || !report.baselined.is_empty() {
        logger::info(format!(
            "Schema migrations: applied={:?}, baselined={:?}, skipped={:?}",
            report.applied, report.baselined, report.skipped
        ));
    }

    Ok("Content database initialized successfully".to_string())
}
/// Seed OwnerUnits from SQL file if table is empty
pub fn seed_owner_units(conn: &Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM OwnerUnits", [], |row| row.get(0))
        .unwrap_or(0);

    if count == 0 {
        logger::info("Seeding OwnerUnits from embedded SQL...");
        let sql = include_str!("../../sql/OwnerUnits.sql");
        conn.execute_batch(sql)
            .map_err(|e| format!("Failed to seed OwnerUnits: {}", e))?;
    }

    Ok(())
}
pub fn initialize_question_tables(conn: &Connection) -> Result<(), String> {
    // Questions Table
    // Updated to include section_id, answer_type, and scoring columns
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
            is_template BOOLEAN DEFAULT 0,
            FOREIGN KEY(document_id) REFERENCES Documents(id) ON DELETE CASCADE,
            FOREIGN KEY(parent_id) REFERENCES Questions(id) ON DELETE CASCADE
        )",
        [],
    )
    .map_err(|e| format!("Failed to create Questions table: {}", e))?;

    // Migration: Add new columns if missing (swallow errors if they exist)
    execute_best_effort(
        conn,
        "ALTER TABLE Questions ADD COLUMN section_id INTEGER",
        "add Questions.section_id",
    );
    execute_best_effort(
        conn,
        "ALTER TABLE Questions ADD COLUMN answer_type VARCHAR(20) DEFAULT 'text'",
        "add Questions.answer_type",
    );
    execute_best_effort(
        conn,
        "ALTER TABLE Questions ADD COLUMN score INTEGER DEFAULT 0",
        "add Questions.score",
    );
    execute_best_effort(
        conn,
        "ALTER TABLE Questions ADD COLUMN question_type VARCHAR(20) DEFAULT 'normal'",
        "add Questions.question_type",
    );
    execute_best_effort(
        conn,
        "ALTER TABLE Questions ADD COLUMN group_score INTEGER DEFAULT 0",
        "add Questions.group_score",
    );
    execute_best_effort(
        conn,
        "ALTER TABLE Questions ADD COLUMN display_text TEXT",
        "add Questions.display_text",
    );
    execute_best_effort(
        conn,
        "ALTER TABLE Questions ADD COLUMN is_group_header BOOLEAN DEFAULT 0",
        "add Questions.is_group_header",
    );
    execute_best_effort(
        conn,
        "ALTER TABLE Questions ADD COLUMN is_scored BOOLEAN DEFAULT 0",
        "add Questions.is_scored",
    );
    // Phase1: is_template flag — template-seeded questions are read-only
    execute_best_effort(
        conn,
        "ALTER TABLE Questions ADD COLUMN is_template BOOLEAN DEFAULT 0",
        "add Questions.is_template",
    );

    // Data migration: Fix existing Section 300 questions with correct scoring flags
    // Rule: L1 questions (parent_id IS NULL) with sequence 2-6 in section 300 docs → group headers
    // Rule: L2 questions (parent_id IS NOT NULL) with sequence 1-3 under seq=1 parent → not scored
    // Rule: L2 questions with sequence 4-5 under seq=1 parent → scored
    // Rule: L1 seq=7 children (seq 1-2) → not scored

    // Set is_group_header=1 for L1 questions (seq 2-6) in 300-series sections
    // Skip questions that are exempted AND have no children (already cleaned up)
    execute_best_effort(
        conn,
        "UPDATE Questions SET is_group_header = 1, is_scored = 0
         WHERE parent_id IS NULL
           AND sequence BETWEEN 2 AND 6
           AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)
           AND NOT (question_type = 'exempted' AND NOT EXISTS (SELECT 1 FROM Questions c WHERE c.parent_id = Questions.id))",
        "backfill Section 300 L1 group headers 2-6",
    );

    // Set is_group_header=1, is_scored=0 for L1 seq=1 and seq=7 (non-scoring group headers)
    // Skip questions that are exempted AND have no children (already cleaned up)
    execute_best_effort(
        conn,
        "UPDATE Questions SET is_group_header = 1, is_scored = 0
         WHERE parent_id IS NULL
           AND sequence IN (1, 7)
           AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)
           AND NOT (question_type = 'exempted' AND NOT EXISTS (SELECT 1 FROM Questions c WHERE c.parent_id = Questions.id))",
        "backfill Section 300 L1 group headers 1 and 7",
    );

    // Set is_scored=0 for L2 seq 1-3 under L1 seq=1 (prerequisites: 3xx.1.1-3xx.1.3)
    execute_best_effort(
        conn,
        "UPDATE Questions SET is_scored = 0
         WHERE parent_id IN (
             SELECT id FROM Questions WHERE parent_id IS NULL AND sequence = 1
             AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)
         )
         AND sequence BETWEEN 1 AND 3",
        "backfill Section 300 prerequisite scoring flags",
    );

    // Set is_scored=1 for L2 seq 4-5 under L1 seq=1 (3xx.1.4-3xx.1.5)
    execute_best_effort(
        conn,
        "UPDATE Questions SET is_scored = 1
         WHERE parent_id IN (
             SELECT id FROM Questions WHERE parent_id IS NULL AND sequence = 1
             AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)
         )
         AND sequence BETWEEN 4 AND 5",
        "backfill Section 300 scored selector children",
    );

    // Set is_scored=0 for L2 children of L1 seq=7 (3xx.7.1-3xx.7.2)
    execute_best_effort(
        conn,
        "UPDATE Questions SET is_scored = 0
         WHERE parent_id IN (
             SELECT id FROM Questions WHERE parent_id IS NULL AND sequence = 7
             AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)
         )",
        "backfill Section 300 sequence 7 child scoring flags",
    );

    // Set is_scored=1 for L2 children of L1 seq 2-6
    execute_best_effort(
        conn,
        "UPDATE Questions SET is_scored = 1
         WHERE parent_id IN (
             SELECT id FROM Questions WHERE parent_id IS NULL AND sequence BETWEEN 2 AND 6
             AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)
         )
         AND is_scored = 0 AND question_type = 'normal'",
        "backfill Section 300 normal child scoring flags",
    );

    // (DEBUG backfills for 301.6 removed — already covered by seq 2-6 backfills above)

    // Recalculate group_score for all L1 group headers in section 300
    execute_best_effort(
        conn,
        "UPDATE Questions SET group_score = (
             SELECT COALESCE(SUM(c.score), 0)
             FROM Questions c
             WHERE c.parent_id = Questions.id AND c.is_scored = 1
         )
         WHERE is_group_header = 1
           AND section_id IN (SELECT id FROM Sections WHERE section_group = 300)",
        "recalculate Section 300 group_score backfill",
    );

    // Calculate and update total_score for all Section 300
    // Only count: individual scored questions (non-headers) + group headers' group_score
    // Avoid double-counting children of group headers
    execute_best_effort(
        conn,
        "UPDATE Sections SET total_score = (
             SELECT COALESCE(SUM(
                 CASE                     WHEN q.is_group_header = 1 THEN q.group_score
                     WHEN q.is_scored = 1 AND q.is_group_header = 0 AND q.parent_id IS NULL THEN q.score
                     ELSE 0
                 END
             ), 0)
             FROM Questions q
             WHERE q.section_id = Sections.id
        )
        WHERE section_group = 300",
        "recalculate Section 300 total_score backfill",
    );

    // QuestionChoices Table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS QuestionChoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id TEXT NOT NULL,
            label VARCHAR(10),
            content TEXT NOT NULL,
            is_correct BOOLEAN DEFAULT 0,
            sequence INT NOT NULL,
            FOREIGN KEY(question_id) REFERENCES Questions(id) ON DELETE CASCADE
        )",
        [],
    )
    .map_err(|e| format!("Failed to create QuestionChoices table: {}", e))?;

    // QuestionReferences Table (Inline Citations) - NEW
    conn.execute(
        "CREATE TABLE IF NOT EXISTS QuestionReferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id TEXT NOT NULL,
            reference_id INTEGER NOT NULL,
            location_text VARCHAR(50),
            display_order INTEGER NOT NULL,
            FOREIGN KEY (question_id) REFERENCES Questions(id) ON DELETE CASCADE,
            FOREIGN KEY (reference_id) REFERENCES DocumentReferences(id) ON DELETE RESTRICT
        )",
        [],
    )
    .map_err(|e| format!("Failed to create QuestionReferences table: {}", e))?;

    // QuestionSectionLinks Table — links 3xx.1.4/1.5 questions to 100/200 Sections
    // Similar pattern to QuestionReferences but for Section selection
    conn.execute(
        "CREATE TABLE IF NOT EXISTS QuestionSectionLinks (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id   TEXT NOT NULL,
            section_id    INTEGER NOT NULL,
            score         INTEGER DEFAULT 0,
            display_order INTEGER NOT NULL,
            FOREIGN KEY (question_id) REFERENCES Questions(id) ON DELETE CASCADE,
            FOREIGN KEY (section_id) REFERENCES Sections(id) ON DELETE CASCADE,
            UNIQUE(question_id, section_id)
        )",
        [],
    )
    .map_err(|e| format!("Failed to create QuestionSectionLinks table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_qsl_question ON QuestionSectionLinks(question_id)",
        [],
    )
    .map_err(|e| format!("Failed to create QuestionSectionLinks index: {}", e))?;

    // UserAnswers Table (Data Storage) - Refactored for Integrity
    conn.execute(
        "CREATE TABLE IF NOT EXISTS UserAnswers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            question_id TEXT NOT NULL,
            document_id VARCHAR(11) NOT NULL,
            sub_question_code VARCHAR(20) DEFAULT '',
            answer_text TEXT,
            status VARCHAR(20) DEFAULT 'pending',
            feedback TEXT,
            assessed_at DATETIME,
            assessed_by TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, question_id, document_id, sub_question_code),
            FOREIGN KEY(question_id) REFERENCES Questions(id) ON DELETE CASCADE,
            FOREIGN KEY(question_id, sub_question_code) REFERENCES QuestionAnswerKeys(question_id, sub_question_code) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create UserAnswers table: {}", e))?;

    // Check if we need to migrate UserAnswers to add the composite FK (Post-init migration)
    let needs_ua_fk_migration = conn.query_row(
        "SELECT COUNT(*) FROM pragma_foreign_key_list('UserAnswers') WHERE \"table\" = 'QuestionAnswerKeys'",
        [],
        |row| row.get::<_, i32>(0)
    ).unwrap_or(0) == 0;

    if needs_ua_fk_migration {
        logger::info("Migrating UserAnswers to add QuestionAnswerKeys foreign key...");
        // 1. Rename existing
        execute_best_effort(
            conn,
            "ALTER TABLE UserAnswers RENAME TO UserAnswers_old",
            "rename UserAnswers to UserAnswers_old",
        );
        // 2. Create new (with the new schema)
        conn.execute(
            "CREATE TABLE UserAnswers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                question_id TEXT NOT NULL,
                document_id VARCHAR(11) NOT NULL,
                sub_question_code VARCHAR(20) DEFAULT '',
                answer_text TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                feedback TEXT,
                assessed_at DATETIME,
                assessed_by TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, question_id, document_id, sub_question_code),
                FOREIGN KEY(question_id) REFERENCES Questions(id) ON DELETE CASCADE,
                FOREIGN KEY(question_id, sub_question_code) REFERENCES QuestionAnswerKeys(question_id, sub_question_code) ON DELETE CASCADE
            )",
            [],
        ).map_err(|e| format!("Failed to create new UserAnswers table: {}", e))?;
        // 3. Copy data
        execute_best_effort(
            conn,
            "INSERT INTO UserAnswers (id, user_id, question_id, document_id, sub_question_code, answer_text, status, feedback, assessed_at, assessed_by, updated_at)
             SELECT id, user_id, question_id, document_id, sub_question_code, answer_text, status, feedback, assessed_at, assessed_by, updated_at
             FROM UserAnswers_old",
            "copy rows from UserAnswers_old",
        );
        // 4. Drop old
        execute_best_effort(conn, "DROP TABLE UserAnswers_old", "drop UserAnswers_old");
    }

    // Migration: Add new assessment columns if missing
    execute_best_effort(
        conn,
        "ALTER TABLE UserAnswers ADD COLUMN answer_text TEXT",
        "add UserAnswers.answer_text",
    );
    execute_best_effort(
        conn,
        "ALTER TABLE UserAnswers ADD COLUMN status VARCHAR(20) DEFAULT 'pending'",
        "add UserAnswers.status",
    );
    execute_best_effort(
        conn,
        "ALTER TABLE UserAnswers ADD COLUMN feedback TEXT",
        "add UserAnswers.feedback",
    );
    execute_best_effort(
        conn,
        "ALTER TABLE UserAnswers ADD COLUMN assessed_at DATETIME",
        "add UserAnswers.assessed_at",
    );
    execute_best_effort(
        conn,
        "ALTER TABLE UserAnswers ADD COLUMN assessed_by TEXT",
        "add UserAnswers.assessed_by",
    );
    execute_best_effort(
        conn,
        "ALTER TABLE UserAnswers ADD COLUMN sub_question_code VARCHAR(20) DEFAULT ''",
        "add UserAnswers.sub_question_code",
    );

    // Ensure we have a unique index including sub_question_code (SQLite doesn't support ALTER TABLE DROP CONSTRAINT)
    execute_best_effort(
        conn,
        "DROP INDEX IF EXISTS idx_user_answers_composite",
        "drop idx_user_answers_composite",
    );
    execute_best_effort(conn, "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_answers_composite ON UserAnswers(user_id, question_id, document_id, sub_question_code)", "create idx_user_answers_composite");

    // UserProgress Table - Track trainee scoring progress per section
    conn.execute(
        "CREATE TABLE IF NOT EXISTS UserProgress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            document_id VARCHAR(11) NOT NULL,
            section_id INTEGER,
            earned_score INTEGER DEFAULT 0,
            max_score INTEGER DEFAULT 0,
            completion_percentage REAL DEFAULT 0.0,
            is_passed BOOLEAN DEFAULT 0,
            passing_score INTEGER DEFAULT 100,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, document_id, section_id),
            FOREIGN KEY(document_id) REFERENCES Documents(id) ON DELETE CASCADE,
            FOREIGN KEY(section_id) REFERENCES Sections(id) ON DELETE CASCADE
        )",
        [],
    )
    .map_err(|e| format!("Failed to create UserProgress table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_progress_user ON UserProgress(user_id)",
        [],
    )
    .map_err(|e| format!("Failed to create index on UserProgress.user_id: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_user_progress_doc ON UserProgress(user_id, document_id)",
        [],
    )
    .map_err(|e| format!("Failed to create index on UserProgress: {}", e))?;

    // References Table - Reusable reference documents
    // Updated Schema 2026-02-09: Added classification, file_path. Removed usage of is_common/short_name
    conn.execute(
        "CREATE TABLE IF NOT EXISTS DocumentReferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code VARCHAR(50) NOT NULL UNIQUE,
            title TEXT NOT NULL,
            category VARCHAR(50),
            classification VARCHAR(20) DEFAULT 'Unclassified',
            file_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )
    .map_err(|e| format!("Failed to create DocumentReferences table: {}", e))?;

    // Migration: Add new columns if missing
    execute_best_effort(conn, "ALTER TABLE DocumentReferences ADD COLUMN classification VARCHAR(20) DEFAULT 'Unclassified'", "add DocumentReferences.classification");
    execute_best_effort(
        conn,
        "ALTER TABLE DocumentReferences ADD COLUMN file_path TEXT",
        "add DocumentReferences.file_path",
    );
    execute_best_effort(
        conn,
        "ALTER TABLE DocumentReferences ADD COLUMN category VARCHAR(50)",
        "add DocumentReferences.category",
    );
    execute_best_effort(
        conn,
        "ALTER TABLE DocumentReferences ADD COLUMN resource_type VARCHAR(20) DEFAULT 'DOCUMENT'",
        "add DocumentReferences.resource_type",
    );

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_doc_refs_code ON DocumentReferences(code)",
        [],
    )
    .map_err(|e| format!("Failed to create index on DocumentReferences.code: {}", e))?;

    // SectionReferences Table - Many-to-many link between Sections and DocumentReferences
    conn.execute(
        "CREATE TABLE IF NOT EXISTS SectionReferences (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_id INTEGER NOT NULL,
            reference_id INTEGER NOT NULL,
            display_order INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(section_id, reference_id),
            FOREIGN KEY(section_id) REFERENCES Sections(id) ON DELETE CASCADE,
            FOREIGN KEY(reference_id) REFERENCES DocumentReferences(id) ON DELETE RESTRICT
        )",
        [],
    )
    .map_err(|e| format!("Failed to create SectionReferences table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_section_refs_section ON SectionReferences(section_id)",
        [],
    )
    .map_err(|e| {
        format!(
            "Failed to create index on SectionReferences.section_id: {}",
            e
        )
    })?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_section_refs_reference ON SectionReferences(reference_id)",
        [],
    )
    .map_err(|e| {
        format!(
            "Failed to create index on SectionReferences.reference_id: {}",
            e
        )
    })?;

    // OccupationBranches Table - Global main branches (สาขาอาชีพหลัก)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS OccupationBranches (
            code VARCHAR(10) PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )
    .map_err(|e| format!("Failed to create OccupationBranches table: {}", e))?;

    // OccupationSubBranches Table - Sub-branches (สาขาอาชีพย่อย)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS OccupationSubBranches (
            code VARCHAR(10) NOT NULL,
            branch_code VARCHAR(10) NOT NULL,
            name VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (branch_code, code),
            FOREIGN KEY (branch_code) REFERENCES OccupationBranches(code) ON DELETE CASCADE
        )",
        [],
    )
    .map_err(|e| format!("Failed to create OccupationSubBranches table: {}", e))?;

    install_standard_occupation_branch_guards(conn)?;
    ensure_standard_occupation_branch_exists(conn)?;

    // OccupationSubQuestions Table - Reusable sub-question templates
    conn.execute(
        "CREATE TABLE IF NOT EXISTS OccupationSubQuestions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            branch_code VARCHAR(10) NOT NULL,
            sub_branch_code VARCHAR(10) NOT NULL,
            code VARCHAR(20) NOT NULL UNIQUE,
            text TEXT NOT NULL,
            always_checked BOOLEAN DEFAULT 0,
            sequence INTEGER DEFAULT 0,
            is_completed BOOLEAN DEFAULT 0,
            FOREIGN KEY (branch_code, sub_branch_code) REFERENCES OccupationSubBranches(branch_code, code) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create OccupationSubQuestions table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_occ_subq_branch ON OccupationSubQuestions(branch_code, sub_branch_code)",
        [],
    ).map_err(|e| format!("Failed to create index on OccupationSubQuestions: {}", e))?;

    // Migration: update 3xx.3 standard branch mandatory item text to add 'พิเศษ'
    execute_best_effort(
        conn,
        "UPDATE OccupationSubQuestions \
         SET text = 'เริ่มปฏิบัติจริงหรือสมมติเหตุการณ์พิเศษ' \
         WHERE always_checked = 1 \
           AND SUBSTR(code, 1, 2) = '33' \
           AND branch_code IN (SELECT code FROM OccupationBranches WHERE name = 'ต้นแบบมาตรฐาน') \
           AND text NOT LIKE '%พิเศษ'",
        "migrate_3xx3_mandatory_add_phiset",
    );

    // Migration: add is_completed column to OccupationSubQuestions
    execute_best_effort(
        conn,
        "ALTER TABLE OccupationSubQuestions ADD COLUMN is_completed BOOLEAN DEFAULT 0",
        "add_is_completed_to_sub_questions",
    );

    // OccupationSlotCompletion Table — tracks tab-level completion per branch+sub+slot
    conn.execute(
        "CREATE TABLE IF NOT EXISTS OccupationSlotCompletion (
            branch_code VARCHAR(10) NOT NULL,
            sub_branch_code VARCHAR(10) NOT NULL,
            slot_id VARCHAR(10) NOT NULL,
            is_completed BOOLEAN DEFAULT 0,
            PRIMARY KEY (branch_code, sub_branch_code, slot_id),
            FOREIGN KEY (branch_code, sub_branch_code) REFERENCES OccupationSubBranches(branch_code, code) ON DELETE CASCADE
        )",
        [],
    ).map_err(|e| format!("Failed to create OccupationSlotCompletion table: {}", e))?;

    // Migration: standardise all sub-question codes to 8-digit format (AABCCDDEE)
    migrate_sub_question_codes_to_8digit(conn)?;

    // QuestionSubQuestionLinks Table - Relational storage for selected sub-questions per question
    // Replaces JSON array 'selectedSubQuestions' in Questions.metadata
    conn.execute(
        "CREATE TABLE IF NOT EXISTS QuestionSubQuestionLinks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id TEXT NOT NULL,
            sub_question_code VARCHAR(20) NOT NULL,
            UNIQUE(question_id, sub_question_code),
            FOREIGN KEY (question_id) REFERENCES Questions(id) ON DELETE CASCADE
        )",
        [],
    )
    .map_err(|e| format!("Failed to create QuestionSubQuestionLinks table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_qsql_question ON QuestionSubQuestionLinks(question_id)",
        [],
    )
    .map_err(|e| format!("Failed to create index on QuestionSubQuestionLinks: {}", e))?;

    // QuestionAnswerKeys Table - Normalized storage for answer keys
    // Replaces JSON 'answerKeys' and 'answerKey' in Questions.metadata
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
    )
    .map_err(|e| format!("Failed to create QuestionAnswerKeys table: {}", e))?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_qak_question ON QuestionAnswerKeys(question_id)",
        [],
    )
    .map_err(|e| format!("Failed to create index on QuestionAnswerKeys: {}", e))?;

    // One-time data migration: extract selectedSubQuestions from JSON metadata → QuestionSubQuestionLinks
    // This is safe to run on every startup — it only processes questions not yet in the links table.
    migrate_selected_sub_questions_to_table(conn)?;

    // One-time data migration: extract answerKeys from JSON metadata -> QuestionAnswerKeys
    migrate_answer_keys_to_table(conn)?;

    // Final cleanup: Remove legacy keys from JSON metadata once migrated
    scrub_legacy_answer_keys_from_metadata(conn)?;

    // Hotfix cleanup: convert all 'main' sub_question_code to '' (empty string)
    // This merges records inadvertently created with 'main' code during previous debug steps.
    execute_best_effort(
        conn,
        "UPDATE OR IGNORE QuestionAnswerKeys SET sub_question_code = '' WHERE sub_question_code = 'main'",
        "normalize QuestionAnswerKeys.main to empty code",
    );
    execute_best_effort(
        conn,
        "DELETE FROM QuestionAnswerKeys WHERE sub_question_code = 'main'",
        "delete residual QuestionAnswerKeys.main rows",
    );

    // Also cleanup UserAnswers to maintain alignment and foreign key integrity
    execute_best_effort(
        conn,
        "UPDATE OR IGNORE UserAnswers SET sub_question_code = '' WHERE sub_question_code = 'main'",
        "normalize UserAnswers.main to empty code",
    );
    execute_best_effort(
        conn,
        "DELETE FROM UserAnswers WHERE sub_question_code = 'main'",
        "delete residual UserAnswers.main rows",
    );

    Ok(())
}
/// Migrate existing QuestionSectionLinks → L3 section_ref Questions
/// Call once to convert link-based data to proper L3 children
pub fn migrate_section_links_to_ref_children() -> Result<usize, String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;

    // Check if there are any links to migrate
    let link_count: i32 = conn
        .query_row("SELECT COUNT(*) FROM QuestionSectionLinks", [], |row| {
            row.get(0)
        })
        .unwrap_or(0);

    if link_count == 0 {
        return Ok(0);
    }

    let mut stmt = conn
        .prepare(
            "SELECT qsl.id, qsl.question_id, qsl.section_id, qsl.score, qsl.display_order,
                s.section_number, s.title_th,
                q.document_id, q.section_id as q_section_id
         FROM QuestionSectionLinks qsl
         JOIN Sections s ON qsl.section_id = s.id
         JOIN Questions q ON qsl.question_id = q.id
         ORDER BY qsl.question_id, qsl.display_order",
        )
        .map_err(|e| e.to_string())?;

    type LinkRow = (i64, String, i64, i32, i32, i32, String, String, Option<i64>);
    let links: Vec<LinkRow> = stmt
        .query_map([], |row| {
            Ok((
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
                row.get(8)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    let mut migrated = 0;
    let mut seen_parents: std::collections::HashSet<String> = std::collections::HashSet::new();

    for (
        _link_id,
        parent_id,
        section_id,
        score,
        display_order,
        section_number,
        section_title,
        document_id,
        q_section_id,
    ) in &links
    {
        // Check if L3 question already exists for this section ref
        let exists: bool = conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM Questions WHERE parent_id = ?1 AND question_type = 'section_ref' AND metadata LIKE ?2)",
            params![parent_id, format!("%\"refSectionId\":{}%", section_id)],
            |row| row.get(0),
        ).unwrap_or(true);

        if !exists {
            let id = generate_uuid();
            let metadata = serde_json::json!({
                "refSectionId": section_id,
                "refSectionNumber": section_number
            })
            .to_string();

            conn.execute(
                "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_header, answer_type, metadata, score, question_type, group_score, is_group_header, is_scored)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, 'text', ?7, ?8, 'section_ref', 0, 0, 1)",
                params![id, document_id, q_section_id, parent_id, display_order, section_title, metadata, score],
            ).map_err(|e| e.to_string())?;

            migrated += 1;
        }

        seen_parents.insert(parent_id.clone());
    }

    // Mark all parents as group_header and recalculate scores
    for pid in &seen_parents {
        conn.execute(
            "UPDATE Questions SET is_group_header = 1 WHERE id = ?1",
            params![pid],
        )
        .map_err(|e| e.to_string())?;
        recalculate_group_score_chain(&conn, pid)?;
    }

    // Delete migrated links
    if migrated > 0 {
        conn.execute("DELETE FROM QuestionSectionLinks", [])
            .map_err(|e| e.to_string())?;
    }

    Ok(migrated)
}
#[cfg(test)]
pub fn init_branch_protection_schema(conn: &Connection) {
    crate::test_helpers::helpers::init_content_schema(conn).expect("Failed to init schema");
    conn.execute(
        "CREATE TABLE IF NOT EXISTS OccupationSubBranches (
                code VARCHAR(10) NOT NULL,
                branch_code VARCHAR(10) NOT NULL,
                name VARCHAR(255) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (branch_code, code),
                FOREIGN KEY (branch_code) REFERENCES OccupationBranches(code) ON DELETE CASCADE
            )",
        [],
    )
    .expect("Failed to create OccupationSubBranches table");
    install_standard_occupation_branch_guards(conn).expect("Failed to install branch triggers");
    ensure_standard_occupation_branch_exists(conn).expect("Failed to ensure standard branch");
}
