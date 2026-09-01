# Evidence Register

Evidence records support a specific decision, issue or live-validation claim. They are not the current operating state. Start with [`project-state.json`](../../project-state.json) and [`PROJECT_STATE.md`](../PROJECT_STATE.md).

## Rules

- Store a concise sanitised summary in the repository.
- Keep raw diagnostic JSON outside the current-state document unless a small, reviewed fixture is required for an executable test.
- Record the source version, environment, time window, observed facts, limits and the exact claim the evidence supports.
- Do not include credentials, cookies, webhook URLs, personnel names, private alliance data or unnecessary account detail.
- A later release or ADR may supersede the conclusion without rewriting the historical evidence.

## Current long-session evidence

- [Strong v3.0.39 live run and memory-risk baseline — 2026-08-30](live-run-v3.0.39-2026-08-30.md)

## Existing capability evidence

The other files in this directory retain issue-specific sanitised captures for medical, Fire/Airfield, SAR/Coastguard training profiles and exact MissionChief vehicle identities. Their issue number and file name identify the protected contract.
- [Hot Brakes standalone Airfield command mapping failure — v3.0.40](hot-brakes-airfield-command-v3.0.40-2026-09-01.md)
