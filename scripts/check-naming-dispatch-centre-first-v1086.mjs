import { readFile } from 'node:fs/promises';

// Permanent v1.0.86 regression for the Dispatch Centre-first naming cascade.
// Revalidated against the current v1.0.88 production baseline.
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

expect(source.includes('// @version      1.0.89'), 'Expected Command Nexus 1.0.88');
expect(source.includes("const UNIT_VERSION = '3.3.14';"), 'Expected Unit Naming 3.3.13');
expect(source.includes("const STATION_VERSION = '1.3.8';"), 'Expected Station Naming 1.3.7');
expect(source.includes('extractNamingDispatchCentresFromBuildingEditHtml'), 'Building-edit Dispatch Centre parser missing');
expect(source.includes('`/buildings/${seedBuildingId}/edit`'), 'Dispatch Centre names must come from the building assignment selector');
expect(source.includes("getAttribute?.('leitstelle_building_id')"), 'Station relationship must come from station-row leitstelle_building_id');
expect(source.includes('function loadNamingDispatchCentreList('), 'Independent Dispatch Centre list loader missing');
expect(source.includes('function populateNamingStationTypeFilter('), 'Centre-scoped Station Type filter missing');
expect(source.includes('Refresh Dispatch Centres'), 'Dedicated Dispatch Centre refresh control missing');

const unitCentre = source.indexOf('id="mc-namer-dispatch-centre"');
const unitType = source.indexOf('id="mc-namer-station-type"');
const unitStart = source.indexOf('id="mc-namer-startfrom"');
expect(unitCentre >= 0 && unitType > unitCentre && unitStart > unitType, 'Unit Naming must order Dispatch Centre -> Station Type -> Start From');

const stationCentre = source.indexOf('id="mc-station-dispatch-centre"');
const stationType = source.indexOf('id="mc-station-type"');
const stationStart = source.indexOf('id="mc-station-startfrom"');
expect(stationCentre >= 0 && stationType > stationCentre && stationStart > stationType, 'Station Naming must order Dispatch Centre -> Station Type -> Start From');

const p0 = source.indexOf('function populateNamingDispatchCentreFilter(');
const p1 = source.indexOf('function getStationsForNamingDispatchCentre(', p0);
const populate = source.slice(p0, p1);
expect(populate.includes('NAMING_DISPATCH_CENTRE_STATE.labelsById.entries()'), 'Centre selector must use independently loaded centre labels');
expect(!populate.includes('(stations || [])'), 'Centre selector must not infer centre labels from station names');
expect(source.includes("populateNamingStationTypeFilter('mc-namer-station-type', 'mc-namer-dispatch-centre', STATE.stations)"), 'Unit Station Type must cascade from Dispatch Centre');
expect(source.includes("populateNamingStationTypeFilter('mc-station-type', 'mc-station-dispatch-centre', STATION_STATE.stations)"), 'Station Station Type must cascade from Dispatch Centre');
expect(source.includes("add(NAMING_DISPATCH_CENTRE_ALL, 'All dispatch centres')"), 'All dispatch centres fallback missing');

console.log('PASS: Dispatch Centre -> Station Type -> Start From naming flow uses authoritative IDs.');
