---
{"title":"Discord account and sync","description":"Keep supported settings, profiles and personnel evidence available across browsers.","sources":["account.html","account.js","nexus-account-worker.mjs","nexus-tools.js","nexus-profile-sync.js"]}
---
## What this does

Optional Discord sign-in identifies a Nexus account for cross-browser sync. Each MissionChief player ID has its own saved profile. Local register data remains available offline.

## Prerequisites

Install the intended extension, sign in to MissionChief and stop automation. Decide whether device or cloud settings should be the starting point.

## Step by step

1. Open **Nexus Tools → Overview → Nexus account & sync**.
2. Select **Open Nexus account**.
3. Select **Sign in with Discord** and finish the authorisation flow.
4. Return to MissionChief.
5. Choose **Keep device settings** to save this browser's supported settings/profiles, or **Use saved cloud settings** to restore them here.
6. Select **Sync now** and read its status.
7. Reopen the relevant game page after downloaded preferences apply.

**Screenshot pending:** A current capture of this screen is still required. No generated substitute is included.

## Expected result

The account screen reports sign-in and sync state. The UI describes ten-minute sync while the game home page is open. Register sync shares saved evidence; it does not check current assignments.

## Warnings

> Stop Auto Mode before selecting a settings direction. **Use saved cloud settings** can replace supported local settings and profiles. Neither direction button replaces the personnel register.

Signing in and joining a Discord server are separate actions.

## Troubleshooting

For an unrecognised installation, use the fixed-ID release intended by the maintainer. Do not edit keys or bypass redirect validation. For old training evidence, verify the register against the game instead of repeatedly syncing.
