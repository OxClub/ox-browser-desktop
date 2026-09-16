const { contextBridge, ipcRenderer } = require('electron');

// Nothing privileged is exposed to web content loaded inside <webview> tags.
// This bridge only serves the app's own UI (index.html / renderer.js).
contextBridge.exposeInMainWorld('oxBrowser', {
  platform: process.platform,

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (settings) => ipcRenderer.invoke('settings:set', settings),

  // History
  getHistory: () => ipcRenderer.invoke('history:get'),
  addHistory: (entry) => ipcRenderer.invoke('history:add', entry),
  clearHistory: () => ipcRenderer.invoke('history:clear'),

  // Downloads
  getDownloads: () => ipcRenderer.invoke('downloads:get'),
  onDownloadUpdated: (callback) => {
    ipcRenderer.on('download-updated', (_event, payload) => callback(payload));
  }
});
