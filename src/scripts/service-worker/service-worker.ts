import { LinkwardenService } from './linkwarden-service';
import { getActionApi, getBrowser, getStorageItem, getStorageItems, normalizeUrlForComparison, setStorageItem } from '../utils/utils';
import { LinksByFolder } from '../utils/interfaces';
import { ApiReturnType, BookmarkManagerService } from './bookmark-manager-service';

console.log('Background Service Worker Loaded');

// Load credentials fresh from storage for every request rather than caching them
// in module-level state. Under Manifest V3 the service worker is terminated when
// idle (even while the popup is open) and respawned on the next message, which
// would wipe cached credentials and cause requests to be silently dropped.
async function getCredentials(): Promise<{ host?: string; token?: string }> {
  const result = await getStorageItems(['host', 'token']);
  return { host: result.host, token: result.token };
}

async function handleApiAction(request: any): Promise<ApiReturnType<any>> {
  const { host, token } = await getCredentials();
  if (!host || !token) {
    console.warn('Tried to call Linkwarden API with invalid credentials');
    return { success: false, data: 'Extension is not configured. Please set your host and API token in the options.' };
  }

  const service: BookmarkManagerService = new LinkwardenService(host, token);
  switch (request.action) {
    case 'fetchAllLinksFromAllFolders':
      return service.fetchAllLinksFromAllFolders();
    case 'fetchFolders':
      return service.fetchFolders();
    case 'fetchLinks':
      return service.fetchLinks(request.collectionId);
    case 'fetchTags':
      return service.fetchTags();
    case 'saveLink':
      return service.saveLink(request.link);
    case 'saveSession':
      return service.saveSession(request.data);
    case 'updateLink':
      return service.updateLink(request.data, request.collectionOwnerId);
    case 'deleteLink':
      return service.deleteLink(request.id);
    case 'createFolder':
      return service.createFolder(request.name, request.parentId);
    case 'updateFolder':
      return service.updateFolder(request.id, request.name, request.parentId);
    case 'deleteFolder':
      return service.deleteFolder(request.id);
    default:
      return { success: false, data: 'Unknown action: ' + request.action };
  }
}

// flashes an error badge on the toolbar icon for a few seconds — the only feedback available
// if the shortcut can't even get the popup open (e.g. not configured, or openPopup rejected)
function flashErrorBadge() {
  const action = getActionApi();
  action.setBadgeBackgroundColor({ color: '#dc2626' });
  action.setBadgeText({ text: '!' });
  setTimeout(() => action.setBadgeText({ text: '' }), 3000);
}

const LINKS_REFRESH_ALARM = 'refresh-links-cache';
const SAVED_BADGE_COLOR = '#16a34a';

// Builds the "already saved" URL set from whatever link cache is currently in storage — the
// same `linksByFolder` cache the popup already reads/writes — so checking a tab never costs a
// network call.
// Reads the "already saved" indicator's user-configurable on/off + refresh-interval preference.
// Enabled defaults to true (unset === never saved yet, not explicitly disabled); interval
// defaults to 10 minutes.
async function getSavedIndicatorPreferences(): Promise<{ enabled: boolean; refreshMinutes: number }> {
  const stored = await getStorageItems(['savedIndicatorEnabled', 'savedIndicatorRefreshMinutes']);
  return {
    enabled: stored.savedIndicatorEnabled !== false,
    refreshMinutes: typeof stored.savedIndicatorRefreshMinutes === 'number' ? stored.savedIndicatorRefreshMinutes : 10,
  };
}

async function getSavedUrlSet(): Promise<Set<string>> {
  const linksByFolder: LinksByFolder | undefined = await getStorageItem('linksByFolder');
  if (!linksByFolder) {
    return new Set();
  }
  return new Set(Object.values(linksByFolder).flat().map((link) => normalizeUrlForComparison(link.url)));
}

// Single choke point for every badge write (tab events, bulk refresh, background sync) so the
// on/off preference only has to be checked in one place: disabled always clears the badge,
// which also self-heals any badge left over from before the user turned the feature off.
async function updateBadgeForTab(tabId: number, url: string | undefined, savedUrls: Set<string>) {
  const action = getActionApi();
  const { enabled } = await getSavedIndicatorPreferences();
  const isSaved = enabled && !!url && /^https?:\/\//.test(url) && savedUrls.has(normalizeUrlForComparison(url));
  action.setBadgeText({ text: isSaved ? '\u2713' : '', tabId });
  if (isSaved) {
    action.setBadgeBackgroundColor({ color: SAVED_BADGE_COLOR, tabId });
  }
  action.setTitle({ tabId, title: isSaved ? 'This page is saved in Linkwarden' : '' });
}

async function updateBadgeForAllTabs() {
  const { enabled } = await getSavedIndicatorPreferences();
  if (!enabled) {
    return;
  }
  const savedUrls = await getSavedUrlSet();
  const tabs = await getBrowser().tabs.query({});
  await Promise.all(
    tabs.map((tab: { id?: number; url?: string }) =>
      tab.id != null ? updateBadgeForTab(tab.id, tab.url, savedUrls) : Promise.resolve()
    )
  );
}

// Keeps the badge accurate even when the popup is never opened — the popup's own cache refresh
// only runs while it's visible, so without this, a user who never opens the popup would have a
// permanently stale (or empty) "already saved" indicator. Re-badges directly (rather than only
// relying on the storage.onChanged listener below) because this runs inside the same alarm-woken
// invocation, so it doesn't depend on a *second* wake to pick the change up.
async function refreshLinksCacheInBackground() {
  const { enabled } = await getSavedIndicatorPreferences();
  if (!enabled) {
    return;
  }
  const { host, token } = await getCredentials();
  if (!host || !token) {
    return;
  }
  const service: BookmarkManagerService = new LinkwardenService(host, token);
  const result = await service.fetchAllLinksFromAllFolders();
  if (result.success) {
    await setStorageItem('linksByFolder', result.data);
    await setStorageItem('lastUpdate', Date.now());
    await updateBadgeForAllTabs();
  }
}

async function clearAllBadges() {
  const action = getActionApi();
  const tabs = await getBrowser().tabs.query({});
  await Promise.all(
    tabs.map((tab: { id?: number }) => (tab.id != null ? action.setBadgeText({ text: '', tabId: tab.id }) : Promise.resolve()))
  );
}

// Applies the current on/off + interval preference to the alarm schedule. Safe to call on every
// SW start — a still-matching alarm is left untouched so its countdown isn't reset — and again
// whenever Options saves a changed preference.
async function syncSavedIndicatorAlarm() {
  const { enabled, refreshMinutes } = await getSavedIndicatorPreferences();
  const existingAlarm = await getBrowser().alarms.get(LINKS_REFRESH_ALARM);

  if (!enabled) {
    if (existingAlarm) {
      await getBrowser().alarms.clear(LINKS_REFRESH_ALARM);
    }
    await clearAllBadges();
    return;
  }

  if (!existingAlarm || existingAlarm.periodInMinutes !== refreshMinutes) {
    await getBrowser().alarms.create(LINKS_REFRESH_ALARM, { periodInMinutes: refreshMinutes });
  }
}

// Re-badge every open tab whenever the shared link cache changes — covers a background refresh,
// the popup's own periodic refresh, and any save/delete/edit action, without those call sites
// needing to know the badge exists.
getBrowser().storage.onChanged.addListener((changes: Record<string, unknown>, areaName: string) => {
  if (areaName === 'local' && 'linksByFolder' in changes) {
    updateBadgeForAllTabs();
  }
});

getBrowser().tabs.onUpdated.addListener(async (tabId: number, changeInfo: { url?: string }) => {
  if (changeInfo.url) {
    updateBadgeForTab(tabId, changeInfo.url, await getSavedUrlSet());
  }
});

getBrowser().tabs.onActivated.addListener(async ({ tabId }: { tabId: number }) => {
  const [tab, savedUrls] = await Promise.all([getBrowser().tabs.get(tabId), getSavedUrlSet()]);
  updateBadgeForTab(tabId, tab.url, savedUrls);
});

// Only true install/browser-startup events trigger an immediate background refresh — NOT every
// service worker wake, which under MV3 happens far more often than we want to hit the API.
getBrowser().runtime.onInstalled.addListener(() => refreshLinksCacheInBackground());
getBrowser().runtime.onStartup.addListener(() => refreshLinksCacheInBackground());

syncSavedIndicatorAlarm();

getBrowser().alarms.onAlarm.addListener((alarm: { name: string }) => {
  if (alarm.name === LINKS_REFRESH_ALARM) {
    refreshLinksCacheInBackground();
  }
});

// Re-applies whatever is already cached to every open tab's badge on every script (re)start —
// covers both a real browser launch and the service worker being respawned after Chrome killed
// it idle. Cheap: one storage read, no network.
updateBadgeForAllTabs();

getBrowser().commands.onCommand.addListener(async (command: string) => {
  if (command !== 'add_current_tab') {
    return;
  }

  const { host, token } = await getCredentials();
  if (!host || !token) {
    getBrowser().runtime.openOptionsPage();
    return;
  }

  // Consumed by the popup on its next mount to auto-open the Add Link modal, pre-filled with
  // the active tab. The popup does the actual tab lookup/folder defaulting itself, reusing the
  // exact same path as clicking "+" — this background script only decides *that* it should open.
  await setStorageItem('pendingAddLink', true);

  try {
    // action.openPopup() (Chrome)/browserAction.openPopup() (Firefox) both require a user-gesture
    // context; a commands.onCommand callback qualifies on both browsers.
    await getActionApi().openPopup();
  } catch (error) {
    console.error('Could not open popup for add_current_tab shortcut: ', error);
    await setStorageItem('pendingAddLink', false);
    flashErrorBadge();
  }
});

getBrowser().runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('Message received:', request);

  if (request.action === 'hasValidConfiguration') {
    getCredentials().then(({ host, token }) => sendResponse(!!host && !!token));
    return true;
  } else if (request.action === 'reload') {
    // Credentials are read on-demand elsewhere, so there's nothing to refresh for those. The
    // "already saved" indicator's on/off state and refresh interval are cached in the alarm
    // schedule though, so re-sync them, then immediately refresh+rebadge (a no-op if the
    // indicator is now disabled) rather than leaving the user waiting for the next alarm tick.
    syncSavedIndicatorAlarm().then(() => refreshLinksCacheInBackground()).then(() => sendResponse(true));
    return true;
  }

  // every remaining action hits the Linkwarden API and always sends a response
  // (success or a failure object) so callers never hang waiting on a dropped message
  handleApiAction(request).then(sendResponse);
  return true;
});

export {};
