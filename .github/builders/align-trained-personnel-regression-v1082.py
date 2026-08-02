#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/check-trained-personnel-live-missing-display-v1081.mjs')
text = path.read_text(encoding='utf-8')

old_mutation = '''const mutationFlush = extractFunction('flushMissionFinderMutationWork');
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
new_mutation = '''const mutationFlush = extractFunction('flushMissionFinderMutationWork');
for (const token of [
  'const shouldRefreshTrainedPersonnelPanel =',
  'flags.missionContextChanged',
  'flags.vehicleListChanged',
  'flags.patientChanged',
  'missionPage &&',
  'wrapper &&',
  'invalidateLiveTrainedPersonnelDisplayCache();',
  'scheduleTrainedPersonnelPanelRefresh();'
]) {
  expect(mutationFlush.includes(token), `Mutation refresh path missing ${token}`);
}
expect(
  mutationFlush.indexOf('invalidateMissionContextCaches();') <
    mutationFlush.indexOf('invalidateLiveTrainedPersonnelDisplayCache();'),
  'Live mission caches must be invalidated before the panel rereads current shortages'
);
expect(
  !mutationFlush.includes('renderSelectedTrainedPersonnelPanel();'),
  'Mutation flush must not synchronously rebuild the trained-personnel DOM'
);
expect(
  !mutationFlush.includes('new MutationObserver'),
  'The live panel refresh must reuse the existing observer'
);

const scheduledRefresh = extractFunction(
  'scheduleTrainedPersonnelPanelRefresh'
);
for (const token of [
  'if (mfTrainedPersonnelMutationRefreshTimer) return;',
  'mfTrainedPersonnelMutationRefreshTimer = setTimeout(',
  'mfTrainedPersonnelMutationRefreshTimer = null;',
  'renderSelectedTrainedPersonnelPanel();',
  'MF_TRAINED_PERSONNEL_MUTATION_REFRESH_DELAY_MS'
]) {
  expect(
    scheduledRefresh.includes(token),
    `Scheduled trained-personnel refresh missing ${token}`
  );
}
'''
if text.count(old_mutation) != 1:
    raise SystemExit(
        f'Mutation regression anchor: expected one match, found {text.count(old_mutation)}'
    )
text = text.replace(old_mutation, new_mutation, 1)

old_runtime = '''  `function hasMissionVehiclesOnSceneForTrainedPersonnelAuthority() { return true; }\\n` +
  `function readMissionUpdateRows() { return [{isTrainedPersonnelRequirement:true, personnelTrainingRequirements:[` +
'''
new_runtime = '''  `function hasMissionVehiclesOnSceneForTrainedPersonnelAuthority() { return true; }\\n` +
  `function getCurrentMissionIdForQueueRestart() { return 'test-mission'; }\\n` +
  `const MF_LIVE_TRAINED_PERSONNEL_DISPLAY_CACHE_MS = 1500;\\n` +
  `let mfLiveTrainedPersonnelDisplayCache = {missionId:'',expiresAt:0,rows:[]};\\n` +
  `function invalidateLiveTrainedPersonnelDisplayCache() { mfLiveTrainedPersonnelDisplayCache = {missionId:'',expiresAt:0,rows:[]}; }\\n` +
  `function readMissionUpdateRows() { return [{isTrainedPersonnelRequirement:true, personnelTrainingRequirements:[` +
'''
if text.count(old_runtime) != 1:
    raise SystemExit(
        f'Runtime regression anchor: expected one match, found {text.count(old_runtime)}'
    )
text = text.replace(old_runtime, new_runtime, 1)

path.write_text(text, encoding='utf-8')
print('Aligned v1.0.81 live personnel regression with v1.0.82 debounce and cache contracts.')
