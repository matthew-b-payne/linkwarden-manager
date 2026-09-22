import React from 'react';
import { FolderItem } from './FolderItem';
import { Folder, Link, LinksByFolder, NewLink } from '@/scripts/utils/interfaces';

interface Props {
  folders: Folder[];
  openFolders: Set<number>;
  toggleFolder: (id: number) => void;
  linksByFolder: LinksByFolder;
  loadLinksForFolder: (id: number) => void;
  sortLinks: string;
  sortFolders: string;
  showEditLinkModal: (link: NewLink) => void;
  showEditFolderModal: (folder: Folder) => void;
  showDeleteFolderModal: (folder: Folder) => void;
  openAllInFolder: (folderId: number) => void;
  canShowOverlayButtons: boolean;
  openLinksInNewTab: boolean;
  onMoveLink: (linkId: number, targetFolderId: number) => void;
}

export const FolderStructure = ({
  folders,
  openFolders,
  toggleFolder,
  linksByFolder,
  loadLinksForFolder,
  sortLinks,
  sortFolders,
  showEditLinkModal,
  showEditFolderModal,
  showDeleteFolderModal,
  openAllInFolder,
  canShowOverlayButtons,
  openLinksInNewTab,
  onMoveLink,
}: Props) => {
  // "none" keeps the order GET /api/v1/collections already applied (Linkwarden's
  // collectionOrder, then createdAt). Every other value re-sorts siblings.
  const sortedFolders: Folder[] = sortFolders === 'none'
    ? folders
    : [...folders].sort(
        sortFolders === 'name_ascending'
          ? (a: Folder, b: Folder) => a.name.localeCompare(b.name)
          : sortFolders === 'name_descending'
            ? (a: Folder, b: Folder) => b.name.localeCompare(a.name)
            : sortFolders === 'date_ascending'
              ? (a: Folder, b: Folder) => new Date(a.createdAt).valueOf() - new Date(b.createdAt).valueOf()
              : (a: Folder, b: Folder) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf(),
      );

  const childrenByParentId = new Map<number, Folder[]>();
  sortedFolders.forEach((folder) => {
    const parentId = folder.parentId || 0;
    const siblings = childrenByParentId.get(parentId);
    if (siblings) {
      siblings.push(folder);
    } else {
      childrenByParentId.set(parentId, [folder]);
    }
  });

  const rootFolders = childrenByParentId.get(0) || [];

  const renderFolder = (folder: Folder) => (
    <FolderItem
      key={folder.id}
      folder={folder}
      openFolders={openFolders}
      toggleFolder={toggleFolder}
      links={linksByFolder[folder.id]}
      subFolders={childrenByParentId.get(folder.id) || []}
      renderFolder={renderFolder}
      loadLinksForFolder={loadLinksForFolder}
      sortLinks={sortLinks}
      showEditLinkModal={showEditLinkModal}
      showEditFolderModal={showEditFolderModal}
      showDeleteFolderModal={showDeleteFolderModal}
      openAllInFolder={openAllInFolder}
      canShowOverlayButtons={canShowOverlayButtons}
      openLinksInNewTab={openLinksInNewTab}
      onMoveLink={onMoveLink}
    />
  );

  return <div>{rootFolders.map(renderFolder)}</div>;
};
