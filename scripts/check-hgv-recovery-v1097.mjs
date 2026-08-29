#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
await import('./check-rescue-dog-search-dog-v1098.mjs');

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Unable to find ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false, regex = false, regexClass = false;
  for (let i = brace; i < source.length; i += 1) {
    const c = source[i], n = source[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (regex) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === '[') regexClass = true;
      if (c === ']') regexClass = false;
      if (c === '/' && !regexClass) regex = false;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '/' && /[=(,:;!&|?{}\[\]\n]/.test(source[i - 1] || '\n')) { regex = true; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  fail(`Unterminated ${name}`);
}


const carMatcher = extractFunction('isCarsToTowRequirementName');
expect(!carMatcher.includes('normalise('), 'Car towing matcher must not depend on an out-of-scope normalise helper');
const carContext = { result: null };
vm.runInNewContext(
  `${carMatcher}\nresult = {\n` +
  `  car: ['Car to tow', 'Cars to tow', '1 car to tow', 'Required 2 cars to tow', 'Maximum amount of cars to tow', 'Minimum amount of cars to tow'].map(isCarsToTowRequirementName),\n` +
  `  notHgv: ['truck to tow', '1 truck to tow', 'lorry to tow', 'HGV to tow', 'Recovery truck'].map(isCarsToTowRequirementName)\n` +
  `};`,
  carContext
);
expect(carContext.result.car.every(Boolean), `Restored car towing alias rejected: ${JSON.stringify(carContext.result.car)}`);
expect(carContext.result.notHgv.every(value => value === false), `HGV towing leaked into Flatbed matcher: ${JSON.stringify(carContext.result.notHgv)}`);

const carNormaliser = extractFunction('getCarsToTowVehicleRequirement');
const carNormaliserContext = { result: null };
vm.runInNewContext(
  `${carMatcher}\n${carNormaliser}\nresult = {\n` +
  `  maximum: getCarsToTowVehicleRequirement('Maximum amount of cars to tow', 4),\n` +
  `  embedded: getCarsToTowVehicleRequirement('Required 3 cars to tow', 99)\n` +
  `};`,
  carNormaliserContext
);
expect(
  JSON.stringify(carNormaliserContext.result.maximum) === JSON.stringify({ unitName: 'Cars to tow', carsRequired: 4, stillNeeded: 4 }),
  `Maximum car amount did not preserve one Flatbed Recovery per car: ${JSON.stringify(carNormaliserContext.result.maximum)}`
);
expect(carNormaliserContext.result.embedded.stillNeeded === 3, 'Embedded car quantity must override the supplied table count');

const hgvMatcher = extractFunction('isHgvTowRequirementName');
const hgvContext = { result: null };
vm.runInNewContext(
  `${hgvMatcher}\nresult = {\n` +
  `  hgv: ['truck to tow', '1 truck to tow', 'trucks to tow', 'Required 2 trucks to tow', 'lorry to tow', '2 lorries to tow', 'HGV to tow', '3 HGVs to be towed', 'Maximum amount of trucks to tow', 'Minimum amount of trucks to tow', 'Required Maximum amount of trucks to tow'].map(isHgvTowRequirementName),\n` +
  `  unrelated: ['1 truck', 'Fire truck', 'Heavy Rescue truck', 'Trucks required', 'Truck with trailer', 'Car to tow'].map(isHgvTowRequirementName)\n` +
  `};`,
  hgvContext
);
expect(hgvContext.result.hgv.every(Boolean), `HGV towing alias rejected: ${JSON.stringify(hgvContext.result.hgv)}`);
expect(hgvContext.result.unrelated.every(value => value === false), `Unrelated truck wording was captured: ${JSON.stringify(hgvContext.result.unrelated)}`);

const hgvNormaliser = extractFunction('getHgvTowVehicleRequirement');
const hgvNormaliserContext = { result: null };
vm.runInNewContext(
  `${hgvMatcher}\n${hgvNormaliser}\nresult = {\n` +
  `  maximum: getHgvTowVehicleRequirement('Maximum amount of trucks to tow', 3),\n` +
  `  embedded: getHgvTowVehicleRequirement('Required 2 trucks to tow', 99),\n` +
  `  carRejected: getHgvTowVehicleRequirement('Maximum amount of cars to tow', 4)\n` +
  `};`,
  hgvNormaliserContext
);
expect(
  JSON.stringify(hgvNormaliserContext.result.maximum) === JSON.stringify({ unitName: 'Trucks to tow', trucksRequired: 3, stillNeeded: 3 }),
  `Maximum truck amount did not preserve one HGV Recovery per truck: ${JSON.stringify(hgvNormaliserContext.result.maximum)}`
);
expect(hgvNormaliserContext.result.embedded.stillNeeded === 2, 'Embedded truck quantity must override the supplied table count');
expect(hgvNormaliserContext.result.carRejected === null, 'Car capacity wording leaked into HGV normalisation');

const flatbedCheckbox = extractFunction('isFlatbedRecoveryVehicleCheckbox');
expect(flatbedCheckbox.includes(".includes('105')"), 'Flatbed Recovery must remain exact MissionChief type 105');
const hgvCheckbox = extractFunction('isHgvRecoveryVehicleCheckbox');
expect(hgvCheckbox.includes(".includes('106')"), 'HGV Recovery must be exact MissionChief type 106');
const hgvClassifier = extractFunction('isHgvRecoveryVehicleRequirement');
expect(hgvClassifier.includes('isHgvTowRequirementName(value)'), 'HGV Recovery classifier must consume the isolated HGV towing aliases');

expect(source.includes('const hgvRecoveryOnly ='), 'HGV strict matcher declaration missing');
expect(source.includes('if (hgvRecoveryOnly) {'), 'HGV strict vehicle selection branch missing');
expect(source.includes('matches = isHgvRecoveryVehicleCheckbox(input);'), 'HGV selected-vehicle verification branch missing');
expect(source.includes('isHgvRecoveryVehicleRequirement(originalName, mappedName) ||'), 'HGV strict fallback guard missing');
expect(source.includes('"Maximum amount of trucks to tow": "HGV Recovery Vehicle"'), 'Maximum truck wording cross-reference missing');
expect(source.includes('extractTowHgvRequirementRows(doc).forEach(row => rows.push(row));'), 'Mission-help maximum truck extractor is not wired into Unit Finder');
expect(extractFunction('extractTowCarRequirementRows').includes('const flatbedsNeeded = maximumCarsToTow;'), 'New-mission Other information must send one Flatbed Recovery per maximum car count');
expect(source.includes('const hgvTowRequirement ='), 'Mission Update is missing the HGV towing normalisation route');
expect(source.includes("source: 'data-raw-html-missing-vehicles'"), 'Escaped data-raw-html missing-vehicle ingestion must remain active');
expect(source.includes('getGenericMissingVehicleRowsFromText(text).forEach(row => {'), 'Missing-vehicle generic parser path must remain active for truck-to-tow text');

console.log('PASS: Car towing keeps Flatbed Recovery exact type 105, while truck/HGV/lorry towing uses exact HGV Recovery type 106 across Unit Finder, Mission Update and Auto Mode.');
