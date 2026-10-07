# Nexus extension changelog

Selected recent extension changes. Each linked entry is bundled with its release. The update notice shows entries newer than the version previously installed in this browser.

The [Chrome Web Store](https://chromewebstore.google.com/detail/missionchief-command-nexu/pheccockibcappcdgonjjfcmlkemmaln) lists 3.0.43.205, checked on 7 October 2026. Browser rollout can lag Store approval. These notes describe the versioned source; the listing version alone does not verify package byte parity.

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
