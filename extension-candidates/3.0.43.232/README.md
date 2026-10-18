# Nexus 3.0.43.232 — verified empty-mission closure

Based on .231 (`70df6b65424d8791687d5d50bd3b69e74a86c33d`). Local candidate; no browser-store submission.

The .230 export `missionchief-command-nexus-v3-1792348303261.json` stopped on Smoke Inhalation mission 264778035 after Cancel All Units returned HTTP 200. The subsequent read passed the empty-mission checks, but the first-response confirmation gate failed. The response body was not retained, so its exact markup is unknown. .231 allowed other missions to continue but could leave this cleanup unfinished.

## Changed behavior

- A temporary “Cancel All” success flash is diagnostic only. A separate fresh page must identify the exact mission through its native form and confirm no remaining patients, units, transport links, requirements or visible errors before the final cancellation.
- Nexus sends at most two native Cancel All actions for the mission in this game tab's session. It only reports cleanup success when a fresh mission read returns the native completed page or an exact-route 404. An empty unit table or a disappeared warning is insufficient.
- If a worker is replaced after receiving the first successful response, the remaining final step can continue after repeating the fresh checks. A .231 first-attempt record needs a fresh explicit zero count. New failed/uncertain requests and two-step records remain read-only until closure is verified.
- Real patients, foreign missions, unknown totals before the first cancellation, new units, actual transport links, other demands, manual Stop and changed worker ownership block inappropriate cancellation. Guard writes must succeed before each action.
- The .231 queue recovery remains available for an unverified outcome. Vehicle selection, quantities, alternatives, trained personnel, dispatch checks, station crew assignment and initial-worker recovery are unchanged. Normal missions gain no network request or timer.

## Validation and limits

Isolated Edge fixtures reproduce the .231 missing-flash failure and verify .232 closure, fresh mission identity, changing patient/unit state, native literal counts, real saved-record continuation, legacy records, storage failure and the two-step limit across documents. Every request is intercepted; these tests cannot cancel a live mission.

The cleanup controller, throughput, trained-crew, initial-worker-load and earlier recovery production-function checks are rerun against the candidate. Package comparison limits runtime changes to four cleanup/status functions, plus version labels and update notes. The previous station crew fix is retained byte for byte.

The original live stuck mission is no longer present. The currently inspected Smoke Inhalation missions still have real patients and were not cancelled. This build has not yet demonstrated closure of a new live empty-patient mission, and no live throughput or endurance result is claimed. A separate Transport Worker B loading timeout was visible during inspection and is outside this cleanup change.

## Install

Stop Auto Mode. Extract `Nexus-3.0.43.232-Verified-Empty-Mission-Closure.zip` to a fresh folder and load that folder as the unpacked extension, or replace the contents of the existing unpacked folder and reload it. Refresh every MissionChief tab/window so the parent page and mission workers use the same version. Confirm .232 before restarting Auto Mode. Existing settings and Discord identity are retained.

The session guard survives a refresh of the existing game tab. Closing that tab/browser can end its session. Do not clear guards to force cancellation of an unresolved mission.
