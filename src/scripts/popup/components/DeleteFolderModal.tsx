import { ApiReturnType } from '@/scripts/service-worker/bookmark-manager-service';
import { Folder } from '@/scripts/utils/interfaces';
import { getBrowser } from '@/scripts/utils/utils';
import React from 'react';

interface Props {
  folder: Folder;
  refreshData: () => void;
  closeModal: () => void;
}

export const DeleteFolderModal = ({
  folder,
  refreshData,
  closeModal,
}: Props) => {

  const confirmDelete = () => {
    getBrowser().runtime.sendMessage({action: 'deleteFolder', id: folder.id}).then((response: ApiReturnType<any>) => {
      if (response.success) {
        refreshData();
      } else {
        alert('Error deleting folder. Please try again.');
      }
    });
    closeModal();
  };

  const cancelDelete = () => {
    closeModal();
  };

  return (
    <div className="fixed inset-0 bg-overlay-scrim flex items-center justify-center p-1">
      <div className="rounded-lg w-full max-w-md bg-surface text-base-content">
        <div className="p-1 text-center text-sm">
          <p className="mb-2">Are you sure you want to delete this folder?</p>
          <p className="mb-2 text-danger font-bold">All contents will be permanently deleted!</p>
          <button
            onClick={confirmDelete}
            className="px-3 py-1 bg-danger text-primary-content rounded-md mr-2 hover:bg-danger-hover"
          >
            Delete
          </button>
          <button
            onClick={cancelDelete}
            className="px-3 py-1 rounded-md bg-base-300 text-base-content hover:bg-surface-hover"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
