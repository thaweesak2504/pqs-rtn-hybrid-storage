#[cfg(test)]
mod tests {
    use crate::content_database::list_template_simulation_documents_with_conn;
    use crate::test_helpers::helpers::{create_test_db, init_content_schema};
    use rusqlite::{params, Connection};

    fn add_simulation_schema(conn: &Connection) {
        conn.execute_batch(
            "CREATE TABLE DocumentSimulationInstances (
                simulation_document_id TEXT PRIMARY KEY,
                template_document_id TEXT NOT NULL,
                trainee_id TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(simulation_document_id) REFERENCES Documents(id) ON DELETE CASCADE,
                FOREIGN KEY(template_document_id) REFERENCES Documents(id) ON DELETE RESTRICT
            );
            CREATE TABLE IF NOT EXISTS UserAnswers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                question_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                sub_question_code TEXT NOT NULL DEFAULT '',
                answer_text TEXT,
                status TEXT DEFAULT 'pending',
                feedback TEXT,
                assessed_at TEXT,
                assessed_by TEXT,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                attachments TEXT
            );
            DROP TABLE IF EXISTS UserProgress;
            CREATE TABLE UserProgress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                document_id TEXT NOT NULL,
                section_id INTEGER,
                earned_score INTEGER DEFAULT 0,
                max_score INTEGER DEFAULT 0,
                completion_percentage REAL DEFAULT 0,
                is_passed INTEGER DEFAULT 0,
                passing_score INTEGER DEFAULT 100,
                last_updated TEXT DEFAULT CURRENT_TIMESTAMP
            );",
        )
        .expect("Failed to add simulation test schema");
    }

    #[test]
    fn lists_only_existing_simulations_with_work_summary() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");
        add_simulation_schema(&conn);

        conn.execute(
            "INSERT INTO Documents (id, name, status) VALUES (?1, 'Template', 'draft')",
            params!["DOC-TEMPLATE"],
        )
        .unwrap();
        for id in ["DOC-TEMPLATE-SIM-004", "DOC-TEMPLATE-SIM-005"] {
            conn.execute(
                "INSERT INTO Documents (id, name, status) VALUES (?1, 'Simulation', 'simulation')",
                params![id],
            )
            .unwrap();
            conn.execute(
                "INSERT INTO DocumentSimulationInstances
                 (simulation_document_id, template_document_id, trainee_id)
                 VALUES (?1, 'DOC-TEMPLATE', 'T-001')",
                params![id],
            )
            .unwrap();
        }

        conn.execute(
            "INSERT INTO Sections
             (id, document_id, section_group, section_number, title_th, menu_label, display_order, is_system_defined)
             VALUES (7004, 'DOC-TEMPLATE-SIM-004', 100, 101, 'S101', '101', 1, 1)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO Questions
             (id, document_id, section_id, sequence, content, is_header)
             VALUES ('Q-SIM-004', 'DOC-TEMPLATE-SIM-004', 7004, 1, 'Question', 0)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO QuestionAnswerKeys
             (question_id, sub_question_code, answer_key_text, order_index)
             VALUES ('Q-SIM-004', '', 'Key', 0)",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO UserAnswers
             (user_id, question_id, document_id, sub_question_code, answer_text, status,
              feedback, assessed_by, attachments)
             VALUES ('T-001', 'Q-SIM-004', 'DOC-TEMPLATE-SIM-004', '', 'Answer',
                     'needs_improvement', 'Revise', 'Q-001', '[\"data/a.pdf\",\"data/b.jpg\"]')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO UserProgress
             (user_id, document_id, section_id, earned_score, max_score)
             VALUES ('T-001', 'DOC-TEMPLATE-SIM-004', 7004, 0, 1)",
            [],
        )
        .unwrap();

        let rows = list_template_simulation_documents_with_conn(&conn, "DOC-TEMPLATE")
            .expect("Failed to list simulations");

        assert_eq!(rows.len(), 2);
        let sim_004 = rows
            .iter()
            .find(|row| row.simulation_document_id.ends_with("SIM-004"))
            .unwrap();
        assert_eq!(sim_004.answered_count, 1);
        assert_eq!(sim_004.assessed_count, 1);
        assert_eq!(sim_004.needs_improvement_count, 1);
        assert_eq!(sim_004.attachment_count, 2);
        assert_eq!(sim_004.progress_record_count, 1);
        assert!(sim_004
            .attachment_directory
            .ends_with("DOC-TEMPLATE-SIM-004/trainee-attachments"));
    }

    #[test]
    fn rejects_a_simulation_id_as_the_template_scope() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");
        add_simulation_schema(&conn);
        conn.execute(
            "INSERT INTO Documents (id, name, status) VALUES ('TEMPLATE', 'Template', 'draft')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO Documents (id, name, status) VALUES ('SIM-001', 'Simulation', 'simulation')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO DocumentSimulationInstances
             (simulation_document_id, template_document_id, trainee_id)
             VALUES ('SIM-001', 'TEMPLATE', 'T-001')",
            [],
        )
        .unwrap();

        let error = list_template_simulation_documents_with_conn(&conn, "SIM-001")
            .expect_err("A simulation must not be treated as its own Template scope");
        assert_eq!(error, "Template document not found");
    }
}
