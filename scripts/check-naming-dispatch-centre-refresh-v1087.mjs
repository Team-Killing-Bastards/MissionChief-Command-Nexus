#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

expect(source.includes('// @version      1.0.116'), 'Expected Command Nexus 1.0.93');
expect(source.includes("const UNIT_VERSION = '3.3.24';"), 'Expected Unit Naming 3.3.18');
expect(source.includes("const STATION_VERSION = '1.3.19';"), 'Expected Station Naming 1.3.12');
expect(source.includes("'Refreshing…'"), 'Refresh action must expose a loading state');
expect(source.includes("'Retry Dispatch Centres'"), 'Refresh failure must expose a retry state');
expect(source.includes("'Dispatch Centres unavailable — refresh'"), 'Disabled selector must explain centre-list failure');
expect(source.includes('NAMING_DISPATCH_CENTRE_STATE.listLoaded'), 'Selector must require centre-list readiness');

const p0 = source.indexOf('function populateNamingDispatchCentreFilter(');
const p1 = source.indexOf('function getStationsForNamingDispatchCentre(', p0);
const populate = source.slice(p0, p1);
expect(!populate.includes('NAMING_DISPATCH_CENTRE_STATE.loaded &&'), 'Station-assignment readiness must not block the first Dispatch Centre dropdown');

const listStart = source.indexOf('async function loadNamingDispatchCentreList(');
const listEnd = source.indexOf('function getNamingServiceForStation(', listStart);
const listLoader = source.slice(listStart, listEnd);
expect(listLoader.includes('collectNamingDispatchCentresFromStationRows()'), 'Refresh must load centres from native type-7 station rows');
expect(!listLoader.includes('/profile/'), 'Profile route must not return as centre-list authority');
expect(!listLoader.includes('/leitstellenansicht'), 'Fetched Stations view must not return as centre-list authority');
expect(!listLoader.includes('/edit'), 'Building edit page must not return as centre-list authority');
expect(workflow.includes('scripts/check-naming-dispatch-centre-refresh-v1087.mjs'), 'v1.0.87 refresh-state regression must remain registered');

console.log('PASS: v1.0.87 refresh/retry states remain protected while v1.0.93 uses native type-7 centre rows.');
