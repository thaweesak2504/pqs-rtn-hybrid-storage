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
  return num.toString().replace(/\d/g, (match) => thaiDigits[Number(match)] ?? match);
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
  return n > 0 && n <= alpha.length ? (alpha[n - 1] ?? n.toString()) : n.toString();
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

export const buildFullPrefix = (
  level: number,
  sequence: number | null | undefined,
  sectionNumber: number | undefined,
  parentFullPrefix: string | undefined | null,
  sectionGroup: 100 | 200 | 300 = 100,
  digitMode: DigitNumberingMode = 'arabic',
): string => {
  if (!sequence) return '';
  const sNum = sectionNumber ? sectionNumber.toString().padStart(3, '0') : (sectionGroup === 100 ? '100' : '200');
  const formattedSection = formatNumberByMode(sNum, digitMode);
  
  if (sectionGroup === 200 || sectionGroup === 300) {
    if (level === 0) {
      return formattedSection + '.' + formatNumberByMode(sequence, digitMode);
    }
    const parent = parentFullPrefix || '';
    if (level === 1) {
      return parent + '.' + formatNumberByMode(sequence, digitMode);
    }
    if (level === 2) {
      return parent + '.' + toThaiAlphabet(sequence) + '.';
    }
    if (level === 3) {
      return parent + '(' + formatNumberByMode(sequence, digitMode) + ')';
    }
    return parent + '.' + formatNumberByMode(sequence, digitMode);
  } else {
    if (level === 0) {
      return formattedSection + '.' + formatNumberByMode(sequence, digitMode);
    }
    const parent = parentFullPrefix || '';
    if (level === 1) {
      return parent + '.' + toThaiAlphabet(sequence) + '.';
    }
    if (level === 2) {
      return parent + '(' + formatNumberByMode(sequence, digitMode) + ')';
    }
    if (level === 3) {
      return parent + '(' + toThaiAlphabet(sequence) + ')';
    }
    return parent + '.' + formatNumberByMode(sequence, digitMode);
  }
};

export const formatMarkdownWithThaiLists = (text: string): string => {
  if (!text) return '';
  const lines = text.split('\n');
  const processedLines = lines.map((line) => {
    // Match Thai list item: ก. , ข. , ค. , etc.
    const thaiMatch = line.match(/^(\s*)([ก-ฮ]\.)\s+(.*)$/);
    if (thaiMatch) {
      const indent = thaiMatch[1] || '';
      const label = thaiMatch[2];
      const content = thaiMatch[3];
      // Surround with blank lines to ensure ReactMarkdown treats it as a block
      return `\n${indent}<div class="thai-list-item"><span class="thai-list-label">${label}</span><div class="thai-list-content">${content}</div></div>\n`;
    }
    return line;
  });
  // Normal '\n' allows ReactMarkdown to properly separate blocks.
  return processedLines.join('\n');
};
