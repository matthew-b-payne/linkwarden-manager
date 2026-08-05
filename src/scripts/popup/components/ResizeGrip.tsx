import React, { useRef } from 'react';
import { clampPopupSize, DEFAULT_POPUP_SIZE, PopupSize } from '../popupSize';

interface Props {
  size: PopupSize;
  onResize: (size: PopupSize) => void;
  onCommit: (size: PopupSize) => void;
}

// Sits in the bottom-left corner because that is the popup's free corner: the browser anchors the
// popup under the toolbar icon, so it grows leftwards and downwards. Positioned against the
// viewport rather than the document, so it stays reachable when a short screen forces the browser
// to grant a window smaller than the requested size and the document scrolls.
export const ResizeGrip = ({ size, onResize, onCommit }: Props) => {
  const dragged = useRef<PopupSize | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragged.current = { ...size };
    document.body.style.userSelect = 'none';
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragged.current) {
      return;
    }
    // movementX/Y is raw pointer movement. Client coordinates can't be used: every size change
    // re-anchors the popup, shifting the viewport under the cursor, which would feed the previous
    // growth back into the next delta and run away.
    const next = clampPopupSize({
      width: dragged.current.width - event.movementX,
      height: dragged.current.height + event.movementY,
    });
    dragged.current = next;
    onResize(next);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragged.current) {
      return;
    }
    const final = dragged.current;
    dragged.current = null;
    document.body.style.userSelect = '';
    event.currentTarget.releasePointerCapture(event.pointerId);
    onCommit(final);
  };

  return (
    <div
      className="fixed bottom-0 left-0 p-1 cursor-nesw-resize text-muted hover:text-base-content touch-none"
      title="Drag to resize · double-click to reset · shrinking takes full effect next time the popup opens"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => onCommit(DEFAULT_POPUP_SIZE)}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M1 7 L7 13" />
        <path d="M1 11 L3 13" />
      </svg>
    </div>
  );
};
