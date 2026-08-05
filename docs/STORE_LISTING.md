# Chrome Web Store submission — Linkwarden Manager (Unofficial)

Everything the Developer Dashboard asks for, prepared. Package: `extension.zip`
(built with `TARGET_BROWSER=CHROME yarn build`).

## One-time setup

1. Register at <https://chrome.google.com/webstore/devconsole> and pay the **$5
   one-time developer fee** (nothing can be published before this clears).
2. Verify a contact email on the account (required for a public listing).
3. Push `main` + the release tag so the URLs below resolve publicly.

## Package facts (from `dist/manifest.json`)

| Field | Value |
| --- | --- |
| Name | Linkwarden Manager (Unofficial) |
| Version | 1.1.0 |
| Manifest | v3 |
| Permissions | `storage`, `alarms`, `tabs`, `activeTab` |
| Host permissions | `*://*/*` |
| Content scripts | none |
| Remote code | none (no `eval`, no CDN scripts; all JS is bundled) |

## Listing copy

**Category:** Productivity
**Language:** English (United States)

**Short description** (≤132 chars):

> Browse, search and save to your self-hosted Linkwarden library from the toolbar. Unofficial — not affiliated with Linkwarden.

**Detailed description:**

> Linkwarden Manager is an unofficial client for Linkwarden, the self-hosted
> bookmark manager. Point it at your own instance with an API token and manage
> your library from the toolbar without opening the web app.
>
> Features
> - Browse your collection tree, or switch to a tag grid and drill into a tag's links
> - Full-text search across your library
> - Save the current tab (Ctrl+Shift+S) with folder, tags and notes before it's saved
> - Save every tab in the window as a session, optionally into a new dated collection
> - Reopen a collection as a fresh window to restore a session
> - Drag links between collections; create nested collections by typing `AI/analysis`
> - Edit and delete links and collections
> - "Already saved" badge on the toolbar icon for the page you're on
> - Light/dark theme following your system, resizable popup
>
> Requires your own Linkwarden instance (self-hosted or cloud) and an API token
> from Settings → Access Tokens. No account with the extension, no analytics, no
> telemetry, no backend of its own.
>
> Unofficial project, not affiliated with or endorsed by Linkwarden.
> Source: https://github.com/matthew-b-payne/linkwarden-manager

**Homepage URL:** `https://github.com/matthew-b-payne/linkwarden-manager`
**Support URL:** `https://github.com/matthew-b-payne/linkwarden-manager/issues`
**Privacy policy URL:** `https://github.com/matthew-b-payne/linkwarden-manager/blob/main/PRIVACY.md`

## Single purpose

> Manage a user's own Linkwarden bookmark library: view, search, add, edit, move
> and delete links and collections on the Linkwarden instance the user
> configures.

## Permission justifications

- **storage** — Persist the user's Linkwarden host and API token, their display
  preferences, and a local cache of collections/links/tags so the popup opens
  without waiting on the network.
- **activeTab** — Read the URL and title of the current tab when the user saves it
  as a link, and to decide whether the toolbar badge should mark it as already
  saved.
- **tabs** — "Save all tabs as a session" needs the URL and title of each tab in
  the current window, and restoring a session opens a collection's links as a new
  window.
- **alarms** — Refresh the cached link list on an interval (default 10 minutes,
  configurable and disableable) so the "already saved" badge is accurate without
  the popup being opened.
- **Host permission `*://*/*`** — A Linkwarden instance is self-hosted at an
  address only the user knows, entered on the Options page, so the origin cannot
  be declared ahead of time. It is used exclusively for `fetch` calls to that
  configured host's `/api/v1/*` endpoints. The extension registers no content
  scripts and never reads page content.

## Data usage disclosure

Declare **collected**:
- *Authentication information* — the Linkwarden API token the user supplies (stored
  locally, sent only to their host).
- *Web history* — URLs/titles of tabs the user chooses to save, and the cached
  list of their saved links used for the "already saved" badge (stored locally,
  sent only to their host).

Certify all three:
- not sold to third parties,
- not used or transferred for purposes unrelated to the single purpose,
- not used or transferred to determine creditworthiness or for lending.

Note when asked about third-party transfer: link rows load favicons from
`https://icons.duckduckgo.com/ip3/<hostname>.ico`, which reveals link *hostnames*
to DuckDuckGo. Disclosed in `PRIVACY.md`.

## Graphics

| Asset | Requirement | Status |
| --- | --- | --- |
| Store icon | 128x128 PNG | `src/assets/icon-128.png` |
| Screenshots | 1-5, **1280x800 or 640x400** PNG/JPEG, no alpha | must be recaptured — see below |
| Small promo tile | 440x280, optional (needed for featuring) | not made |

The `docs/*.png` shots are README-grade only: they include the browser's tab strip
with personal tabs, other installed extensions, and clipped popup edges. Recapture
the popup alone (553x570 or larger, 2x scale), then pad each to the store canvas:

```bash
magick shot.png -resize 'x720>' -background '#101014' -gravity center -extent 1280x800 -alpha off store-shot.png
```

Suggested set: folder tree with a folder expanded, tag grid, Add Link dialog,
Save-all-tabs dialog, Options page (host field redacted).

## Review expectations

- Broad host access plus a "read your data on all websites" install warning puts
  the item into the slower manual-review queue; a few days is normal, longer is
  possible. The alternative is `optional_host_permissions` + a runtime
  `chrome.permissions.request` when the host is saved in Options — a code change,
  not a listing change.
- The name contains a third party's trademark. "(Unofficial)", the disclaimer in
  both descriptions, and the absence of Linkwarden's logo in the icon are the
  mitigations; a rename may still be demanded.
- Set visibility to **Unlisted** for the first submission if you want the review
  to pass before the listing is discoverable.

## Publish

1. `TARGET_BROWSER=CHROME yarn build` → `extension.zip`
2. Dashboard → Items → *Add new item* → upload `extension.zip`
3. Fill Store listing / Privacy / Distribution from this file, Save draft
4. *Submit for review*
5. On approval, tag the release on GitHub and attach `extension.zip`

Subsequent releases: bump `version` in `package.json` (Chrome rejects a re-upload
of an existing version), rebuild, upload as a new package version.
