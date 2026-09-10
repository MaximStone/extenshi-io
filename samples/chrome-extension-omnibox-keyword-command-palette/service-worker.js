// Jump — final. Shortcuts live in chrome.storage.sync; the omnibox reads them.

const DEFAULTS = [
  { key: "mail", url: "https://mail.google.com/", title: "Gmail" },
  { key: "cal", url: "https://calendar.google.com/", title: "Calendar" },
  { key: "gh", url: "https://github.com/", title: "GitHub" }
];

// Cached per worker lifetime. The first keystroke of a session pays for the
// read; the rest are answered from memory.
let cache = null;

function loadShortcuts() {
  if (!cache) {
    cache = chrome.storage.sync
      .get({ shortcuts: DEFAULTS })
      .then((res) => (res.shortcuts?.length ? res.shortcuts : DEFAULTS));
  }
  return cache;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.shortcuts) cache = null;
});

chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description: "Jump to a shortcut, or <dim>press Enter to search the web</dim>"
  });
  loadShortcuts(); // warm the cache before the first keystroke arrives
});

chrome.omnibox.onInputChanged.addListener(async (text, suggest) => {
  const q = text.trim().toLowerCase();
  const list = await loadShortcuts();

  const rows = list
    .filter((s) => s.key.toLowerCase().includes(q) || s.title.toLowerCase().includes(q))
    .slice(0, 5)
    .map((s) => ({
      content: s.url,
      description:
        `${highlight(s.key, q)} <dim>${esc(s.title)}</dim> <url>${esc(s.url)}</url>`
    }));

  if (q) {
    rows.push({
      content: searchUrl(text),
      description: `Search the web for <match>${esc(text)}</match>`
    });
  }

  suggest(rows);
});

chrome.omnibox.onInputEntered.addListener(async (text, disposition) => {
  const url = await resolve(text);
  if (disposition === "currentTab") {
    chrome.tabs.update({ url });
  } else {
    chrome.tabs.create({ url, active: disposition === "newForegroundTab" });
  }
});

async function resolve(text) {
  // A suggestion was picked: `text` is that row's `content`, already a URL.
  if (/^https?:\/\//i.test(text)) return text;

  // The default suggestion was accepted: `text` is whatever they typed.
  const typed = text.trim();
  const list = await loadShortcuts();
  const hit = list.find((s) => s.key.toLowerCase() === typed.toLowerCase());
  return hit ? hit.url : searchUrl(typed);
}

function searchUrl(text) {
  return `https://duckduckgo.com/?q=${encodeURIComponent(text)}`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function highlight(label, query) {
  const i = label.toLowerCase().indexOf(query);
  if (!query || i === -1) return esc(label);
  return (
    esc(label.slice(0, i)) +
    `<match>${esc(label.slice(i, i + query.length))}</match>` +
    esc(label.slice(i + query.length))
  );
}
