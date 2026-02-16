
/// Seed sample references for Section 104 (CIWS Basic)
pub fn seed_section_104_references(section_id: i64) -> Result<(), String> {
    let conn = get_content_connection().map_err(|e| format!("Failed to connect: {}", e))?;
    
    // Reference data based on Section 104 (CIWS Phalanx Mk.15)
    let references = vec![
        ("NAVSEA_OP4154_V1P1", "NAVSEA OP4154 Vol.1 Pt.1 Operator's Manual for Gun System Close-In Weapon System Phalanx Mk.15", Some("Manual"), true),
        ("NAVSEA_OP4154_V2", "NAVSEA OP4154 Vol.2 Maintenance Manual for Gun System Close-In Weapon System Phalanx Mk.15", Some("Manual"), true),
        ("SW221_JO_MMO_010", "SW221-JO-MMO-010 Operation Procedure CIWS System", Some("Procedure"), true),
        ("TM_MK15_BLOCK1B", "Technical Manual Phalanx CIWS Mk.15 Block 1B Baseline 2", Some("Technical Manual"), false),
        ("NAVORD_OP4986", "NAVORD OP4986 Ammunition Handling and Storage Safety", Some("Safety Manual"), true),
    ];
    
    for (idx, (code, title, category, is_common)) in references.iter().enumerate() {
        // Create reference if doesn't exist
        let ref_id: i64 = conn.query_row(
            "SELECT id FROM DocumentReferences WHERE code = ?1",
            params![code],
            |row| row.get(0),
        ).unwrap_or_else(|_| {
            conn.execute(
                "INSERT INTO DocumentReferences (code, title, category, is_common)
                 VALUES (?1, ?2, ?3, ?4)",
                params![code, title, category, is_common],
            ).ok();
            conn.last_insert_rowid()
        });
        
        // Link to section with display_order (1-based)
        let display_order = (idx + 1) as i32;
        conn.execute(
            "INSERT OR IGNORE INTO SectionReferences (section_id, reference_id, display_order)
             VALUES (?1, ?2, ?3)",
            params![section_id, ref_id, display_order],
        ).map_err(|e| format!("Failed to link reference: {}", e))?;
    }
    
    Ok(())
}
