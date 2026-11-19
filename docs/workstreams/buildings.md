# Buildings & upgrades

## 1.3.0 — 14 November 2026

Extension 3.0.43.274 simplifies upgrades to station filters → upgrade choices → review/run. Review performs one scan, applies choices and selects stations still needing them. Individual station choices move into an expandable section. Extension-only work skips the level market.

Additional cell supports All remaining cells or One additional cell. The complete quote counts built plus queued cells against the native maximum. Each subsequent purchase uses the next available native credit route, confirms an increase in committed cell count, and observes the reviewed quantity and credit budget. No guessed IDs, instant completion or coin purchases.

Previous uncertain upgrades hold only their own station and remain in durable storage across other batches. A fresh read can confirm and release them. Lost or failed purchase responses are followed by bounded read-only verification, never purchase replay. Uncertain current-run costs remain reserved. Storage failures and actual availability/price changes still stop. Auto Mode, Alliance, staffing and sharing unchanged.

## 1.2.1 — 14 November 2026

Extension 3.0.43.273 fixes police-cell sharing verification: shared cells use “with the alliance”, whereas unshared cells use “with your alliance”. Both variants are now recognised. A Share + tax batch can finish its selected tax after sharing, and a fresh review of a previously shared cell sends only the remaining tax action. The regression fixture uses CARDENDEN-PS1's native controls. No automatic toggle replay or background work added.

## 1.2.0 — 14 November 2026

Extension 3.0.43.272 adds Hospitals & police cells to Nexus Tools → Buildings. Select facilities by dispatch centre, facility type, sharing state or name, then review and apply alliance sharing and tax. Tax is offered in the native Free/10/20/30/40/50% choices and can be left unchanged independently of sharing. A tax-only batch excludes private facilities; an On-and-tax batch shares them first. Facilities without cells or native sharing controls are excluded.

Fresh native readback verifies every submitted toggle or tax action. Uncertain toggles are not replayed. Stop/Close prevents later changes while allowing the submitted action's verification to finish. Uses the existing building-mutation lock; no scans while closed; at most 100 rows rendered. No changes to Auto Mode or other components.

Added sources: `nexus-building-sharing-core.js`, `nexus-building-sharing.js`.

## 1.1.0 — 14 November 2026

Extension 3.0.43.270 adds a staffing section to Nexus Tools → Buildings. Filter by dispatch centre, service, station type and staffing state; select stations, review desired personnel targets and automatic hiring, then apply native game settings with read-back verification. Target-only forms preserve unrelated building settings. Automatic hiring respects native availability, including Premium access; no coin recruitment or timed-campaign cancellation is performed.

The section is on demand, renders at most 100 rows, caches only recruitment action IDs from each centre for an operation, and performs sequential bounded requests. Stop and disposal prevent later submissions without abandoning verification of an in-flight change. Already-matching stations require no save. Uncertain outcomes stop without replay.

Added sources: `nexus-building-staffing-core.js`, `nexus-building-staffing.js`.

## 1.0.0 — 31 October 2026

Initial independent version baseline, carried forward from extension 3.0.43.240. This does not claim the feature is newly introduced.

Source: `nexus-building-upgrades-core.js`, `nexus-building-upgrades.js`, `nexus-building-delete.js`
