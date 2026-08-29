'use strict';

// Wrapped in an IIFE on purpose. This file gets injected again on every click,
// into the same isolated world — a bare top-level `const` would throw
// "Identifier has already been declared" the second time.
(() => {
  const PANEL_ID = 'page-lens-panel';

  function render(findings) {
    document.getElementById(PANEL_ID)?.remove();

    const panel = document.createElement('div');
    panel.id = PANEL_ID;

    const heading = document.createElement('h2');
    heading.textContent = 'Page Lens';
    panel.append(heading);

    const stats = document.createElement('p');
    stats.textContent =
      `${document.querySelectorAll('a[href]').length} links · ` +
      `${document.images.length} images · ` +
      `${document.scripts.length} scripts`;
    panel.append(stats);

    if (findings.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'lens-dim';
      empty.textContent = 'No known globals on window.';
      panel.append(empty);
    } else {
      const list = document.createElement('ul');
      for (const name of findings) {
        const item = document.createElement('li');
        item.textContent = name;
        list.append(item);
      }
      panel.append(list);
    }

    document.documentElement.append(panel);
  }

  function onMessage(event) {
    // The page can post here too. Treat every field as hostile input.
    if (event.source !== window) return;
    if (event.data?.source !== 'page-lens-probe') return;
    if (!Array.isArray(event.data.found)) return;

    const findings = event.data.found
      .filter((name) => typeof name === 'string')
      .slice(0, 20);

    render(findings);
    chrome.runtime.sendMessage({ type: 'page-lens-result', count: findings.length });
  }

  // The flag lives on the isolated world's own window — the page cannot see it,
  // and it survives until the tab navigates.
  if (!window.__pageLensReady) {
    window.__pageLensReady = true;
    window.addEventListener('message', onMessage);
  }
})();
