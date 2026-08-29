const ON_YOUTUBE = { url: [{ hostSuffix: 'youtube.com' }] };

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
	if (details.frameId !== 0) return;
	sendRoute(details.tabId, details.url);
}, ON_YOUTUBE);

chrome.webNavigation.onReferenceFragmentUpdated.addListener((details) => {
	if (details.frameId !== 0) return;
	sendRoute(details.tabId, details.url);
}, ON_YOUTUBE);

async function sendRoute(tabId, url) {
	try {
		await chrome.tabs.sendMessage(tabId, { type: 'route-changed', url });
	} catch (err) {
		// "Could not establish connection" is the no-receiver case: the tab
		// is mid-load, or our matches don't cover it. Real errors (a missing
		// host_permissions grant among them) still need to show up in the
		// worker console, or the debug path in "Load it and try it" is a lie.
		if (!String(err).includes('Could not establish connection')) {
			console.warn('[spa-panel] sendMessage failed:', err);
		}
	}
}
