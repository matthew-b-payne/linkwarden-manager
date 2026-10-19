import { getStorageItem, setStorageItem } from './utils';

// 'system' follows the OS/browser preference; the other two pin it. The resolved value ends up on
// <html data-theme>, which is what src/styles/index.css switches the token palette on.
export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system';

// Linkwarden's seven accent swatches, in its own order. They only recolour the primary token,
// exactly as its picker only reassigns daisyUI's `--p`. Local to this extension: Linkwarden keeps
// the choice in the browser (localStorage "color"), never in the API, so there is nothing to sync.
export type AccentColor = 'default' | 'red' | 'rose' | 'yellow' | 'green' | 'orange' | 'zinc';
export const ACCENT_COLORS: AccentColor[] = ['default', 'red', 'rose', 'yellow', 'green', 'orange', 'zinc'];
export const DEFAULT_ACCENT_COLOR: AccentColor = 'default';

// chrome.storage.local, alongside the other settings — the options page and the popup are
// separate documents, so the preference has to live outside either one.
export const THEME_STORAGE_KEY = 'theme';
// ...mirrored into localStorage because extension storage is async: the popup would paint the
// light palette first and visibly flip on every open. Same reasoning as popupSize.ts, and both
// extension pages share one origin, so the options page writing it updates the popup too.
const THEME_MIRROR_KEY = 'themePreference';

export const ACCENT_STORAGE_KEY = 'accent';
const ACCENT_MIRROR_KEY = 'accentColor';

const DARK_QUERY = '(prefers-color-scheme: dark)';

let currentPreference: ThemePreference = DEFAULT_THEME_PREFERENCE;
let currentAccent: AccentColor = DEFAULT_ACCENT_COLOR;
let systemListenerAttached = false;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

export function isAccentColor(value: unknown): value is AccentColor {
  return typeof value === 'string' && (ACCENT_COLORS as string[]).includes(value);
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'system') {
    return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light';
  }
  return preference;
}

function readMirror<T extends string>(key: string, isValid: (value: unknown) => value is T, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return isValid(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

function writeMirror(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // private mode / storage disabled — the choice still persists in extension storage, it just
    // costs a flash of the previous theme on the next open.
  }
}

export function applyTheme(preference: ThemePreference) {
  currentPreference = preference;
  document.documentElement.dataset.theme = resolveTheme(preference);
}

export function applyAccent(accent: AccentColor) {
  currentAccent = accent;
  document.documentElement.dataset.accent = accent;
}

export async function loadThemePreference(): Promise<ThemePreference> {
  const stored = await getStorageItem(THEME_STORAGE_KEY);
  return isThemePreference(stored) ? stored : DEFAULT_THEME_PREFERENCE;
}

export async function loadAccentColor(): Promise<AccentColor> {
  const stored = await getStorageItem(ACCENT_STORAGE_KEY);
  return isAccentColor(stored) ? stored : DEFAULT_ACCENT_COLOR;
}

export async function saveThemePreference(preference: ThemePreference) {
  applyTheme(preference);
  writeMirror(THEME_MIRROR_KEY, preference);
  await setStorageItem(THEME_STORAGE_KEY, preference);
}

export async function saveAccentColor(accent: AccentColor) {
  applyAccent(accent);
  writeMirror(ACCENT_MIRROR_KEY, accent);
  await setStorageItem(ACCENT_STORAGE_KEY, accent);
}

// Call from a page entry point before React mounts: applies the mirrored choices synchronously,
// then reconciles with extension storage (the source of truth) and keeps following the OS while
// the theme preference is 'system'.
export function initTheme() {
  applyTheme(readMirror(THEME_MIRROR_KEY, isThemePreference, DEFAULT_THEME_PREFERENCE));
  applyAccent(readMirror(ACCENT_MIRROR_KEY, isAccentColor, DEFAULT_ACCENT_COLOR));

  if (!systemListenerAttached && typeof window !== 'undefined' && window.matchMedia) {
    window.matchMedia(DARK_QUERY).addEventListener('change', () => {
      if (currentPreference === 'system') {
        applyTheme('system');
      }
    });
    systemListenerAttached = true;
  }

  void Promise.all([loadThemePreference(), loadAccentColor()])
    .then(([preference, accent]) => {
      if (preference !== currentPreference) {
        applyTheme(preference);
      }
      if (accent !== currentAccent) {
        applyAccent(accent);
      }
      writeMirror(THEME_MIRROR_KEY, preference);
      writeMirror(ACCENT_MIRROR_KEY, accent);
    })
    .catch((error) => {
      // Mirror already applied above; a storage hiccup must not become an uncaught rejection
      // on the options/popup document.
      console.warn('Could not reconcile theme from extension storage: ', error);
    });
}
