// Cookie Peek — popup. Reads, edits, deletes and live-watches the cookies of
// whatever site is in the active tab.
const statusEl = document.getElementById("status");
const listEl = document.getElementById("list");

let origin = null;
let host = null;

init();

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? "";

  if (!/^https?:\/\//.test(url)) {
    statusEl.textContent = "Open an http(s) page — this one has no cookies to show.";
    return;
  }

  origin = new URL(url).origin;
  host = new URL(url).hostname;
  await render();
}

// set() and remove() want a URL; the API hands you a Cookie. Rebuild one.
// The scheme has to match the cookie's `secure` flag or the call silently
// addresses a cookie that doesn't exist, and the leading dot on a domain
// cookie has to go — Google's sample keeps it and notes in a comment that the
// resulting URL may be invalid, which is a footgun I'd rather just remove.
function cookieUrl(cookie) {
  const scheme = cookie.secure ? "https:" : "http:";
  return `${scheme}//${cookie.domain.replace(/^\./, "")}${cookie.path}`;
}

function coversHost(cookieDomain) {
  const domain = cookieDomain.replace(/^\./, "");
  return host === domain || host.endsWith(`.${domain}`);
}

async function render() {
  let cookies;
  try {
    cookies = await chrome.cookies.getAll({ url: `${origin}/` });
  } catch (error) {
    statusEl.textContent = `Couldn't read cookies: ${error.message}`;
    return;
  }

  statusEl.textContent = `${cookies.length} cookie(s) for ${origin}`;
  listEl.textContent = "";

  for (const cookie of cookies) listEl.append(buildRow(cookie));
}

function buildRow(cookie) {
  const row = document.createElement("div");
  row.className = "row";

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = cookie.name;
  name.title = `${cookie.domain}${cookie.path}${cookie.httpOnly ? " · httpOnly" : ""}`;

  const value = document.createElement("input");
  value.value = cookie.value;
  value.addEventListener("change", () => saveCookie(cookie, value.value));

  const watch = document.createElement("button");
  watch.textContent = "watch";
  watch.addEventListener("click", async () => {
    await chrome.storage.local.set({ watch: { name: cookie.name, host } });
    statusEl.textContent = `Watching ${cookie.name} on ${host}`;
  });

  const remove = document.createElement("button");
  remove.textContent = "×";
  remove.addEventListener("click", () => deleteCookie(cookie));

  row.append(name, value, watch, remove);
  return row;
}

async function saveCookie(cookie, value) {
  const details = {
    url: cookieUrl(cookie),
    name: cookie.name,
    value,
    path: cookie.path,
    secure: cookie.secure,
    httpOnly: cookie.httpOnly,
    sameSite: cookie.sameSite,
    storeId: cookie.storeId
  };

  // A host-only cookie has no domain attribute. Send one anyway and you don't
  // update the cookie — you create a second, broader one beside it.
  if (!cookie.hostOnly) details.domain = cookie.domain;
  if (!cookie.session) details.expirationDate = cookie.expirationDate;

  try {
    await chrome.cookies.set(details);
  } catch (error) {
    statusEl.textContent = `set() refused it: ${error.message}`;
  }
}

async function deleteCookie(cookie) {
  try {
    await chrome.cookies.remove({
      url: cookieUrl(cookie),
      name: cookie.name,
      storeId: cookie.storeId
    });
  } catch (error) {
    statusEl.textContent = `remove() refused it: ${error.message}`;
  }
}

// Live updates. This listener lives in the popup because the popup is what's
// on screen — when it closes, the listener goes with it, which is correct.
chrome.cookies.onChanged.addListener(({ cookie }) => {
  if (!origin || !coversHost(cookie.domain)) return;
  // Don't yank the field out from under someone mid-edit.
  if (document.activeElement?.tagName === "INPUT") return;
  render();
});
