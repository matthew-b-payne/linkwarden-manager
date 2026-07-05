import { Folder, SaveSessionRequest, SaveSessionResult, SessionTab, Tag } from '@/scripts/utils/interfaces';
import { ApiReturnType } from '@/scripts/service-worker/bookmark-manager-service';
import { getFullPathName } from '@/scripts/utils/utils';
import React, { useState } from 'react';
import { BarLoader } from 'react-spinners';
import { TagSelect } from './TagSelect';

interface Props {
  tabs: SessionTab[];
  allFolders: Folder[];
  allTags: Tag[];
  saveSession: (req: SaveSessionRequest) => Promise<ApiReturnType<SaveSessionResult>>;
  closeModal: () => void;
}

const defaultSessionName = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `Session ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const SaveSessionModal = ({
  tabs,
  allFolders,
  allTags,
  saveSession,
  closeModal,
}: Props) => {
  const sortedFolders: Folder[] = allFolders
    .map((folder) => ({ ...folder, name: getFullPathName(allFolders, folder) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const [destinationType, setDestinationType] = useState<'new' | 'existing'>('new');
  const [sessionName, setSessionName] = useState(defaultSessionName());
  const [nestUnderSessions, setNestUnderSessions] = useState(true);
  const [existingCollectionId, setExistingCollectionId] = useState<number>(sortedFolders[0]?.id ?? 0);
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'saving' | 'done'>('idle');
  const [result, setResult] = useState<ApiReturnType<SaveSessionResult> | null>(null);

  const canSave =
    tabs.length > 0 &&
    (destinationType === 'existing'
      ? existingCollectionId > 0
      : sessionName.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave || status === 'saving') {
      return;
    }
    setStatus('saving');
    const destination: SaveSessionRequest['destination'] =
      destinationType === 'existing'
        ? { type: 'existing', collectionId: +existingCollectionId }
        : { type: 'new', name: sessionName.trim(), nestUnderSessions };
    const res = await saveSession({ destination, tabs, tags });
    setResult(res);
    setStatus('done');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-1">
      <div className="rounded-lg w-full max-w-md bg-white text-black dark:bg-gray-800 dark:text-white">
        <form onSubmit={handleSubmit} className="p-3">
          <h2 className="text-sm font-semibold mb-3">Save all tabs ({tabs.length})</h2>

          {status === 'done' ? (
            <div className="space-y-3">
              {result && result.success ? (
                <div className="text-sm">
                  Saved {result.data.saved} of {tabs.length} tab{tabs.length === 1 ? '' : 's'}.
                  {result.data.failed > 0 && (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {result.data.failed} failed to save.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-red-600 dark:text-red-400 break-words">
                  Error saving session: {(result && String(result.data)) || 'no response from the extension background'}.
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <fieldset className="space-y-2">
                <label className="flex items-start space-x-2">
                  <input
                    type="radio"
                    name="destination"
                    className="mt-1"
                    checked={destinationType === 'new'}
                    onChange={() => setDestinationType('new')}
                  />
                  <span className="flex-grow">
                    <span className="text-sm font-medium">New session folder</span>
                    <input
                      type="text"
                      value={sessionName}
                      maxLength={2048}
                      onChange={(e) => setSessionName(e.target.value)}
                      onFocus={() => setDestinationType('new')}
                      className="mt-1 w-full px-1 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white border-gray-300 text-black dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Session name"
                    />
                    <label className="mt-2 flex items-center space-x-2 text-xs">
                      <input
                        type="checkbox"
                        checked={nestUnderSessions}
                        onChange={(e) => setNestUnderSessions(e.target.checked)}
                      />
                      <span>Nest under a "Sessions" folder</span>
                    </label>
                  </span>
                </label>

                {sortedFolders.length > 0 && (
                  <label className="flex items-start space-x-2">
                    <input
                      type="radio"
                      name="destination"
                      className="mt-1"
                      checked={destinationType === 'existing'}
                      onChange={() => setDestinationType('existing')}
                    />
                    <span className="flex-grow">
                      <span className="text-sm font-medium">Existing folder</span>
                      <select
                        value={existingCollectionId}
                        onChange={(e) => setExistingCollectionId(+e.target.value)}
                        onFocus={() => setDestinationType('existing')}
                        className="mt-1 w-full px-1 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs bg-white border-gray-300 text-black dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        {sortedFolders.map((folder) => (
                          <option key={folder.id} value={folder.id}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                    </span>
                  </label>
                )}
              </fieldset>

              <TagSelect allTags={allTags} selected={tags} onChange={setTags} />

              <div className="h-[4px] flex justify-center">
                <BarLoader width={'100%'} loading={status === 'saving'} color={'#9d9d9d'} />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={status === 'saving'}
                  className="px-3 py-1 border rounded-md text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!canSave || status === 'saving'}
                  className="px-3 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {status === 'saving' ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
