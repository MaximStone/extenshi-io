'use strict';

(() => {
  // MAIN world: `window` here is the page's own window. No chrome.* APIs exist
  // in this file, and the page can see and overwrite everything it defines.
  const KNOWN = [
    { key: 'React', label: 'React' },
    { key: 'jQuery', label: 'jQuery' },
    { key: 'Vue', label: 'Vue' },
    { key: '__NEXT_DATA__', label: 'Next.js' },
    { key: '__NUXT__', label: 'Nuxt' },
    { key: 'ng', label: 'Angular' },
    { key: 'Shopify', label: 'Shopify' },
    { key: 'wp', label: 'WordPress' },
    { key: 'Drupal', label: 'Drupal' },
    { key: 'dataLayer', label: 'Google Tag Manager' },
    { key: 'Stripe', label: 'Stripe.js' },
    { key: 'ethereum', label: 'an injected wallet provider' },
    { key: 'htmx', label: 'htmx' },
    { key: 'Alpine', label: 'Alpine.js' },
    { key: 'd3', label: 'D3' }
  ];

  const found = KNOWN.filter(({ key }) => key in window).map(({ label }) => label);

  // Same document, so location.origin is a valid target. Never post to '*'
  // out of habit — that is how page data leaks into whatever else is listening.
  window.postMessage({ source: 'page-lens-probe', found }, window.location.origin);
})();
