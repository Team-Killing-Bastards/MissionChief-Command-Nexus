import fs from 'node:fs';

const path = 'src/missionchief-command-nexus.user.js';
const source = fs.readFileSync(path, 'utf8');

const needles = [
  'function isCarsToTowRequirementName',
  'function getCarsToTowVehicleRequirement',
  'function getGenericMissingVehicleRowsFromText',
  'function normaliseEscapedMissionHtmlText',
  'function getStructuredMissingVehicleRows',
  'isFlatbedRecoveryVehicleRequirement',
  'isFlatbedRecoveryVehicleCheckbox',
  'flatbedRecoveryOnly',
  'strictVehicleTypeOnly',
  "[data-requirement-type=\"vehicles\"]",
  'data-raw-html-missing-vehicles'
];

for (const needle of needles) {
  console.log(`\n===== ${needle} =====`);
  let from = 0;
  let count = 0;
  while (true) {
    const index = source.indexOf(needle, from);
    if (index < 0) break;
    count += 1;
    const start = Math.max(0, source.lastIndexOf('\n', Math.max(0, index - 1800)));
    let end = source.indexOf('\n', index + 2600);
    if (end < 0) end = Math.min(source.length, index + 2600);
    console.log(`\n--- occurrence ${count} @ ${index} ---\n${source.slice(start, end)}`);
    from = index + needle.length;
  }
  if (!count) console.log('(none)');
}
