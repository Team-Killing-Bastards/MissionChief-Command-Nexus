#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

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
console.log('PASS: Refresh and Retry states remain protected while native type-7 rows provide centre identity.');
