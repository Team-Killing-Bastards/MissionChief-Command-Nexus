from __future__ import annotations

import json
from pathlib import Path

ROOT = Path('.')


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file_path = ROOT / path
    text = file_path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match in {path}, found {count}')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')


def insert_after(path: str, marker: str, addition: str, label: str) -> None:
    replace_once(path, marker, marker + addition, label)


(ROOT / 'docs/decisions').mkdir(parents=True, exist_ok=True)
(ROOT / 'docs/evidence').mkdir(parents=True, exist_ok=True)

state = {
    '$schema': './docs/project-state.schema.json',
    'schemaVersion': 1,
    'lastUpdated': '2026-08-31',
    'project': {
        'name': 'MissionChief Command Nexus',
        'repository': 'Team-Killing-Bastards/MissionChief-Command-Nexus',
        'defaultBranch': 'main',
        'canonicalUserscript': 'src/missionchief-command-nexus.user.js',
        'technicalOwner': 'MartyBlyth',
        'documentationSupport': 'Conroy1988',
    },
    'authority': {
        'conflictRule': 'The canonical userscript and verified release artifacts win over summaries. project-state.json is the current operating index; accepted ADRs explain locked decisions. Historical handovers, the Google Memory Bank and conversation memory must not silently override them.',
        'precedence': [
            {
                'rank': 1,
                'source': 'Canonical userscript on trusted main and its verified release artifacts',
                'path': 'src/missionchief-command-nexus.user.js',
                'purpose': 'Implemented behaviour and distributable source',
            },
            {
                'rank': 2,
                'source': 'Machine-readable current project state',
                'path': 'project-state.json',
                'purpose': 'Current versions, active decisions, evidence, risks and next work',
            },
            {
                'rank': 3,
                'source': 'Accepted architecture decision records',
                'path': 'docs/decisions/README.md',
                'purpose': 'Why important contracts exist and what supersedes them',
            },
            {
                'rank': 4,
                'source': 'Generated human-readable project state',
                'path': 'docs/PROJECT_STATE.md',
                'purpose': 'Readable view generated from project-state.json',
            },
            {
                'rank': 5,
                'source': 'Sanitised evidence summaries and linked raw diagnostics',
                'path': 'docs/evidence/README.md',
                'purpose': 'Evidence supporting decisions without becoming current truth',
            },
            {
                'rank': 6,
                'source': 'Connected Google Memory Bank and conversation memory',
                'path': '',
                'purpose': 'Handover convenience and historical navigation only',
            },
        ],
    },
    'canonical': {
        'status': 'published',
        'version': '3.0.40',
        'sourceBytes': 2095358,
        'sourceSha256': '9479f2836aae60e0259809aea29c000fbafa265cae2e3c176e2c67d6c69fdc01',
        'components': {
            'missionFinder': '10.6.177',
            'resourceAdministration': '4.2.9',
            'unitNaming': '3.3.28',
            'stationNaming': '1.3.23',
            'personnelAssignment': '1.3.12',
        },
    },
    'production': {
        'version': '3.0.40',
        'tag': 'v3.0.40',
        'releaseCommit': '9f5ce8b5bac35b9fb2654a1712fba06363d94f5a',
        'releaseUrl': 'https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/tag/v3.0.40',
        'publishedAt': '2026-08-31T06:52:56Z',
        'asset': {
            'name': 'MissionChief-Command-Nexus-3.0.40.user.js',
            'bytes': 2095358,
            'sha256': '9479f2836aae60e0259809aea29c000fbafa265cae2e3c176e2c67d6c69fdc01',
        },
        'releaseStatus': 'published',
        'liveValidationStatus': 'pending',
        'liveValidationNote': 'Repository and publication validation passed. The first live v3.0.40 run still needs to prove role-aware wake recovery and terminal managed Worker A admission under real MissionChief timing.',
    },
    'architecture': {
        'summary': 'One lightweight parent controller owns exactly one heavy managed worker realm at a time. Mission Worker A handles mission selection and dispatch; on-demand Transport Worker B handles one exact personal patient or prisoner transport. No dormant mission preload exists.',
        'workerA': {
            'role': 'MISSION_A',
            'owns': [
                'mission requirements and complete vehicle-list loading',
                'Unit Finder and trained-personnel verification',
                'vehicle selection and Dispatch',
                'mission queue progression and safe mission-boundary handoff',
            ],
            'mustNot': [
                'select patient or prisoner destinations',
                'remain on a verified transport route',
                'overlap an active Worker B',
            ],
        },
        'workerB': {
            'role': 'TRANSPORT_B',
            'owns': [
                'one exact personal Radio request',
                'patient hospital destination selection',
                'prisoner cell or release handling',
                'proof that the exact request cleared',
            ],
            'mustNot': [
                'run Unit Finder or mission Auto Mode',
                'select mission vehicles or click Dispatch',
                'process Alliance transport',
                'overlap or promote into Worker A',
            ],
        },
        'invariants': [
            'Worker A is removed before Worker B starts.',
            'Worker B is removed before a fresh Worker A starts.',
            'PIPELINE_PRELOAD_COUNT remains zero; B is reserved for transport.',
            'Personal transport is exact-identity, oldest-first and fail-closed; Alliance rows are excluded.',
            'Prisoner release result and 404 routes are terminal results, never reusable mission URLs.',
            'A parent-appointed managed Worker A is terminal positive authority before DOM readiness and visible-primary ranking.',
            'Visible Mission Control and manual actions remain independent of background worker ownership.',
            'Durable station, vehicle, personnel, training and user-setting data are never cleared by runtime recovery.',
            'Visible-page sleep recovery requires at least 90 seconds; hidden-page recovery requires at least three minutes.',
        ],
    },
    'lockedDecisions': [
        {
            'id': 'ADR-0001',
            'title': 'Durable project records and authority order',
            'file': 'docs/decisions/0001-project-record-authority.md',
            'status': 'accepted',
            'introducedIn': 'repository maintenance 2026-08-31',
        },
        {
            'id': 'ADR-0002',
            'title': 'Mission Worker A and Transport Worker B are separate serialized roles',
            'file': 'docs/decisions/0002-mission-worker-a-transport-worker-b.md',
            'status': 'accepted',
            'introducedIn': '3.0.35',
        },
        {
            'id': 'ADR-0003',
            'title': 'Only exact personal Radio transport enters Worker B',
            'file': 'docs/decisions/0003-personal-transport-queue-scope.md',
            'status': 'accepted',
            'introducedIn': '3.0.35',
        },
        {
            'id': 'ADR-0004',
            'title': 'Qualification-sensitive dispatch is fail-closed',
            'file': 'docs/decisions/0004-trained-personnel-fail-closed.md',
            'status': 'accepted',
            'introducedIn': 'existing production contract',
        },
        {
            'id': 'ADR-0005',
            'title': 'Prisoner release routes are terminal results',
            'file': 'docs/decisions/0005-prisoner-release-terminal-routes.md',
            'status': 'accepted',
            'introducedIn': '3.0.39',
        },
        {
            'id': 'ADR-0006',
            'title': 'Managed Worker A admission is terminal and wake recovery is role-aware',
            'file': 'docs/decisions/0006-managed-worker-admission-and-wake-recovery.md',
            'status': 'accepted',
            'introducedIn': '3.0.40',
        },
    ],
    'evidence': [
        {
            'id': 'RUN-2026-08-30-V3039',
            'title': 'Strong v3.0.39 live run and memory-risk baseline',
            'file': 'docs/evidence/live-run-v3.0.39-2026-08-30.md',
            'kind': 'sanitised-summary',
            'supports': ['MEMORY-001', 'A/B functional stability'],
        },
    ],
    'openWork': [
        {
            'id': 'MEMORY-001',
            'priority': 'P1',
            'status': 'ready',
            'title': 'Reduce long-session memory growth without slowing mission or transport throughput',
            'issue': 396,
            'issueUrl': 'https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/396',
            'evidence': ['RUN-2026-08-30-V3039'],
            'objective': 'Produce repeatable memory reclamation at safe worker boundaries while preserving the current fast mission path and serialized A/B transport contract.',
            'guardrails': [
                'Do not slow normal Unit Finder, selection, Dispatch or destination selection to hide memory growth.',
                'Never reset during selected-vehicle state, Dispatch, active transport, prisoner release or an unconfirmed queue transition.',
                'Do not clear durable Resource Administration registers or user preferences.',
                'Measure maintenance pauses separately from normal mission timing.',
            ],
            'acceptanceCriteria': [
                'Inventory and register every Nexus-owned observer, timer, listener, pending callback and retained Window/Document/DOM reference per worker generation.',
                'Diagnostics prove retired worker scopes reach zero registered observers, timers, listeners and DOM references.',
                'Use soft trim, full worker-realm reset and controller checkpoint reload as escalating safe-boundary actions.',
                'On the reference two-hour Edge run, target a repeatable sawtooth below 900 MiB peak and below 600 MiB after reset where performance.memory is available.',
                'Keep median Dispatch & Next timing and dispatches per hour within five percent of the pre-change reference, excluding recorded maintenance pauses.',
                'No duplicate Dispatch, A/B overlap, transport regression or prisoner-release regression.',
            ],
        },
        {
            'id': 'TELEMETRY-001',
            'priority': 'P2',
            'status': 'backlog',
            'title': 'Restore mission credit capture in diagnostic exports',
            'issue': None,
            'issueUrl': '',
            'evidence': ['RUN-2026-08-30-V3039'],
            'objective': 'Capture estimated mission credits without touching dispatch behaviour.',
            'guardrails': [
                'Keep credit telemetry read-only and non-blocking.',
                'Do not delay Unit Finder or Dispatch for missing credit text.',
            ],
            'acceptanceCriteria': [
                'A representative run records creditCaptureSuccesses greater than zero.',
                'Missing credit evidence remains telemetry-only and never blocks a mission.',
            ],
        },
    ],
    'knownRisks': [
        {
            'id': 'RISK-MEMORY-001',
            'severity': 'high',
            'summary': 'Long sessions can retain more than 2 GiB of reported JavaScript heap despite logical worker recycling.',
            'mitigation': 'Issue #396 and MEMORY-001 require deterministic runtime-scope disposal plus a safe page-level reload backstop.',
        },
        {
            'id': 'RISK-LIVE-001',
            'severity': 'medium',
            'summary': 'Command Nexus 3.0.40 is published but its new wake-recovery behaviour has not yet completed a recorded live validation run.',
            'mitigation': 'Run v3.0.40 from a clean MissionChief tab and inspect the exported wake/ownership evidence before changing thresholds.',
        },
    ],
    'handover': {
        'nextAction': 'Begin GitHub issue #396 with a read-only runtime-retention audit and diagnostic scope counters before changing cleanup thresholds or worker timing.',
        'readOrder': [
            'project-state.json',
            'docs/PROJECT_STATE.md',
            'docs/decisions/README.md',
            'docs/DEVELOPER_HANDOFF.md',
            'docs/evidence/live-run-v3.0.39-2026-08-30.md',
            'src/missionchief-command-nexus.user.js',
        ],
        'updateRule': 'Edit project-state.json, run node scripts/render-project-state.mjs, then run node scripts/check-project-state.mjs. Do not hand-edit docs/PROJECT_STATE.md. After merge or release, update the Google Memory Bank with a concise pointer to the verified repository state and read it back.',
    },
}

(ROOT / 'project-state.json').write_text(
    json.dumps(state, indent=2, ensure_ascii=False) + '\n',
    encoding='utf-8',
)

(ROOT / 'docs/project-state.schema.json').write_text(r'''{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/blob/main/docs/project-state.schema.json",
  "title": "MissionChief Command Nexus current project state",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "$schema",
    "schemaVersion",
    "lastUpdated",
    "project",
    "authority",
    "canonical",
    "production",
    "architecture",
    "lockedDecisions",
    "evidence",
    "openWork",
    "knownRisks",
    "handover"
  ],
  "properties": {
    "$schema": { "const": "./docs/project-state.schema.json" },
    "schemaVersion": { "const": 1 },
    "lastUpdated": { "type": "string", "format": "date" },
    "project": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "repository", "defaultBranch", "canonicalUserscript", "technicalOwner", "documentationSupport"],
      "properties": {
        "name": { "const": "MissionChief Command Nexus" },
        "repository": { "const": "Team-Killing-Bastards/MissionChief-Command-Nexus" },
        "defaultBranch": { "const": "main" },
        "canonicalUserscript": { "const": "src/missionchief-command-nexus.user.js" },
        "technicalOwner": { "type": "string", "minLength": 1 },
        "documentationSupport": { "type": "string", "minLength": 1 }
      }
    },
    "authority": {
      "type": "object",
      "additionalProperties": false,
      "required": ["conflictRule", "precedence"],
      "properties": {
        "conflictRule": { "type": "string", "minLength": 20 },
        "precedence": {
          "type": "array",
          "minItems": 4,
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": ["rank", "source", "path", "purpose"],
            "properties": {
              "rank": { "type": "integer", "minimum": 1 },
              "source": { "type": "string", "minLength": 1 },
              "path": { "type": "string" },
              "purpose": { "type": "string", "minLength": 1 }
            }
          }
        }
      }
    },
    "canonical": {
      "type": "object",
      "additionalProperties": false,
      "required": ["status", "version", "sourceBytes", "sourceSha256", "components"],
      "properties": {
        "status": { "enum": ["published", "candidate"] },
        "version": { "$ref": "#/$defs/version" },
        "sourceBytes": { "type": "integer", "minimum": 1 },
        "sourceSha256": { "$ref": "#/$defs/sha256" },
        "components": { "$ref": "#/$defs/components" }
      }
    },
    "production": {
      "type": "object",
      "additionalProperties": false,
      "required": ["version", "tag", "releaseCommit", "releaseUrl", "publishedAt", "asset", "releaseStatus", "liveValidationStatus", "liveValidationNote"],
      "properties": {
        "version": { "$ref": "#/$defs/version" },
        "tag": { "type": "string", "pattern": "^v\\d+\\.\\d+\\.\\d+$" },
        "releaseCommit": { "$ref": "#/$defs/commit" },
        "releaseUrl": { "type": "string", "format": "uri" },
        "publishedAt": { "type": "string", "format": "date-time" },
        "asset": {
          "type": "object",
          "additionalProperties": false,
          "required": ["name", "bytes", "sha256"],
          "properties": {
            "name": { "type": "string", "minLength": 1 },
            "bytes": { "type": "integer", "minimum": 1 },
            "sha256": { "$ref": "#/$defs/sha256" }
          }
        },
        "releaseStatus": { "const": "published" },
        "liveValidationStatus": { "enum": ["pending", "passed", "failed"] },
        "liveValidationNote": { "type": "string", "minLength": 1 }
      }
    },
    "architecture": {
      "type": "object",
      "additionalProperties": false,
      "required": ["summary", "workerA", "workerB", "invariants"],
      "properties": {
        "summary": { "type": "string", "minLength": 1 },
        "workerA": { "$ref": "#/$defs/worker" },
        "workerB": { "$ref": "#/$defs/worker" },
        "invariants": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } }
      }
    },
    "lockedDecisions": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/decision" } },
    "evidence": { "type": "array", "items": { "$ref": "#/$defs/evidence" } },
    "openWork": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/work" } },
    "knownRisks": { "type": "array", "items": { "$ref": "#/$defs/risk" } },
    "handover": {
      "type": "object",
      "additionalProperties": false,
      "required": ["nextAction", "readOrder", "updateRule"],
      "properties": {
        "nextAction": { "type": "string", "minLength": 1 },
        "readOrder": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } },
        "updateRule": { "type": "string", "minLength": 1 }
      }
    }
  },
  "$defs": {
    "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "sha256": { "type": "string", "pattern": "^[0-9a-f]{64}$" },
    "commit": { "type": "string", "pattern": "^[0-9a-f]{40}$" },
    "components": {
      "type": "object",
      "additionalProperties": false,
      "required": ["missionFinder", "resourceAdministration", "unitNaming", "stationNaming", "personnelAssignment"],
      "properties": {
        "missionFinder": { "$ref": "#/$defs/version" },
        "resourceAdministration": { "$ref": "#/$defs/version" },
        "unitNaming": { "$ref": "#/$defs/version" },
        "stationNaming": { "$ref": "#/$defs/version" },
        "personnelAssignment": { "$ref": "#/$defs/version" }
      }
    },
    "worker": {
      "type": "object",
      "additionalProperties": false,
      "required": ["role", "owns", "mustNot"],
      "properties": {
        "role": { "enum": ["MISSION_A", "TRANSPORT_B"] },
        "owns": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } },
        "mustNot": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } }
      }
    },
    "decision": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "title", "file", "status", "introducedIn"],
      "properties": {
        "id": { "type": "string", "pattern": "^ADR-\\d{4}$" },
        "title": { "type": "string", "minLength": 1 },
        "file": { "type": "string", "pattern": "^docs/decisions/\\d{4}-.+\\.md$" },
        "status": { "enum": ["accepted", "superseded", "proposed"] },
        "introducedIn": { "type": "string", "minLength": 1 }
      }
    },
    "evidence": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "title", "file", "kind", "supports"],
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "title": { "type": "string", "minLength": 1 },
        "file": { "type": "string", "pattern": "^docs/evidence/.+\\.md$" },
        "kind": { "type": "string", "minLength": 1 },
        "supports": { "type": "array", "items": { "type": "string", "minLength": 1 } }
      }
    },
    "work": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "priority", "status", "title", "issue", "issueUrl", "evidence", "objective", "guardrails", "acceptanceCriteria"],
      "properties": {
        "id": { "type": "string", "pattern": "^[A-Z]+-[0-9]{3}$" },
        "priority": { "enum": ["P0", "P1", "P2", "P3"] },
        "status": { "enum": ["ready", "in-progress", "blocked", "backlog", "done"] },
        "title": { "type": "string", "minLength": 1 },
        "issue": { "type": ["integer", "null"], "minimum": 1 },
        "issueUrl": { "type": "string" },
        "evidence": { "type": "array", "items": { "type": "string", "minLength": 1 } },
        "objective": { "type": "string", "minLength": 1 },
        "guardrails": { "type": "array", "items": { "type": "string", "minLength": 1 } },
        "acceptanceCriteria": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } }
      }
    },
    "risk": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "severity", "summary", "mitigation"],
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "severity": { "enum": ["low", "medium", "high", "critical"] },
        "summary": { "type": "string", "minLength": 1 },
        "mitigation": { "type": "string", "minLength": 1 }
      }
    }
  }
}
''', encoding='utf-8')

(ROOT / 'scripts/render-project-state.mjs').write_text(r'''#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const STATE_PATH = path.resolve('project-state.json');
const OUTPUT_PATH = path.resolve('docs/PROJECT_STATE.md');
const CHECK_ONLY = process.argv.includes('--check');

function linkFor(value) {
  if (!value) return '';
  if (/^https?:\/\//.test(value)) return value;
  if (value.startsWith('docs/')) return value.slice('docs/'.length);
  return `../${value}`;
}

function bulletLines(items, indent = '') {
  return items.map((item) => `${indent}- ${item}`);
}

function render(state) {
  const canonical = state.canonical;
  const production = state.production;
  const components = canonical.components;
  const lines = [
    '<!-- GENERATED FILE. Edit project-state.json, then run: node scripts/render-project-state.mjs -->',
    '',
    '# Current Project State',
    '',
    `Last updated: **${state.lastUpdated}**`,
    '',
    '> This is the human-readable view of [`project-state.json`](../project-state.json). Do not edit this file by hand. When this file, a historical handover or conversation memory conflicts with the canonical userscript, the canonical userscript and verified release artifacts win.',
    '',
    '## Current baseline',
    '',
    '| Item | Current state |',
    '|---|---|',
    `| Canonical source status | \`${canonical.status}\` |`,
    `| Canonical source version | \`${canonical.version}\` |`,
    `| Public production release | \`${production.version}\` |`,
    `| Production tag | \`${production.tag}\` |`,
    `| Production commit | \`${production.releaseCommit}\` |`,
    `| Production asset | \`${production.asset.name}\` (${production.asset.bytes.toLocaleString('en-GB')} bytes) |`,
    `| Source SHA-256 | \`${canonical.sourceSha256}\` |`,
    `| Release status | \`${production.releaseStatus}\` |`,
    `| Live validation | \`${production.liveValidationStatus}\` |`,
    '',
    `Release: [${production.releaseUrl}](${production.releaseUrl})`,
    '',
    '### Component versions',
    '',
    '| Component | Version |',
    '|---|---|',
    `| Mission Finder | \`${components.missionFinder}\` |`,
    `| Resource Administration | \`${components.resourceAdministration}\` |`,
    `| Unit Naming | \`${components.unitNaming}\` |`,
    `| Station Naming | \`${components.stationNaming}\` |`,
    `| Personnel Assignment | \`${components.personnelAssignment}\` |`,
    '',
    '### Live-validation note',
    '',
    production.liveValidationNote,
    '',
    '## Authority order',
    '',
    state.authority.conflictRule,
    '',
  ];

  for (const item of [...state.authority.precedence].sort((a, b) => a.rank - b.rank)) {
    const linked = item.path ? `[${item.source}](${linkFor(item.path)})` : item.source;
    lines.push(`${item.rank}. ${linked} — ${item.purpose}.`);
  }

  lines.push('', '## Locked runtime architecture', '', state.architecture.summary, '');
  lines.push(`### Worker A — \`${state.architecture.workerA.role}\``, '', '**Owns**', '');
  lines.push(...bulletLines(state.architecture.workerA.owns));
  lines.push('', '**Must not**', '');
  lines.push(...bulletLines(state.architecture.workerA.mustNot));
  lines.push('', `### Worker B — \`${state.architecture.workerB.role}\``, '', '**Owns**', '');
  lines.push(...bulletLines(state.architecture.workerB.owns));
  lines.push('', '**Must not**', '');
  lines.push(...bulletLines(state.architecture.workerB.mustNot));
  lines.push('', '### Invariants', '');
  lines.push(...bulletLines(state.architecture.invariants));

  lines.push('', '## Active work', '');
  lines.push('| Priority | ID | Status | Work | Issue |');
  lines.push('|---|---|---|---|---|');
  for (const item of state.openWork) {
    const issue = item.issueUrl ? `[#${item.issue}](${item.issueUrl})` : '—';
    lines.push(`| ${item.priority} | \`${item.id}\` | \`${item.status}\` | ${item.title} | ${issue} |`);
  }

  for (const item of state.openWork.filter((entry) => entry.status !== 'done')) {
    lines.push('', `### ${item.id} — ${item.title}`, '', item.objective, '');
    if (item.guardrails.length) {
      lines.push('**Guardrails**', '', ...bulletLines(item.guardrails), '');
    }
    lines.push('**Acceptance criteria**', '', ...bulletLines(item.acceptanceCriteria));
  }

  lines.push('', '## Known risks', '');
  for (const risk of state.knownRisks) {
    lines.push(`- **${risk.severity.toUpperCase()} — ${risk.id}:** ${risk.summary} Mitigation: ${risk.mitigation}`);
  }

  lines.push('', '## Locked decisions', '');
  lines.push('| Decision | Status | Introduced |');
  lines.push('|---|---|---|');
  for (const decision of state.lockedDecisions) {
    lines.push(`| [${decision.id}: ${decision.title}](${linkFor(decision.file)}) | \`${decision.status}\` | ${decision.introducedIn} |`);
  }

  lines.push('', '## Evidence index', '');
  for (const evidence of state.evidence) {
    lines.push(`- [${evidence.id}: ${evidence.title}](${linkFor(evidence.file)}) — ${evidence.kind}; supports ${evidence.supports.join(', ')}.`);
  }

  lines.push('', '## Handover', '', `**Next action:** ${state.handover.nextAction}`, '', '**Read in this order**', '');
  state.handover.readOrder.forEach((entry, index) => {
    lines.push(`${index + 1}. [${entry}](${linkFor(entry)})`);
  });
  lines.push('', '**Update rule**', '', state.handover.updateRule, '');
  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
}

const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
const rendered = render(state);

if (CHECK_ONLY) {
  if (!fs.existsSync(OUTPUT_PATH)) {
    console.error('ERROR: docs/PROJECT_STATE.md does not exist. Run node scripts/render-project-state.mjs.');
    process.exit(1);
  }
  const current = fs.readFileSync(OUTPUT_PATH, 'utf8');
  if (current !== rendered) {
    console.error('ERROR: docs/PROJECT_STATE.md is stale. Edit project-state.json and run node scripts/render-project-state.mjs.');
    process.exit(1);
  }
  console.log('Generated project-state Markdown is current.');
} else {
  fs.writeFileSync(OUTPUT_PATH, rendered, 'utf8');
  console.log('Updated docs/PROJECT_STATE.md from project-state.json.');
}
''', encoding='utf-8')

(ROOT / 'scripts/check-project-state.mjs').write_text(r'''#!/usr/bin/env node

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
''', encoding='utf-8')

decisions = {
    'docs/decisions/README.md': '''# Architecture Decision Register

This directory records decisions that future work must understand before changing protected behaviour. The current accepted set is indexed by [`project-state.json`](../../project-state.json) and rendered in [`PROJECT_STATE.md`](../PROJECT_STATE.md).

## Status rules

- **proposed** — under review; not yet a locked operating contract.
- **accepted** — current and protected by source, tests, project state or all three.
- **superseded** — historical; the replacement ADR must be named explicitly.

Do not rewrite an accepted ADR to pretend a later design was always present. Add a new ADR and mark the old one superseded.

## Accepted decisions

1. [ADR-0001: Durable project records and authority order](0001-project-record-authority.md)
2. [ADR-0002: Mission Worker A and Transport Worker B are separate serialized roles](0002-mission-worker-a-transport-worker-b.md)
3. [ADR-0003: Only exact personal Radio transport enters Worker B](0003-personal-transport-queue-scope.md)
4. [ADR-0004: Qualification-sensitive dispatch is fail-closed](0004-trained-personnel-fail-closed.md)
5. [ADR-0005: Prisoner release routes are terminal results](0005-prisoner-release-terminal-routes.md)
6. [ADR-0006: Managed Worker A admission is terminal and wake recovery is role-aware](0006-managed-worker-admission-and-wake-recovery.md)

## Adding a decision

Use the next four-digit number and include: status, date, context, decision, locked consequences, acceptable exceptions, regression/evidence references and supersession details where relevant. Update `project-state.json`, regenerate `docs/PROJECT_STATE.md`, and run `node scripts/check-project-state.mjs`.
''',
    'docs/decisions/0001-project-record-authority.md': '''# ADR-0001: Durable project records and authority order

**Status:** accepted  
**Date:** 2026-08-31  
**Decision owner:** MartyBlyth

## Context

The project has accumulated source code, release records, long diagnostic exports, historical handovers, a connected Google Memory Bank and conversation summaries. Treating all of them as equal “memory” makes it easy to reintroduce retired behaviour or mistake a historical diagnostic for current production truth.

## Decision

Use a strict authority order:

1. The canonical userscript on trusted `main`, matching tag and verified release artifacts define implemented production behaviour.
2. `project-state.json` is the machine-readable current operating index.
3. Accepted ADRs explain the current locked decisions and their reasons.
4. `docs/PROJECT_STATE.md` is generated from `project-state.json` for human reading.
5. Sanitised evidence summaries support claims but do not become current state.
6. The Google Memory Bank and conversation memory provide navigation and history only.

`docs/PROJECT_STATE.md` must never be hand-edited. Current state changes begin in `project-state.json`, are rendered with `scripts/render-project-state.mjs`, and are validated with `scripts/check-project-state.mjs`.

## Locked consequences

- A historical handover or diagnostic cannot silently override current source or project state.
- Raw diagnostics are not copied wholesale into the current-state record.
- Release completion updates the repository state first, then writes a concise verified pointer to the connected Memory Bank.
- Source candidates may use `canonical.status = candidate`; public production remains separately recorded until publication is verified.
- Accepted decisions are superseded by a new ADR rather than rewritten.

## Validation

- `scripts/check-project-state.mjs`
- `scripts/render-project-state.mjs --check`
- Repository Quality runs the state validator on every pull request and `main` push.
''',
    'docs/decisions/0002-mission-worker-a-transport-worker-b.md': '''# ADR-0002: Mission Worker A and Transport Worker B are separate serialized roles

**Status:** accepted  
**Date:** 2026-08-29  
**Introduced:** Command Nexus 3.0.35

## Context

Using one worker for mission dispatch and transport navigation repeatedly crossed document and ownership boundaries. A successful transport could return the same frame to a mission or additional-vehicle route, where a secondary ownership gate rejected the already-appointed worker.

## Decision

- `MISSION_A` owns mission requirements, complete vehicle loading, Unit Finder, trained-personnel checks, vehicle selection, Dispatch and mission queue progression.
- `TRANSPORT_B` owns one exact personal patient or prisoner transport.
- A is removed before B is created.
- B is removed before a fresh A is created.
- The two active roles never coexist.
- `PIPELINE_PRELOAD_COUNT` remains zero; B is not a dormant next-mission preload.

## Locked consequences

Worker A cannot select hospitals, cells or prisoner release. Worker B cannot run Unit Finder, mission Auto Mode, vehicle selection, Dispatch or mission queue progression. B cannot be promoted into A.

## Acceptable exceptions

A verified transport route accidentally reached by A is not handled by A. The parent controller converts the exact request into B ownership or removes the invalid A context fail-closed.

## Protection

The permanent Worker A/Worker B separation and route-handoff regressions must pass before release.
''',
    'docs/decisions/0003-personal-transport-queue-scope.md': '''# ADR-0003: Only exact personal Radio transport enters Worker B

**Status:** accepted  
**Date:** 2026-08-29  
**Introduced:** Command Nexus 3.0.35

## Context

A generic mission message such as “Transport is needed” is not enough to prove which vehicle and mission own the action. Alliance rows also appear in Radio and must never be handled as personal work.

## Decision

Worker B may start only from a currently verified personal Radio request containing an exact request key, vehicle ID and mission ID. Requests are handled oldest-first using retained first-seen time. The request is revalidated immediately before B starts and again when recovery chooses between completing or rebuilding B.

## Locked consequences

- Alliance Radio transport is excluded.
- Stale or manually cleared requests do not create B.
- One B handles one request at a time.
- Missing or conflicting identity evidence fails closed.
- Normal mission position does not determine transport priority.

## Protection

Transport fairness, Alliance exclusion, exact-identity and role-aware wake-recovery regressions protect this decision.
''',
    'docs/decisions/0004-trained-personnel-fail-closed.md': '''# ADR-0004: Qualification-sensitive dispatch is fail-closed

**Status:** accepted  
**Date:** 2026-08-31  
**Introduced:** existing production contract

## Context

A vehicle label or seat count does not prove that the currently assigned crew hold the required MissionChief qualification. Dispatching on stale, partial or guessed evidence can leave missions unresolved and hide real staffing shortages.

## Decision

Qualification-sensitive demand is satisfied only by fresh, complete, exact-vehicle Personnel Register evidence that covers the required trained-personnel quantity. Missing, stale, incomplete or ambiguous evidence keeps Unit Finder/Mission Update not-ready and blocks Auto Mode before Dispatch.

Exact compatible vehicles with missing or stale evidence may enter the live verification pool so their assignment pages can create current evidence. The later selection/readiness gate remains authoritative and fail-closed.

## Locked consequences

- Correct vehicle type alone is insufficient.
- Display-name guessing is not authoritative.
- Aggregate shortages must not be silently treated as success.
- Diagnostic records must avoid personnel names while retaining vehicle/station evidence where available.

## Protection

Training-profile, live-verification, selection-readiness and no-dispatch-on-shortage regressions protect this decision.
''',
    'docs/decisions/0005-prisoner-release-terminal-routes.md': '''# ADR-0005: Prisoner release routes are terminal results

**Status:** accepted  
**Date:** 2026-08-30  
**Introduced:** Command Nexus 3.0.39

## Context

MissionChief can return `/missions/{id}/gefangene/entlassen` as a 404-style page while also presenting proof that prisoner release succeeded. Treating that URL as a normal mission caused Mission Finder bootstrap, clean retry and resume persistence to replay a terminal result page.

## Decision

`/missions/{id}/gefangene/entlassen` is a terminal prisoner-release result, never a reusable mission document. Success evidence completes the prisoner flow immediately. When the result is ambiguous, the controller waits only for the bounded terminal evidence window, then removes the worker and continues fail-closed.

## Locked consequences

The terminal URL cannot become `currentMissionUrl`, `bootstrapMissionUrl`, stored resume state or a clean-retry target. Mission Finder, Unit Finder, Auto Mode discovery and Dispatch never start on that route. Recovery canonicalises to `/missions/{id}` or another actionable mission.

## Protection

The prisoner-release terminal-route regression must prove no terminal URL persistence, replay or Auto Mode lookup.
''',
    'docs/decisions/0006-managed-worker-admission-and-wake-recovery.md': '''# ADR-0006: Managed Worker A admission is terminal and wake recovery is role-aware

**Status:** accepted  
**Date:** 2026-08-31  
**Introduced:** Command Nexus 3.0.40

## Context

A 26-second browser scheduling delay interrupted a successfully cleared Worker B transport. Generic “sleep” recovery dismantled B and started A before the normal B-to-A completion path. The new A was then accepted as managed-active and immediately rejected by a secondary inactive-owner check.

## Decision

- Ordinary scheduling delays are not sleep: visible-page recovery requires at least 90 seconds; hidden-page recovery requires at least three minutes.
- When B is active, wake recovery force-checks the exact personal Radio request.
- A cleared request completes through the normal B-to-A function.
- A still-live request rebuilds the same exact B; mission A does not start.
- Radio first-seen ordering and bounded retry cooldowns survive recovery.
- The immutable parent-appointed managed Worker A frame identity is terminal positive authority before DOM body readiness, visible-primary ranking and execution-ownership checks.
- Managed-active and inactive-owner outcomes are mutually exclusive for the same bootstrap.

## Locked consequences

The generic wake path cannot bypass normal transport completion. A clean Worker A retry clears stale shared queue/opening and Auto Mode state while preserving the final-dispatch duplicate guard.

## Protection

`scripts/check-v3-role-aware-wake-recovery-v3040.mjs`, active-bootstrap recovery and transport-context recovery regressions protect this decision.
''',
}
for filename, content in decisions.items():
    (ROOT / filename).write_text(content, encoding='utf-8')

(ROOT / 'docs/evidence/README.md').write_text('''# Evidence Register

Evidence records support a specific decision, issue or live-validation claim. They are not the current operating state. Start with [`project-state.json`](../../project-state.json) and [`PROJECT_STATE.md`](../PROJECT_STATE.md).

## Rules

- Store a concise sanitised summary in the repository.
- Keep raw diagnostic JSON outside the current-state document unless a small, reviewed fixture is required for an executable test.
- Record the source version, environment, time window, observed facts, limits and the exact claim the evidence supports.
- Do not include credentials, cookies, webhook URLs, personnel names, private alliance data or unnecessary account detail.
- A later release or ADR may supersede the conclusion without rewriting the historical evidence.

## Current long-session evidence

- [Strong v3.0.39 live run and memory-risk baseline — 2026-08-30](live-run-v3.0.39-2026-08-30.md)

## Existing capability evidence

The other files in this directory retain issue-specific sanitised captures for medical, Fire/Airfield, SAR/Coastguard training profiles and exact MissionChief vehicle identities. Their issue number and file name identify the protected contract.
''', encoding='utf-8')

(ROOT / 'docs/evidence/live-run-v3.0.39-2026-08-30.md').write_text('''# Strong v3.0.39 live run and memory-risk baseline — 2026-08-30

## Status

Sanitised historical evidence. This file supports issue [#396](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/396) and `MEMORY-001`; it does not replace current project state.

## Source

A Command Nexus diagnostic export generated at `2026-08-30T21:50:13.338Z` from Microsoft Edge on MissionChief UK. The raw export remains external project evidence because it contains a large quantity of mission and vehicle identifiers.

## Functional result

- Runtime: approximately **2 hours 14 minutes 21 seconds**.
- Unique missions handled: **288**.
- Successful dispatches: **301**.
- Overall completed-dispatch rate: **134.4 per hour**.
- Median Dispatch & Next timing: approximately **7.8 seconds**.
- Median complete mission cycle: approximately **11.7 seconds**.
- Worker B transport attempts: **115**.
- Worker B transports confirmed cleared: **114**.
- Fatal controller errors: **0**.
- Manual retries: **0**.
- Recorded stalled transports: **0**.
- Recorded transport hard recoveries: **0**.
- A live prisoner-release terminal result was handled and the run continued for roughly another 33 minutes.

This is strong evidence that mission dispatch, serialized A/B transport ownership, prisoner-release continuation and recovery can remain fast and stable under sustained load.

## Memory result

- Reported JavaScript heap at export: approximately **2.12 GiB**.
- Recorded peak: approximately **2.17 GiB**.
- Scheduled runtime recycles: **55**.
- Managed runtime disposals: **268**.
- RAM protection remained active at the hard ceiling and recorded no release before export.

The visible controller caches were small compared with the heap. The export cannot identify the exact retaining object, but it strongly supports investigating detached iframe documents, observer/timer callbacks, event listeners and retained Window/Document/DOM references. A logical disposal count is not proof that a browser realm became unreachable.

A separate later run peaked around **1.14 GiB** and returned to roughly **222 MiB**, showing that substantial reclamation is possible and the problem is inconsistent rather than an unavoidable cost of fast dispatch.

## Telemetry limitation

Credit capture missed all 301 successful dispatches. This did not affect automation, but mission-value and value-per-hour figures were unusable.

## Supported conclusion

The next optimisation should preserve the hot mission path and improve physical cleanup at safe boundaries. The target is a repeatable memory sawtooth, not slower polling across every mission.

## Not supported by this evidence

The export does not prove which exact third-party or Nexus object retained each old realm. Heap readings are browser-provided and should be treated as trend evidence rather than a universal absolute measurement.
''', encoding='utf-8')

# Main README: point to the state record and remove obsolete dormant-preload wording.
replace_once(
    'README.md',
    '> **V3 production:** the stopped main map keeps only the lightweight controller. A visible mission with Auto Mode stopped mounts the manual controls but leaves MissionChief\'s complete vehicle list collapsed until Unit Finder, Mission Update or Ally Steal explicitly requests it. When started, one active Mission Finder dispatcher owns operational state while a lightweight, interaction-blocked B warms only the immediate next page; B mounts Mission Finder only after verified promotion to A. Final Dispatch-only completion returns to the V3 two-mission controller instead of entering Mission Finder\'s standalone queue watcher. A sustained adaptive heap guard—not the normal startup footprint—drops it to A-only and releases after a verified safe minute. Version 3.0.38 also enforces the split at the parent route boundary: any patient or prisoner vehicle route reached by mission Worker A is transferred to exact personal transport Worker B before transport handling can continue.',
    '> **V3 production:** the map page keeps a lightweight parent controller and exactly one heavy managed worker realm at a time. Worker A is mission-only: requirements, complete vehicle loading, Unit Finder, trained-personnel checks, selection, Dispatch and queue progression. On-demand Worker B handles one exact personal patient or prisoner Radio request and is destroyed before a fresh A starts. No dormant mission preload exists. Command Nexus 3.0.40 also makes wake recovery role-aware and treats the parent-appointed Worker A identity as terminal authority before DOM and visible-frame ranking. See the [current project state](docs/PROJECT_STATE.md) for the locked contract and active work.',
    'README current V3 summary',
)
replace_once(
    'README.md',
    '[**Command brief**](#command-brief) · [**Install**](#install-in-60-seconds)',
    '[**Project state**](docs/PROJECT_STATE.md) · [**Command brief**](#command-brief) · [**Install**](#install-in-60-seconds)',
    'README navigation state link',
)
replace_once(
    'README.md',
    '| **Auto Mode** | Loads the complete vehicle list, evaluates demand, selects resources, validates readiness, and dispatches as a managed cycle; below two actionable personal missions it releases A/B and resumes from a fresh A only after two missions are stable |',
    '| **Auto Mode** | Loads the complete vehicle list, evaluates demand, selects resources, validates readiness, and dispatches as a managed cycle; below two actionable personal missions it releases the active worker and resumes from a fresh A only after two missions are stable |',
    'README Auto Mode wording',
)
replace_once(
    'README.md',
    '- Managed V3 leaves one personal mission in reserve: after dispatch and any patient/prisoner transport finish, fewer than two actionable missions triggers a zero-worker pause. A new personal radio request can temporarily create an exact transport-only A, which releases itself afterwards. Two missions must remain stable for 1.5 seconds before a fresh A and dormant B are created.\n- A/B are explicitly torn down and rebuilt at a verified boundary after 12 native advances or 8 minutes. Under memory pressure, B is released immediately and A uses an 8-advance/4-minute boundary recycle. Durable station, unit, personnel, training and setting registers are never cleared.\n- B preloads only the immediate next mission document and never expands the account-wide vehicle table. A confirmed stalled dispatch is quarantined from duplicate routing, and a fatal V3 error snapshots then releases every managed worker.',
    '- Managed V3 leaves one personal mission in reserve: after dispatch and any personal transport finish, fewer than two actionable missions triggers a zero-worker pause. A new exact personal Radio request may create transport-only Worker B during that pause; B releases itself afterwards. Two missions must remain stable for 1.5 seconds before a fresh mission Worker A starts.\n- A and B are serialized and never coexist. A is removed before exact transport B starts; B is removed before a fresh A starts. Boundary recycling and recovery never clear durable station, unit, personnel, training or user-setting registers.\n- There is no dormant mission preload. Worker B is reserved for exact personal transport, while confirmed stalled dispatches are quarantined from duplicate routing and fatal V3 errors snapshot then release the managed worker.',
    'README runtime hardening A/B contract',
)

# Documentation index and operating docs.
replace_once(
    'docs/README.md',
    '## Current operational documentation\n\n- [Developer Handoff](DEVELOPER_HANDOFF.md)',
    '## Current operational documentation\n\n- [Current Project State](PROJECT_STATE.md) — generated current versions, locked decisions, evidence, risks and next work.\n- [Decision Register](decisions/README.md) — accepted architecture decisions and supersession rules.\n- [Evidence Register](evidence/README.md) — sanitised supporting evidence, kept separate from current truth.\n- [Developer Handoff](DEVELOPER_HANDOFF.md)',
    'docs index current-state links',
)
insert_after(
    'docs/README.md',
    '- [Main README](../README.md)\n',
    '- [Machine-readable project state](../project-state.json)\n',
    'docs canonical state link',
)

insert_after(
    'docs/ARCHITECTURE.md',
    '> Source-code direction and final technical decisions remain with **MartyBlyth**, the project developer. Conroy1988 provides repository and documentation support only.\n',
    '\n> Current versions, locked decisions, live-validation status and active work are indexed in [Current Project State](PROJECT_STATE.md). When this narrative conflicts with the generated state or canonical source, the canonical source wins.\n',
    'architecture authority note',
)
replace_once(
    'docs/ARCHITECTURE.md',
    'The canonical module baseline is Resource Administration `V4.2.8` and Mission Finder `V10.6.177`. The Resource Administration interfaces report Unit Naming `3.3.27`, Station Naming `1.3.22` and Personnel Assignment `1.3.12`.',
    'The canonical module baseline is Resource Administration `V4.2.9` and Mission Finder `V10.6.177`. The Resource Administration interfaces report Unit Naming `3.3.28`, Station Naming `1.3.23` and Personnel Assignment `1.3.12`.',
    'architecture component versions',
)
replace_once(
    'docs/ARCHITECTURE.md',
    '├── Metadata and V3 ownership/pipeline controller\n│   ├── Worker A sole-dispatch ownership\n│   ├── Adaptive dormant Worker B page-warm preload\n│   ├── Verified promotion and handoff\n│   ├── Transport-aware 8/16-second recovery\n│   ├── Two-mission low-supply pause/resume\n│   ├── Controller-owned final Dispatch-only handoff\n│   ├── Boundary-only worker lifecycle recycling\n│   └── Computer-sleep continuity recovery',
    '├── Metadata and V3 ownership/lifecycle controller\n│   ├── Mission-only Worker A\n│   ├── On-demand personal transport-only Worker B\n│   ├── Serialized A-to-B and B-to-A handoff\n│   ├── Zero dormant mission preload\n│   ├── Two-mission low-supply pause/resume\n│   ├── Controller-owned final Dispatch-only handoff\n│   ├── Boundary-only worker lifecycle recycling\n│   └── Role-aware suspended-browser recovery',
    'architecture controller tree',
)
old_runtime = 'V3 low-supply and memory lifecycle cleanup applies only to managed mission frames. A visible mission opened while Auto Mode is stopped mounts the manual Mission Finder controls but leaves the complete MissionChief vehicle list collapsed; Unit Finder, Mission Update and Ally Steal load it only after an explicit click. Worker A dispatches the current mission without opening the reserved final mission, transport processing remains authoritative, and teardown waits until no personal handoff is active. Confirmed Auto Mode cancels pending discovery, while discovery that observes a non-mission transport route returns immediately to the route watcher. If a cleared patient transport later leaves Worker A on `/vehicles/{id}`, the controller waits through the bounded redirect window, verifies that the exact vehicle has no personal Radio request or active destination context, then rebuilds only the exact pending mission; it never waits for the ambulance to arrive. A bootstrap failure may reload only its exact mission once; cumulative rescue telemetry never blocks a later mission\'s own bounded incident. Dormant B warms the immediate next mission but never expands its vehicle table. RAM protection learns the normal A+B startup baseline and only releases B after 15 seconds above either baseline plus 192 MiB or the 768 MiB hard ceiling. A is then restarted at the next verified boundary after its observers, timers, DOM caches and load handlers are detached. These cleanups must not clear Resource Administration or MissionChief station, unit, personnel, training or durable preference data.'
new_runtime = 'V3 low-supply and memory lifecycle cleanup applies only to managed background work. A visible mission opened while Auto Mode is stopped mounts the manual Mission Finder controls but leaves the complete MissionChief vehicle list collapsed; Unit Finder, Mission Update and Ally Steal load it only after an explicit click. Exactly one heavy worker realm exists: mission Worker A or transport Worker B. A never selects a patient/prisoner destination, B never runs Unit Finder or Dispatch, A is removed before B starts and B is removed before a fresh A starts. No dormant next-mission preload exists. Verified personal Radio requests are oldest-first and exact-identity; Alliance rows remain excluded. Prisoner-release result routes are terminal and cannot be persisted or replayed. A parent-appointed managed A is terminal positive authority before DOM readiness and visible-primary ranking. Ordinary 20–30 second scheduling delays do not trigger sleep recovery; visible recovery requires 90 seconds and hidden recovery requires three minutes. When a genuine gap affects B, the exact Radio request decides whether normal B completion runs or the same exact B is rebuilt. These cleanups must not clear Resource Administration or MissionChief station, unit, personnel, training or durable preference data.'
replace_once('docs/ARCHITECTURE.md', old_runtime, new_runtime, 'architecture current lifecycle paragraph')
replace_once(
    'docs/ARCHITECTURE.md',
    'See [Developer Handoff](DEVELOPER_HANDOFF.md), [Testing Strategy](TESTING.md) and [Release Process](RELEASE_PROCESS.md).',
    'See [Current Project State](PROJECT_STATE.md), [Decision Register](decisions/README.md), [Developer Handoff](DEVELOPER_HANDOFF.md), [Testing Strategy](TESTING.md) and [Release Process](RELEASE_PROCESS.md).',
    'architecture closing links',
)

replace_once(
    'docs/DEVELOPER_HANDOFF.md',
    'This is the first document to read when resuming MissionChief Command Nexus development.',
    'Read the generated [Current Project State](PROJECT_STATE.md) first. This document provides the deeper implementation handoff after the current versions, accepted decisions, evidence and next work are confirmed.',
    'handoff opening order',
)
replace_once(
    'docs/DEVELOPER_HANDOFF.md',
    '| Resource Administration module | `V4.2.8` |\n| Unit / Station / Personnel UI versions | `3.3.27` / `1.3.22` / `1.3.12` |',
    '| Resource Administration module | `V4.2.9` |\n| Unit / Station / Personnel UI versions | `3.3.28` / `1.3.23` / `1.3.12` |\n| Current-state record | `project-state.json` → generated `docs/PROJECT_STATE.md` |',
    'handoff component versions',
)
replace_once(
    'docs/DEVELOPER_HANDOFF.md',
    '- V3 owns an adaptive two-mission pipeline: Worker A is the sole dispatcher and dormant Worker B warms only the immediate next page without expanding the full vehicle table. Promotion is fail-closed unless the next mission and storage owner are verified.\n- V3 pauses with zero mission frames below two actionable personal missions, including the exact final Dispatch-only path, waits for two missions to remain stable, then creates a fresh A. A managed worker never enters Mission Finder\'s standalone 15-mission queue watcher. It recycles A/B after 12 advances or 8 minutes. RAM protection first learns the normal 60-second A+B baseline, then requires either 192 MiB sustained growth or the 768 MiB ceiling for 15 seconds before B is released and A uses an 8-advance/4-minute boundary recycle. No durable register is cleared.',
    '- V3 owns a serialized one-worker lifecycle: Worker A is mission-only and Worker B is created on demand for one exact personal patient/prisoner Radio request. A is removed before B starts, B is removed before a fresh A starts, and no dormant mission preload exists.\n- V3 pauses with zero background workers below two actionable personal missions, including the exact final Dispatch-only path, and resumes from a fresh A after two missions remain stable. Worker recycling, role-aware wake recovery and RAM protection never clear a durable register. Visible-page sleep recovery requires 90 seconds and hidden-page recovery requires three minutes.',
    'handoff A/B implementation bullets',
)
replace_once(
    'docs/DEVELOPER_HANDOFF.md',
    '## Current engineering priorities\n\n1. Expand live evidence and reproducible fixtures around high-risk mission selection.\n2. Complete migration, compatibility and long-session evidence.\n3. Keep regressions behavior-focused and the repository free of one-use builders or trigger artifacts.\n4. Consolidate shared lifecycle, storage and UI responsibilities only behind protected behavior.\n5. Keep the release path idempotent, auditable and recoverable.',
    '## Current engineering priorities\n\n1. Complete issue [#396](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/396): reduce long-session memory growth without slowing the hot mission or transport path.\n2. Live-validate the 3.0.40 role-aware wake-recovery and managed Worker A admission contract.\n3. Expand live evidence and reproducible fixtures around high-risk mission selection.\n4. Keep regressions behaviour-focused and the repository free of one-use builders or trigger artifacts.\n5. Consolidate shared lifecycle, storage and UI responsibilities only behind protected behaviour.',
    'handoff engineering priorities',
)
replace_once(
    'docs/DEVELOPER_HANDOFF.md',
    '## Key references\n\n- [Canonical source](../src/missionchief-command-nexus.user.js)',
    '## Key references\n\n- [Machine-readable project state](../project-state.json)\n- [Generated current project state](PROJECT_STATE.md)\n- [Decision register](decisions/README.md)\n- [Evidence register](evidence/README.md)\n- [Canonical source](../src/missionchief-command-nexus.user.js)',
    'handoff key state references',
)

replace_once(
    'docs/ROADMAP.md',
    '- [x] Publish Command Nexus `3.0.34` with Mission Finder `V10.6.177`, the proven `3.0.29` runtime and diagnostic-only Worker A lifecycle evidence, while retaining mission-level fulfilment/failure exports, optional High Risk Missing Person Ambulance coverage, standalone pop-out naming filters, exact PRV/SRV and Coastguard helicopter selection, transport/prisoner recovery, bounded endurance telemetry and station-aware staffing evidence.\n- [x] Keep one sole dispatcher active while one dormant worker page-warms the immediate next mission without expanding its vehicle table, and fail closed on uncertain ownership or handoff.\n- [x] Retain Resource Administration `V4.2.8`, with Unit Naming `3.3.27`, Station Naming `1.3.22` and Personnel Assignment `1.3.12`.',
    '- [x] Publish Command Nexus `3.0.40` with Mission Finder `V10.6.177`, mission-only Worker A, exact personal transport-only Worker B, prisoner-release terminal handling and role-aware wake recovery.\n- [x] Keep exactly one heavy managed worker active: A is removed before B starts, B is removed before a fresh A starts, and no dormant mission preload exists.\n- [x] Retain Resource Administration `V4.2.9`, with Unit Naming `3.3.28`, Station Naming `1.3.23` and Personnel Assignment `1.3.12`.',
    'roadmap production baseline',
)
replace_once(
    'docs/ROADMAP.md',
    '### 3. Lifecycle, migration and compatibility\n\n- [ ] Complete the persistent/session storage inventory and migration precedence rules.\n- [ ] Record long-session observer, timer, memory and CPU behavior.',
    '### 3. Lifecycle, memory, migration and compatibility\n\n- [ ] Complete issue [#396](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/396): deterministic worker-scope disposal, safe escalating memory recovery and a two-hour no-slowdown benchmark.\n- [ ] Complete the persistent/session storage inventory and migration precedence rules.\n- [ ] Record long-session observer, timer, memory and CPU behaviour.',
    'roadmap memory priority',
)
replace_once(
    'docs/ROADMAP.md',
    '- [x] Separate current operational documentation from immutable historical handovers and incident records.\n- [ ] Keep trusted-main publication idempotent',
    '- [x] Separate current operational documentation from immutable historical handovers and incident records.\n- [x] Add machine-readable current state, generated human state, accepted ADRs, an evidence register and automated drift validation.\n- [ ] Keep trusted-main publication idempotent',
    'roadmap durable records completion',
)
replace_once(
    'docs/ROADMAP.md',
    '- Active priorities and acceptance criteria live in [GitHub Issues](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues).\n\nStart with the [Developer Handoff](DEVELOPER_HANDOFF.md) when resuming work.',
    '- Active priorities and acceptance criteria are indexed in [Current Project State](PROJECT_STATE.md) and linked to [GitHub Issues](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues).\n\nStart with [Current Project State](PROJECT_STATE.md), then the [Developer Handoff](DEVELOPER_HANDOFF.md), when resuming work.',
    'roadmap resume order',
)

replace_once(
    'CONTRIBUTING.md',
    '1. Read [Developer Handoff](docs/DEVELOPER_HANDOFF.md).\n2. Read the relevant open issue and the [master v1.0.x tracker](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/10).\n3. Pull the latest `main` branch.\n4. Confirm the current version in `src/missionchief-command-nexus.user.js`.\n5. Record current behaviour in the same MissionChief environment before modifying it.',
    '1. Read [Current Project State](docs/PROJECT_STATE.md) and its linked accepted decisions.\n2. Read [Developer Handoff](docs/DEVELOPER_HANDOFF.md).\n3. Read the relevant open issue and the [master v1.0.x tracker](https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/issues/10).\n4. Pull the latest `main` branch.\n5. Confirm the current version in `src/missionchief-command-nexus.user.js`.\n6. Record current behaviour in the same MissionChief environment before modifying it.',
    'contributing read order',
)
insert_after(
    'CONTRIBUTING.md',
    'Do not add a second distributable userscript, duplicate metadata block or alternative production source without prior technical agreement.\n',
    '\n## Current project-state maintenance\n\n`project-state.json` is the machine-readable operating index. Edit it whenever a release, accepted operating contract, current evidence, risk or next work changes. Then run:\n\n```bash\nnode scripts/render-project-state.mjs\nnode scripts/check-project-state.mjs\n```\n\nDo not hand-edit `docs/PROJECT_STATE.md`; it is generated. Important architectural changes require a new or superseding ADR in `docs/decisions/`. Raw diagnostics belong outside current state; add only a sanitised summary under `docs/evidence/` when the evidence must remain durable.\n',
    'contributing project-state section',
)
replace_once(
    'CONTRIBUTING.md',
    'node scripts/validate-userscript.mjs\npython3 scripts/check_repository.py',
    'node scripts/validate-userscript.mjs\nnode scripts/render-project-state.mjs --check\nnode scripts/check-project-state.mjs\nfor check in scripts/check-*.mjs; do node "$check"; done\npython3 scripts/check_repository.py',
    'contributing required checks',
)

replace_once(
    'docs/RELEASE_PROCESS.md',
    'node scripts/validate-userscript.mjs\nfor check in scripts/check-*.mjs; do node "$check"; done',
    'node scripts/validate-userscript.mjs\nnode scripts/render-project-state.mjs --check\nnode scripts/check-project-state.mjs\nfor check in scripts/check-*.mjs; do node "$check"; done',
    'release process state checks',
)
replace_once(
    'docs/RELEASE_PROCESS.md',
    'After a production release or an owner-approved operating-contract change, update the connected Google Memory Bank and Rules documents with what actually merged—not the planned state. Include the PR, merge commit, canonical versions, permanent regression or repository guard, delivery outcome and any rule that future work must preserve. Read the edited sections back to verify the records before declaring the work complete.\n\nRepository-only maintenance must record that the canonical userscript was unchanged and that release reconciliation correctly avoided a duplicate publication.\n\nStart with [Developer Handoff](DEVELOPER_HANDOFF.md) when resuming development.',
    'After a production release or an owner-approved operating-contract change, update `project-state.json` with what actually merged—not the planned state. Regenerate `docs/PROJECT_STATE.md`, run `node scripts/check-project-state.mjs`, and add or supersede an ADR when the reason or locked behaviour changed. Then update the connected Google Memory Bank with a concise pointer to the verified repository state, PR, merge commit, delivery outcome and live-validation status. Read both records back before declaring the work complete.\n\nRepository-only maintenance must record that the canonical userscript was unchanged and that release reconciliation correctly avoided a duplicate publication. Raw diagnostics remain evidence; they are not pasted into current state.\n\nStart with [Current Project State](PROJECT_STATE.md), then [Developer Handoff](DEVELOPER_HANDOFF.md), when resuming development.',
    'release completion record hierarchy',
)

# Workflows: run state checks on every relevant change.
insert_after(
    '.github/workflows/repository-quality.yml',
    '      - name: Run repository checks\n        run: python3 scripts/check_repository.py\n',
    '\n      - name: Validate current project state\n        run: node scripts/check-project-state.mjs\n',
    'repository quality project-state step',
)
replace_once(
    '.github/workflows/validate-userscript.yml',
    "      - 'scripts/**/*.mjs'\n      - '.github/workflows/validate-userscript.yml'",
    "      - 'scripts/**/*.mjs'\n      - 'project-state.json'\n      - 'docs/PROJECT_STATE.md'\n      - 'docs/project-state.schema.json'\n      - 'docs/decisions/**'\n      - 'docs/evidence/**'\n      - '.github/workflows/validate-userscript.yml'",
    'validate workflow pull-request paths',
)
replace_once(
    '.github/workflows/validate-userscript.yml',
    "      - 'scripts/**/*.mjs'\n      - '.github/workflows/validate-userscript.yml'",
    "      - 'scripts/**/*.mjs'\n      - 'project-state.json'\n      - 'docs/PROJECT_STATE.md'\n      - 'docs/project-state.schema.json'\n      - 'docs/decisions/**'\n      - 'docs/evidence/**'\n      - '.github/workflows/validate-userscript.yml'",
    'validate workflow push paths',
)

# Remove one-use builder and workflow before the clean candidate commit.
Path('scripts/_temporary-build-durable-project-memory.py').unlink()
Path('.github/workflows/_temporary-project-memory-build.yml').unlink()

print('Durable project-memory files and documentation updates prepared.')
