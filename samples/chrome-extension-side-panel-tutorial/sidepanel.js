const notes = document.getElementById("notes");
const statusEl = document.getElementById("status");
const scopeEl = document.getElementById("scope");

let currentKey = "notes:global";

async function activeOrigin() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;
  try {
    return new URL(tab.url).origin;
  } catch {
    return null; // chrome:// pages, new-tab page, etc.
  }
}

// Point the editor at the note for whatever tab is active now.
async function syncToActiveTab() {
  const origin = await activeOrigin();
  currentKey = origin ? `notes:${origin}` : "notes:global";
  scopeEl.textContent = origin ? new URL(origin).hostname : "All sites";
  const stored = await chrome.storage.local.get(currentKey);
  notes.value = stored[currentKey] ?? "";
}

let timer;
notes.addEventListener("input", () => {
  // Capture the key NOW — if the user switches tabs during the 300 ms
  // debounce, currentKey moves on and the save would land under the
  // wrong site's key, silently overwriting that site's note.
  const keySnapshot = currentKey;
  statusEl.textContent = "Saving…";
  clearTimeout(timer);
  timer = setTimeout(async () => {
    await chrome.storage.local.set({ [keySnapshot]: notes.value });
    statusEl.textContent = "Saved";
  }, 300);
});

// Switch notes when the user changes tabs or the tab navigates.
chrome.tabs.onActivated.addListener(syncToActiveTab);
chrome.tabs.onUpdated.addListener((_id, info) => {
  if (info.url) syncToActiveTab();
});

syncToActiveTab();
