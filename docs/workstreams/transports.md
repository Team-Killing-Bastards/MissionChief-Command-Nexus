# Patient & prisoner transport

## 1.0.1 — 13 November 2026

Extension .269 bounds consecutive Worker B requests to two, with an eight-second batch budget checked between requests whenever the existing minimum actionable mission supply is available. In-flight native transport actions retain their existing completion/timeout handling. A protected mission turn then prevents unrelated new transport requests from immediately taking Worker A away. Native mission advance or classified skip releases the protection, allowing transports another turn. A request belonging to A's current mission can still be serviced, and requests continue draining during low mission supply.

The exported stall contained 27 B starts and seven reopens of the same waiting mission between normal dispatches. The isolated scheduler regression reproduces the old unbounded drain; the new sequence completes all 30 simulated requests with 14 intervening A turns and no duplicate B starts. Patient/prisoner destination actions, personal-request matching, completion verification, retry cooldowns and per-request timeouts are unchanged. No live transport was submitted during testing.

## 1.0.0 — 31 October 2026

Initial independent version baseline, carried forward from extension 3.0.43.240. This does not claim the feature is newly introduced.

Source: Logical workstream within `nexus-runtime.js`; extraction into a separate module remains future work.
