# Ox Browser (Desktop)

A simple desktop web browser built with Electron (uses the same Chromium engine as Google Chrome). Tabs, address bar, back/forward, bookmarks, browsing history, private/incognito tabs, a downloads manager, and a settings screen (homepage + default search engine + light/dark/system theme).

## Features

- **Tabs** — open multiple tabs, switch and close them
- **Private tabs** (🕵 button) — each gets its own non-persistent, in-memory browsing session (separate cookies/storage that vanish when the tab closes); pages visited in them are never added to history
- **History** — every visited page (non-private) is logged to disk; click an entry to reopen it, or clear it all — from the ☰ menu
- **Downloads** — any file a webview downloads is saved straight to your OS Downloads folder and logged in the in-app Downloads panel, live-updating as it completes
- **Bookmarks** — star any page, browse them from the ☰ menu
- **Settings** — set a custom homepage, pick a default search engine (Google/Bing/DuckDuckGo), and choose Light/Dark/Follow system theme

## Run locally

```bash
npm install
npm start
```

## Build installers locally

```bash
npm run dist:win     # Windows .exe
npm run dist:mac     # macOS .dmg
npm run dist:linux   # Linux AppImage/.deb
```

Installers are output to the `dist/` folder.

## Push to GitHub & auto-build with GitHub Actions

1. Create a new empty repo on GitHub (do NOT initialize it with a README).
2. From this project folder:

```bash
git init
git add .
git commit -m "Initial commit: Ox Browser desktop"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

3. Go to the **Actions** tab of your repo on GitHub. The `Build Ox Browser (Desktop)` workflow will run automatically and build installers for Windows, macOS, and Linux.
4. Once it finishes, download the built installers from the workflow run's **Artifacts** section.

## Notes

- Icons: replace the placeholder-less `build/icon.ico` / `.icns` / `.png` with real icons before shipping (electron-builder will use platform defaults if missing).
- This app only browses public websites — it does not include any video/media downloading functionality.
