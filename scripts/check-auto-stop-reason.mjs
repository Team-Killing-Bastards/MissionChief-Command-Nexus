#!/usr/bin/env node
import fs from 'node:fs';

const source = fs.readFileSync(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractFunction(name) {
  const match = new RegExp(`function\\s+${name}\\s*\\(`).exec(source);
  if (!match) fail(`Missing function ${name}`);

  const start = match.index;
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';

    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }

    if (character === '/' && next === '/') {
      const lineEnd = source.indexOf('\n', index + 2);
      index = lineEnd < 0 ? source.length : lineEnd;
      continue;
    }

    if (character === '/' && next === '*') {
      const blockEnd = source.indexOf('*/', index + 2);
      if (blockEnd < 0) fail(`Unclosed comment in ${name}`);
      index = blockEnd + 1;
      continue;
    }

    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  fail(`Unable to extract ${name}`);
}

function createStorage(initialEntries = []) {
  const values = new Map(initialEntries);

  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    has(key) {
      return values.has(key);
    },
  };
}

function createDocument() {
  const classes = new Set();
  const elements = {
    'status-box': {
      textContent: '',
      classList: {
        toggle(name, force) {
          if (force) classes.add(name);
          else classes.delete(name);
          return Boolean(force);
        },
        contains(name) {
          return classes.has(name);
        },
      },
    },
    'status-box-message': { textContent: 'Ready to start...' },
    'mf-auto-stop-flag': { hidden: true },
    'mf-auto-stop-reason': { textContent: '' },
    'mf-auto-stop-time': { textContent: '' },
  };

  return {
    getElementById(id) {
      return elements[id] || null;
    },
    elements,
  };
}

function createRuntime(localStorage, document) {
  const functionNames = [
    'updateStatusBox',
    'normaliseAutoStopReason',
    'readPersistentAutoStopRecord',
    'formatAutoStopTimestamp',
    'renderPersistentAutoStopRecord',
    'persistAutomaticAutoStopRecord',
    'clearPersistentAutoStopRecord',
  ];

  const runtimeFactory = new Function(
    'localStorage',
    'document',
    `
      const MF_AUTO_STOP_RECORD_KEY = 'mf_auto_stop_record_v10_6_153';
      const mfDebugEnabled = false;
      function debugLog() {}
      ${functionNames.map(extractFunction).join('\n')}
      return {
        readPersistentAutoStopRecord,
        renderPersistentAutoStopRecord,
        persistAutomaticAutoStopRecord,
        clearPersistentAutoStopRecord,
        updateStatusBox,
      };
    `
  );

  return runtimeFactory(localStorage, document);
}

expect(
  source.includes('// @version      1.0.117'),
  'Expected Command Nexus 1.0.104 metadata'
);
expect(
  source.includes('MODULE 2: MISSION FINDER V10.6.158'),
  'Expected Mission Finder V10.6.153 header'
);

const controlPanel = extractFunction('createControlPanel');
for (const token of [
  'id="mf-auto-stop-flag"',
  'role="alert"',
  'AUTO STOPPED',
  'id="mf-auto-stop-time"',
  'id="mf-auto-stop-reason"',
  'id="status-box-message"',
  'renderPersistentAutoStopRecord();',
]) {
  expect(controlPanel.includes(token), `Status display is missing ${token}`);
}
expect(
  controlPanel.indexOf('renderPersistentAutoStopRecord();') >
    controlPanel.indexOf('document.body.appendChild(wrapper);'),
  'Persisted stop state must render after Mission Control enters the document'
);

const stopAutoMode = extractFunction('stopAutoMode');
expect(
  stopAutoMode.includes('options?.automatic !== false'),
  'Automatic stops must be the safe default'
);
expect(
  stopAutoMode.includes('persistAutomaticAutoStopRecord'),
  'Automatic stop reasons must be persisted'
);
expect(
  stopAutoMode.includes('clearPersistentAutoStopRecord'),
  'Deliberate manual stops must clear the unexpected-stop flag'
);

const toggleAutoMode = extractFunction('toggleAutoMode');
expect(
  toggleAutoMode.includes('automatic: false'),
  'The user Stop button must be marked as a deliberate manual stop'
);

const startAutoMode = extractFunction('startAutoMode');
expect(
  startAutoMode.includes('clearPersistentAutoStopRecord();'),
  'Starting Auto Mode must clear the persisted stop reason'
);

const storage = createStorage();
const firstDocument = createDocument();
const firstRuntime = createRuntime(storage, firstDocument);
const exactReason =
  'Auto stopped: Dispatch & Next button was not found.';

const storedRecord =
  firstRuntime.persistAutomaticAutoStopRecord(exactReason);

expect(storage.has('mf_auto_stop_record_v10_6_153'), 'Stop record was not stored');
expect(storedRecord.reason === exactReason, 'Exact stop reason changed before storage');
expect(Number.isFinite(storedRecord.stoppedAt), 'Stop timestamp was not recorded');
expect(firstDocument.elements['mf-auto-stop-flag'].hidden === false, 'Stop flag was not shown');
expect(
  firstDocument.elements['status-box'].classList.contains('mf-auto-stopped'),
  'Stopped visual state was not applied'
);
expect(
  firstDocument.elements['mf-auto-stop-reason'].textContent === exactReason,
  'Status display did not show the exact stop reason'
);
expect(
  firstDocument.elements['mf-auto-stop-time'].textContent.length > 0,
  'Status display did not show a local stop timestamp'
);

firstRuntime.updateStatusBox('A later temporary status message');
expect(
  firstDocument.elements['status-box-message'].textContent ===
    'A later temporary status message',
  'Live status message did not remain usable'
);
expect(firstDocument.elements['mf-auto-stop-flag'].hidden === false, 'Live status erased the stop flag');
expect(
  firstDocument.elements['mf-auto-stop-reason'].textContent === exactReason,
  'Live status erased the persisted stop reason'
);

const recreatedDocument = createDocument();
const recreatedRuntime = createRuntime(storage, recreatedDocument);
recreatedRuntime.renderPersistentAutoStopRecord();

expect(recreatedDocument.elements['mf-auto-stop-flag'].hidden === false, 'Reload did not restore the stop flag');
expect(
  recreatedDocument.elements['mf-auto-stop-reason'].textContent === exactReason,
  'Reload did not restore the exact stop reason'
);

recreatedRuntime.clearPersistentAutoStopRecord();
expect(!storage.has('mf_auto_stop_record_v10_6_153'), 'Restart clearing left the stored reason behind');
expect(recreatedDocument.elements['mf-auto-stop-flag'].hidden === true, 'Restart clearing left the flag visible');
expect(
  !recreatedDocument.elements['status-box'].classList.contains('mf-auto-stopped'),
  'Restart clearing left the stopped visual state active'
);

storage.setItem('mf_auto_stop_record_v10_6_153', '{broken-json');
expect(recreatedRuntime.readPersistentAutoStopRecord() === null, 'Corrupt storage must fail closed');
expect(!storage.has('mf_auto_stop_record_v10_6_153'), 'Corrupt storage was not removed safely');

console.log('Persistent Auto Mode stop-reason checks passed.');
