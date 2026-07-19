(() => {
  'use strict';

  const api = globalThis.browser ?? globalThis.chrome;
  const core = globalThis.CopyUrlHoverLite;
  const shortcuts = document.querySelector('#shortcuts');
  const status = document.querySelector('#status');

  const ACTIONS = [
    ['copyUrl', 'Copy cleaned URL'],
    ['copyRawUrl', 'Copy raw URL'],
    ['copyText', 'Copy link text'],
    ['openLink', 'Open link in new tab']
  ];

  function shortcutMarkup(id, label) {
    const row = document.createElement('div');
    row.className = 'shortcut';
    const actionLabel = document.createElement('label');
    actionLabel.className = 'shortcut-name';
    actionLabel.htmlFor = `${id}-key`;
    actionLabel.textContent = label;
    const key = document.createElement('input');
    key.id = `${id}-key`;
    key.dataset.shortcut = id;
    key.dataset.part = 'key';
    key.type = 'text';
    key.maxLength = 1;
    key.autocomplete = 'off';
    const modifiers = document.createElement('div');
    modifiers.className = 'modifiers';
    for (const [part, text] of [['ctrl', 'Ctrl'], ['alt', 'Alt'], ['shift', 'Shift']]) {
      const modifierLabel = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.id = `${id}-${part}`;
      checkbox.dataset.shortcut = id;
      checkbox.dataset.part = part;
      checkbox.type = 'checkbox';
      modifierLabel.append(checkbox, ` ${text}`);
      modifiers.append(modifierLabel);
    }
    row.append(actionLabel, key, modifiers);
    return row;
  }

  function render(settings) {
    shortcuts.replaceChildren(...ACTIONS.map(([id, label]) => shortcutMarkup(id, label)));
    for (const [id] of ACTIONS) {
      for (const part of ['key', 'ctrl', 'alt', 'shift']) {
        const input = document.querySelector(`#${id}-${part}`);
        if (part === 'key') input.value = settings[id].key;
        else input.checked = settings[id][part];
      }
    }
    document.querySelector('#cleanTrackingParameters').checked = settings.cleanTrackingParameters;
    document.querySelector('#showNotification').checked = settings.showNotification;
    document.querySelector('#notificationColor').value = settings.notificationColor;
    document.querySelector('#notificationDuration').value = settings.notificationDuration;
  }

  function readSettings() {
    const settings = core.normalizeSettings();
    for (const [id] of ACTIONS) {
      for (const part of ['key', 'ctrl', 'alt', 'shift']) {
        const input = document.querySelector(`#${id}-${part}`);
        settings[id][part] = part === 'key' ? input.value.trim().toLowerCase() : input.checked;
      }
    }
    settings.cleanTrackingParameters = document.querySelector('#cleanTrackingParameters').checked;
    settings.showNotification = document.querySelector('#showNotification').checked;
    settings.notificationColor = document.querySelector('#notificationColor').value;
    settings.notificationDuration = Number(document.querySelector('#notificationDuration').value);
    return core.normalizeSettings(settings);
  }

  async function save() {
    const settings = readSettings();
    await api.storage.local.set({ settings });
    render(settings);
    status.textContent = 'Saved. New shortcuts apply immediately to open pages.';
  }

  async function load() {
    const { settings } = await api.storage.local.get('settings');
    render(core.normalizeSettings(settings));
  }

  document.querySelector('#save').addEventListener('click', () => void save().catch(error => {
    status.textContent = `Could not save: ${error.message}`;
  }));
  document.querySelector('#reset').addEventListener('click', () => {
    render(core.normalizeSettings());
    status.textContent = 'Defaults restored. Save to apply them.';
  });
  document.addEventListener('input', event => {
    if (event.target.matches('[data-part="key"]')) event.target.value = event.target.value.slice(-1).toUpperCase();
  });

  void load().catch(error => {
    render(core.normalizeSettings());
    status.textContent = `Could not load saved settings: ${error.message}`;
  });
})();
