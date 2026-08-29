const domainInput = document.getElementById("domain");
const rulesList = document.getElementById("rules");
const matchesList = document.getElementById("matches");

// Dynamic rules live in their own ID space, separate from the static
// ruleset's. Starting well above the static IDs keeps a matched-rule
// log readable at a glance — rule 1001 is obviously "one I added".
const DYNAMIC_ID_BASE = 1000;

function fill(list, items, emptyText) {
  const rows = items.length ? items : [emptyText];
  list.replaceChildren(
    ...rows.map((text) => {
      const li = document.createElement("li");
      li.textContent = text;
      return li;
    })
  );
}

// Read-then-write, so two calls in flight at once can pick the same ID and
// the second updateDynamicRules() throws. Fine for a popup driven by one
// click at a time; not fine anywhere concurrent.
async function nextRuleId() {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  return existing.reduce((max, rule) => Math.max(max, rule.id), DYNAMIC_ID_BASE) + 1;
}

async function renderRules() {
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  fill(
    rulesList,
    rules.map((rule) => `${rule.id}: ${(rule.condition.requestDomains ?? []).join(", ")}`),
    "nothing yet"
  );
}

async function renderMatches() {
  // Needs "declarativeNetRequestFeedback". Chrome drops matches older than
  // five minutes that aren't tied to a live document.
  const { rulesMatchedInfo } = await chrome.declarativeNetRequest.getMatchedRules();
  const recent = rulesMatchedInfo.slice(-8).reverse();
  fill(
    matchesList,
    recent.map((match) => `rule ${match.rule.ruleId} · ${match.rule.rulesetId}`),
    "nothing yet"
  );
}

document.getElementById("add").addEventListener("click", async () => {
  const domain = domainInput.value.trim().toLowerCase();
  if (!domain) return;

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [
        {
          id: await nextRuleId(),
          priority: 2,
          action: { type: "block" },
          condition: {
            requestDomains: [domain],
            resourceTypes: ["main_frame", "sub_frame", "script", "xmlhttprequest", "image"]
          }
        }
      ]
    });
    domainInput.value = "";
  } catch (error) {
    // A malformed domain, or a duplicate ID from two fast clicks.
    fill(rulesList, [`could not add: ${error.message}`], "");
    return;
  }

  await renderRules();
});

document.getElementById("clear").addEventListener("click", async () => {
  try {
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: existing.map((rule) => rule.id)
    });
  } catch (error) {
    fill(rulesList, [`could not clear: ${error.message}`], "");
    return;
  }

  await renderRules();
});

renderRules();
renderMatches();
