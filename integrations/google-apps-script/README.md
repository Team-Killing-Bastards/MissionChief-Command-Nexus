# MissionChief Mission Analytics Logger backend

This Apps Script project is bound to the private MissionChief analytics workbook. Command Nexus `1.1.11` uses a deliberately simple identity model for Marty and Conroy: the approved private web-app URL is compiled into the trusted userscript and the active user is read from MissionChief's navbar profile. There are no pairing codes, per-device upload tokens or token-expiry rules.

## Private deployment

1. Open the Apps Script project bound to the logger spreadsheet.
2. Replace `Code.gs` and `appsscript.json` with the current files from this directory.
3. Run **Logger Admin → Initialise / repair logger** once.
4. Confirm the `Players` tab contains one exact active row for `Marty` and one for `Conroy`. Duplicate active display names are rejected.
5. Select **Deploy → New deployment → Web app**. Execute as the owner and allow **Anyone**.
6. Copy the new `/exec` URL and record it in the workbook Configuration sheet.
7. Compile that approved URL only into the trusted private Command Nexus distribution. Do not post it in public issues, Discord or screenshots.
8. In Nexus, tick **Sharing & Sync**. The endpoint and MissionChief navbar identity are populated automatically; no Save or manual Sync action is required.

The web-app URL is the credential. Anyone who has it can submit as either active user, which is accepted for this two-person private deployment. Rotate to another new deployment URL if it is disclosed.

## v1.1.10 upload-lock hotfix

For an existing private logger, replace `Code.gs`, then open **Deploy → Manage deployments**, edit the current web-app deployment, select **New version**, and deploy. Editing the existing deployment preserves the saved `/exec` URL. Re-running workbook initialisation is not required for this lock-only backend change.

Build `1.1.12-multi-device-performance-1` waits at most two seconds for the shared upload lock. A busy backend returns retryable `LOGGER_BUSY`; Command Nexus keeps the pending batch intact and retries the same batch ID using bounded backoff. The longer 120-second browser acknowledgement window is compatible before and after this backend deployment.

## Browser migration

The historical first saved v1.1.6 setup cleared the old local token and profile-scoped queue. That path is retained only as history.

Command Nexus v1.1.11 provisions the fixed endpoint and navbar identity without invoking profile-scoped cleanup. Existing queued events, pending batch IDs, observation/mission registries and device diagnostics survive the update. Enabling Sharing & Sync requests an immediate bounded backlog drain; disabling it does not delete local data.

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

The existing workbook can remain in place. The current approved `/exec` deployment stays authoritative for the trusted v1.1.11 userscript; rotate it only if the compiled private distribution is disclosed.

Current backend build marker:

```text
1.1.12-multi-device-performance-1
```

## v1.1.12 multi-device deployment

Deploy the merged `Code.gs` as a **new version of the existing web-app deployment**. Do not create a separate deployment: editing the existing deployment preserves the hardcoded `/exec` URL used by Command Nexus.

The v1.1.12 backend grants one short renewable passive-observer lease per MissionChief player and suppresses duplicate cross-device `mission-observed` rows. Each browser keeps its own device identity and continues to upload its own dispatches, selected units, completion and credit evidence.
