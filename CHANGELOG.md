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
