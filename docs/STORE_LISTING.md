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
| Host permissions | none declared; `optional_host_permissions: *://*/*`, requested at runtime for the single origin the user configures |
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
- **Optional host permission `*://*/*`** — A Linkwarden instance is self-hosted at
  an address only the user knows, entered on the Options page, so the origin
  cannot be declared ahead of time. It is declared as `optional_host_permissions`
  and never granted at install: when the user saves their host, the extension calls
  `chrome.permissions.request` for that single origin (e.g.
  `https://linkwarden.example.com/*`) and nothing else, and drops the previous
  origin if the host is changed. It is used exclusively for `fetch` calls to that
  host's `/api/v1/*` endpoints. The extension registers no content scripts and
  never reads page content.

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
| Screenshots | 1-5, **1280x800 or 640x400** PNG/JPEG, no alpha | `docs/store/0*.png` — 5 shots, 1280x800, RGB |
| Small promo tile | 440x280, shown in store tiles | `docs/store/promo-small-440x280.png` |
| Marquee promo tile | 1400x560, needed for featuring | `docs/store/promo-marquee-1400x560.png` |

Upload `docs/store/` in order:

| File | Shows |
| --- | --- |
| `01-folder-tree.png` | Nested collection tree, per-collection icons/colours, links with favicons, tags and URLs |
| `02-tags.png` | Tag card grid with latest date and link count, tag filter |
| `03-add-link.png` | Add Link dialog: URL, title, searchable folder picker, multi-tag, notes |
| `04-save-session.png` | Save-all-tabs dialog: new session folder, nest under Sessions, tags |
| `05-options.png` | Options: host, masked token, appearance + seven accents, sort, badge refresh |

They were captured from the real extension driven headless against a **throwaway
Linkwarden API stub with demo data** — the product exactly as it runs, with no
personal bookmarks, hosts or tokens in frame, and no browser chrome. To redo them
after a UI change: capture the popup page at 560x600 (Options at 620x700) with
`deviceScaleFactor: 2`, then pad each onto the store canvas:

```bash
magick shot.png -resize 'x736>' -background '#101014' -gravity center -extent 1280x800 -alpha off store-shot.png
```

Both promo tiles are HTML/CSS rendered at exact size in Chromium (sources
regenerable from the icon plus the `01` popup capture): icon, wordmark, one-line
pitch, "Unofficial" chip on the theme's charcoal/sky gradient. No Linkwarden logo
or wordmark styling is reused.

## Additional fields

| Field | Value |
| --- | --- |
| Official URL | **None** — this needs a domain verified in Google Search Console; a GitHub repo cannot be verified, and leaving it None costs nothing |
| Homepage URL | `https://github.com/matthew-b-payne/linkwarden-manager` |
| Support URL | `https://github.com/matthew-b-payne/linkwarden-manager/issues` |
| Mature content | No |

## Review expectations

- Host access is optional and requested at runtime, so the item carries no "read
  and change all your data on all websites" install warning and should avoid the
  broad-host-permission in-depth review the dashboard warns about. Keep it that
  way: adding a `host_permissions` entry later puts the item straight back into
  that queue.
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
