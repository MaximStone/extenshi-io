// Cookie Peek — background. One job: notice when the watched cookie goes away.
// Registered at the top level and unconditionally, so Chrome knows this
// extension cares about cookie changes and can start the worker to deliver one.
// A listener added inside a function is a listener Chrome never hears about.
chrome.cookies.onChanged.addListener(async ({ cookie, cause, removed }) => {
  const { watch } = await chrome.storage.local.get("watch");
  if (!watch || cookie.name !== watch.name) return;

  const domain = cookie.domain.replace(/^\./, "");
  if (!(watch.host === domain || watch.host.endsWith(`.${domain}`))) return;

  // Updating a cookie is implemented as a remove followed by a set, and that
  // remove arrives with cause "overwrite". Count it as a loss and your session
  // watcher fires on every page load that refreshes the token.
  if (removed && cause !== "overwrite") {
    await chrome.storage.local.set({ lostAt: new Date().toISOString(), cause });
    await chrome.action.setBadgeBackgroundColor({ color: "#B3541E" });
    await chrome.action.setBadgeText({ text: "!" });
  } else if (!removed) {
    await chrome.action.setBadgeText({ text: "" });
  }
});
