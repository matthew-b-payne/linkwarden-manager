import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, RefreshCw, Keyboard, Check } from 'lucide-react';
import { getBrowser, getStorageItem, setStorageItem } from '../utils/utils';
import { ApiReturnType } from '../service-worker/bookmark-manager-service';
import { Folder, LinksByFolder } from '../utils/interfaces';
import { dropHostAccess, hostOriginPattern, requestHostAccess } from '../utils/hostPermission';
import {
  ACCENT_COLORS,
  AccentColor,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_THEME_PREFERENCE,
  loadAccentColor,
  loadThemePreference,
  saveAccentColor,
  saveThemePreference,
  ThemePreference,
} from '../utils/theme';

const ACCENT_LABELS: Record<AccentColor, string> = {
  default: 'Blue',
  red: 'Red',
  rose: 'Rose',
  yellow: 'Yellow',
  green: 'Green',
  orange: 'Orange',
  zinc: 'Steel',
};

const Options = () => {
  const [host, setHost] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<{isError: boolean; text: string;}>({isError: false, text: ''});
  const [showToken, setShowToken] = useState(false);
  const [linkSort, setLinkSort] = useState('name_ascending');
  const [folderSort, setFolderSort] = useState('name_ascending');
  const [openLinksInNewTab, setOpenLinksInNewTab] = useState(false);
  const [savedIndicatorEnabled, setSavedIndicatorEnabled] = useState(true);
  const [savedIndicatorRefreshMinutes, setSavedIndicatorRefreshMinutes] = useState(10);
  const [theme, setTheme] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);
  const [accent, setAccent] = useState<AccentColor>(DEFAULT_ACCENT_COLOR);

  useEffect(() => {
    // Storage reads are best-effort on mount — a rejection here would otherwise be an
    // uncaught promise on the Options page (Chrome's extension error list) even though
    // the form still works with empty defaults.
    const ignore = () => undefined;
    getStorageItem('host').then((value) => {
      if (value) setHost(value);
    }).catch(ignore);
    getStorageItem('token').then((value) => {
      if (value) setToken(value);
    }).catch(ignore);
    getStorageItem('sortLinks').then((value) => {
      if (value) setLinkSort(value);
    }).catch(ignore);
    getStorageItem('sortFolders').then((value) => {
      if (value) setFolderSort(value);
    }).catch(ignore);
    getStorageItem('openNewTab').then((value) => {
      if (value) setOpenLinksInNewTab(value);
    }).catch(ignore);
    // unset (never saved before) should default to enabled, so only overwrite the default
    // when a value has actually been stored — unlike the booleans above, which default to off
    getStorageItem('savedIndicatorEnabled').then((value) => {
      if (value !== undefined) setSavedIndicatorEnabled(value);
    }).catch(ignore);
    getStorageItem('savedIndicatorRefreshMinutes').then((value) => {
      if (value) setSavedIndicatorRefreshMinutes(value);
    }).catch(ignore);
    loadThemePreference().then(setTheme).catch(ignore);
    loadAccentColor().then(setAccent).catch(ignore);
  }, []);

  const openShortcutSettings = () => {
    const browserApi = getBrowser();
    // Firefox exposes a dedicated API for this; Chrome has no equivalent, so fall back to
    // deep-linking its shortcuts page directly (tabs.create needs no extra permission).
    // Always attach a rejection handler: chrome.tabs.create returns a Promise, and an
    // unhandled rejection shows up as "Uncaught (in promise)" against options.js even
    // when the rest of the page is fine.
    const open = browserApi.commands?.openShortcutSettings
      ? browserApi.commands.openShortcutSettings()
      : browserApi.tabs.create({ url: 'chrome://extensions/shortcuts' });
    void Promise.resolve(open).catch((error: unknown) => {
      console.error('Could not open shortcut settings: ', error);
      setStatus({
        isError: true,
        text: 'Could not open shortcut settings. Open chrome://extensions/shortcuts manually.',
      });
      setTimeout(() => setStatus({ isError: false, text: '' }), 8000);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const origin = hostOriginPattern(host);
    if (!origin) {
      setStatus({ isError: true, text: 'Enter the full address of your Linkwarden instance, e.g. https://linkwarden.example.com' });
      return;
    }

    try {
      // Before any await: Chrome only honours a permission request while the Save click's user
      // gesture is still live, and a granted origin re-requested is a no-op that resolves true.
      const granted = await requestHostAccess(host);

      const previousHost = await getStorageItem('host');

      await setStorageItem('host', host);
      await setStorageItem('token', token);
      await setStorageItem('sortLinks', linkSort);
      await setStorageItem('sortFolders', folderSort);
      await setStorageItem('openNewTab', openLinksInNewTab);
      await setStorageItem('savedIndicatorEnabled', savedIndicatorEnabled);
      await setStorageItem('savedIndicatorRefreshMinutes', savedIndicatorRefreshMinutes);

      if (granted && hostOriginPattern(previousHost) !== origin) {
        await dropHostAccess(previousHost);
      }

      // Best-effort: settings are already on disk. A sleeping/restarting service worker can
      // reject sendMessage; that must not undo a successful save or surface as uncaught.
      try {
        await getBrowser().runtime.sendMessage({ action: 'reload' });
      } catch (error) {
        console.warn('Background reload after save failed: ', error);
      }

      // Settings are still saved when access is declined — losing a pasted token would be worse —
      // but nothing can reach the server until it is granted, so this is not a success message.
      if (!granted) {
        setStatus({ isError: true, text: `Saved, but access to ${origin} was declined. Press Save again and allow it, otherwise the extension cannot reach your Linkwarden.` });
        setTimeout(() => setStatus({ isError: false, text: '' }), 10000);
        return;
      }

      setStatus({ isError: false, text: 'Options saved successfully.' });
      setTimeout(() => setStatus({ isError: false, text: '' }), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({ isError: true, text: `Could not save options: ${message}` });
      setTimeout(() => setStatus({ isError: false, text: '' }), 8000);
    }
  };

  const handleRefresh = async () => {
    setStatus({isError: false, text: 'Refreshing data...'});

    try {
      const links: ApiReturnType<LinksByFolder> = await getBrowser().runtime.sendMessage({action: 'fetchAllLinksFromAllFolders'});
      console.log(links);
      if (!links?.success) {
        setStatus({
          isError: true,
          text: `Error refreshing data: ${links?.data || 'no response from the extension background. Try reloading the extension.'}`,
        });
        setTimeout(() => setStatus({isError: false, text: ''}), 8000);
        return;
      }
      if (links.data) {
        await setStorageItem('linksByFolder', links.data);
      }

      const folders: ApiReturnType<Folder[]> = await getBrowser().runtime.sendMessage({action: 'fetchFolders'});
      if (!folders?.success) {
        setStatus({
          isError: true,
          text: `Error refreshing data: ${folders?.data || 'no response from the extension background. Try reloading the extension.'}`,
        });
        setTimeout(() => setStatus({isError: false, text: ''}), 8000);
        return;
      }
      if (folders.data) {
        await setStorageItem('allFolders', folders.data);
      }

      setStatus({isError: false, text: 'Data refreshed successfully.'});
      setTimeout(() => setStatus({isError: false, text: ''}), 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStatus({isError: true, text: `Error refreshing data: ${message}`});
      setTimeout(() => setStatus({isError: false, text: ''}), 8000);
    }
  };

  const toggleShowToken = () => setShowToken(!showToken);

  const inputClass = `mt-1 block w-full px-3 py-2 text-sm rounded-md shadow-sm transition duration-150 ease-in-out
    bg-surface border-border text-base-content focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50`;

  const selectClass = `w-full px-1 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary text-sm
    bg-surface border-border text-base-content`;

  const labelClassNames = 'block text-sm font-medium mb-1 text-muted';

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-base-200 text-base-content">
      <div className="max-w-lg mx-auto bg-surface rounded-lg shadow-lg overflow-hidden">
        <div className="px-8 py-10">
          <h1 className="text-3xl font-bold text-center mb-8 text-primary">
            Linkwarden Manager Options
          </h1>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="host"
                className={labelClassNames}
              >
                Host
              </label>
              <input
                type="text"
                id="host"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                required
                className={inputClass}
                placeholder="https://your-linkwarden-host.com"
              />
            </div>
            <div>
              <label
                htmlFor="token"
                className={labelClassNames}
              >
                API Token
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type={showToken ? 'text' : 'password'}
                  id="token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  className={`${inputClass} pr-10`}
                  placeholder="Your API token"
                />
                <button
                  type="button"
                  onClick={toggleShowToken}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showToken ? (
                    <EyeOff className="h-5 w-5 text-muted" />
                  ) : (
                    <Eye className="h-5 w-5 text-muted" />
                  )}
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor="theme"
                className={labelClassNames}
              >
                Appearance
              </label>
              <select
                name="theme"
                id="theme"
                value={theme}
                onChange={(e) => {
                  const next = e.target.value as ThemePreference;
                  setTheme(next);
                  // Applied and stored on change rather than on Save: it is a live visual
                  // setting, so leaving the page mid-preview must not strand a theme that
                  // the popup then disagrees with.
                  void saveThemePreference(next);
                }}
                className={selectClass}
              >
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
              <div className="mt-3 flex flex-wrap gap-2">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    title={ACCENT_LABELS[color]}
                    aria-label={`${ACCENT_LABELS[color]} accent`}
                    aria-pressed={accent === color}
                    onClick={() => {
                      setAccent(color);
                      void saveAccentColor(color);
                    }}
                    // The swatch reads the same token the palette uses, so it restyles itself
                    // when the light/dark choice above changes.
                    style={{ backgroundColor: `oklch(var(--lw-accent-${color}))` }}
                    className={`h-9 w-9 rounded-full flex items-center justify-center transition
                      ${accent === color ? 'ring-2 ring-offset-2 ring-base-content ring-offset-surface' : 'hover:scale-105'}`}
                  >
                    {accent === color && <Check className="h-5 w-5 text-primary-content" strokeWidth={3} />}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">
                Matches Linkwarden's own System / Light / Dark options and its seven accent
                colours. Applies immediately to this page and the popup — no need to press Save.
                Linkwarden keeps the accent in browser storage rather than on the server, so this
                one is per-browser there too.
              </p>
            </div>
            <div>
              <label
                htmlFor="linkSort"
                className={labelClassNames}
              >
                Sort Links
              </label>
              <select
                name="linkSort"
                id="linkSort"
                value={linkSort}
                onChange={(e) => {setLinkSort(e.target.value)}}
                className={selectClass}
              >
                <option key="name_ascending" value="name_ascending">Name Ascending</option>
                <option key="name_descending" value="name_descending">Name Descending</option>
                <option key="date_ascending" value="date_ascending">Date Ascending</option>
                <option key="date_descending" value="date_descending">Date Descending</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="folderSort"
                className={labelClassNames}
              >
                Sort Folders
              </label>
              <select
                name="folderSort"
                id="folderSort"
                value={folderSort}
                onChange={(e) => {setFolderSort(e.target.value)}}
                className={selectClass}
              >
                <option key="name_ascending" value="name_ascending">Name Ascending</option>
                <option key="name_descending" value="name_descending">Name Descending</option>
                <option key="date_ascending" value="date_ascending">Date Ascending</option>
                <option key="date_descending" value="date_descending">Date Descending</option>
                <option key="none" value="none">None</option>
              </select>
            </div>
            <div className='flex space-x-4 pt-4'>
              <input
                type='checkbox'
                id='openLinksInNewTab'
                checked={openLinksInNewTab}
                onChange={(event) => setOpenLinksInNewTab(event.target.checked)}
              />
              <label
                htmlFor='openLinksInNewTab'
                className={labelClassNames}
              >
                Always open Links in new Tabs
              </label>
            </div>
            <div className='flex space-x-4 pt-4'>
              <input
                type='checkbox'
                id='savedIndicatorEnabled'
                checked={savedIndicatorEnabled}
                onChange={(event) => setSavedIndicatorEnabled(event.target.checked)}
              />
              <label
                htmlFor='savedIndicatorEnabled'
                className={labelClassNames}
              >
                Show "already saved" indicator on the toolbar icon
              </label>
            </div>
            {savedIndicatorEnabled && (
              <div>
                <label
                  htmlFor="savedIndicatorRefreshMinutes"
                  className={labelClassNames}
                >
                  Background refresh frequency
                </label>
                <select
                  name="savedIndicatorRefreshMinutes"
                  id="savedIndicatorRefreshMinutes"
                  value={savedIndicatorRefreshMinutes}
                  onChange={(e) => setSavedIndicatorRefreshMinutes(Number(e.target.value))}
                  className={selectClass}
                >
                  <option value={5}>Every 5 minutes</option>
                  <option value={10}>Every 10 minutes</option>
                  <option value={30}>Every 30 minutes</option>
                  <option value={60}>Every 60 minutes</option>
                </select>
                <p className="mt-1 text-xs text-muted">
                  How often the extension checks Linkwarden in the background to keep the
                  "already saved" badge accurate without opening the popup. Lower is fresher but
                  adds more background load on your Linkwarden server.
                </p>
              </div>
            )}
            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                className="flex-1 flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-content focus:outline-none focus:ring-2 focus:ring-offset-2 bg-primary hover:bg-primary-hover focus:ring-primary"
              >
                <Save className="mr-2 h-4 w-4" />
                Save
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                className="flex-1 flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-content focus:outline-none focus:ring-2 focus:ring-offset-2 bg-success hover:bg-success-hover focus:ring-success"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </button>
            </div>
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={openShortcutSettings}
                className="inline-flex items-center text-sm text-primary hover:underline focus:outline-none"
              >
                <Keyboard className="mr-1 h-4 w-4" />
                Customize keyboard shortcut
              </button>
            </div>
          </form>
          {status.text && (
            <div
              className={`mt-6 p-3 rounded-md text-center text-sm ${
                status.isError
                  ? 'bg-danger-soft text-danger-soft-content'
                  : 'bg-info-soft text-info-soft-content'
              }`}
            >
              {status.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Options;
