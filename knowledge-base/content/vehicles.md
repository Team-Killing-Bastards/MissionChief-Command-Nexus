---
{"title":"Vehicle and station naming","description":"Verify a small naming scope before changing the rest of your fleet.","sources":["nexus-runtime.js","nexus-station-rename.js","nexus-tools.js"]}
---
## What this does

Unit Naming and Station Naming generate consistent captions and save them through the game's native forms. They are separate from the read-only data views.

## Prerequisites

Stop personal and Alliance automation. Decide the dispatch centre, station scope and intended naming pattern. Record names for one test station.

## Step by step

1. Open **Unit Naming**.
2. Select **Refresh Dispatch Centres** and choose the intended dispatch centre.
3. Select **Refresh Stations**.
4. Choose **Selected station only** and the station under **Start From**.
5. Review the naming choices in your installed build, including prefix and numbering options. Do not copy unsupported format tokens from an old guide.
6. Read the displayed operation and results before a wider run.
7. Verify saved captions in the actual station list.
8. For station names, open **Station Naming**, refresh stations and choose **Preview only - do not save** first.
9. Inspect the preview. Choose **Rename and save** only when scope and names are correct, then select **Start**.

## Configuration example

On a two-ambulance test station, verify the selected prefix and per-type numbering produce both intended names before widening the scope. This example does not prescribe unverified template syntax.

## Expected result

The log distinguishes changed, skipped and failed operations; the game's saved names match the intended pattern.

## Warnings

> Saved renames change game records. A preview and a saved rename are different outcomes. Stop on unexpected scope or repeated verification failures.

## Troubleshooting

Refresh dispatch centres/stations if the list is empty. Read the log for failed saves instead of repeatedly submitting a bulk run.

**Screenshot status:** Live naming screenshots remain pending; no substitute panel has been fabricated.
