#!/usr/bin/env python3
from pathlib import Path

source_path = Path('src/missionchief-command-nexus.user.js')
source = source_path.read_text(encoding='utf-8')

old = '''        if (flags.panelChanged) {
            const wrappers = document.querySelectorAll(
                '#mission-finder-wrapper'
            );

            const controlPanel = document.getElementById(
                'control-panel'
            );

            if (
                wrappers.length > 1 ||
                (
                    controlPanel &&
                    !controlPanel.closest('#mission-finder-wrapper')
                )
            ) {
                cleanupDuplicatePanels();
            }
        }

        if (autoModeRunning && missionPage && flags.relevant) {'''
new = '''        if (flags.panelChanged) {
            const wrappers = document.querySelectorAll(
                '#mission-finder-wrapper'
            );

            const controlPanel = document.getElementById(
                'control-panel'
            );

            if (
                wrappers.length > 1 ||
                (
                    controlPanel &&
                    !controlPanel.closest('#mission-finder-wrapper')
                )
            ) {
                cleanupDuplicatePanels();
            }
        }

        const shouldRefreshTrainedPersonnelPanel =
            flags.missionContextChanged ||
            flags.vehicleListChanged ||
            flags.patientChanged;

        if (
            missionPage &&
            wrapper &&
            shouldRefreshTrainedPersonnelPanel
        ) {
            renderSelectedTrainedPersonnelPanel();
        }

        if (autoModeRunning && missionPage && flags.relevant) {'''
if source.count(old) != 1:
    raise SystemExit(f'Mutation flush insertion: expected one match, found {source.count(old)}')
source_path.write_text(source.replace(old, new, 1), encoding='utf-8')

check_path = Path('scripts/check-trained-personnel-live-missing-display-v1081.mjs')
check = check_path.read_text(encoding='utf-8')
anchor = '''const panel = extractFunction('renderSelectedTrainedPersonnelPanel');'''
block = '''const mutationFlush = extractFunction('flushMissionFinderMutationWork');
for (const token of [
  'const shouldRefreshTrainedPersonnelPanel =',
  'flags.missionContextChanged',
  'flags.vehicleListChanged',
  'flags.patientChanged',
  'missionPage &&',
  'wrapper &&',
  'renderSelectedTrainedPersonnelPanel();'
]) {
  expect(mutationFlush.includes(token), `Mutation refresh path missing ${token}`);
}
expect(
  mutationFlush.indexOf('invalidateMissionContextCaches();') <
    mutationFlush.indexOf('renderSelectedTrainedPersonnelPanel();'),
  'Live mission caches must be invalidated before the panel rereads current shortages'
);
expect(
  !mutationFlush.includes('new MutationObserver'),
  'The live panel refresh must reuse the existing observer'
);

'''
if check.count(anchor) != 1:
    raise SystemExit(f'Regression insertion anchor: expected one match, found {check.count(anchor)}')
check_path.write_text(check.replace(anchor, block + anchor, 1), encoding='utf-8')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
old_changelog = '''- The display reuses `readMissionUpdateRows({ silent: true })`; it adds no fetch, timer, observer, selection or dispatch side effect.
- Vehicle Load, Unit Finder, Mission Update, Auto Mode, memory lifecycle and iOS/iPadOS paths remain unchanged.'''
new_changelog = '''- The display reuses `readMissionUpdateRows({ silent: true })`; it adds no fetch, timer, observer, selection or dispatch side effect.
- The existing coalesced mission mutation flush now rerenders the panel after invalidating current mission caches, so live shortage changes appear automatically without a button click.
- Vehicle Load, Unit Finder, Mission Update, Auto Mode, memory lifecycle and iOS/iPadOS paths remain unchanged.'''
if changelog.count(old_changelog) != 1:
    raise SystemExit(f'Changelog refresh note: expected one match, found {changelog.count(old_changelog)}')
changelog_path.write_text(changelog.replace(old_changelog, new_changelog, 1), encoding='utf-8')
