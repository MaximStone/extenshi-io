// Outline It — background service worker.
// There is no DOM in this file: no document, no window, no DOMParser,
// no clipboard. Anything that needs one is delegated to offscreen.html.

const OFFSCREEN_PATH = "offscreen.html";

// A promise, not a boolean. Two clicks in the same worker lifetime would
// otherwise both see "no document yet" and both call createDocument();
// the second call throws.
let creating = null;

async function setupOffscreenDocument() {
  // getContexts() matches on the FULL extension URL — a relative path
  // never matches, and the guard silently stops guarding.
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_PATH);
  const existing = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });
  if (existing.length > 0) return;

  if (creating) {
    await creating;
    return;
  }

  creating = chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: [
      chrome.offscreen.Reason.DOM_PARSER,
      chrome.offscreen.Reason.CLIPBOARD
    ],
    justification:
      "Parse the page's HTML with DOMParser and copy the resulting outline to the system clipboard."
  });

  try {
    await creating;
  } finally {
    // Cleared either way, so a failed create doesn't poison the next click.
    // The failure itself still propagates — out of here, and out of any
    // concurrent caller parked on `await creating` above — which is why the
    // click handler below catches it.
    creating = null;
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  let injection;
  try {
    // activeTab grants us this tab for this click only.
    [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      // Deliberately dumb: hand back a string and let the offscreen document
      // do the thinking. Only structured-cloneable data crosses this boundary,
      // so a live DOM node could never come back here anyway.
      func: () => document.documentElement.outerHTML
    });
  } catch {
    // Restricted page — chrome://, the Web Store, the PDF viewer, another
    // extension. executeScript REJECTS on all of them, so without this the
    // click leaves an unhandled rejection in the worker log. Nothing to do
    // but stop before we open a document we'd have no work for.
    return;
  }

  try {
    await setupOffscreenDocument();
  } catch (err) {
    // Extension policy, resource pressure, a create that lost a race — rare,
    // but an async listener that rejects tells you nothing about which.
    console.error("Failed to open the offscreen document:", err);
    return;
  }

  chrome.runtime
    .sendMessage({
      target: "offscreen",
      type: "outline-page",
      data: injection.result
    })
    .catch(() => {
      // The document went away between the check and the send.
    });
});

// Listener at the TOP LEVEL — Chrome wakes the worker, runs one turn of the
// event loop, then dispatches. A listener attached later can be missed.
chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== "service-worker") return;
  if (message.type !== "outline-result") return;
  showResult(message.data.count);
});

async function showResult(count) {
  await chrome.action.setBadgeBackgroundColor({ color: "#FB5B1A" });
  await chrome.action.setBadgeText({ text: String(count) });

  // Close it the moment the work is done. Nothing else will.
  try {
    await chrome.offscreen.closeDocument();
  } catch {
    // Already closed. closeDocument() throws when there's nothing open.
  }
}
