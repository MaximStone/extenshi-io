'use strict';

const TOP_SITES = { permissions: ['topSites'] };

// The tab the popup was opened on, resolved once at load so that no click
// handler ever has to await before calling permissions.request().
let siteUrl = null;
let siteOrigin = null;

function setStatus(id, message) {
  document.getElementById(id).textContent = message;
}

/* ---------- the free part: a note in chrome.storage.sync ---------- */

async function loadNote() {
  const { note = '' } = await chrome.storage.sync.get('note');
  document.getElementById('note').value = note;
}

document.getElementById('note').addEventListener('change', (event) => {
  chrome.storage.sync.set({ note: event.target.value });
});

/* ---------- feature 1: an optional named permission ---------- */

async function renderTopSites() {
  const list = document.getElementById('top-sites');
  list.textContent = '';

  // Ask every time. A grant is a fact about right now, not one you own.
  const granted = await chrome.permissions.contains(TOP_SITES);
  document.getElementById('enable-top-sites').hidden = granted;
  document.getElementById('disable-top-sites').hidden = !granted;
  if (!granted) return;

  const sites = await chrome.topSites.get();
  for (const site of sites.slice(0, 5)) {
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = site.url;
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
    link.textContent = site.title || site.url;
    item.append(link);
    list.append(item);
  }
}

document.getElementById('enable-top-sites').addEventListener('click', async () => {
  // request() is the FIRST thing in this handler — nothing is awaited before it.
  const granted = await chrome.permissions.request(TOP_SITES);
  if (!granted) {
    setStatus('top-sites-status', 'No problem — everything else here still works.');
    return;
  }
  setStatus('top-sites-status', '');
  await renderTopSites();
});

document.getElementById('disable-top-sites').addEventListener('click', async () => {
  await chrome.permissions.remove(TOP_SITES);
  setStatus('top-sites-status', '');
  await renderTopSites();
});

/* ---------- feature 2: one origin, discovered at runtime ---------- */

function toMatchPattern(url) {
  try {
    const { protocol, origin } = new URL(url);
    return protocol === 'https:' ? `${origin}/*` : null;
  } catch {
    return null;
  }
}

async function renderSite() {
  const enable = document.getElementById('enable-site');
  const disable = document.getElementById('disable-site');

  if (!siteOrigin) {
    enable.hidden = true;
    disable.hidden = true;
    setStatus('site-output', 'Open an https:// page, then reopen this popup.');
    return;
  }

  document.getElementById('site-label').textContent = new URL(siteUrl).host;
  const granted = await chrome.permissions.contains({ origins: [siteOrigin] });
  enable.hidden = granted;
  disable.hidden = !granted;
  if (granted) await peek();
}

async function peek() {
  setStatus('site-output', 'Reading…');
  try {
    const response = await fetch(siteUrl, { credentials: 'omit' });
    const html = await response.text();
    const page = new DOMParser().parseFromString(html, 'text/html');
    const title = page.querySelector('title')?.textContent?.trim() || '(no <title>)';
    const kb = (html.length / 1024).toFixed(1);
    setStatus('site-output', `${title} — ${kb} KB, ${page.querySelectorAll('a').length} links`);
  } catch (error) {
    setStatus('site-output', `Could not read it: ${error.message}`);
  }
}

document.getElementById('enable-site').addEventListener('click', async () => {
  if (!siteOrigin) return;
  const granted = await chrome.permissions.request({ origins: [siteOrigin] });
  if (!granted) {
    setStatus('site-output', 'Fine — nothing was read.');
    return;
  }
  await renderSite();
});

document.getElementById('disable-site').addEventListener('click', async () => {
  await chrome.permissions.remove({ origins: [siteOrigin] });
  setStatus('site-output', '');
  await renderSite();
});

/* ---------- boot ---------- */

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  siteUrl = tab?.url ?? null;
  siteOrigin = siteUrl ? toMatchPattern(siteUrl) : null;

  await loadNote();
  await renderTopSites();
  await renderSite();
}

init();
