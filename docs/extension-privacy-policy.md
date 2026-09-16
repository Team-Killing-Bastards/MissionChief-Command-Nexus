# MissionChief Command Nexus — Privacy

Updated 16 September 2026 · Version 3.0.43.106 · Publisher: MartyBlyth

## Automatic collector registration and uploads

New installations enable gameplay uploads by default. Previously saved upload-off preferences are preserved. Nexus registers the browser automatically with https://nexus.blyth.scot using the visible MissionChief username, player ID, a generated device label and random installation credentials. No pairing code is required. An in-game notice provides a collector-settings link and a Turn uploads off control. Uploads can also be disabled in Private collector; local recording continues.

Registration credentials and the upload-only device token are stored locally and excluded from health displays and ordinary event exports. These credentials do not grant reporting-dashboard access. Game labels are self-reported and do not independently verify account ownership. Manual pairing remains available; its bootstrap code is not bundled or retained.

Nexus records game identity, mission activity and game locations, requirements and shortages, selected units, dispatch attempts and observed confirmations, transport activity, completion/disappearance evidence, reliably observed game credits, and building/vehicle registers including staffing and training counts. Records support gameplay reporting, shortage analysis, upgrade planning and fault investigation. No game passwords, session cookies, payment data or unrelated browsing are collected. Game locations and game personnel are not device GPS data or real medical records. The host receives ordinary connection metadata such as IP addresses.

Records are saved locally and uploaded separately from gameplay workers. Acknowledged events are removed from the pending queue; failures retry. Turning uploads off or uninstalling does not delete server records. No automatic server retention period is specified. For deletion requests or privacy questions, use the [support tracker](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues) to request a private contact channel; do not post credentials or private exports publicly. Reports are not sold or used for advertising.

This section supersedes the manual-pairing requirement in the archived .102 policy below. Other browser-local storage, retention and control details remain as described there.

---

<details><summary>Version 3.0.43.102 and earlier policies</summary>

# MissionChief Command Nexus — Privacy

Updated 16 September 2026 · Version 3.0.43.102 · Publisher: MartyBlyth


Nexus assists with MissionChief UK gameplay on the www and police MissionChief websites. It does not monitor unrelated browsing.



## Local records

Nexus stores settings, requirement rules, building and vehicle registers, personnel training information and gameplay records in your browser. Gameplay recording operates locally; pairing is not required for gameplay tools. Records can include your MissionChief username and player ID, mission IDs and names, game mission addresses and map coordinates, generating stations, requirements and shortages, dispatch attempts and observed confirmations, selected vehicles, transport activity, completion or disappearance evidence and reliably observed game credits. Building and vehicle snapshots include their game locations, extensions, staffing and training counts. These are game locations and game personnel, not device GPS data, real medical records or financial payment records.



## Optional collector uploads

This version replaces Google Apps Script, Sheets and Drive uploading with the project owner's HTTPS collector at https://nexus.blyth.scot. Uploads require pairing this browser using the private bootstrap code or importing a device setup issued by the project owner. The collector receives your game identity, device label, recorded events and timestamps. The hosting service also receives ordinary connection metadata, such as IP addresses. Records support gameplay reporting, shortage and upgrade planning, and fault investigation. Game identity labels are read from the game; they are not an independent identity verification.


The bootstrap pairing code is not bundled or retained by the extension. The resulting device token is kept in extension storage and excluded from ordinary health displays and event exports. Do not share private device setup files. Nexus does not intentionally collect game passwords, authentication cookies, private communications, payment details or arbitrary typed input.



## Controls and retention

Open Private collector from the extension popup to inspect pairing, queued records, upload errors and the last successful upload, retry delivery or export pending events. Turning uploads off stops delivery but keeps local recording. Records remain queued until acknowledged by the collector; a storage failure may interrupt recording. Clearing extension data or uninstalling removes extension-local records and tokens. MissionChief site settings are separate. Existing records from the previous Google integration remain locally; Google uploading has been removed.


Uninstalling or pausing uploads does not delete records already received. Collector records have no automatic deletion period specified by this release. For privacy questions or to request deletion of received records, contact the maintainer through the [project support tracker](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues) and ask for a private contact channel. Do not post credentials or private gameplay exports in a public issue. There is no automatic server-side deletion control in this extension.


Reports are not sold or used for advertising. The browser's extension storage and your installation identity are separate between devices; installing a different extension identity does not automatically move your pairing or pending records.

---

<details>
<summary>Previous Google-reporting builds: earlier policy</summary>

# MissionChief Command Nexus — Privacy Policy

Last updated: 5 September 2026  
Publisher: MartyBlyth  
Applies to browser extension version 3.0.43.14.

MissionChief Command Nexus provides mission dispatch and associated fleet-management assistance on the www and police MissionChief UK websites. The extension does not collect analytics from unrelated websites.

## Information stored in your browser

Game-side settings, training registers and diagnostic history use MissionChief site storage. The extension stores custom requirement rules, your sharing preference, a random installation identifier and an offline report queue. These settings do not automatically move to another browser profile or an installation with a different extension ID.

## Optional gameplay reporting

Sharing is off on a fresh installation until you enable it in Sharing & Sync. Explicitly saved choices are preserved on updates.

Enabling sharing sends the following information to the project owner's Google Apps Script service, Google Sheets and Drive archives:

- MissionChief username and player ID, and random installation and session identifiers.
- MissionChief page paths, mission requirements, selected vehicle and station information, and estimated in-game journey distances and times.
- Dispatch and transport actions, game credits, gameplay activity and timestamps.
- Timezone, browser and screen information, errors and performance measurements.

The reporting feature supports Nexus gameplay reports and fault investigation. Google receives ordinary network connection metadata when hosting the service.

Nexus does not intentionally capture passwords, authentication cookies, typed field values, private communications, arbitrary request bodies or full page HTML. Game locations and fictional game patients are not device GPS measurements or real medical records. Game credits are not real payment records.

## Pausing sharing and retention

Turning sharing off stops new report collection and uploads. Previously queued records remain locally until expiry or queue limits apply. The local queue expires records after seven days and is capped at 10,000 events and approximately 8 MiB. Queue limits mean that extended outages can cause reports to be dropped.

Uninstalling the extension removes its extension storage. MissionChief site storage is separate.

Records already received by the Google service are not deleted by pausing or uninstalling. The current backend retains historical records and archives without automatic expiry.

## Deletion requests and contact

For privacy questions or to begin a deletion request, contact the project maintainer through the [project support tracker](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues).

Do not post passwords, tokens, personal contact details or private gameplay exports in a public issue. Ask the maintainer to arrange a private channel if identification or private records are needed. There is currently no automatic server-side deletion facility or published deletion turnaround time.

## Current upload-service limitation

The current upload service does not authenticate the claimed player identity. Player and device labels must not be treated as verified identities. A hidden store listing does not authenticate uploads to that service.

## Policy changes

The version and date at the top identify the extension behaviour described by this policy. Changes to collection or reporting behaviour should be reflected here and in the store disclosures.

</details>

</details>
