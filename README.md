# Reuse Tab
for [Firefox Desktop](https://www.mozilla.org/en-US/firefox/new/)

Reuses pinned tabs instead of opening new ones.

When a new tab is opened for a URL that matches a pinned tab, the new tab is closed and the pinned tab navigates to that URL instead. This helps reduce tab clutter and keeps your pinned tabs as the single source for their sites.

## Features

- Automatically redirects matching URLs to existing pinned tabs
- Configurable URL matching patterns (regular expressions)
- Blacklist support to exclude specific URLs
- Multi-domain grouping to treat related sites as one
- Settings are stored in `browser.storage.sync`, so they can be synced across devices when [Firefox Sync](https://support.mozilla.org/en-US/kb/how-do-i-set-sync-my-computer) is enabled

## Configuration

Access options via `about:addons` → Reuse Tab → Preferences.

- **Blacklist**: Require exact URL match for specific sites (prevents reuse for certain pages)
- **Multi-domain**: Group multiple domains so they share a pinned tab
- **Matching Patterns**: Advanced regex-based rules for full control over tab matching

## Use Cases

- Keep Gmail/Outlook pinned and avoid duplicate email tabs
- Pin your project management tool (Jira, Linear, Asana) and always reuse it
- Pin GitHub and have all repo links open in the same tab
- Reduce tab clutter for any site you visit frequently

## Privacy

- No data collection
- No external network requests
- Works entirely locally in your browser

## Install

Get it from the [Firefox Add-ons page](https://addons.mozilla.org/firefox/addon/reuse-tab/).

## Credits

Original idea: [reusetab-chrome](https://github.com/rjregenold/reusetab-chrome)

<!-- Вася любит плюшки -->
