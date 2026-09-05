export const RULES_KEY = 'nexusRequirementRulesV1';
export const RULE_LIMIT = 300;
export const DOG_RULE_MIGRATION_KEY = 'nexusSearchDogRuleRepairV13';
// The previously supplied override duplicated the broken built-in 102-only
// mapping. Remove only that exact active rule, once; preserve other user choices.
export function repairLegacySearchDogRule(value) {
  const checked = validateRules(value);
  return {schema: 1, rules: checked.rules.filter(row => !(
    requirementKey(row.requirement) === 'search dog units' &&
    row.vehicleTypeId === '102' && row.vehicleName === 'Search Dog Unit SAR' && row.enabled
  ))};
}
export function requirementKey(value) {
  return String(value || '').normalize('NFKC').replace(/&amp;/gi, '&')
    .replace(/^\s*(?:required|requires|require)\s*:?[\s]*/i, '')
    .replace(/^\s*\d+\s+/, '').replace(/\s+x\s*\d+\s*$/i, '')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}
export function validateRules(value) {
  if (!value || value.schema !== 1 || !Array.isArray(value.rules) || value.rules.length > RULE_LIMIT) throw Error('Invalid rules file (schema 1, maximum 300 rules).');
  const seen = new Set();
  return { schema: 1, rules: value.rules.map(row => {
    if (!row || typeof row.requirement !== 'string' || !row.requirement.trim() || row.requirement.length > 180 ||
      typeof row.vehicleName !== 'string' || !row.vehicleName.trim() || row.vehicleName.length > 180 ||
      typeof row.vehicleTypeId !== 'string' || !/^\d{1,5}$/.test(row.vehicleTypeId) || typeof row.enabled !== 'boolean') throw Error('Each rule needs requirement text, vehicle name, numeric type ID and enabled state.');
    const key = requirementKey(row.requirement);
    if (!key || seen.has(key)) throw Error('Duplicate or empty requirement: ' + row.requirement);
    seen.add(key);
    return { requirement: row.requirement.trim(), vehicleTypeId: row.vehicleTypeId, vehicleName: row.vehicleName.trim(), enabled: row.enabled };
  }) };
}
export function mergeRules(existing, incoming) {
  const map = new Map(validateRules(existing).rules.map(r => [requirementKey(r.requirement), r]));
  for (const rule of validateRules(incoming).rules) map.set(requirementKey(rule.requirement), rule);
  return validateRules({ schema: 1, rules: [...map.values()] });
}
