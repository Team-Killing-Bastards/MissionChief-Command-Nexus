#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const backend = await readFile('integrations/google-apps-script/Code.gs', 'utf8');
function fail(message) { console.error(`ERROR: ${message}`); process.exit(1); }
function expect(condition, message) { if (!condition) fail(message); }
function must(text, token, label) { expect(text.includes(token), `Missing ${label}: ${token}`); }

for (const [token, label] of [
  ["'mf_mission_activity_backend_v2'", 'backend capability gate'],
  ["'mf_mission_activity_session_v2'", 'session storage'],
  ['MF_MISSION_ACTIVITY_SCHEMA_VERSION = 2', 'activity schema'],
  ["querySelector('#navbar_profile_link')", 'navbar identity'],
  ["/^\\/profile\\/(\\d+)\\/?$/", 'strict numeric profile path'],
  ["eventType: 'activity'", 'dedicated activity event'],
  ["['click','dblclick','contextmenu','change','submit','focusin','focusout','dragstart','drop','keydown']", 'interaction coverage'],
  ["'NETWORK', 'FETCH'", 'fetch coverage'],
  ["'NETWORK', 'XHR'", 'XHR coverage'],
  ["'NAVIGATION', method.toUpperCase()", 'history coverage'],
  ["'UNHANDLED_REJECTION'", 'runtime rejection coverage'],
  ['installMissionActivityFrame', 'same-origin iframe coverage'],
  ['installMissionActivityRecorder();', 'recorder installation'],
]) must(source, token, label);

const recorderStart = source.indexOf('let mfMissionActivityRecorderInstalled');
const recorderEnd = source.indexOf('    function queueMissionLoggerEvent', recorderStart);
const recorder = source.slice(recorderStart, recorderEnd);
expect(recorderStart >= 0 && recorderEnd > recorderStart, 'Activity recorder block must be isolatable');
expect(!recorder.includes("addEventListener('mousemove'"), 'mousemove noise must not be recorded by the activity recorder');
expect(!recorder.includes("addEventListener('input'"), 'raw text input events must not be recorded by the activity recorder');
expect(source.includes('/password|passwd|token|cookie|authorization|secret|clipboard|requestbody|body|value|enteredtext/i'), 'sensitive payload keys must be excluded');
expect(recorder.includes('!isMissionActivityBackendReady()'), 'Activity must stay gated until v2 backend acknowledgement');

for (const [token, label] of [
  ["name: 'Activity Log'", 'Activity Log sheet'],
  ["name: 'Sessions'", 'Sessions sheet'],
  ["name: 'Action Summary'", 'Action Summary sheet'],
  ["'batch_id'", 'activity batch trace'],
  ['prepareLoggerActivityRows_', 'activity row preparation'],
  ['appendLoggerActivityRows_', 'idempotent activity append'],
  ['upsertLoggerSessions_', 'session rollup'],
  ['rebuildLoggerActionSummary_', 'action summary rebuild'],
  ["['activity', MC_LOGGER_SHEETS.activity]", 'weekly activity archive'],
  ["['sessions', MC_LOGGER_SHEETS.sessions]", 'weekly session archive'],
  ["['actionSummary', MC_LOGGER_SHEETS.actionSummary]", 'weekly action summary archive'],
  [".onWeekDay(ScriptApp.WeekDay.MONDAY)", 'Monday rollover'],
  [".atHour(3)", '03:15 rollover hour'],
  [".nearMinute(15)", '03:15 rollover minute'],
  ['activityLog: rowsForBackupDay_', 'daily raw activity backup'],
  ["'NAVBAR_PROFILE_ID_AND_USERNAME'", 'numeric profile identity mode'],
]) must(backend, token, label);

const verifyAt = backend.indexOf('verifyLoggerArchiveContext_(context);');
const deleteAt = backend.indexOf('deleteLoggerRowsByNumber_(sheet, deletions[definitionKey])');
expect(verifyAt >= 0 && deleteAt > verifyAt, 'Archive verification must remain before every live purge');
expect(backend.includes("status = purge ? 'VERIFIED_PENDING_PURGE'"), 'Verified pending-purge state must remain');
expect(backend.includes("'VERIFIED_PURGED'"), 'Verified purged state must remain');
console.log('v1.1.9 comprehensive activity recorder regression passed.');
