---
{"title":"Dispatch rules and specialists","description":"Configure selection deliberately and preserve trained-crew checks.","sources":["rules.html","rules.js","rules-core.mjs","nexus-settings.js","nexus-runtime.js"]}
---
## What this does

Unit Finder selects against live mission demand. Requirement rules save mappings for custom requirement wording. Settings add ambulance, officer and equipment behaviour.

## Prerequisites

Stop automation. Check exact requirement wording, vehicle types and assigned trained crew. Prove a mission manually first.

## Step by step: settings

1. Open **Nexus Tools → Settings**.
2. Review **Limit Ambulances per mission** with **Maximum Ambulances per mission**.
3. Review **Automatically include an Ambulance Officer** and its threshold.
4. Review **Automatically include 1 Mass Casualty Equipment** and its threshold.
5. Select **Save settings**.
6. Reopen the relevant game page and test manually before restarting Auto Mode.

**Screenshot pending:** A current capture of this screen is still required. No generated substitute is included.

## Configuration example

In local .235, the ambulance cap defaults off with a stored maximum of 20. Mass Casualty Equipment defaults on with threshold 20. The label says **when Ambulances exceed** the threshold; this is not a promise to add it at exactly 20.

These are source defaults, not recommendations for every fleet. Saved preferences can differ.

## Step by step: requirement rules

1. Open the extension popup and choose **Requirement rules**.
2. Enter the exact wording in the requirement field.
3. Choose the vehicle type and count.
4. Save and inspect the rule list.
5. Reopen the mission and verify manual selection.
6. Correct a wrong mapping before enabling automation.

## Specialist selection

Names do not prove capability. Exact type, assigned trained crew and register evidence matter.

Local .235 prefers eligible road ambulances with verified assigned Critical Care crew for ordinary ambulance demand, then other eligible ambulances. Dedicated Critical Care and HEMS requirements retain separate eligibility. This is a local test behaviour, not a verified Store-wide guarantee.

## Expected result

Selected resources satisfy actual remaining demand. A saved mapping cannot make an unavailable or untrained vehicle eligible.

## Warnings

> A cap can restrict what Nexus sends. Do not bypass specialist checks to force dispatch.

## Troubleshooting

For zero selection, verify full-list loading, availability and mapping. For specialist shortages, check actual crew and register evidence. Compare exact mission wording with the saved rule if it has no effect.

**Screenshot status:** Live rule creation and dispatch result images remain pending.
