(() => {
  'use strict';

  const DEFAULT_SETTINGS = Object.freeze({
    copyUrl: { key: 'y', ctrl: false, alt: false, shift: false },
    copyRawUrl: { key: '', ctrl: false, alt: false, shift: false },
    copyText: { key: 'x', ctrl: false, alt: false, shift: false },
    openLink: { key: 'o', ctrl: false, alt: false, shift: false },
    cleanTrackingParameters: true,
    showNotification: true,
    notificationColor: '#2563eb',
    notificationDuration: 1600
  });

  const TRACKING_PARAMETERS = new Set([
    'fbclid', 'gclid', 'gclsrc', 'dclid', 'gbraid', 'wbraid', 'gad_source',
    'mc_cid', 'mc_eid', 'yclid', 'twclid', 'ttclid', 'msclkid', 'igshid', 'igsh',
    'ref', 'ref_', 'ref_src', 'ref_url', 'source', 'src', 'campaign', 'campaign_id',
    'click_id', 'clickid', 'trk', 'trkcampaign', 'spm', 'scm', 's_kwcid',
    '_ga', '_gl', '_hsenc', '_hsmi', '__hstc', '__hsfp', '__hssc',
    'hsctatracking', 'mkt_tok', 'vero_id', 'rdt_cid', 'li_fat_id',
    'irclickid', '_branch_match_id', 'guce_referrer', 'guce_referrer_sig',
    'tag', 'linkcode', 'linkid', 'ascsubtag', 'pd_rd_w', 'pd_rd_r', 'pd_rd_p',
    'pf_rd_p', 'pf_rd_r', 'pf_rd_s', 'pf_rd_t', 'pf_rd_i', 'pd_rd_i', 'pd_rd_wg',
    'content-id', 'psc', 'smid', 'spia', 'sp_csd', 'qid', 'feature', 'pp'
  ]);

  const AMAZON_HOST_SUFFIXES = [
    'amazon.com', 'amazon.ca', 'amazon.com.mx', 'amazon.com.br', 'amazon.co.uk',
    'amazon.de', 'amazon.fr', 'amazon.it', 'amazon.es', 'amazon.nl', 'amazon.pl',
    'amazon.se', 'amazon.com.tr', 'amazon.ae', 'amazon.sa', 'amazon.in', 'amazon.sg',
    'amazon.com.au', 'amazon.co.jp'
  ];

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  function normalizeShortcut(value, fallback) {
    const candidate = value && typeof value === 'object' ? value : fallback;
    return {
      key: typeof candidate.key === 'string' ? candidate.key.slice(0, 1).toLowerCase() : '',
      ctrl: Boolean(candidate.ctrl),
      alt: Boolean(candidate.alt),
      shift: Boolean(candidate.shift)
    };
  }

  function normalizeSettings(value) {
    const defaults = cloneDefaults();
    const candidate = value && typeof value === 'object' ? value : {};
    const duration = Number(candidate.notificationDuration);

    return {
      copyUrl: normalizeShortcut(candidate.copyUrl, defaults.copyUrl),
      copyRawUrl: normalizeShortcut(candidate.copyRawUrl, defaults.copyRawUrl),
      copyText: normalizeShortcut(candidate.copyText, defaults.copyText),
      openLink: normalizeShortcut(candidate.openLink, defaults.openLink),
      cleanTrackingParameters:
        typeof candidate.cleanTrackingParameters === 'boolean'
          ? candidate.cleanTrackingParameters
          : defaults.cleanTrackingParameters,
      showNotification:
        typeof candidate.showNotification === 'boolean'
          ? candidate.showNotification
          : defaults.showNotification,
      notificationColor:
        typeof candidate.notificationColor === 'string' && /^#[0-9a-f]{6}$/i.test(candidate.notificationColor)
          ? candidate.notificationColor
          : defaults.notificationColor,
      notificationDuration:
        Number.isFinite(duration) && duration >= 500 && duration <= 10000
          ? Math.round(duration)
          : defaults.notificationDuration
    };
  }

  function matchesShortcut(event, shortcut) {
    if (!shortcut?.key || event.repeat) return false;
    return (
      event.key.toLowerCase() === shortcut.key.toLowerCase() &&
      event.ctrlKey === shortcut.ctrl &&
      event.altKey === shortcut.alt &&
      event.shiftKey === shortcut.shift &&
      !event.metaKey
    );
  }

  function shortcutLabel(shortcut) {
    if (!shortcut?.key) return 'Disabled';
    const modifiers = [shortcut.ctrl && 'Ctrl', shortcut.alt && 'Alt', shortcut.shift && 'Shift'].filter(Boolean);
    return [...modifiers, shortcut.key.toUpperCase()].join(' + ');
  }

  function isAmazonRetailHost(hostname) {
    const normalized = hostname.toLowerCase();
    return AMAZON_HOST_SUFFIXES.some(suffix => normalized === suffix || normalized.endsWith(`.${suffix}`));
  }

  function canonicalAmazonUrl(url) {
    if (!isAmazonRetailHost(url.hostname)) return null;
    const asin = url.pathname.match(/\/(?:dp|gp\/product)\/([a-z0-9]{10})(?:\/|$)/i)?.[1];
    if (!asin) return null;
    const canonical = new URL(url.href);
    canonical.pathname = `/dp/${asin.toUpperCase()}/`;
    canonical.search = '';
    return canonical.href;
  }

  function cleanUrl(urlString) {
    if (typeof urlString !== 'string' || !urlString) return urlString;

    try {
      const url = new URL(urlString);
      const amazonUrl = canonicalAmazonUrl(url);
      if (amazonUrl) return amazonUrl;

      for (const key of [...url.searchParams.keys()]) {
        const normalized = key.toLowerCase();
        if (normalized.startsWith('utm_') || TRACKING_PARAMETERS.has(normalized)) {
          url.searchParams.delete(key);
        }
      }
      return url.href;
    } catch {
      return urlString;
    }
  }

  globalThis.CopyUrlHoverLite = Object.freeze({
    DEFAULT_SETTINGS,
    cleanUrl,
    matchesShortcut,
    normalizeSettings,
    shortcutLabel
  });
})();
