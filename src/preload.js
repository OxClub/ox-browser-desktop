const { contextBridge } = require('electron');

// Nothing privileged is exposed to web content loaded inside <webview> tags.
// This bridge only serves the app's own UI (index.html / renderer.js).
contextBridge.exposeInMainWorld('oxBrowser', {
  platform: process.platform
});
