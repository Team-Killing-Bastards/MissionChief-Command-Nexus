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

source = replace_once(source, '// @version      1.0.93', '// @version      1.0.94', 'userscript version')
source = replace_once(source, "const UNIT_VERSION = '3.3.18';", "const UNIT_VERSION = '3.3.19';", 'Unit Naming version')
source = replace_once(source, "const STATION_VERSION = '1.3.12';", "const STATION_VERSION = '1.3.13';", 'Station Naming version')

old_assignment = '''    function refreshNamingDispatchCentreAssignmentsFromStationRows() {
        NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();
        const rows = [
            ...document.querySelectorAll(
                '.building_list_li, .building_list, [leitstelle_building_id], [data-leitstelle-building-id]'
            )
        ];

        rows.forEach(row => {
            const buildingId = getNamingStationRowBuildingId(row);
            if (!buildingId) return;
            const dispatchCentreId = getNamingStationRowDispatchCentreId(row);
            if (!dispatchCentreId) return;
            NAMING_DISPATCH_CENTRE_STATE.byBuildingId.set(buildingId, dispatchCentreId);
        });

        NAMING_DISPATCH_CENTRE_STATE.loaded = true;
        return true;
    }
'''
new_assignment = '''    function refreshNamingDispatchCentreAssignmentsFromStationRows() {
        NAMING_DISPATCH_CENTRE_STATE.byBuildingId.clear();
        const seenRows = new Set();

        // Dispatch Centre names and station membership must come from the same native
        // Resource Administration document graph. In the normal Stations lightbox the
        // naming UI can be owned by the top document while building rows live in a
        // same-origin child frame, so current-document-only assignment scans fail empty.
        getNamingDispatchCentreStationRowDocuments().forEach(candidateDocument => {
            const rows = [
                ...candidateDocument.querySelectorAll(
                    '.building_list_li, .building_list, [leitstelle_building_id], [data-leitstelle-building-id]'
                )
            ];

            rows.forEach(row => {
                if (!row || seenRows.has(row)) return;
                seenRows.add(row);

                const buildingId = getNamingStationRowBuildingId(row);
                if (!buildingId) return;
                const dispatchCentreId = getNamingStationRowDispatchCentreId(row);
                if (!dispatchCentreId) return;
                NAMING_DISPATCH_CENTRE_STATE.byBuildingId.set(buildingId, dispatchCentreId);
            });
        });

        NAMING_DISPATCH_CENTRE_STATE.loaded = true;
        return true;
    }
'''
source = replace_once(source, old_assignment, new_assignment, 'frame-scoped assignment loader')
source_path.write_text(source, encoding='utf-8')

# Revalidate all permanent checks against the new release metadata without rewriting
# their historical behaviour names/messages.
for path in (ROOT / 'scripts').glob('check-*.mjs'):
    text = path.read_text(encoding='utf-8')
    text = text.replace('// @version      1.0.93', '// @version      1.0.94')
    text = text.replace("const UNIT_VERSION = '3.3.18';", "const UNIT_VERSION = '3.3.19';")
    text = text.replace("const STATION_VERSION = '1.3.12';", "const STATION_VERSION = '1.3.13';")
    path.write_text(text, encoding='utf-8')

readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
readme = replace_once(readme, '**Current version:** `1.0.93`', '**Current version:** `1.0.94`', 'README current version')
readme_path.write_text(readme, encoding='utf-8')

src_readme_path = ROOT / 'src/README.md'
src_readme = src_readme_path.read_text(encoding='utf-8')
src_readme = replace_once(src_readme, '| Command Nexus version | `1.0.93` |', '| Command Nexus version | `1.0.94` |', 'src README version')
src_readme_path.write_text(src_readme, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = '''## [1.0.94] - 2026-08-09

### Fixed

- Fixed Dispatch Centre membership appearing entirely under **Unassigned / default** after the v1.0.93 native-centre discovery correction.
- Station-to-centre membership now scans the same active/top/same-origin Resource Administration document collection as Dispatch Centre discovery instead of restricting `leitstelle_building_id` reads to the userscript's current document.
- Native station rows such as `leitstelle_building_id="<centre id>"` now populate the building-to-centre map even when those rows live inside the normal Stations child frame.
- Literal `null`, `undefined`, `false`, blank and non-positive assignments remain genuinely unassigned.
- The established **Dispatch Centre → Service → Station Type → Start From** cascade is unchanged; selecting a centre now exposes the services and station types actually assigned to it.

### Regression coverage

- Added `scripts/check-naming-dispatch-centre-membership-frame-v1094.mjs`.
- The regression starts with an empty top document and puts assigned native station rows in a same-origin Resource Administration child frame, then executes the production membership loader and proves NI Fire Dispatch membership reaches the downstream Fire & Rescue Service subset while only a literal-null station remains Unassigned/default.
- The regression is permanently registered in `Validate userscript`.

### Changed resource baselines

- Command Nexus increased from `1.0.93` to `1.0.94`.
- Unit Naming increased from `3.3.18` to `3.3.19`.
- Station Naming increased from `1.3.12` to `1.3.13`.
- Mission Finder remains `V10.6.144`.
- Personnel Assignment remains `1.3.9`.

'''
changelog = replace_once(changelog, '## [1.0.93] - 2026-08-09\n', entry + '## [1.0.93] - 2026-08-09\n', 'CHANGELOG insertion')
changelog_path.write_text(changelog, encoding='utf-8')

workflow_path = ROOT / '.github/workflows/validate-userscript.yml'
workflow = workflow_path.read_text(encoding='utf-8')
path_anchor = "      - 'scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs'\n"
if workflow.count(path_anchor) != 2:
    raise SystemExit(f'workflow path anchor: expected 2 matches, got {workflow.count(path_anchor)}')
workflow = workflow.replace(
    path_anchor,
    path_anchor + "      - 'scripts/check-naming-dispatch-centre-membership-frame-v1094.mjs'\n"
)
step_anchor = '''      - name: Validate profile Dispatch Centre and Service hierarchy
        run: node scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs
'''
step = step_anchor + '''
      - name: Validate frame-scoped Dispatch Centre station membership
        run: node scripts/check-naming-dispatch-centre-membership-frame-v1094.mjs
'''
workflow = replace_once(workflow, step_anchor, step, 'workflow validation step')
workflow = workflow.replace(
    'centre-first flow, profile hierarchy, Service filtering, Dispatch Centre refresh parsing, resilient Retry action and null assignment handling',
    'centre-first flow, native centre discovery, frame-scoped station membership, Service filtering, Dispatch Centre refresh parsing, resilient Retry action and null assignment handling'
)
workflow_path.write_text(workflow, encoding='utf-8')

print('Built Command Nexus 1.0.94 frame-scoped Dispatch Centre membership candidate.')
