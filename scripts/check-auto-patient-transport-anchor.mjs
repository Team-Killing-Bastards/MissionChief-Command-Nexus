#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
for (const token of ['// @version      1.0.57', 'MISSION FINDER V10.6.120', 'function mfIsExactPatientTransportAnchor(', 'function mfFindExactPatientTransportAnchor(', 'function mfFindExactPatientTransportAnchorDeep(', 'a.btn-success[href*="/patient/"]', '/^\\/vehicles\\/\\d+\\/patient\\/\\d+\\/?(?:[?#].*)?$/']) if (!source.includes(token)) fail(`missing ${token}`);
if ((source.match(/const exactPatientAnchor = mfFindExactPatientTransportAnchorDeep\(\);/g) || []).length < 2) fail('both transport paths must use deep exact patient anchor search');
const route = /^\/vehicles\/\d+\/patient\/\d+\/?(?:[?#].*)?$/;
if (!route.test('/vehicles/5372808/patient/1856401')) fail('supplied current route rejected');
if (route.test('/missions/5372808/patient/1856401') || route.test('/vehicles/5372808/gefangener/1856401')) fail('unrelated route accepted');
console.log('Auto Mode patient transport anchor checks passed.');
