# Logger capture and replay repair

Build 3.0.43.18 repairs restored mission timestamps suppressing fresh observations and oldest-first upload/import/report queues delaying live data. The baseline already called Date.now() for newly emitted events; old captured timestamps are valid backlog evidence and must not be rewritten.

Startup and Europe/London midnight create a new activity session. The current mission list repopulates the live registry; persisted lifecycle timestamps and other tabs' saved registries no longer act as suppression authority. First observation and first dispatch times are captured from live events in UTC ISO form. The top-level at remains epoch milliseconds.

Mission identities include player, mission and event type. Observations are unique per London activity day; completion identities persist across sessions and days; credit identities include the transaction. Bridge SHA-256 identifiers and backend lifecycle keys prevent duplicate lifecycle imports, including legacy random-ID events. Dispatches retain their short-window unit-set identity; changing mission updates are distinct from one-off lifecycle events.

Fresh means a captured event no more than two minutes old on the current London date. A separate live queue lane prioritises mission/session events. Old pending batches retain captured content and IDs. If a previously fresh pending batch ages into backlog, newer live events bypass it. Pending request descriptors are bounded; re-batching retains event IDs for server deduplication. Pause and exact ACK protections remain.

The v1 event schema is unchanged. Additive batch `telemetry[eventId]` contains `isReplay`, `queuedAt`, `uploadedAt` and captured `activityDate`. Delivery metadata is refreshed for each HTTP attempt; captured fields, event IDs and batch creation time never are. Retry comparison excludes delivery metadata but compares every captured field. Old servers accept the core events and ignore the additive envelope. The upgraded server saves the envelope and its own `received_at`, then includes telemetry in existing mission/activity metadata JSON.

`loggerHealth` records newest captured event time, oldest queued captured event time, fresh and backlog counts, queue depth and current London activity date. Google exposes these in the additional Logger Health sheet. Live batches use a separate pending-import folder and priority report-queue status, so client priority also reaches the dashboard.

Google Apps Script revision 9 was deployed on 7 September 2026 at 22:06 Europe/London. Existing endpoint and access settings were preserved. The prior live source was backed up locally and matched the repository baseline before edits.

Validation: 96 automated tests and all eight verification gates passed, including startup restoration, London rollover, replay timestamp preservation, stable identity, aged-pending preemption, exact core retry identity, and live imports ahead of a 12-batch backlog. `audit/logger-report-synthetic.json` is a generated fixture explicitly labelled as synthetic, not a live upload. A newly observed fixture mission had both capture timestamps on the current London date. Store approval and a raw report from a running 3.0.43.18 game session must be verified separately; submission alone does not prove browser delivery.
