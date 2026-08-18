#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';

const sourcePath = 'src/missionchief-command-nexus.user.js';

function fail(message) {
  throw new Error(message);
}

function replaceExactlyOnce(text, pattern, replacement, label) {
  let count = 0;
  const updated = text.replace(pattern, (...args) => {
    count += 1;
    return typeof replacement === 'function'
      ? replacement(...args)
      : replacement;
  });
  if (count !== 1) {
    fail(`${label}: expected exactly one match, found ${count}`);
  }
  return updated;
}

function replaceFunction(text, name, replacement) {
  const marker = `function ${name}(`;
  const start = text.indexOf(marker);
  if (start < 0) fail(`Unable to find ${name}`);
  const lineStart = text.lastIndexOf('\n', start) + 1;
  const brace = text.indexOf('{', start);
  if (brace < 0) fail(`Unable to find ${name} body`);

  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let regex = false;
  let regexClass = false;

  for (let index = brace; index < text.length; index += 1) {
    const current = text[index];
    const next = text[index + 1] || '';

    if (lineComment) {
      if (current === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (current === '*' && next === '/') {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (current === '\\') escaped = true;
      else if (current === quote) quote = '';
      continue;
    }
    if (regex) {
      if (escaped) escaped = false;
      else if (current === '\\') escaped = true;
      else if (current === '[') regexClass = true;
      else if (current === ']') regexClass = false;
      else if (current === '/' && !regexClass) regex = false;
      continue;
    }
    if (current === '/' && next === '/') {
      lineComment = true;
      index += 1;
      continue;
    }
    if (current === '/' && next === '*') {
      blockComment = true;
      index += 1;
      continue;
    }
    if (current === "'" || current === '"' || current === '`') {
      quote = current;
      continue;
    }
    if (
      current === '/' &&
      /[=(,:;!&|?{}\[\]\n]/.test(text[index - 1] || '\n')
    ) {
      regex = true;
      continue;
    }
    if (current === '{') depth += 1;
    if (current === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(0, lineStart) + replacement + text.slice(index + 1);
      }
    }
  }

  fail(`Unterminated ${name}`);
}

let source = await readFile(sourcePath, 'utf8');

source = replaceFunction(
  source,
  'isHgvTowRequirementName',
`    function isHgvTowRequirementName(value) {
        const cleaned = String(value || '')
            .replace(/\\s+/g, ' ')
            .trim();

        return /^(?:Required\\s+)?(?:\\d+\\s+)?(?:truck(?:s)?|hgv(?:s)?|lorr(?:y|ies))\\s+(?:to\\s+tow|to\\s+be\\s+towed)$/i.test(cleaned) ||
            /^(?:Required\\s+)?(?:Maximum|Minimum)\\s+amount\\s+of\\s+(?:truck(?:s)?|hgv(?:s)?|lorr(?:y|ies))\\s+to\\s+tow$/i.test(cleaned);
    }`
);

source = replaceFunction(
  source,
  'extractTowCarRequirementRows',
`    function extractTowCarRequirementRows(doc) {
        const rows = [];
        let maximumCarsToTow = 0;
        let maximumTrucksToTow = 0;
        let minimumTrucksToTow = 0;

        if (!doc?.querySelectorAll) {
            return rows;
        }

        doc.querySelectorAll('table.table, table').forEach(table => {
            table.querySelectorAll('tbody tr, tr').forEach(tr => {
                const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.replace(/\\s+/g, ' ').trim());
                if (cells.length < 2) return;

                const label = cleanRequirementName(cells[0]);
                const valueText = cells[1].replace(/\\s+/g, ' ').trim();
                const amount = parseInt(valueText, 10);
                if (!Number.isFinite(amount) || amount <= 0) return;

                if (/^Maximum amount of cars to tow$/i.test(label)) {
                    if (amount > maximumCarsToTow) {
                        maximumCarsToTow = amount;
                    }
                    return;
                }

                if (/^Maximum amount of (?:truck(?:s)?|HGV(?:s)?|lorr(?:y|ies)) to tow$/i.test(label)) {
                    if (amount > maximumTrucksToTow) {
                        maximumTrucksToTow = amount;
                    }
                    return;
                }

                if (/^Minimum amount of (?:truck(?:s)?|HGV(?:s)?|lorr(?:y|ies)) to tow$/i.test(label)) {
                    if (amount > minimumTrucksToTow) {
                        minimumTrucksToTow = amount;
                    }
                }
            });
        });

        if (maximumCarsToTow > 0) {
            // Existing rule: the larger Flatbed Recovery vehicle can tow two cars.
            const flatbedsNeeded = Math.ceil(maximumCarsToTow / 2);

            rows.push({
                unitName: 'Cars to tow',
                stillNeeded: flatbedsNeeded
            });

            if (mfDebugEnabled) {
                debugLog(
                    'LIVE TOW',
                    'Maximum cars to tow=' + maximumCarsToTow +
                        ' -> Flatbed Recovery Vehicle x' + flatbedsNeeded
                );
            }
        }

        const trucksToTow = maximumTrucksToTow > 0
            ? maximumTrucksToTow
            : minimumTrucksToTow;

        if (trucksToTow > 0) {
            rows.push({
                unitName: 'Trucks to tow',
                stillNeeded: trucksToTow
            });

            if (mfDebugEnabled) {
                const sourceLabel = maximumTrucksToTow > 0
                    ? 'Maximum'
                    : 'Minimum fallback';
                debugLog(
                    'LIVE TOW',
                    sourceLabel + ' trucks to tow=' + trucksToTow +
                        ' -> HGV Recovery x' + trucksToTow
                );
            }
        }

        return rows;
    }`
);

source = replaceExactlyOnce(
  source,
  /\n\s*extractTowCarRequirementRows\(doc\)\.forEach\(row => rows\.push\(row\)\);/,
  `\n\n        const supplementalTowRows =\n            extractTowCarRequirementRows(doc);\n        supplementalTowRows.forEach(row => rows.push(row));`,
  'Mission-definition tow-row integration'
);

source = replaceExactlyOnce(
  source,
  /value:\s*Boolean\(\s*table\s*\|\|\s*supplementalPersonnelRows\s*\.missionDefinitionRequiredPersonnelFound\s*\)/,
  `value: Boolean(\n                            table ||\n                            supplementalPersonnelRows\n                                .missionDefinitionRequiredPersonnelFound ||\n                            supplementalTowRows.length > 0\n                        )`,
  'Mission requirement table-found metadata'
);

source = replaceExactlyOnce(
  source,
  'MODULE 2: MISSION FINDER V10.7.5',
  'MODULE 2: MISSION FINDER V10.7.6',
  'Mission Finder module version'
);
source = replaceExactlyOnce(
  source,
  "const MF_MISSION_LOGGER_CLIENT_VERSION = '1.1.7';",
  "const MF_MISSION_LOGGER_CLIENT_VERSION = '1.1.8';",
  'Mission Analytics client version'
);
source = replaceExactlyOnce(
  source,
  /const MF_MISSION_LOGGER_MISSION_FINDER_VERSION =\s*'10\.7\.5';/,
  "const MF_MISSION_LOGGER_MISSION_FINDER_VERSION =\n        '10.7.6';",
  'Mission Analytics Mission Finder version'
);

await writeFile(sourcePath, source, 'utf8');

const regression = String.raw`#!/usr/bin/env node
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
`;

await writeFile(
  'scripts/check-hgv-tow-other-information-v118.mjs',
  regression,
  'utf8'
);

const docFiles = [
  'README.md',
  'src/README.md',
  'docs/architecture.md',
  'docs/README.md',
  'ROADMAP.md'
];
for (const path of docFiles) {
  try {
    let text = await readFile(path, 'utf8');
    text = text.replaceAll('V10.7.5', 'V10.7.6');
    await writeFile(path, text, 'utf8');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

console.log('Prepared HGV tow Other information behaviour and regression.');
