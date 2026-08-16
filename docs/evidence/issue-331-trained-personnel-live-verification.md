# Issue 331 — trained-personnel live-verification regression

## Reported production symptom

The user reported that trained-personnel selection worked before `v1.0.123`,
but `v1.0.123` and later releases reported every relevant qualification as
missing. The supplied live screenshot showed the fail-closed alert and Auto
Mode stop reason for Railway Police Officer, Level 1 Public Order, Police
Sergeant, Police Inspector and Dispatch/Search Advisor requirements.

Names, vehicle identifiers and account-specific mission data from the supplied
screenshot are not retained here.

## Repository evidence

`v1.0.123` changed `isCheckboxEligibleForTrainingRequirement()` so final
trained-personnel selection rejects a vehicle unless it already has fresh,
complete, exact-vehicle qualification evidence. That is the correct final
selection and dispatch contract.

The same strict helper was also used by
`refreshPoliceInspectorRegistryFromLiveVehicles()` to construct the candidate
pool for live verification. This created a circular dependency:

1. A missing or stale register entry needs a live assignment-page scan.
2. The pre-verification pool required the entry to already be fresh.
3. The vehicle was excluded before the scan could refresh it.
4. Valid trained staff were therefore reported as zero.

`v1.0.124` changed only Search Dog Unit identity and retained this trained-
personnel path, so `v1.0.123` is the first affected release.

## Locked correction

The live-verification candidate pool uses exact compatible vehicle-type
eligibility without requiring prior qualification evidence. Missing and stale
entries can therefore be refreshed from each exact vehicle's live assignment
page.

Final trained-vehicle selection, mission readiness and Auto Mode dispatch still
require fresh, complete, exact-vehicle qualification evidence. Missing, stale,
partial and wrong-type evidence remains fail-closed.

## Permanent regression

`scripts/check-trained-personnel-live-verification-pool.mjs` locks the boundary:

- exact compatible vehicles with missing or stale evidence enter live
  verification;
- wrong vehicle types do not enter the verification pool;
- missing or stale evidence cannot pass final trained-personnel selection; and
- fresh authoritative evidence remains eligible for final selection.
