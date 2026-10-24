---
{"title":"Create and apply station profiles","description":"Define vehicle and crew targets, then review the real station before applying.","sources":["nexus-station-profiles-ui.js","nexus-station-profiles-core.js","nexus-station-profiles-engine.js","nexus-station-profiles-store.js","nexus-station-profiles-data.js"]}
---
## What this does

Saving a profile defines targets without changing a station. Applying it can remove non-profile vehicles, buy missing vehicles, run vehicle naming and fill eligible empty crew seats.

## Prerequisites

Stop automation and other administration. Check credits, station capacity, extensions and trained staff. Start with one station.

## Step by step: create

1. Open **Nexus Tools → Profiles**.
2. Choose **New profile**.
3. Enter **Profile name** and select **Profile type**.
4. Add **Specialisation / note** if useful. It is a label, not an extension purchase.
5. Decide whether to enable **Run Nexus vehicle naming**.
6. Filter the vehicle list and tick **Use**.
7. Set **Units**. For staffing, tick **Assign crew**, set **Crew per unit** and select **Required training**.
8. For supported IRV role groups in local .235, use **+ Add IRV role** with clear role names and targets.
9. Select **Save profile** and read confirmation.

**Screenshot pending:** A current capture of this screen is still required. No generated substitute is included.

## Configuration example

Create an Ambulance station profile called **Training test** with one Ambulance and a crew target within its displayed maximum. Require only training actually available on staff. This is a small validation example, not a service-wide policy.

## Step by step: apply

1. Open a matching station.
2. Beside Vehicle Market, select its **Station profile**. Refresh saved profiles if necessary.
3. Select **Review**.
4. Read **Keep**, **Remove after approval**, **Purchase with credits**, **Blocked**, **Crew targets** and **Current role allocation**.
5. Check maximum spend and every listed vehicle ID.
6. Correct any wrong removal before approving anything.
7. Only when correct, tick the permanent removal/purchase confirmation and select **Confirm and apply profile**.
8. Watch the log, then refresh the actual station and verify fleet and staff.

## Expected result

Profiles are filtered by building type. Existing crew bindings remain; eligible empty seats are filled. Extra vehicles of allowed types can remain. The actual review defines the proposed operation.

## Warnings

> **Application can permanently remove listed vehicles and spend credits.** Labels do not activate building extensions. **Stop** takes effect after the current change is verified and is not an undo button.

## Troubleshooting

Check building type and main-game player identity if the profile is absent. For uncertain operations, inspect the station before clearing a checkpoint. **I checked the station - clear checkpoint** is only for a confirmed resolved request and requires a fresh review.

**Screenshot status:** Editor, live review and post-application images remain pending.
