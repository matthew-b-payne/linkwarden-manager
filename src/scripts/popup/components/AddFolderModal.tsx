import { Folder } from '@/scripts/utils/interfaces';
import { getFullPathName, getParentFolder } from '@/scripts/utils/utils';
import React from 'react';
import { FolderSelect } from './FolderSelect';
import { preventEnterSubmitFromOpenSelect } from './formKeyboard';

interface Props {
  newFolder: Folder;
  allFolders: Folder[];
  handleNewFolderChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  saveNewFolder: (e: React.FormEvent) => void;
  closeAddFolderModal: () => void;
}

export const AddFolderModal = ({
  newFolder,
  allFolders,
  handleNewFolderChange,
  saveNewFolder,
  closeAddFolderModal,
}: Props) => {

  // Filter out any folders that have the edited folder as an extended parent to make sure we don't move a folder into a child of itself.
  // The Linkwarden API has no extended feasibility checks and would allow this, but it would completely break the Linkwarden dashboard.
  // This is a naiive implementation of an algorithm to filter out all children of the folder.
  // An optimized version could be implemented by storing all extended parents for every folder and then checking if the target folder is in any of the arrays.
  // However, since we only need this check once when we are editing a folder, we don't really have to optimize this.
  const checkParentsForPotentialLoop = (folder: Folder, targetId: number) => {
    if(folder.id === targetId) {
      return false;
    }
    if(!!folder.parentId) {
      const parentFolder = getParentFolder(allFolders, folder);
      return checkParentsForPotentialLoop(parentFolder, targetId);
    }
    return true;
  };

  const filteredFolders = newFolder.id !== 0 ? allFolders.filter((folder) => checkParentsForPotentialLoop(folder, newFolder.id)) : allFolders;
  const sortedFolders: Folder[] = filteredFolders
    .map((folder) => ({...folder, name: getFullPathName(allFolders, folder)}))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="fixed inset-0 bg-overlay-scrim flex items-center justify-center p-1">
      <div className="rounded-lg w-full max-w-md bg-surface text-base-content">
        <form onSubmit={saveNewFolder} onKeyDown={preventEnterSubmitFromOpenSelect} className="p-1">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                maxLength={2048}
                value={newFolder.name}
                onChange={handleNewFolderChange}
                className="w-full px-1 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary text-xs bg-surface border-border text-base-content"
                placeholder="Name or path (AI/analysis)"
              />
              <p className="mt-1 text-[11px] text-muted">
                Use <span className="font-mono">/</span> to nest under an existing folder
                (e.g. <span className="font-mono">AI/analysis</span>).
              </p>
            </div>
            {sortedFolders.length > 0 && (
              <FolderSelect
                id="parentId"
                label="Parent Folder"
                folders={sortedFolders}
                value={newFolder.parentId ?? 0}
                onChange={(folderId) =>
                  handleNewFolderChange({
                    target: { name: 'parentId', value: folderId },
                  } as unknown as React.ChangeEvent<HTMLSelectElement>)
                }
              />
            )}
          </div>
          <div className="mt-1 flex justify-end space-x-3">
            <button
              type="button"
              onClick={closeAddFolderModal}
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
