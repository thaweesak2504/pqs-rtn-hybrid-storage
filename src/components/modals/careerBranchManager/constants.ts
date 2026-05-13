export const SECTION_SLOTS = [
  { id: '2xx.2', label: '2xx.2 (ส่วนประกอบ)', type: '200', sCode: '2', lCode: '2' },
  { id: '2xx.4', label: '2xx.4 (ข้อจำกัด)', type: '200', sCode: '2', lCode: '4' },
  { id: '3xx.2', label: '3xx.2 (ปกติ)', type: '300', sCode: '3', lCode: '2' },
  { id: '3xx.3', label: '3xx.3 (พิเศษ)', type: '300', sCode: '3', lCode: '3' },
  { id: '3xx.4', label: '3xx.4 (ขัดข้อง)', type: '300', sCode: '3', lCode: '4' },
  { id: '3xx.5', label: '3xx.5 (ฉุกเฉิน)', type: '300', sCode: '3', lCode: '5' },
];

export const STANDARD_BRANCH_NAME = 'ต้นแบบมาตรฐาน';

// Default mandatory (always_checked) last-item text per 300-series tab
export const MANDATORY_TEXTS: Record<string, string> = {
  '3xx.2': 'เริ่มปฏิบัติ',
  '3xx.3': 'เริ่มปฏิบัติจริงหรือสมมติเหตุการณ์พิเศษ',
  '3xx.4': 'เริ่มปฏิบัติจริงหรือสมมติเหตุขัดข้องแล้วทำการแก้ไข',
  '3xx.5': 'เริ่มปฏิบัติจริงหรือสมมติเหตุฉุกเฉินแล้วทำการแก้ไข',
};
