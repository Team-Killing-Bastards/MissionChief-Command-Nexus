# Nexus 3.0.43.208 building upgrade scan/review fix

Stacked on .207; preserves .206 Alliance Auto, personal priority and memory fixes.
Corrects native level-query interpretation (target minus one, not target minus
current). Read-only inspection reproduced the failure on the user's Fife Fire
selection, including a new level-zero station and Tayport at level three.

Review loads current quotes and applies bulk choices without requiring Apply.
Scanning continues after station failures; level errors preserve independently
parsed extensions/specialisations. Row errors block affected requested actions,
and retry/deselect is explicit. Choices survive refreshes; row edits override
bulk controls until that bulk field changes. Review lists excluded unavailable
bulk choices and the exact remaining credit total. No purchases occur on Review.

22 intercepted browser checks cover native links at levels 0 and 3, maximum 24,
bulk-before-selection, first-row failure and retry, independent level-read
failure, selection retention, individual overrides, cost changes, prerequisites,
checkpoint failure, uncertain result recovery, duplicate tabs, stop, cleanup and
mobile layout. Audit isolation and notification tests run separately. .206
priority, memory, claims and Alliance Auto tests also run against this source.
All browser fixture requests are intercepted; no real game purchases were made.

`python package.py` verifies exact file hashes and packages 148 runtime files.
`node validate.mjs`, `node check-building-upgrades.mjs`,
`node check-upgrade-audit.mjs` and `node check-update-notes.mjs` verify this
candidate. The release key, permissions and host access remain unchanged.

No store submission or changes to historical publishing files. .206 and .207
candidates remain intact. Changelog links use the immutable documentation commit.
