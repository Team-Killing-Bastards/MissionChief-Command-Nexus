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
