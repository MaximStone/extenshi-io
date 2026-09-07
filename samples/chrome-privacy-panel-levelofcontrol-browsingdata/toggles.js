// Clean Slate — the browser-privacy panel.
// `privacy` is OPTIONAL: this panel stays dark until the user asks for it.

const SETTINGS = [
  { group: "services", name: "searchSuggestEnabled",
    label: "Send address-bar keystrokes to your search engine" },
  { group: "services", name: "autofillCreditCardEnabled",
    label: "Offer to autofill credit cards" },
  { group: "websites", name: "hyperlinkAuditingEnabled",
    label: "Send <a ping> tracking pings" },
  { group: "websites", name: "referrersEnabled",
    label: "Send Referer headers" },
  { group: "network", name: "networkPredictionEnabled",
    label: "Pre-resolve DNS and pre-open connections" },
  { group: "websites", name: "topicsEnabled",
    label: "Topics ad-interest groups", offOnly: true }
];

// Why a switch might be dead. Four values; two of them are yours.
const CONTROL_NOTE = {
  controllable_by_this_extension: "",
  controlled_by_this_extension: "currently set by Clean Slate",
  controlled_by_other_extensions: "another extension owns this — your change would lose",
  not_controllable: "locked by enterprise policy or this Chrome build"
};

const list = document.getElementById("privacy-list");
const status = document.getElementById("privacy-status");
const grantButton = document.getElementById("privacy-grant");

const settingOf = ({ group, name }) => chrome.privacy[group][name];

async function render() {
  const rows = await Promise.all(
    SETTINGS.map(async (spec) => ({ spec, ...(await settingOf(spec).get({})) }))
  );

  list.replaceChildren(
    ...rows.map(({ spec, value, levelOfControl }) => {
      const mine =
        levelOfControl === "controllable_by_this_extension" ||
        levelOfControl === "controlled_by_this_extension";

      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = value;
      box.disabled = !mine;
      box.addEventListener("change", () => write(spec, box.checked));

      const label = document.createElement("label");
      if (!mine) label.classList.add("locked");
      label.append(box, ` ${spec.label}`);

      const note = CONTROL_NOTE[levelOfControl];
      if (note) {
        const why = document.createElement("small");
        why.className = "why";
        why.textContent = note;
        label.append(why);
      }
      return label;
    })
  );
}

async function write(spec, value) {
  // Topics, Fledge, ad measurement and Related Website Sets are one-way:
  // an extension may switch them off, and gets an error trying to switch
  // them back on.
  if (spec.offOnly && value === true) {
    status.textContent =
      `Chrome won't let an extension re-enable ${spec.name}. Undo it in chrome://settings.`;
    render();
    return;
  }

  try {
    await settingOf(spec).set({ value });
    status.textContent = "";
  } catch (error) {
    status.textContent = `Chrome refused: ${error.message}`;
  }
  render();
}

function watch() {
  for (const spec of SETTINGS) {
    // Control can be taken from you mid-session — a newly installed
    // extension, or a policy landing on the profile.
    settingOf(spec).onChange.addListener(render);
  }
}

async function start() {
  const granted = await chrome.permissions.contains({ permissions: ["privacy"] });

  if (!granted) {
    status.textContent =
      'Chrome will ask you to allow "Change your privacy-related settings".';
    grantButton.hidden = false;
    return;
  }

  if (!chrome.privacy) {
    status.textContent = "Granted — reopen the popup to use this panel.";
    return;
  }

  grantButton.hidden = true;
  status.textContent = "";
  watch();
  render();
}

grantButton.addEventListener("click", async () => {
  // request() only works inside a user gesture. This click is the gesture.
  const granted = await chrome.permissions.request({ permissions: ["privacy"] });
  if (granted) start();
});

start();
