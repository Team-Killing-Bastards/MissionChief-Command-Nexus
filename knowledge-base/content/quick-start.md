---
{"title":"Quick Start","description":"Install Nexus, verify your crew evidence and complete a supervised automated dispatch.","sources":["manifest.json","popup.html","account.html","nexus-tools.js","nexus-runtime.js","nexus-settings.js"]}
---
## 1. Install a single copy

**Prerequisites:** Desktop Chrome, a MissionChief UK account and the official extension listing.

1. Open the [Chrome Web Store listing](https://chromewebstore.google.com/detail/missionchief-command-nexu/pheccockibcappcdgonjjfcmlkemmaln).
2. Check its publisher and version, select **Add to Chrome** and read the permission prompt.
3. Disable duplicate Nexus extensions and older Nexus userscripts.
4. Sign in to [MissionChief UK](https://www.missionchief.co.uk/) or [Police MissionChief UK](https://police.missionchief.co.uk/), then refresh the game.
5. Check the installed version in Chrome's extension management page.

**Expected result:** One Nexus interface. If missing, check the extension is enabled, the site is supported and duplicate scripts are disabled.

## 2. Open Nexus and get support

1. Open the extension popup on a supported game tab.
2. Choose **Open Nexus**.
3. Open **Nexus Tools** from the game's Help menu.
4. Use **Discord support** if you need help obtaining access.

**Screenshot pending:** A current capture of this screen is still required. No generated substitute is included.

Joining Discord and signing in with Discord are separate actions. A mandatory membership or approval procedure has not been verified. Discord sign-in is not asserted to be required for local dispatch.

## 3. Connect optional account sync

1. In **Nexus Tools → Overview**, find **Nexus account & sync**.
2. Choose **Open Nexus account**, then **Sign in with Discord**.
3. Complete the Discord authorisation window.
4. Stop Auto Mode before choosing **Keep device settings** or **Use saved cloud settings**.
5. Select **Sync now** for an immediate sync and read its status.

**Screenshot pending:** A current capture of this screen is still required. No generated substitute is included.

**Expected result:** The screen reports sign-in and sync state. Cloud settings do not establish current crew training; verify the register next.

## 4. Verify personnel evidence

1. Open **Personnel Assignment**.
2. Refresh its dispatch-centre and station scope.
3. Select the dispatch centre to verify.
4. Use **Full Verify Register** for an exact initial check of scoped vehicle assignment pages.
5. Wait for completion and use **Export Register** to retain a backup.

**Expected result:** Saved exact vehicle and training evidence. Register verification reads assignments without changing them. For later checks, **Quick Refresh Register** can reuse unchanged records. These labels are from local .235.

If a specialist vehicle is rejected, check its actual assigned crew and training in the game before another scoped register check.

## 5. Prove manual selection

1. Keep personal Auto Mode and Alliance Auto stopped.
2. Open a straightforward personal mission with available vehicles.
3. Read its requirements, patients and selected/incoming units.
4. Run **Unit Finder** and allow the complete vehicle list to load.
5. Inspect selected units and any remaining shortage.
6. Dispatch only when selection is suitable and the game control is available.

**Expected result:** Required eligible vehicles are selected, then appear en route. Zero selection or an unresolved shortage is not success.

> Dispatch commits vehicles to a live mission. Supervise the first run. A successful live dispatch was not performed during documentation testing.

## 6. Configure and start Auto Mode

1. Open **Nexus Tools → Settings** with automation stopped.
2. Review ambulance limits, Ambulance Officer and Mass Casualty Equipment choices.
3. Select **Save settings**.
4. Return to the personal mission controller and select **Start Auto Mode**.
5. Observe mission loading, selection and dispatch status.
6. Confirm vehicles appear en route. Use **Stop Auto Mode** on repeated or wrong-target actions.

**Screenshot pending:** A current capture of this screen is still required. No generated substitute is included.

**Expected result:** A managed cycle dispatches after readiness checks. Low queue counts and transport handoffs can explain a temporary lack of a mission worker.

## 7. Check the result and know how to stop

1. Confirm selected units became en-route units.
2. Read the controller outcome; a disappearing worker alone does not prove success.
3. Stop Auto Mode before editing fleet, crew or dispatch settings.
4. If blocked, note the exact status, mission ID and installed version.
5. With the affected mission open, use **Nexus Tools → Settings → Export open mission diagnostics** when available.

**Expected result:** You can recognise a dispatch, stop automation and collect useful evidence. See [Troubleshooting](/guide/troubleshooting/) for vehicle-list failures, shortages and uncertain actions.
