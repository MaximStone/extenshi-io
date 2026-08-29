'use strict';

// Anything permissions.getAll() reports that isn't in the manifest's
// required set was granted at runtime.
const REQUIRED = ['storage', 'activeTab'];

async function paintBadge() {
  const granted = await chrome.permissions.getAll();
  const optional = (granted.permissions ?? []).filter((name) => !REQUIRED.includes(name));
  const origins = granted.origins ?? [];
  const count = optional.length + origins.length;

  await chrome.action.setBadgeBackgroundColor({ color: '#FB5B1A' });
  await chrome.action.setBadgeText({ text: count ? String(count) : '' });
}

chrome.permissions.onAdded.addListener(paintBadge);
chrome.permissions.onRemoved.addListener(paintBadge);
chrome.runtime.onInstalled.addListener(paintBadge);
chrome.runtime.onStartup.addListener(paintBadge);
