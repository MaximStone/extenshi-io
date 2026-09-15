const STATUS_MS = 1200;

document.addEventListener('DOMContentLoaded', async () => {
  const box = document.getElementById('count-pinned');
  const status = document.getElementById('status');

  const { countPinned = true } = await chrome.storage.sync.get('countPinned');
  box.checked = countPinned;

  box.addEventListener('change', async () => {
    await chrome.storage.sync.set({ countPinned: box.checked });
    status.textContent = t('optionsSaved');
    setTimeout(() => {
      status.textContent = '';
    }, STATUS_MS);
  });
});
