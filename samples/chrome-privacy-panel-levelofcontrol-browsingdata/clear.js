// Clean Slate — the "clear now" panel.
// Runs on the `browsingData` permission declared at install.

const DATA_TYPES = [
  { key: "cache", label: "Cached files" },
  { key: "history", label: "Browsing history" },
  { key: "downloads", label: "Download list", note: "the list, not the files" },
  { key: "formData", label: "Saved form entries" },
  { key: "cookies", label: "Cookies and site data", note: "signs you out of everything" },
  { key: "localStorage", label: "Local storage" },
  { key: "indexedDB", label: "IndexedDB" },
  { key: "serviceWorkers", label: "Service workers" },
  { key: "passwords", label: "Saved passwords", note: "no undo, ever" }
];

const SPANS = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000
};

// A point in time, not a length of time. 0 means "since the epoch".
function since(range) {
  return SPANS[range] ? Date.now() - SPANS[range] : 0;
}

const list = document.getElementById("types");
const status = document.getElementById("clear-status");
const runButton = document.getElementById("clear-run");

async function render() {
  const { dataToRemove = {}, dataRemovalPermitted = {} } =
    await chrome.browsingData.settings();

  list.replaceChildren(
    ...DATA_TYPES.map((type) => {
      const permitted = dataRemovalPermitted[type.key] !== false;

      const box = document.createElement("input");
      box.type = "checkbox";
      box.value = type.key;
      box.checked = permitted && dataToRemove[type.key] === true;
      box.disabled = !permitted;

      const label = document.createElement("label");
      if (!permitted) label.classList.add("locked");
      label.append(box, ` ${type.label}`);

      const why = document.createElement("small");
      why.className = "why";
      why.textContent = permitted
        ? type.note ?? ""
        : "blocked by policy on this profile";
      if (why.textContent) label.append(why);

      return label;
    })
  );
}

runButton.addEventListener("click", async () => {
  const selected = {};
  for (const box of list.querySelectorAll("input:checked")) {
    selected[box.value] = true;
  }
  if (Object.keys(selected).length === 0) {
    status.textContent = "Nothing selected.";
    return;
  }

  runButton.disabled = true;
  status.textContent = "Clearing… don't click away, this can take a while.";

  try {
    await chrome.browsingData.remove(
      {
        since: since(document.getElementById("range").value),
        // The default, spelled out: normal sites only. Never hosted apps,
        // never other extensions' storage.
        originTypes: { unprotectedWeb: true }
      },
      selected
    );
    status.textContent = "Done.";
  } catch (error) {
    status.textContent = `Chrome refused: ${error.message}`;
  } finally {
    runButton.disabled = false;
  }
});

render();
