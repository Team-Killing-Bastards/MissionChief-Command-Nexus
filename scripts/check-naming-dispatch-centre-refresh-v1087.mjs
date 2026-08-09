#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

expect(source.includes('// @version      1.0.90'), 'Expected Command Nexus 1.0.88');
expect(source.includes("const UNIT_VERSION = '3.3.15';"), 'Expected Unit Naming 3.3.13');
expect(source.includes("const STATION_VERSION = '1.3.9';"), 'Expected Station Naming 1.3.7');
expect(source.includes("'Refreshing…'"), 'Refresh action must expose a loading state');
expect(source.includes("'Retry Dispatch Centres'"), 'Refresh failure must expose a retry state');
expect(source.includes("'Dispatch Centres unavailable — refresh'"), 'Disabled selector must explain the refresh failure');
expect(source.includes('NAMING_DISPATCH_CENTRE_STATE.listLoaded'), 'Selector must require centre-list readiness');
expect(source.includes('NAMING_DISPATCH_CENTRE_STATE.loaded'), 'Selector must require station-assignment readiness');
expect(!source.includes("stationFetchWithTimeout('/leitstellenansicht'"), 'v1.0.87 /leitstellenansicht source must not return');
expect(workflow.includes('scripts/check-naming-dispatch-centre-refresh-v1087.mjs'), 'v1.0.87 refresh-state regression must remain registered');
console.log('PASS: Dispatch Centre refresh/retry states remain protected after the v1.0.88 source correction.');
