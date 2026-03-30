/// Generate a pseudo-unique ID (Time based)
pub fn generate_uuid() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let start = SystemTime::now();
    let since_the_epoch = start
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards");
    format!("{:x}", since_the_epoch.as_nanos())
    // Note: In a high-concurrency server this isn't safe, but for a single-user desktop app it's fine.
    // Ideally we'd mix in some random bits.
}
#[cfg(test)]
/// Helper to convert Arabic number to Thai digits
pub fn to_thai_digit(n: i32) -> String {
    let thai_digits = ["๐", "๑", "๒", "๓", "๔", "๕", "๖", "๗", "๘", "๙"];
    n.to_string()
        .chars()
        .map(|c| {
            if let Some(d) = c.to_digit(10) {
                thai_digits[d as usize].to_string()
            } else {
                c.to_string()
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn test_generate_uuid_format() {
        let uuid1 = generate_uuid();
        let uuid2 = generate_uuid();

        // UUID should be hexadecimal string
        assert!(uuid1.chars().all(|c| c.is_ascii_hexdigit()));
        assert!(uuid2.chars().all(|c| c.is_ascii_hexdigit()));

        // UUIDs should be unique
        assert_ne!(uuid1, uuid2, "UUIDs should be unique");

        // Should have reasonable length (timestamp in nanoseconds)
        assert!(uuid1.len() > 10, "UUID should have reasonable length");
    }
    #[test]
    fn test_to_thai_digit_multiple_digits() {
        assert_eq!(to_thai_digit(10), "๑๐");
        assert_eq!(to_thai_digit(123), "๑๒๓");
        assert_eq!(to_thai_digit(456), "๔๕๖");
        assert_eq!(to_thai_digit(789), "๗๘๙");
        assert_eq!(to_thai_digit(2024), "๒๐๒๔");
    }
    #[test]
    fn test_to_thai_digit_negative() {
        // Negative numbers should preserve the minus sign
        let result = to_thai_digit(-5);
        assert!(result.starts_with('-'));
        assert!(result.contains('๕'));
    }
    #[test]
    fn test_to_thai_digit_zero() {
        assert_eq!(to_thai_digit(0), "๐");
    }
    #[test]
    fn test_to_thai_digit_large_numbers() {
        assert_eq!(to_thai_digit(99999), "๙๙๙๙๙");
        assert_eq!(to_thai_digit(100000), "๑๐๐๐๐๐");
    }
}
