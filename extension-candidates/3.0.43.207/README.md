# Nexus 3.0.43.207 building upgrades candidate

Based on the full .206 candidate, preserving Alliance Auto, personal queue priority and memory fixes. Adds a user-opened credit-only planner in Nexus Tools > Buildings, with dispatch-centre/building-type/search filters, individual/all-match selection, native current/max levels, per-building and bulk checkbox dropdowns, exact review totals, sequential purchases, player/origin-scoped durable checkpoints and no blind retry.

Native expansion quotes (including nonlinear prices) and extension/specialisation controls were inspected read-only in the live game. Actual game purchases were not performed. Existing construction, disabled requirements and coin links are excluded. Maximum means the maximum currently offered by that station's native expand screen. Specialisation purchases start construction and do not switch an existing active specialisation. The game permits only one active specialisation per building.

## Validation

`python package.py` validates exact source bytes and creates the root-manifest package. `node validate.mjs` checks syntax, manifest files, permissions/release key and changelog anchors. `node check-building-upgrades.mjs` runs intercepted browser fixtures (no real game requests). `node check-upgrade-audit.mjs` checks sender validation, player/origin isolation, bounds and storage failure. `node check-update-notes.mjs` checks the update popup and multi-tab claims. The .206 Alliance Auto, priority, memory and vehicle-claims tests are also run with `NEXUS_CANDIDATE_ROOT` pointing here.

This candidate is stacked on the .206 branch while PR #427 remains open. No store submission or change to historical userscript/browser-extension publishing files.
