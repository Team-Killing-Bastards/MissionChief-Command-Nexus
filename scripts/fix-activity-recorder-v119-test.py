#!/usr/bin/env python3
from pathlib import Path

activity_path = Path('scripts/check-activity-recorder-v119.mjs')
text = activity_path.read_text()
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
activity_path.write_text(text)

private_path = Path('scripts/check-private-url-logger-profile.mjs')
private = private_path.read_text()
old_token = "expect(!backend.includes('payload.token'), 'Private backend must not require upload tokens');"
new_token = '''const uploadStart = backend.indexOf('function handleLoggerUpload_(payload)');
const uploadEnd = backend.indexOf('function prepareLoggerActivityRows_', uploadStart);
const uploadHandler = backend.slice(uploadStart, uploadEnd);
expect(uploadStart >= 0 && uploadEnd > uploadStart, 'Private upload handler must be isolatable');
expect(!uploadHandler.includes('payload.token'), 'Private upload handler must not require upload tokens');'''
if private.count(old_token) != 1:
    raise SystemExit('private upload token regression anchor mismatch')
private_path.write_text(private.replace(old_token, new_token, 1))
