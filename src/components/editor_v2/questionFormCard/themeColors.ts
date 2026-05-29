export interface ThemeColors {
  border: string;
  bg: string;
  text: string;
  textBold: string;
  textDim: string;
  count: string;
  toggle: string;
  btn: string;
  editBtn: string;
  addBtn: string;
  inputBd: string;
  selectBd: string;
  code: string;
  itemBd: string;
  itemText: string;
  activeBg: string;
  check: string;
  activeAll: string;
  bindWrap: string;
}

export const sqClr300: ThemeColors = {
  border: 'border-purple-200 dark:border-purple-800/50', bg: 'bg-purple-50/50 dark:bg-purple-950/20',
  text: 'text-purple-600 dark:text-purple-400', textBold: 'text-purple-700 dark:text-purple-300',
  textDim: 'text-purple-600/70 dark:text-purple-400/50', count: 'text-purple-500',
  toggle: 'peer-checked:bg-purple-500', btn: 'bg-purple-500 text-white hover:bg-purple-600',
  editBtn: 'border-purple-200 dark:border-purple-700 text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/30',
  addBtn: 'border-purple-300 dark:border-purple-700 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200',
  inputBd: 'border-purple-300 dark:border-purple-700 focus:ring-1 focus:ring-purple-400',
  selectBd: 'border-purple-200 dark:border-purple-800 focus:ring-1 focus:ring-purple-400',
  code: 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800',
  itemBd: 'border-purple-100 dark:border-purple-900/30', itemText: 'text-purple-600 dark:text-purple-400',
  activeBg: 'bg-purple-50 dark:bg-purple-900/20', check: 'accent-purple-600 border-purple-400 text-purple-600 focus:ring-purple-500',
  activeAll: 'border-purple-500 bg-purple-500 text-white',
  bindWrap: 'border-purple-200 dark:border-purple-800/50 bg-purple-50/30 dark:bg-purple-950/20',
};

export const sqClr200: ThemeColors = {
  border: 'border-orange-200 dark:border-orange-800/50', bg: 'bg-orange-50/50 dark:bg-orange-950/20',
  text: 'text-orange-600 dark:text-orange-400', textBold: 'text-orange-700 dark:text-orange-300',
  textDim: 'text-orange-600/70 dark:text-orange-400/50', count: 'text-orange-500',
  toggle: 'peer-checked:bg-orange-500', btn: 'bg-orange-500 text-white hover:bg-orange-600',
  editBtn: 'border-orange-200 dark:border-orange-700 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30',
  addBtn: 'border-orange-300 dark:border-orange-700 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200',
  inputBd: 'border-orange-300 dark:border-orange-700 focus:ring-1 focus:ring-orange-400',
  selectBd: 'border-orange-200 dark:border-orange-800 focus:ring-1 focus:ring-orange-400',
  code: 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800',
  itemBd: 'border-orange-100 dark:border-orange-900/30', itemText: 'text-orange-600 dark:text-orange-400',
  activeBg: 'bg-amber-50 dark:bg-amber-900/20', check: 'accent-amber-600 border-amber-400 text-amber-600 focus:ring-amber-500',
  activeAll: 'border-amber-500 bg-amber-500 text-white',
  bindWrap: 'border-orange-200 dark:border-orange-800/50 bg-orange-50/30 dark:bg-orange-950/20',
};

export function getThemeColors(is300: boolean): ThemeColors {
  return is300 ? sqClr300 : sqClr200;
}
