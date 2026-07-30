#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / 'src' / 'missionchief-command-nexus.user.js'
source = SOURCE_PATH.read_text(encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


source = replace_once(source, '// @version      1.0.59', '// @version      1.0.60', 'userscript version')
source = replace_once(source, ' * MODULE 2: MISSION FINDER V10.6.122', ' * MODULE 2: MISSION FINDER V10.6.123', 'Mission Finder header')

update_table_anchor = '''        return text.includes('still needed')
            || text.includes('still required')
            || text.includes('needed') && text.includes('required');
    }


    function normaliseMissionAlertText(
'''
update_table_replacement = '''        return text.includes('still needed')
            || text.includes('still required')
            || text.includes('needed') && text.includes('required');
    }


    function getMissionUpdateTableHeaderTexts(table) {
        if (!table) return [];

        try {
            return Array.from(
                table.querySelectorAll('thead th')
            ).map(header => {
                return String(
                    header.getAttribute?.('title') ||
                    header.textContent ||
                    header.innerText ||
                    ''
                )
                    .replace(/\\s+/g, ' ')
                    .trim()
                    .toLowerCase();
            }).filter(Boolean);
        } catch (_error) {
            return [];
        }
    }


    function isMissingOnMissionUpdateTable(table) {
        const headers = getMissionUpdateTableHeaderTexts(table);
        return (
            headers.includes('missing on mission') &&
            headers.some(header =>
                header === 'still needed' ||
                header === 'still required'
            )
        );
    }


    function hasVisibleCurrentMissingOnMissionTable() {
        return getActiveMissionRequirementContexts().some(context => {
            const root = context?.root;
            if (!root) return false;

            try {
                return Array.from(
                    root.querySelectorAll('table.table-striped.table-condensed, table.table')
                ).some(table => {
                    return (
                        isMissionUpdateTable(table) &&
                        isMissingOnMissionUpdateTable(table) &&
                        isMissionElementVisible(table)
                    );
                });
            } catch (_error) {
                return false;
            }
        });
    }


    function normaliseEscapedMissionHtmlText(value) {
        const decoded = String(value || '')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#0*39;|&apos;/gi, "'")
            .replace(/&amp;/gi, '&');

        try {
            if (typeof DOMParser === 'function') {
                const parsed = new DOMParser().parseFromString(decoded, 'text/html');
                return String(parsed?.body?.textContent || '')
                    .replace(/\\u00a0/g, ' ')
                    .replace(/\\s+/g, ' ')
                    .trim();
            }
        } catch (_error) {}

        return decoded
            .replace(/<[^>]*>/g, ' ')
            .replace(/\\u00a0/g, ' ')
            .replace(/\\s+/g, ' ')
            .trim();
    }


    function normaliseMissionAlertText(
'''
source = replace_once(source, update_table_anchor, update_table_replacement, 'mission update table helpers')

explicit_anchor = '''            source === 'data-requirement-type-vehicles' ||
            source === 'visible-missing-vehicles-alert' ||
            source === 'visible-structured-missing-vehicles'
'''
explicit_replacement = '''            source === 'data-requirement-type-vehicles' ||
            source === 'data-raw-html-missing-vehicles' ||
            source === 'missing-on-mission-table' ||
            source === 'visible-missing-vehicles-alert' ||
            source === 'visible-structured-missing-vehicles'
'''
source = replace_once(source, explicit_anchor, explicit_replacement, 'explicit missing vehicle sources')

raw_html_anchor = '''        return Array.from(deduped.values());
    }



    function getCurrentMissionPatientAlertRoots(
'''
raw_html_replacement = '''        Array.from(new Set(roots.filter(Boolean))).forEach(root => {
            let rawHtmlHosts = [];
            try {
                rawHtmlHosts = Array.from(
                    root.querySelectorAll('[data-raw-html]')
                );
            } catch (_error) {}

            rawHtmlHosts
                .filter(element => isMissionElementVisible(element))
                .forEach(element => {
                    const rawHtml = String(
                        element.getAttribute?.('data-raw-html') ||
                        ''
                    );
                    if (!/Missing\\s+Vehicles?\\s*:/i.test(rawHtml)) return;

                    const text = normaliseEscapedMissionHtmlText(rawHtml);
                    if (!/Missing\\s+Vehicles?\\s*:/i.test(text)) return;

                    getGenericMissingVehicleRowsFromText(text).forEach(row => {
                        const key = `${normaliseVehicleText(row.unitName)}|${row.stillNeeded}`;
                        if (!deduped.has(key)) {
                            deduped.set(key, {
                                ...row,
                                source: 'data-raw-html-missing-vehicles'
                            });
                        }
                    });
                });
        });

        return Array.from(deduped.values());
    }



    function getCurrentMissionPatientAlertRoots(
'''
source = replace_once(source, raw_html_anchor, raw_html_replacement, 'data-raw-html fallback')

loop_anchor = '''        updateTables.forEach(table => {
            const liveRequirementsTable =
                isLiveMissionRequirementsTable(
                    table
                );
'''
loop_replacement = '''        updateTables.forEach(table => {
            const liveRequirementsTable =
                isLiveMissionRequirementsTable(
                    table
                );
            const missingOnMissionTable =
                !liveRequirementsTable &&
                isMissingOnMissionUpdateTable(table);
'''
source = replace_once(source, loop_anchor, loop_replacement, 'missing-on-mission table classification')

legacy_parse_anchor = '''                if (
                    !Number.isFinite(
                        stillNeeded
                    ) ||
                    stillNeeded <=
                    0
                ) {
                    const numericCells =
                        cellTexts
                            .map(value => {
                                return parseInt(
                                    value,
                                    10
                                );
                            })
                            .filter(value => {
                                return (
                                    Number.isFinite(
                                        value
                                    ) &&
                                    value >
                                    0
                                );
                            });
                    stillNeeded =
                        numericCells.length
                            ? numericCells[
                                numericCells.length -
                                1
                            ]
                            : 0;
                }

                recordUpdateRequirement(
                    unitName,
                    stillNeeded,
                    'legacy-update-table'
                );
'''
legacy_parse_replacement = '''                if (
                    (
                        !Number.isFinite(
                            stillNeeded
                        ) ||
                        stillNeeded <=
                        0
                    ) &&
                    !missingOnMissionTable
                ) {
                    const numericCells =
                        cellTexts
                            .map(value => {
                                return parseInt(
                                    value,
                                    10
                                );
                            })
                            .filter(value => {
                                return (
                                    Number.isFinite(
                                        value
                                    ) &&
                                    value >
                                    0
                                );
                            });
                    stillNeeded =
                        numericCells.length
                            ? numericCells[
                                numericCells.length -
                                1
                            ]
                            : 0;
                }

                if (missingOnMissionTable) {
                    const missingOnMission = Math.max(
                        0,
                        parseInt(cellTexts[1], 10) || 0
                    );
                    const enRoute = Math.max(
                        0,
                        parseInt(cellTexts[2], 10) || 0
                    );
                    const selected = Math.max(
                        0,
                        parseInt(cellTexts[4], 10) || 0
                    );
                    const reportedStillNeeded = Math.max(
                        0,
                        Number.isFinite(stillNeeded)
                            ? stillNeeded
                            : 0
                    );

                    // The table's Still needed value is the additional shortage.
                    // Convert it to a current-selection target so a second read of
                    // the same table cannot select the shortage twice.
                    recordUpdateRequirement(
                        unitName,
                        selected + reportedStillNeeded,
                        'missing-on-mission-table',
                        {
                            dispatchTargetMode: 'total',
                            explicitMissingVehicles: true,
                            missingOnMissionTable: true,
                            missingOnMission,
                            enRoute,
                            selected,
                            reportedStillNeeded
                        }
                    );
                    return;
                }

                recordUpdateRequirement(
                    unitName,
                    stillNeeded,
                    'legacy-update-table'
                );
'''
source = replace_once(source, legacy_parse_anchor, legacy_parse_replacement, 'legacy table row authority')

route_declaration_anchor = '''        let explicitMissingRows =
            getExplicitCurrentMissingRequirementRows(
                currentUpdateRows
            );

        let useExplicitMissingRequirements =
            explicitMissingRows.length > 0;

        const attachmentRows =
            useExplicitMissingRequirements
'''
route_declaration_replacement = '''        let explicitMissingRows =
            getExplicitCurrentMissingRequirementRows(
                currentUpdateRows
            );

        let hasMissingOnMissionTableAuthority =
            hasVisibleCurrentMissingOnMissionTable();

        let useCurrentMissionUpdateAuthority =
            explicitMissingRows.length > 0 ||
            hasMissingOnMissionTableAuthority;

        const attachmentRows =
            useCurrentMissionUpdateAuthority
'''
source = replace_once(source, route_declaration_anchor, route_declaration_replacement, 'combined logic route declaration')
source = source.replace('if (!useExplicitMissingRequirements) {', 'if (!useCurrentMissionUpdateAuthority) {', 1)

late_refresh_anchor = '''            if (refreshedExplicitMissingRows.length > 0) {
                currentUpdateRows =
                    refreshedUpdateRows;
                explicitMissingRows =
                    refreshedExplicitMissingRows;
                useExplicitMissingRequirements =
                    true;
            }
'''
late_refresh_replacement = '''            const refreshedMissingOnMissionTableAuthority =
                hasVisibleCurrentMissingOnMissionTable();

            if (
                refreshedExplicitMissingRows.length > 0 ||
                refreshedMissingOnMissionTableAuthority
            ) {
                currentUpdateRows =
                    refreshedUpdateRows;
                explicitMissingRows =
                    refreshedExplicitMissingRows;
                hasMissingOnMissionTableAuthority =
                    refreshedMissingOnMissionTableAuthority;
                useCurrentMissionUpdateAuthority =
                    true;
            }
'''
source = replace_once(source, late_refresh_anchor, late_refresh_replacement, 'late mission update refresh')
source = source.replace('useExplicitMissingRequirements\n                ? null', 'useCurrentMissionUpdateAuthority\n                ? null', 1)

explicit_branch_anchor = '''        if (useExplicitMissingRequirements) {
            updateStatusBox(
                `Current missing requirements found: ${explicitMissingRows.length} row(s). Full mission requirements were not reloaded.`
            );

            if (mfDebugEnabled) {
                debugLog(
                    'UNIT FINDER MISSING AUTHORITY',
                    explicitMissingRows
                        .map(row => `${row.unitName} x${row.stillNeeded}`)
                        .join(' | ')
                );
            }

            // readMissionUpdateRows has already removed unrelated full mission
            // totals while retaining current patient shortages. Process that
            // authoritative set rather than dropping patient rows by passing
            // only the explicit vehicle/personnel subset.
            const missionRequirementsSatisfied =
                await processRequirementRows(
                    currentUpdateRows,
                    'CURRENT MISSING REQUIREMENTS'
                );

            return preservePatientFailure(
                missionRequirementsSatisfied
            );
        }
'''
explicit_branch_replacement = '''        if (useCurrentMissionUpdateAuthority) {
            updateStatusBox(
                explicitMissingRows.length > 0
                    ? `Current missing requirements found: ${explicitMissingRows.length} row(s). Full mission requirements were not reloaded.`
                    : 'Current Missing on mission table found with no positive Still needed rows. Full mission requirements were not reloaded.'
            );

            if (mfDebugEnabled) {
                debugLog(
                    'UNIT FINDER MISSING AUTHORITY',
                    explicitMissingRows.length > 0
                        ? explicitMissingRows
                            .map(row => `${row.unitName} x${row.stillNeeded}`)
                            .join(' | ')
                        : 'Missing on mission table is authoritative with zero additional vehicle shortage.'
                );
            }

            // readMissionUpdateRows has already removed unrelated full mission
            // totals while retaining current patient shortages. Process that
            // authoritative set rather than dropping patient rows by passing
            // only the explicit vehicle/personnel subset.
            if (currentUpdateRows.length > 0) {
                const missionRequirementsSatisfied =
                    await processRequirementRows(
                        currentUpdateRows,
                        'CURRENT MISSING REQUIREMENTS'
                    );

                return preservePatientFailure(
                    missionRequirementsSatisfied
                );
            }

            changeDispatchBoxColor(true);
            return preservePatientFailure(true);
        }
'''
source = replace_once(source, explicit_branch_anchor, explicit_branch_replacement, 'combined logic mission update branch')

# Any remaining route variable in the same function is a failed patch.
if 'useExplicitMissingRequirements' in source:
    raise SystemExit('legacy combined-logic route variable remains')

early_anchor = '''            const hasEarlyExplicitMissingRequirements =
                earlyExplicitMissingRows.length > 0;

            let prefetchedAttachmentRowsPromise = null;
'''
early_replacement = '''            const hasEarlyExplicitMissingRequirements =
                earlyExplicitMissingRows.length > 0;
            const hasEarlyMissingOnMissionTableAuthority =
                hasVisibleCurrentMissingOnMissionTable();
            const hasEarlyCurrentMissionUpdateAuthority =
                hasEarlyExplicitMissingRequirements ||
                hasEarlyMissingOnMissionTableAuthority;

            let prefetchedAttachmentRowsPromise = null;
'''
source = replace_once(source, early_anchor, early_replacement, 'early update authority declaration')
source = source.replace('hasEarlyExplicitMissingRequirements\n                        ? null', 'hasEarlyCurrentMissionUpdateAuthority\n                        ? null', 1)

early_log_anchor = '''                    hasEarlyExplicitMissingRequirements
                        ? `Explicit missing requirements detected (${earlyExplicitMissingRows.length} row(s)); full attachment prefetch suppressed.`
                        : `Early update snapshot contained no explicit Missing Vehicles/Personnel authority; normal attachment route retained.`
'''
early_log_replacement = '''                    hasEarlyCurrentMissionUpdateAuthority
                        ? (
                            hasEarlyExplicitMissingRequirements
                                ? `Explicit missing requirements detected (${earlyExplicitMissingRows.length} row(s)); full attachment prefetch suppressed.`
                                : 'Missing on mission table detected; full attachment prefetch suppressed even though no positive Still needed row exists.'
                        )
                        : `Early update snapshot contained no Missing on mission table or explicit Missing Vehicles/Personnel authority; normal attachment route retained.`
'''
source = replace_once(source, early_log_anchor, early_log_replacement, 'early update authority log')

SOURCE_PATH.write_text(source, encoding='utf-8')

# Advance stable source assertions across permanent scripts.
for path in (ROOT / 'scripts').glob('*.mjs'):
    text = path.read_text(encoding='utf-8')
    updated = text.replace('1.0.59', '1.0.60').replace('V10.6.122', 'V10.6.123')
    if updated != text:
        path.write_text(updated, encoding='utf-8')

readme = ROOT / 'README.md'
text = readme.read_text(encoding='utf-8')
text = text.replace('`1.0.59` · **Mission Finder engine:** `V10.6.122`', '`1.0.60` · **Mission Finder engine:** `V10.6.123`')
readme.write_text(text, encoding='utf-8')

src_readme = ROOT / 'src' / 'README.md'
if src_readme.exists():
    text = src_readme.read_text(encoding='utf-8')
    text = text.replace('1.0.59', '1.0.60').replace('V10.6.122', 'V10.6.123')
    src_readme.write_text(text, encoding='utf-8')

changelog = ROOT / 'CHANGELOG.md'
text = changelog.read_text(encoding='utf-8')
marker = '## [1.0.59] - 2026-07-29\n'
entry = '''## [1.0.60] - 2026-07-30

### Fixed

- Auto Mode once again treats a visible `Missing on mission / En-route / Still needed / Selected` table as Mission Update authority and suppresses the full mission-definition Unit Finder route.
- Positive `Still needed` values are converted to a current-selection target using the table's `Selected` value, preventing the same shortage from being selected twice during the post-selection recheck.
- A visible Missing-on-mission table with zero positive shortages remains authoritative, so an existing fully supplied mission cannot be mistaken for a fresh mission.
- MissionChief's escaped `data-raw-html` Missing Vehicles alert is now parsed as a scoped fallback when the structured child exists only inside the attribute.
- Existing patient, trained-personnel, prisoner, transport and memory lifecycle rules are unchanged.

### Changed engine baseline

- Mission Finder increased from `V10.6.122` to `V10.6.123`.
- Personnel Assignment remains `1.3.7`.

'''
if marker not in text:
    raise SystemExit('CHANGELOG 1.0.59 marker not found')
text = text.replace(marker, entry + marker, 1)
changelog.write_text(text, encoding='utf-8')

print('Applied v1.0.60 Missing on mission authority correction.')
