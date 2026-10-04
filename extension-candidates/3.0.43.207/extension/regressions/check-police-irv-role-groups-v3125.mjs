import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', root), 'utf8'));
const coreSource = fs.readFileSync(new URL('nexus-station-profiles-core.js', root), 'utf8');
const uiSource = fs.readFileSync(new URL('nexus-station-profiles-ui.js', root), 'utf8');
const engineSource = fs.readFileSync(new URL('nexus-station-profiles-engine.js', root), 'utf8');
const runtime = fs.readFileSync(new URL('nexus-runtime.js', root), 'utf8');

assert.equal(manifest.version, '3.0.43.189', 'manifest must expose the Police IRV role-group build');
assert.ok(manifest.version_name.includes('Police IRV role groups'), 'manifest must identify the local IRV role-group test');
assert.ok(runtime.includes("const MISSION_FINDER_VERSION = '10.6.191';"), 'Mission Finder must remain on the verified Ambulance build');
assert.ok(runtime.includes("const UNIT_VERSION = '3.3.29';"), 'Unit Naming must retain Community First Responder support');

const context = { globalThis: {} };
vm.createContext(context);
vm.runInContext(coreSource, context, { filename: 'nexus-station-profiles-core.js' });
const Core = context.globalThis.NexusStationProfilesCore;
assert.ok(Core, 'station profile core must load');
assert.deepEqual([...Core.multiRoleTypes], ['8'], 'only IRV type 8 should expose duplicate role groups in this build');

const catalog = {
  buildings: { 6: 'Police station' },
  vehicles: {
    8: { name: 'Incident response vehicle', max: 2, buildings: [6], training: [] },
    24: { name: 'Traffic Car', max: 2, buildings: [6], training: ['Roads Policing Officer'] }
  },
  training: ['Police Inspector', 'Search Advisor', 'Roads Policing Officer']
};

const rawProfile = {
  id: 'police-role-profile',
  name: 'Police mixed IRVs',
  buildingType: '6',
  rename: true,
  units: [
    { type: '8', role: 'Daily use', count: 4, crew: 2, training: [] },
    { type: '8', role: 'Inspectors', count: 1, crew: 2, training: ['Police Inspector'] },
    { type: '8', role: 'Search Advisors', count: 1, crew: 2, training: ['Search Advisor'] },
    { type: '24', role: '', count: 1, crew: 2, training: ['Roads Policing Officer'] }
  ]
};

const profile = Core.validate(rawProfile, catalog);
assert.equal(profile.units.filter(unit => unit.type === '8').length, 3, 'three IRV role groups must survive validation');
assert.deepEqual([...profile.units.filter(unit => unit.type === '8').map(unit => unit.role)], ['Daily use', 'Inspectors', 'Search Advisors']);

assert.throws(
  () => Core.validate({ ...rawProfile, units: [
    { type: '8', role: '', count: 1, crew: 2, training: [] },
    { type: '8', role: 'Inspectors', count: 1, crew: 2, training: ['Police Inspector'] }
  ] }, catalog),
  /give each role group a name/i,
  'split IRV groups must have labels'
);

assert.throws(
  () => Core.validate({ ...rawProfile, units: [
    { type: '8', role: 'Inspectors', count: 1, crew: 2, training: ['Police Inspector'] },
    { type: '8', role: 'inspectors', count: 1, crew: 2, training: ['Police Inspector'] }
  ] }, catalog),
  /role names must be unique/i,
  'IRV role labels must be unique case-insensitively'
);

assert.throws(
  () => Core.validate({ ...rawProfile, units: [
    { type: '24', role: 'Traffic one', count: 1, crew: 2, training: ['Roads Policing Officer'] },
    { type: '24', role: 'Traffic two', count: 1, crew: 2, training: ['Roads Policing Officer'] }
  ] }, catalog),
  /duplicate vehicle type is not supported/i,
  'other vehicle types must remain single-row in this narrow release'
);

const station = { id: 100, building_type: 6, caption: 'Test Police Station' };
const fleet = [
  { id: 11, building_id: 100, vehicle_type: 8, fms_real: 2, caption: 'IRV 11' },
  { id: 12, building_id: 100, vehicle_type: 8, fms_real: 2, caption: 'IRV 12' },
  { id: 13, building_id: 100, vehicle_type: 8, fms_real: 2, caption: 'IRV 13' },
  { id: 14, building_id: 100, vehicle_type: 8, fms_real: 2, caption: 'IRV 14' },
  { id: 15, building_id: 100, vehicle_type: 8, fms_real: 2, caption: 'IRV 15' },
  { id: 20, building_id: 100, vehicle_type: 24, fms_real: 2, caption: 'Traffic 20' }
];

const plan = Core.compare(profile, station, fleet, catalog);
assert.deepEqual(
  JSON.parse(JSON.stringify(plan.buy.map(item => ({ type: item.type, count: item.count, target: item.target })))),
  [{ type: '8', count: 1, target: 6 }],
  'IRV purchases must use the sum of all IRV role counts'
);
assert.deepEqual(
  [...plan.allocation.assignments.filter(item => item.unit.type === '8').map(item => item.unit.role)],
  ['Inspectors', 'Search Advisors', 'Daily use', 'Daily use', 'Daily use'],
  'trained IRV groups must be allocated before daily-use IRVs when the current fleet is short'
);

const completeFleet = [...fleet, { id: 16, building_id: 100, vehicle_type: 8, fms_real: 2, caption: 'IRV 16' }, { id: 17, building_id: 100, vehicle_type: 8, fms_real: 2, caption: 'IRV 17' }];
const completePlan = Core.compare(profile, station, completeFleet, catalog);
assert.equal(completePlan.buy.length, 0, 'a fleet matching the aggregate role target must require no purchase');
assert.equal(completePlan.allocation.assignments.filter(item => item.unit.type === '8').length, 6, 'exactly the combined six IRV role slots must be staffed');
assert.equal(completePlan.allocation.extras.filter(vehicle => String(vehicle.vehicle_type) === '8').length, 1, 'extra IRVs beyond split role totals must remain outside crew changes');

const legacySingle = Core.validate({
  name: 'Legacy police profile',
  buildingType: '6',
  units: [{ type: '8', count: 2, crew: 2, training: [] }]
}, catalog);
const legacyAllocation = Core.allocate(legacySingle, completeFleet.filter(vehicle => vehicle.vehicle_type === 8), catalog);
assert.equal(legacyAllocation.assignments.length, 7, 'a legacy single-row target must continue applying crew settings to all kept same-type vehicles');
assert.equal(legacyAllocation.extras.length, 0, 'legacy single-row profiles must not silently change their previous crew scope');

assert.ok(uiSource.includes("'+ Add IRV role'"), 'profile editor must expose the IRV role add control');
assert.ok(uiSource.includes("role:input.role.value"), 'profile editor must persist role labels');
assert.ok(uiSource.includes('Current role allocation'), 'station review must show the role allocation before applying');
assert.ok(engineSource.includes('profileTypeTarget(plan.profile,wanted.type)'), 'purchase loop must use the aggregate same-type target');
assert.ok(engineSource.includes('C.allocate(plan.profile,rows,D)'), 'apply must allocate concrete vehicles across role groups');
assert.ok(engineSource.includes('extra allowed vehicle — existing crew left unchanged'), 'extra split-role IRVs must remain untouched');

console.log('PASS: 3.0.43.151 supports separate Daily use, Inspector and Search Advisor IRV role groups without altering Mission Finder or Unit Naming.');
