#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
source_path = ROOT / 'src/missionchief-command-nexus.user.js'
source = source_path.read_text(encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


source = replace_once(source, '// @version      1.0.97', '// @version      1.0.98', 'userscript version')
source = replace_once(source, ' * MODULE 2: MISSION FINDER V10.6.146', ' * MODULE 2: MISSION FINDER V10.6.147', 'Mission Finder version')

hgv_checkbox = '''    function isHgvRecoveryVehicleCheckbox(input) {
        if (!input) return false;
        return getVehicleTypeIdentifiers(input)
            .includes('106');
    }
'''
dog_helpers = hgv_checkbox + '''
    function isRescueDogRequirementName(value) {
        const cleaned = String(value || '')
            .replace(/\\s+/g, ' ')
            .trim();

        return /^(?:Required\\s+)?(?:\\d+\\s+)?Rescue Dog(?:s)?$/i.test(cleaned);
    }

    function isSearchDogUnitRequirement(originalName, mappedName) {
        return [originalName, mappedName].some(value =>
            isRescueDogRequirementName(value)
        );
    }

    function isSearchDogUnitVehicleCheckbox(input) {
        if (!input) return false;
        return getVehicleTypeIdentifiers(input)
            .includes('101');
    }
'''
source = replace_once(source, hgv_checkbox, dog_helpers, 'Search Dog Unit helper insertion')

quick_hgv_decl = '''        const hgvRecoveryOnly =
            isHgvRecoveryVehicleRequirement(
                originalName,
                mappedName
            );
'''
quick_dog_decl = quick_hgv_decl + '''
        const searchDogUnitOnly =
            isSearchDogUnitRequirement(
                originalName,
                mappedName
            );
'''
source = replace_once(source, quick_hgv_decl, quick_dog_decl, 'quick-select Search Dog declaration')

quick_hgv_branch = '''        if (hgvRecoveryOnly) {
            return sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot().filter(input => {
                    if (input.disabled) return false;
                    if (!includeChecked && input.checked) return false;
                    return isHgvRecoveryVehicleCheckbox(input);
                })
            );
        }
'''
quick_dog_branch = '''        if (searchDogUnitOnly) {
            return sortVehicleCheckboxesByBestArrival(
                getVehicleCheckboxSnapshot().filter(input => {
                    if (input.disabled) return false;
                    if (!includeChecked && input.checked) return false;
                    return isSearchDogUnitVehicleCheckbox(input);
                })
            );
        }

''' + quick_hgv_branch
source = replace_once(source, quick_hgv_branch, quick_dog_branch, 'quick-select Search Dog branch')

verify_hgv_decl = '''        const hgvRecoveryOnly =
            isHgvRecoveryVehicleRequirement(originalName, mappedName);
'''
verify_dog_decl = verify_hgv_decl + '''        const searchDogUnitOnly =
            isSearchDogUnitRequirement(originalName, mappedName);
'''
source = replace_once(source, verify_hgv_decl, verify_dog_decl, 'selected-verification Search Dog declaration')

verify_hgv_branch = '''            } else if (hgvRecoveryOnly) {
                matches = isHgvRecoveryVehicleCheckbox(input);
'''
verify_dog_branch = '''            } else if (searchDogUnitOnly) {
                matches = isSearchDogUnitVehicleCheckbox(input);
''' + verify_hgv_branch
source = replace_once(source, verify_hgv_branch, verify_dog_branch, 'selected-verification Search Dog branch')

fallback_hgv = '            isHgvRecoveryVehicleRequirement(originalName, mappedName) ||\n'
fallback_dog = '            isSearchDogUnitRequirement(originalName, mappedName) ||\n' + fallback_hgv
source = replace_once(source, fallback_hgv, fallback_dog, 'Search Dog strict fallback guard')

source_path.write_text(source, encoding='utf-8')

# Keep every permanent regression pinned to the current release metadata.
for path in (ROOT / 'scripts').glob('check-*.mjs'):
    text = path.read_text(encoding='utf-8')
    text = text.replace('// @version      1.0.97', '// @version      1.0.98')
    text = text.replace('MISSION FINDER V10.6.146', 'MISSION FINDER V10.6.147')
    text = text.replace('Mission Finder V10.6.146', 'Mission Finder V10.6.147')
    path.write_text(text, encoding='utf-8')

regression_path = ROOT / 'scripts/check-rescue-dog-search-dog-v1098.mjs'
regression_path.write_text(r'''#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

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

expect(source.includes('// @version      1.0.98'), 'Expected Command Nexus 1.0.98');
expect(source.includes(' * MODULE 2: MISSION FINDER V10.6.147'), 'Expected Mission Finder V10.6.147');

const matcher = extractFunction('isRescueDogRequirementName');
const context = { result: null };
vm.runInNewContext(
  `${matcher}\nresult = {` +
  ` yes: ['Rescue Dog', 'Rescue Dogs', '1 Rescue Dog', 'Required Rescue Dog', 'Required 2 Rescue Dogs'].map(isRescueDogRequirementName),` +
  ` no: ['Search Advisor', 'Police Dog', 'Dog Support Unit', 'Rescue Pump', 'HGV to tow'].map(isRescueDogRequirementName)` +
  `};`,
  context
);
expect(context.result.yes.every(Boolean), `Rescue Dog alias rejected: ${JSON.stringify(context.result.yes)}`);
expect(context.result.no.every(value => value === false), `Unrelated requirement captured as Rescue Dog: ${JSON.stringify(context.result.no)}`);

const classifier = extractFunction('isSearchDogUnitRequirement');
expect(classifier.includes('isRescueDogRequirementName(value)'), 'Search Dog classifier must consume only Rescue Dog requirement names');
const checkbox = extractFunction('isSearchDogUnitVehicleCheckbox');
expect(checkbox.includes(".includes('101')"), 'Search Dog Unit must be exact MissionChief vehicle type 101');

expect((source.match(/const searchDogUnitOnly =/g) || []).length >= 2, 'Search Dog strict declarations missing from shared selection paths');
expect(source.includes('if (searchDogUnitOnly) {'), 'Search Dog strict quick-selection branch missing');
expect(source.includes('return isSearchDogUnitVehicleCheckbox(input);'), 'Search Dog exact type-101 candidate filter missing');
expect(source.includes('matches = isSearchDogUnitVehicleCheckbox(input);'), 'Search Dog selected-vehicle verification missing');
expect(source.includes('isSearchDogUnitRequirement(originalName, mappedName) ||'), 'Search Dog generic-fallback guard missing');

expect(extractFunction('isFlatbedRecoveryVehicleCheckbox').includes(".includes('105')"), 'Flatbed Recovery type 105 regression');
expect(extractFunction('isHgvRecoveryVehicleCheckbox').includes(".includes('106')"), 'HGV Recovery type 106 regression');

console.log('PASS: Rescue Dog requirements route only to exact Search Dog Unit type 101 across candidate selection, selected-unit verification and strict generic-fallback protection.');
''', encoding='utf-8')

hgv_check_path = ROOT / 'scripts/check-hgv-recovery-v1097.mjs'
hgv_check = hgv_check_path.read_text(encoding='utf-8')
import_line = "await import('./check-rescue-dog-search-dog-v1098.mjs');\n"
if import_line not in hgv_check:
    hgv_check = replace_once(
        hgv_check,
        "import vm from 'node:vm';\n",
        "import vm from 'node:vm';\n" + import_line,
        'permanent Rescue Dog regression chain'
    )
hgv_check_path.write_text(hgv_check, encoding='utf-8')

readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(readme, '**Current version:** `1.0.97`', '**Current version:** `1.0.98`', 'README version')
readme = replace_once(readme, '**Mission Finder engine:** `V10.6.146`', '**Mission Finder engine:** `V10.6.147`', 'README Mission Finder')
readme_path.write_text(readme, encoding='utf-8')

src_readme_path = ROOT / 'src/README.md'
src_readme = src_readme_path.read_text(encoding='utf-8')
src_readme = replace_once(src_readme, '| Command Nexus version | `1.0.97` |', '| Command Nexus version | `1.0.98` |', 'src README version')
src_readme = replace_once(src_readme, '| Mission Finder baseline | `V10.6.146` |', '| Mission Finder baseline | `V10.6.147` |', 'src README Mission Finder')
src_readme_path.write_text(src_readme, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = '''## [1.0.98] - 2026-08-10

### Fixed

- Added an exact cross-reference from MissionChief requirement **Rescue Dog** to **Search Dog Unit**.
- Rescue Dog demand now uses exact MissionChief vehicle type `101` in the shared Unit Finder, Upgrade and Auto Mode vehicle-selection path.
- The specialist requirement is protected from generic fallback so an unrelated vehicle cannot satisfy Rescue Dog demand when no Search Dog Unit is available.
- Existing Flatbed Recovery type `105` and HGV Recovery type `106` specialist routing remains unchanged.

### Regression coverage

- Added `scripts/check-rescue-dog-search-dog-v1098.mjs` to prove supported Rescue Dog wording, reject unrelated dog/support requirements, require exact type `101`, and verify candidate selection, selected-unit verification and strict fallback protection.
- Chained the regression through the existing HGV/recovery validation path so the permanent userscript gate covers it without adding another workflow step.

### Changed engine baseline

- Command Nexus increased from `1.0.97` to `1.0.98`.
- Mission Finder increased from `V10.6.146` to `V10.6.147`.
- Unit Naming remains `3.3.20`.
- Station Naming remains `1.3.14`.
- Personnel Assignment remains `1.3.9`.

'''
changelog = replace_once(changelog, '## [1.0.97] - 2026-08-09\n', entry + '## [1.0.97] - 2026-08-09\n', 'CHANGELOG insertion')
changelog_path.write_text(changelog, encoding='utf-8')

trigger = ROOT / 'scripts/.v1098-rescue-dog-build-trigger'
if trigger.exists():
    trigger.unlink()

print('Built Command Nexus 1.0.98 Rescue Dog -> Search Dog Unit candidate.')
