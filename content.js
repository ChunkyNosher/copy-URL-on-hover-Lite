(() => {
  'use strict';

  const api = globalThis.browser ?? globalThis.chrome;
  const core = globalThis.CopyUrlHoverLite;
  if (!api?.storage?.local || !core) return;

  let settings = core.normalizeSettings();
  let hoveredLink = null;
  let notificationHost = null;
  let notificationPanel = null;
  let notificationTimer = null;

  function isEditable(element) {
    return Boolean(
      element?.closest?.(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="searchbox"], [role="combobox"]'
      )
    );
  }

  function isSafeUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      return !['javascript:', 'data:', 'vbscript:'].includes(url.protocol);
    } catch {
      return false;
    }
  }

  function urlFromElement(element) {
    if (!(element instanceof Element)) return null;
    if (element.matches('a[href], area[href]') && isSafeUrl(element.href)) return element.href;

    const candidate = element.dataset.href || element.dataset.url || element.getAttribute('data-link');
    if (!candidate || !isSafeUrl(candidate)) return null;
    return new URL(candidate, window.location.href).href;
  }

  function resolveLink(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [event.target];
    for (const node of path) {
      const url = urlFromElement(node);
      if (url) return { url, element: node };
    }

    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    const anchor = target?.closest?.('a[href], area[href]');
    const url = urlFromElement(anchor);
    return url ? { url, element: anchor } : null;
  }

  function textFromElement(element) {
    if (!element) return '';
    const anchor = element.closest?.('a[href], area[href]') || element;
    const text = anchor.textContent?.replace(/\s+/g, ' ').trim();
    return text || anchor.getAttribute?.('aria-label') || anchor.getAttribute?.('title') || anchor.querySelector?.('img[alt]')?.alt || '';
  }

  async function copyText(value) {
    if (!value) return false;
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('aria-hidden', 'true');
      Object.assign(textarea.style, { position: 'fixed', opacity: '0', pointerEvents: 'none' });
      document.documentElement.append(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      return copied;
    }
  }

  function ensureNotificationHost() {
    if (notificationHost?.isConnected) return notificationPanel;
    notificationHost = document.createElement('div');
    notificationHost.id = 'copy-url-hover-lite-notification';
    notificationHost.setAttribute('aria-live', 'polite');
    const shadow = notificationHost.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; position: fixed; right: 18px; bottom: 18px; z-index: 2147483647; }
      div { box-sizing: border-box; max-width: min(360px, calc(100vw - 36px)); padding: 10px 14px; border-radius: 8px; color: white; box-shadow: 0 8px 28px rgb(0 0 0 / 28%); font: 600 13px/1.35 system-ui, sans-serif; animation: enter 160ms ease-out; }
      @keyframes enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
    `;
    notificationPanel = document.createElement('div');
    notificationPanel.setAttribute('role', 'status');
    shadow.append(style, notificationPanel);
    document.documentElement.append(notificationHost);
    return notificationPanel;
  }

  function notify(message, success = true) {
    if (!settings.showNotification) return;
    const panel = ensureNotificationHost();
    const color = success ? settings.notificationColor : '#b91c1c';
    panel.style.backgroundColor = color;
    panel.textContent = message;
    clearTimeout(notificationTimer);
    notificationTimer = setTimeout(() => notificationHost.remove(), settings.notificationDuration);
  }

  async function perform(action) {
    if (!hoveredLink) {
      notify('Hover a link first.', false);
      return;
    }

    if (action === 'openLink') {
      const opened = window.open(hoveredLink.url, '_blank', 'noopener');
      if (opened) opened.opener = null;
      notify(opened ? 'Opened link in a new tab.' : 'Browser blocked the new tab.', Boolean(opened));
      return;
    }

    const value =
      action === 'copyUrl'
        ? settings.cleanTrackingParameters
          ? core.cleanUrl(hoveredLink.url)
          : hoveredLink.url
        : action === 'copyRawUrl'
          ? hoveredLink.url
          : textFromElement(hoveredLink.element);
    const label = action === 'copyText' ? 'link text' : action === 'copyRawUrl' ? 'raw URL' : 'clean URL';
    const copied = await copyText(value);
    notify(copied ? `Copied ${label}.` : `Could not copy ${label}.`, copied);
  }

  document.addEventListener(
    'pointerover',
    event => {
      hoveredLink = resolveLink(event);
    },
    true
  );

  document.addEventListener(
    'keydown',
    event => {
      if (isEditable(event.target)) return;
      for (const action of ['copyUrl', 'copyRawUrl', 'copyText', 'openLink']) {
        if (core.matchesShortcut(event, settings[action])) {
          event.preventDefault();
          void perform(action);
          return;
        }
      }
    },
    true
  );

  api.storage.local.get('settings').then(({ settings: saved }) => {
    settings = core.normalizeSettings(saved);
  }).catch(() => {});

  api.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) settings = core.normalizeSettings(changes.settings.newValue);
  });
})();
