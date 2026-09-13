# 3.0.43.72: crew accuracy, loading, stability and coastguard preference

This release promotes the tested local build through .72 to the existing Chrome and Edge listings. All application payloads match the local .72 hashes in `reference/store-72.json`; only the manifest display name/version label is changed for store branding. The existing workflow injects the established production reporting destination.

Changes since store .59:

- Assign trained crew to specialist vehicles from the station, verify assignments and update the shared register. Correct personnel binding detection, register writer availability and live trained-profile recognition, including HazMat OSUs. Retain configured maximum crew and qualification checks.
- Sort alliance missions by value and omit zero-value missions.
- Prefer RP CAFS, then WrL CAFS and eligible rescue-pump alternatives for ordinary pump requirements. Prefer CARP before Aerial Appliance for height requirements.
- Stop vehicle pagination early only when stable live vehicles cover supported fresh requirements, including ordinary police cars. Use the complete list for unsupported, changing or trained requirements, and fall back to full loading if partial selection fails. Record bounded loading reasons.
- Bound disposable diagnostics and reclaim only allowlisted diagnostic/cache data when storage is full. Preserve settings, custom rules, registers and operational data. Prevent optional startup writes from crashing Mission Finder.
- Construct cross-frame loading records in the main-page realm so they do not retain retired worker documents.
- Standard coastguard helicopter requirements prefer large type 65 and fall back to standard type 64. Both count toward standard coverage. Explicit large requirements still require 65. This policy supersedes older exact-type rules for these helicopter requirements; other custom rules remain unchanged.

The verification suite retains the existing hardening, adapted regressions, package and interface checks and adds coastguard, selective-loading and real-browser storage/worker-retention fixtures. Legacy assertions are explicitly adapted for the approved new behaviour, including large-helicopter substitution, stable final-page timing and the smaller diagnostic cap. Fixtures do not dispatch or purchase live game vehicles and do not establish a 150-per-hour live rate.

No new permissions or store identities. The canonical userscript release remains independent. Store submission, store approval and delivery to browsers are separate states. Stop Auto Mode and refresh already-open game tabs after receiving the update.
