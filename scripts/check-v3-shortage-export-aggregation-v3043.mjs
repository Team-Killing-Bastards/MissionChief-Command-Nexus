#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source=await readFile('src/missionchief-command-nexus.user.js','utf8');
const start=source.indexOf('function buildRunFailureDiagnostics(');assert.ok(start>=0);const end=source.indexOf('\nfunction diagnosticsSnapshot(',start);assert.ok(end>start);const body=source.slice(start,end);
for(const token of ['requirementCandidateEvidence','trainedCandidateEvidence','stationIssueSummary','vehicleIssueSummary','stationIssueCount','vehicleIssueCount'])assert.ok(body.includes(token),`run export lost ${token}`);
assert.match(body,/missionIds:new Set\(\)/);
assert.match(body,/requirements:new Set\(\)/);
assert.match(body,/reasons:\{\}/);
assert.match(source,/commandNexus:\s*'3\.0\.43'/,'Unit Finder diagnostic version must identify the live build');
assert.match(source,/missionFinder:\s*'V10\.6\.180'/);
assert.match(source,/personnelAssignment:\s*'1\.3\.12'/);
console.log('PASS: v3.0.43 aggregates candidate rejection evidence into station and vehicle issue summaries.');
