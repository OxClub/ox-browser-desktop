const tabsEl = document.getElementById('tabs');
const webviewContainer = document.getElementById('webview-container');
const urlBar = document.getElementById('url-bar');
const backBtn = document.getElementById('back-btn');
const forwardBtn = document.getElementById('forward-btn');
const reloadBtn = document.getElementById('reload-btn');
const goBtn = document.getElementById('go-btn');
const newTabBtn = document.getElementById('new-tab-btn');
const bookmarkBtn = document.getElementById('bookmark-btn');
const bookmarksBtn = document.getElementById('bookmarks-btn');
const bookmarksPanel = document.getElementById('bookmarks-panel');
const bookmarksList = document.getElementById('bookmarks-list');

const HOME_URL = 'https://www.google.com';
let tabs = [];
let activeTabId = null;
let tabCounter = 0;

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

function normalizeInput(input) {
  const value = input.trim();
  if (!value) return HOME_URL;

  const looksLikeUrl = /^https?:\/\//i.test(value) ||
    (/^[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(value) && !value.includes(' '));

  if (/^https?:\/\//i.test(value)) return value;
  if (looksLikeUrl) return 'https://' + value;

  return 'https://www.google.com/search?q=' + encodeURIComponent(value);
}

function createTab(url = HOME_URL) {
  const id = 'tab-' + (++tabCounter);

  const webview = document.createElement('webview');
  webview.setAttribute('src', url);
  webview.setAttribute('allowpopups', 'false');
  webview.dataset.tabId = id;

  webview.addEventListener('did-navigate', (e) => updateUrlIfActive(id, e.url));
  webview.addEventListener('did-navigate-in-page', (e) => updateUrlIfActive(id, e.url));
  webview.addEventListener('page-title-updated', (e) => updateTabTitle(id, e.title));
  webview.addEventListener('did-start-loading', () => setTabLoading(id, true));
  webview.addEventListener('did-stop-loading', () => setTabLoading(id, false));

  webviewContainer.appendChild(webview);

  const tab = { id, title: 'New Tab', url };
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
    createTab();
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
    el.className = 'tab' + (tab.id === activeTabId ? ' active' : '');
    el.dataset.tabId = tab.id;

    const titleEl = document.createElement('span');
    titleEl.className = 'tab-title';
    titleEl.textContent = tab.title || 'New Tab';

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
    remove.className = 'bookmark-remove';
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
      bookmarksPanel.classList.add('hidden');
    });

    bookmarksList.appendChild(item);
  });
}

// Toolbar events
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

newTabBtn.addEventListener('click', () => createTab());

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

bookmarksBtn.addEventListener('click', () => {
  bookmarksPanel.classList.toggle('hidden');
  renderBookmarksList();
});

document.addEventListener('click', (e) => {
  if (!bookmarksPanel.contains(e.target) && e.target !== bookmarksBtn) {
    bookmarksPanel.classList.add('hidden');
  }
});

// Start with one tab
createTab();
