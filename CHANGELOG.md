# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).


## [Unreleased]


## [1.1.2] - 2026-09-21

### Added

- **Open all links for a tag**: in Tags browse mode, drilling into a tag shows an
  "open all in a new window" action on the tag header (same `windows.create` path
  folders already use). Uses the cached links for that tag.

- **Folder sort "None"**: Sort Folders can now leave the order returned by
  Linkwarden instead of re-sorting by name or date. That order is the web app's
  sidebar (`collectionOrder`), so a custom sequence like "work, fun, important"
  no longer needs numeric prefixes. Existing installs stay on Name Ascending.

### Changed

- **Open-all confirm only for larger batches**: folders and tags open immediately
  when there are 10 or fewer links; above that the confirm step still asks, and
  now shows the link count.


## [1.1.1] - 2026-08-04

Version bump for the Chrome Web Store upload: the 1.1.0 package number was
consumed by the rejected first upload (manifest paths carried a `./` prefix the
store's package validator does not resolve) and the store will not accept a
replacement at the same version. Identical code to 1.1.0.

## [1.1.0] - 2026-08-04

### Added

- **Resizable popup**: drag the grip in the popup's bottom-left corner to make it
  wider/taller, up to 800x600 — measured as Chromium's hard ceiling for an
  extension popup, which grants exactly that and refuses a larger document —
  double-click the grip to reset. The size is remembered between openings (applied
  before first paint, so the popup never opens at one size and jumps to another),
  and the folder/tag list fills whatever height is set instead of a fixed 384px.
  The size is set on the document element itself, since that is what the browser
  derives the popup window's size from, and it is re-sent once the drag releases —
  Chromium grows a popup window immediately but can skip a shrink that happened
  while the drag still held pointer capture, leaving dead space until reopening.
- **Drag & drop links between folders**: links in the folder tree can be dragged
  onto any other folder row to move them there. The hovered folder highlights,
  a closed folder springs open after a short hover so subfolders can be reached
  in one gesture, and the source folder is never offered as a target. The move
  is applied to the local cache immediately and rolled back (with the server's
  error message) if the API call fails.
- **Tags browse mode** in the popup: a Folders | Tags segmented control switches
  the main pane between the collection tree and a multi-column tag card grid
  (name, latest link date, link count). Click a tag to drill into its links;
  compact “Filter tags…” supports multi-term OR match (space/comma). Browse mode
  is persisted in storage.
- **Path-aware folder create**: names containing `/` (e.g. `AI/analysis`) are
  split into segments and find-or-created under the chosen parent, so an existing
  `AI` folder is reused instead of creating a literal `AI/analysis` collection.
  Hint text in Add Folder; creatable folder picker labels path creates clearly.
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
  without first opening the Add Folder flow. Paths with `/` work here too.


### Changed

- **Host access is no longer requested at install (Chrome)**: the manifest declares
  `optional_host_permissions` instead of `host_permissions`, so a fresh install
  carries no "read and change all your data on all websites" warning. Saving the
  host in Options requests access to that one origin (and drops the previous one
  when the host changes); the popup offers a "Grant access" screen if it is ever
  missing, and the background worker — which has no user gesture to request with —
  returns an actionable error naming the origin instead of a bare network failure.
  Firefox keeps `<all_urls>` in `permissions` (granted at install, as MV2 does),
  so both browsers run the same code path.
- An open folder now auto-fetches its links only when it has **never** been
  cached, instead of whenever its cached list is empty. The old rule re-fetched
  a folder the moment its last link was removed, which raced an in-flight move
  and read the pre-move state back in (the moved link reappeared in its old
  folder); it also re-fetched empty folders redundantly.
- **Rebranded** to **Linkwarden Manager (Unofficial)** (`package.json` name/
  longName/description, Options title, manifest `homepage_url` →
  [matthew-b-payne/linkwarden-manager](https://github.com/matthew-b-payne/linkwarden-manager)).
- **Linkwarden-aligned theme tokens**: CSS variables + Tailwind `@theme` for
  primary/surfaces/muted/danger (sky primary `#0369a1` / `#7dd3fc`, charcoal
  dark bases). UI components use semantic classes instead of paired
  `gray-*`/`blue-*` + `dark:` utilities. System light/dark via
  `prefers-color-scheme`.
- Removed `@mui/material` / Emotion; unconfigured and toolbar actions use the
  same Tailwind buttons as the rest of the popup.
- Folder row color wash fades to `transparent` (was hard-coded white fade,
  wrong in dark mode).
- README rewritten with official-extension comparison, feature pitch, install
  steps, disclaimer, and screenshot gallery (`docs/*.png`).
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

- White bar beside the popup UI. Only the app root painted a background and
  `color-scheme` was never declared, so the link list's native scrollbar rendered
  light against the dark theme, and any area the root didn't cover fell through
  to the browser's white canvas — most visible after shrinking the popup, since
  Chrome keeps the larger popup window until it is next opened. `html`/`body` now
  carry the theme background and the pages declare `color-scheme: light`/`dark`.
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

### Removed

- Dead manifest surface ahead of the Chrome Web Store listing: the `webRequest`
  permission (declared since the fork, never used by any code path), the
  `web_accessible_resources` block that exposed every built bundle to every
  http(s) page (left over from the content script removed in 1.0.3), and the
  `refresh_extension` command, which bound `Ctrl+Space` but had no
  `commands.onCommand` handler. Firefox's redundant `http://*/*` +
  `https://*/*` entries are dropped in favour of the `<all_urls>` it already
  requested.

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
