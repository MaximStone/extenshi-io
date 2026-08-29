// Clean Link — the only JavaScript here that runs on its own.
//
// Note what is NOT in this file: a request handler. Chrome evaluates
// rules.json natively, before any of this runs. Delete every line below
// and the extension still blocks and rewrites exactly as before — the
// worker is a debug console, not part of the request path.

// Exists only for UNPACKED extensions holding "declarativeNetRequestFeedback".
// In a packed Web Store build the whole event object is undefined, so the
// guard is not optional — without it this line throws at worker startup.
if (chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    const { rule, request } = info;
    console.log(
      `[clean-link] rule ${rule.ruleId} in "${rule.rulesetId}" matched ${request.url}`
    );
  });
}
