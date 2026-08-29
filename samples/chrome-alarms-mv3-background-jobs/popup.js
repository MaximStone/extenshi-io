const input = document.getElementById("threshold");
const stats = document.getElementById("stats");

async function render() {
  const { threshold, nudges } = await chrome.storage.local.get({
    threshold: 20,
    nudges: 0
  });
  input.value = threshold;
  stats.textContent = `Nudged ${nudges} time${nudges === 1 ? "" : "s"} so far.`;
}

input.addEventListener("change", async () => {
  const threshold = Number.parseInt(input.value, 10);
  if (Number.isNaN(threshold) || threshold < 1) return;
  await chrome.storage.local.set({ threshold });
});

render();
