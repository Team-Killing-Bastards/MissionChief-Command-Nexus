---
{"title":"Personnel and the register","description":"Separate read-only evidence checks from changes to crew assignments.","sources":["nexus-runtime.js","nexus-personnel-reader.js","nexus-crew-register.js","nexus-assign-crew.js"]}
---
## What this does

The Personnel Register stores exact vehicle/training evidence used for specialist selection. Register verification reads assignments. Live Personnel Assignment can change them.

## Prerequisites

Select the intended dispatch centre, stop automation and check actual staff, training and seats.

## Step by step: verify the register

1. Open **Personnel Assignment**.
2. Refresh dispatch centres and stations.
3. Select the intended scope.
4. Use **Full Verify Register** for an exact scoped audit or **Quick Refresh Register** to reuse unchanged exact records.
5. Wait for completion and inspect failures.
6. Select **Export Register** for a backup.

## Step by step: assign staff

1. Select one station for the initial test.
2. Choose the service and verified training profile.
3. Use **Preview only - do not change assignments**.
4. Inspect proposed assignments, counts and shortages.
5. Use the installed build's live assignment mode only after the plan is correct.
6. Verify the actual vehicle assignment page.
7. Verify the affected register scope before specialist dispatch.

## Expected result

Register verification reports scoped evidence without changing assignments. A successful live assignment is confirmed by a fresh game read.

## Warnings

> A saved profile or a trained staff member is not proof that the person is assigned to the required vehicle. Live assignment changes crew bindings.

The register labels above are from local .235; older builds can differ.

## Troubleshooting

Check exact vehicle ID, assigned crew, completed course and evidence age. Verify the affected scope after checking the game. Repeated cloud sync does not replace a live assignment-page check.

**Screenshot status:** Live register and assignment screenshots remain pending.
