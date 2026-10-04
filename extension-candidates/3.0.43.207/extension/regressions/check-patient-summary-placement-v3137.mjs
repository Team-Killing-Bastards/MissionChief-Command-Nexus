import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const comfort = fs.readFileSync(path.join(root, 'nexus-comfort.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'nexus-runtime.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

assert.equal(manifest.version, '3.0.43.189', 'manifest must expose the current patient-summary placement build');
assert.ok(
  comfort.includes("const host = document.getElementById('nx-missing'); if (!host?.isConnected) return;"),
  'patient summary must render only into the Nexus Missing requirements host',
);
assert.ok(
  comfort.includes("const original = Array.from(host.children).find(child => child.tagName === 'DETAILS');"),
  'patient summary placement must locate the Original game requirements details row',
);
assert.ok(
  comfort.includes('if (original) original.after(panel); else host.append(panel);'),
  'patient summary must sit immediately below Original game requirements when available',
);
assert.ok(
  !comfort.includes("box('nx-patients', source"),
  'patient summary must no longer be inserted as a standalone box above mission general info',
);
assert.ok(
  comfort.includes("panel.dataset.nxPatientSummaryPlacement = 'missing-requirements';"),
  'nested patient summary must identify its placement for diagnostics',
);
assert.ok(
  comfort.includes("panel = element('section', undefined, 'nx-patient-summary-inline');"),
  'patient summary must no longer use the nx-box class / inner border chrome',
);
assert.ok(
  !comfort.includes("'nx-box nx-patient-summary-inline'"),
  'patient summary must not reintroduce its own bordered box',
);
assert.ok(
  runtime.includes("#nx-patients [data-nexus-comfort=\"1\"].nx-inline-list > "),
  'Mission Finder must retain its existing #nx-patients attended-summary reader',
);

const helperStart = comfort.indexOf('function patientSummaryDisplayCount(name, count)');
const helperEnd = comfort.indexOf('function patients()', helperStart);
assert.ok(helperStart > 0 && helperEnd > helperStart, 'specialist display-count helper must be locatable');
const helperSource = comfort.slice(helperStart, helperEnd);
const context = vm.createContext({
  text(value) { return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 200); },
});
vm.runInContext(`${helperSource}\nglobalThis.__displayCount = patientSummaryDisplayCount;`, context);

assert.equal(context.__displayCount('Ambulance Officer', 77), 1, 'Ambulance Officer must display as one');
assert.equal(context.__displayCount('Ambulance Officers', 12), 1, 'plural Ambulance Officer requirement must display as one');
assert.equal(context.__displayCount('Mass Casualty Equipment', 77), 1, 'Mass Casualty Equipment must display as one');
assert.equal(context.__displayCount('Mass Casualty Equipment Unit', 9), 1, 'MCE Unit wording must display as one');
assert.equal(context.__displayCount('Ambulance', 77), 77, 'ordinary Ambulance counts must remain exact');
assert.equal(context.__displayCount('Critical Care', 18), 18, 'Critical Care counts must remain exact');

const patientRuleStart = runtime.indexOf('function getMissionUpdatePatientRequirementRule(');
const patientRuleEnd = runtime.indexOf('function normaliseMissionUpdatePatientRequirement(', patientRuleStart);
assert.ok(patientRuleStart > 0 && patientRuleEnd > patientRuleStart, 'Mission Finder specialist patient rule must be locatable');
const patientRules = runtime.slice(patientRuleStart, patientRuleEnd);
assert.match(patientRules, /type:\s*'ambulance-officer',[\s\S]*?maximum:\s*1/, 'Ambulance Officer operational dispatch must remain capped at one');
assert.match(patientRules, /type:\s*'mass-casualty-equipment',[\s\S]*?maximum:\s*1/, 'Mass Casualty Equipment operational dispatch must remain capped at one');

console.log('PASS: 3.0.43.151 keeps Patient Summary under Original game requirements without an inner box and caps specialist badges at one.');
