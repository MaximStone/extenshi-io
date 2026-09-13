const VERBS = [
  { key: 'hl', hint: 'highlight a word on this page' },
  { key: 'count', hint: 'count a word, show it on the badge' },
  { key: 'clear', hint: 'remove highlights and badge' }
];

const MENU =
  'Marker: <match>hl</match> · <match>count</match> <dim>then a word, or</dim> <match>clear</match>';

// Suggestion descriptions are XML-ish, not HTML: escape before interpolating.
function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parse(text) {
  const trimmed = text.trim();
  const space = trimmed.indexOf(' ');
  const verb = (space === -1 ? trimmed : trimmed.slice(0, space)).toLowerCase();
  const arg = space === -1 ? '' : trimmed.slice(space + 1).trim();
  return { verb, arg };
}

function preview(verb, arg) {
  const word = arg ? `<match>${escapeXml(arg)}</match>` : '<dim>a word</dim>';
  if (verb === 'hl') return `Highlight ${word} <dim>on this page</dim>`;
  if (verb === 'count') return `Count ${word} <dim>and show it on the badge</dim>`;
  return 'Clear highlights <dim>and the badge</dim>';
}

// Runs in the page, not in the worker: no closures, everything via args.
function markInPage(needle) {
  if (!CSS.highlights) return -1;
  CSS.highlights.delete('marker');
  if (!needle) return 0;

  const lower = needle.toLowerCase();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const ranges = [];

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue.toLowerCase();
    let at = text.indexOf(lower);
    while (at !== -1) {
      const range = new Range();
      range.setStart(node, at);
      range.setEnd(node, at + lower.length);
      ranges.push(range);
      at = text.indexOf(lower, at + lower.length);
    }
  }

  CSS.highlights.set('marker', new Highlight(...ranges));
  return ranges.length;
}

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

async function mark(tabId, needle) {
  await chrome.scripting.insertCSS({
    target: { tabId },
    css: '::highlight(marker) { background-color: #FB5B1A; color: #fff; }'
  });
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: markInPage,
    args: [needle]
  });
  return result;
}

chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({ description: MENU });
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const { verb, arg } = parse(text);
  const known = VERBS.find((v) => v.key === verb);

  if (known) {
    chrome.omnibox.setDefaultSuggestion({ description: preview(known.key, arg) });
    suggest([]);
    return;
  }

  chrome.omnibox.setDefaultSuggestion({ description: MENU });
  suggest(
    VERBS.filter((v) => v.key.startsWith(verb)).map((v) => ({
      content: `${v.key} `,
      description: `<match>${v.key}</match> <dim>— ${v.hint}</dim>`
    }))
  );
});

chrome.omnibox.onInputEntered.addListener(async (text) => {
  const { verb, arg } = parse(text);
  const tabId = await currentTab();
  if (!tabId) return;

  try {
    if (verb === 'clear') {
      await mark(tabId, '');
      await chrome.action.setBadgeText({ tabId, text: '' });
    } else if (verb === 'hl' && arg) {
      await mark(tabId, arg);
    } else if (verb === 'count' && arg) {
      const n = await mark(tabId, arg);
      await chrome.action.setBadgeText({ tabId, text: n < 0 ? '?' : String(n) });
    }
  } catch (err) {
    // chrome://, the Web Store and the New Tab page refuse injection.
    console.warn('Marker could not reach this page:', err.message);
    await chrome.action.setBadgeText({ tabId, text: '!' });
  }
});
