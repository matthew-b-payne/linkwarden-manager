import { Link } from './interfaces';

// Drag payloads use a custom MIME type so drop targets can tell an internal link drag apart
// from anything else the user might drag in (files, selected text, a tab). During `dragover`
// only the *type list* is readable — never the values — so the source folder id is encoded
// into the type itself. That is what lets a folder decide, while the drag is still in flight,
// whether it is a legal target (i.e. not the folder the link already lives in).
const LINK_DRAG_PREFIX = 'application/x-linkwarden-link+';

export function setLinkDragData(dataTransfer: DataTransfer, link: Link) {
  dataTransfer.setData(`${LINK_DRAG_PREFIX}${link.folder.id}`, String(link.id));
  dataTransfer.setData('text/plain', link.url);
  dataTransfer.effectAllowed = 'move';
}

function findLinkDragType(dataTransfer: DataTransfer | null): string | null {
  if (!dataTransfer) {
    return null;
  }
  for (const type of dataTransfer.types) {
    if (type.startsWith(LINK_DRAG_PREFIX)) {
      return type;
    }
  }
  return null;
}

// null when this isn't one of our link drags at all
export function getLinkDragSourceFolderId(dataTransfer: DataTransfer | null): number | null {
  const type = findLinkDragType(dataTransfer);
  if (!type) {
    return null;
  }
  const id = Number(type.slice(LINK_DRAG_PREFIX.length));
  return Number.isFinite(id) ? id : null;
}

export function canDropLinkInFolder(dataTransfer: DataTransfer | null, folderId: number): boolean {
  const sourceFolderId = getLinkDragSourceFolderId(dataTransfer);
  return sourceFolderId !== null && sourceFolderId !== folderId;
}

export function readDraggedLinkId(dataTransfer: DataTransfer | null): number | null {
  const type = findLinkDragType(dataTransfer);
  if (!type || !dataTransfer) {
    return null;
  }
  const id = Number(dataTransfer.getData(type));
  return Number.isFinite(id) && id > 0 ? id : null;
}
