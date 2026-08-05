# Privacy Policy — Linkwarden Manager (Unofficial)

Last updated: 2026-08-04

Linkwarden Manager is an unofficial browser extension for [Linkwarden](https://linkwarden.app).
It is not affiliated with Linkwarden.

## Summary

The extension has no backend. There is no account, no analytics, no telemetry, no
advertising, and no data sold or shared with anyone. Everything it stores stays in
your browser profile, and the only server it talks to about your bookmarks is the
Linkwarden instance whose address you enter yourself.

## What is stored locally

All of the following lives in the browser's extension storage
(`chrome.storage.local`) on your machine, and is removed when you uninstall the
extension:

- **Linkwarden host URL** and **API token** — the credentials you enter on the
  Options page. The token is stored as you supply it, so that requests can be
  authenticated; it is never sent anywhere except to your own host.
- **Cached library data** — collections, links (URL, title, notes, tags, dates)
  and tags fetched from your instance, plus the timestamp of the last refresh.
  The cache exists so the popup opens instantly and so the "already saved" badge
  can be evaluated without extra API calls.
- **Preferences** — sort orders, open-in-new-tab, theme, popup size, browse mode
  (folders/tags), whether the "already saved" badge is enabled and how often it
  refreshes, and a transient flag used to hand the "save current tab" keyboard
  shortcut over to the popup.

None of it is transmitted to the author of this extension.

## What is sent off your machine

- **Your Linkwarden instance.** Requests go to `<your host>/api/v1/...` with your
  API token in an `Authorization` header, to read collections/links/tags and to
  create, edit, move or delete them at your request.
- **The URL and title of the current tab**, and — when you use "save all tabs as
  a session" — of the tabs in the current window. These are sent only to your
  Linkwarden instance, only when you save them.
- **Favicons via DuckDuckGo.** Link rows load a site icon from
  `https://icons.duckduckgo.com/ip3/<hostname>.ico`. This discloses the *hostname*
  of links shown in the popup to DuckDuckGo (no URL path, no title, no token).
  See DuckDuckGo's [privacy policy](https://duckduckgo.com/privacy).

## Permissions and why they are requested

| Permission | Why |
| --- | --- |
| `storage` | Store the settings and the local cache described above. |
| `activeTab` | Read the current tab's URL and title when you save it. |
| `tabs` | Read URLs/titles of the tabs in the current window for "save all tabs as a session", and reopen a collection's links as a new window. |
| `alarms` | Periodically refresh the cached link list so the "already saved" badge stays accurate. Configurable, and disableable, in Options. |
| Host access (`*://*/*`) | A self-hosted Linkwarden instance can be at any address, and the extension cannot know it before you enter it. The permission is used only to call the host you configure. No content script is injected into any page and no page content is read. |

## Data retention and removal

Clearing the extension's data (Chrome: `chrome://extensions` → Details → Site
settings / remove extension) or uninstalling it deletes everything listed above.
Deleting your API token in Options and saving removes the credential immediately.

## Contact

Issues and questions: <https://github.com/matthew-b-payne/linkwarden-manager/issues>
