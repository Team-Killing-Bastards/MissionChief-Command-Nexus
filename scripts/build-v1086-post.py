from pathlib import Path

# Owner-authored synchronize trigger for the trusted v1.0.86 builder (retry).
root = Path('.')
src = root / 'src/missionchief-command-nexus.user.js'
s = src.read_text(encoding='utf-8')
old = "        centres.forEach(({ id, label }) => add(id, label));\n        const values = new Set([...select.options].map(option => option.value));"
new = "        centres.forEach(({ id, label }) => add(id, label));\n        if (NAMING_DISPATCH_CENTRE_STATE.loaded) add(NAMING_DISPATCH_CENTRE_UNASSIGNED, 'Unassigned / default');\n        const values = new Set([...select.options].map(option => option.value));"
if s.count(old) != 1: raise SystemExit('Unable to preserve Unassigned / default option')
s = s.replace(old, new, 1)
old = "            if (scoped.length && !types.has(key)) return;"
new = "            if ((stations || []).length && !types.has(key)) return;"
if s.count(old) != 1: raise SystemExit('Unable to tighten centre-scoped Station Type edge case')
s = s.replace(old, new, 1)
src.write_text(s, encoding='utf-8')

readme = root / 'README.md'
r = readme.read_text(encoding='utf-8')
r = r.replace('- Dispatch Centre scoping for Unit Naming and Station Naming', "- Dispatch Centre-first scoping for Unit Naming and Station Naming, loaded from MissionChief's native Dispatch Centres view", 1)
readme.write_text(r, encoding='utf-8')

changelog = root / 'CHANGELOG.md'
c = changelog.read_text(encoding='utf-8')
marker = '## [1.0.85] - 2026-08-08\n'
entry = '''## [1.0.86] - 2026-08-08\n\n### Fixed\n\n- Unit Naming and Station Naming now load the **Dispatch Centre list independently** from MissionChief's native `/leitstellenansicht` view instead of inferring available centres from station records.\n- Naming now follows **Dispatch Centre → Station Type → Start From**. Choosing a centre first narrows Station Type to types represented in that centre, and Start From is then limited to the selected centre and type.\n- Added **Refresh Dispatch Centres** controls to both naming tools.\n- Station membership still uses MissionChief's `leitstelle_building_id` relationship from `/building/buildings_json`; centre names are not hard-coded or guessed.\n\n### Changed resource baselines\n\n- Unit Naming increased from `3.3.10` to `3.3.11`.\n- Station Naming increased from `1.3.4` to `1.3.5`.\n- Mission Finder remains `V10.6.144`.\n- Personnel Assignment remains `1.3.9`.\n- Command Nexus increased from `1.0.85` to `1.0.86`.\n\n'''
if marker not in c: raise SystemExit('CHANGELOG 1.0.85 marker missing')
changelog.write_text(c.replace(marker, entry + marker, 1), encoding='utf-8')
print('Applied v1.0.86 compatibility and release metadata')
