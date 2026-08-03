import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Save, RefreshCw, Keyboard } from 'lucide-react';
import { getBrowser, getStorageItem, setStorageItem } from '../utils/utils';
import { ApiReturnType } from '../service-worker/bookmark-manager-service';
import { Folder, LinksByFolder } from '../utils/interfaces';

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

  useEffect(() => {
    getStorageItem('host').then((value) => {
      if(value)
        setHost(value);
    });
    getStorageItem('token').then((value) => {
      if(value)
        setToken(value);
    });
    getStorageItem('sortLinks').then((value) => {
      if(value) {
        setLinkSort(value);
      }
    });
    getStorageItem('sortFolders').then((value) => {
      if(value) {
        setFolderSort(value);
      }
    });
    getStorageItem('openNewTab').then((value) => {
      if(value) {
        setOpenLinksInNewTab(value);
      }
    });
    // unset (never saved before) should default to enabled, so only overwrite the default
    // when a value has actually been stored — unlike the booleans above, which default to off
    getStorageItem('savedIndicatorEnabled').then((value) => {
      if (value !== undefined) {
        setSavedIndicatorEnabled(value);
      }
    });
    getStorageItem('savedIndicatorRefreshMinutes').then((value) => {
      if (value) {
        setSavedIndicatorRefreshMinutes(value);
      }
    });
  }, []);

  const openShortcutSettings = () => {
    const browserApi = getBrowser();
    // Firefox exposes a dedicated API for this; Chrome has no equivalent, so fall back to
    // deep-linking its shortcuts page directly (tabs.create needs no extra permission).
    if (browserApi.commands?.openShortcutSettings) {
      browserApi.commands.openShortcutSettings();
    } else {
      browserApi.tabs.create({ url: 'chrome://extensions/shortcuts' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setStorageItem('host', host).then(() =>
      setStorageItem('token', token))
    .then(() =>
      setStorageItem('sortLinks', linkSort))
    .then(() =>
      setStorageItem('sortFolders', folderSort))
    .then(() =>
      setStorageItem('openNewTab', openLinksInNewTab))
    .then(() =>
      setStorageItem('savedIndicatorEnabled', savedIndicatorEnabled))
    .then(() =>
      setStorageItem('savedIndicatorRefreshMinutes', savedIndicatorRefreshMinutes))
    .then(() =>
      getBrowser().runtime.sendMessage({action: 'reload'})
    ).then(() => {
      setStatus({isError: false, text: 'Options saved successfully.'});
      setTimeout(() => setStatus({isError: false, text: ''}), 3000);
    });
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
