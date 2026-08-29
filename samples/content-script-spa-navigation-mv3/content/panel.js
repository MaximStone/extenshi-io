let teardown = null;
let renders = 0;

function renderPanel(url) {
	if (teardown) teardown();
	renders += 1;

	const { pathname, search } = new URL(url);

	const panel = document.createElement('div');
	panel.id = 'spa-route-panel';

	const route = document.createElement('code');
	route.textContent = pathname + search;

	const count = document.createElement('span');
	count.textContent = `render #${renders}`;

	const close = document.createElement('button');
	close.textContent = '×';
	const onClose = () => panel.remove();
	close.addEventListener('click', onClose);

	panel.append(route, count, close);
	document.body.append(panel);

	teardown = () => {
		close.removeEventListener('click', onClose);
		panel.remove();
	};
}

chrome.runtime.onMessage.addListener((message) => {
	if (message?.type === 'route-changed') renderPanel(message.url);
});

renderPanel(location.href);
