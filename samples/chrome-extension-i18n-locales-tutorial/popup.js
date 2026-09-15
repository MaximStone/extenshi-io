document.addEventListener('DOMContentLoaded', async () => {
  const { countPinned = true } = await chrome.storage.sync.get('countPinned');
  const tabs = await chrome.tabs.query({});
  const counted = countPinned ? tabs : tabs.filter((tab) => !tab.pinned);
  const windows = new Set(counted.map((tab) => tab.windowId)).size;

  document.getElementById('tab-count').textContent = tPlural('tabCount', counted.length);
  document.getElementById('window-count').textContent = tPlural('windowCount', windows);
  document.getElementById('locale').textContent = t('uiLocale', chrome.i18n.getUILanguage());

  document.getElementById('open-options').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
