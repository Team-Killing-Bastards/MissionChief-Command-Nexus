# Nexus 3.0.43.209 specialisation pricing candidate

Stacked on .208, preserving its scan/review fixes and the existing personal
Auto Mode, Alliance Auto and memory behaviour. Responds to the user's live
report: a successful specialisation purchase increases the next native price,
so .208's fixed-price preflight stopped before the following station.

Specialisations now use their freshly offered native credit price, bounded by
the run's maximum credit budget. Review suggests quoted total plus 50% of the
specialisation subtotal only, as approved by the user. The suggestion is an
editable allowance, not a prediction of the game's pricing formula. The run
button displays the limit. Budgets below the quote cannot start; each action
checks remaining budget before creating its pending checkpoint. No unused
allowance is spent. Level/extension price mismatches still stop for review.
Availability, native path/method, cross-tab lock and uncertainty guards remain.
Fresh prices are recorded for verified purchases. A limit/availability stop
invalidates the old review; Review excludes work already started and permits
continuation with a revised budget without purchasing it again.

28 intercepted Edge checks retain all .208 cases and add account-wide price
increases, capped runs and resumption, manually edited limits, disabled options,
price decreases and unconfirmed specialisation results. Budget UI is also
checked at mobile width. Audit isolation, update notices and preserved .206
priority, memory, claims and Alliance Auto regressions run separately.

All fixtures intercept game requests. No real game purchases or store
publication were performed. Native pricing behaviour is reported by the user;
this candidate does not guess or encode a specialization cost formula.
`python package.py` verifies 148 runtime files; `node validate.mjs` checks
syntax, manifest references, unchanged permissions/release key and changelog.
