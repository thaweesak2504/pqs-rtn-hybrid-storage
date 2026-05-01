use crate::auth::{self, HighRankingOfficer};

// High Ranking Officers Commands
#[tauri::command]
pub fn get_all_high_ranking_officers() -> Result<Vec<HighRankingOfficer>, String> {
    auth::get_all_high_ranking_officers()
}

#[tauri::command]
pub fn update_high_ranking_officer(
    id: i32,
    thai_name: String,
    position_thai: String,
    position_english: String,
    order_index: i32,
) -> Result<HighRankingOfficer, String> {
    auth::update_high_ranking_officer(
        id,
        &thai_name,
        &position_thai,
        &position_english,
        order_index,
    )
}
