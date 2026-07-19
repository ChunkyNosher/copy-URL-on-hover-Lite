# Developer Guide

## Local validation

Requires Node.js 22 or newer.

```powershell
npm ci
npm run check
```

## Third-party notice

`vendor/vanilla-picker.csp.min.js` and its matching stylesheet are the
extension-safe CSP build of vanilla-picker 2.12.3. Its ISC license is included
beside those files in `vendor/vanilla-picker.LICENSE.md`.

For the Firefox manifest and packaging checks, use:

```powershell
web-ext lint --source-dir .
web-ext build --source-dir . --artifacts-dir web-ext-artifacts --overwrite-dest
```

The generated artifacts directory is ignored by Git.

## Testing in Firefox

Open `about:debugging#/runtime/this-firefox`, select **Load Temporary Add-on**,
and choose [manifest.json](manifest.json).

## Releases

Publishing a GitHub Release triggers
[Build Firefox release](.github/workflows/release.yml). The tag must match the
version in `manifest.json`, with an optional leading `v`: for example, release
tag `v1.2.0` packages manifest version `1.2.0`.

The workflow runs the project checks and `web-ext lint`, then uploads an
`-unsigned.xpi` archive and `SHA256SUMS.txt` to the published release.

For an installable release build, set repository secrets `AMO_JWT_ISSUER` and
`AMO_JWT_SECRET` from an AMO API credential with unlisted-submission access.
The workflow then also uploads the AMO-signed `.xpi`. The unsigned archive is
for inspection and temporary development loading.

## Lite boundaries

This project intentionally excludes the Chunky Edition's Quick Tabs,
iframes, sidebar manager, background coordinator, header rewriting, and
site-specific URL-handler catalog. Its generic resolver supports conventional
links plus common semantic data-link patterns without broad page-wide DOM
searches that can copy the wrong link.
