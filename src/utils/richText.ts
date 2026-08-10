/**
 * Checks whether persisted Markdown/HTML contains user-visible content.
 * Tiptap normally emits Markdown, but legacy or fallback values can contain
 * structurally non-empty HTML such as `<p></p>` or `<p><br></p>`.
 */
export const hasMeaningfulRichText = (value: string | null | undefined): boolean => {
  if (!value) return false;

  const visibleText = value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .trim();

  return visibleText.length > 0;
};
