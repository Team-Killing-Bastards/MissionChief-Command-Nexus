#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const marker = `function ${name}(`;
  let start = source.indexOf(marker);
  if (start < 0) fail(`Unable to find ${name}`);
  if (source.slice(Math.max(0, start - 6), start) === 'async ') start -= 6;
  const parameterStart = source.indexOf('(', start);
  let parameterDepth = 0;
  let parameterEnd = -1;
  for (let index = parameterStart; index < source.length; index += 1) {
    if (source[index] === '(') parameterDepth += 1;
    if (source[index] === ')' && --parameterDepth === 0) {
      parameterEnd = index;
      break;
    }
  }
  if (parameterEnd < 0) fail(`Unterminated parameters for ${name}`);
  const brace = source.indexOf('{', parameterEnd);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = brace; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  fail(`Unterminated ${name}`);
}

const helperNames = [
  'getPersonnelBuildingVehicleApiRecords',
  'getPersonnelApiVehicleId',
  'getPersonnelApiVehicleTypeId',
  'getPersonnelApiTractiveVehicleId',
  'isPersonnelApiTractiveRandom',
  'resolvePersonnelCompanionVehicleIds'
];
const helperSource = helperNames.map(extractFunction).join('\n');

async function resolveWith(records, rule, vehicles, ok = true) {
  const logs = [];
  const context = {
    records,
    rule,
    vehicles,
    result: null,
    logs,
    getBuildingIdFromHref: () => '123',
    personnelLog(message, type) { logs.push({ message, type }); },
    personnelDebug() {},
    personnelFetchResponse: async () => ({
      ok,
      status: ok ? 200 : 503,
      json: async () => records
    })
  };
  vm.runInNewContext(
    `${helperSource}
     result = resolvePersonnelCompanionVehicleIds(
       { buildingId: '123', displayName: 'Test Station', href: '/buildings/123' },
       [rule],
       vehicles
     ).then(map => [...(map.get(rule.id) || [])]);`,
    context
  );
  return { ids: await context.result, logs: context.logs };
}

const floodRule = {
  id: 'flood', label: 'Flood', vehicleLabel: 'Mud Rescue Unit',
  vehicleTypeIds: ['58'], companionVehicleTypeIds: ['61']
};
let result = await resolveWith([
  { id: 100, vehicle_type: 58 },
  { id: 101, vehicle_type: 58 },
  { id: 200, vehicle_type: 61, tractive_vehicle_id: 101, tractive_random: false }
], floodRule, [
  { vehicleId: '100', vehicleTypeId: '58' },
  { vehicleId: '101', vehicleTypeId: '58' }
]);
expect(JSON.stringify(result.ids) === JSON.stringify(['101']), 'Explicit tractive_vehicle_id must select only the linked tractor');

const hoverRule = {
  id: 'hover', label: 'Hovercraft', vehicleLabel: 'Hovercraft Transporter',
  vehicleTypeIds: ['72'], companionVehicleTypeIds: ['71']
};
result = await resolveWith([
  { id: 300, vehicle_type: 72 },
  { id: 400, vehicle_type: 71, tractive_vehicle_id: null, tractive_random: true }
], hoverRule, [{ vehicleId: '300', vehicleTypeId: '72' }]);
expect(JSON.stringify(result.ids) === JSON.stringify(['300']), 'A unique one-companion/one-tractor pair must resolve deterministically');

result = await resolveWith([
  { id: 300, vehicle_type: 72 },
  { id: 301, vehicle_type: 66 },
  { id: 400, vehicle_type: 71, tractive_vehicle_id: 301, tractive_random: false }
], hoverRule, [{ vehicleId: '300', vehicleTypeId: '72' }]);
expect(result.ids.length === 0, 'A companion explicitly linked to an ineligible tractor must not use the one-to-one fallback');

const jetSkiRule = {
  id: 'jetski', label: 'Jet Ski', vehicleLabel: '4x4',
  vehicleTypeIds: ['66'], companionVehicleTypeIds: ['70']
};
result = await resolveWith([
  { id: 500, vehicle_type: 66 },
  { id: 501, vehicle_type: 66 },
  { id: 600, vehicle_type: 70, tractive_vehicle_id: null, tractive_random: true }
], jetSkiRule, [
  { vehicleId: '500', vehicleTypeId: '66' },
  { vehicleId: '501', vehicleTypeId: '66' }
]);
expect(result.ids.length === 0, 'An ambiguous random companion must fail closed');
expect(result.logs.some(log => log.message.includes('ambiguous')), 'Ambiguous companion resolution must be reported');

result = await resolveWith([], hoverRule, [{ vehicleId: '300', vehicleTypeId: '72' }], false);
expect(result.ids.length === 0, 'A failed companion API request must fail closed');

const mergeContext = {
  POLICE_TRAINING_LABELS: {
    coastal_mud_rescue: 'Mud Rescue Operator',
    flood_equipment: 'Flood First Responder'
  },
  result: null
};
vm.runInNewContext(
  `${extractFunction('mergePersonnelRulesByVehicle')}
   result = mergePersonnelRulesByVehicle([
     {
       id: 'mud', label: 'Mud Rescue', vehicleTypeIds: ['58'],
       trainingAll: ['coastal_mud_rescue'], target: 5,
       vehicleLabel: 'Mud Rescue Unit', preferWithout: []
     },
     {
       id: 'flood', label: 'Flood First Responder', vehicleTypeIds: ['58'],
       fixedVehicleIds: ['701'], trainingAll: ['flood_equipment'], target: 5,
       vehicleLabel: 'Linked Mud Rescue Unit', preferWithout: []
     }
   ], [
     { vehicleId: '701', vehicleTypeId: '58', name: 'Linked MRU' },
     { vehicleId: '702', vehicleTypeId: '58', name: 'Unlinked MRU' }
   ]);`,
  mergeContext
);
const merged = JSON.parse(JSON.stringify(mergeContext.result));
expect(JSON.stringify(merged[0].trainingAll) === JSON.stringify(['coastal_mud_rescue', 'flood_equipment']), 'Linked vehicle must receive one dual-training rule');
expect(JSON.stringify(merged[1].trainingAll) === JSON.stringify(['coastal_mud_rescue']), 'Unlinked same-type vehicle must not inherit companion training');
expect(merged.every(rule => rule.fixedVehicleIds.length === 1), 'Merged rules must remain fixed to one actual vehicle');

const selectContext = {
  result: null,
  getPersonnelAssignedToVehicle: () => [],
  personnelMatchesRule: () => true
};
vm.runInNewContext(
  `${extractFunction('selectPoliceRuleVehicles')}
   result = selectPoliceRuleVehicles({
     rule: { vehicleTypeIds: ['58'], fixedVehicleIds: ['801'], sharedVehiclePool: false },
     allVehicles: [
       { vehicleId: '801', vehicleTypeId: '58', name: 'Linked' },
       { vehicleId: '802', vehicleTypeId: '58', name: 'Unlinked' }
     ],
     personnel: [], reservedPersonnelIds: new Set(), claimedVehicleIds: new Set(), batch: false
   });`,
  selectContext
);
expect(selectContext.result.length === 1 && selectContext.result[0].vehicleId === '801', 'Fixed vehicle selection must exclude every unrelated same-type vehicle');

console.log('PASS: companion rules use explicit links, only deterministic one-to-one fallback, fail closed on ambiguity/API failure, and merge overlapping qualifications onto the exact linked crew.');
