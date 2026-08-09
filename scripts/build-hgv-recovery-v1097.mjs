#!/usr/bin/env node
import fs from 'node:fs';

const sourcePath = 'src/missionchief-command-nexus.user.js';
const changelogPath = 'CHANGELOG.md';
const readmePath = 'README.md';
const regressionPath = 'scripts/check-hgv-recovery-v1097.mjs';
const compatibilityRegressionPath = 'scripts/check-towing-recovery-crossref-v1096.mjs';

let source = fs.readFileSync(sourcePath, 'utf8');
let changelog = fs.readFileSync(changelogPath, 'utf8');
let readme = fs.readFileSync(readmePath, 'utf8');

function countOccurrences(haystack, needle) {
  if (!needle) return 0;
  return haystack.split(needle).length - 1;
}

function replaceOnce(haystack, needle, replacement, label) {
  const count = countOccurrences(haystack, needle);
  if (count !== 1) {
    throw new Error(`${label}: expected exactly 1 occurrence, found ${count}`);
  }
  return haystack.replace(needle, replacement);
}

source = replaceOnce(
  source,
  '// @version      1.0.96',
  '// @version      1.0.97',
  'userscript version'
);
source = replaceOnce(
  source,
  ' * MODULE 2: MISSION FINDER V10.6.145',
  ' * MODULE 2: MISSION FINDER V10.6.146',
  'Mission Finder version'
);

const brokenTowMatcher = `    function isCarsToTowRequirementName(name) {
        // Historical helper name retained because the existing towing converter and
        // strict Flatbed Recovery selector both use it. Match explicit towing language
        // only: an ordinary "truck" requirement must never become Recovery demand.
        let key = normalise(name);
        key = key
            .replace(/^required\\s+/, '')
            .replace(/^(?:maximum|minimum)\\s+amount\\s+of\\s+/, '')
            .replace(/^\\d+\\s+/, '')
            .replace(/\\s+\\d+$/, '');

        if (
            /^(?:cars?|trucks?|lorr(?:y|ies)|vans?|vehicles?)\\s+(?:to\\s+tow|to\\s+be\\s+towed)$/.test(key)
        ) {
            return true;
        }

        return /^(?:tow|recovery)\\s+trucks?$/.test(key);
    }`;

const restoredTowMatcher = `    function isCarsToTowRequirementName(value) {
        const cleaned = String(value || '')
            .replace(/\\s+/g, ' ')
            .trim();

        return /^(?:Required\\s+)?(?:\\d+\\s+)?car(?:s)?\\s+to\\s+tow$/i.test(cleaned) ||
            /^(?:Required\\s+)?(?:Maximum|Minimum)\\s+amount\\s+of\\s+cars\\s+to\\s+tow$/i.test(cleaned);
    }`;

source = replaceOnce(
  source,
  brokenTowMatcher,
  restoredTowMatcher,
  'restore v1.0.95 car towing matcher'
);

const flatbedCheckboxBlock = `    function isFlatbedRecoveryVehicleCheckbox(input) {
        if (!input) return false;
        return getVehicleTypeIdentifiers(input)
            .includes('105');
    }`;

const recoveryHelpers = `${flatbedCheckboxBlock}

    function isHgvTowRequirementName(value) {
        const cleaned = String(value || '')
            .replace(/\\s+/g, ' ')
            .trim();

        return /^(?:Required\\s+)?(?:\\d+\\s+)?(?:truck(?:s)?|hgv(?:s)?|lorr(?:y|ies))\\s+(?:to\\s+tow|to\\s+be\\s+towed)$/i.test(cleaned);
    }

    function isHgvRecoveryVehicleRequirement(
        originalName,
        mappedName
    ) {
        return [originalName, mappedName].some(value => {
            const cleaned = normaliseVehicleText(value);

            return !!(
                isHgvTowRequirementName(value) ||
                cleaned === 'hgv recovery vehicle' ||
                cleaned === 'hgv recovery vehicles' ||
                cleaned === 'required hgv recovery vehicle' ||
                cleaned === 'required hgv recovery vehicles'
            );
        });
    }

    function isHgvRecoveryVehicleCheckbox(input) {
        if (!input) return false;
        return getVehicleTypeIdentifiers(input)
            .includes('106');
    }`;

source = replaceOnce(
  source,
  flatbedCheckboxBlock,
  recoveryHelpers,
  'insert HGV recovery helpers'
);

const verboseDeclaration = `        const flatbedRecoveryOnly =
            isFlatbedRecoveryVehicleRequirement(
                originalName,
                mappedName
            );

        const crvOnly =`;
const verboseDeclarationReplacement = `        const flatbedRecoveryOnly =
            isFlatbedRecoveryVehicleRequirement(
                originalName,
                mappedName
            );

        const hgvRecoveryOnly =
            isHgvRecoveryVehicleRequirement(
                originalName,
                mappedName
            );

        const crvOnly =`;
source = replaceOnce(
  source,
  verboseDeclaration,
  verboseDeclarationReplacement,
  'HGV matching declaration'
);

const compactDeclaration = `        const flatbedRecoveryOnly =
            isFlatbedRecoveryVehicleRequirement(originalName, mappedName);
        const crvOnly = isCrvRequirement(originalName, mappedName);`;
const compactDeclarationReplacement = `        const flatbedRecoveryOnly =
            isFlatbedRecoveryVehicleRequirement(originalName, mappedName);
        const hgvRecoveryOnly =
            isHgvRecoveryVehicleRequirement(originalName, mappedName);
        const crvOnly = isCrvRequirement(originalName, mappedName);`;
source = replaceOnce(
  source,
  compactDeclaration,
  compactDeclarationReplacement,
  'HGV selected-count declaration'
);

const flatbedSelectionBranch = `        if (flatbedRecoveryOnly) {
            return sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot().filter(input => {
                    if (input.disabled) return false;
                    if (!includeChecked && input.checked) return false;
                    return isFlatbedRecoveryVehicleCheckbox(input);
                })
            );
        }

        if (crvOnly) {`;
const flatbedSelectionBranchReplacement = `        if (flatbedRecoveryOnly) {
            return sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot().filter(input => {
                    if (input.disabled) return false;
                    if (!includeChecked && input.checked) return false;
                    return isFlatbedRecoveryVehicleCheckbox(input);
                })
            );
        }

        if (hgvRecoveryOnly) {
            return sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot().filter(input => {
                    if (input.disabled) return false;
                    if (!includeChecked && input.checked) return false;
                    return isHgvRecoveryVehicleCheckbox(input);
                })
            );
        }

        if (crvOnly) {`;
source = replaceOnce(
  source,
  flatbedSelectionBranch,
  flatbedSelectionBranchReplacement,
  'HGV strict selection branch'
);

const flatbedCountBranch = `            } else if (flatbedRecoveryOnly) {
                matches = isFlatbedRecoveryVehicleCheckbox(input);
            } else if (crvOnly) {`;
const flatbedCountBranchReplacement = `            } else if (flatbedRecoveryOnly) {
                matches = isFlatbedRecoveryVehicleCheckbox(input);
            } else if (hgvRecoveryOnly) {
                matches = isHgvRecoveryVehicleCheckbox(input);
            } else if (crvOnly) {`;
source = replaceOnce(
  source,
  flatbedCountBranch,
  flatbedCountBranchReplacement,
  'HGV selected-count branch'
);

const strictFallback = `            isFlatbedRecoveryVehicleRequirement(originalName, mappedName) ||
            isFireOperationalSupportRequirement(originalName, mappedName)`;
const strictFallbackReplacement = `            isFlatbedRecoveryVehicleRequirement(originalName, mappedName) ||
            isHgvRecoveryVehicleRequirement(originalName, mappedName) ||
            isFireOperationalSupportRequirement(originalName, mappedName)`;
source = replaceOnce(
  source,
  strictFallback,
  strictFallbackReplacement,
  'HGV strict fallback guard'
);

readme = replaceOnce(
  readme,
  '**Current version:** `1.0.96` · **Mission Finder engine:** `V10.6.145`',
  '**Current version:** `1.0.97` · **Mission Finder engine:** `V10.6.146`',
  'README release baseline'
);

const changelogAnchor = '## [1.0.96] - 2026-08-09';
const changelogEntry = `## [1.0.97] - 2026-08-09

### Fixed

- Reverted the v1.0.96 towing matcher to the proven v1.0.95 car-towing implementation after v1.0.96 introduced an out-of-scope \`normalise(...)\` call that could throw during the shared vehicle-selection path used by Unit Finder, Upgrade and Auto Mode.
- Added a separate HGV towing classifier for explicit \`truck to tow\`, \`HGV to tow\` and \`lorry to tow\` wording without broadening the restored car-towing helper.
- \`Car(s) to tow\` continues to use exact MissionChief vehicle type \`105\` (Flatbed Recovery Vehicle).
- HGV/truck/lorry towing now uses exact MissionChief vehicle type \`106\` (HGV Recovery Vehicle).
- Generic fallback is blocked for both recovery requirements so a missing specialist vehicle cannot silently substitute the wrong type.

### Regression coverage

- Added \`scripts/check-hgv-recovery-v1097.mjs\` to execute the restored car matcher, prove it has no dependency on an external \`normalise\` helper, validate the HGV-only towing aliases, protect unrelated truck wording, require exact type 105/106 selectors, and verify the strict matching/count/fallback branches.
- The existing v1.0.96 towing regression now delegates to the corrected v1.0.97 contract so the established validation chain remains intact.

### Changed engine baseline

- Command Nexus increased from \`1.0.96\` to \`1.0.97\`.
- Mission Finder increased from \`V10.6.145\` to \`V10.6.146\`.
- Unit Naming remains \`3.3.20\`.
- Station Naming remains \`1.3.14\`.
- Personnel Assignment remains \`1.3.9\`.

`;
changelog = replaceOnce(
  changelog,
  changelogAnchor,
  `${changelogEntry}${changelogAnchor}`,
  'CHANGELOG v1.0.97 entry'
);

const regression = `#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const fail = message => { console.error(\`ERROR: \${message}\`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const marker = \`function \${name}(\`;
  const start = source.indexOf(marker);
  if (start < 0) fail(\`Unable to find \${name}\`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false, regex = false, regexClass = false;
  for (let i = brace; i < source.length; i += 1) {
    const c = source[i], n = source[i + 1];
    if (lineComment) { if (c === '\\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\\\') { escaped = true; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (regex) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\\\') { escaped = true; continue; }
      if (c === '[') regexClass = true;
      if (c === ']') regexClass = false;
      if (c === '/' && !regexClass) regex = false;
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '\`') { quote = c; continue; }
    if (c === '/' && /[=(,:;!&|?{}\\[\\]\\n]/.test(source[i - 1] || '\\n')) { regex = true; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  fail(\`Unterminated \${name}\`);
}

expect(source.includes('// @version      1.0.97'), 'Expected Command Nexus 1.0.97');
expect(source.includes(' * MODULE 2: MISSION FINDER V10.6.146'), 'Expected Mission Finder V10.6.146');

const carMatcher = extractFunction('isCarsToTowRequirementName');
expect(!carMatcher.includes('normalise('), 'Car towing matcher must not depend on an out-of-scope normalise helper');
const carContext = { result: null };
vm.runInNewContext(
  \`\${carMatcher}\\nresult = {\\n\` +
  \`  car: ['Car to tow', 'Cars to tow', '1 car to tow', 'Required 2 cars to tow', 'Maximum amount of cars to tow', 'Minimum amount of cars to tow'].map(isCarsToTowRequirementName),\\n\` +
  \`  notHgv: ['truck to tow', '1 truck to tow', 'lorry to tow', 'HGV to tow', 'Recovery truck'].map(isCarsToTowRequirementName)\\n\` +
  \`};\`,
  carContext
);
expect(carContext.result.car.every(Boolean), \`Restored car towing alias rejected: \${JSON.stringify(carContext.result.car)}\`);
expect(carContext.result.notHgv.every(value => value === false), \`HGV towing leaked into Flatbed matcher: \${JSON.stringify(carContext.result.notHgv)}\`);

const hgvMatcher = extractFunction('isHgvTowRequirementName');
const hgvContext = { result: null };
vm.runInNewContext(
  \`\${hgvMatcher}\\nresult = {\\n\` +
  \`  hgv: ['truck to tow', '1 truck to tow', 'trucks to tow', 'Required 2 trucks to tow', 'lorry to tow', '2 lorries to tow', 'HGV to tow', '3 HGVs to be towed'].map(isHgvTowRequirementName),\\n\` +
  \`  unrelated: ['1 truck', 'Fire truck', 'Heavy Rescue truck', 'Trucks required', 'Truck with trailer', 'Car to tow'].map(isHgvTowRequirementName)\\n\` +
  \`};\`,
  hgvContext
);
expect(hgvContext.result.hgv.every(Boolean), \`HGV towing alias rejected: \${JSON.stringify(hgvContext.result.hgv)}\`);
expect(hgvContext.result.unrelated.every(value => value === false), \`Unrelated truck wording was captured: \${JSON.stringify(hgvContext.result.unrelated)}\`);

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
expect(source.includes("source: 'data-raw-html-missing-vehicles'"), 'Escaped data-raw-html missing-vehicle ingestion must remain active');
expect(source.includes('getGenericMissingVehicleRowsFromText(text).forEach(row => {'), 'Missing-vehicle generic parser path must remain active for truck-to-tow text');

console.log('PASS: v1.0.97 restores the v1.0.95 car towing matcher, keeps Flatbed Recovery exact type 105, and routes explicit truck/HGV/lorry towing to exact HGV Recovery type 106 without breaking shared Unit Finder/Upgrade/Auto matching.');
`;

const compatibilityRegression = `#!/usr/bin/env node
// v1.0.96 introduced the towing regression. Keep this historical entrypoint
// chained into repository validation, but enforce the corrected v1.0.97 contract.
await import('./check-hgv-recovery-v1097.mjs');
`;

fs.writeFileSync(sourcePath, source);
fs.writeFileSync(changelogPath, changelog);
fs.writeFileSync(readmePath, readme);
fs.writeFileSync(regressionPath, regression);
fs.writeFileSync(compatibilityRegressionPath, compatibilityRegression);

console.log('Built Command Nexus 1.0.97 / Mission Finder V10.6.146 HGV Recovery hotfix.');
