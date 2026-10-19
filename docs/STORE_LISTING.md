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
| Version | 1.1.3 |
| Manifest | v3 |
| Permissions | `storage`, `alarms`, `tabs`, `activeTab`, `windows` |
| Host permissions | none declared; `optional_host_permissions: *://*/*`, requested at runtime for the single origin the user configures |
| Content scripts | none |
| Remote code | none (no `eval`, no CDN scripts; all JS is bundled) |

## Listing copy

**Category:** Productivity
**Language:** English (United States)

**Short description** (≤132 chars — shown in search results, so it carries value, not
the disclaimer; "(Unofficial)" in the item name plus the disclaimer in the detailed
description are the trademark mitigation):

> Browse, search and manage your self-hosted Linkwarden library from the toolbar — not just save to it. Unofficial client.

The dashboard prefills this field from the packaged manifest description ("Browse,
search and save to your self-hosted Linkwarden library from the toolbar. Unofficial —
not affiliated with Linkwarden."). Overwrite it with the line above; the manifest text
is deliberately left alone so the shipped package does not have to be rebuilt and
re-versioned for listing copy.

**Detailed description:**

> Your Linkwarden library in a popup — not just a save button.
>
> The official extension's popup is an "Add Link" form for the page you are on: great for
> capturing, but to find something you already saved you go to the web app. This one is
> built for everything after the save — your collections, tags and links, one click from
> the toolbar. The two work side by side; only the official one does screenshot archiving
> and browser-bookmark sync.
>
> You need your own Linkwarden instance — self-hosted or Linkwarden Cloud — and an
> API token. This is a client for it, not a bookmark service of its own.
>
> WHAT YOU CAN DO WITHOUT LEAVING THE PAGE
>
> • Browse the full collection tree — expand and collapse, with the icons and colours
>   you set on your collections in Linkwarden
> • Switch to tag view: a grid of every tag with its link count and latest activity;
>   click one to drill into its links
> • Search titles, URLs, notes and tag names across the whole library from the popup
> • Save the current tab with Ctrl+Shift+S — the popup opens pre-filled, so you still
>   pick the collection, tags and notes before anything is saved
> • Know whether the page you are on is already saved: the toolbar icon badges it,
>   kept current by a background refresh you can tune or turn off
> • Move a link by dragging it onto another collection — hover a closed collection and
>   it springs open, so a nested target takes one gesture
> • Create nested collections by typing a path: "Dev/Rust" reuses your existing "Dev"
>   and creates "Rust" inside it
> • Edit and delete links and collections in place — title, URL, collection, tags, notes
> • Save every tab in the window as a session: into a new dated collection nested under
>   "Sessions", or any collection you choose, with tags applied to all of them
> • Reopen a collection as a fresh window when you want that session back
> • Resize the popup to the size you actually want and it stays there; light, dark or
>   follow the system, in Linkwarden's own seven accent colours
>
> SET UP ONCE
>
> Open Options, enter your instance's address and an API token (in Linkwarden:
> Settings → Access Tokens). Chrome then asks for access to that one address and
> nothing else — the extension ships with no site access at all.
>
> NO ACCOUNT, NO TRACKING
>
> There is no account with this extension, no analytics, no telemetry and no server of
> its own. It talks to your instance and nowhere else. (Site icons beside links are
> fetched from DuckDuckGo, which is disclosed in the privacy policy.)
>
> Unofficial project — not affiliated with, endorsed by, or supported by Linkwarden.
> Open source: https://github.com/matthew-b-payne/linkwarden-manager

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

| File | Caption baked in | Shows |
| --- | --- | --- |
| `01-folder-tree.png` | Your whole collection tree, one click from the toolbar | Nested tree, per-collection icons/colours, links with favicons, tags and URLs |
| `02-tags.png` | Every tag with its link count and latest activity | Tag card grid, tag filter |
| `03-add-link.png` | Save with collection, tags and notes — Ctrl+Shift+S | Add Link dialog: URL, title, searchable folder picker, multi-tag, notes |
| `04-save-session.png` | Save every open tab as a session you can reopen | Save-all-tabs dialog: new session folder, nest under Sessions, tags |
| `05-options.png` | Point it at your own instance, themed like the web app | Options: host, masked token, appearance + seven accents, sort, badge refresh |

The captions are rendered into the canvas (Chrome shows no caption field), so the
screenshots read as a story rather than five popup pictures.

They were captured from the real extension driven headless against a **throwaway
Linkwarden API stub with demo data** — the product exactly as it runs, with no
personal bookmarks, hosts or tokens in frame, and no browser chrome. To redo them
after a UI change: capture the popup page at 560x600 (Options at 620x700) with
`deviceScaleFactor: 2`, then pad each onto the store canvas:

```bash
magick shot.png -resize 'x736>' -background '#101014' -gravity center -extent 1280x800 -alpha off store-shot.png
```

Captions are drawn with Noto Sans at 34px semibold, `#e2e8f0`, centred in a 44px band
at the top of the canvas; the shot is capped at 680px tall beneath it.

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
