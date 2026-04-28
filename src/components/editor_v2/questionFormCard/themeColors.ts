export const getThemeColors = (sectionGroup: number) => {
  const is300 = sectionGroup === 300;
  const is200 = sectionGroup === 200;

  if (is300) {
    return {
      border: "border-purple-200 dark:border-purple-800/50",
      bg: "bg-purple-50/50 dark:bg-purple-950/20",
      bgMuted: "bg-purple-50/30 dark:bg-purple-950/10",
      bgPrimary: "bg-purple-500",
      text: "text-purple-600 dark:text-purple-400",
      textPrimary: "text-purple-600 dark:text-purple-400",
      textWhite: "text-white",
      textBold: "text-purple-700 dark:text-purple-300",
      textDim: "text-purple-600/70 dark:text-purple-400/50",
      count: "text-purple-500",
      toggle: "peer-checked:bg-purple-500",
      btn: "bg-purple-500 text-white hover:bg-purple-600",
      editBtn: "border-purple-200 dark:border-purple-700 text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/30",
      addBtn: "border-purple-300 dark:border-purple-700 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200",
      inputBd: "border-purple-300 dark:border-purple-700 focus:ring-1 focus:ring-purple-400",
      selectBd: "border-purple-200 dark:border-purple-800 focus:ring-1 focus:ring-purple-400",
      code: "text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800",
      itemBd: "border-purple-100 dark:border-purple-900/30",
      itemText: "text-purple-600 dark:text-purple-400",
      activeBg: "bg-purple-50 dark:bg-purple-900/20",
      check: "accent-purple-600 border-purple-400 text-purple-600 focus:ring-purple-500",
      activeAll: "border-purple-500 bg-purple-500 text-white",
      bindWrap: "border-purple-200 dark:border-purple-800/50 bg-purple-50/30 dark:bg-purple-950/20",
    };
  }

  if (is200) {
    return {
      border: "border-orange-200 dark:border-orange-800/50",
      bg: "bg-orange-50/50 dark:bg-orange-950/20",
      bgMuted: "bg-orange-50/30 dark:bg-orange-950/10",
      bgPrimary: "bg-orange-500",
      text: "text-orange-600 dark:text-orange-400",
      textPrimary: "text-orange-600 dark:text-orange-400",
      textWhite: "text-white",
      textBold: "text-orange-700 dark:text-orange-300",
      textDim: "text-orange-600/70 dark:text-orange-400/50",
      count: "text-orange-500",
      toggle: "peer-checked:bg-orange-500",
      btn: "bg-orange-500 text-white hover:bg-orange-600",
      editBtn: "border-orange-200 dark:border-orange-700 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30",
      addBtn: "border-orange-300 dark:border-orange-700 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-200",
      inputBd: "border-orange-300 dark:border-orange-700 focus:ring-1 focus:ring-orange-400",
      selectBd: "border-orange-200 dark:border-orange-800 focus:ring-1 focus:ring-orange-400",
      code: "text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800",
      itemBd: "border-orange-100 dark:border-orange-900/30",
      itemText: "text-orange-600 dark:text-orange-400",
      activeBg: "bg-amber-50 dark:bg-amber-900/20",
      check: "accent-amber-600 border-amber-400 text-amber-600 focus:ring-amber-500",
      activeAll: "border-amber-500 bg-amber-500 text-white",
      bindWrap: "border-amber-200 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20",
    };
  }

  // Default (100)
  return {
    border: "border-emerald-200 dark:border-emerald-800/50",
    bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
    bgMuted: "bg-emerald-50/30 dark:bg-emerald-950/10",
    bgPrimary: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    textPrimary: "text-emerald-600 dark:text-emerald-400",
    textWhite: "text-white",
    textBold: "text-emerald-700 dark:text-emerald-300",
    textDim: "text-emerald-600/70 dark:text-emerald-400/50",
    count: "text-emerald-500",
    toggle: "peer-checked:bg-emerald-500",
    btn: "bg-emerald-500 text-white hover:bg-emerald-600",
    editBtn: "border-emerald-200 dark:border-emerald-700 text-emerald-500 hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
    addBtn: "border-emerald-300 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200",
    inputBd: "border-emerald-300 dark:border-emerald-700 focus:ring-1 focus:ring-emerald-400",
    selectBd: "border-emerald-200 dark:border-emerald-800 focus:ring-1 focus:ring-emerald-400",
    code: "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800",
    itemBd: "border-emerald-100 dark:border-emerald-900/30",
    itemText: "text-emerald-600 dark:text-emerald-400",
    activeBg: "bg-emerald-50 dark:bg-emerald-900/20",
    check: "accent-emerald-600 border-emerald-400 text-emerald-600 focus:ring-emerald-500",
    activeAll: "border-emerald-500 bg-emerald-500 text-white",
    bindWrap: "border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/20",
  };
};
