const STRUCTURAL_TAGS = new Set([
  "p",
  "br",
  "div",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
]);

const DROP_WITH_CONTENT_TAGS = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "option",
  "link",
  "meta",
  "base",
  "img",
  "video",
  "audio",
  "source",
  "canvas",
]);

const INTEGER_ATTRIBUTE = /^-?\d+$/;
const POSITIVE_INTEGER_ATTRIBUTE = /^\d+$/;
const TABLE_HEADER_SCOPES = new Set(["row", "col", "rowgroup", "colgroup"]);

const preserveSafeStructuralAttributes = (element: Element, tagName: string) => {
  const attributes = Array.from(element.attributes);
  const start = element.getAttribute("start");
  const value = element.getAttribute("value");
  const colSpan = element.getAttribute("colspan");
  const rowSpan = element.getAttribute("rowspan");
  const scope = element.getAttribute("scope")?.toLowerCase();
  const listStyle = element.getAttribute("data-list-style");
  const reversed = element.hasAttribute("reversed");

  attributes.forEach((attribute) => element.removeAttribute(attribute.name));

  if (tagName === "ol") {
    if (start && INTEGER_ATTRIBUTE.test(start)) element.setAttribute("start", start);
    if (reversed) element.setAttribute("reversed", "");
    if (listStyle === "numbered-hierarchy") {
      element.setAttribute("data-list-style", "numbered-hierarchy");
    }
  }

  if (tagName === "li" && value && INTEGER_ATTRIBUTE.test(value)) {
    element.setAttribute("value", value);
  }

  if ((tagName === "td" || tagName === "th") && colSpan && POSITIVE_INTEGER_ATTRIBUTE.test(colSpan)) {
    element.setAttribute("colspan", colSpan);
  }

  if ((tagName === "td" || tagName === "th") && rowSpan && POSITIVE_INTEGER_ATTRIBUTE.test(rowSpan)) {
    element.setAttribute("rowspan", rowSpan);
  }

  if (tagName === "th" && scope && TABLE_HEADER_SCOPES.has(scope)) {
    element.setAttribute("scope", scope);
  }
};

const sanitizeChildren = (parent: ParentNode) => {
  Array.from(parent.childNodes).forEach((node) => {
    if (node.nodeType === Node.COMMENT_NODE) {
      node.parentNode?.removeChild(node);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();

    if (DROP_WITH_CONTENT_TAGS.has(tagName)) {
      element.remove();
      return;
    }

    sanitizeChildren(element);

    if (STRUCTURAL_TAGS.has(tagName)) {
      preserveSafeStructuralAttributes(element, tagName);
      return;
    }

    element.replaceWith(...Array.from(element.childNodes));
  });
};

/**
 * Keeps useful document structure from a rich clipboard payload while making
 * all pasted text inherit the destination editor's presentation. Formatting
 * can still be intentionally re-applied with the editor toolbar after paste.
 */
export const normalizePastedHtmlForEditor = (html: string): string => {
  if (typeof DOMParser === "undefined" || typeof Node === "undefined") return html;

  const document = new DOMParser().parseFromString(html, "text/html");
  sanitizeChildren(document.body);
  return document.body.innerHTML;
};
