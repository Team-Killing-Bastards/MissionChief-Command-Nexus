#!/usr/bin/env python3
from pathlib import Path

# v1.0.88: preserve authority semantics while allowing the rendered-profile layer.
path = Path('scripts/check-naming-dispatch-centre-assignment-source-v1088.mjs')
text = path.read_text()
old = "expect(listLoader.includes('extractNamingDispatchCentresFromProfileHtml'), 'Centre list must use the profile Dispatch Centre parser');"
new = """expect(listLoader.includes('loadNamingDispatchCentresFromRenderedProfile'), 'Centre list must load the rendered signed-in profile');
const renderedProfileLoader = extractFunction('loadNamingDispatchCentresFromRenderedProfile');
expect(renderedProfileLoader.includes('extractNamingDispatchCentresFromProfileDocument'), 'Rendered profile loader must use the profile Dispatch Centre parser');
expect(!listLoader.includes('stationFetchWithTimeout'), 'Centre list must not parse a static fetched profile shell');"""
if old not in text:
    raise SystemExit('v1.0.88 direct-profile-parser assertion not found')
text = text.replace(old, new, 1)
text = text.replace(
    "console.log('PASS: v1.0.88 station-membership authority is preserved while v1.0.91 moves centre names to the signed-in profile.');",
    "console.log('PASS: v1.0.88 station-membership authority is preserved while v1.0.92 reads centre names from the rendered signed-in profile.');",
    1
)
path.write_text(text)

# v1.0.91: its HTML wrapper now delegates to the shared rendered-document parser.
path = Path('scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs')
text = path.read_text()
old = """  `${extractFunction('getNamingDispatchCentreIdFromHref')}\\n` +
  `${extractFunction('extractNamingDispatchCentresFromProfileHtml')}\\n` +"""
new = """  `${extractFunction('getNamingDispatchCentreIdFromHref')}\\n` +
  `${extractFunction('extractNamingDispatchCentresFromProfileDocument')}\\n` +
  `${extractFunction('extractNamingDispatchCentresFromProfileHtml')}\\n` +"""
if old not in text:
    raise SystemExit('v1.0.91 isolated profile parser harness not found')
text = text.replace(old, new, 1)
path.write_text(text)

# v1.0.92: preserve the async keyword when extracting the production renderer into vm.
path = Path('scripts/check-naming-dispatch-centre-profile-render-v1092.mjs')
text = path.read_text()
old = """function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Unable to find ${name}`);"""
new = """function extractFunction(name) {
  const asyncMarker = `async function ${name}(`;
  const syncMarker = `function ${name}(`;
  const asyncStart = source.indexOf(asyncMarker);
  const start = asyncStart >= 0 ? asyncStart : source.indexOf(syncMarker);
  if (start < 0) fail(`Unable to find ${name}`);"""
if old not in text:
    raise SystemExit('v1.0.92 sync-only function extractor not found')
text = text.replace(old, new, 1)
path.write_text(text)

print('Adapted v1.0.88-v1.0.92 regression harnesses for the rendered-profile acquisition layer.')
