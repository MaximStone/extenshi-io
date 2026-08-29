'use strict';

const PANEL_ID = 'page-lens-panel';

// Copied into the page, so it takes the id as an argument instead of closing
// over the constant above. Returns true if a panel was there (and removes it).
function takeDownPanel(id) {
  const panel = document.getElementById(id);
  if (!panel) return false;
  panel.remove();
  return true;
}

async function closePanel(tabId) {
  await chrome.scripting.removeCSS({ target: { tabId }, files: ['panel.css'] });
  await chrome.action.setBadgeText({ tabId, text: '' });
}

async function openPanel(tabId) {
  await chrome.scripting.insertCSS({ target: { tabId }, files: ['panel.css'] });

  // Order is load-bearing: the listener has to exist before the probe posts.
  await chrome.scripting.executeScript({ target: { tabId }, files: ['bridge.js'] });
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['probe-main.js'],
    world: 'MAIN'
  });
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id || !/^https?:/.test(tab.url ?? '')) return;

  try {
    const [{ result: wasOpen }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: takeDownPanel,
      args: [PANEL_ID]
    });

    if (wasOpen) await closePanel(tab.id);
    else await openPanel(tab.id);
  } catch (error) {
    console.warn('Page Lens cannot run on this page:', error.message);
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== 'page-lens-result' || !sender.tab?.id) return;

  chrome.action.setBadgeBackgroundColor({ color: '#FB5B1A' });
  chrome.action.setBadgeText({ tabId: sender.tab.id, text: String(message.count) });
});
