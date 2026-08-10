import { FolderOpen, Folder, ChevronRight, Trash2, Edit3, FolderOutput } from 'lucide-react';
import React, { DragEventHandler, useEffect, useRef, useState } from 'react';
import { LinkItem } from './LinkItem';
import { Folder as FolderInterface, Link, NewLink } from '@/scripts/utils/interfaces';
import { canDropLinkInFolder, readDraggedLinkId } from '@/scripts/utils/linkDrag';
import { defaultFolderColor, OPEN_ALL_CONFIRM_THRESHOLD } from '@/scripts/utils/utils';
import { IconWeight } from '@phosphor-icons/react';
import FolderIcon from './FolderIcon';

interface Props {
  folder: FolderInterface;
  openFolders: Set<number>;
  toggleFolder: (id: number) => void;
  links: Link[] | undefined;
  subFolders: FolderInterface[];
  renderFolder: (folder: FolderInterface) => React.JSX.Element;
  loadLinksForFolder: (id: number) => void;
  sortLinks: string;
  showEditLinkModal: (link: NewLink) => void;
  showEditFolderModal: (folder: FolderInterface) => void;
  showDeleteFolderModal: (folder: FolderInterface) => void;
  openAllInFolder: (folderId: number) => void;
  canShowOverlayButtons: boolean;
  openLinksInNewTab: boolean;
  onMoveLink: (linkId: number, targetFolderId: number) => void;
}

export const FolderItem = ({
  folder,
  openFolders,
  toggleFolder,
  links,
  subFolders,
  renderFolder,
  loadLinksForFolder,
  sortLinks,
  showEditLinkModal,
  showEditFolderModal,
  showDeleteFolderModal,
  openAllInFolder,
  canShowOverlayButtons,
  openLinksInNewTab,
  onMoveLink,
}: Props) => {
  const isOpen: boolean = openFolders.has(folder.id);
  const [showConfirmOpenAll, setShowConfirmOpenAll] = useState(false);
  // set the sorting function depending on the parameter
  // do not pull the condition into the function to make sure the performance is not impacted when sorting a huge number of links
  const sortFunction = sortLinks == 'name_ascending'
    ? (a: Link, b: Link) => a.name.localeCompare(b.name)
    : sortLinks == 'name_descending'
      ? (a: Link, b: Link) => b.name.localeCompare(a.name)
      : sortLinks == 'date_ascending'
        ? (a: Link, b: Link) => new Date(a.createdAt).valueOf() - new Date(b.createdAt).valueOf()
        : (a: Link, b: Link) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf();
  const sortedLinks = links ? [...links].sort(sortFunction) : [];

  // "never fetched" — not "currently empty". Keying this on `links.length === 0` re-fetched the
  // folder every time it was emptied, including the instant a drag & drop move optimistically
  // pulled its last link out: that GET raced the still-in-flight update and read the pre-move
  // state back into the cache, so the moved link reappeared here until the next full refresh.
  const hasCachedLinks = links !== undefined;
  useEffect(() => {
    if (isOpen && !hasCachedLinks) {
      loadLinksForFolder(folder.id);
    }
  }, [isOpen, folder.id, hasCachedLinks, loadLinksForFolder]);

  // A folder still carrying Linkwarden's default colour has never actually been given one, so it
  // follows the accent instead of pinning sky blue. `undefined` lets the icon inherit
  // `currentColor` from `text-primary`. A colour the user deliberately picked is left alone.
  const followsAccent = folder.color?.toLowerCase() === defaultFolderColor;
  const iconColor = followsAccent ? undefined : folder.color;
  const iconClass = followsAccent ? 'mr-2 text-primary' : 'mr-2';
  const headerTint = followsAccent
    ? 'color-mix(in oklab, oklch(var(--lw-accent)) 12%, transparent)'
    : `${folder.color}20`;

  const FallbackIcon = ({isOpen}) => (isOpen
    ? <FolderOpen size={20} color={iconColor} className={iconClass} />
    : <Folder size={20} color={iconColor} className={iconClass} />);

  const [isDropTarget, setIsDropTarget] = useState(false);
  // dragenter/dragleave also fire for the header's children, so a plain boolean flickers as the
  // pointer crosses the icon or label; count enters and only clear on the matching last leave
  const dragEnterCount = useRef(0);
  const springOpenTimer = useRef<number | null>(null);

  const cancelSpringOpen = () => {
    if (springOpenTimer.current !== null) {
      window.clearTimeout(springOpenTimer.current);
      springOpenTimer.current = null;
    }
  };

  useEffect(() => cancelSpringOpen, []);

  const clearDropState = () => {
    dragEnterCount.current = 0;
    cancelSpringOpen();
    setIsDropTarget(false);
  };

  const onDragEnter: DragEventHandler<HTMLDivElement> = (event) => {
    if (!canDropLinkInFolder(event.dataTransfer, folder.id)) {
      return;
    }
    event.preventDefault();
    dragEnterCount.current += 1;
    setIsDropTarget(true);
    // spring-loaded folder: hovering a closed folder opens it, so a link can be dropped into a
    // subfolder in one gesture instead of dropping, expanding, then dragging again
    if (!isOpen && springOpenTimer.current === null) {
      springOpenTimer.current = window.setTimeout(() => {
        springOpenTimer.current = null;
        toggleFolder(folder.id);
      }, 700);
    }
  };

  const onDragOver: DragEventHandler<HTMLDivElement> = (event) => {
    if (!canDropLinkInFolder(event.dataTransfer, folder.id)) {
      return;
    }
    event.preventDefault();  // without this the browser rejects the drop and no drop event fires
    event.dataTransfer.dropEffect = 'move';
  };

  const onDragLeave: DragEventHandler<HTMLDivElement> = (event) => {
    if (!canDropLinkInFolder(event.dataTransfer, folder.id)) {
      return;
    }
    dragEnterCount.current -= 1;
    if (dragEnterCount.current <= 0) {
      clearDropState();
    }
  };

  const onDrop: DragEventHandler<HTMLDivElement> = (event) => {
    if (!canDropLinkInFolder(event.dataTransfer, folder.id)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const linkId = readDraggedLinkId(event.dataTransfer);
    clearDropState();
    if (linkId !== null) {
      onMoveLink(linkId, folder.id);
    }
  };

  return (
    <div className="mb-2">
      <div
        className={`flex items-center p-2 rounded-md cursor-pointer relative group transition-colors duration-200 ${isDropTarget ? 'bg-surface-hover ring-2 ring-inset ring-primary' : 'bg-surface hover:bg-surface-hover'}`}
        onClick={() => toggleFolder(folder.id)}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          backgroundImage: `linear-gradient(to right, ${headerTint} 0%, transparent 25%)`,
        }}
      >
        {folder.icon && (
          <FolderIcon
            icon={folder.icon}
            weight={(folder.iconWeight || "regular") as IconWeight}
            isOpen={isOpen}
            size={20}
            color={iconColor}
            className={iconClass}
          />
        ) ||
          <FallbackIcon isOpen={isOpen} />
        }

        <span className="flex-grow text-sm truncate">{folder.name}</span>
        <ChevronRight
          size={20}
          className={`text-muted transform transition-transform ${isOpen ? 'rotate-90' : ''}`}
        />
        {canShowOverlayButtons && (
          <div className='absolute top-0 right-[20px] z-10 h-full flex mr-4'>
            <div className='m-auto space-x-2'>
              <button
                className="text-muted bg-base-300/90 hover:text-success opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                title="Open all links in a new window"
                onClick={(e) => {
                  e.stopPropagation();
                  const count = links?.length ?? 0;
                  if (count > 0 && count <= OPEN_ALL_CONFIRM_THRESHOLD) {
                    openAllInFolder(folder.id);
                    return;
                  }
                  setShowConfirmOpenAll(true);
                }}
              >
                <FolderOutput size={20} />
              </button>
              <button
                className="text-muted bg-base-300/90 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                title="Edit folder"
                onClick={(e) => {
                  e.stopPropagation();
                  showEditFolderModal(folder);
                }}
              >
                <Edit3 size={20} />
              </button>
              <button
                className="text-muted bg-base-300/90 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                title="Delete folder"
                onClick={(e) => {
                  e.stopPropagation();
                  showDeleteFolderModal(folder);
                }}
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        )}
        {showConfirmOpenAll && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-surface/95 rounded-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center text-xs">
              <span className="mr-2">
                {links
                  ? `Open ${links.length} link${links.length === 1 ? '' : 's'} in a new window?`
                  : 'Open all links in a new window?'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openAllInFolder(folder.id);
                  setShowConfirmOpenAll(false);
                }}
                className="px-2 py-1 bg-primary text-primary-content rounded-md mr-2 hover:bg-primary-hover"
              >
                Open
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowConfirmOpenAll(false);
                }}
                className="px-2 py-1 rounded-md bg-base-300 text-base-content hover:bg-surface-hover"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      {isOpen && (
        <div className="ml-4 mt-2">
          {subFolders.map(renderFolder)}
          {sortedLinks.map((link) => (
            <LinkItem
              key={link.id}
              link={link}
              refreshData={() => loadLinksForFolder(folder.id)}
              showEditLinkModal = {showEditLinkModal}
              canShowOverlayButtons = {canShowOverlayButtons}
              openLinksInNewTab = {openLinksInNewTab}
              draggable
            />
          ))}
        </div>
      )}
    </div>
  );
};
