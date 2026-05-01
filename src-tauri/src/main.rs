// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Removed unused imports
use tauri::Manager;

// Database module
mod auth;
mod content_database; // Separate content database
mod database_export;
mod file_manager;
mod hybrid_avatar;
mod hybrid_backup; // New hybrid backup system
mod hybrid_high_rank_avatar;
mod logger; // Logger system for conditional debug output
mod migration_helper;
mod migrations; // Phase 2: versioned schema migration framework
mod universal_sqlite_backup; // Database migration utilities
mod commands; // Extracted command modules (Phase 5B)

#[cfg(test)]
mod test_helpers; // Test helper utilities

// Re-export database structs
pub use auth::{HighRankingOfficer, User};

// All command functions extracted to commands/ modules (Phase 5B):
// - commands/users.rs: user CRUD, auth, password management
// - commands/zoom.rs: zoom in/out/reset
// - commands/officers.rs: high ranking officers CRUD
// - commands/backup.rs: backup/restore/export
// - commands/avatars.rs: user + high rank avatar management
// - commands/system.rs: test cleanup, DB init, open_path, show_in_folder
// - commands/content.rs: documents, questions, sections, references, scoring, branches

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // ===== User/Auth =====
            commands::users::greet,
            commands::users::get_all_users,
            commands::users::get_user_by_id,
            commands::users::get_user_by_email,
            commands::users::create_user,
            commands::users::update_user,
            commands::users::delete_user,
            commands::users::authenticate_user,
            commands::users::migrate_passwords,
            commands::users::change_password,
            // ===== Zoom =====
            commands::zoom::zoom_in,
            commands::zoom::zoom_out,
            commands::zoom::zoom_reset,
            // ===== Officers =====
            commands::officers::get_all_high_ranking_officers,
            commands::officers::update_high_ranking_officer,
            // ===== Backup/Restore/Export =====
            commands::backup::create_database_backup,
            commands::backup::restore_database_backup,
            commands::backup::list_database_backups,
            commands::backup::delete_database_backup,
            commands::backup::export_database,
            commands::backup::import_database,
            commands::backup::list_database_exports,
            commands::backup::delete_database_export,
            commands::backup::create_universal_sqlite_backup,
            commands::backup::create_hybrid_backup,
            commands::backup::import_hybrid_backup,
            commands::backup::discover_hybrid_backups,
            commands::backup::delete_hybrid_backup,
            commands::backup::check_backup_for_initialization,
            commands::backup::check_system_state_for_initialization,
            commands::backup::export_backup_to_location,
            commands::backup::export_hybrid_backup_to_location,
            commands::backup::export_sql_to_location,
            commands::backup::copy_sql_export_to_location,
            commands::backup::copy_backup_to_location,
            commands::backup::get_backup_directory_path,
            commands::backup::list_backup_files_with_paths,
            commands::backup::get_backup_file_info,
            // ===== Avatars =====
            commands::avatars::save_hybrid_avatar,
            commands::avatars::save_hybrid_avatar_stream,
            commands::avatars::get_hybrid_avatar_info,
            commands::avatars::delete_hybrid_avatar,
            commands::avatars::get_hybrid_avatar_base64,
            commands::avatars::migrate_user_avatar_to_file,
            commands::avatars::cleanup_orphaned_avatar_files,
            commands::avatars::get_media_directory_path,
            commands::avatars::save_hybrid_high_rank_avatar,
            commands::avatars::get_hybrid_high_rank_avatar_info,
            commands::avatars::delete_hybrid_high_rank_avatar,
            commands::avatars::get_hybrid_high_rank_avatar_base64,
            commands::avatars::cleanup_orphaned_high_rank_avatar_files,
            // ===== System =====
            commands::system::delete_test_users,
            commands::system::get_users_count,
            commands::system::initialize_database_if_needed,
            commands::system::initialize_content_database,
            commands::system::seed_content_database,
            commands::system::open_path,
            commands::system::show_in_folder,
            // ===== Content: Documents =====
            commands::content::create_new_document,
            commands::content::generate_document_id_preview,
            commands::content::get_owner_units,
            commands::content::search_documents,
            commands::content::delete_document,
            commands::content::update_document,
            commands::content::get_document_questions,
            commands::content::get_document_questions_with_details,
            commands::content::get_document_with_hierarchy,
            commands::content::get_document_stats,
            // ===== Content: Questions =====
            commands::content::create_question,
            commands::content::update_question,
            commands::content::delete_question,
            commands::content::reorder_questions,
            // ===== Content: Media =====
            commands::content::upload_question_image,
            commands::content::delete_question_image,
            commands::content::resolve_image_path,
            commands::content::get_question_image_base64,
            // ===== Content: Sections =====
            commands::content::create_section,
            commands::content::get_sections_by_document,
            commands::content::delete_section,
            commands::content::update_section_order,
            commands::content::update_section,
            commands::content::migrate_section_101,
            // ===== Content: References =====
            commands::content::create_reference,
            commands::content::get_references,
            commands::content::update_reference,
            commands::content::delete_reference,
            commands::content::delete_all_references,
            commands::content::add_section_reference,
            commands::content::remove_section_reference,
            commands::content::get_section_references,
            commands::content::add_question_reference,
            commands::content::remove_question_reference,
            commands::content::update_question_reference_location,
            // ===== Content: QuestionSectionLinks =====
            commands::content::add_question_section_link,
            commands::content::batch_add_question_section_links,
            commands::content::remove_question_section_link,
            commands::content::remove_all_question_section_links,
            commands::content::get_question_section_links,
            commands::content::update_section_link_score,
            commands::content::recalculate_section_link_scores,
            commands::content::migrate_question_children_to_section_links,
            // ===== Content: Section-Ref L3 Children =====
            commands::content::get_section_ref_children,
            commands::content::get_back_referencing_section_ids,
            commands::content::add_section_ref_child,
            commands::content::batch_add_section_ref_children,
            commands::content::remove_section_ref_child,
            commands::content::remove_all_section_ref_children,
            commands::content::update_section_ref_score,
            commands::content::migrate_section_links_to_ref_children,
            // ===== Content: Required Count Children =====
            commands::content::get_required_count_children,
            commands::content::sync_required_count_children,
            commands::content::check_has_children,
            // ===== Content: Scoring & User Progress =====
            commands::content::calculate_section_total_score,
            commands::content::batch_recalculate_section_group_scores,
            commands::content::upsert_user_progress,
            commands::content::get_user_progress,
            commands::content::calculate_group_score,
            commands::content::update_question_score,
            // ===== Content: Document Branch =====
            commands::content::get_document_branch,
            commands::content::update_document_branch,
            commands::content::check_career_branch_usage,
            commands::content::reset_and_update_career_branch,
            commands::content::check_branch_usage_global,
            commands::content::check_sub_branch_usage_global,
            // ===== Content: Occupation Branches =====
            commands::content::get_occupation_branches,
            commands::content::create_occupation_branch,
            commands::content::update_occupation_branch,
            commands::content::delete_occupation_branch,
            commands::content::get_occupation_sub_branches,
            commands::content::create_occupation_sub_branch,
            commands::content::update_occupation_sub_branch,
            commands::content::delete_occupation_sub_branch,
            commands::content::get_occupation_sub_questions,
            commands::content::get_all_sub_questions_for_branch,
            commands::content::create_occupation_sub_question,
            commands::content::update_occupation_sub_question,
            commands::content::delete_occupation_sub_question,
            commands::content::delete_occupation_sub_questions_by_sub_branch,
            commands::content::reorder_occupation_sub_questions,
            commands::content::batch_create_occupation_sub_questions,
            commands::content::get_standard_branch_sub_questions,
            commands::content::toggle_slot_completion,
            commands::content::get_slot_completion_map,
            commands::content::get_all_completed_branch_pairs,
            // ===== Content: Trainee Answers =====
            commands::content::save_trainee_answer,
            commands::content::save_qualifier_assessment,
            commands::content::get_trainee_answers,
            // ===== Content: Direct module exports =====
            content_database::clear_all_trainee_answers,
            content_database::get_sub_question_usage_counts,
            content_database::get_section_progress,
            content_database::get_section_dev_metrics,
            content_database::get_question_answer_keys,
            content_database::update_answer_key,
            content_database::replace_question_answer_keys,
        ])
        .setup(|app| {
            // Post-consolidation cleanup: archive any leftover legacy database.db
            // from older app versions before they tried to open it.
            match migration_helper::cleanup_legacy_database_file() {
                Ok(true) => logger::info("Legacy database.db archived successfully"),
                Ok(false) => {} // No legacy file — clean install or already handled
                Err(e) => logger::warn(format!("Legacy database.db cleanup failed: {}", e)),
            }

            // Phase 2C: initialise the r2d2 content-db pool BEFORE touching any
            // DB. `initialize_content_database()` below acquires its connection
            // from this pool, so the pool must exist first. Pool construction
            // is cheap (no physical connection opened yet) — real connections
            // are lazily built on first `pool.get()`.
            if let Err(e) = content_database::connection::init_content_pool() {
                logger::critical(format!("Failed to initialise content DB pool: {}", e));
                logger::error("Application will not function without the DB pool");
            }

            // Initialize content database (OwnerUnits, Documents, Users, Officers, etc.)
            if let Err(e) = content_database::initialize_content_database() {
                logger::error(format!("Failed to initialize content database: {}", e));
            }

            // Clean up orphaned section_ref questions (from sections deleted before cleanup was added)
            if let Err(e) = content_database::cleanup_orphaned_section_refs() {
                logger::warn(format!("Failed to cleanup orphaned section_refs: {}", e));
            }

            // Initialize FileManager to ensure directories exist (singleton)
            if let Err(e) = file_manager::FileManager::get_instance() {
                logger::warn(format!("Failed to initialize file manager: {}", e));
                logger::warn("Avatar operations may not work correctly");
            }

            // Show window after it's ready (prevents flickering)
            if let Some(window) = app.get_window("main") {
                match window.show() {
                    Ok(_) => {
                        // Force maximize to override any saved state from window-state plugin
                        if let Err(e) = window.maximize() {
                            logger::warn(format!("Failed to maximize window: {}", e));
                        }
                    }
                    Err(e) => logger::error(format!("Failed to show main window: {}", e)),
                }
            } else {
                logger::warn("Main window not found");
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
