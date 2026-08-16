#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const evidence = await readFile('docs/evidence/issue-18-fire-airfield-training-profiles.md', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function sliceBetween(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) fail(`Unable to find ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) fail(`Unable to find ${endMarker}`);
  return source.slice(start, end);
}

const context = { result: null };
vm.runInNewContext(
  `${sliceBetween('const makePoliceRule =', 'const POLICE_TRAINING_LABELS')}
   ${sliceBetween('const FIRE_RULES =', 'const MEDICAL_RULES =')}
   result = { rules: FIRE_RULES, all: FIRE_ALL_RULES, buildings: FIRE_PROFILE_BUILDING_TYPE_IDS };`,
  context
);

const { rules, all, buildings } = JSON.parse(JSON.stringify(context.result));
const expectedRules = {
  arffFoam: { ids: ['75'], companions: [], target: 4, training: ['arff'] },
  arffRiv: { ids: ['76'], companions: [], target: 4, training: ['arff'] },
  arffCommand: { ids: ['77'], companions: [], target: 2, training: ['arff'] },
  arffStairs: { ids: ['78'], companions: [], target: 2, training: ['arff'] },
  coResponder: { ids: ['18'], companions: [], target: 1, training: ['coresponder'] },
  drone: { ids: ['90'], companions: [], target: 2, training: ['drone'] },
  highVolumePump: { ids: ['40'], companions: ['50'], target: 2, training: ['pump'] },
  lifeguard: { ids: ['73'], companions: ['74'], target: 4, training: ['gw_wasserrettung'] },
  incidentCommand: { ids: ['15'], companions: [], target: 3, training: ['elw2'] },
  hazmatOsu: { ids: ['39'], companions: [], target: 6, training: ['gw_gefahrgut'] },
  railway: { ids: ['107'], companions: [], target: 2, training: ['railway_fire'] }
};

for (const [key, expected] of Object.entries(expectedRules)) {
  const rule = rules[key];
  expect(rule, `Missing Fire rule ${key}`);
  expect(JSON.stringify(rule.vehicleTypeIds) === JSON.stringify(expected.ids), `${key} vehicle IDs changed`);
  expect(JSON.stringify(rule.companionVehicleTypeIds) === JSON.stringify(expected.companions), `${key} companion IDs changed`);
  expect(rule.target === expected.target, `${key} target must remain ${expected.target}`);
  expect(JSON.stringify(rule.trainingAll) === JSON.stringify(expected.training), `${key} training keys changed`);
}

expect(JSON.stringify(buildings) === JSON.stringify(['0', '18']), 'Fire profiles must scan only normal and small Fire Stations');
expect(all.length === Object.keys(expectedRules).length, 'Run all Fire must include every completed Fire rule');
expect(new Set(all.map(rule => rule.id)).size === all.length, 'Run all Fire contains a duplicate rule');

const fireProfiles = sliceBetween('        fire: {', '        police: {');
for (const id of [
  'fire_aircraft_rescue', 'fire_co_responder', 'fire_drone_operator',
  'fire_hazmat', 'fire_high_volume_pump', 'fire_lifeguard',
  'fire_mobile_command', 'fire_railway', 'all_fire'
]) expect(fireProfiles.includes(`'${id}'`), `Missing Fire profile ${id}`);
expect(!fireProfiles.includes('makeServicePreviewProfile'), 'No completed Fire profile may remain preview-only');
expect(fireProfiles.includes('rules: FIRE_ALL_RULES'), 'Run all Fire must execute FIRE_ALL_RULES');
expect(fireProfiles.includes('mergeOverlappingVehicleRules: true'), 'Run all Fire must use per-vehicle merged rules');

for (const token of [
  '| `75` | Major Foam Tender | 4 / 4 |',
  '| `78` | Rescue Stairs | 2 / 2 |',
  '`40` + companion `50`',
  '`73` + companion `74`',
  'Multiple unlinked possibilities are ambiguous and fail closed'
]) expect(evidence.includes(token), `Issue-18 evidence missing: ${token}`);

console.log('PASS: all Fire/Airfield Personnel Assignment profiles are live with exact vehicle, companion, training, seat and building contracts, including the complete safe batch.');
