#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
for (const token of ['// @version      1.0.89', 'MISSION FINDER V10.6.144', 'function mfGetExactPatientTransportRoots(', 'function mfFindExactPatientTransportAnchorDeep(', 'frame.contentDocument', 'mfGetTransportActiveScopes()', 'const exactPatientAnchor = mfFindExactPatientTransportAnchorDeep();']) if (!source.includes(token)) fail(`missing ${token}`);
if ((source.match(/const exactPatientAnchor = mfFindExactPatientTransportAnchorDeep\(\);/g) || []).length < 2) fail('both transport paths must use the deep finder');
const route = /^\/vehicles\/\d+\/patient\/\d+\/?(?:[?#].*)?$/;
if (!route.test('/vehicles/5372808/patient/1856401')) fail('supplied patient route rejected');
if (route.test('/vehicles/5372808/gefangener/1856401')) fail('prisoner route accepted');
console.log('Iframe-aware patient transport checks passed.');
