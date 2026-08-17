# MissionChief User Logger backend

This folder contains the Google Apps Script backend for the opt-in MissionChief
Command Nexus user logger tracked by GitHub issue #334.

## Deployment

1. Open the native `MissionChief User Logger Database` spreadsheet in Google
   Drive.
2. Open **Extensions > Apps Script**.
3. Replace `Code.gs` with the repository `Code.gs` file and enable the manifest
   in Project Settings before replacing `appsscript.json`.
4. Run `initialiseMissionChiefLogger` once and approve the requested Sheet,
   Drive and trigger permissions.
5. Use **Deploy > New deployment > Web app**.
6. Set **Execute as** to the spreadsheet owner and **Who has access** to
   **Anyone**. Authentication is enforced by one-time pairing codes and hashed
   per-device upload tokens, not by Google account access.
7. Record the deployed `/exec` URL in the workbook `Configuration` tab and use
   it as `MF_MISSION_LOGGER_DEFAULT_ENDPOINT` in the Nexus release. Players do
   not need to paste the public endpoint when pairing that release.
8. Run **Logger Admin > Install daily backup trigger**.
9. Run **Logger Admin > Install weekly archive trigger**. It runs at
   approximately 03:15 every Monday in `Europe/London`, after the 02:00 daily
   raw backup.

For an existing live logger, replace `Code.gs`, then use **Deploy > Manage
deployments > Edit**, select **New version**, and deploy. The `/exec` URL and
paired browser tokens remain unchanged; creating a separate deployment is not
required. Open the existing `/exec` URL in an incognito window afterwards and
confirm the JSON contains `"buildId":"1.1.2-dashboard-guard-1"`. If that marker
is missing, Google is still serving the prior deployment even if the script
editor contains the new code.

Do not commit the deployed device tokens or pairing codes. The web app URL is a
public transport address and is not sufficient to upload without a valid
device token.

## Pairing a player

1. Choose **Logger Admin > Create player + pairing** for the first device.
2. Enter the player's display name and either provide or generate a stable
   player ID.
3. Send the displayed one-time code to that player. It expires after 24 hours
   and becomes invalid immediately after use.
4. The player enables **Send my mission analytics automatically** in Nexus,
   enters the pairing code, then selects **Pair this browser**. The release
   already contains the public backend endpoint.
5. Use **Create another device pairing** for a second browser or computer owned
   by the same player.

Each browser/device keeps its own device ID, token and local upload queue while
the backend groups all of them under the same `player_id`. Playing from those
devices at separate times is supported. Pair every browser separately with a
new one-time code. Avoid controlling the same account from two paired browsers
at the same time: dispatch retry protection is device-scoped, so genuinely
concurrent sessions can observe or submit the same mission independently.

Create a separate player for each person. Marty and Conroy therefore receive
different `player_id` values and their events remain separated even though both
upload to this workbook. Local browser storage is origin-specific, so a player
who uses both `www.missionchief.co.uk` and `police.missionchief.co.uk` pairs each
origin as another device on the same player profile.

The `Devices` tab stores only SHA-256 token hashes. **Revoke a device** disables
one browser without affecting the player's other devices.

## Stored data

- `Players`: stable player identity and activity state.
- `Pairings`: one-use pairing records and expiry state.
- `Devices`: player/device mapping and hashed token state.
- `Mission Events`: observed and dispatch events, canonical mission URL, mission
  value, current casualty counts, available generator information,
  requirements and dispatch mode. Possible casualty totals and the generator
  source are retained in `metadata_json`.
- `Dispatch Units`: the exact selected vehicle IDs, types, names and stations
  linked back to their dispatch event, plus MissionChief's dispatch-time
  estimated route distance in kilometres and arrival delay in seconds when
  those native row attributes are available.
- `Uploads`: five-minute batch audit and duplicate acknowledgement.
- `Mission Summary`: one row per player/mission, including first observation,
  first unit sent, native completion time, response time, mission duration and
  advertised/actual credit status.
- `Dashboard Data`: compact daily/player totals retained in the live workbook
  across every archived week, so dashboards can read history plus the current
  week without opening every raw archive.
- `Journey Data`: compact ISO-week/player/station totals, evidence counts,
  maxima and missing-evidence counts for selected-unit distance and ETA. It is
  retained in the live workbook so station-placement analysis survives weekly
  raw rollover without retaining every unit row in the master file.
- `Archive Index`: weekly archive file links, row counts and copy/purge
  verification state.
- `Batch Ledger`: compact accepted-batch identities retained for 35 days so a
  delayed retry cannot recreate rows after its raw batch was archived.
- `Configuration`: schema and deployment reference values.
- `Raw Daily Backups`: generated JSON backups for the previous day.
- `Weekly Archives`: one Google spreadsheet per ISO week containing Mission
  Summary, Mission Events, Dispatch Units, Uploads and a verification manifest.

All operational `*_at` columns use `dd/MM/yyyy HH:mm:ss` in the workbook's
`Europe/London` timezone. The underlying values remain native date-times, not
formatted text.

`estimated_distance_km` and `estimated_eta_seconds` are MissionChief's route
estimates at the moment the unit is selected for dispatch. They are not GPS
tracking or a measured final journey. Nexus stores a blank when MissionChief
does not expose a valid value rather than inventing one. The Dashboard station
table can read retained `Journey Data` across archived weeks; the individual
furthest-dispatch table reads the raw rows still held in the live week.

Advertised mission value and actual awarded credits are deliberately separate.
Nexus captures MissionChief's native mission-finish signal and records first
unit/completion timing. `actual_credits` is filled from an explicit native award
or by reading the signed-in player's same-origin `/credits` transaction list in
the browser. A ledger row is accepted only when it exposes the same mission ID
and title, or is the sole normalized mission-title match inside the bounded
completion window. Ambiguous rows stay `PENDING_TRANSACTION`; the advertised average is
never presented as the actual award. The full account ledger is not uploaded.

If every paired browser was offline when a dispatched mission completed, Nexus
resumes through the same ledger on startup, reconnection or manual Sync. Offline
recovery requires the exact mission ID and normalized title, uses the ledger
timestamp as the finish time, and sends the exact award through the existing
queue and endpoint.

The `1.1.2` journey fields require the replacement backend to be deployed as a
new version of the existing web app. They do not require a new spreadsheet,
deployment URL, dashboard link or pairing code. Existing devices, tokens,
queued events and historical rows remain valid; older rows simply have blank
journey evidence.

MissionChief does not expose a specific generator building for every mission.
When an explicit building ID/name exists it is stored. Otherwise the mission
definition's **Generated by** station type is stored as the name and labelled
`mission-definition` in `metadata_json`; no building ID is guessed. Transport
count also remains blank until its meaning and a reliable live source are
verified.

Batch IDs are persistent on the client and idempotent on the backend. A retry
with the same event set is acknowledged; conflicting reuse is rejected. If a
prior request wrote Mission Events but stopped before all Dispatch Units were
written, the retry appends only the missing unit rows and records a `REPAIRED`
upload audit.

An exact dispatch selection is additionally de-duplicated for 15 seconds. The
client persists that guard across same-origin frames, and the backend derives
its own mission/mode/unit fingerprint. A retry suppressed by the backend drops
both the Mission Events row and its Dispatch Units rows and reports
`ACCEPTED_DEDUPED` in the upload audit.

## Sunday rollover test

Use this sequence before the first automatic Monday run:

1. Replace `Code.gs`, save it, and update the existing web-app deployment to a
   **New version**. Keep the existing deployment and `/exec` URL.
2. Open `/exec` in incognito and verify the response contains
   `"buildId":"1.1.2-dashboard-guard-1"`, the `"credit-ledger-match"` feature and
   the `"dispatch-journey-metrics"` feature.
3. Run `initialiseMissionChiefLogger`. This safely appends the two trailing
   `Dispatch Units` headers, creates/repairs the summary, dashboard, journey,
   archive-index and batch-ledger tabs, and creates the `Weekly Archives`
   folder. Existing rows are not removed.
4. If any uploads reached the previous deployment after initialisation, run
   **Logger Admin > Rebuild mission summary + dashboard** once. This backfills
   completion, timing and Journey Data from all raw rows still in the live
   workbook. Pre-`1.1.2` unit rows correctly count as missing journey evidence.
5. Reload the spreadsheet so the **Logger Admin** menu refreshes.
6. Run **Preview tonight's weekly rollover** and note the row counts.
7. Run **Test archive copy now (keeps live rows)**. A successful result means
   every copied row identity was read back from the weekly file; the live raw
   tabs are deliberately unchanged.
8. Open the new link in `Archive Index` and spot-check Mission Events and
   Dispatch Units.
9. Run **Install weekly archive trigger**. Do not use **Run due weekly rollover
   now** on Sunday: that command only archives weeks already older than the
   current ISO week. The automatic Monday job performs the verified purge.

The archive operation holds a script lock, so simultaneous Marty/Conroy uploads
cannot be interleaved with the copy/purge. It copies in bounded chunks, reads
the destination identities back, and only then removes eligible live rows. A
retry is idempotent. Incomplete dispatched mission summaries remain live for
up to 35 days so a later completion can update the original mission/week.

The live workbook also has a 7.5-million allocated-cell safety threshold. If
uploads reach it before Monday, Apps Script schedules an early verified archive
instead of waiting for the 10-million-cell Google Sheets limit.
