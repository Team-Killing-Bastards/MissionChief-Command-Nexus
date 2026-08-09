#!/usr/bin/env python3
from pathlib import Path

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
print('Adapted v1.0.88 authority regression for the v1.0.92 rendered-profile acquisition layer.')
