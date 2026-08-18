#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/check-activity-recorder-v119.mjs')
text = path.read_text()
old = '''expect(!source.includes("addEventListener('mousemove'"), 'mousemove noise must not be recorded');
expect(!source.includes("addEventListener('input'"), 'raw text input events must not be recorded');'''
new = '''const recorderStart = source.indexOf('let mfMissionActivityRecorderInstalled');
const recorderEnd = source.indexOf('    function queueMissionLoggerEvent', recorderStart);
const recorder = source.slice(recorderStart, recorderEnd);
expect(recorderStart >= 0 && recorderEnd > recorderStart, 'Activity recorder block must be isolatable');
expect(!recorder.includes("addEventListener('mousemove'"), 'mousemove noise must not be recorded by the activity recorder');
expect(!recorder.includes("addEventListener('input'"), 'raw text input events must not be recorded by the activity recorder');'''
if text.count(old) != 1:
    raise SystemExit('activity noise regression anchor mismatch')
text = text.replace(old, new, 1)

old_gate = "expect(source.includes('if (!isMissionActivityBackendReady())'), 'Activity must stay gated until v2 backend acknowledgement');"
new_gate = "expect(recorder.includes('!isMissionActivityBackendReady()'), 'Activity must stay gated until v2 backend acknowledgement');"
if text.count(old_gate) != 1:
    raise SystemExit('activity capability gate regression anchor mismatch')
text = text.replace(old_gate, new_gate, 1)

path.write_text(text)
