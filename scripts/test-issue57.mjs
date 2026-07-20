import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const marker = '    function normalisePublicOrderTrainedRequirements(';
const start = source.indexOf(marker);
if (start < 0) throw new Error('Normaliser not found');
const brace = source.indexOf('{', start);
let depth = 0;
let end = -1;
for (let index = brace; index < source.length; index += 1) {
  if (source[index] === '{') depth += 1;
  if (source[index] === '}') {
    depth -= 1;
    if (depth === 0) {
      end = index + 1;
      break;
    }
  }
}
if (end < 0) throw new Error('Normaliser end not found');

const normalisePublicOrderTrainedRequirements = Function(
  `${source.slice(start, end)}; return normalisePublicOrderTrainedRequirements;`
)();

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const find = (items, code) => items.find((item) => item.code === code);

const cases = [
  ['police_sergeant', 'Police Sergeant', 2, 1],
  ['level_1_public_order', 'Level 1', 4, 2],
  ['level_2_public_order', 'Level 2', 2, 1],
  ['police_medic', 'Police Medic', 2, 1],
];

for (const [code, label, requiredPeople, expectedVehicles] of cases) {
  const result = normalisePublicOrderTrainedRequirements([
    { code, label, required: requiredPeople },
  ]);
  const rule = find(result, `${code}_vehicle`);
  assert(rule, `${code} rule missing`);
  assert(rule.required === expectedVehicles, `${code} vehicle count wrong`);
  assert(rule.requirementType === 'police_trained_irv_vehicle', `${code} type wrong`);
  assert(rule.personnelPerVehicle === 2, `${code} staffing rule wrong`);
  assert(
    rule.requiredTrainingCodes.length === 1 && rule.requiredTrainingCodes[0] === code,
    `${code} has unrelated training prerequisites`
  );
}

const mixed = normalisePublicOrderTrainedRequirements([
  { code: 'level_1_public_order', label: 'Level 1', required: 2 },
  { code: 'level_2_public_order', label: 'Level 2', required: 2 },
  { code: 'police_sergeant', label: 'Sergeant', required: 2 },
]);
assert(find(mixed, 'level_1_public_order_vehicle'), 'Mixed Level 1 missing');
assert(find(mixed, 'level_2_public_order_vehicle'), 'Mixed Level 2 missing');
assert(find(mixed, 'police_sergeant_vehicle'), 'Mixed Sergeant missing');
assert(!mixed.some((item) => String(item.code).includes('combined')), 'Combined rule remains');

console.log('Issue 57 independent-profile tests passed');
