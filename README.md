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

The extension never runs shortcuts while a text field or editable control is
focused. It does not inject frames, change response headers, inspect tabs, or
send browsing data anywhere.

## Development

Requires Node.js 22 or newer.

```powershell
npm run check
```

To test it in Firefox, open `about:debugging#/runtime/this-firefox`, choose
**Load Temporary Add-on**, and select [manifest.json](manifest.json).

## Releases

Publishing a GitHub Release triggers
[Build Firefox release](.github/workflows/release.yml). The tag must match the
version in `manifest.json`, with an optional leading `v` (for example,
`v1.2.0` for version `1.2.0`). The workflow validates the project, runs
`web-ext lint`, and uploads an `-unsigned.xpi` archive plus `SHA256SUMS.txt` to
that release.

For an installable release build, add repository secrets `AMO_JWT_ISSUER` and
`AMO_JWT_SECRET`, created from an AMO API credential with unlisted submission
access. The workflow will then also upload the AMO-signed `.xpi`. The unsigned
archive remains useful for inspection and temporary development loading.

## Product boundaries

The original project’s large catalog of per-site URL handlers was replaced with
a generic resolver by design. It preserves conventional links and common
semantic data-link patterns, while avoiding broad DOM searches that can copy a
nearby but incorrect link.
