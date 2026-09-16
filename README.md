# Ox Browser (Desktop)

A simple desktop web browser built with Electron (uses the same Chromium engine as Google Chrome). Tabs, address bar, back/forward, bookmarks.

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
