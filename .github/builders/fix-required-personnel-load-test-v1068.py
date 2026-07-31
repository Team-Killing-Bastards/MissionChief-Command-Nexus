#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/check-mission-definition-personnel-preload.mjs')
text = path.read_text(encoding='utf-8')
start_token = 'const crossTableFixture = `'
end_token = "\nconsole.log('Mission Required Personnel preload checks passed.');"
start = text.find(start_token)
end = text.find(end_token, start)
if start < 0 or end < 0:
    raise SystemExit('Unable to locate cross-table fixture block')

replacement = r'''const crossTableFixture = `
<table>
  <thead><tr><th>Reward and Precondition</th><th>Value</th></tr></thead>
  <tbody><tr><td>Required Personnel Available</td><td>60x Level 2 Public Order Officer 15x Police Medic</td></tr></tbody>
</table>
<table>
  <thead><tr><th>Vehicle and Personnel Requirements</th><th>Value</th></tr></thead>
  <tbody><tr><td>Required Police Cars</td><td>6</td></tr></tbody>
</table>
<table>
  <thead><tr><th>Other information</th><th>Value</th></tr></thead>
  <tbody><tr><td>Required Personnel</td><td>27x Level 2 Public Order Officer<br>6x Police Medic<br>6x Police Sergeant<br>3x Police Inspector</td></tr></tbody>
</table>`;

const fixtureRows = Array.from(
  crossTableFixture.matchAll(/<tr>[\s\S]*?<td>([\s\S]*?)<\/td>[\s\S]*?<td>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi)
).map(match => ({
  label: match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  value: match[2].replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').trim(),
}));

const exactRequiredRows = fixtureRows.filter(row => {
  return /^Required Personnel(?:\s*\(\s*\d+\s*%\s*\))?$/i.test(row.label);
});
if (exactRequiredRows.length !== 1) {
  fail(`Expected one exact Other information Required Personnel row, found ${exactRequiredRows.length}`);
}
if (fixtureRows.some(row => row.label === 'Required Personnel Available' && exactRequiredRows.includes(row))) {
  fail('Required Personnel Available entered the exact operational row fixture');
}
for (const token of [
  '27x Level 2 Public Order Officer',
  '6x Police Medic',
  '6x Police Sergeant',
  '3x Police Inspector',
]) {
  if (!exactRequiredRows[0].value.includes(token)) {
    fail(`Cross-table Required Personnel fixture lost ${token}`);
  }
}
'''

path.write_text(text[:start] + replacement + text[end:], encoding='utf-8')
print('Corrected Required Personnel cross-table test harness.')
