# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Save all tabs in the current window as a session: a new toolbar button
  captures every http(s) tab and saves them, optionally into a new collection
  nested under a "Sessions" folder (or an existing folder), with tags applied
  to all. Links are created sequentially (avoiding server-side races on a
  shared new tag) with a retry, best-effort so one failed tab doesn't abort
  the batch.
- Restore a session: an "open all links in a new window" action on each folder
  reopens its links as a fresh window (`windows.create`), with a confirmation.
- Keyboard shortcut (`Ctrl+Shift+S` / `Command+Shift+S`, rebindable via each
  browser's shortcut settings — linked from the Options page) to save the
  current tab: opens the popup with the Add Link modal pre-filled with the
  active tab's URL/title (`action.openPopup()` on Chrome,
  `browserAction.openPopup()` on Firefox) rather than saving silently, so the
  folder and tags can still be picked before it's saved.
- Searchable folder pickers: the parent folder field in Add/Edit Folder and
  the destination folder field in Add/Edit Link now filter by typing part of
  a folder's name instead of scrolling a plain dropdown.
- "Already saved" indicator: the toolbar icon badges (with a tooltip) when the
  active tab's URL is already saved, without needing to open the popup,
  matched against the same locally-cached link list the popup uses (no extra
  API calls). A background refresh (`chrome.alarms`, interval configurable in
  Options, default 10 minutes) keeps the cache current even if the popup is
  never opened; the indicator and its refresh frequency can both be turned
  off in Options.
- Optional notes (description) field when adding/editing a link: appears after
  tags in the dialog, saved via the Linkwarden API's `description` field (max
  2048 chars, trimmed) and preserved on edit; empty omits it from the payload.
- Create a new folder directly from the Add/Edit Link dialog: type a name that
  doesn't exist in the folder picker and select "Create "name"" — the folder
  is created at root and immediately selected, so the link can be saved
  without first opening the Add Folder flow.

### Changed

- Popup bundle size reduced from ~5MB to ~470KB by lazy-loading phosphor
  folder icons per-name (`import.meta.glob`) instead of importing the entire
  `@phosphor-icons/react` package.
- Folder tree construction changed from an O(n²) filter-per-node pattern to a
  single O(n) `parentId` → children map.
- `fetchAllLinksFromAllFolders` now does a single unscoped, cursor-paginated
  call to `/api/v1/search` instead of fanning out one paginated request chain
  per folder in parallel, reducing load on self-hosted Linkwarden instances.
- The popup's 60s auto-refresh interval now skips ticks while a fetch is
  already in flight or the popup isn't visible.
- Add/Edit Link's folder picker now shows the link's current folder pinned to
  the top of the list instead of wherever it falls alphabetically.
- Add/Edit Link folder picker uses CreatableSelect when a new folder name is
  typed, showing an inline "Create" action.

### Fixed

- Fetching links and tags surfaced `undefined` instead of the real Linkwarden
  error (e.g. an invalid API token) on failure, because the cursor-paginated
  `/api/v1/search` and `/api/v1/tags` error paths read the wrong response
  field (`data.data` instead of `data.response`).
- The folder picker's currently-selected value had no dark-mode text color
  rule (`react-select`'s `__single-value` part was never styled, since the
  only prior `react-select` usage was multi-select), rendering it almost
  invisible against the dark theme.
- Selecting a folder in Add/Edit Link or Add/Edit Folder (by click or by
  filtering and pressing Enter) could visibly show the wrong folder — always
  falling back to whichever sorted first alphabetically — because the
  selected id was stored as a string while the picker's options compared it
  against a number, so the equality check never matched.
- Filtering a folder/tag picker and pressing Enter before it had settled on a
  highlighted option could submit the whole form early with the stale
  pre-selection value, because `react-select` doesn't call
  `preventDefault()` on Enter when no option is focused yet, letting the
  keypress fall through to the browser's native "submit the enclosing form"
  behavior.

## [1.0.5] - 2026-05-04

### Fixed

- Fixed call to fetch tags; use `/search` instead of the deprecated `/links`
  endpoint.

## [1.0.4] - 2025-07-17

### Fixed

- Don't send cookies in API calls to avoid potential problems.
- Fixed text size of tag select box in Firefox.

## [1.0.3] - 2025-06-28

### Removed

- Removed content script that was injected into every visited page.
