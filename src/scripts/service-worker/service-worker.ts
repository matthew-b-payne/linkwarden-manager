import { LinkwardenService } from './linkwarden-service';
import { getActionApi, getBrowser, getStorageItem, getStorageItems, normalizeUrlForComparison, setStorageItem } from '../utils/utils';
import { hasHostAccess, hostOriginPattern } from '../utils/hostPermission';
import { LinksByFolder, NewLink, SaveSessionRequest } from '../utils/interfaces';
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

// The message protocol between the popup/options pages and this worker. `runtime.onMessage`
// hands over an unvalidated value, so the listener narrows on `action` before getting here.
type ApiRequest =
  | { action: 'fetchAllLinksFromAllFolders' }
  | { action: 'fetchFolders' }
  | { action: 'fetchLinks'; collectionId: number }
  | { action: 'fetchTags' }
  | { action: 'saveLink'; link: NewLink }
  | { action: 'saveSession'; data: SaveSessionRequest }
  | { action: 'updateLink'; data: NewLink; collectionOwnerId: string }
  | { action: 'deleteLink'; id: number }
  | { action: 'createFolder'; name: string; parentId: number }
  | { action: 'updateFolder'; id: number; name: string; parentId: number }
  | { action: 'deleteFolder'; id: number };

async function handleApiAction(request: ApiRequest): Promise<ApiReturnType<unknown>> {
  const { host, token } = await getCredentials();
  if (!host || !token) {
    console.warn('Tried to call Linkwarden API with invalid credentials');
    return { success: false, data: 'Extension is not configured. Please set your host and API token in the options.' };
  }

  // A worker has no user gesture, so it can only report the missing grant — the popup and the
  // Options page are the two places that can actually ask for it.
  if (!(await hasHostAccess(host))) {
    return {
      success: false,
      data: `Access to ${hostOriginPattern(host) ?? host} has not been granted. Open the extension options and press Save to allow it.`,
    };
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
      return { success: false, data: 'Unknown action: ' + JSON.stringify(request) };
  }
}

// flashes an error badge on the toolbar icon for a few seconds — the only feedback available
// if the shortcut can't even get the popup open (e.g. not configured, or openPopup rejected)
function flashErrorBadge() {
  try {
    const action = getActionApi();
    void Promise.resolve(action.setBadgeBackgroundColor({ color: '#dc2626' })).catch(() => undefined);
    void Promise.resolve(action.setBadgeText({ text: '!' })).catch(() => undefined);
    setTimeout(() => {
      void Promise.resolve(action.setBadgeText({ text: '' })).catch(() => undefined);
    }, 3000);
  } catch (error) {
    console.warn('Could not flash error badge: ', error);
  }
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
  if (!action) {
    return;
  }
  const { enabled } = await getSavedIndicatorPreferences();
  const isSaved = enabled && !!url && /^https?:\/\//.test(url) && savedUrls.has(normalizeUrlForComparison(url));
  // MV3 action methods return Promises — must await (or catch) so a permission/tab race
  // does not show up as "Uncaught (in promise)" in chrome://extensions.
  await Promise.resolve(action.setBadgeText({ text: isSaved ? '\u2713' : '', tabId }));
  if (isSaved) {
    await Promise.resolve(action.setBadgeBackgroundColor({ color: SAVED_BADGE_COLOR, tabId }));
  }
  await Promise.resolve(action.setTitle({ tabId, title: isSaved ? 'This page is saved in Linkwarden' : '' }));
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
  if (!action) {
    return;
  }
  const tabs = await getBrowser().tabs.query({});
  await Promise.all(
    tabs.map((tab: { id?: number }) =>
      tab.id != null
        ? Promise.resolve(action.setBadgeText({ text: '', tabId: tab.id })).catch(() => undefined)
        : Promise.resolve()
    )
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
    void updateBadgeForAllTabs().catch((error) => console.warn('Badge refresh on storage change failed: ', error));
  }
});

getBrowser().tabs.onUpdated.addListener(async (tabId: number, changeInfo: { url?: string }) => {
  if (changeInfo.url) {
    try {
      await updateBadgeForTab(tabId, changeInfo.url, await getSavedUrlSet());
    } catch (error) {
      console.warn('Badge update on tab URL change failed: ', error);
    }
  }
});

getBrowser().tabs.onActivated.addListener(async ({ tabId }: { tabId: number }) => {
  try {
    const [tab, savedUrls] = await Promise.all([getBrowser().tabs.get(tabId), getSavedUrlSet()]);
    await updateBadgeForTab(tabId, tab.url, savedUrls);
  } catch (error) {
    console.warn('Badge update on tab activate failed: ', error);
  }
});

// Only true install/browser-startup events trigger an immediate background refresh — NOT every
// service worker wake, which under MV3 happens far more often than we want to hit the API.
getBrowser().runtime.onInstalled.addListener(() => {
  void refreshLinksCacheInBackground().catch((error) => console.warn('Install cache refresh failed: ', error));
});
getBrowser().runtime.onStartup.addListener(() => {
  void refreshLinksCacheInBackground().catch((error) => console.warn('Startup cache refresh failed: ', error));
});

void syncSavedIndicatorAlarm().catch((error) => console.warn('Alarm sync on start failed: ', error));

getBrowser().alarms.onAlarm.addListener((alarm: { name: string }) => {
  if (alarm.name === LINKS_REFRESH_ALARM) {
    void refreshLinksCacheInBackground().catch((error) => console.warn('Alarm cache refresh failed: ', error));
  }
});

// Re-applies whatever is already cached to every open tab's badge on every script (re)start —
// covers both a real browser launch and the service worker being respawned after Chrome killed
// it idle. Cheap: one storage read, no network.
void updateBadgeForAllTabs().catch((error) => console.warn('Initial badge apply failed: ', error));

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

// `runtime.onMessage` delivers whatever a sender passed, so read `action` defensively before
// dispatching on it.
function messageAction(message: unknown): string | undefined {
  if (message && typeof message === 'object' && 'action' in message) {
    return typeof message.action === 'string' ? message.action : undefined;
  }
  return undefined;
}

getBrowser().runtime.onMessage.addListener(function (message: unknown, _sender: unknown, sendResponse: (response: unknown) => void) {
  console.log('Message received:', message);

  const action = messageAction(message);

  if (action === 'hasValidConfiguration') {
    getCredentials()
      .then(({ host, token }) => sendResponse(!!host && !!token))
      .catch((error) => {
        console.warn('hasValidConfiguration failed: ', error);
        sendResponse(false);
      });
    return true;
  } else if (action === 'reload') {
    // Credentials are read on-demand elsewhere, so there's nothing to refresh for those. The
    // "already saved" indicator's on/off state and refresh interval are cached in the alarm
    // schedule though, so re-sync them, then immediately refresh+rebadge (a no-op if the
    // indicator is now disabled) rather than leaving the user waiting for the next alarm tick.
    syncSavedIndicatorAlarm()
      .then(() => refreshLinksCacheInBackground())
      .then(() => sendResponse(true))
      .catch((error) => {
        console.warn('reload action failed: ', error);
        sendResponse(false);
      });
    return true;
  }

  // every remaining action hits the Linkwarden API and always sends a response
  // (success or a failure object) so callers never hang waiting on a dropped message.
  // Only this extension's own pages send these, and they build the payload from ApiRequest.
  handleApiAction(message as ApiRequest)
    .then(sendResponse)
    .catch((error) => {
      console.error('API action failed: ', error);
      sendResponse({
        success: false,
        data: error instanceof Error ? error.message : String(error),
      });
    });
  return true;
});

export {};
