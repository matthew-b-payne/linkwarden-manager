import { getBrowser } from './utils';

// A Linkwarden instance can live at any address, and the extension only learns it when the user
// types it into Options. Declaring `*://*/*` up front would cost every user the "read and change
// all your data on all websites" install warning — and a Chrome Web Store in-depth review — for
// access that is only ever used against that one origin. Chrome therefore ships it as
// `optional_host_permissions` and asks for the single origin when the host is saved.
//
// Firefox (MV2) keeps `<all_urls>` in `permissions`, so it is granted at install: `contains`
// there is always true and `request` resolves immediately. One code path, both browsers.

// `https://linkwarden.example.com/foo` -> `https://linkwarden.example.com/*`. Returns null for
// anything that isn't an http(s) URL, which is also the validation the Options page needs.
export function hostOriginPattern(host: string | undefined): string | null {
  if (!host) {
    return null;
  }
  try {
    const parsed = new URL(host);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return `${parsed.protocol}//${parsed.host}/*`;
  } catch {
    return null;
  }
}

export async function hasHostAccess(host: string | undefined): Promise<boolean> {
  const origin = hostOriginPattern(host);
  if (!origin) {
    return false;
  }
  try {
    return await getBrowser().permissions.contains({ origins: [origin] });
  } catch (error) {
    console.error('Could not read host permission: ', error);
    return false;
  }
}

// Must be called during a user gesture (a click handler, before any `await`) — Chrome rejects a
// permission request that arrives after the gesture has been consumed.
export async function requestHostAccess(host: string | undefined): Promise<boolean> {
  const origin = hostOriginPattern(host);
  if (!origin) {
    return false;
  }
  try {
    return await getBrowser().permissions.request({ origins: [origin] });
  } catch (error) {
    console.error('Could not request host permission: ', error);
    return false;
  }
}

// Pointing the extension at a different instance leaves the old origin granted forever otherwise.
export async function dropHostAccess(host: string | undefined): Promise<void> {
  const origin = hostOriginPattern(host);
  if (!origin) {
    return;
  }
  try {
    await getBrowser().permissions.remove({ origins: [origin] });
  } catch (error) {
    console.error('Could not drop host permission: ', error);
  }
}
