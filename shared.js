(() => {
  "use strict";

  const DEFAULT_SETTINGS = Object.freeze({
    copyUrl: { key: "y", ctrl: false, alt: false, shift: false },
    copyRawUrl: { key: "", ctrl: false, alt: false, shift: false },
    copyText: { key: "x", ctrl: false, alt: false, shift: false },
    openLink: { key: "o", ctrl: false, alt: false, shift: false },
    cleanTrackingParameters: true,
    showNotification: true,
    notificationDisplayMode: "tooltip",
    tooltipColor: "#f26b4f",
    tooltipDuration: 1500,
    tooltipAnimation: "fade",
    notifColor: "#4f6df5",
    notifDuration: 2000,
    notifPosition: "bottom-right",
    notifSize: "medium",
    notifBorderColor: "#cbd5e1",
    notifBorderWidth: 1,
    notifAnimation: "slide",
    darkMode: true,
    menuSize: "medium",
  });

  const MODIFIER_KEYS = new Set(["control", "alt", "shift", "meta"]);
  const NOTIFICATION_POSITIONS = new Set([
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
  ]);
  const NOTIFICATION_SIZES = new Set(["small", "medium", "large"]);
  const ANIMATIONS = new Set(["fade", "slide", "bounce"]);
  const MENU_SIZES = new Set(["compact", "medium", "comfortable"]);
  const EDITABLE_SELECTOR =
    'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"]';
  const DIRECT_LINK_SELECTOR = "a[href], area[href]";
  const ARTICLE_SELECTOR = 'article, [role="article"]';
  const RESOLVABLE_SELECTOR = `${DIRECT_LINK_SELECTOR}, [role="link"], ${ARTICLE_SELECTOR}`;

  const TRACKING_PARAMETERS = new Set([
    "fbclid",
    "gclid",
    "gclsrc",
    "dclid",
    "gbraid",
    "wbraid",
    "gad_source",
    "mc_cid",
    "mc_eid",
    "yclid",
    "twclid",
    "ttclid",
    "msclkid",
    "igshid",
    "igsh",
    "ref",
    "ref_",
    "ref_src",
    "ref_url",
    "source",
    "src",
    "campaign",
    "campaign_id",
    "click_id",
    "clickid",
    "trk",
    "trkcampaign",
    "spm",
    "scm",
    "s_kwcid",
    "_ga",
    "_gl",
    "_hsenc",
    "_hsmi",
    "__hstc",
    "__hsfp",
    "__hssc",
    "hsctatracking",
    "mkt_tok",
    "vero_id",
    "rdt_cid",
    "li_fat_id",
    "irclickid",
    "_branch_match_id",
    "guce_referrer",
    "guce_referrer_sig",
    "tag",
    "linkcode",
    "linkid",
    "ascsubtag",
    "pd_rd_w",
    "pd_rd_r",
    "pd_rd_p",
    "pf_rd_p",
    "pf_rd_r",
    "pf_rd_s",
    "pf_rd_t",
    "pf_rd_i",
    "pd_rd_i",
    "pd_rd_wg",
    "content-id",
    "psc",
    "smid",
    "spia",
    "sp_csd",
    "qid",
    "feature",
    "pp",
  ]);

  const AMAZON_HOST_SUFFIXES = [
    "amazon.com",
    "amazon.ca",
    "amazon.com.mx",
    "amazon.com.br",
    "amazon.co.uk",
    "amazon.de",
    "amazon.fr",
    "amazon.it",
    "amazon.es",
    "amazon.nl",
    "amazon.pl",
    "amazon.se",
    "amazon.com.tr",
    "amazon.ae",
    "amazon.sa",
    "amazon.in",
    "amazon.sg",
    "amazon.com.au",
    "amazon.co.jp",
  ];

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  function normalizeKey(value) {
    if (typeof value !== "string") return "";
    const key = value.trim() || (value === " " ? "space" : "");
    if (
      !key ||
      key.length > 32 ||
      MODIFIER_KEYS.has(key.toLowerCase()) ||
      ["dead", "unidentified", "process"].includes(key.toLowerCase())
    ) {
      return "";
    }
    return key.toLowerCase();
  }

  function isEditableElement(element) {
    return Boolean(
      element?.matches?.(EDITABLE_SELECTOR) ||
        element?.closest?.(EDITABLE_SELECTOR),
    );
  }

  function isEditableEvent(event, documentRef = globalThis.document) {
    const path =
      typeof event?.composedPath === "function"
        ? event.composedPath()
        : [event?.target];
    if (path.some(isEditableElement)) return true;

    const visited = new Set();
    let activeElement = documentRef?.activeElement;
    while (activeElement && !visited.has(activeElement)) {
      if (isEditableElement(activeElement)) return true;
      visited.add(activeElement);
      activeElement = activeElement.shadowRoot?.activeElement;
    }
    return false;
  }

  function safeUrl(value, baseUrl) {
    try {
      const url = new URL(value, baseUrl);
      return ["javascript:", "data:", "vbscript:"].includes(url.protocol)
        ? null
        : url.href;
    } catch {
      return null;
    }
  }

  function urlFromElement(element, baseUrl) {
    if (!element?.matches) return null;

    const isDirectLink = element.matches(DIRECT_LINK_SELECTOR);
    if (isDirectLink) {
      const directUrl = safeUrl(
        element.href || element.getAttribute?.("href"),
        baseUrl,
      );
      if (directUrl) return directUrl;
    }

    if (!isDirectLink && !element.matches('[role="link"]')) return null;

    const candidate =
      element.dataset?.href ||
      element.dataset?.url ||
      element.getAttribute?.("data-link");
    const dataUrl = candidate && safeUrl(candidate, baseUrl);
    if (dataUrl) return dataUrl;
    return null;
  }

  function urlFromArticle(element, baseUrl) {
    if (!element?.matches?.(ARTICLE_SELECTOR)) return null;
    const timestampAnchor = element
      .querySelector?.("a[href] time")
      ?.closest?.("a[href]");
    return urlFromElement(timestampAnchor, baseUrl);
  }

  function urlFromNode(node, baseUrl) {
    return urlFromElement(node, baseUrl) || urlFromArticle(node, baseUrl);
  }

  function resolveLink(event, baseUrl = globalThis.location?.href) {
    const path =
      typeof event?.composedPath === "function"
        ? event.composedPath()
        : [event?.target];
    for (const node of path) {
      const url = urlFromNode(node, baseUrl);
      if (url) return { url, element: node };
    }

    const target =
      event?.target?.nodeType === 1
        ? event.target
        : event?.target?.parentElement;
    let candidate = target?.closest?.(RESOLVABLE_SELECTOR);
    while (candidate) {
      const url = urlFromNode(candidate, baseUrl);
      if (url) return { url, element: candidate };
      candidate = candidate.parentElement?.closest?.(RESOLVABLE_SELECTOR);
    }
    return null;
  }

  function normalizeShortcut(value, fallback) {
    const candidate = value && typeof value === "object" ? value : fallback;
    return {
      key: normalizeKey(candidate.key),
      ctrl: Boolean(candidate.ctrl),
      alt: Boolean(candidate.alt),
      shift: Boolean(candidate.shift),
    };
  }

  function normalizeSettings(value) {
    const defaults = cloneDefaults();
    const candidate = value && typeof value === "object" ? value : {};
    const tooltipDuration = Number(candidate.tooltipDuration);
    const notifDuration = Number(candidate.notifDuration);
    const notifBorderWidth = Number(candidate.notifBorderWidth);

    return {
      copyUrl: normalizeShortcut(candidate.copyUrl, defaults.copyUrl),
      copyRawUrl: normalizeShortcut(candidate.copyRawUrl, defaults.copyRawUrl),
      copyText: normalizeShortcut(candidate.copyText, defaults.copyText),
      openLink: normalizeShortcut(candidate.openLink, defaults.openLink),
      cleanTrackingParameters:
        typeof candidate.cleanTrackingParameters === "boolean"
          ? candidate.cleanTrackingParameters
          : defaults.cleanTrackingParameters,
      showNotification:
        typeof candidate.showNotification === "boolean"
          ? candidate.showNotification
          : defaults.showNotification,
      notificationDisplayMode:
        candidate.notificationDisplayMode === "toast"
          ? "toast"
          : defaults.notificationDisplayMode,
      tooltipColor: normalizeColor(
        candidate.tooltipColor,
        defaults.tooltipColor,
      ),
      tooltipDuration: normalizeDuration(
        tooltipDuration,
        defaults.tooltipDuration,
      ),
      tooltipAnimation: normalizeChoice(
        candidate.tooltipAnimation,
        ANIMATIONS,
        defaults.tooltipAnimation,
      ),
      notifColor: normalizeColor(candidate.notifColor, defaults.notifColor),
      notifDuration: normalizeDuration(notifDuration, defaults.notifDuration),
      notifPosition: normalizeChoice(
        candidate.notifPosition,
        NOTIFICATION_POSITIONS,
        defaults.notifPosition,
      ),
      notifSize: normalizeChoice(
        candidate.notifSize,
        NOTIFICATION_SIZES,
        defaults.notifSize,
      ),
      notifBorderColor: normalizeColor(
        candidate.notifBorderColor,
        defaults.notifBorderColor,
      ),
      notifBorderWidth:
        Number.isFinite(notifBorderWidth) &&
        notifBorderWidth >= 0 &&
        notifBorderWidth <= 8
          ? Math.round(notifBorderWidth)
          : defaults.notifBorderWidth,
      notifAnimation: normalizeChoice(
        candidate.notifAnimation,
        ANIMATIONS,
        defaults.notifAnimation,
      ),
      darkMode:
        typeof candidate.darkMode === "boolean"
          ? candidate.darkMode
          : defaults.darkMode,
      menuSize: normalizeChoice(
        candidate.menuSize,
        MENU_SIZES,
        defaults.menuSize,
      ),
    };
  }

  function normalizeColor(value, fallback) {
    return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
      ? value
      : fallback;
  }

  function normalizeDuration(value, fallback) {
    return Number.isFinite(value) && value >= 500 && value <= 10000
      ? Math.round(value)
      : fallback;
  }

  function normalizeChoice(value, values, fallback) {
    return values.has(value) ? value : fallback;
  }

  function matchesShortcut(event, shortcut) {
    if (!shortcut?.key || event.repeat) return false;
    return (
      normalizeKey(event.key) === shortcut.key &&
      event.ctrlKey === shortcut.ctrl &&
      event.altKey === shortcut.alt &&
      event.shiftKey === shortcut.shift &&
      !event.metaKey
    );
  }

  function shortcutLabel(shortcut) {
    if (!shortcut?.key) return "Disabled";
    const modifiers = [
      shortcut.ctrl && "Ctrl",
      shortcut.alt && "Alt",
      shortcut.shift && "Shift",
    ].filter(Boolean);
    const key =
      shortcut.key === "space"
        ? "Space"
        : shortcut.key.length === 1
          ? shortcut.key.toUpperCase()
          : shortcut.key.toUpperCase();
    return [...modifiers, key].join(" + ");
  }

  function shortcutFromKeyboardEvent(event) {
    if (event.metaKey || MODIFIER_KEYS.has(String(event.key).toLowerCase()))
      return null;
    const key = normalizeKey(event.key);
    return key
      ? { key, ctrl: event.ctrlKey, alt: event.altKey, shift: event.shiftKey }
      : null;
  }

  function isAmazonRetailHost(hostname) {
    const normalized = hostname.toLowerCase();
    return AMAZON_HOST_SUFFIXES.some(
      (suffix) => normalized === suffix || normalized.endsWith(`.${suffix}`),
    );
  }

  function canonicalAmazonUrl(url) {
    if (!isAmazonRetailHost(url.hostname)) return null;
    const asin = url.pathname.match(
      /\/(?:dp|gp\/product)\/([a-z0-9]{10})(?:\/|$)/i,
    )?.[1];
    if (!asin) return null;
    const canonical = new URL(url.href);
    canonical.pathname = `/dp/${asin.toUpperCase()}/`;
    canonical.search = "";
    return canonical.href;
  }

  function cleanUrl(urlString) {
    if (typeof urlString !== "string" || !urlString) return urlString;

    try {
      const url = new URL(urlString);
      const amazonUrl = canonicalAmazonUrl(url);
      if (amazonUrl) return amazonUrl;

      for (const key of [...url.searchParams.keys()]) {
        const normalized = key.toLowerCase();
        if (
          normalized.startsWith("utm_") ||
          TRACKING_PARAMETERS.has(normalized)
        ) {
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
    isEditableEvent,
    matchesShortcut,
    normalizeSettings,
    resolveLink,
    shortcutLabel,
    shortcutFromKeyboardEvent,
  });
})();
