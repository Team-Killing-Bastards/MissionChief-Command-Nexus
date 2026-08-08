from pathlib import Path
import re

root = Path('.')
p = root / 'src/missionchief-command-nexus.user.js'
s = p.read_text(encoding='utf-8')
helpers = (root / 'scripts/v1086-dispatch-centre-helpers.txt').read_text(encoding='utf-8')

def one(old, new, label):
    global s
    n = s.count(old)
    if n != 1: raise SystemExit(f'{label}: expected 1, found {n}')
    s = s.replace(old, new, 1)

one('// @version      1.0.85', '// @version      1.0.86', 'version')
one("const UNIT_VERSION = '3.3.10';", "const UNIT_VERSION = '3.3.11';", 'unit version')
one("const STATION_VERSION = '1.3.4';", "const STATION_VERSION = '1.3.5';", 'station version')
one("        loadPromise: null,\n        loaded: false,", "        loadPromise: null,\n        loaded: false,\n        listPromise: null,\n        listLoaded: false,", 'centre state')
one("        NAMING_DISPATCH_CENTRE_STATE.loadPromise = null;\n        NAMING_DISPATCH_CENTRE_STATE.loaded = false;", "        NAMING_DISPATCH_CENTRE_STATE.loadPromise = null;\n        NAMING_DISPATCH_CENTRE_STATE.loaded = false;\n        NAMING_DISPATCH_CENTRE_STATE.listPromise = null;\n        NAMING_DISPATCH_CENTRE_STATE.listLoaded = false;", 'centre reset')

# v1.0.85 loader still builds station->centre membership, but no longer owns centre labels.
start = s.index('    async function loadNamingDispatchCentreData() {')
end = s.index('    function getNamingDispatchCentreId(buildingId) {', start)
old_loader = s[start:end]
new_loader = old_loader
new_loader = new_loader.replace('    async function loadNamingDispatchCentreData() {', '    async function loadNamingDispatchCentreData(force = false) {', 1)
new_loader = new_loader.replace("        if (NAMING_DISPATCH_CENTRE_STATE.loaded) return true;", "        if (force) {\n            NAMING_DISPATCH_CENTRE_STATE.loaded = false;\n            NAMING_DISPATCH_CENTRE_STATE.loadPromise = null;\n            NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();\n        }\n        if (NAMING_DISPATCH_CENTRE_STATE.loaded) return true;", 1)
# Remove centre-label inference from building JSON.
new_loader = re.sub(r'\n\s*const recordsById = new Map\(\);\n\s*const requestedCentreIds = new Set\(\);', '', new_loader)
new_loader = new_loader.replace('                NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();\n', '')
new_loader = re.sub(r'\n\s*recordsById\.set\(buildingId, building\);', '', new_loader)
new_loader = re.sub(r'\n\s*requestedCentreIds\.add\(dispatchCentreId\);', '', new_loader)
new_loader = re.sub(r'\n\s*requestedCentreIds\.forEach\(dispatchCentreId => \{.*?\n\s*\}\);', '', new_loader, flags=re.S)
new_loader = new_loader.replace('                NAMING_DISPATCH_CENTRE_STATE.labelsById.clear();\n', '')
if 'requestedCentreIds' in new_loader or 'recordsById' in new_loader:
    raise SystemExit('Failed to remove inferred centre labels')
s = s[:start] + new_loader + s[end:]

# Replace old station-derived option builder with the independent native-list helpers.
start = s.index('    function populateNamingDispatchCentreFilter(selectId, stations) {')
end = s.index('    function findStationOverviewEntry(href) {', start)
s = s[:start] + helpers + '\n' + s[end:]

# UI order: Dispatch Centre first, dedicated refresh, then Station Type.
for prefix in ('mc-namer', 'mc-station'):
    type_id = f'{prefix}-station-type' if prefix == 'mc-namer' else 'mc-station-type'
    dc_id = f'{prefix}-dispatch-centre'
    pat = re.compile(rf'''                    <label style="margin-top:6px; display:block;"><b>Station Type:</b></label>\n                    <select id="{re.escape(type_id)}">.*?                    </select>\n\n                    <label style="margin-top:6px; display:block;"><b>Dispatch Centre:</b></label>\n                    <select id="{re.escape(dc_id)}" disabled>\n                        <option value="ALL">All dispatch centres</option>\n                    </select>''', re.S)
    replacement = f'''                    <label style="margin-top:6px; display:block;"><b>Dispatch Centre:</b></label>\n                    <select id="{dc_id}" disabled>\n                        <option value="ALL">All dispatch centres</option>\n                    </select>\n                    <button id="{prefix}-refresh-dispatch-centres" type="button" style="margin-top:4px;">Refresh Dispatch Centres</button>\n\n                    <label style="margin-top:6px; display:block;"><b>Station Type:</b></label>\n                    <select id="{type_id}">\n                        <option value="ALL">All station types</option>\n                        ${{Object.entries(STATION_TYPES).map(([key, label]) => `<option value="${{key}}">${{label}}</option>`).join('')}}\n                    </select>'''
    s, n = pat.subn(replacement, s, count=1)
    if n != 1: raise SystemExit(f'{prefix} selector reorder failed: {n}')

one('            #mc-namer-dispatch-centre,\n            #mc-namer-unit-class,', '            #mc-namer-dispatch-centre,\n            #mc-namer-refresh-dispatch-centres,\n            #mc-namer-unit-class,', 'unit refresh style')
one('            #mc-station-dispatch-centre,\n            #mc-station-mode,', '            #mc-station-dispatch-centre,\n            #mc-station-refresh-dispatch-centres,\n            #mc-station-mode,', 'station refresh style')
one("        document.querySelector('#mc-namer-station-type').onchange = handleUnitStationTypeChange;\n        document.querySelector('#mc-namer-dispatch-centre').onchange = populateStartDropdown;", "        document.querySelector('#mc-namer-dispatch-centre').onchange = handleUnitDispatchCentreChange;\n        document.querySelector('#mc-namer-refresh-dispatch-centres').onclick = () => refreshNamingDispatchCentres(true);\n        document.querySelector('#mc-namer-station-type').onchange = handleUnitStationTypeChange;", 'unit handlers')
one("        document.querySelector('#mc-station-type').onchange = populateStationNamingStartDropdown;\n        document.querySelector('#mc-station-dispatch-centre').onchange = populateStationNamingStartDropdown;", "        document.querySelector('#mc-station-dispatch-centre').onchange = handleStationDispatchCentreChange;\n        document.querySelector('#mc-station-refresh-dispatch-centres').onclick = () => refreshNamingDispatchCentres(true);\n        document.querySelector('#mc-station-type').onchange = populateStationNamingStartDropdown;", 'station handlers')

# Station refreshes load both native names and relationship mappings, then cascade type -> start.
if s.count('        await loadNamingDispatchCentreData();') != 2: raise SystemExit('Expected two old data loads')
s = s.replace('        await loadNamingDispatchCentreData();', '        await Promise.all([loadNamingDispatchCentreList(false), loadNamingDispatchCentreData(false)]);')
one("        populateNamingDispatchCentreFilter(\n            'mc-station-dispatch-centre',\n            STATION_STATE.stations\n        );\n        populateStationNamingStartDropdown();", "        populateNamingDispatchCentreFilter('mc-station-dispatch-centre');\n        populateNamingStationTypeFilter('mc-station-type', 'mc-station-dispatch-centre', STATION_STATE.stations);\n        populateStationNamingStartDropdown();", 'station cascade')
one("        populateNamingDispatchCentreFilter(\n            'mc-namer-dispatch-centre',\n            STATE.stations\n        );\n        populateStartDropdown();", "        populateNamingDispatchCentreFilter('mc-namer-dispatch-centre');\n        populateNamingStationTypeFilter('mc-namer-station-type', 'mc-namer-dispatch-centre', STATE.stations);\n        populateStartDropdown();", 'unit cascade')
one('        populateUnitClassDropdown();\n', '        populateUnitClassDropdown();\n        void refreshNamingDispatchCentres(false);\n', 'initial centre refresh')

p.write_text(s, encoding='utf-8')

# Update version assertions and docs.
for f in (root / 'scripts').glob('check-*.mjs'):
    t = f.read_text(encoding='utf-8').replace('// @version      1.0.85', '// @version      1.0.86')
    f.write_text(t, encoding='utf-8')

readme = root / 'README.md'; t = readme.read_text(encoding='utf-8').replace('**Current version:** `1.0.85`', '**Current version:** `1.0.86`', 1); readme.write_text(t, encoding='utf-8')
sr = root / 'src/README.md'; t = sr.read_text(encoding='utf-8').replace('1.0.85', '1.0.86'); sr.write_text(t, encoding='utf-8')
print('Applied v1.0.86 Dispatch Centre-first source patch')
