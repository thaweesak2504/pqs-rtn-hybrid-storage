export const DEFAULT_L1_DESC_BY_SEQ: { [key: number]: string } = {
  2: 'จงอธิบายหรือปฏิบัติงานปกติ ตามรายการที่กำหนด',
  3: 'จงอธิบายหรือปฏิบัติงานกรณีพิเศษ ตามรายการที่กำหนด',
  4: 'จงอธิบายหรือปฏิบัติงานกรณีเหตุขัดข้อง ตามรายการที่กำหนด',
  5: 'จงอธิบายหรือปฏิบัติงานกรณีเหตุฉุกเฉิน ตามรายการที่กำหนด',
  6: 'ควบคุมการปฏิบัติหน้าที่ในตำแหน่งอย่างใกล้ชิด ประเมินผ่านการปฏิบัติหรือไม่',
};

export type DigitNumberingMode = 'arabic' | 'thai';

export const toThaiNumber = (num?: number | string | null): string => {
  if (num === null || num === undefined) return '';
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return num.toString().replace(/\d/g, (match) => thaiDigits[match as any]);
};

export const formatNumberByMode = (
  num?: number | string | null,
  mode: DigitNumberingMode = 'thai',
): string => {
  if (num === null || num === undefined) return '';
  return mode === 'thai' ? toThaiNumber(num) : num.toString();
};

export const toThaiAlphabet = (n: number) => {
  const alpha = [
    'ก', 'ข', 'ค', 'ง', 'จ', 'ฉ', 'ช', 'ซ', 'ฌ', 'ญ', 'ฎ', 'ฏ', 'ฐ', 'ฑ', 'ฒ', 'ณ',
    'ด', 'ต', 'ถ', 'ท', 'ธ', 'น', 'บ', 'ป', 'ผ', 'ฝ', 'พ', 'ฟ', 'ภ', 'ม', 'ย', 'ร',
    'ล', 'ว', 'ศ', 'ษ', 'ส', 'ห', 'ฬ', 'อ', 'ฮ',
  ];
  return n > 0 && n <= alpha.length ? alpha[n - 1] : n.toString();
};

export const convertThaiToArabic = (thaiStr: string) => {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return thaiStr.replace(/[๐-๙]/g, (match) => thaiDigits.indexOf(match).toString());
};

export const buildPrefix = (
  level: number,
  sequence?: number | null,
  sectionNumber?: number,
  digitMode: DigitNumberingMode = 'arabic',
): string => {
  if (!sequence) return '';
  const sNum = sectionNumber ? sectionNumber.toString().padStart(3, '0') : '100';
  const formattedSection = formatNumberByMode(sNum, digitMode);
  if (level === 0) return formattedSection + '.' + formatNumberByMode(sequence, digitMode);
  if (level === 1) return toThaiAlphabet(sequence) + '.';
  if (level === 2) return '(' + formatNumberByMode(sequence, digitMode) + ')';
  if (level === 3) return '(' + toThaiAlphabet(sequence) + ')';
  return formatNumberByMode(sequence, digitMode) + '.';
};

export const buildPrefix200_300 = (
  level: number,
  sequence: number | null | undefined,
  sectionNumber: number | undefined,
  parentSequence?: number | null,
  digitMode: DigitNumberingMode = 'arabic',
): string => {
  if (!sequence) return '';
  const sNum = sectionNumber ? sectionNumber.toString().padStart(3, '0') : '200';
  const formattedSection = formatNumberByMode(sNum, digitMode);
  if (level === 0) return formattedSection + '.' + formatNumberByMode(sequence, digitMode);
  if (level === 1) return formattedSection + '.' + formatNumberByMode(parentSequence || 0, digitMode) + '.' + formatNumberByMode(sequence, digitMode);
  if (level === 2) return toThaiAlphabet(sequence) + '.';
  if (level === 3) return '(' + formatNumberByMode(sequence, digitMode) + ')';
  return formatNumberByMode(sequence, digitMode) + '.';
};
