(() => {
  "use strict";

  const api = globalThis.browser ?? globalThis.chrome;
  const core = globalThis.CopyUrlHoverLite;
  const shortcuts = document.querySelector("#shortcuts");
  const status = document.querySelector("#status");
  let settings = core.normalizeSettings();
  let recordingAction = null;

  const ACTIONS = [
    ["copyUrl", "Copy cleaned URL", "Removes tracking parameters when enabled"],
    ["copyRawUrl", "Copy raw URL", "Keeps the link exactly as published"],
    ["copyText", "Copy link text", "Copies the visible label on the link"],
    ["openLink", "Open link in new tab", "Opens the hovered destination"],
  ];

  function setStatus(message = "", isError = false) {
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function shortcutSignature(shortcut) {
    return shortcut?.key
      ? [
          shortcut.ctrl && "ctrl",
          shortcut.alt && "alt",
          shortcut.shift && "shift",
          shortcut.key,
        ]
          .filter(Boolean)
          .join("+")
      : "";
  }

  function duplicateShortcutActions(candidateSettings = settings) {
    const assigned = new Map();
    const duplicates = [];
    for (const [id, label] of ACTIONS) {
      const signature = shortcutSignature(candidateSettings[id]);
      if (!signature) continue;
      if (assigned.has(signature))
        duplicates.push([assigned.get(signature), label]);
      else assigned.set(signature, label);
    }
    return duplicates;
  }

  function shortcutMarkup(id, label, detail) {
    const row = document.createElement("article");
    row.className = "shortcut";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.className = "shortcut-name";
    title.textContent = label;
    const description = document.createElement("span");
    description.className = "shortcut-detail";
    description.textContent = detail;
    copy.append(title, description);

    const recorder = document.createElement("button");
    recorder.className = "shortcut-record";
    recorder.dataset.action = id;
    recorder.type = "button";
    recorder.setAttribute("aria-label", `Set shortcut for ${label}`);
    recorder.textContent =
      recordingAction === id ? "Press keys…" : core.shortcutLabel(settings[id]);
    recorder.classList.toggle("is-recording", recordingAction === id);

    const clear = document.createElement("button");
    clear.className = "shortcut-clear";
    clear.dataset.clearAction = id;
    clear.type = "button";
    clear.title = `Clear ${label} shortcut`;
    clear.setAttribute("aria-label", `Clear ${label} shortcut`);
    clear.textContent = "×";
    clear.disabled = !settings[id].key;
    row.append(copy, recorder, clear);
    return row;
  }

  function renderShortcuts() {
    shortcuts.replaceChildren(
      ...ACTIONS.map(([id, label, detail]) =>
        shortcutMarkup(id, label, detail),
      ),
    );
  }

  function syncThemeAndDensity() {
    document.documentElement.dataset.theme = settings.darkMode
      ? "dark"
      : "light";
    document.body.dataset.size = settings.menuSize;
  }

  function toggleFeedbackPanels() {
    const isTooltip = settings.notificationDisplayMode === "tooltip";
    document.querySelector("#tooltipSettings").hidden = !isTooltip;
    document.querySelector("#toastSettings").hidden = isTooltip;
  }

  function render(nextSettings = settings) {
    settings = core.normalizeSettings(nextSettings);
    renderShortcuts();
    document.querySelector("#cleanTrackingParameters").checked =
      settings.cleanTrackingParameters;
    document.querySelector("#showNotification").checked =
      settings.showNotification;
    document.querySelector("#notificationToggleLabel").textContent =
      settings.showNotification ? "On" : "Off";
    document.querySelector(
      `input[name="notificationDisplayMode"][value="${settings.notificationDisplayMode}"]`,
    ).checked = true;
    for (const key of [
      "tooltipColor",
      "tooltipDuration",
      "tooltipAnimation",
      "notifColor",
      "notifDuration",
      "notifPosition",
      "notifSize",
      "notifBorderColor",
      "notifBorderWidth",
      "notifAnimation",
      "menuSize",
    ]) {
      document.querySelector(`#${key}`).value = settings[key];
    }
    document.querySelector("#darkMode").checked = settings.darkMode;
    syncThemeAndDensity();
    toggleFeedbackPanels();
  }

  function startRecording(action) {
    recordingAction = action;
    renderShortcuts();
    document.querySelector(`[data-action="${action}"]`).focus();
    const [, label] = ACTIONS.find(([id]) => id === action);
    setStatus(`Listening for ${label}. Press Escape to cancel.`);
  }

  function stopRecording() {
    recordingAction = null;
    renderShortcuts();
  }

  function recordShortcut(event) {
    if (!recordingAction) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    if (
      event.key === "Escape" &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey
    ) {
      stopRecording();
      setStatus("Shortcut capture cancelled.");
      return;
    }
    if (event.metaKey) {
      setStatus(
        "Command/Meta cannot be assigned to a web page shortcut.",
        true,
      );
      return;
    }

    const shortcut = core.shortcutFromKeyboardEvent(event);
    if (!shortcut) {
      setStatus("Hold a modifier, then press a non-modifier key.");
      return;
    }

    const action = recordingAction;
    settings[action] = shortcut;
    stopRecording();
    const duplicates = duplicateShortcutActions();
    setStatus(
      duplicates.length
        ? `${core.shortcutLabel(shortcut)} is already assigned to ${duplicates[0][0]}. Choose a unique shortcut before saving.`
        : `${core.shortcutLabel(shortcut)} assigned to ${ACTIONS.find(([id]) => id === action)[1]}.`,
      duplicates.length > 0,
    );
  }

  function readSettings() {
    const next = core.normalizeSettings(settings);
    next.cleanTrackingParameters = document.querySelector(
      "#cleanTrackingParameters",
    ).checked;
    next.showNotification = document.querySelector("#showNotification").checked;
    next.notificationDisplayMode = document.querySelector(
      'input[name="notificationDisplayMode"]:checked',
    ).value;
    for (const key of [
      "tooltipColor",
      "tooltipDuration",
      "tooltipAnimation",
      "notifColor",
      "notifDuration",
      "notifPosition",
      "notifSize",
      "notifBorderColor",
      "notifBorderWidth",
      "notifAnimation",
      "menuSize",
    ]) {
      const element = document.querySelector(`#${key}`);
      next[key] =
        element.type === "number" ? Number(element.value) : element.value;
    }
    next.darkMode = document.querySelector("#darkMode").checked;
    return core.normalizeSettings(next);
  }

  async function save() {
    const nextSettings = readSettings();
    const duplicates = duplicateShortcutActions(nextSettings);
    if (duplicates.length) {
      setStatus(
        `${duplicates[0][0]} and ${duplicates[0][1]} use the same shortcut. Change one before saving.`,
        true,
      );
      return;
    }
    await api.storage.local.set({ settings: nextSettings });
    render(nextSettings);
    setStatus("Saved. Open pages use the new settings immediately.");
  }

  async function load() {
    const { settings: saved } = await api.storage.local.get("settings");
    render(saved);
  }

  shortcuts.addEventListener("click", (event) => {
    const recorder = event.target.closest("[data-action]");
    const clear = event.target.closest("[data-clear-action]");
    if (recorder) startRecording(recorder.dataset.action);
    if (clear) {
      settings[clear.dataset.clearAction] = {
        key: "",
        ctrl: false,
        alt: false,
        shift: false,
      };
      if (recordingAction === clear.dataset.clearAction) recordingAction = null;
      renderShortcuts();
      setStatus("Shortcut cleared. Save to apply the change.");
    }
  });

  document.addEventListener("keydown", recordShortcut, true);
  document.querySelector("#save").addEventListener(
    "click",
    () =>
      void save().catch((error) => {
        setStatus(`Could not save: ${error.message}`, true);
      }),
  );
  document.querySelector("#reset").addEventListener("click", () => {
    recordingAction = null;
    render(core.normalizeSettings());
    setStatus("Defaults restored. Save to apply them.");
  });
  document.querySelector("#themeToggle").addEventListener("click", () => {
    settings.darkMode = !settings.darkMode;
    document.querySelector("#darkMode").checked = settings.darkMode;
    syncThemeAndDensity();
    setStatus(
      `${settings.darkMode ? "Dark" : "Light"} workspace selected. Save to keep it.`,
    );
  });
  document.querySelector("#darkMode").addEventListener("change", (event) => {
    settings.darkMode = event.target.checked;
    syncThemeAndDensity();
  });
  document
    .querySelector("#showNotification")
    .addEventListener("change", (event) => {
      document.querySelector("#notificationToggleLabel").textContent = event
        .target.checked
        ? "On"
        : "Off";
    });
  document.querySelector("#menuSize").addEventListener("change", (event) => {
    settings.menuSize = event.target.value;
    syncThemeAndDensity();
  });
  document
    .querySelectorAll('input[name="notificationDisplayMode"]')
    .forEach((input) => {
      input.addEventListener("change", (event) => {
        settings.notificationDisplayMode = event.target.value;
        toggleFeedbackPanels();
      });
    });

  void load().catch((error) => {
    render(core.normalizeSettings());
    setStatus(`Could not load saved settings: ${error.message}`, true);
  });
})();
