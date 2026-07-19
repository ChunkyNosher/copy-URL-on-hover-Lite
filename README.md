# Copy URL on Hover Lite

A clean, modern Firefox Manifest V3 extension that copies information from the
link under your pointer. It is a deliberately independent Lite implementation
of the original Chunky Edition: no Quick Tabs, iframes, sidebar manager,
background coordinator, header rewriting, or site-specific handler catalog.

## Features

- Copy a cleaned URL (`Y` by default), removing common tracking parameters.
- Copy a raw URL (disabled by default).
- Copy link text (`X` by default).
- Open the hovered link in a new tab (`O` by default).
- Resolve standard anchors, image-map areas, Shadow DOM event paths, and safe
  `data-href` / `data-url` / `data-link` patterns without guessing from a page.
- Configure shortcuts, tracking removal, and confirmations from the toolbar popup.
- Record shortcuts directly: click a shortcut key slot and press the complete combination.
- Customize pointer tooltips or corner toasts, including color, timing, animation, placement, size, and border; choose a dark or light workspace and density.

The extension never runs shortcuts while a text field or editable control is
focused. It does not inject frames, change response headers, inspect tabs, or
send browsing data anywhere.

## Development and releases

See [DEVELOPER.md](DEVELOPER.md) for local validation, temporary Firefox
loading, release packaging, AMO signing, and Lite product boundaries.
