#!/usr/bin/env python3
from pathlib import Path

source_path = Path('src/missionchief-command-nexus.user.js')
source = source_path.read_text(encoding='utf-8')

if '// @version      1.0.76' not in source:
    raise SystemExit('Expected Command Nexus 1.0.76 candidate')
if 'MISSION FINDER V10.6.139' not in source:
    raise SystemExit('Expected Mission Finder V10.6.139 candidate')

old_guard = """    // The naming/personnel workspace owns the main MissionChief document and
    // reaches its edit iframes from there. Running a second complete workspace
    // runtime inside every mission/lightbox iframe retained an extra whole-DOM
    // observer, caches and global listeners for documents that never render the
    // tools. Child frames therefore leave this module to the top-window owner.
    if (!TOOL_IS_TOP_WINDOW) return;

    const UNIT_VERSION = '3.3.8';
"""
new_guard = """    const TOOL_IS_STATION_OVERVIEW_FRAME = (() => {
        if (TOOL_IS_TOP_WINDOW) return false;
        try {
            if (window.top.location.origin !== location.origin) return false;
        } catch (_error) {
            return false;
        }

        return /^\\/leitstellenansicht\\/?$/.test(
            String(location.pathname || '')
        );
    })();

    // Resource Administration normally has one top-window owner. MissionChief's
    // normal Stations control opens the same /leitstellenansicht document in a
    // same-origin lightbox iframe, so that exact frame is also an authoritative
    // workspace host. All mission, building-detail and unrelated child frames
    // remain excluded from the naming/personnel runtime.
    if (!TOOL_IS_TOP_WINDOW && !TOOL_IS_STATION_OVERVIEW_FRAME) return;

    const UNIT_VERSION = '3.3.9';
"""
if source.count(old_guard) != 1:
    raise SystemExit(f'Expected one top-window-only naming guard, found {source.count(old_guard)}')
source = source.replace(old_guard, new_guard)

old_overview = """        if (!isIosSafariWebsite()) {
            return entries.some(entry =>
                entry.link?.matches?.(
                    desktopStationSelector
                )
            );
        }

        return entries.some(entry =>
            isRenderedStationOverviewEntry(entry)
        );
"""
new_overview = """        if (TOOL_IS_STATION_OVERVIEW_FRAME) {
            return entries.some(entry =>
                entry.link?.isConnected
            );
        }

        if (!isIosSafariWebsite()) {
            return entries.some(entry =>
                entry.link?.matches?.(
                    desktopStationSelector
                )
            );
        }

        return entries.some(entry =>
            isRenderedStationOverviewEntry(entry)
        );
"""
if source.count(old_overview) != 1:
    raise SystemExit(f'Expected one desktop station-overview gate, found {source.count(old_overview)}')
source = source.replace(old_overview, new_overview)
source_path.write_text(source, encoding='utf-8')

check_path = Path('scripts/check-station-overview-popup-v1076.mjs')
check_path.write_text(r'''#!/usr/bin/env node
import fs from 'node:fs';

const source = fs.readFileSync('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

expect(source.includes('// @version      1.0.76'), 'Expected Command Nexus 1.0.76');
expect(source.includes("const UNIT_VERSION = '3.3.9';"), 'Unit Naming must be 3.3.9');

const moduleStart = source.indexOf("if (window.__MC_NAMING_TOOLS_V428__) return;");
const moduleEnd = source.indexOf("const UNIT_VERSION = '3.3.9';", moduleStart);
expect(moduleStart >= 0 && moduleEnd > moduleStart, 'Unable to isolate Resource Administration startup');
const startup = source.slice(moduleStart, moduleEnd);

expect(startup.includes('window.top === window.self'), 'Resource Administration must retain top-window ownership detection');
expect(startup.includes('const TOOL_IS_STATION_OVERVIEW_FRAME'), 'Missing station-overview frame classification');
expect(startup.includes('window.top.location.origin !== location.origin'), 'Station popup frame must be same-origin');
expect(startup.includes("String(location.pathname || '')"), 'Station popup classification must use its own route');
expect(startup.includes('leitstellenansicht'), 'Station popup classification must require the Stations overview route');
expect(startup.includes('if (!TOOL_IS_TOP_WINDOW && !TOOL_IS_STATION_OVERVIEW_FRAME) return;'), 'Only top window or the exact Stations popup may own Resource Administration');
expect(!startup.includes('if (!TOOL_IS_TOP_WINDOW) return;'), 'The former blanket child-frame return must not remain');

const overviewStart = source.indexOf('function isStationOverviewScreen()');
const overviewEnd = source.indexOf('\n\n\n    function init()', overviewStart);
expect(overviewStart >= 0 && overviewEnd > overviewStart, 'Unable to isolate station overview screen detection');
const overview = source.slice(overviewStart, overviewEnd);
const popupGate = overview.indexOf('if (TOOL_IS_STATION_OVERVIEW_FRAME)');
const desktopGate = overview.indexOf('if (!isIosSafariWebsite())');
expect(popupGate >= 0, 'Station popup must have an explicit overview path');
expect(desktopGate > popupGate, 'Station popup path must be evaluated before the desktop-only selector');
expect(overview.includes('entry.link?.isConnected'), 'Station popup must require a connected station entry');
expect(overview.includes('isRenderedStationOverviewEntry(entry)'), 'iOS rendered-view lifecycle must remain intact');
expect(overview.includes('desktopStationSelector'), 'Dedicated desktop Stations view must remain intact');

console.log('Normal Stations overview popup ownership and lifecycle checks passed.');
''', encoding='utf-8')

workflow_path = Path('.github/workflows/validate-userscript.yml')
workflow = workflow_path.read_text(encoding='utf-8')
workflow = workflow.replace(
    '# Includes mission-definition trained-personnel, Required Personnel preload, preloaded Vehicle Load coverage, high-risk Missing Person Ambulance settings, selected-trained-personnel UI, integrated mission dashboard, compact Nexus UI, HazMat vehicle/personnel-to-OSU, diagnostic export, dispatch-correction, memory lifecycle/recycle, Missing-on-mission authority and single-pass update coverage.',
    '# Includes mission-definition trained-personnel, Required Personnel preload, preloaded Vehicle Load coverage, high-risk Missing Person Ambulance settings, normal Stations popup ownership, selected-trained-personnel UI, integrated mission dashboard, compact Nexus UI, HazMat vehicle/personnel-to-OSU, diagnostic export, dispatch-correction, memory lifecycle/recycle, Missing-on-mission authority and single-pass update coverage.'
)
path_anchor = "      - 'scripts/check-high-risk-missing-person-ambulance-v1076.mjs'\n"
if workflow.count(path_anchor) != 2:
    raise SystemExit(f'Expected two workflow path anchors, found {workflow.count(path_anchor)}')
workflow = workflow.replace(
    path_anchor,
    path_anchor + "      - 'scripts/check-station-overview-popup-v1076.mjs'\n"
)
step_anchor = """      - name: Validate high-risk Missing Person Ambulance setting
        run: node scripts/check-high-risk-missing-person-ambulance-v1076.mjs
"""
if workflow.count(step_anchor) != 1:
    raise SystemExit(f'Expected one workflow step anchor, found {workflow.count(step_anchor)}')
workflow = workflow.replace(
    step_anchor,
    step_anchor + """
      - name: Validate normal Stations overview popup ownership
        run: node scripts/check-station-overview-popup-v1076.mjs
"""
)
workflow_path.write_text(workflow, encoding='utf-8')

runtime_path = Path('scripts/check-runtime-memory-maintenance-v1074.mjs')
runtime = runtime_path.read_text(encoding='utf-8')
runtime = runtime.replace(
    'source.indexOf("const UNIT_VERSION = \'3.3.8\';")',
    'source.indexOf("const UNIT_VERSION = \'3.3.9\';")'
)
old_runtime_contract = """expect(namingModuleStart.includes('window.top === window.self'), 'Naming/personnel runtime must identify its top-window owner');
expect(namingModuleStart.includes('if (!TOOL_IS_TOP_WINDOW) return;'), 'Naming/personnel runtime must not duplicate in child mission frames');
"""
new_runtime_contract = """expect(namingModuleStart.includes('window.top === window.self'), 'Naming/personnel runtime must identify its top-window owner');
expect(namingModuleStart.includes('TOOL_IS_STATION_OVERVIEW_FRAME'), 'Naming/personnel runtime must recognise the exact Stations overview lightbox');
expect(namingModuleStart.includes('leitstellenansicht'), 'Stations lightbox ownership must remain route-scoped');
expect(namingModuleStart.includes('if (!TOOL_IS_TOP_WINDOW && !TOOL_IS_STATION_OVERVIEW_FRAME) return;'), 'Naming/personnel runtime must remain excluded from mission and unrelated child frames');
expect(!namingModuleStart.includes('if (!TOOL_IS_TOP_WINDOW) return;'), 'Blanket child-frame exclusion must not suppress the Stations overview lightbox');
"""
if runtime.count(old_runtime_contract) != 1:
    raise SystemExit(f'Expected one runtime ownership contract, found {runtime.count(old_runtime_contract)}')
runtime = runtime.replace(old_runtime_contract, new_runtime_contract)
runtime_path.write_text(runtime, encoding='utf-8')

changelog_path = Path('CHANGELOG.md')
changelog = changelog_path.read_text(encoding='utf-8')
added_anchor = "- The configured Ambulance appears in the preloaded Vehicle Load display before Unit Finder runs.\n"
if changelog.count(added_anchor) != 1:
    raise SystemExit(f'Expected one changelog Added anchor, found {changelog.count(added_anchor)}')
changelog = changelog.replace(
    added_anchor,
    added_anchor + '- Resource Administration now appears inside the normal Stations overview lightbox as well as on the dedicated full-page `/leitstellenansicht` view.\n'
)
safety_anchor = "- The compact Settings, Vehicle drawer, Auto Mode, memory lifecycle and iPhone/iOS paths remain unchanged.\n"
if changelog.count(safety_anchor) != 1:
    raise SystemExit(f'Expected one changelog safety anchor, found {changelog.count(safety_anchor)}')
changelog = changelog.replace(
    safety_anchor,
    safety_anchor + '- Only the exact same-origin `/leitstellenansicht` child frame may host Resource Administration; mission, building-detail and unrelated child frames remain excluded.\n'
)
unit_anchor = '- Unit Naming remains `3.3.8`.\n'
first_unit = changelog.find(unit_anchor)
if first_unit < 0:
    raise SystemExit('Unable to find the 1.0.76 Unit Naming baseline')
changelog = changelog[:first_unit] + '- Unit Naming increased from `3.3.8` to `3.3.9`.\n' + changelog[first_unit + len(unit_anchor):]
changelog_path.write_text(changelog, encoding='utf-8')

source_readme_path = Path('src/README.md')
source_readme = source_readme_path.read_text(encoding='utf-8')
readme_anchor = 'The source is merged and installable. Resource Administration uses one filtered lifecycle controller, remains scoped to the rendered personal Stations view on iOS Safari and preserves the same panel instance across responsive navigation.'
readme_replacement = 'The source is merged and installable. Resource Administration uses one filtered lifecycle controller, runs in the top-level Stations view or the exact same-origin `/leitstellenansicht` lightbox frame, remains scoped to the rendered personal Stations view on iOS Safari and preserves the same panel instance across responsive navigation.'
if source_readme.count(readme_anchor) != 1:
    raise SystemExit(f'Expected one source README lifecycle anchor, found {source_readme.count(readme_anchor)}')
source_readme = source_readme.replace(readme_anchor, readme_replacement)
source_readme_path.write_text(source_readme, encoding='utf-8')

print('Applied normal Stations overview popup ownership fix for Command Nexus 1.0.76 / Unit Naming 3.3.9.')
