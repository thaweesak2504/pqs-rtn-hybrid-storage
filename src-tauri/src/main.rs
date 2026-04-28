// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Removed unused imports
use tauri::Manager;

// Database module
mod auth;
mod commands; // Phase 5: extracted command modules
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

#[cfg(test)]
mod test_helpers; // Test helper utilities

// Re-export database structs
pub use auth::{HighRankingOfficer, User};

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::users::greet,
            commands::users::get_all_users,
            commands::users::get_user_by_id,
            commands::users::get_user_by_email,
            commands::users::create_user,
            commands::users::update_user,
            commands::users::delete_user,
            commands::users::authenticate_user,
            commands::users::migrate_passwords,
            commands::zoom::zoom_in,
            commands::zoom::zoom_out,
            commands::zoom::zoom_reset,
            commands::users::get_all_high_ranking_officers,
            commands::users::update_high_ranking_officer,
            commands::users::change_password,
            // Database backup/restore commands
            commands::backup::create_database_backup,
            commands::backup::restore_database_backup,
            commands::backup::list_database_backups,
            commands::backup::delete_database_backup,
            // Database export/import commands
            commands::export::export_database,
            commands::export::import_database,
            commands::export::list_database_exports,
            commands::export::delete_database_export,
            // Universal SQLite backup commands
            commands::backup::create_universal_sqlite_backup,
            // Hybrid backup commands (Database + Media)
            commands::backup::create_hybrid_backup,
            commands::backup::import_hybrid_backup,
            commands::backup::discover_hybrid_backups,
            commands::backup::delete_hybrid_backup,
            commands::backup::check_backup_for_initialization,
            commands::backup::check_system_state_for_initialization,
            // File export commands
            commands::backup::export_backup_to_location,
            commands::backup::export_hybrid_backup_to_location,
            commands::backup::export_sql_to_location,
            commands::backup::copy_sql_export_to_location,
            // Backup management commands
            commands::backup::copy_backup_to_location,
            commands::backup::get_backup_directory_path,
            commands::backup::list_backup_files_with_paths,
            commands::backup::get_backup_file_info,
            // Hybrid Avatar commands
            commands::avatars::save_hybrid_avatar,
            commands::avatars::save_hybrid_avatar_stream, // Phase 1.3: Memory-efficient streaming
            commands::avatars::get_hybrid_avatar_info,
            commands::avatars::delete_hybrid_avatar,
            commands::avatars::get_hybrid_avatar_base64,
            commands::avatars::migrate_user_avatar_to_file,
            commands::avatars::cleanup_orphaned_avatar_files,
            commands::avatars::get_media_directory_path,
            // Hybrid High Rank Avatar commands
            commands::avatars::save_hybrid_high_rank_avatar,
            commands::avatars::get_hybrid_high_rank_avatar_info,
            commands::avatars::delete_hybrid_high_rank_avatar,
            commands::avatars::get_hybrid_high_rank_avatar_base64,
            commands::avatars::cleanup_orphaned_high_rank_avatar_files,
            // Test cleanup commands
            commands::users::delete_test_users,
            commands::users::get_users_count,
            // Database initialization command
            commands::documents::initialize_database_if_needed,
            commands::documents::initialize_content_database,
            commands::documents::seed_content_database,
            commands::documents::create_new_document,
            commands::documents::generate_document_id_preview,
            commands::documents::get_owner_units,
            commands::documents::search_documents,
            commands::documents::delete_document,
            commands::documents::update_document,
            commands::documents::get_document_questions,
            commands::documents::get_document_questions_with_details,
            commands::questions::create_question,
            commands::questions::update_question,
            commands::questions::delete_question,
            commands::questions::upload_question_image,
            commands::questions::delete_question_image,
            commands::questions::resolve_image_path,
            commands::questions::get_question_image_base64,
            commands::questions::reorder_questions,
            commands::documents::get_document_with_hierarchy,
            // Section management
            commands::sections::create_section,
            commands::sections::get_sections_by_document,
            commands::sections::delete_section,
            commands::sections::update_section_order,
            commands::sections::update_section,
            commands::sections::migrate_section_101,
            // Reference management
            commands::references::create_reference,
            commands::references::get_references,
            commands::references::update_reference,
            commands::references::delete_reference,
            commands::references::delete_all_references,
            commands::references::add_section_reference,
            commands::references::remove_section_reference,
            commands::references::get_section_references,
            commands::references::add_question_reference,
            commands::references::remove_question_reference,
            commands::references::update_question_reference_location,
            // QuestionSectionLinks (3xx.1.4/1.5 → 100/200 Sections)
            commands::section_links::add_question_section_link,
            commands::section_links::batch_add_question_section_links,
            commands::section_links::remove_question_section_link,
            commands::section_links::remove_all_question_section_links,
            commands::section_links::get_question_section_links,
            commands::section_links::update_section_link_score,
            commands::section_links::recalculate_section_link_scores,
            commands::section_links::migrate_question_children_to_section_links,
            commands::questions::get_document_stats,
            commands::system::open_path,
            commands::system::show_in_folder,
            // Occupation Branch management
            commands::branches::get_occupation_branches,
            commands::branches::create_occupation_branch,
            commands::branches::update_occupation_branch,
            commands::branches::delete_occupation_branch,
            commands::branches::get_occupation_sub_branches,
            commands::branches::create_occupation_sub_branch,
            commands::branches::update_occupation_sub_branch,
            commands::branches::delete_occupation_sub_branch,
            commands::branches::get_occupation_sub_questions,
            commands::branches::get_all_sub_questions_for_branch,
            commands::branches::create_occupation_sub_question,
            commands::branches::update_occupation_sub_question,
            commands::branches::delete_occupation_sub_question,
            commands::branches::delete_occupation_sub_questions_by_sub_branch,
            commands::branches::reorder_occupation_sub_questions,
            commands::branches::batch_create_occupation_sub_questions,
            commands::branches::get_standard_branch_sub_questions,
            commands::branches::toggle_slot_completion,
            commands::branches::get_slot_completion_map,
            commands::branches::get_all_completed_branch_pairs,
            // Section-Ref L3 Children (3xx.1.4/1.5 → real L3 Questions)
            commands::section_links::get_section_ref_children,
            commands::section_links::get_back_referencing_section_ids,
            commands::section_links::add_section_ref_child,
            commands::section_links::batch_add_section_ref_children,
            commands::section_links::remove_section_ref_child,
            commands::section_links::remove_all_section_ref_children,
            commands::section_links::update_section_ref_score,
            commands::section_links::migrate_section_links_to_ref_children,
            // Required Count Children (3xx.2-3xx.6 L3 "ครั้งที่ X")
            commands::section_links::get_required_count_children,
            commands::section_links::sync_required_count_children,
            commands::questions::check_has_children,
            // Scoring & User Progress
            commands::scoring::calculate_section_total_score,
            commands::scoring::batch_recalculate_section_group_scores,
            commands::scoring::upsert_user_progress,
            commands::scoring::get_user_progress,
            commands::scoring::calculate_group_score,
            commands::scoring::update_question_score,
            // Document Branch (Occupation Branch at document level)
            commands::branches::get_document_branch,
            commands::branches::update_document_branch,
            commands::branches::check_career_branch_usage,
            commands::branches::reset_and_update_career_branch,
            commands::branches::check_branch_usage_global,
            commands::branches::check_sub_branch_usage_global,
            commands::scoring::save_trainee_answer,
            commands::scoring::save_qualifier_assessment,
            commands::scoring::get_trainee_answers,
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
