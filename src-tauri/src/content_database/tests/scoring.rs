#[cfg(test)]
mod tests {
    
    
    
    use crate::content_database::*;
    use crate::test_helpers::helpers::*;
    use rusqlite::params;

    // ========================================================================
    // Cascade Chain Tests
    // ========================================================================

    #[test]
    fn test_recalculate_group_score_chain_propagates_up() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        // Create test document and section
        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES (?1, 'Test Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            ["test-doc"],
        ).expect("Insert document failed");

        conn.execute(
            "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (?, 100, 100, 'Test Section', 'Test', 1)",
            ["test-doc"],
        ).expect("Insert section failed");

        let section_id: i64 = conn
            .query_row(
                "SELECT id FROM Sections WHERE document_id = ? ORDER BY id DESC LIMIT 1",
                ["test-doc"],
                |row| row.get(0),
            )
            .expect("Get section_id failed");

        // Create 3-level hierarchy: L1 -> L2 -> L3
        // L1: group header
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, NULL, 1, 'L1 Parent', 1, 0, 'standard', 0, 0)",
            params!["q1", "test-doc", section_id],
        ).expect("Insert L1 failed");

        // L2: sub-group with its own children
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 1, 'L2 Sub-group', 1, 0, 'standard', 0, 0)",
            params!["q1-1", "test-doc", section_id, "q1"],
        ).expect("Insert L2 failed");

        // L3: leaf nodes with actual scores (scored = 1)
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 1, 'L3 Item A', 0, 1, 'standard', 0, 20)",
            params!["q1-1-a", "test-doc", section_id, "q1-1"],
        ).expect("Insert L3a failed");

        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 2, 'L3 Item B', 0, 1, 'standard', 0, 30)",
            params!["q1-1-b", "test-doc", section_id, "q1-1"],
        ).expect("Insert L3b failed");

        // Call cascade: L2 should sum L3 items (20+30=50), then L1 should reflect L2 (50)
        recalculate_group_score_chain(&conn, "q1-1").expect("Cascade chain failed");

        // Verify L2 recalculated to 50
        let l2_score: i32 = conn
            .query_row(
                "SELECT group_score FROM Questions WHERE id = ?1",
                ["q1-1"],
                |row| row.get(0),
            )
            .expect("Query L2 failed");

        assert_eq!(
            l2_score, 50,
            "L2 group_score should be 50 (sum of L3 children: 20+30)"
        );

        // Verify L1 recalculated to 50 (from L2's new group_score)
        let l1_score: i32 = conn
            .query_row(
                "SELECT group_score FROM Questions WHERE id = ?1",
                ["q1"],
                |row| row.get(0),
            )
            .expect("Query L1 failed");

        assert_eq!(
            l1_score, 50,
            "L1 group_score should be 50 (propagated from L2)"
        );
    }

    #[test]
    fn test_cascade_exempted_status_blocks_contribution() {
        let conn = create_test_db();
        init_content_schema(&conn).expect("Failed to init schema");

        // Create test document and section
        conn.execute(
            "INSERT INTO Documents (id, name, unit_owner_id, unit_code, applied_to, doc_type, user_level, created_at, updated_at)
             VALUES (?1, 'Test Doc', '2272420', '22724', 'Test', '20', '1', datetime('now'), datetime('now'))",
            ["test-doc"],
        ).expect("Insert document failed");

        conn.execute(
            "INSERT INTO Sections (document_id, section_group, section_number, title_th, menu_label, is_system_defined)
             VALUES (?, 100, 100, 'Test Section', 'Test', 1)",
            ["test-doc"],
        ).expect("Insert section failed");

        let section_id: i64 = conn
            .query_row(
                "SELECT id FROM Sections WHERE document_id = ? ORDER BY id DESC LIMIT 1",
                ["test-doc"],
                |row| row.get(0),
            )
            .expect("Get section_id failed");

        // L1 with two children: one normal scored, one exempted
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, NULL, 1, 'L1 Parent', 1, 0, 'standard', 0, 0)",
            params!["q1", "test-doc", section_id],
        ).expect("Insert L1 failed");

        // Normal scored child: score = 40
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 1, 'L2 Normal', 0, 1, 'standard', 0, 40)",
            params!["q1-a", "test-doc", section_id, "q1"],
        ).expect("Insert L2 normal failed");

        // Exempted child: score = 100 (should not contribute)
        conn.execute(
            "INSERT INTO Questions (id, document_id, section_id, parent_id, sequence, content, is_group_header, is_scored, question_type, group_score, score)
             VALUES (?1, ?2, ?3, ?4, 2, 'L2 Exempted', 0, 0, 'exempted', 0, 100)",
            params!["q1-b", "test-doc", section_id, "q1"],
        ).expect("Insert L2 exempted failed");

        // Call cascade
        recalculate_group_score_chain(&conn, "q1").expect("Cascade chain failed");

        // Verify L1 only counted normal child (40), not exempted (100)
        let l1_score: i32 = conn
            .query_row(
                "SELECT group_score FROM Questions WHERE id = ?1",
                ["q1"],
                |row| row.get(0),
            )
            .expect("Query L1 failed");

        assert_eq!(
            l1_score, 40,
            "L1 should only count non-exempted child (40), not exempted child"
        );
    }

}
