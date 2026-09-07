// Clean Slate — the per-site panel.
// `contentSettings` is optional too. The tab URL comes from `activeTab`,
// which Chrome granted the moment you opened this popup.

const TYPES = [
  ["cookies", "Set cookies"],
  ["javascript", "Run JavaScript"],
  ["images", "Load images"],
  ["popups", "Open pop-ups"],
  ["notifications", "Show notifications"],
  ["location", "Read your location"],
  ["camera", "Use the camera"],
  ["microphone", "Use the microphone"],
  ["automaticDownloads", "Download files automatically"]
];

const list = document.getElementById("site-list");
const status = document.getElementById("site-status");
const grantButton = document.getElementById("site-grant");

async function activeUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ?? "";
}

async function render() {
  const url = await activeUrl();

  if (!/^https?:/.test(url)) {
    status.textContent = "Content settings only apply to http and https pages.";
    list.replaceChildren();
    return;
  }

  status.textContent = new URL(url).host;

  const rows = await Promise.all(
    TYPES.map(async ([type, label]) => {
      // Deprecated types (plugins, fullscreen, mouselock) can be missing
      // outright on current Chrome. Never assume the namespace is there.
      if (!chrome.contentSettings[type]) return null;
      const { setting } = await chrome.contentSettings[type].get({ primaryUrl: url });
      return { label, setting };
    })
  );

  list.replaceChildren(
    ...rows.filter(Boolean).map(({ label, setting }) => {
      const row = document.createElement("div");
      row.className = "row";
      const name = document.createElement("span");
      name.textContent = label;
      const value = document.createElement("span");
      value.textContent = setting;
      row.append(name, value);
      return row;
    })
  );
}

async function start() {
  const granted = await chrome.permissions.contains({
    permissions: ["contentSettings"]
  });

  if (!granted) {
    status.textContent =
      "Chrome will ask for permission to change what websites are allowed to do.";
    grantButton.hidden = false;
    return;
  }

  if (!chrome.contentSettings) {
    status.textContent = "Granted — reopen the popup to use this panel.";
    return;
  }

  grantButton.hidden = true;
  render();
}

grantButton.addEventListener("click", async () => {
  const granted = await chrome.permissions.request({
    permissions: ["contentSettings"]
  });
  if (granted) start();
});

start();
