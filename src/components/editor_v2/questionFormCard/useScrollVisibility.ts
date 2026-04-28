import { RefObject, useEffect, useRef } from "react";

export const useScrollVisibility = (
  formCardRef: RefObject<HTMLDivElement>,
  dependencies: any[]
) => {
  const hasInitialAutoScrolledRef = useRef(false);

  const findScrollableParent = (el: HTMLElement | null): HTMLElement | null => {
    if (!el) return null;
    let parent = el.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      const canScroll = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
      if (canScroll && parent.scrollHeight > parent.clientHeight) return parent;
      parent = parent.parentElement;
    }
    return null;
  };

  const ensureFormFullyVisible = (smooth = false) => {
    const formEl = formCardRef.current;
    if (!formEl) return;

    const scrollParent = findScrollableParent(formEl);
    const behavior: ScrollBehavior = smooth ? "smooth" : "auto";

    // Extra bottom space to avoid fixed footer / OS taskbar overlap feeling
    const bottomSafeArea = 88;
    const topPadding = 8;
    const bottomPadding = 12;

    if (!scrollParent) {
      const rect = formEl.getBoundingClientRect();
      const visibleTop = topPadding;
      const visibleBottom = window.innerHeight - bottomSafeArea;

      if (rect.bottom > visibleBottom) {
        window.scrollBy({ top: rect.bottom - visibleBottom + bottomPadding, behavior });
        return;
      }
      if (rect.top < visibleTop) {
        window.scrollBy({ top: rect.top - visibleTop - bottomPadding, behavior });
      }
      return;
    }

    const formRect = formEl.getBoundingClientRect();
    const parentRect = scrollParent.getBoundingClientRect();
    const visibleTop = parentRect.top + topPadding;
    const visibleBottom = parentRect.bottom - bottomPadding;

    if (formRect.bottom > visibleBottom) {
      scrollParent.scrollBy({ top: formRect.bottom - visibleBottom + bottomPadding, behavior });
      return;
    }
    if (formRect.top < visibleTop) {
      scrollParent.scrollBy({ top: formRect.top - visibleTop - bottomPadding, behavior });
    }
  };

  // Bottom-awareness: keep newly opened form fully visible without manual scrolling.
  useEffect(() => {
    if (hasInitialAutoScrolledRef.current) return;
    hasInitialAutoScrolledRef.current = true;
    const rafId = window.requestAnimationFrame(() => ensureFormFullyVisible(true));
    return () => window.cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-check visibility when optional sections expand/collapse and change form height.
  useEffect(() => {
    if (!hasInitialAutoScrolledRef.current) return;
    const rafId = window.requestAnimationFrame(() => ensureFormFullyVisible(false));
    return () => window.cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};
