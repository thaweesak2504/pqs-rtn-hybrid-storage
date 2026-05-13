import { SECTION_SLOTS } from './constants';

/** Build the 2-char slot prefix from active tab, e.g. '22' for tab '2xx.2'. */
export function slotPrefix(tabId: string): string {
  const slot = SECTION_SLOTS.find(s => s.id === tabId);
  return slot ? `${slot.sCode}${slot.lCode}` : '';
}

/** Pad a branch code to 2 digits: 'STD' → '00', '1' → '01', '12' → '12'. */
export function padBC(code: string): string {
  return code === 'STD' ? '00' : code.padStart(2, '0');
}

/** Build the 6-char code prefix for a specific branch+sub+slot, e.g. '220101'. */
export function fullPrefix(tabId: string, mainCode: string, subCode: string): string {
  return `${slotPrefix(tabId)}${padBC(mainCode)}${padBC(subCode)}`;
}
