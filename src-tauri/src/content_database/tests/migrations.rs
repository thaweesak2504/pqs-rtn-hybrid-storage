#[cfg(test)]
mod tests {
    
    
    
    
    use crate::test_helpers::helpers::*;
    

    // Sub-question code migration Tests
    // ========================================================================

    #[test]
    fn test_migrate_sub_question_codes_skips_already_8digit_codes() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        conn.execute(
            "INSERT INTO OccupationBranches (code, name) VALUES ('05', 'Branch 5')",
            [],
        )
        .unwrap();
        conn.execute("INSERT INTO OccupationSubBranches (code, branch_code, name) VALUES ('02', '05', 'Sub 2')", []).unwrap();

        // Insert already-correct 8-digit codes
        conn.execute(
            "INSERT INTO OccupationSubQuestions (branch_code, sub_branch_code, code, text, always_checked, sequence)
             VALUES ('05', '02', '22050201', 'Item A', 0, 1),
                    ('05', '02', '22050202', 'Item B', 0, 2)",
            [],
        ).expect("insert 8-digit codes");

        crate::content_database::migrate_sub_question_codes_to_8digit(&conn)
            .expect("Migration should succeed on already-correct codes");

        // Codes must remain unchanged
        let codes: Vec<String> = {
            let mut stmt = conn.prepare(
                "SELECT code FROM OccupationSubQuestions WHERE branch_code = '05' ORDER BY sequence"
            ).unwrap();
            stmt.query_map([], |row| row.get(0))
                .unwrap()
                .filter_map(|r| r.ok())
                .collect()
        };
        assert_eq!(codes, vec!["22050201", "22050202"]);
    }
}
