#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/check-initial-trained-personnel-authority.mjs')
text = path.read_text(encoding='utf-8')

old_contracts = '''requireText('const suppliedHasMissionDefinitionPersonnel =', 'definition-personnel authority detector');
requireText("row?.source ===\\n                            'mission-definition-required-personnel'", 'definition source fallback');
requireText('!suppliedHasMissionDefinitionPersonnel', 'live-panel replacement exclusion');
requireText('hasExplicitCurrentMissingRequirementRows(', 'explicit current shortage authority');'''
new_contracts = '''requireText('function isMissionDefinitionRequiredPersonnelRequirementRow(', 'definition-personnel authority classifier');
requireText("'mission-definition-required-personnel'", 'definition source fallback');
requireText('function hasMissionVehiclesOnSceneForTrainedPersonnelAuthority(', 'on-scene authority detector');
requireText('#mission_vehicle_at_mission tbody tr[id^="vehicle_row"]', 'on-scene vehicle table');
requireText('function filterMissionDefinitionRequiredPersonnelForScene(', 'on-scene definition filter');
requireText('!suppliedHasMissionDefinitionPersonnel', 'no-vehicle definition authority');
requireText('hasExplicitCurrentMissingRequirementRows(', 'explicit current shortage authority');'''

old_order = '''const detectorIndex = processBlock.indexOf('const suppliedHasMissionDefinitionPersonnel =');
const replacementIndex = processBlock.indexOf('requirementRows = readMissionUpdateRows();');
if (detectorIndex < 0 || replacementIndex < 0 || detectorIndex > replacementIndex) {
  fail('Definition personnel must be detected before any live-panel replacement');
}
if (!processBlock.includes('!suppliedHasMissionDefinitionPersonnel')) {
  fail('Live-panel replacement must be blocked for definition-trained rows');
}'''
new_order = '''const sceneFilterIndex = processBlock.indexOf('filterMissionDefinitionRequiredPersonnelForScene(');
const explicitAuthorityIndex = processBlock.indexOf('hasExplicitCurrentMissingRequirementRows(');
const replacementIndex = processBlock.indexOf('requirementRows = readMissionUpdateRows();');
if (
  sceneFilterIndex < 0 ||
  explicitAuthorityIndex < 0 ||
  replacementIndex < 0 ||
  sceneFilterIndex > explicitAuthorityIndex ||
  explicitAuthorityIndex > replacementIndex
) {
  fail('On-scene static personnel filtering must run before the live authority decision');
}
if (!processBlock.includes('!suppliedHasMissionDefinitionPersonnel')) {
  fail('Mission-definition personnel must remain authoritative while no vehicle is on scene');
}
if (processBlock.includes('#mission_vehicle_driving')) {
  fail('En-route vehicles must not suppress mission-definition personnel requirements');
}'''

for old, new, label in (
    (old_contracts, new_contracts, 'contract block'),
    (old_order, new_order, 'authority order block'),
):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
