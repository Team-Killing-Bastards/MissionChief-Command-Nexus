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


source = replace_once(source, '// @version      1.0.94', '// @version      1.0.95', 'userscript version')
source = replace_once(source, "const UNIT_VERSION = '3.3.19';", "const UNIT_VERSION = '3.3.20';", 'Unit Naming version')
source = replace_once(source, "const STATION_VERSION = '1.3.13';", "const STATION_VERSION = '1.3.14';", 'Station Naming version')

old_unit_handler = '''    function handleUnitDispatchCentreChange() {
        populateNamingServiceFilter('mc-namer-service', 'mc-namer-dispatch-centre', STATE.stations);
        populateNamingStationTypeFilter(
            'mc-namer-station-type',
            'mc-namer-dispatch-centre',
            'mc-namer-service',
            STATE.stations
        );
        handleUnitStationTypeChange();
    }
'''
new_unit_handler = '''    async function handleUnitDispatchCentreChange() {
        // A Dispatch Centre selection is a data-boundary change. Reuse the normal
        // station refresh so membership, Service, Station Type and Start From are
        // rebuilt from the current Resource Administration rows in one pass.
        await refreshStations();
    }
'''
source = replace_once(source, old_unit_handler, new_unit_handler, 'Unit Dispatch Centre auto-refresh handler')

old_station_handler = '''    function handleStationDispatchCentreChange() {
        populateNamingServiceFilter('mc-station-service', 'mc-station-dispatch-centre', STATION_STATE.stations);
        populateNamingStationTypeFilter(
            'mc-station-type',
            'mc-station-dispatch-centre',
            'mc-station-service',
            STATION_STATE.stations
        );
        populateStationNamingStartDropdown();
    }
'''
new_station_handler = '''    async function handleStationDispatchCentreChange() {
        // Keep Station Naming on the same fresh station snapshot as Unit Naming.
        // populateNamingDispatchCentreFilter restores the selected centre after
        // refresh, then the normal cascade rebuilds Service -> Type -> Start From.
        await refreshStationNamingStations();
    }
'''
source = replace_once(source, old_station_handler, new_station_handler, 'Station Dispatch Centre auto-refresh handler')
source_path.write_text(source, encoding='utf-8')

# Every permanent regression follows the current release metadata. Preserve each
# historical behavioural contract while moving its required current baseline.
for path in (ROOT / 'scripts').glob('check-*.mjs'):
    text = path.read_text(encoding='utf-8')
    text = text.replace('// @version      1.0.94', '// @version      1.0.95')
    text = text.replace("const UNIT_VERSION = '3.3.19';", "const UNIT_VERSION = '3.3.20';")
    text = text.replace("const STATION_VERSION = '1.3.13';", "const STATION_VERSION = '1.3.14';")
    path.write_text(text, encoding='utf-8')

# Chain v1.0.95 through the naming hierarchy gate already registered in the
# permanent Validate userscript workflow. No workflow-definition mutation needed.
hierarchy_path = ROOT / 'scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs'
hierarchy = hierarchy_path.read_text(encoding='utf-8')
chain_anchor = "await import('./check-naming-dispatch-centre-membership-frame-v1094.mjs');\n"
hierarchy = replace_once(
    hierarchy,
    chain_anchor,
    chain_anchor + "await import('./check-naming-dispatch-centre-auto-station-refresh-v1095.mjs');\n",
    'v1.0.95 hierarchy regression chain'
)
hierarchy_path.write_text(hierarchy, encoding='utf-8')

readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(readme, '**Current version:** `1.0.94`', '**Current version:** `1.0.95`', 'README current version')
readme_path.write_text(readme, encoding='utf-8')

src_readme_path = ROOT / 'src/README.md'
src_readme = src_readme_path.read_text(encoding='utf-8')
src_readme = replace_once(src_readme, '| Command Nexus version | `1.0.94` |', '| Command Nexus version | `1.0.95` |', 'src README version')
src_readme_path.write_text(src_readme, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = '''## [1.0.95] - 2026-08-09

### Improved

- Selecting a Dispatch Centre in Unit Naming now automatically runs the existing **Refresh Stations** routine before rebuilding the downstream filters.
- Selecting a Dispatch Centre in Station Naming now automatically runs the existing Station Naming refresh routine before rebuilding the downstream filters.
- The selected Dispatch Centre is preserved while its options are rebuilt, then the established **Dispatch Centre → Service → Station Type → Start From** cascade is regenerated from the fresh Resource Administration station snapshot.
- Each Dispatch Centre change performs exactly one station refresh; programmatic restoration of the selected centre does not fire another change event.
- The manual **Refresh Stations** control remains available unchanged as a fallback.
- Existing Personnel Assignment/runtime guards remain owned by the normal refresh routines rather than duplicated in the Dispatch Centre handlers.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-auto-station-refresh-v1095.mjs`.
- The regression executes both production Dispatch Centre change handlers, requires exactly one normal station-refresh call per selection, protects selected-centre restoration and verifies both refresh routines rebuild Service, Station Type and Start From in order.
- The regression is chained through the already-registered naming hierarchy gate, so no permanent workflow-definition change is required.

### Changed resource baselines

- Command Nexus increased from `1.0.94` to `1.0.95`.
- Unit Naming increased from `3.3.19` to `3.3.20`.
- Station Naming increased from `1.3.13` to `1.3.14`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

'''
changelog = replace_once(changelog, '## [1.0.94] - 2026-08-09\n', entry + '## [1.0.94] - 2026-08-09\n', 'CHANGELOG insertion')
changelog_path.write_text(changelog, encoding='utf-8')

print('Built Command Nexus 1.0.95 automatic Dispatch Centre station-refresh candidate.')
