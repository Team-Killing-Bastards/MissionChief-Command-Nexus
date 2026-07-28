#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
for (const token of ['// @version      1.0.52', 'MISSION FINDER V10.6.115', 'function mfIsExactPatientTransportAnchor(', 'function mfFindExactPatientTransportAnchor(', 'a.btn-success[href*="/patient/"]', '/^\\/vehicles\\/\\d+\\/patient\\/\\d+\\/?(?:[?#].*)?$/']) if (!source.includes(token)) fail(`missing ${token}`);
if ((source.match(/const exactPatientAnchor = mfFindExactPatientTransportAnchor\(document\);/g) || []).length < 2) fail('both transport paths must use exact patient anchor');
const route = /^\/vehicles\/\d+\/patient\/\d+\/?(?:[?#].*)?$/;
if (!route.test('/vehicles/5033562/patient/1862688')) fail('supplied current route rejected');
if (route.test('/missions/5033562/patient/1862688') || route.test('/vehicles/5033562/gefangener/1862688')) fail('unrelated route accepted');
console.log('Auto Mode patient transport anchor checks passed.');
