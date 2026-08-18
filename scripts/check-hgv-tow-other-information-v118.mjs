#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error('ERROR: ' + message); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const marker = 'function ' + name + '(';
  const start = source.indexOf(marker);
  if (start < 0) fail('Unable to find ' + name);
  const lineStart = source.lastIndexOf('\n', start) + 1;
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let regex = false;
  let regexClass = false;

  for (let i = brace; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1] || '';
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (regex) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '[') regexClass = true;
      else if (c === ']') regexClass = false;
      else if (c === '/' && !regexClass) regex = false;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"') { quote = c; continue; }
    if (c === '/' && /[=(,:;!&|?{}\[\]\n]/.test(source[i - 1] || '\n')) { regex = true; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return source.slice(lineStart, i + 1);
  }
  fail('Unterminated ' + name);
}

function makeDocument(entries) {
  const table = {
    querySelectorAll(selector) {
      if (selector !== 'tbody tr, tr') return [];
      return entries.map(([label, value]) => ({
        querySelectorAll(cellSelector) {
          if (cellSelector !== 'td') return [];
          return [
            { textContent: String(label) },
            { textContent: String(value) }
          ];
        }
      }));
    }
  };
  return {
    querySelectorAll(selector) {
      return selector === 'table.table, table' ? [table] : [];
    }
  };
}

const context = {
  result: null,
  mfDebugEnabled: false,
  debugLog() {},
};
vm.createContext(context);
vm.runInContext(extractFunction('cleanRequirementName'), context);
vm.runInContext(extractFunction('isHgvTowRequirementName'), context);
vm.runInContext(extractFunction('extractTowCarRequirementRows'), context);

const supplied = makeDocument([
  ['Max. Patients', '12'],
  ['Minimum amount of trucks to tow', '1'],
  ['Maximum amount of trucks to tow', '1'],
]);
context.result = context.extractTowCarRequirementRows(supplied);
expect(context.result.length === 1, 'Supplied min/max fixture should yield one tow row: ' + JSON.stringify(context.result));
expect(context.result[0].unitName === 'Trucks to tow', 'Supplied fixture did not normalize to Trucks to tow');
expect(Number(context.result[0].stillNeeded) === 1, 'Supplied fixture should require one HGV Recovery: ' + JSON.stringify(context.result));

const maximumWins = makeDocument([
  ['Minimum amount of trucks to tow', '2'],
  ['Maximum amount of trucks to tow', '3'],
]);
context.result = context.extractTowCarRequirementRows(maximumWins);
expect(context.result.length === 1 && Number(context.result[0].stillNeeded) === 3, 'Maximum trucks must win without min+max summing: ' + JSON.stringify(context.result));

const minimumFallback = makeDocument([
  ['Minimum amount of trucks to tow', '2'],
]);
context.result = context.extractTowCarRequirementRows(minimumFallback);
expect(context.result.length === 1 && Number(context.result[0].stillNeeded) === 2, 'Minimum trucks should be fallback only when maximum is absent: ' + JSON.stringify(context.result));

const carControl = makeDocument([
  ['Maximum amount of cars to tow', '3'],
]);
context.result = context.extractTowCarRequirementRows(carControl);
expect(context.result.length === 1, 'Car towing control lost its single requirement: ' + JSON.stringify(context.result));
expect(context.result[0].unitName === 'Cars to tow' && Number(context.result[0].stillNeeded) === 2, 'Existing flatbed 2-cars-per-vehicle rule changed: ' + JSON.stringify(context.result));

for (const value of [
  'Trucks to tow',
  '1 truck to tow',
  'Maximum amount of trucks to tow',
  'Minimum amount of trucks to tow',
  'Required Maximum amount of HGVs to tow',
]) {
  expect(context.isHgvTowRequirementName(value), 'HGV tow classifier rejected ' + value);
}

expect(source.includes(".includes('106')"), 'Exact type-106 HGV Recovery selector is missing');
expect(source.includes('const supplementalTowRows ='), 'Mission-definition tow rows are not retained separately');
expect(source.includes('supplementalTowRows.length > 0'), 'Tow-only mission definition does not count as requirement evidence');
expect(source.includes('supplementalTowRows.forEach(row => rows.push(row));'), 'Tow rows do not enter the normal requirement merge');

console.log('PASS: Other information truck-tow min/max demand feeds the existing strict HGV Recovery type-106 path without double-counting, while car towing remains Flatbed type 105.');
