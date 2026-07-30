#!/usr/bin/env python3
from pathlib import Path

# Retry marker: target only the final pre-selection mission-change guard.
path = Path(__file__).with_name('apply-mission-update-single-pass-v1061.py')
text = path.read_text(encoding='utf-8')
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
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Narrowed v1.0.61 route receipt to final pre-selection mission guard.')
