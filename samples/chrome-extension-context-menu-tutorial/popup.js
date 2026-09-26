const list = document.getElementById('clips');
const empty = document.getElementById('empty');
const clearButton = document.getElementById('clear');

function render(clips) {
  list.replaceChildren();
  empty.hidden = clips.length > 0;

  for (const clip of clips) {
    const li = document.createElement('li');

    const text = document.createElement('button');
    text.type = 'button';
    text.className = 'clip-text';
    text.textContent = clip.text;
    text.title = 'Click to copy';
    text.addEventListener('click', async () => {
      await navigator.clipboard.writeText(clip.text);
      text.textContent = 'Copied ✓';
      setTimeout(() => {
        text.textContent = clip.text;
      }, 800);
    });

    const meta = document.createElement('div');
    meta.className = 'clip-meta';

    const when = document.createElement('span');
    when.textContent = new Date(clip.savedAt).toLocaleString();

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'clip-delete';
    del.textContent = 'Delete';
    del.addEventListener('click', async () => {
      const { clips: current = [] } = await chrome.storage.local.get('clips');
      await chrome.storage.local.set({
        clips: current.filter((c) => c.id !== clip.id)
      });
    });

    meta.append(when, del);
    li.append(text, meta);
    list.append(li);
  }
}

async function refresh() {
  const { clips = [] } = await chrome.storage.local.get('clips');
  render(clips);
}

clearButton.addEventListener('click', () => chrome.storage.local.remove('clips'));

// Live updates: saving from the page while the popup is open re-renders the list.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.clips) render(changes.clips.newValue ?? []);
});

document.addEventListener('DOMContentLoaded', refresh);
