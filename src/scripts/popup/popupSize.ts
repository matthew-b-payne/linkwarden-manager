// The browser sizes an extension popup to its document and caps it at 800x600, so "resizing the
// window" means resizing the popup's root element. Staying just inside the cap keeps the browser
// from clipping or scrolling the popup itself.
export interface PopupSize {
  width: number;
  height: number;
}

export const MIN_POPUP_SIZE: PopupSize = { width: 380, height: 320 };
// Chromium's hard ceiling for an extension popup, measured: a document larger than this is
// granted exactly 800x600 and no more. A short screen can leave less room than that, in which
// case the browser simply grants less and the document scrolls.
export const MAX_POPUP_SIZE: PopupSize = { width: 800, height: 600 };
export const DEFAULT_POPUP_SIZE: PopupSize = { width: 500, height: 560 };

// Modals are `fixed inset-0`, so the popup viewport has to stay tall enough to hold one even if
// the user shrank the tree below that.
export const MODAL_MIN_HEIGHT = 500;

const STORAGE_KEY = 'popupSize';

export function clampPopupSize(size: Partial<PopupSize>): PopupSize {
  const width = typeof size.width === 'number' && Number.isFinite(size.width) ? size.width : DEFAULT_POPUP_SIZE.width;
  const height = typeof size.height === 'number' && Number.isFinite(size.height) ? size.height : DEFAULT_POPUP_SIZE.height;
  return {
    width: Math.round(Math.min(Math.max(width, MIN_POPUP_SIZE.width), MAX_POPUP_SIZE.width)),
    height: Math.round(Math.min(Math.max(height, MIN_POPUP_SIZE.height), MAX_POPUP_SIZE.height)),
  };
}

// localStorage rather than chrome.storage: this is read during the popup's first render, and an
// async read would paint the default size first, so every open would visibly jump.
export function readPopupSize(): PopupSize {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? clampPopupSize(JSON.parse(raw)) : DEFAULT_POPUP_SIZE;
  } catch {
    return DEFAULT_POPUP_SIZE;
  }
}

export function savePopupSize(size: PopupSize) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(size));
  } catch {
    // private mode / storage disabled — the size just won't survive this popup
  }
}

// Sizes the document element itself rather than an inner box: the browser derives the popup
// window's size from the document, so an explicit root box is the least ambiguous signal it can
// get — and it leaves no uncovered area inside the window.
export function applyDocumentSize(size: PopupSize) {
  const style = document.documentElement.style;
  style.width = `${size.width}px`;
  style.height = `${size.height}px`;
}

// Chromium grows an extension popup window the moment the document grows, but browsers in this
// family can miss the shrink that happened while the drag still held pointer capture, leaving an
// oversized window (dead space beside the UI) until the popup is reopened. Re-sending the size
// once the capture is gone — one frame a pixel smaller, then the real value — forces the window
// to re-read it. Checked and retried once, since the first attempt can land while the browser is
// still settling the drag. innerWidth/innerHeight include the scrollbar, hence the tolerance.
export function resendDocumentSize(size: PopupSize) {
  const resend = () => {
    applyDocumentSize({ width: size.width - 1, height: size.height - 1 });
    requestAnimationFrame(() => applyDocumentSize(size));
  };
  requestAnimationFrame(resend);
  window.setTimeout(() => {
    if (window.innerWidth > size.width + 24 || window.innerHeight > size.height + 24) {
      resend();
    }
  }, 300);
}
