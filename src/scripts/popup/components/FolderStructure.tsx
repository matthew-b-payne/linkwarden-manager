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
  canShowOverlayButtons: boolean;
  openLinksInNewTab: boolean;
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
  canShowOverlayButtons,
  openLinksInNewTab,
}: Props) => {
  // set the sorting function depending on the parameter
  // do not pull the condition into the function to make sure the performance is not impacted when sorting a huge number of links
  const sortFunction = sortFolders == 'name_ascending'
    ? (a: Folder, b: Folder) => a.name.localeCompare(b.name)
    : sortFolders == 'name_descending'
      ? (a: Folder, b: Folder) => b.name.localeCompare(a.name)
      : sortFolders == 'date_ascending'
        ? (a: Folder, b: Folder) => new Date(a.createdAt).valueOf() - new Date(b.createdAt).valueOf()
        : (a: Folder, b: Folder) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf();
  const sortedFolders: Folder[] = [...folders].sort(sortFunction);

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
      links={linksByFolder[folder.id] || []}
      subFolders={childrenByParentId.get(folder.id) || []}
      renderFolder={renderFolder}
      loadLinksForFolder={loadLinksForFolder}
      sortLinks={sortLinks}
      showEditLinkModal={showEditLinkModal}
      showEditFolderModal={showEditFolderModal}
      showDeleteFolderModal={showDeleteFolderModal}
      canShowOverlayButtons={canShowOverlayButtons}
      openLinksInNewTab={openLinksInNewTab}
    />
  );

  return <div>{rootFolders.map(renderFolder)}</div>;
};
