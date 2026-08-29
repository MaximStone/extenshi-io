const list = document.getElementById('list');
const summary = document.getElementById('summary');

// Permissions that unlock capability well beyond an extension's own UI.
// A sort heuristic, not a verdict.
const HIGH_RISK = new Set([
	'debugger', 'proxy', 'nativeMessaging', 'management',
	'webRequest', 'cookies', 'history', 'downloads',
	'privacy', 'scripting', 'tabCapture', 'desktopCapture',
	'clipboardRead',
]);

const BROAD_HOST = /^(<all_urls>|\*:\/\/\*\/\*|https?:\/\/\*\/\*)$/;

function riskScore(ext, warnings) {
	let n = warnings.length;
	if (ext.hostPermissions.some((h) => BROAD_HOST.test(h))) n += 10;
	else if (ext.hostPermissions.length > 0) n += 3;
	n += ext.permissions.filter((p) => HIGH_RISK.has(p)).length * 3;
	if (ext.installType === 'sideload') n += 8;
	if (ext.installType === 'admin') n += 2;
	return n;
}

async function warningsFor(id) {
	try {
		return await chrome.management.getPermissionWarningsById(id);
	} catch {
		// Some component/enterprise entries refuse. Don't let one blank the list.
		return [];
	}
}

async function collect() {
	const self = await chrome.management.getSelf();
	const all = await chrome.management.getAll();
	const others = all.filter((e) => e.type === 'extension' && e.id !== self.id);

	const rows = await Promise.all(
		others.map(async (ext) => {
			const warnings = await warningsFor(ext.id);
			return { ext, warnings, score: riskScore(ext, warnings) };
		}),
	);

	rows.sort((a, b) => b.score - a.score || a.ext.name.localeCompare(b.ext.name));
	return rows;
}

async function toggle(ext, button) {
	button.disabled = true;
	try {
		// Must run inside a user gesture. Chrome may show its own confirmation,
		// which closes this popup — the onDisabled event still fires.
		await chrome.management.setEnabled(ext.id, !ext.enabled);
	} catch (err) {
		button.disabled = false;
		button.textContent = 'Failed';
		button.title = String(err);
	}
}

function renderRow({ ext, warnings, score }) {
	const li = document.createElement('li');
	li.className = ext.enabled ? 'row' : 'row off';

	const head = document.createElement('div');
	head.className = 'head';

	const name = document.createElement('span');
	name.className = 'name';
	name.textContent = ext.name;

	const badge = document.createElement('span');
	badge.className = 'badge';
	badge.textContent = String(score);
	badge.title = 'Heuristic — higher means broader declared capability';

	head.append(name, badge);

	if (ext.installType !== 'normal') {
		const tag = document.createElement('span');
		tag.className = 'tag';
		tag.textContent = ext.installType;
		head.append(tag);
	}

	const button = document.createElement('button');
	button.textContent = ext.enabled ? 'Disable' : 'Enable';
	button.disabled = ext.enabled ? !ext.mayDisable : ext.mayEnable === false;
	if (button.disabled) button.title = 'Locked by policy — this extension cannot change it';
	button.addEventListener('click', () => toggle(ext, button));
	head.append(button);

	const ul = document.createElement('ul');
	ul.className = 'warnings';
	if (warnings.length === 0) {
		const none = document.createElement('li');
		none.className = 'quiet';
		none.textContent = 'No permission warnings';
		ul.append(none);
	} else {
		for (const w of warnings) {
			const item = document.createElement('li');
			item.textContent = w;
			ul.append(item);
		}
	}

	li.append(head, ul);
	return li;
}

async function refresh() {
	const rows = await collect();
	summary.textContent = `${rows.length} extensions, broadest capability first`;
	list.replaceChildren(...rows.map(renderRow));
}

// Keep the list honest without polling.
for (const event of [
	chrome.management.onEnabled,
	chrome.management.onDisabled,
	chrome.management.onInstalled,
	chrome.management.onUninstalled,
]) {
	event.addListener(refresh);
}

refresh();
