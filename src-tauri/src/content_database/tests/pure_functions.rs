use super::*;

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

// ========================================================================

