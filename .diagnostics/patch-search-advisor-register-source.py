#!/usr/bin/env python3
from pathlib import Path

path = Path('src/missionchief-command-nexus.user.js')
text = path.read_text(encoding='utf-8')


def once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    text = text.replace(old, new, 1)


once('// @version      1.0.48', '// @version      1.0.49', 'userscript version')
once("const PERSONNEL_VERSION = '1.3.5';", "const PERSONNEL_VERSION = '1.3.6';", 'personnel version')
once(' * MODULE 2: MISSION FINDER V10.6.112', ' * MODULE 2: MISSION FINDER V10.6.113', 'Mission Finder version')
once(
    "source: 'personnel-register-exact-all-vehicle-scan-v1',",
    "source: 'personnel-register-exact-all-vehicle-scan-v2',",
    'exact register source version'
)

old_parser = '''    function parseTrainingCodes(row) {
        const raw = row?.getAttribute('data-filterable-by') ||
            row?.querySelector?.('[data-filterable-by]')?.getAttribute('data-filterable-by') ||
            '[]';
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(String) : [];
        } catch (_error) {
            return String(raw)
                .replace(/[\\[\\]"']/g, '')
                .split(',')
                .map(value => value.trim())
                .filter(Boolean);
        }
    }

'''
new_parser = '''    function parseTrainingCodes(row) {
        const raw = row?.getAttribute('data-filterable-by') ||
            row?.querySelector?.('[data-filterable-by]')?.getAttribute('data-filterable-by') ||
            '[]';
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed)
                ? Array.from(new Set(parsed.map(String).filter(Boolean)))
                : [];
        } catch (_error) {
            const rawText = String(raw || '');
            const quotedCodes = Array.from(
                rawText.matchAll(/["']([^"']+)["']/g),
                match => String(match[1] || '').trim()
            ).filter(Boolean);

            if (quotedCodes.length) {
                return Array.from(new Set(quotedCodes));
            }

            return Array.from(new Set(
                rawText
                    .replace(/[\\[\\]]/g, ' ')
                    .split(/[\\s,]+/)
                    .map(value => value.replace(/^["']|["']$/g, '').trim())
                    .filter(Boolean)
            ));
        }
    }

    function getStationPersonnelRowId(row) {
        if (!row) return '';

        const candidates = [
            row.getAttribute?.('personal_id'),
            row.getAttribute?.('data-personal-id'),
            row.id?.match(/personal_(\\d+)/)?.[1],
            row.querySelector?.('input.personal-delete-checkbox[value]')?.value,
            row.querySelector?.('input.personal-delete-checkbox[value]')?.getAttribute?.('value'),
            row.querySelector?.('a[href^="/personals/"]')?.getAttribute?.('href')?.match(/\\/personals\\/(\\d+)/)?.[1]
        ];

        return String(
            candidates.find(value => /^\\d+$/.test(String(value || '').trim())) ||
            ''
        );
    }

    function getUniquePersonnelVehicleNameIndex(vehicles) {
        const index = new Map();

        (Array.isArray(vehicles) ? vehicles : []).forEach(vehicle => {
            const key = normalizePersonnelVehicleName(vehicle?.name || '');
            if (!key || !vehicle?.vehicleId) return;

            if (index.has(key)) {
                index.set(key, null);
                return;
            }

            index.set(key, vehicle);
        });

        return index;
    }

    function parseStationPersonnelAssignmentEvidence(doc, vehicles) {
        if (!doc?.querySelectorAll) return [];

        const vehicleNameIndex =
            getUniquePersonnelVehicleNameIndex(vehicles);

        return Array.from(
            doc.querySelectorAll('#personal_table tbody tr')
        ).map(row => {
            const cells = Array.from(row.children || []);
            const hasDeleteCheckbox = !!row.querySelector?.(
                'input.personal-delete-checkbox'
            );
            const nameIndex = hasDeleteCheckbox ? 1 : 0;
            const trainingIndex = nameIndex + 1;
            const assignedVehicleIndex = nameIndex + 2;
            const statusIndex = nameIndex + 3;
            const assignedVehicleCell = cells[assignedVehicleIndex] || null;
            const assignedVehicleLink = assignedVehicleCell?.querySelector?.(
                'a[href^="/vehicles/"]'
            ) || null;
            const linkedVehicleId = getVehicleIdFromHref(
                assignedVehicleLink?.getAttribute?.('href') || ''
            );
            const assignedVehicleName = cleanText(
                assignedVehicleLink?.textContent ||
                assignedVehicleCell?.textContent ||
                ''
            );
            const matchedVehicle = linkedVehicleId
                ? null
                : vehicleNameIndex.get(
                    normalizePersonnelVehicleName(assignedVehicleName)
                );
            const assignedVehicleId = String(
                linkedVehicleId ||
                matchedVehicle?.vehicleId ||
                ''
            );
            const statusText = cleanText(
                cells[statusIndex]?.textContent || ''
            );

            return {
                personnelId: getStationPersonnelRowId(row),
                name: cleanText(cells[nameIndex]?.textContent || ''),
                trainingText: cleanText(cells[trainingIndex]?.textContent || ''),
                trainingCodes: parseTrainingCodes(row),
                assignedHere: false,
                assignedVehicleId,
                assignedVehicleName,
                available: /\\bavailable\\b/i.test(statusText),
                assignedElsewhere: false,
                displayedVehicleId: assignedVehicleId,
                assignHref: '',
                stationAssignmentEvidence: true
            };
        }).filter(person => {
            return !!(
                person.personnelId &&
                person.assignedVehicleId
            );
        });
    }

'''
once(old_parser, new_parser, 'training and station assignment parsers')

old_merge = '''                    const mergedPersonnel = new Map();
                    const verifiedVehicles = [];
'''
new_merge = '''                    const stationPersonnelEvidence =
                        parseStationPersonnelAssignmentEvidence(
                            stationPage.doc,
                            vehicles
                        );
                    const mergedPersonnel = new Map(
                        stationPersonnelEvidence.map(person => [
                            String(person.personnelId),
                            person
                        ])
                    );
                    const verifiedVehicles = [];

                    if (stationPersonnelEvidence.length) {
                        personnelLog(
                            `Station personnel table supplied ${stationPersonnelEvidence.length} exact assigned-person fallback record(s).`,
                            'debug'
                        );
                    }
'''
once(old_merge, new_merge, 'station personnel evidence merge')

once(
    "                'Only personnel already assigned to each exact vehicle were recorded.',",
    "                'Only personnel already assigned to each exact vehicle were recorded.',\n                'Vehicle pages remain authoritative; uniquely matched station-table assignments fill current MissionChief control-markup gaps.',",
    'register summary evidence note'
)

once(
    '// V10.6.110: Search Advisor requirements use verified assigned training',
    '// V10.6.113: Search Advisor requirements use verified assigned training',
    'Search Advisor comment version'
)

path.write_text(text, encoding='utf-8')
