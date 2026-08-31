#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const STATE_PATH = 'project-state.json';
const SOURCE_PATH = 'src/missionchief-command-nexus.user.js';
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const COMPONENT_PATTERNS = {
  resourceAdministration: /MODULE 1: UNIT, STATION & PERSONNEL TOOLS V(\d+(?:\.\d+){2})/g,
  missionFinder: /MODULE 2: MISSION FINDER V(\d+(?:\.\d+){2})/g,
  unitNaming: /const UNIT_VERSION = '(\d+(?:\.\d+){2})';/g,
  stationNaming: /const STATION_VERSION = '(\d+(?:\.\d+){2})';/g,
  personnelAssignment: /const PERSONNEL_VERSION = '(\d+(?:\.\d+){2})';/g,
};

const failures = [];
function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

function requireFile(file) {
  requireCondition(fs.existsSync(file), `Required project record is missing: ${file}`);
}

function unique(values) {
  return new Set(values).size === values.length;
}

for (const file of [STATE_PATH, SOURCE_PATH, 'docs/project-state.schema.json', 'docs/PROJECT_STATE.md', 'docs/decisions/README.md', 'docs/evidence/README.md']) {
  requireFile(file);
}

let state;
try {
  state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
} catch (error) {
  console.error(`ERROR: ${STATE_PATH} is not valid JSON: ${error.message}`);
  process.exit(1);
}

try {
  JSON.parse(fs.readFileSync('docs/project-state.schema.json', 'utf8'));
} catch (error) {
  failures.push(`docs/project-state.schema.json is not valid JSON: ${error.message}`);
}

requireCondition(state.$schema === './docs/project-state.schema.json', 'project-state.json must reference docs/project-state.schema.json.');
requireCondition(state.schemaVersion === 1, 'Unsupported project-state schemaVersion.');
requireCondition(/^\d{4}-\d{2}-\d{2}$/.test(state.lastUpdated || ''), 'lastUpdated must use YYYY-MM-DD.');
requireCondition(state.project?.repository === 'Team-Killing-Bastards/MissionChief-Command-Nexus', 'Unexpected repository identity.');
requireCondition(state.project?.defaultBranch === 'main', 'The project-state default branch must remain main.');
requireCondition(state.project?.canonicalUserscript === SOURCE_PATH, 'The canonical userscript path is incorrect.');

const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const metadataVersion = source.match(/^\/\/\s+@version\s+([^\s]+)\s*$/m)?.[1] || '';
requireCondition(VERSION_PATTERN.test(metadataVersion), `Could not read a valid @version from ${SOURCE_PATH}.`);
requireCondition(state.canonical?.version === metadataVersion, `project-state canonical version ${state.canonical?.version} does not match source @version ${metadataVersion}.`);
requireCondition(['published', 'candidate'].includes(state.canonical?.status), 'canonical.status must be published or candidate.');

const sourceBytes = fs.statSync(SOURCE_PATH).size;
const sourceSha256 = crypto.createHash('sha256').update(fs.readFileSync(SOURCE_PATH)).digest('hex');
requireCondition(state.canonical?.sourceBytes === sourceBytes, `project-state sourceBytes ${state.canonical?.sourceBytes} does not match ${sourceBytes}.`);
requireCondition(state.canonical?.sourceSha256 === sourceSha256, 'project-state sourceSha256 does not match the canonical userscript.');

for (const [key, pattern] of Object.entries(COMPONENT_PATTERNS)) {
  const matches = [...source.matchAll(pattern)];
  requireCondition(matches.length === 1, `Expected exactly one source version marker for ${key}; found ${matches.length}.`);
  if (matches.length === 1) {
    requireCondition(state.canonical?.components?.[key] === matches[0][1], `project-state component ${key}=${state.canonical?.components?.[key]} does not match source ${matches[0][1]}.`);
  }
}

requireCondition(VERSION_PATTERN.test(state.production?.version || ''), 'production.version must use MAJOR.MINOR.PATCH.');
requireCondition(state.production?.tag === `v${state.production?.version}`, 'production.tag must equal v plus production.version.');
requireCondition(/^[0-9a-f]{40}$/.test(state.production?.releaseCommit || ''), 'production.releaseCommit must be a full 40-character commit SHA.');
requireCondition(/^https:\/\/github\.com\/Team-Killing-Bastards\/MissionChief-Command-Nexus\/releases\/tag\/v\d+\.\d+\.\d+$/.test(state.production?.releaseUrl || ''), 'production.releaseUrl is not the canonical release URL.');
requireCondition(/^[0-9a-f]{64}$/.test(state.production?.asset?.sha256 || ''), 'production asset SHA-256 is invalid.');
requireCondition(['pending', 'passed', 'failed'].includes(state.production?.liveValidationStatus), 'liveValidationStatus is invalid.');

if (state.canonical?.status === 'published') {
  requireCondition(state.canonical.version === state.production.version, 'Published canonical version must equal production version.');
  requireCondition(state.canonical.sourceBytes === state.production.asset.bytes, 'Published canonical bytes must equal production asset bytes.');
  requireCondition(state.canonical.sourceSha256 === state.production.asset.sha256, 'Published canonical SHA-256 must equal production asset SHA-256.');
  requireCondition(state.production.asset.name === `MissionChief-Command-Nexus-${state.production.version}.user.js`, 'Production asset filename does not match the version.');
}

const precedence = state.authority?.precedence || [];
requireCondition(precedence.length >= 4, 'Authority precedence must contain at least four records.');
requireCondition(unique(precedence.map((item) => item.rank)), 'Authority precedence ranks must be unique.');
requireCondition([...precedence].sort((a, b) => a.rank - b.rank).every((item, index) => item.rank === index + 1), 'Authority precedence ranks must be consecutive starting at 1.');
requireCondition(precedence[0]?.path === SOURCE_PATH, 'The canonical userscript must remain first in authority precedence.');
requireCondition(precedence.some((item) => item.path === STATE_PATH), 'project-state.json is missing from authority precedence.');

const decisionIds = (state.lockedDecisions || []).map((item) => item.id);
requireCondition(decisionIds.length > 0 && unique(decisionIds), 'Decision IDs must be present and unique.');
for (const decision of state.lockedDecisions || []) {
  requireFile(decision.file);
  if (!fs.existsSync(decision.file)) continue;
  const content = fs.readFileSync(decision.file, 'utf8');
  requireCondition(content.includes(`# ${decision.id}: ${decision.title}`), `${decision.file} heading does not match project-state.json.`);
  requireCondition(new RegExp(`\\*\\*Status:\\*\\* ${decision.status}`, 'i').test(content), `${decision.file} status does not match project-state.json.`);
}

const evidenceIds = (state.evidence || []).map((item) => item.id);
requireCondition(unique(evidenceIds), 'Evidence IDs must be unique.');
for (const evidence of state.evidence || []) requireFile(evidence.file);

const workIds = (state.openWork || []).map((item) => item.id);
requireCondition(workIds.length > 0 && unique(workIds), 'Open-work IDs must be present and unique.');
const evidenceSet = new Set(evidenceIds);
for (const item of state.openWork || []) {
  requireCondition(['P0', 'P1', 'P2', 'P3'].includes(item.priority), `${item.id} has an invalid priority.`);
  requireCondition(['ready', 'in-progress', 'blocked', 'backlog', 'done'].includes(item.status), `${item.id} has an invalid status.`);
  requireCondition(Array.isArray(item.acceptanceCriteria) && item.acceptanceCriteria.length > 0, `${item.id} requires acceptance criteria.`);
  for (const evidenceId of item.evidence || []) {
    requireCondition(evidenceSet.has(evidenceId), `${item.id} references unknown evidence ${evidenceId}.`);
  }
  if (item.issue !== null) {
    requireCondition(item.issueUrl.endsWith(`/issues/${item.issue}`), `${item.id} issue URL does not match issue ${item.issue}.`);
  }
}

for (const entry of state.handover?.readOrder || []) requireFile(entry);
requireCondition((state.handover?.readOrder || [])[0] === STATE_PATH, 'Handover read order must start with project-state.json.');
requireCondition((state.handover?.updateRule || '').includes('render-project-state.mjs'), 'Handover update rule must name the renderer.');
requireCondition((state.handover?.updateRule || '').includes('check-project-state.mjs'), 'Handover update rule must name the validator.');

const renderedState = fs.readFileSync('docs/PROJECT_STATE.md', 'utf8');
requireCondition(renderedState.startsWith('<!-- GENERATED FILE.'), 'docs/PROJECT_STATE.md must be marked as generated.');
const renderCheck = spawnSync(process.execPath, ['scripts/render-project-state.mjs', '--check'], { encoding: 'utf8' });
if (renderCheck.status !== 0) {
  failures.push((renderCheck.stderr || renderCheck.stdout || 'Generated project-state check failed.').trim());
}

if (failures.length) {
  for (const failure of failures) console.error(`ERROR: ${failure}`);
  process.exit(1);
}

console.log(`Project state validation passed: canonical ${state.canonical.version}, production ${state.production.version}, ${state.lockedDecisions.length} accepted decisions, ${state.openWork.length} work items.`);
