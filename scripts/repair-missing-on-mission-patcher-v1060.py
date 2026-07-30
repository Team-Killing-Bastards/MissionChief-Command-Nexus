#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).with_name('apply-missing-on-mission-authority-v1060.py')
text = path.read_text(encoding='utf-8')

legacy_old = "source = replace_once(source, legacy_parse_anchor, legacy_parse_replacement, 'legacy table row authority')"
legacy_new = r"""if legacy_parse_anchor in source:
    source = replace_once(source, legacy_parse_anchor, legacy_parse_replacement, 'legacy table row authority')
else:
    legacy_condition_anchor = '''                if (
                    !Number.isFinite(
                        stillNeeded
                    ) ||
                    stillNeeded <=
                    0
                ) {
'''
    legacy_condition_replacement = '''                if (
                    (
                        !Number.isFinite(
                            stillNeeded
                        ) ||
                        stillNeeded <=
                        0
                    ) &&
                    !missingOnMissionTable
                ) {
'''
    source = replace_once(
        source,
        legacy_condition_anchor,
        legacy_condition_replacement,
        'legacy table zero fallback guard'
    )

    legacy_record_anchor = '''                recordUpdateRequirement(
                    unitName,
                    stillNeeded,
                    'legacy-update-table'
                );
'''
    legacy_record_replacement = '''                if (missingOnMissionTable) {
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
    source = replace_once(
        source,
        legacy_record_anchor,
        legacy_record_replacement,
        'legacy table current-selection target'
    )"""

late_old = "source = replace_once(source, late_refresh_anchor, late_refresh_replacement, 'late mission update refresh')"
late_new = r"""if late_refresh_anchor in source:
    source = replace_once(source, late_refresh_anchor, late_refresh_replacement, 'late mission update refresh')
else:
    late_refresh_spaced_anchor = '''            if (refreshedExplicitMissingRows.length > 0) {
                currentUpdateRows =
                    refreshedUpdateRows;

                explicitMissingRows =
                    refreshedExplicitMissingRows;

                useExplicitMissingRequirements =
                    true;
            }
'''
    source = replace_once(
        source,
        late_refresh_spaced_anchor,
        late_refresh_replacement,
        'late mission update refresh with source spacing'
    )"""

for old, new, label in [
    (legacy_old, legacy_new, 'legacy repair'),
    (late_old, late_new, 'late refresh repair'),
]:
    if text.count(old) != 1:
        raise SystemExit(f'{label} anchor count={text.count(old)}')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('Hardened v1.0.60 patcher anchors.')
