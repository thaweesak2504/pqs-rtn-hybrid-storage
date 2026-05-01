#[cfg(test)]
mod tests {
    use crate::content_database::answers::{
        replace_question_answer_keys_with_conn, update_answer_key_with_conn,
    };
    use crate::content_database::documents::generate_document_id_with_conn;
    use crate::content_database::media::{
        bundle_reference_file_in_dir, delete_question_image_in_dir, resolve_image_path_in_dir,
    };
    use crate::content_database::*;
    use crate::test_helpers::helpers::*;
    use rusqlite::params;

    // ========================================================================
    // Pure Function Tests
    // ========================================================================

    #[test]
    fn test_to_thai_digit_single_digit() {
        assert_eq!(to_thai_digit(0), "๐");
        assert_eq!(to_thai_digit(1), "๑");
        assert_eq!(to_thai_digit(2), "๒");
        assert_eq!(to_thai_digit(3), "๓");
        assert_eq!(to_thai_digit(4), "๔");
        assert_eq!(to_thai_digit(5), "๕");
        assert_eq!(to_thai_digit(6), "๖");
        assert_eq!(to_thai_digit(7), "๗");
        assert_eq!(to_thai_digit(8), "๘");
        assert_eq!(to_thai_digit(9), "๙");
    }

}
