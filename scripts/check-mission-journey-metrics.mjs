#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);
const backend = await readFile(
  'integrations/google-apps-script/Code.gs',
  'utf8'
);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractFunction(text, name) {
  const marker = `function ${name}(`;
  const start = text.indexOf(marker);
  if (start < 0) fail(`Missing function ${name}`);
  const parameterStart = text.indexOf('(', start);
  let parameterDepth = 0;
  let bodyStart = -1;
  let quote = '';
  let escaped = false;

  for (let index = parameterStart; index < text.length; index += 1) {
    const character = text[index];
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
    if (character === '(') parameterDepth += 1;
    if (character === ')') {
      parameterDepth -= 1;
      if (parameterDepth === 0) {
        bodyStart = text.indexOf('{', index);
        break;
      }
    }
  }

  if (bodyStart < 0) fail(`Missing body for ${name}`);

  let depth = 0;
  quote = '';
  escaped = false;
  for (let index = bodyStart; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1] || '';
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
      const end = text.indexOf('\n', index + 2);
      index = end < 0 ? text.length : end;
      continue;
    }
    if (character === '/' && next === '*') {
      const end = text.indexOf('*/', index + 2);
      if (end < 0) fail(`Unclosed comment in ${name}`);
      index = end + 1;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  fail(`Unable to isolate ${name}`);
}

const metricReaderSource = extractFunction(
  source,
  'readMissionLoggerUnitJourneyMetrics'
);
const readMetrics = Function(
  `"use strict"; ${metricReaderSource}; return readMissionLoggerUnitJourneyMetrics;`
)();
const node = (attributes = {}, descendants = [], textContent = '') => ({
  textContent,
  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(attributes, name)
      ? attributes[name]
      : null;
  },
  querySelectorAll() {
    return descendants;
  },
  matches(selector) {
    return selector === 'tr' && attributes.__row === true;
  },
  closest() {
    return attributes.__closest || null;
  },
});
const row = attributes => node(attributes);

const exact = readMetrics(row({
  'data-distance': '83.8574',
  'data-sortvalue': '612.4',
}));
expect(exact.estimatedDistanceKm === 83.857, 'Distance must retain kilometre precision to three decimals');
expect(exact.estimatedEtaSeconds === 612, 'ETA must retain MissionChief arrival delay in seconds');

const fallback = readMetrics(row({
  'data-distance': '2,75',
  timevalue: '180',
}));
expect(fallback.estimatedDistanceKm === 2.75, 'Comma-decimal route distance must be accepted');
expect(fallback.estimatedEtaSeconds === 180, 'timevalue must remain the bounded ETA fallback');

const missing = readMetrics(row({}));
expect(missing.estimatedDistanceKm === null, 'Missing distance must remain blank');
expect(missing.estimatedEtaSeconds === null, 'Missing ETA must remain blank');

const nestedDistance = node({ 'data-distance-km': '12.75' });
const nestedEta = node({ 'data-arrival-seconds': '420' });
const nestedRow = node({ __row: true }, [nestedDistance, nestedEta]);
const nestedCheckbox = node({ __closest: nestedRow });
const nested = readMetrics(nestedCheckbox);
expect(nested.estimatedDistanceKm === 12.75, 'Journey capture must read distance from a native descendant metric cell');
expect(nested.estimatedEtaSeconds === 420, 'Journey capture must read ETA from a native descendant metric cell');

const visibleEvidence = node(
  { title: 'Route distance 3.4 km; ETA 7 min' },
  [],
  ''
);
const visibleRow = node({ __row: true }, [visibleEvidence]);
const visibleCheckbox = node({ __closest: visibleRow });
const visible = readMetrics(visibleCheckbox);
expect(visible.estimatedDistanceKm === 3.4, 'Explicit kilometre text must remain valid native journey evidence');
expect(visible.estimatedEtaSeconds === 420, 'Explicit ETA minute text must convert to seconds');

const unrelatedNumber = node({}, [], '34');
const unrelatedRow = node({ __row: true }, [unrelatedNumber]);
const unrelatedCheckbox = node({ __closest: unrelatedRow });
const unrelated = readMetrics(unrelatedCheckbox);
expect(unrelated.estimatedDistanceKm === null, 'An unlabelled numeric vehicle cell must not become distance evidence');
expect(unrelated.estimatedEtaSeconds === null, 'An unlabelled numeric vehicle cell must not become ETA evidence');

const arrivalSort = extractFunction(source, 'sortVehicleCheckboxesByBestArrival');
expect(
  arrivalSort.includes('readMissionLoggerUnitJourneyMetrics(input)'),
  'Vehicle arrival sorting and logger capture must use the same native metric reader'
);
expect(
  !arrivalSort.includes("getAttribute('data-distance')"),
  'Arrival sorting must not retain the old row-only distance path'
);

const selectedUnits = extractFunction(source, 'getMissionLoggerSelectedUnits');
for (const token of [
  'readMissionLoggerUnitJourneyMetrics(checkbox)',
  'estimatedDistanceKm:',
  'estimatedEtaSeconds:',
]) {
  expect(selectedUnits.includes(token), `Selected-unit journey capture missing ${token}`);
}

for (const token of [
  "buildId: '1.1.10-upload-lock-hotfix-1'",
  "'dispatch-journey-metrics'",
  "'estimated_distance_km'",
  "'estimated_eta_seconds'",
  "name: 'Journey Data'",
  "'distance_km_total'",
  "'eta_seconds_total'",
  "'missing_distance_count'",
  "'missing_eta_count'",
]) {
  expect(backend.includes(token), `Backend journey contract missing ${token}`);
}
expect(
  backend.includes('activitySchemaVersion: 2'),
  'Journey logger backend must retain the current activity schema capability'
);

const preparedRows = extractFunction(backend, 'prepareLoggerBatchRows_');
expect(
  preparedRows.includes('unit.estimatedDistanceKm'),
  'Backend must store each selected unit distance'
);
expect(
  preparedRows.includes('unit.estimatedEtaSeconds'),
  'Backend must store each selected unit ETA'
);

const ensureSheet = extractFunction(backend, 'ensureLoggerSheet_');
expect(
  ensureSheet.includes('const missingHeaders = definition.headers.slice(missingFrom)'),
  'Existing logger sheets must append compatible trailing journey headers'
);
expect(
  ensureSheet.includes('has a non-contiguous header'),
  'Header migration must still fail closed on an unsafe interior gap'
);

const applyJourney = extractFunction(backend, 'applyJourneyUnitRows_');
const appended = [];
const emptySheet = {
  getLastRow() { return 1; },
  getRange() { throw new Error('An empty Journey Data sheet must not be read or updated'); },
};
const contributions = {
  one: {
    weekKey: '2026-W34', periodStart: '2026-08-17', periodEnd: '2026-08-23',
    playerId: 'marty', stationKey: 'id:101', stationId: '101', stationName: 'FIFE-FS1',
    distanceKm: 10.25, etaSeconds: 600,
  },
  two: {
    weekKey: '2026-W34', periodStart: '2026-08-17', periodEnd: '2026-08-23',
    playerId: 'marty', stationKey: 'id:101', stationId: '101', stationName: 'FIFE-FS1',
    distanceKm: 24.75, etaSeconds: 1200,
  },
  missing: {
    weekKey: '2026-W34', periodStart: '2026-08-17', periodEnd: '2026-08-23',
    playerId: 'marty', stationKey: 'id:101', stationId: '101', stationName: 'FIFE-FS1',
    distanceKm: null, etaSeconds: null,
  },
};
const applyJourneyRuntime = Function(
  'MC_LOGGER_SHEETS',
  'missionJourneyContribution_',
  'loggerNumber_',
  'appendRows_',
  `"use strict"; ${applyJourney}; return applyJourneyUnitRows_;`
)(
  { journeys: { name: 'Journey Data', headers: Array(17).fill('') } },
  unitRow => contributions[unitRow],
  (value, fallbackValue) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallbackValue;
  },
  (_sheet, rows) => appended.push(...rows)
);
const touched = applyJourneyRuntime(
  { getSheetByName() { return emptySheet; } },
  ['one', 'two', 'missing'],
  new Date('2026-08-17T12:00:00.000Z')
);
expect(touched === 1 && appended.length === 1, 'One weekly player/station aggregate must own the three unit journeys');
const aggregate = appended[0];
expect(aggregate[7] === 3, 'Journey aggregate must count every selected unit');
expect(aggregate[8] === 35 && aggregate[9] === 2 && aggregate[10] === 24.75, 'Distance total, evidence count and maximum must be exact');
expect(aggregate[11] === 1800 && aggregate[12] === 2 && aggregate[13] === 1200, 'ETA total, evidence count and maximum must be exact');
expect(aggregate[14] === 1 && aggregate[15] === 1, 'Missing distance and ETA evidence must remain visible');

const uploadHandler = extractFunction(backend, 'handleLoggerUpload_');
expect(
  (uploadHandler.match(/applyJourneyUnitRows_\(/g) || []).length === 2,
  'Normal uploads and repaired partial uploads must both update Journey Data'
);

console.log('Mission journey metrics regression passed: authoritative dispatch distance/ETA capture, compatible sheet migration, raw storage and weekly station aggregation are locked.');
