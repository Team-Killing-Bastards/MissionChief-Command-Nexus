# Nexus extension 3.0.43.206 candidate

Alliance Auto sends one selected support vehicle per eligible shared mission through a separate hidden worker. It can continue while the personal queue is busy and with the Alliance missions panel closed. Enable **Nexus Tools > Settings > Alliance support > Run Alliance Auto in the background**, then Save settings. The default is off.

The vehicle, credit range and sorting come from the existing Alliance missions controls. Confirmed support and existing participation are excluded. Missing cover receives a five-minute retry delay; an unconfirmed native dispatch pauses the automatic queue and keeps its durable checkpoint for Check result. Turning the setting off prevents new dispatches while an already-submitted result is still verified.

Personal mission selection excludes alliance worker documents. Same-tab scalar vehicle claims prevent the two queues from selecting the same vehicle while a dispatch is being prepared. Claims expire and are bounded; they contain no DOM or frame references. The existing origin-level Web Lock and IndexedDB history prevent duplicate alliance sends across tabs in the same browser profile. Different profiles/PCs do not share an atomic fleet reservation.

This candidate also promotes the .205 local fixes: older missing-requirement missions precede fresh missions, a changed requirement releases its previous shortage skip, and closed-frame ownership/reporting references are released. Transport work retains its existing precedence. The update notice includes all three entries and links to an immutable GitHub changelog revision.

- [Installable source](extension/manifest.json)
- [Candidate package](Nexus-3.0.43.206-Alliance-Auto.zip)
- [Versioned changelog](../../docs/extension-changelog.md)
- [Source hashes and provenance](provenance.json)

No new permissions or extension ID changes. The canonical userscript, historical .82 build and browser-store publishing paths remain unchanged. This candidate has not been submitted to Chrome or Edge.

Validation uses isolated browser fixtures, including the actual Settings toggle/save UI, default-off inactivity, a continuously busy personal-controller signal, closed-panel sends, new mission wakeup, saved filters, participation and checkpoint deduplication, cancellation, shortage cooldown, uncertain-result pause, claims and the two-tab Web Lock. The existing storage-quota/checkpoint-failure fixture is retained. Priority and cross-realm memory lifecycle checks run against this candidate. These checks do not prove live game dispatch or a store-installed update.

Run `python extension-candidates/3.0.43.206/package.py` to verify exact extension hashes and rebuild the ZIP with manifest.json at its root. Run `node extension-candidates/3.0.43.206/validate.mjs` for syntax, manifest and changelog checks.

The `check-alliance-auto.mjs`, `check-alliance-storage-failure.mjs` and `check-update-notes.mjs` fixtures use Playwright from browser-extension's development dependencies. The two runtime regressions and vehicle-claims regression use only Node. On Windows fixtures use installed Edge; other platforms use Playwright Chromium. Every game request is fulfilled by the test harness; no live game data or dispatch is used.
