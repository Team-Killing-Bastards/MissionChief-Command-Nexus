# Nexus extension 3.0.43.205 candidate

This directory versions the complete current MV3 extension, promoted from the locally tested .204 build. It is independent of the historical .82 pipeline under browser-extension. The canonical userscript remains unchanged.

- [Installable extension source](extension/manifest.json)
- [Versioned change notes](../../docs/extension-changelog.md)
- [Package hashes and file provenance](provenance.json)
- [Update-notice regression test](check-update-notes.mjs)

**Not submitted to Chrome or Edge.** The existing store-publishing path was not changed or triggered. Updating the production store remains a separate next step.

The new notice appears once per update in a visible MissionChief home tab. Changes since the previous version are included; fresh installations receive no update popup. Each item links to its GitHub entry. Nexus Tools → Overview → What’s changed reopens all recent notes. Extension-local storage and a short session claim prevent duplicate notices across tabs and service-worker restarts. The seen version is not synced to another PC.

The .204 runtime, station scanner, account worker and profile sync are retained apart from version strings. New files only implement the notice. No permission or release-ID changes. Privacy text now includes the existing optional Discord sync functionality.

Validation: all packaged JavaScript syntax checked; manifest references and ZIP contents verified; worker regressions cover install, update, repeated reload, multi-tab races, abandoned claims, service-worker restart, numeric versions, separate PCs, sender restrictions and unavailable storage. A local Edge browser fixture checked desktop and mobile layout, dismissal, Escape and manual reopen. These tests do not claim live game dispatch or a store-installed update has been tested.

To run the notice regression: Node 24, Playwright available in your module path, and EDGE_EXECUTABLE_PATH pointing to an installed Chromium browser. Run node extension-candidates/3.0.43.205/check-update-notes.mjs. Screenshots are written to that candidate directory.

To build a store ZIP: run python extension-candidates/3.0.43.205/package.py. It verifies provenance and packages extension/ with manifest.json at the ZIP root. Do not include tests or this README in the store package.
