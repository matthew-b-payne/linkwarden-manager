import { Folder, NewLink, Tag } from '@/scripts/utils/interfaces';
import { getFullPathName } from '@/scripts/utils/utils';
import React from 'react';
import { FolderSelect } from './FolderSelect';
import { preventEnterSubmitFromOpenSelect } from './formKeyboard';
import { TagSelect } from './TagSelect';

interface Props {
  newLink: NewLink;
  allTags: Tag[];
  allFolders: Folder[];
  handleNewLinkChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleTagChange: (e: string[]) => void;
  saveNewLink: (e: React.FormEvent) => void;
  closeAddLinkModal: () => void;
  onCreateFolder?: (name: string) => void;
  isCreatingFolder?: boolean;
}


export const AddLinkModal = ({
  newLink,
  allTags,
  allFolders,
  handleNewLinkChange,
  handleTagChange,
  saveNewLink,
  closeAddLinkModal,
  onCreateFolder,
  isCreatingFolder,
}: Props) => {
  const sortedFolders: Folder[] = allFolders
    .map((folder) => ({...folder, name: getFullPathName(allFolders, folder)}))
    .sort((a, b) => a.name.localeCompare(b.name));


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-1">
      <div
        className={`rounded-lg w-full max-w-md bg-white text-black dark:bg-gray-800 dark:text-white`}
      >
        <form onSubmit={saveNewLink} onKeyDown={preventEnterSubmitFromOpenSelect} className="p-1">
          <div className="space-y-4">
            <div>
              <label htmlFor="url" className="block text-xs font-medium mb-1">
                URL
              </label>
              <input
                type="url"
                id="url"
                name="url"
                maxLength={2048}
                value={newLink.url}
                onChange={handleNewLinkChange}
                required
                className={`w-full px-1 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs
                  bg-white border-gray-300 text-black dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label htmlFor="title" className="block text-xs font-medium mb-1">
                Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                maxLength={2048}
                value={newLink.title}
                onChange={handleNewLinkChange}
                className={`w-full px-1 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs
                  bg-white border-gray-300 text-black dark:bg-gray-700 dark:border-gray-600 dark:text-white`}
                placeholder="Link Title"
              />
            </div>
            {sortedFolders.length > 0 && (
              <FolderSelect
                id="collectionId"
                label="Folder"
                folders={sortedFolders}
                value={newLink.collectionId}
                includeRootOption={false}
                pinCurrentToTop
                allowCreate={!!onCreateFolder}
                isDisabled={!!isCreatingFolder}
                onCreateFolder={onCreateFolder}
                onChange={(folderId) =>
                  handleNewLinkChange({
                    target: { name: 'collectionId', value: folderId },
                  } as unknown as React.ChangeEvent<HTMLSelectElement>)
                }
              />
            )}
            <TagSelect
              allTags={allTags}
              selected={newLink.tags}
              onChange={handleTagChange}
            />
            <div>
              <label htmlFor="description" className="block text-xs font-medium mb-1">
                Notes <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                maxLength={2048}
                value={newLink.description || ''}
                onChange={handleNewLinkChange}
                rows={3}
                className={`w-full px-1 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs
                  bg-white border-gray-300 text-black dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-y`}
                placeholder="Optional notes about this link..."
              />
            </div>
          </div>
          <div className="mt-1 flex justify-end space-x-3">
            <button
              type="button"
              onClick={closeAddLinkModal}
              className={`px-1 py-1 border rounded-md text-sm font-medium border-gray-300 text-gray-700 hover:bg-gray-50
                dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-1 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-white
                bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
