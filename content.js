(() => {
  "use strict";

  const api = globalThis.browser ?? globalThis.chrome;
  const core = globalThis.CopyUrlHoverLite;
  if (!api?.storage?.local || !core) return;

  let settings = core.normalizeSettings();
  let hoveredLink = null;
  let notificationHost = null;
  let notificationPanel = null;
  let notificationTimer = null;
  let pointerPosition = { x: 24, y: 24 };

  function textFromElement(element) {
    if (!element) return "";
    const anchor = element.closest?.("a[href], area[href]") || element;
    const text = anchor.textContent?.replace(/\s+/g, " ").trim();
    return (
      text ||
      anchor.getAttribute?.("aria-label") ||
      anchor.getAttribute?.("title") ||
      anchor.querySelector?.("img[alt]")?.alt ||
      ""
    );
  }

  async function copyText(value) {
    if (!value) return false;
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("aria-hidden", "true");
      Object.assign(textarea.style, {
        position: "fixed",
        opacity: "0",
        pointerEvents: "none",
      });
      document.documentElement.append(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied;
    }
  }

  function ensureNotificationHost() {
    if (notificationHost?.isConnected) return notificationPanel;
    notificationHost = document.createElement("div");
    notificationHost.id = "copy-url-hover-lite-notification";
    notificationHost.setAttribute("aria-live", "polite");
    const shadow = notificationHost.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; position: fixed; z-index: 2147483647; pointer-events: none; }
      div { box-sizing: border-box; max-width: min(360px, calc(100vw - 36px)); color: white; box-shadow: 0 8px 28px rgb(0 0 0 / 28%); font-family: system-ui, sans-serif; font-weight: 650; line-height: 1.35; }
      div[data-size="small"] { padding: 7px 10px; border-radius: 6px; font-size: 12px; }
      div[data-size="medium"] { padding: 10px 14px; border-radius: 8px; font-size: 13px; }
      div[data-size="large"] { padding: 13px 18px; border-radius: 10px; font-size: 15px; }
      div[data-animation="fade"] { animation: fade-in 160ms ease-out; }
      div[data-animation="slide"] { animation: slide-in 190ms cubic-bezier(.2, .8, .2, 1); }
      div[data-animation="bounce"] { animation: bounce-in 330ms cubic-bezier(.2, 1.35, .4, 1); }
      @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slide-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      @keyframes bounce-in { 0% { opacity: 0; transform: scale(.88); } 65% { opacity: 1; transform: scale(1.04); } 100% { transform: scale(1); } }
    `;
    notificationPanel = document.createElement("div");
    notificationPanel.setAttribute("role", "status");
    shadow.append(style, notificationPanel);
    document.documentElement.append(notificationHost);
    return notificationPanel;
  }

  function applyNotificationPosition(isTooltip) {
    const host = notificationHost.style;
    host.left = "";
    host.right = "";
    host.top = "";
    host.bottom = "";

    if (isTooltip) {
      host.left = `${Math.min(pointerPosition.x + 14, window.innerWidth - 32)}px`;
      host.top = `${Math.min(pointerPosition.y + 14, window.innerHeight - 32)}px`;
      return;
    }

    const position = settings.notifPosition;
    host[position.startsWith("top") ? "top" : "bottom"] = "18px";
    host[position.endsWith("left") ? "left" : "right"] = "18px";
  }

  function notify(message, success = true) {
    if (!settings.showNotification) return;
    const panel = ensureNotificationHost();
    const isTooltip = settings.notificationDisplayMode === "tooltip";
    const color = success
      ? isTooltip
        ? settings.tooltipColor
        : settings.notifColor
      : "#b91c1c";
    const animation = isTooltip
      ? settings.tooltipAnimation
      : settings.notifAnimation;
    const duration = isTooltip
      ? settings.tooltipDuration
      : settings.notifDuration;
    applyNotificationPosition(isTooltip);
    panel.style.backgroundColor = color;
    panel.style.border = isTooltip
      ? "0"
      : `${settings.notifBorderWidth}px solid ${settings.notifBorderColor}`;
    panel.dataset.size = isTooltip ? "small" : settings.notifSize;
    panel.dataset.animation = "none";
    void panel.offsetWidth;
    panel.dataset.animation = animation;
    panel.textContent = message;
    clearTimeout(notificationTimer);
    notificationTimer = setTimeout(() => notificationHost.remove(), duration);
  }

  async function perform(action) {
    if (!hoveredLink) {
      notify("Hover a link first.", false);
      return;
    }

    if (action === "openLink") {
      const opened = window.open(hoveredLink.url, "_blank", "noopener");
      if (opened) opened.opener = null;
      notify(
        opened ? "Opened link in a new tab." : "Browser blocked the new tab.",
        Boolean(opened),
      );
      return;
    }

    const value =
      action === "copyUrl"
        ? settings.cleanTrackingParameters
          ? core.cleanUrl(hoveredLink.url)
          : hoveredLink.url
        : action === "copyRawUrl"
          ? hoveredLink.url
          : textFromElement(hoveredLink.element);
    const label =
      action === "copyText"
        ? "link text"
        : action === "copyRawUrl"
          ? "raw URL"
          : "clean URL";
    const copied = await copyText(value);
    notify(copied ? `Copied ${label}.` : `Could not copy ${label}.`, copied);
  }

  document.addEventListener(
    "pointerover",
    (event) => {
      pointerPosition = { x: event.clientX, y: event.clientY };
      hoveredLink = core.resolveLink(event, window.location.href);
    },
    true,
  );

  window.addEventListener(
    "keydown",
    (event) => {
      if (core.isEditableEvent(event, document)) return;
      for (const action of ["copyUrl", "copyRawUrl", "copyText", "openLink"]) {
        if (core.matchesShortcut(event, settings[action])) {
          event.preventDefault();
          void perform(action);
          return;
        }
      }
    },
    true,
  );

  api.storage.local
    .get("settings")
    .then(({ settings: saved }) => {
      settings = core.normalizeSettings(saved);
    })
    .catch(() => {});

  api.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.settings)
      settings = core.normalizeSettings(changes.settings.newValue);
  });
})();
