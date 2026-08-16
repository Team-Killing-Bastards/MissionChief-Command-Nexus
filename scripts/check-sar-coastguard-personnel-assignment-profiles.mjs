#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const evidence = await readFile('docs/evidence/issue-19-sar-coastguard-training-profiles.md', 'utf8');
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
   result = { rules: SAR_RULES, all: SAR_ALL_RULES, buildings: SAR_PROFILE_BUILDING_TYPE_IDS };`,
  context
);

const { rules, all, buildings } = JSON.parse(JSON.stringify(context.result));
const expectedRules = {
  caveRescue: [['93', '99'], [], 4, ['mountain_cave_rescue']],
  coastalAir: [['64', '65'], [], 4, ['coastal_rescue_pilot']],
  coastalCommand: [['60'], [], 5, ['coastal_command']],
  searchAdvisor: [['86'], [], 3, ['search_and_rescue']],
  dogHandling: [['101', '102'], [], 1, ['rescue_dogs']],
  drone: [['89'], [], 2, ['drone']],
  floodCrv: [['57'], ['61'], 5, ['flood_equipment']],
  floodMud: [['58'], ['61'], 5, ['flood_equipment']],
  floodRope: [['59'], ['61'], 5, ['flood_equipment']],
  floodCommander: [['60'], ['61'], 5, ['flood_equipment']],
  floodSupport: [['63'], ['61'], 8, ['flood_equipment']],
  floodLifeboat4x4: [['66'], ['61'], 4, ['flood_equipment']],
  floodControlVan: [['85'], ['88'], 3, ['flood_equipment']],
  floodSupportVan: [['86'], ['88'], 3, ['flood_equipment']],
  floodDrone: [['89'], ['88'], 2, ['flood_equipment']],
  floodRrv: [['94'], ['88'], 1, ['flood_equipment']],
  hovercraft: [['72'], ['71'], 3, ['hover_boat_elw']],
  jetSki: [['66'], ['70'], 4, ['jetski']],
  lifeboatIlb: [['68'], [], 4, ['ocean_navigation']],
  lifeboatAlb: [['69'], [], 7, ['ocean_navigation']],
  lifeguard: [['66'], ['67'], 4, ['gw_wasserrettung']],
  mudRescue: [['58'], [], 5, ['coastal_mud_rescue']],
  ropeRescue: [['59'], [], 5, ['gw_hoehenrettung']],
  searchManagement: [['85', '100'], [], 3, ['search_and_rescue_command']]
};

for (const [key, [ids, companions, target, training]] of Object.entries(expectedRules)) {
  const rule = rules[key];
  expect(rule, `Missing SAR rule ${key}`);
  expect(JSON.stringify(rule.vehicleTypeIds) === JSON.stringify(ids), `${key} vehicle IDs changed`);
  expect(JSON.stringify(rule.companionVehicleTypeIds) === JSON.stringify(companions), `${key} companion IDs changed`);
  expect(rule.target === target, `${key} target must remain ${target}`);
  expect(JSON.stringify(rule.trainingAll) === JSON.stringify(training), `${key} training keys changed`);
}

expect(all.length === Object.keys(expectedRules).length, 'Run all SAR must include every completed SAR rule');
expect(new Set(all.map(rule => rule.id)).size === all.length, 'Run all SAR contains a duplicate rule');
expect(JSON.stringify(buildings.all) === JSON.stringify(['22', '27', '28', '30', '31', '33']), 'Run all SAR building scope changed');

const sarProfiles = sliceBetween('        coastguard: {', '        all_services: {');
for (const id of [
  'sar_cave_rescue', 'sar_coastal_air_rescue', 'sar_coastal_command',
  'sar_search_advisor', 'sar_dog_handling', 'sar_drone_operator',
  'sar_flood_first_responder', 'sar_hovercraft_commander', 'sar_jet_ski',
  'sar_lifeboat_operations', 'sar_lifeguard', 'sar_mud_rescue',
  'sar_rope_rescue', 'sar_search_management', 'all_sar'
]) expect(sarProfiles.includes(`'${id}'`), `Missing SAR profile ${id}`);
expect(!sarProfiles.includes('makeServicePreviewProfile'), 'No completed SAR profile may remain preview-only');
expect(sarProfiles.includes('rules: SAR_ALL_RULES'), 'Run all SAR must execute SAR_ALL_RULES');
expect(sarProfiles.includes('mergeOverlappingVehicleRules: true'), 'Run all SAR must merge overlapping qualifications by actual vehicle');

for (const token of [
  '| Cave Rescue | `mountain_cave_rescue` | `93`, `99` | 4 |',
  '| Hovercraft Commander | `hover_boat_elw` | `72` linked to `71` | 3 |',
  '| Lifeboat Operations | `ocean_navigation` | `68`, `69` | 4, 7 |',
  '`tractive_vehicle_id` is authoritative',
  'every required training key is combined onto the same crew'
]) expect(evidence.includes(token), `Issue-19 evidence missing: ${token}`);

console.log('PASS: all SAR/Coastguard Personnel Assignment profiles are live with exact training, vehicle, companion, live-seat and building mappings, including the overlap-safe full batch.');
