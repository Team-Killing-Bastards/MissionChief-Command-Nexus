#!/usr/bin/env python3
from pathlib import Path

# Repair the temporary patcher and its regression before applying the product diff.
patcher = Path(__file__).with_name('apply-mission-update-single-pass-v1061.py')
text = patcher.read_text(encoding='utf-8')
old = "combined = replace_once(combined, route_state_anchor, route_state_replacement, 'selection route receipt')"
new = '''route_state_index = combined.rfind(route_state_anchor)
if route_state_index < 0:
    raise SystemExit('selection route receipt: final mission guard not found')
combined = (
    combined[:route_state_index] +
    route_state_replacement +
    combined[route_state_index + len(route_state_anchor):]
)'''
if text.count(old) != 1:
    raise SystemExit(f'repair anchor count={text.count(old)}')
text = text.replace(old, new, 1)
old_boundary = "'\\n    function getCurrentAutoDispatchSelectionState()',"
new_boundary = "'\\n    function suspendMissionFinderRuntimeForPageHide(',"
if text.count(old_boundary) != 1:
    raise SystemExit(f'patcher boundary count={text.count(old_boundary)}')
patcher.write_text(text.replace(old_boundary, new_boundary, 1), encoding='utf-8')

regression = Path(__file__).with_name('check-mission-update-single-pass.mjs')
regression_text = regression.read_text(encoding='utf-8')
old_test_boundary = "'\\n    function getCurrentAutoDispatchSelectionState()',"
new_test_boundary = "'\\n    function suspendMissionFinderRuntimeForPageHide(',"
if regression_text.count(old_test_boundary) != 1:
    raise SystemExit(f'regression boundary count={regression_text.count(old_test_boundary)}')
regression.write_text(
    regression_text.replace(old_test_boundary, new_test_boundary, 1),
    encoding='utf-8'
)

print('Narrowed route receipt and switched Auto Mode slicing to the stable runtime boundary.')
