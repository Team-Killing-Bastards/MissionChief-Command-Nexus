# Rolling logger and extension 3.0.43.19

Raw upload acknowledgements still require a saved JSON file and durable job. Captured timestamps remain immutable. Receipt timestamps are separate.

Build the Apps Script source with `node scripts/build-google-backend.mjs`. Deploy the combined source at the existing URL and run `installNexusRollingLogger`. This switches the existing reporting trigger to the rolling processor without changing clients or deleting historical data.

The processor prioritises live jobs, then reserves work for replay jobs and raw-file backfill. Current-day raw files are revisited first. A separate receipt pins every source file to its archive workbook before any rows are written. Archives roll at two million allocated cells (including buffered rows), below Google's ten-million-cell limit. Oversized records point to their complete original JSON rather than truncating it.

Mission state is partitioned by account and groups of 1,000 mission IDs. Credit state is partitioned by account and London transaction day. Retries replace compact contributions from authoritative state rather than incrementing totals. Dispatch/event IDs and transaction IDs deduplicate repeated reports. Different accounts remain separate. Incoming backlog can correct an earlier observation day without replacing newer mission metadata.

The existing Dashboard Data and Mission Summary tabs remain the reporting interface used by MissionChief Upgrade Planner. The former Activity Log and event tables are retained as legacy evidence; new detailed events go to the Rolling Archives index. No full activity-log scan occurs on the v2 path. Historical recovery is incomplete until all accepted raw files have v2 receipts; partial totals must not be represented as complete income.

Actual revenue requires a captured transaction identity, amount and timestamp. Advertised rewards are estimates, not bank income. Extension .19 adds the mission-ID-scoped native snapshot as the advertised-reward source when the mission page lacks a reward label. It also removes the stale display-version label.

Verification: replay/late-day/credit-conflict tests, archive rollover, interrupted-write receipt retention and fresh-job priority; full extension parity, regression, package and Edge smoke checks.

Operational health: run `nexusRollingHealth`. Check live and backlog flags, last import/report time, error and active archive. Preserved Drive raw files allow recovery even beyond the client's seven-day acceptance window. Disable NX2_ENABLED only for rollback; never erase raw files or receipts to force a retry.
