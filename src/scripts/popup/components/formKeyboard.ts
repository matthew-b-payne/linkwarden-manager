import React from 'react';

// react-select's own Enter handling only calls preventDefault() when it has a currently
// *focused* option (see its internal `case 'Enter': if (!focusedOption) return;`) — if the
// user's keystroke hasn't settled a focused option yet (e.g. right after typing a filter),
// Enter falls through uncaught to the browser's native "submit the enclosing form" action,
// submitting whatever *stale* value the field held before, not what's typed/highlighted.
//
// Fix at the form level rather than passing onKeyDown to <Select>: react-select's own onKeyDown
// prop is checked for `event.defaultPrevented` *before* its Enter-handling switch runs, so
// preventing default there would also suppress the working case (a real focused option).
// Blocking here instead only engages while a menu is actually open (a closed, already-filled
// select still submits normally on Enter) and never interferes with react-select's own handling,
// since preventDefault() doesn't stop propagation — it still already ran by the time this fires.
export function preventEnterSubmitFromOpenSelect(e: React.KeyboardEvent<HTMLFormElement>) {
  if (e.key === 'Enter' && document.querySelector('.custom-react-select__menu')) {
    e.preventDefault();
  }
}
