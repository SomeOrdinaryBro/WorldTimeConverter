# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

No build step. Open `index.html` directly in a browser:

```
start index.html          # Windows
open index.html           # macOS
```

Or serve it with any static server to use deep-link URLs properly:

```
npx serve .
python -m http.server 8080
```

There are no dependencies, package managers, or test suites.

## Architecture

This is a zero-dependency, vanilla JS single-page app. Four files, each with a distinct role:

| File | Role |
|------|------|
| `index.html` | Static shell — layout, aria labels, script/style tags. No logic. |
| `app.js` | All application logic (state, rendering, URL sync, event handling). |
| `style.css` | Dark-theme design system via CSS custom properties (`--accent`, `--card-bg`, etc.). |
| `manifest.json` | PWA manifest for installability. |

### State model (`app.js`)

A single `state` object drives everything:

```js
{ direction: 'lk-to-atl' | 'atl-to-lk', date: 'YYYY-MM-DD', time: 'HH:MM', format: '12' | '24' }
```

The flow is: **event → mutate `state` → `render()`**. `render()` is the only place DOM is written (except live clocks, which use `tick()` on a 1-second interval).

### URL deep linking

`readURL()` on init reads `?dir=&date=&time=&fmt=` from the query string into `state`. `updateURL()` is called at the end of every `render()` via `history.replaceState` — no page reloads. The "Copy Link" button copies `window.location.href` after state is already reflected in the URL.

### Timezone conversion

DST-aware conversion is done entirely with the browser's `Intl` API — no third-party library. The key function is `timestampFromWall(timeZone, y, m, d, H, M)`, which converts a wall-clock time in a given zone to a UTC timestamp by:
1. Treating the input as a pretend-UTC moment
2. Looking up the actual UTC offset for that timezone at that moment via `getOffsetMinutes()`
3. Subtracting the offset to get the true UTC ms

This handles DST edge cases (e.g. Atlanta switching EST↔EDT) without any library. Sri Lanka (`Asia/Colombo`, UTC+05:30) has no DST.

### Fixed city pair

The two cities are hardcoded as constants `Z_LK = 'Asia/Colombo'` and `Z_ATL = 'America/New_York'`. The swap button (`#swap-btn`) flips `state.direction` and resets to now — it does not swap the result back into the input.
