// Outline It — the offscreen document.
// chrome.runtime is the ONLY extension API available in here, so everything
// arrives and leaves as a message.

chrome.runtime.onMessage.addListener(handleMessage);

// Looked up once at load, not per message: this document's DOM is fixed by
// offscreen.html and never changes. If this is ever null, the <textarea> is
// missing from the HTML — not a timing problem.
const staging = document.getElementById("clipboard-staging");

function handleMessage(message) {
  // Not for us. The target field matters more than it looks: every context
  // in the extension receives every runtime message.
  if (message.target !== "offscreen") return;

  switch (message.type) {
    case "outline-page":
      outlineAndCopy(message.data);
      break;
    default:
      console.warn(`Unexpected message type: '${message.type}'.`);
  }
}

function outlineAndCopy(html) {
  // 1. DOM_PARSER — this line is the entire reason this file exists.
  const doc = new DOMParser().parseFromString(html, "text/html");

  const lines = [];
  for (const heading of doc.querySelectorAll("h1, h2, h3")) {
    const text = heading.textContent.trim().replace(/\s+/g, " ");
    if (!text) continue;
    const depth = Number(heading.tagName[1]) - 1;
    lines.push(`${"  ".repeat(depth)}- ${text}`);
  }

  // 2. CLIPBOARD — navigator.clipboard needs a focused window, and an
  // offscreen document can never be focused. So: stage, select, copy.
  if (lines.length > 0) {
    staging.value = lines.join("\n");
    staging.select();
    document.execCommand("copy");
  }

  chrome.runtime
    .sendMessage({
      target: "service-worker",
      type: "outline-result",
      data: { count: lines.length }
    })
    .catch(() => {
      // Worker asleep with no listener — nothing to do about it here.
    });
}
