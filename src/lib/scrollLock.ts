const OPEN_SCROLL_LOCK_OVERLAY_SELECTORS = [
  "[data-slot='select-content'][data-state='open']",
  "[data-slot='combobox-content'][data-open]",
  "[role='dialog']",
  "[role='alertdialog']",
] as const;

const BODY_STYLE_PROPERTIES = [
  "position",
  "height",
  "width",
  "box-sizing",
  "overflow",
  "overflow-x",
  "overflow-y",
  "scroll-behavior",
] as const;

const HTML_STYLE_PROPERTIES = [
  "overflow",
  "overflow-x",
  "overflow-y",
  "scrollbar-gutter",
  "scroll-behavior",
] as const;

function isVisibleElement(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return true;
  }

  if (element.hidden || element.getAttribute("aria-hidden") === "true") {
    return false;
  }

  const computedStyle = window.getComputedStyle(element);
  return (
    computedStyle.display !== "none" &&
    computedStyle.visibility !== "hidden" &&
    computedStyle.opacity !== "0"
  );
}

export function hasOpenScrollLockOverlay(doc: Document = document): boolean {
  return OPEN_SCROLL_LOCK_OVERLAY_SELECTORS.some((selector) =>
    Array.from(doc.querySelectorAll(selector)).some((element) =>
      isVisibleElement(element),
    ),
  );
}

export function clearOrphanedScrollLocks(
  doc: Document = document,
): boolean {
  const html = doc.documentElement;
  const body = doc.body;

  if (!html || !body || hasOpenScrollLockOverlay(doc)) {
    return false;
  }

  let didClear = false;

  if (body.hasAttribute("data-scroll-locked")) {
    body.removeAttribute("data-scroll-locked");
    didClear = true;
  }

  if (html.hasAttribute("data-base-ui-scroll-locked")) {
    html.removeAttribute("data-base-ui-scroll-locked");
    didClear = true;
  }

  for (const property of BODY_STYLE_PROPERTIES) {
    if (body.style.getPropertyValue(property)) {
      body.style.removeProperty(property);
      didClear = true;
    }
  }

  for (const property of HTML_STYLE_PROPERTIES) {
    if (html.style.getPropertyValue(property)) {
      html.style.removeProperty(property);
      didClear = true;
    }
  }

  return didClear;
}
