function t(key, ...substitutions) {
  return chrome.i18n.getMessage(key, substitutions.length ? substitutions : undefined);
}

// chrome.i18n has no plural support. Intl does — so let it pick the key.
function tPlural(base, count) {
  const rule = new Intl.PluralRules(chrome.i18n.getUILanguage()).select(count);
  return t(`${base}_${rule}`, String(count)) || t(`${base}_other`, String(count));
}

function localizePage(root = document) {
  for (const el of root.querySelectorAll('[data-i18n]')) {
    const message = t(el.dataset.i18n);
    if (message) el.textContent = message;
  }
  document.documentElement.lang = chrome.i18n.getUILanguage();
  document.documentElement.dir = t('@@bidi_dir') || 'ltr';
}

document.addEventListener('DOMContentLoaded', () => localizePage());
