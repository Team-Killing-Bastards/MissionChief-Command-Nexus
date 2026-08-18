#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const backend = await readFile('integrations/google-apps-script/Code.gs', 'utf8');
function fail(message) { console.error(`ERROR: ${message}`); process.exit(1); }
function expect(condition, message) { if (!condition) fail(message); }

expect(source.includes("querySelector('#navbar_profile_link')"), 'Navbar profile link must be authoritative');
expect(source.includes("/^\\/profile\\/(\\d+)\\/?$/"), 'Profile href must resolve an exact numeric MissionChief ID');
expect(source.includes('MissionChief user (detected automatically)'), 'Logger setup must show automatic user detection');
expect(source.includes('readonly'), 'Detected MissionChief user must not be manually selectable');
expect(source.includes('profileId: identity.playerId'), 'Upload must send stable numeric profile ID');
expect(source.includes('username: identity.playerName'), 'Upload must send current navbar username');
expect(source.includes('identity.legacyPlayerName ||'), 'Old backend compatibility alias must remain during rollout');
expect(source.includes('Forget setup'), 'Local logger reset must remain');
expect(!source.includes('Pair this browser'), 'Legacy pairing UI must remain absent');
expect(!source.includes('One-time pairing code'), 'Legacy pairing input must remain absent');
expect(!source.includes('MF_MISSION_LOGGER_DEFAULT_ENDPOINT'), 'Private deployment URL must never be committed');
expect(!/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/.test(source), 'No live Apps Script URL may be embedded');

expect(backend.includes('resolveOrCreateMissionChiefNavbarProfile_'), 'Backend must resolve/create numeric navbar identities');
expect(backend.includes("/^\\d{1,20}$/"), 'Backend profile IDs must be strictly numeric');
expect(backend.includes("'Auto-created from #navbar_profile_link'"), 'New navbar users must be auditable');
expect(backend.includes("'PAIRING_DISABLED'"), 'Legacy pair/revoke actions must remain disabled');
const uploadStart = backend.indexOf('function handleLoggerUpload_(payload)');
const uploadEnd = backend.indexOf('\nfunction ', uploadStart + 'function handleLoggerUpload_(payload)'.length);
const uploadHandler = backend.slice(uploadStart, uploadEnd);
expect(uploadStart >= 0 && uploadEnd > uploadStart, 'Private upload handler must be isolatable');
expect(!uploadHandler.includes('payload.token'), 'Private upload handler must not require upload tokens');
expect(backend.includes("buildId: '1.1.10-upload-lock-hotfix-1'"), 'Activity backend build marker must be current');
console.log('Private URL + automatic MissionChief profile regression passed.');
