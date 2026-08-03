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
    <div className="fixed inset-0 bg-overlay-scrim flex items-center justify-center p-1">
      <div className="rounded-lg w-full max-w-md bg-surface text-base-content">
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
                className="w-full px-1 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary text-xs bg-surface border-border text-base-content"
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
                className="w-full px-1 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary text-xs bg-surface border-border text-base-content"
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
                Notes <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                maxLength={2048}
                value={newLink.description || ''}
                onChange={handleNewLinkChange}
                rows={3}
                className="w-full px-1 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary text-xs bg-surface border-border text-base-content resize-y"
                placeholder="Optional notes about this link..."
              />
            </div>
          </div>
          <div className="mt-1 flex justify-end space-x-3">
            <button
              type="button"
              onClick={closeAddLinkModal}
              className="px-1 py-1 border rounded-md text-sm font-medium border-border text-base-content hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-1 py-1 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-content bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
