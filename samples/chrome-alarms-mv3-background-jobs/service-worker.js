const ALARM_NAME = "tab-curfew-check";
const PERIOD_MINUTES = 15;
const DEFAULTS = { threshold: 20, nudges: 0 };

async function createAlarm() {
  const alarmInfo = { periodInMinutes: PERIOD_MINUTES };
  try {
    await chrome.alarms.create(ALARM_NAME, {
      ...alarmInfo,
      persistAcrossSessions: true
    });
  } catch {
    // Chrome < 150 and other browsers reject the flag; the plain create
    // still persists in Chrome, and ensureAlarm() covers the rest.
    await chrome.alarms.create(ALARM_NAME, alarmInfo);
  }
}

chrome.runtime.onInstalled.addListener(createAlarm);

async function ensureAlarm() {
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing) await createAlarm();
}

async function checkTabs() {
  // Read settings fresh on every wake. There is no "last time" in memory.
  const { threshold, nudges } = await chrome.storage.local.get(DEFAULTS);
  const tabs = await chrome.tabs.query({});
  const over = tabs.length > threshold;

  await chrome.action.setBadgeBackgroundColor({
    color: over ? "#FB5B1A" : "#5B8C5A"
  });
  await chrome.action.setBadgeText({ text: String(tabs.length) });

  if (over) {
    // Write it back, because this variable is gone in ~30 seconds.
    await chrome.storage.local.set({ nudges: nudges + 1 });
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  await checkTabs();
});

ensureAlarm();
checkTabs();
