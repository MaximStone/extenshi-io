// Rec Tab — background service worker.
// Nothing here touches media. It brokers a string, then saves a file.

const OFFSCREEN_PATH = "offscreen.html";

// Which downloads are ours, and therefore which blob URLs are still needed.
const pending = new Set();

async function findOffscreenDocument() {
  // No documentUrls filter on purpose: the offscreen page writes its state
  // into its own location.hash, so a filter matching the plain path would
  // stop matching the moment recording starts.
  const contexts = await chrome.runtime.getContexts({});
  return contexts.find((c) => c.contextType === "OFFSCREEN_DOCUMENT");
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  const existing = await findOffscreenDocument();

  // Already rolling? This click means stop.
  if (existing?.documentUrl.endsWith("#recording")) {
    chrome.runtime.sendMessage({ target: "offscreen", type: "stop-recording" });
    return;
  }

  if (!existing) {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_PATH,
      reasons: ["USER_MEDIA", "BLOBS"],
      justification:
        "Record the captured tab with MediaRecorder and build the resulting file."
    });
  }

  // Late on purpose: the ID is single-use and expires in seconds.
  let streamId;
  try {
    streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
  } catch (err) {
    // chrome:// pages, the Web Store, the PDF viewer — not capturable.
    console.error("Could not capture this tab:", err);
    return;
  }

  chrome.runtime.sendMessage({
    target: "offscreen",
    type: "start-recording",
    data: streamId
  });

  chrome.action.setBadgeBackgroundColor({ color: "#FB5B1A" });
  chrome.action.setBadgeText({ text: "REC" });
});

// Both listeners below sit at the TOP LEVEL. Chrome runs one turn of the
// event loop after waking the worker and only then fires the queued event —
// a listener attached inside a function can be missed entirely.
chrome.runtime.onMessage.addListener((message) => {
  if (message.target !== "service-worker") return;
  if (message.type !== "recording-stopped") return;
  saveRecording(message.data.url);
});

async function saveRecording(url) {
  chrome.action.setBadgeText({ text: "" });

  const id = await chrome.downloads.download({
    url,
    filename: `tab-recording-${Date.now()}.webm`,
    saveAs: false
  });

  pending.add(id);
}

chrome.downloads.onChanged.addListener(async (delta) => {
  if (!pending.has(delta.id)) return;
  if (delta.state?.current !== "complete") return;

  pending.delete(delta.id);

  // Closing the document destroys its blob URLs — which is why we wait for
  // "complete" first. Kill it mid-write and you get a truncated .webm.
  if (pending.size === 0) {
    try {
      await chrome.offscreen.closeDocument();
    } catch {
      // Already gone.
    }
  }
});
