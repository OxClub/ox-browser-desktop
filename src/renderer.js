const tabsEl = document.getElementById('tabs');
const webviewContainer = document.getElementById('webview-container');
const urlBar = document.getElementById('url-bar');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');
const goBtn = document.getElementById('go-btn');
const newTabBtn = document.getElementById('new-tab-btn');
const newPrivateTabBtn = document.getElementById('new-private-tab-btn');
const bookmarkBtn = document.getElementById('bookmark-btn');
const menuBtn = document.getElementById('menu-btn');

const menuPanel = document.getElementById('menu-panel');
const bookmarksPanel = document.getElementById('bookmarks-panel');
const bookmarksList = document.getElementById('bookmarks-list');
const historyPanel = document.getElementById('history-panel');
const historyList = document.getElementById('history-list');
const downloadsPanel = document.getElementById('downloads-panel');
const downloadsList = document.getElementById('downloads-list');

const settingsOverlay = document.getElementById('settings-overlay');
const settingsHomepage = document.getElementById('settings-homepage');
const settingsSearchEngine = document.getElementById('settings-search-engine');
const settingsTheme = document.getElementById('settings-theme');

let tabs = [];
let activeTabId = null;
let tabCounter = 0;
let currentSettings = { homepage: 'https://www.google.com', searchEngine: 'google', theme: 'system' };

const ALL_PANELS = [menuPanel, bookmarksPanel, historyPanel, downloadsPanel];

function hideAllPanels() {
  ALL_PANELS.forEach((p) => p.classList.add('hidden'));
}

// ---------------- Bookmarks (kept local to the renderer, as before) ----------------

function loadBookmarks() {
  try {
    return JSON.parse(localStorage.getItem('ox-bookmarks') || '[]');
  } catch (e) {
    return [];
  }
}

function saveBookmarks(list) {
  localStorage.setItem('ox-bookmarks', JSON.stringify(list));
}

// ---------------- Theme ----------------

function applyTheme(theme) {
  let effective = theme;
  if (theme === 'system') {
    effective = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  document.body.classList.toggle('light-theme', effective === 'light');
}

// ---------------- URL handling ----------------

function searchUrlFor(query) {
  const encoded = encodeURIComponent(query);
  if (currentSettings.searchEngine === 'bing') return `https://www.bing.com/search?q=${encoded}`;
  if (currentSettings.searchEngine === 'duckduckgo') return `https://duckduckgo.com/?q=${encoded}`;
  return `https://www.google.com/search?q=${encoded}`;
}

function normalizeInput(input) {
  const value = input.trim();
  if (!value) return currentSettings.homepage;

  const looksLikeUrl = /^https?:\/\//i.test(value) ||
    (/^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(value) && !value.includes(' '));

  if (/^https?:\/\//i.test(value)) return value;
  if (looksLikeUrl) return 'https://' + value;

  return searchUrlFor(value);
}

// ---------------- Tabs ----------------

function createTab(url, isPrivate = false) {
  const id = 'tab-' + (++tabCounter);

  const webview = document.createElement('webview');
  webview.setAttribute('src', url || currentSettings.homepage);
  webview.setAttribute('allowpopups', 'false');
  webview.dataset.tabId = id;
  // Private tabs get an in-memory-only, non-persistent partition (true separate
  // cookie/storage jar that disappears when the tab closes). Normal tabs share
  // one persistent partition so logins/sessions survive restarts.
  webview.setAttribute('partition', isPrivate ? `private-${id}` : 'persist:ox-normal');

  webview.addEventListener('did-navigate', (e) => updateUrlIfActive(id, e.url));
  webview.addEventListener('did-navigate-in-page', (e) => updateUrlIfActive(id, e.url));
  webview.addEventListener('page-title-updated', (e) => updateTabTitle(id, e.title));
  webview.addEventListener('did-start-loading', () => setTabLoading(id, true));
  webview.addEventListener('did-stop-loading', () => setTabLoading(id, false));
  webview.addEventListener('did-finish-load', () => {
    if (!isPrivate) {
      const tab = tabs.find((t) => t.id === id);
      if (tab) {
        window.oxBrowser.addHistory({ title: tab.title, url: tab.url });
      }
    }
  });

  webviewContainer.appendChild(webview);

  const tab = { id, title: 'New Tab', url: url || currentSettings.homepage, isPrivate };
  tabs.push(tab);
  renderTabs();
  activateTab(id);
}

function closeTab(id) {
  const idx = tabs.findIndex((t) => t.id === id);
  if (idx === -1) return;

  const webview = webviewContainer.querySelector(`webview[data-tab-id="${id}"]`);
  if (webview) webview.remove();

  tabs.splice(idx, 1);

  if (tabs.length === 0) {
    createTab(currentSettings.homepage, false);
    return;
  }

  if (activeTabId === id) {
    const next = tabs[idx] || tabs[idx - 1];
    activateTab(next.id);
  }

  renderTabs();
}

function activateTab(id) {
  activeTabId = id;

  document.querySelectorAll('#webview-container webview').forEach((wv) => {
    wv.classList.toggle('active', wv.dataset.tabId === id);
  });

  const tab = tabs.find((t) => t.id === id);
  if (tab) urlBar.value = tab.url;

  renderTabs();
  updateBookmarkButton();
}

function updateUrlIfActive(id, url) {
  const tab = tabs.find((t) => t.id === id);
  if (tab) tab.url = url;
  if (id === activeTabId) {
    urlBar.value = url;
    updateBookmarkButton();
  }
}

function updateTabTitle(id, title) {
  const tab = tabs.find((t) => t.id === id);
  if (tab) tab.title = title || tab.url;
  renderTabs();
}

function setTabLoading(id, isLoading) {
  const el = tabsEl.querySelector(`[data-tab-id="${id}"]`);
  if (el) el.classList.toggle('loading', isLoading);
}

function renderTabs() {
  tabsEl.innerHTML = '';
  tabs.forEach((tab) => {
    const el = document.createElement('div');
    el.className = 'tab' + (tab.id === activeTabId ? ' active' : '') + (tab.isPrivate ? ' private' : '');
    el.dataset.tabId = tab.id;

    const titleEl = document.createElement('span');
    titleEl.className = 'tab-title';
    titleEl.textContent = (tab.isPrivate ? '\u{1F575} ' : '') + (tab.title || 'New Tab');

    const closeEl = document.createElement('span');
    closeEl.className = 'tab-close';
    closeEl.textContent = '\u00d7';
    closeEl.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.id);
    });

    el.appendChild(titleEl);
    el.appendChild(closeEl);
    el.addEventListener('click', () => activateTab(tab.id));

    tabsEl.appendChild(el);
  });
}

function getActiveWebview() {
  return webviewContainer.querySelector(`webview[data-tab-id="${activeTabId}"]`);
}

function navigate(input) {
  const url = normalizeInput(input);
  const webview = getActiveWebview();
  if (webview) webview.loadURL(url);
  urlBar.value = url;
}

function updateBookmarkButton() {
  const tab = tabs.find((t) => t.id === activeTabId);
  if (!tab) return;
  const bookmarks = loadBookmarks();
  const isBookmarked = bookmarks.some((b) => b.url === tab.url);
  bookmarkBtn.textContent = isBookmarked ? '\u2605' : '\u2606';
}

// ---------------- Panels: bookmarks / history / downloads ----------------

function renderBookmarksList() {
  const bookmarks = loadBookmarks();
  bookmarksList.innerHTML = '';

  if (bookmarks.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'bookmark-item';
    empty.textContent = 'No bookmarks yet';
    bookmarksList.appendChild(empty);
    return;
  }

  bookmarks.forEach((b) => {
    const item = document.createElement('div');
    item.className = 'bookmark-item';

    const label = document.createElement('span');
    label.textContent = b.title || b.url;
    label.title = b.url;

    const remove = document.createElement('span');
    remove.className = 'item-remove';
    remove.textContent = '\u00d7';
    remove.addEventListener('click', (e) => {
      e.stopPropagation();
      saveBookmarks(loadBookmarks().filter((x) => x.url !== b.url));
      renderBookmarksList();
      updateBookmarkButton();
    });

    item.appendChild(label);
    item.appendChild(remove);
    item.addEventListener('click', () => {
      navigate(b.url);
      hideAllPanels();
    });

    bookmarksList.appendChild(item);
  });
}

async function renderHistoryList() {
  const history = await window.oxBrowser.getHistory();
  historyList.innerHTML = '';

  if (history.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'history-item';
    empty.textContent = 'No history yet';
    historyList.appendChild(empty);
    return;
  }

  history.forEach((h) => {
    const item = document.createElement('div');
    item.className = 'history-item';

    const label = document.createElement('span');
    label.textContent = h.title || h.url;
    label.title = h.url;

    item.appendChild(label);
    item.addEventListener('click', () => {
      navigate(h.url);
      hideAllPanels();
    });

    historyList.appendChild(item);
  });
}

async function renderDownloadsList() {
  const downloads = await window.oxBrowser.getDownloads();
  downloadsList.innerHTML = '';

  if (downloads.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'panel-item';
    empty.textContent = 'No downloads yet';
    downloadsList.appendChild(empty);
    return;
  }

  downloads.forEach((d) => {
    const item = document.createElement('div');
    item.className = 'panel-item';

    const date = new Date(d.timestamp).toLocaleString();
    item.innerHTML = `${d.fileName}<div class="item-sub">${d.state} \u2022 ${date}</div>`;

    downloadsList.appendChild(item);
  });
}

// ---------------- Settings ----------------

async function openSettings() {
  currentSettings = await window.oxBrowser.getSettings();
  settingsHomepage.value = currentSettings.homepage;
  settingsSearchEngine.value = currentSettings.searchEngine;
  settingsTheme.value = currentSettings.theme;
  settingsOverlay.classList.remove('hidden');
}

async function saveSettings() {
  const updated = {
    homepage: settingsHomepage.value.trim() || 'https://www.google.com',
    searchEngine: settingsSearchEngine.value,
    theme: settingsTheme.value
  };
  currentSettings = await window.oxBrowser.setSettings(updated);
  applyTheme(currentSettings.theme);
  settingsOverlay.classList.add('hidden');
}

// ---------------- Event wiring ----------------

backBtn.addEventListener('click', () => {
  const wv = getActiveWebview();
  if (wv && wv.canGoBack()) wv.goBack();
});

forwardBtn.addEventListener('click', () => {
  const wv = getActiveWebview();
  if (wv && wv.canGoForward()) wv.goForward();
});

reloadBtn.addEventListener('click', () => {
  const wv = getActiveWebview();
  if (wv) wv.reload();
});

goBtn.addEventListener('click', () => navigate(urlBar.value));

urlBar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') navigate(urlBar.value);
});

newTabBtn.addEventListener('click', () => createTab(currentSettings.homepage, false));
newPrivateTabBtn.addEventListener('click', () => createTab(currentSettings.homepage, true));

bookmarkBtn.addEventListener('click', () => {
  const tab = tabs.find((t) => t.id === activeTabId);
  if (!tab) return;

  const bookmarks = loadBookmarks();
  const existingIdx = bookmarks.findIndex((b) => b.url === tab.url);

  if (existingIdx >= 0) {
    bookmarks.splice(existingIdx, 1);
  } else {
    bookmarks.push({ title: tab.title, url: tab.url });
  }

  saveBookmarks(bookmarks);
  updateBookmarkButton();
  renderBookmarksList();
});

menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const wasHidden = menuPanel.classList.contains('hidden');
  hideAllPanels();
  if (wasHidden) menuPanel.classList.remove('hidden');
});

document.getElementById('menu-bookmarks').addEventListener('click', () => {
  hideAllPanels();
  bookmarksPanel.classList.remove('hidden');
  renderBookmarksList();
});

document.getElementById('menu-history').addEventListener('click', () => {
  hideAllPanels();
  historyPanel.classList.remove('hidden');
  renderHistoryList();
});

document.getElementById('menu-downloads').addEventListener('click', () => {
  hideAllPanels();
  downloadsPanel.classList.remove('hidden');
  renderDownloadsList();
});

document.getElementById('menu-settings').addEventListener('click', () => {
  hideAllPanels();
  openSettings();
});

document.getElementById('clear-history-btn').addEventListener('click', async () => {
  await window.oxBrowser.clearHistory();
  renderHistoryList();
});

document.getElementById('settings-save-btn').addEventListener('click', saveSettings);
document.getElementById('settings-cancel-btn').addEventListener('click', () => {
  settingsOverlay.classList.add('hidden');
});

document.addEventListener('click', (e) => {
  const clickedInsidePanel = ALL_PANELS.some((p) => p.contains(e.target));
  const clickedMenuBtn = e.target === menuBtn;
  if (!clickedInsidePanel && !clickedMenuBtn) {
    hideAllPanels();
  }
});

window.oxBrowser.onDownloadUpdated(() => {
  if (!downloadsPanel.classList.contains('hidden')) {
    renderDownloadsList();
  }
});

if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (currentSettings.theme === 'system') applyTheme('system');
  });
}

// ---------------- Startup ----------------

(async function start() {
  currentSettings = await window.oxBrowser.getSettings();
  applyTheme(currentSettings.theme);
  createTab(currentSettings.homepage, false);
})();
