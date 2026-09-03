#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js','utf8');
function fn(name){const m=source.match(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));assert.ok(m,`${name} missing`);const start=m.index,brace=source.indexOf('{',source.indexOf(')',start));let d=0,q='',e=false;for(let i=brace;i<source.length;i++){const c=source[i];if(q){if(e)e=false;else if(c==='\\\\')e=true;else if(c===q)q='';continue;}if(c==="'"||c==='"'||c==='`'){q=c;continue;}if(c==='{')d++;if(c==='}'&&--d===0)return source.slice(start,i+1);}assert.fail(`${name} unterminated`);}
const matcher=fn('getAllMatchingVehicleCheckboxes');
assert.match(matcher,/includeDisabled\s*=\s*false/,'diagnostic matcher switch missing');
assert.match(matcher,/!includeDisabled\s*&&\s*input\.disabled/,'default selection must still reject disabled vehicles');
const build=fn('mfBuildUnitFinderDiagnosticSnapshot');
assert.match(build,/requirementCandidateEvidence/);
assert.match(build,/trainedCandidateEvidence/);
const ordinary=fn('mfGetDiagnosticRequirementCandidateEvidence');
assert.match(ordinary,/getAllMatchingVehicleCheckboxes\([^)]*true,true\)/s,'diagnostics must reuse the exact matcher while including disabled candidates');
assert.match(ordinary,/disabled-or-unavailable/);
assert.match(ordinary,/available-not-selected/);
const trained=fn('mfGetDiagnosticTrainedCandidateEvidence');
for(const token of ['registry-entry-missing','assignment-scan-incomplete','training-profiles-incomplete','no-required-training-combination','available-qualified-not-selected'])assert.ok(trained.includes(token),`trained evidence lost ${token}`);
assert.match(trained,/requiredTrainingCodes/);
assert.match(trained,/stationSummary/);
const vehicle=fn('mfDiagnosticVehicleEvidence');
for(const token of ['stationName','stationHref','buildingId','registryMatchMode','assignedPersonnelCount'])assert.ok(vehicle.includes(token),`vehicle evidence lost ${token}`);
assert.doesNotMatch(trained,/personnelName|personName|firstName|lastName/i,'diagnostics must not retain personnel names');
console.log('PASS: v3.0.43 exports exact candidate vehicles, station identity and rejection reasons without changing normal disabled-vehicle selection.');
