# MissionChief Mission Analytics Logger backend

This Apps Script project is bound to the private MissionChief analytics workbook. Command Nexus `1.1.6` uses a deliberately simple identity model for Marty and Conroy: the private web-app URL plus the selected active user name. There are no pairing codes, per-device upload tokens or token-expiry rules.

## Private deployment

1. Open the Apps Script project bound to the logger spreadsheet.
2. Replace `Code.gs` and `appsscript.json` with the current files from this directory.
3. Run **Logger Admin → Initialise / repair logger** once.
4. Confirm the `Players` tab contains one exact active row for `Marty` and one for `Conroy`. Duplicate active display names are rejected.
5. Select **Deploy → New deployment → Web app**. Execute as the owner and allow **Anyone**.
6. Copy the new `/exec` URL. Do not reuse the endpoint embedded in releases before `1.1.6`; that address was public.
7. Keep the new URL private in the workbook/admin notes. Do not commit it, post it in Discord or include it in screenshots.
8. In Nexus, enable Mission Analytics Logger, paste the private URL, choose Marty or Conroy and select **Save logger setup**. Repeat the same setup on any other browser or computer.

The web-app URL is the credential. Anyone who has it can submit as either active user, which is accepted for this two-person private deployment. Rotate to another new deployment URL if it is disclosed.

## v1.1.10 upload-lock hotfix

For an existing private logger, replace `Code.gs`, then open **Deploy → Manage deployments**, edit the current web-app deployment, select **New version**, and deploy. Editing the existing deployment preserves the saved `/exec` URL. Re-running workbook initialisation is not required for this lock-only backend change.

Build `1.1.10-upload-lock-hotfix-1` waits at most two seconds for the shared upload lock. A busy backend returns retryable `LOGGER_BUSY`; Command Nexus keeps the pending batch intact and retries the same batch ID using bounded backoff. The longer 120-second browser acknowledgement window is compatible before and after this backend deployment.

## Browser migration

The first saved v1.1.6 setup clears the old local token, queued events, pending batch, observation dedupe, mission registry and upload lock. Existing workbook history remains. This clean reset is deliberate; legacy queued data is not migrated between identities.

Saving the same private URL and the same user again does not clear a current v1.1.6 queue. Changing the URL or selected user is treated as an intentional identity reset and clears local pending data before the new profile starts.

The browser-generated device ID remains in `Devices` for diagnostics only. It does not authenticate uploads and may move between Marty and Conroy when the saved user changes. The legacy `token_hash` column remains blank for private-profile uploads so the existing workbook schema does not need a destructive migration.

## Workbook authority

- `Players`: authoritative active user IDs and display names.
- `Devices`: diagnostic browser labels, last-seen/upload times and client versions.
- `Mission Events`: accepted mission observations, dispatches, completions and exact-credit evidence.
- `Dispatch Units`: unit-level dispatch, station and journey evidence.
- `Uploads` and `Batch Ledger`: idempotent batch acceptance and retry evidence.
- `Mission Summary`, `Dashboard Data` and `Journey Data`: incremental analytics.
- `Archive Index`: verified weekly rollover records.

Every accepted upload is assigned to the canonical `player_id` resolved from the active Players row. Player IDs inside individual event objects are never trusted. Unknown, disabled or ambiguous names fail closed.

## Compatibility and safety

The backend retains the 40-event server batch limit, 500-unit-per-event limit, same-origin MissionChief reply allow-list, formula-injection protection, semantic dispatch dedupe, compact batch ledger, daily backup and verified weekly archive/purge process.

The existing workbook can remain in place. Deploy this backend as a **new deployment** to create the private URL. The old public deployment may be disabled after both users are confirmed on `1.1.6`.

Current backend build marker:

```text
1.1.10-upload-lock-hotfix-1
```