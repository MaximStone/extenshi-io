// ── Handlers first: top-level, registered in the worker's first turn ──

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'save-selection') {
    const text = (info.selectionText ?? '').trim();
    if (text) await saveClip(text, info.pageUrl ?? '');
  } else if (info.menuItemId === 'save-link') {
    const url = info.linkUrl ?? '';
    if (url) await saveClip(url, info.pageUrl ?? '');
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.clips) {
    updateBadge(changes.clips.newValue ?? []);
  }
});

// ── One-time setup: menus are browser state, created exactly once ──

chrome.runtime.onInstalled.addListener(async () => {
  // onInstalled fires on updates too — clear first so ids never collide.
  await chrome.contextMenus.removeAll();

  chrome.contextMenus.create({
    id: 'save-selection',
    title: 'Save "%s" to Clip Jar',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'save-link',
    title: 'Save this link to Clip Jar',
    contexts: ['link']
  });
});

// ── Helpers ──

const MAX_CLIPS = 50;

async function saveClip(text, source) {
  const { clips = [] } = await chrome.storage.local.get('clips');
  clips.unshift({
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    text,
    source,
    savedAt: new Date().toISOString()
  });
  await chrome.storage.local.set({ clips: clips.slice(0, MAX_CLIPS) });
}

function updateBadge(clips) {
  // The action docs recommend four characters or fewer of badge text.
  chrome.action.setBadgeBackgroundColor({ color: '#FB5B1A' });
  chrome.action.setBadgeText({ text: clips.length ? String(clips.length) : '' });
}

// Re-sync the badge every time the worker starts. Cheap insurance: one line,
// and you never have to reason about which lifecycle events reset it.
chrome.storage.local.get('clips').then(({ clips = [] }) => updateBadge(clips));
