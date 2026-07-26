from pathlib import Path

path = Path('.diagnostics/apply-auto-prisoner-cell.py')
text = path.read_text(encoding='utf-8')

old = '''auto_anchor = dedent(
    \'\'\'            const autoCycleMissionId =
                getCurrentMissionIdForQueueRestart();

            clearAutoSelectionMissionGuard(
\'\'\'
)
auto_replacement = dedent(
    \'\'\'            const autoCycleMissionId =
                getCurrentMissionIdForQueueRestart();

            const prisonerCellGate =
                await handleAutoPrisonerCellBeforeUnitFinder();

            if (prisonerCellGate !== \'none\') {
                clearAutoSelectionMissionGuard(
                    \'prisoner cell handoff before Unit Finder\'
                );
                resetVehicleLoadState();
                changeDispatchBoxColor(false);

                if (prisonerCellGate === \'stuck\') {
                    stopAutoMode(
                        \'Auto stopped: prisoners require a cell, but no active available destination could be completed. Unit Finder was not started.\'
                    );
                    break;
                }

                await wait(
                    prisonerCellGate === \'waiting\'
                        ? 500
                        : 850
                );
                continue;
            }

            clearAutoSelectionMissionGuard(
\'\'\'
)
'''

new = '''auto_anchor = (
    "            const autoCycleMissionId =\\n"
    "                getCurrentMissionIdForQueueRestart();\\n"
    "\\n"
    "            clearAutoSelectionMissionGuard(\\n"
)
auto_replacement = (
    "            const autoCycleMissionId =\\n"
    "                getCurrentMissionIdForQueueRestart();\\n"
    "\\n"
    "            const prisonerCellGate =\\n"
    "                await handleAutoPrisonerCellBeforeUnitFinder();\\n"
    "\\n"
    "            if (prisonerCellGate !== 'none') {\\n"
    "                clearAutoSelectionMissionGuard(\\n"
    "                    'prisoner cell handoff before Unit Finder'\\n"
    "                );\\n"
    "                resetVehicleLoadState();\\n"
    "                changeDispatchBoxColor(false);\\n"
    "\\n"
    "                if (prisonerCellGate === 'stuck') {\\n"
    "                    stopAutoMode(\\n"
    "                        'Auto stopped: prisoners require a cell, but no active available destination could be completed. Unit Finder was not started.'\\n"
    "                    );\\n"
    "                    break;\\n"
    "                }\\n"
    "\\n"
    "                await wait(\\n"
    "                    prisonerCellGate === 'waiting'\\n"
    "                        ? 500\\n"
    "                        : 850\\n"
    "                );\\n"
    "                continue;\\n"
    "            }\\n"
    "\\n"
    "            clearAutoSelectionMissionGuard(\\n"
)
'''

if text.count(old) != 1:
    raise SystemExit(f'Expected one broken Auto Mode anchor block; found {text.count(old)}')

path.write_text(text.replace(old, new, 1), encoding='utf-8')
