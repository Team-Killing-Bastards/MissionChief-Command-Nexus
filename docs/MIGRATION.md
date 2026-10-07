# Migration to the Chrome extension

The supported installation is [MissionChief Command Nexus on the Chrome Web Store](https://chromewebstore.google.com/detail/missionchief-command-nexu/pheccockibcappcdgonjjfcmlkemmaln). Tampermonkey, Violentmonkey, Greasy Fork and raw userscript downloads are no longer the installation route.

## Before switching

1. Stop Auto Mode and any naming, assignment or other batch operation.
2. Record installed versions and export settings/register data wherever the existing UI offers an export.
3. Keep those backups privately. Do not delete browser or site storage to perform the migration.
4. Disable the old combined Command Nexus userscript and both standalone scripts: Mission Finder 2026 Trained Personal Update and MissionChief Unit, Station & Personnel Tools.
5. Disable any duplicate unpacked Nexus extension. Export its data before uninstalling it.

## Install and verify

1. Open the Store link above and select **Add to Chrome**.
2. Reload all MissionChief tabs.
3. Check the version in `chrome://extensions` and confirm Nexus appears once.
4. Review settings, collector-upload preferences and optional Discord sync.
5. Check saved profiles and the personnel register. Use supported import or sync controls where available; do not assume userscript storage or a different extension identity transfers automatically.
6. Run a small administration preview and a manual Unit Finder check before resuming automation.

## Migration test matrix

| Starting state | Required evidence |
|---|---|
| Legacy combined userscript | Disabled script; one extension UI; settings/register checked |
| One or both standalone Marty scripts | Both disabled; no duplicate mission or administration controls |
| Unpacked or different-store extension | Backup retained; duplicate disabled; extension identity and data checked |
| Clean Chrome profile | Safe initialization; collector notice and user controls available |
| Existing Chrome Store installation | Browser update received; open tabs refreshed; settings retained |
| Multiple PCs with optional Discord sync | Correct account/player profile; explicit settings choice; local data checked |

Record the extension version, source commit where available, browser, OS, installation source and result. These checks are required evidence, not a claim that every historical storage combination has been validated.

## Rollback

Stop automation, disable the affected extension and preserve exports and sanitized diagnostics. Report the installed version and failure. Store recovery should ship a corrected higher version after review; do not run old and new Nexus copies together or erase storage as a workaround. Re-enabling an obsolete userscript is not the normal supported rollback route.

## Legacy reference

Command Nexus `3.0.43` in `src/missionchief-command-nexus.user.js` is retained for historical source and regression coverage. It is not the Chrome extension version or installation source.

Storage changes must document old/new formats, precedence, malformed-data handling, cancellation and recovery. See [Testing](TESTING.md) and [Developer Handoff](DEVELOPER_HANDOFF.md).
