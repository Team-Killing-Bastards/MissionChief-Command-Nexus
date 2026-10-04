# Nexus extension changelog

Selected recent extension changes. Each linked entry is bundled with its release. The update notice shows entries newer than the version previously installed in this browser.

3.0.43.206 is a prepared release candidate; this record does not mean it has been published to a browser store.

## v3-0-43-207-building-upgrades

**Review and run building upgrades · 3.0.43.207**

Nexus Tools > Buildings includes an on-demand Building upgrades planner. Filter by dispatch centre (including all centres or unassigned buildings) and building type, search names or IDs, and select individual buildings or all filtered matches. Read native game pages to show the current level, maximum currently available level and exact price of each target level. Choose extensions and specialisations in checkbox dropdowns, individually or in bulk, and review the total credit cost before running.

The planner uses only the game's offered credit actions; disabled prerequisites and existing construction are shown but cannot be purchased again. It starts construction and does not complete it instantly or switch an existing specialisation. MissionChief permits one active specialisation per building. Changes in price or availability stop the run for a new review. A durable checkpoint precedes each purchase; an uncertain result stops the batch and can be checked without resending. Closing Tools stops after the in-flight result has been checked and releases its loaded lists. Building deletion and upgrades share a per-origin browser lock.

Source and browser fixtures are verified separately from real account spending. This candidate has not been submitted to a browser store.

## v3-0-43-206-alliance-auto

**Alliance Auto alongside personal Auto Mode · 3.0.43.206**

An optional background queue sends one chosen support unit per eligible shared mission without waiting for your personal backlog. Enable it in Nexus Tools > Settings > Alliance support; it starts off. Uses the Alliance missions vehicle and value filters, keeps confirmed support history, and pauses on an unconfirmed dispatch.

## v3-0-43-206-upgrade-priority

**Return to missions with missing requirements first · 3.0.43.206**

Personal Auto Mode handles transport requests, then missions with missing requirements, then fresh missions. Missing-requirement missions use older mission IDs first. Changed requirements release an old shortage skip; an unchanged shortage retains its retry cooldown.

## v3-0-43-206-closed-frame-memory

**Release closed mission frames · 3.0.43.206**

Mission ownership records are created in the top window and released when their mission frame closes. Queued reporting data is copied into the top window, so it does not retain a closed mission frame.

## v3-0-43-205-update-notes

**See what changed after an update · 3.0.43.205**

A one-time update notice shows the changes since your previous version. Reopen recent notes in Nexus Tools → Overview. Each change links to its GitHub entry.

## v3-0-43-204-automatic-station-checks

**Automatic station checks across all services · 3.0.43.204**

Checks up to 30 staffed stations or vehicle bases per minute, with a shared allowance across game tabs. Older unchecked stations are prioritised; slow responses can reduce the rate.

## v3-0-43-203-check-a-station

**Check an individual station · 3.0.43.203**

The profile-menu Check a station button accepts an exact station name or ID when you want a fresh check of one location.

## v3-0-43-202-fresh-station-evidence

**Use fresh station evidence between tabs · 3.0.43.202**

Inventory exports reload saved station evidence before syncing, so an older tab does not keep sending its stale cached copy.

## v3-0-43-201-sar-requirements

**Read the complete SAR vehicle requirement · 3.0.43.201**

Mission Update and Auto Mode recognise “Operational Support Vans, Trailers or Personal SAR Vehicles”, prefer Operational Support Vans by default, and can use eligible alternatives.

## v3-0-43-200-multi-pc-sign-in

**Discord sign-in on multiple PCs · 3.0.43.200**

Packaged releases keep a stable extension ID, allowing the configured Nexus account service to recognise sign-in from another PC. Use the same Discord account for your saved profile.

## v3-0-43-192-account-sync

**Personnel register and account sync · 3.0.43.192**

Optional Discord sign-in connects supported settings, saved profiles and personnel-register records across browsers. MissionChief player profiles remain separate, and the local register remains available offline.

## Maintaining future releases

Add a versioned entry to the packaged `nexus-update-notes-data.mjs` and this document together. Keep existing anchors stable. Entries use numeric four-part version comparison; skipped releases are included. The extension reads bundled text, never remote executable code. The seen-version key is local to each installation and is deliberately excluded from account sync.
