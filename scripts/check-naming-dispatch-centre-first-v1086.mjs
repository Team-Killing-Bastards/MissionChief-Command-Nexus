import { readFile } from 'node:fs/promises';

// Historical v1.0.86 centre-first regression, revalidated against the v1.0.91 hierarchy.
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

expect(source.includes('// @version      1.0.92'), 'Expected Command Nexus 1.0.91');
expect(source.includes("const UNIT_VERSION = '3.3.17';"), 'Expected Unit Naming 3.3.16');
expect(source.includes("const STATION_VERSION = '1.3.11';"), 'Expected Station Naming 1.3.10');
expect(source.includes('extractNamingDispatchCentresFromProfileHtml'), 'Profile Dispatch Centre parser missing');
expect(source.includes('resolveNamingOwnProfilePath'), 'Signed-in profile route resolver missing');
expect(source.includes("getAttribute?.('leitstelle_building_id')"), 'Station membership must remain row-authoritative');
expect(source.includes('function loadNamingDispatchCentreList('), 'Independent Dispatch Centre list loader missing');
expect(source.includes('function populateNamingServiceFilter('), 'Centre-scoped Service filter missing');
expect(source.includes('function populateNamingStationTypeFilter('), 'Service-scoped Station Type filter missing');
expect(source.includes('Refresh Dispatch Centres'), 'Dedicated Dispatch Centre refresh control missing');

const unitCentre = source.indexOf('id="mc-namer-dispatch-centre"');
const unitService = source.indexOf('id="mc-namer-service"');
const unitType = source.indexOf('id="mc-namer-station-type"');
const unitStart = source.indexOf('id="mc-namer-startfrom"');
expect(
  unitCentre >= 0 && unitService > unitCentre && unitType > unitService && unitStart > unitType,
  'Unit Naming must order Dispatch Centre -> Service -> Station Type -> Start From'
);

const stationCentre = source.indexOf('id="mc-station-dispatch-centre"');
const stationService = source.indexOf('id="mc-station-service"');
const stationType = source.indexOf('id="mc-station-type"');
const stationStart = source.indexOf('id="mc-station-startfrom"');
expect(
  stationCentre >= 0 && stationService > stationCentre && stationType > stationService && stationStart > stationType,
  'Station Naming must order Dispatch Centre -> Service -> Station Type -> Start From'
);

const p0 = source.indexOf('function populateNamingDispatchCentreFilter(');
const p1 = source.indexOf('function getStationsForNamingDispatchCentre(', p0);
const populate = source.slice(p0, p1);
expect(populate.includes('NAMING_DISPATCH_CENTRE_STATE.labelsById.entries()'), 'Centre selector must use independently loaded centre labels');
expect(!populate.includes('(stations || [])'), 'Centre selector must not infer centre labels from station names');
expect(source.includes("populateNamingStationTypeFilter('mc-namer-station-type', 'mc-namer-dispatch-centre', 'mc-namer-service', STATE.stations)"), 'Unit Station Type must cascade from centre + service');
expect(source.includes("populateNamingStationTypeFilter('mc-station-type', 'mc-station-dispatch-centre', 'mc-station-service', STATION_STATE.stations)"), 'Station Station Type must cascade from centre + service');
expect(source.includes("add(NAMING_DISPATCH_CENTRE_ALL, 'All dispatch centres')"), 'All dispatch centres fallback missing');

console.log('PASS: v1.0.86 centre-first authority is preserved as Dispatch Centre -> Service -> Station Type -> Start From.');
