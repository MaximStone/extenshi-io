const editor = document.getElementById("editor");
const status = document.getElementById("status");

const DEFAULTS = [
  { key: "mail", url: "https://mail.google.com/", title: "Gmail" },
  { key: "cal", url: "https://calendar.google.com/", title: "Calendar" },
  { key: "gh", url: "https://github.com/", title: "GitHub" }
];

init();

async function init() {
  const { shortcuts } = await chrome.storage.sync.get({ shortcuts: DEFAULTS });
  editor.value = shortcuts
    .map((s) => [s.key, s.url, s.title].filter(Boolean).join(" "))
    .join("\n");
}

document.getElementById("save").addEventListener("click", async () => {
  const shortcuts = editor.value
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter(([key, url]) => key && /^https?:\/\//i.test(url ?? ""))
    .map(([key, url, ...rest]) => ({ key, url, title: rest.join(" ") || key }));

  await chrome.storage.sync.set({ shortcuts });
  status.textContent = `Saved ${shortcuts.length} shortcut(s).`;
});
