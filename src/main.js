const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// ---------- Simple JSON file storage in the app's userData folder ----------

function dataFilePath(name) {
  return path.join(app.getPath('userData'), `${name}.json`);
}

function readJson(name, fallback) {
  try {
    const raw = fs.readFileSync(dataFilePath(name), 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function writeJson(name, data) {
  try {
    fs.writeFileSync(dataFilePath(name), JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error(`Failed to write ${name}.json`, e);
  }
}

const DEFAULT_SETTINGS = {
  homepage: 'https://www.google.com',
  searchEngine: 'google', // google | bing | duckduckgo
  theme: 'system' // light | dark | system
};

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...readJson('settings', {}) };
}

// ---------- Window ----------

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 640,
    minHeight: 480,
    title: 'Ox Browser',
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Each site opens in its own <webview>, which itself runs
      // with its own separate, sandboxed process/context.
      webviewTag: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open target="_blank" links from webviews in a new tab instead
  // of a bare new Electron window.
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}

// Simple application menu (File / Edit / View / Window)
function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  // Any webview's downloads (any partition, including private/incognito ones)
  // are caught here and saved straight to the user's Downloads folder.
  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() !== 'webview') return;

    contents.session.on('will-download', (_e, item) => {
      const fileName = item.getFilename();
      const savePath = path.join(app.getPath('downloads'), fileName);
      item.setSavePath(savePath);

      const downloads = readJson('downloads', []);
      const record = {
        fileName,
        url: item.getURL(),
        savePath,
        timestamp: Date.now(),
        state: 'downloading'
      };
      downloads.unshift(record);
      writeJson('downloads', downloads);

      if (mainWindow) {
        mainWindow.webContents.send('download-updated', { fileName, state: 'downloading' });
      }

      item.once('done', (_evt, state) => {
        const list = readJson('downloads', []);
        const match = list.find((d) => d.fileName === fileName && d.timestamp === record.timestamp);
        if (match) match.state = state;
        writeJson('downloads', list);

        if (mainWindow) {
          mainWindow.webContents.send('download-updated', { fileName, state });
        }
      });
    });
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------- IPC handlers ----------

ipcMain.handle('settings:get', () => getSettings());

ipcMain.handle('settings:set', (_event, newSettings) => {
  const merged = { ...getSettings(), ...newSettings };
  writeJson('settings', merged);
  return merged;
});

ipcMain.handle('history:get', () => {
  return readJson('history', []).sort((a, b) => b.timestamp - a.timestamp);
});

ipcMain.handle('history:add', (_event, entry) => {
  if (!entry || !entry.url || entry.url === 'about:blank') return;
  const list = readJson('history', []).filter((h) => h.url !== entry.url);
  list.unshift({ title: entry.title || entry.url, url: entry.url, timestamp: Date.now() });
  writeJson('history', list.slice(0, 500));
});

ipcMain.handle('history:clear', () => {
  writeJson('history', []);
});

ipcMain.handle('downloads:get', () => {
  return readJson('downloads', []).sort((a, b) => b.timestamp - a.timestamp);
});
