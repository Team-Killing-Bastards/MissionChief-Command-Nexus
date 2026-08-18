#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);
const backend = await readFile(
  'integrations/google-apps-script/Code.gs',
  'utf8'
);
const manifest = await readFile(
  'integrations/google-apps-script/appsscript.json',
  'utf8'
);

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function requireText(text, token, label) {
  if (!text.includes(token)) fail(`Missing mission logger contract: ${label}`);
}

function extractFunction(text, name) {
  const marker = `function ${name}(`;
  const start = text.indexOf(marker);
  if (start < 0) fail(`Missing function ${name}`);
  const parameterStart = text.indexOf('(', start);
  let parameterDepth = 0;
  let bodyStart = -1;
  let quote = '';
  let escaped = false;

  for (let index = parameterStart; index < text.length; index += 1) {
    const character = text[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(') parameterDepth += 1;
    if (character === ')') {
      parameterDepth -= 1;
      if (parameterDepth === 0) {
        bodyStart = text.indexOf('{', index);
        break;
      }
    }
  }

  if (bodyStart < 0) fail(`Missing body for ${name}`);

  let depth = 0;
  quote = '';
  escaped = false;

  for (let index = bodyStart; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1] || '';

    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '/' && next === '/') {
      const end = text.indexOf('\n', index + 2);
      index = end < 0 ? text.length : end;
      continue;
    }
    if (character === '/' && next === '*') {
      const end = text.indexOf('*/', index + 2);
      if (end < 0) fail(`Unclosed comment in ${name}`);
      index = end + 1;
      continue;
    }

    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  fail(`Unable to isolate ${name}`);
}

const commandVersion = source.match(/^\/\/\s+@version\s+(\S+)\s*$/m)?.[1];
const loggerClientVersion = source.match(
  /const MF_MISSION_LOGGER_CLIENT_VERSION = '([^']+)';/
)?.[1];
const missionFinderVersion = source.match(
  /MODULE 2: MISSION FINDER V(\d+(?:\.\d+){2})/
)?.[1];
const loggerMissionFinderVersion = source.match(
  /const MF_MISSION_LOGGER_MISSION_FINDER_VERSION =\s*'([^']+)';/
)?.[1];
expect(loggerClientVersion === commandVersion, 'Logger client version must follow the canonical userscript version');
expect(loggerMissionFinderVersion === missionFinderVersion, 'Logged Mission Finder version must follow the canonical component version');

requireText(source, '// @grant        none', 'existing no-grant permission model');
requireText(source, "'mf_mission_logger_enabled_v1'", 'opt-in setting');
requireText(source, '5 * 60 * 1000', 'five-minute upload interval');
requireText(source, 'MF_MISSION_LOGGER_MAX_QUEUE_EVENTS = 300', 'hard event bound');
requireText(source, 'MF_MISSION_LOGGER_MAX_QUEUE_CHARS = 3000000', 'hard byte bound');
requireText(source, 'MF_MISSION_LOGGER_BATCH_SIZE = 40', 'bounded batch size');
requireText(source, 'MF_MISSION_LOGGER_DISPATCH_DEDUPE_MS =\n        15000', '15-second dispatch retry guard');
requireText(source, "'mf_mission_logger_last_dispatch_v1'", 'persistent dispatch retry guard');
requireText(
  source,
  "const MF_MISSION_LOGGER_DEFAULT_ENDPOINT =\n        'https://script.google.com/macros/s/",
  'built-in deployed Apps Script endpoint'
);
requireText(source, 'Mission Analytics Logger', 'settings surface');
requireText(source, 'Pair this browser', 'one-time pairing control');
requireText(source, 'Queued events:', 'visible outbox status');
requireText(source, 'Last upload:', 'visible upload status');
requireText(source, 'exact transaction matching active', 'visible exact-credit status');
requireText(source, 'offline completion', 'visible offline-recovery status');
requireText(source, "'/credits'", 'same-origin MissionChief Credits ledger');
requireText(source, 'Passwords, cookies and personnel names are never collected.', 'privacy disclosure');

const endpoint = extractFunction(source, 'normaliseMissionLoggerEndpoint');
expect(endpoint.includes("url.hostname === 'script.google.com'"), 'Endpoint must be restricted to Google Apps Script');
expect(endpoint.includes('macros\\/s'), 'Endpoint must require the deployed Apps Script route');
expect(!endpoint.includes('http:'), 'Insecure logger endpoints must remain blocked');

const queueBound = extractFunction(source, 'boundMissionLoggerQueue');
expect(queueBound.includes('MF_MISSION_LOGGER_MAX_QUEUE_EVENTS'), 'Queue must enforce the entry bound');
expect(queueBound.includes('MF_MISSION_LOGGER_MAX_QUEUE_CHARS'), 'Queue must enforce the storage-size bound');
expect(queueBound.includes('queue.shift()'), 'Queue overflow must drop oldest events first');

const transport = extractFunction(source, 'submitMissionLoggerRequest');
for (const token of [
  "form.method = 'POST'",
  'form.target = frameName',
  'application/x-www-form-urlencoded',
  'reply_origin: window.location.origin',
  'form.submit()',
  'MF_MISSION_LOGGER_REQUEST_TIMEOUT_MS',
]) {
  expect(transport.includes(token), `No-grant transport missing ${token}`);
}

const messageHandler = extractFunction(source, 'installMissionLoggerMessageHandler');
expect(messageHandler.includes('isTrustedMissionLoggerResponseOrigin('), 'Pair/upload responses must enforce trusted Google origins');
expect(messageHandler.includes('data.requestId'), 'Pair/upload responses must be nonce-bound');
expect(messageHandler.includes('MF_MISSION_LOGGER_MESSAGE_SOURCE'), 'Pair/upload responses must carry the logger source marker');
expect(messageHandler.includes('isMissionLoggerResponseWindow('), 'Pair/upload responses must come from the request iframe tree');

const responseWindow = extractFunction(source, 'isMissionLoggerResponseWindow');
expect(responseWindow.includes('frame?.contentWindow'), 'Response-window validation must anchor on the exact request iframe');
expect(responseWindow.includes('currentWindow.parent'), 'Response-window validation must support nested Google sandbox frames');
expect(responseWindow.includes('currentWindow === expectedWindow'), 'Response-window validation must reach the exact request iframe');
expect(responseWindow.includes('depth < 6'), 'Response-window validation must keep parent traversal bounded');

const pair = extractFunction(source, 'pairMissionLoggerBrowser');
for (const token of [
  "submitMissionLoggerRequest(\n            'pair'",
  'writeMissionLoggerIdentity({',
  'playerId:',
  'deviceId,',
  'token:',
  'recordMissionLoggerObservedEvent()',
]) {
  expect(pair.includes(token), `Pairing flow missing ${token}`);
}

const sync = extractFunction(source, 'syncMissionLoggerNow');
for (const token of [
  'reconcileMissionLoggerCreditTransactions({',
  'acquireMissionLoggerSyncLock()',
  'readMissionLoggerPendingBatch()',
  'writeMissionLoggerPendingBatch(pending)',
  "submitMissionLoggerRequest(\n                'upload'",
  'writeMissionLoggerPendingBatch(null)',
  'releaseMissionLoggerSyncLock(lockOwner)',
]) {
  expect(sync.includes(token), `Idempotent uploader missing ${token}`);
}

const syncTimer = extractFunction(source, 'startMissionLoggerSyncTimer');
expect(
  syncTimer.indexOf('mfMissionLoggerInitialSyncTimer ||') <
    syncTimer.indexOf('setTimeout('),
  'Storage updates must not postpone an already scheduled logger sync'
);
expect(
  syncTimer.includes('MF_MISSION_LOGGER_SYNC_INTERVAL_MS - elapsed'),
  'Logger restart must preserve the five-minute upload cadence'
);

const eventBuilder = extractFunction(source, 'createMissionLoggerEvent');
for (const token of [
  'missionId:',
  'missionDefinitionId:',
  'missionName:',
  'ownership:',
  'dispatchMode:',
  'advertisedCredits:',
  'actualCredits:',
  'patientCount,',
  'requirements:',
  'units:',
]) {
  expect(eventBuilder.includes(token), `Mission event schema missing ${token}`);
}
expect(
  eventBuilder.includes('options.actualCredits'),
  'Mission completion payloads must be able to supply verified actual credits'
);

const creditParser = extractFunction(source, 'parseCreditValueFromText');
const definitionCreditParser = extractFunction(
  source,
  'extractMissionAdvertisedCreditsFromDocument'
);
const trimLoggerText = extractFunction(
  source,
  'trimMissionLoggerText'
);
const definitionGeneratorParser = extractFunction(
  source,
  'extractMissionGeneratorFromDocument'
);
const readCreditValue = Function(
  `"use strict"; ${creditParser}; return parseCreditValueFromText;`
)();
const readDefinitionCredits = Function(
  `"use strict"; ${creditParser}; ${definitionCreditParser}; return extractMissionAdvertisedCreditsFromDocument;`
)();
expect(readCreditValue('Average credits: 19,200') === 19200, 'Average-credit text must parse UK comma formatting');
const creditRow = {
  querySelectorAll(selector) {
    return selector === 'td, th'
      ? [
          { textContent: 'Average credits' },
          { textContent: '19,200' },
        ]
      : [];
  },
};
const creditDocument = {
  body: { textContent: '' },
  querySelectorAll(selector) {
    if (selector === 'table tbody tr, table tr') return [creditRow];
    return [];
  },
};
expect(readDefinitionCredits(creditDocument) === 19200, 'Mission-definition Average credits row must feed the logger');

const readDefinitionGenerator = Function(
  `"use strict"; ${trimLoggerText}; ${definitionGeneratorParser}; return extractMissionGeneratorFromDocument;`
)();
const generatorValueCell = {
  textContent: 'Fire Station',
  getAttribute() { return ''; },
  querySelector() { return null; },
};
const generatorRow = {
  querySelectorAll(selector) {
    return selector === 'td, th'
      ? [
          { textContent: 'Generated by' },
          generatorValueCell,
        ]
      : [];
  },
};
const generatorDocument = {
  querySelector() { return null; },
  querySelectorAll(selector) {
    if (selector === 'table tbody tr, table tr') return [generatorRow];
    return [];
  },
};
expect(
  readDefinitionGenerator(generatorDocument).stationName === 'Fire Station',
  'Mission-definition Generated by row must feed generator metadata'
);

const creditCache = extractFunction(source, 'setCachedMissionRequirementRows');
expect(creditCache.includes('rows?.advertisedCredits'), 'Fetched mission-definition credits must enter the mission cache');
expect(creditCache.includes('enrichMissionLoggerQueuedEventsFromCurrentMission()'), 'Fetched credits must enrich already-queued current-mission events');

const queueEnrichment = extractFunction(source, 'enrichMissionLoggerQueuedEventsFromCurrentMission');
expect(queueEnrichment.includes('advertisedCredits'), 'Queued current-mission events must receive advertised credits');
expect(queueEnrichment.includes('requirements.length > 0'), 'Queued early observations must receive fetched requirements');
expect(queueEnrichment.includes("setIfMissing('missionUrl', missionUrl)"), 'Queued events must receive a canonical mission URL');
expect(queueEnrichment.includes("'generatorStationName'"), 'Queued events must receive available generator data');
expect(queueEnrichment.includes('findPatientCount(true)'), 'Queued events must refresh live patient counts');
expect(queueEnrichment.includes('writeMissionLoggerQueue(enriched)'), 'Credit enrichment must persist before upload');

expect(sync.includes('await preloadMissionRequiredPersonnel()'), 'Sync must await the existing mission-definition preload when credits are missing');
expect(sync.includes('enrichMissionLoggerQueuedEventsFromCurrentMission()'), 'Sync must enrich queued events before creating its batch');

const missionSnapshot = extractFunction(source, 'getMissionLoggerMissionSnapshot');
expect(missionSnapshot.includes('candidate.missions_data'), 'Mission snapshot must use MissionChief mission records when available');
expect(missionSnapshot.includes("data-sortable-by"), 'Mission snapshot must fall back to MissionChief mission-list data');
expect(missionSnapshot.includes('possible_patients_count'), 'Mission snapshot must preserve possible-patient context');
expect(missionSnapshot.includes('prisoners_count'), 'Mission snapshot must preserve current prisoner count');

const dispatchCapture = [
  'resolveMissionLoggerDispatchOptions',
  'prepareMissionLoggerDispatchSnapshot',
  'recordPreparedMissionLoggerDispatch',
  'recordMissionLoggerDispatchFromControl',
  'clickMissionLoggerDispatchControl',
  'installMissionLoggerDispatchCapture',
].map(name => extractFunction(source, name)).join('\n');
for (const token of [
  "document.addEventListener(\n            'click'",
  'getMissionLoggerDispatchControl(event.target)',
  "'ally-steal'",
  "'auto-share'",
  "'auto-not-ready'",
  "'manual-share'",
  'getMissionLoggerSelectedUnits()',
  'recordMissionLoggerDispatchEvent(',
  'createMissionLoggerDispatchFingerprint(',
  'isDuplicateMissionLoggerDispatch(',
  'dispatchFingerprint:',
]) {
  expect(dispatchCapture.includes(token), `Native dispatch capture missing ${token}`);
}

const clientFingerprint = extractFunction(
  source,
  'createMissionLoggerDispatchFingerprint'
);
expect(clientFingerprint.includes('.filter(Boolean).sort()'), 'Dispatch identity must be order-independent');

const duplicateDispatch = extractFunction(
  source,
  'isDuplicateMissionLoggerDispatch'
);
expect(duplicateDispatch.includes('MF_MISSION_LOGGER_LAST_DISPATCH_KEY'), 'Dispatch retry guard must persist across page contexts');
expect(duplicateDispatch.includes('MF_MISSION_LOGGER_DISPATCH_DEDUPE_MS'), 'Dispatch retry guard must use the shared 15-second window');

const missionRegistry = extractFunction(
  source,
  'rememberMissionLoggerEvent'
);
expect(missionRegistry.includes("eventType === 'dispatch'"), 'Mission registry must record dispatch timing');
expect(missionRegistry.includes('firstUnitSentAt'), 'Mission registry must retain the first-unit timestamp');
expect(missionRegistry.includes('unitCount'), 'Mission registry must retain cumulative dispatched units');

const completionCapture = extractFunction(
  source,
  'recordMissionLoggerNativeCompletion'
);
for (const token of [
  "eventType: 'mission-completed'",
  "completionSource: 'native-mission-finish'",
  'completionVerified: true',
  'firstUnitSentAt:',
  'completedAt:',
  'actualCredits: snapshot.actualCredits',
]) {
  expect(completionCapture.includes(token), `Native completion capture missing ${token}`);
}

const completionHook = extractFunction(
  source,
  'installMissionLoggerCompletionCapture'
);
expect(completionHook.includes('window.missionFinish'), 'Completion capture must wrap MissionChief\'s native finish callback');
expect(completionHook.includes('original.apply(this, args)'), 'Completion wrapper must preserve MissionChief behaviour');
expect(completionHook.includes('scheduleMissionLoggerCreditReconciliation()'), 'Native completion must schedule exact ledger reconciliation');

const ledgerAmountParser = extractFunction(
  source,
  'parseMissionLoggerCreditAmount'
);
const ledgerTimestampParser = extractFunction(
  source,
  'parseMissionLoggerCreditTimestamp'
);
const ledgerHasher = extractFunction(
  source,
  'hashMissionLoggerCreditValue'
);
const ledgerDescriptionNormaliser = extractFunction(
  source,
  'normaliseMissionLoggerCreditDescription'
);
const ledgerDocumentParser = extractFunction(
  source,
  'parseMissionLoggerCreditTransactionsFromDocument'
);
const ledgerHasActual = extractFunction(
  source,
  'missionLoggerRecordHasActualCredits'
);
const offlineCreditCandidates = extractFunction(
  source,
  'getMissionLoggerOfflineCreditCandidates'
);
const ledgerMatcher = extractFunction(
  source,
  'findMissionLoggerCreditMatch'
);
const ledgerRuntime = Function(
  `"use strict";
   const MF_MISSION_LOGGER_CREDIT_MATCH_WINDOW_MS = 120000;
   ${trimLoggerText}
   ${ledgerAmountParser}
   ${ledgerTimestampParser}
   ${ledgerHasher}
   ${ledgerDescriptionNormaliser}
   ${ledgerDocumentParser}
   ${ledgerHasActual}
   ${offlineCreditCandidates}
   ${ledgerMatcher}
   return {
     amount: parseMissionLoggerCreditAmount,
     timestamp: parseMissionLoggerCreditTimestamp,
     normalise: normaliseMissionLoggerCreditDescription,
     parse: parseMissionLoggerCreditTransactionsFromDocument,
     offlineCandidates: getMissionLoggerOfflineCreditCandidates,
     match: findMissionLoggerCreditMatch
   };`
)();

expect(ledgerRuntime.amount('+1,234 credits') === 1234, 'Credits ledger must parse a positive UK-formatted award');
expect(ledgerRuntime.amount('-250 credits') === -250, 'Credits ledger must preserve signed expenses');
expect(ledgerRuntime.amount('−250 credits') === -250, 'Credits ledger must preserve Unicode-minus expenses');
expect(
  ledgerRuntime.timestamp('1723810503') === '2024-08-16T12:15:03.000Z',
  'Credits ledger must parse MissionChief Unix timestamps'
);
expect(
  ledgerRuntime.normalise('[Alliance] Warehouse Fire (Fire Alarm System) - False Alarm') === 'warehouse fire',
  'Credits ledger titles must normalise MissionChief alliance and alarm decorations'
);

function fakeLedgerElement(textContent, attributes = {}) {
  return {
    textContent,
    getAttribute(name) { return attributes[name] ?? ''; },
    querySelector() { return null; },
  };
}

const ledgerCells = [
  fakeLedgerElement('+1,234 credits'),
  fakeLedgerElement('Warehouse Fire'),
  fakeLedgerElement('16/08/2026 13:15', {
    'data-logged-at': '2026-08-16T12:15:03.000Z',
  }),
];
const ledgerRow = {
  getAttribute(name) {
    return {
      'data-mission-id': '123',
      'data-transaction-id': 'txn-123',
    }[name] ?? '';
  },
  querySelector() { return null; },
  querySelectorAll(selector) {
    return selector === 'td, th' ? ledgerCells : [];
  },
};
const parsedLedger = ledgerRuntime.parse({
  querySelectorAll(selector) {
    return selector === 'table tbody tr' ? [ledgerRow] : [];
  },
});
expect(parsedLedger.length === 1, 'Credits ledger must parse transaction rows');
expect(parsedLedger[0].amount === 1234, 'Parsed ledger row must retain the exact award');
expect(parsedLedger[0].missionName === 'Warehouse Fire', 'Parsed ledger row must retain the clean mission title');
expect(parsedLedger[0].missionId === '123', 'Parsed ledger row must retain an exposed mission ID');
expect(parsedLedger[0].transactionId === 'txn-123', 'Parsed ledger row must retain an exposed transaction ID');

const creditIdentity = { playerId: 'marty', deviceId: 'browser-1' };
const pendingCreditRegistry = {
  'marty|123': {
    playerId: 'marty',
    missionId: '123',
    missionName: 'Warehouse Fire',
    firstUnitSentAt: '2026-08-16T12:00:00.000Z',
    completedAt: '2026-08-16T12:15:00.000Z',
  },
};
expect(
  ledgerRuntime.match(parsedLedger[0], pendingCreditRegistry, creditIdentity)?.strategy === 'mission-id',
  'An exposed ledger mission ID plus the mission title must be the preferred exact match'
);
const offlineCreditRegistry = {
  'marty|123': {
    playerId: 'marty',
    missionId: '123',
    missionName: 'Warehouse Fire',
    firstUnitSentAt: '2026-08-16T12:00:00.000Z',
    completedAt: '',
  },
};
expect(
  ledgerRuntime.offlineCandidates(
    offlineCreditRegistry,
    creditIdentity
  ).length === 1,
  'A dispatched mission without a completion callback must enter the offline recovery pool'
);
expect(
  ledgerRuntime.match(
    parsedLedger[0],
    offlineCreditRegistry,
    creditIdentity
  ) === null,
  'Normal credit matching must not infer an offline completion without explicit recovery authority'
);
expect(
  ledgerRuntime.match(
    parsedLedger[0],
    offlineCreditRegistry,
    creditIdentity,
    { allowOfflineRecovery: true }
  )?.strategy === 'offline-mission-id',
  'Offline recovery must accept an exact mission ID plus normalized mission title after dispatch'
);
expect(
  ledgerRuntime.match(
    {
      ...parsedLedger[0],
      transactionId: 'txn-before-dispatch',
      transactionAt: '2026-08-16T11:50:00.000Z',
    },
    offlineCreditRegistry,
    creditIdentity,
    { allowOfflineRecovery: true }
  ) === null,
  'Offline recovery must reject a transaction from before the first unit was sent'
);
expect(
  ledgerRuntime.match(
    {
      ...parsedLedger[0],
      transactionId: 'txn-offline-patient',
      description: 'Patient Treatment',
      normalisedDescription: 'patient treatment',
    },
    offlineCreditRegistry,
    creditIdentity,
    { allowOfflineRecovery: true }
  ) === null,
  'Offline recovery must reject patient and other side transactions even when the mission ID is exposed'
);
expect(
  ledgerRuntime.match(
    {
      ...parsedLedger[0],
      transactionId: 'txn-offline-title-only',
      missionId: '',
    },
    offlineCreditRegistry,
    creditIdentity,
    { allowOfflineRecovery: true }
  ) === null,
  'Offline recovery must fail closed when the ledger does not expose a mission ID'
);
expect(
  ledgerRuntime.match(
    {
      ...parsedLedger[0],
      transactionId: 'txn-patient',
      description: 'Patient Treatment',
      normalisedDescription: 'patient treatment',
    },
    pendingCreditRegistry,
    creditIdentity
  ) === null,
  'A patient or other side transaction must not match on mission ID alone'
);
const titleTimeTransaction = {
  ...parsedLedger[0],
  transactionId: 'txn-title-time',
  missionId: '',
  description: '[Alliance] Warehouse Fire (Fire Alarm System)',
  normalisedDescription: 'warehouse fire',
};
expect(
  ledgerRuntime.match(titleTimeTransaction, pendingCreditRegistry, creditIdentity)?.strategy === 'unique-title-time',
  'One title inside the bounded completion window must match'
);
expect(
  ledgerRuntime.match(
    titleTimeTransaction,
    {
      ...pendingCreditRegistry,
      'marty|124': {
        ...pendingCreditRegistry['marty|123'],
        missionId: '124',
        completedAt: '2026-08-16T12:15:02.000Z',
      },
    },
    creditIdentity
  ) === null,
  'Ambiguous same-title completions must remain pending'
);
expect(
  ledgerRuntime.match(
    titleTimeTransaction,
    {
      ...pendingCreditRegistry,
      'marty|124': {
        ...pendingCreditRegistry['marty|123'],
        missionId: '124',
        completedAt: '2026-08-16T12:15:02.000Z',
        actualCredits: 900,
      },
    },
    creditIdentity
  ) === null,
  'A captured same-title completion must still keep an unlinked title/time transaction ambiguous'
);

const ledgerFetch = extractFunction(
  source,
  'fetchMissionLoggerCreditLedgerPage'
);
for (const token of [
  "'/credits'",
  "credentials: 'same-origin'",
  "cache: 'no-store'",
  'parseMissionLoggerCreditTransactionsFromDocument(',
]) {
  expect(ledgerFetch.includes(token), `Credits ledger fetch missing ${token}`);
}
const ledgerRecord = extractFunction(
  source,
  'recordMissionLoggerCreditTransaction'
);
for (const token of [
  "eventType: 'mission-credit'",
  "'missionchief-credit-ledger'",
  "'credit-ledger-offline-recovery'",
  "'offline-mission-id'",
  'creditTransactionId:',
  'creditMatchStrategy:',
  'actualCredits: amount',
]) {
  expect(ledgerRecord.includes(token), `Exact credit event missing ${token}`);
}

let recoveredCreditEvent = null;
const recordCreditRuntime = Function(
  'readMissionLoggerIdentity',
  'queueMissionLoggerEvent',
  'window',
  `"use strict";
   const MF_MISSION_LOGGER_SCHEMA_VERSION = 1;
   const MF_MISSION_LOGGER_MISSION_FINDER_VERSION = '10.7.0';
   const createMissionLoggerId = () => 'event-offline-recovered';
   ${trimLoggerText}
   ${ledgerRecord}
   return recordMissionLoggerCreditTransaction;`
)(
  () => creditIdentity,
  event => {
    recoveredCreditEvent = event;
    return true;
  },
  { location: { origin: 'https://www.missionchief.co.uk' } }
);
expect(
  recordCreditRuntime(parsedLedger[0], {
    key: 'marty|123',
    record: offlineCreditRegistry['marty|123'],
    strategy: 'offline-mission-id',
    distanceMs: 903000,
  }) === true,
  'An exact offline credit match must queue a recovered mission event'
);
expect(
  recoveredCreditEvent?.metadata?.completedAt ===
    parsedLedger[0].transactionAt,
  'Offline recovery must use the MissionChief transaction timestamp as the finish time'
);
expect(
  recoveredCreditEvent?.metadata?.completionSource ===
    'credit-ledger-offline-recovery',
  'Offline recovery must preserve an auditable completion source'
);
expect(
  recoveredCreditEvent?.metadata?.offlineRecovered === true,
  'Offline recovery must explicitly mark the delayed completion'
);
expect(
  recoveredCreditEvent?.actualCredits === parsedLedger[0].amount,
  'Offline recovery must preserve the exact awarded credits'
);

const creditReconciliation = extractFunction(
  source,
  'reconcileMissionLoggerCreditTransactions'
);
for (const token of [
  'MF_MISSION_LOGGER_CREDIT_CATCHUP_PAGES_PER_RUN',
  'offlineCreditCatchupNextPage',
  'offlineCreditCatchupFloorAt',
  'MF_MISSION_LOGGER_MAX_QUEUE_EVENTS -',
  'nextPage = page;',
  'if (scanDeferredForQueue) break;',
  'allowOfflineRecovery',
  'totalOfflineRecoveredCreditEvents',
  'lastCreditSuccessAt',
]) {
  expect(
    creditReconciliation.includes(token),
    `Offline credit reconciliation missing ${token}`
  );
}

const connectivityListener = extractFunction(
  source,
  'installMissionLoggerConnectivityListener'
);
expect(
  connectivityListener.includes("addEventListener(\n            'online'"),
  'Logger must schedule catch-up when the browser reconnects'
);
expect(
  connectivityListener.includes('reconnected: true'),
  'Reconnect sync must request the offline recovery path'
);

const registryKey = extractFunction(
  source,
  'createMissionLoggerRegistryKey'
);
const registryRead = extractFunction(
  source,
  'readMissionLoggerMissionRegistry'
);
const registryWrite = extractFunction(
  source,
  'writeMissionLoggerMissionRegistry'
);
const earlierIso = extractFunction(
  source,
  'earlierMissionLoggerIso'
);
const nativeCompletionSnapshot = extractFunction(
  source,
  'getMissionLoggerNativeCompletionSnapshot'
);
const registryValues = new Map();
const localStorageMock = {
  getItem(key) { return registryValues.has(key) ? registryValues.get(key) : null; },
  setItem(key, value) { registryValues.set(key, String(value)); },
  removeItem(key) { registryValues.delete(key); },
};
const registryRuntime = Function(
  'localStorage',
  'readMissionLoggerIdentity',
  `"use strict";
   const MF_MISSION_LOGGER_MISSION_REGISTRY_KEY = 'test-registry';
   const MF_MISSION_LOGGER_MISSION_REGISTRY_DAYS = 35;
   const MF_MISSION_LOGGER_MAX_MISSION_REGISTRY = 2000;
   ${trimLoggerText}
   ${registryKey}
   ${registryRead}
   ${registryWrite}
   ${earlierIso}
   ${missionRegistry}
   ${nativeCompletionSnapshot}
   return {
     read: readMissionLoggerMissionRegistry,
     remember: rememberMissionLoggerEvent,
     completion: getMissionLoggerNativeCompletionSnapshot
   };`
)(
  localStorageMock,
  () => ({ playerId: 'marty', deviceId: 'browser-1' })
);
const baseMissionEvent = {
  playerId: 'marty',
  deviceId: 'browser-1',
  missionId: '123',
  missionDefinitionId: '456',
  missionName: 'Registry test mission',
  missionUrl: 'https://www.missionchief.co.uk/missions/123',
  ownership: 'own',
  advertisedCredits: 1200,
  patientCount: 2,
  prisonerCount: 0,
  units: [],
  metadata: {},
};
registryRuntime.remember({
  ...baseMissionEvent,
  eventType: 'mission-observed',
  capturedAt: '2026-08-16T12:00:00.000Z',
});
registryRuntime.remember({
  ...baseMissionEvent,
  eventType: 'dispatch',
  capturedAt: '2026-08-16T12:01:00.000Z',
  dispatchMode: 'auto',
  units: [{ vehicleId: '1' }, { vehicleId: '2' }],
});
registryRuntime.remember({
  ...baseMissionEvent,
  eventType: 'dispatch',
  capturedAt: '2026-08-16T12:03:00.000Z',
  dispatchMode: 'auto',
  units: [{ vehicleId: '3' }],
});
const registryRecord = registryRuntime.read()['marty|123'];
expect(registryRecord.firstObservedAt === '2026-08-16T12:00:00.000Z', 'Mission registry must preserve first observation');
expect(registryRecord.firstUnitSentAt === '2026-08-16T12:01:00.000Z', 'Mission registry must preserve first dispatch');
expect(registryRecord.dispatchCount === 2, 'Mission registry must count multiple dispatches');
expect(registryRecord.unitCount === 3, 'Mission registry must count all selected units');
const nativeSnapshot = registryRuntime.completion([{
  id: 123,
  actual_credits: 987,
  completed_at: '2026-08-16T12:15:00.000Z',
}]);
expect(nativeSnapshot?.missionId === '123', 'Native completion must resolve the paired player mission');
expect(nativeSnapshot?.actualCredits === 987, 'Native completion must preserve an explicit actual award');
registryRuntime.remember({
  ...baseMissionEvent,
  eventType: 'mission-completed',
  capturedAt: '2026-08-16T12:15:00.000Z',
  actualCredits: 987,
  metadata: {
    completedAt: '2026-08-16T12:15:00.000Z',
    dispatchCount: 2,
    unitCount: 3,
  },
});
expect(
  registryRuntime.completion([{ id: 123 }]) === null,
  'A native completion callback must not queue the same mission twice'
);

const cleanup = extractFunction(source, 'cleanupMissionLoggerRuntime');
expect(cleanup.includes('stopMissionLoggerSyncTimer()') || cleanup.includes('suspendMissionLoggerRuntime()'), 'Logger cleanup must stop timers');
expect(cleanup.includes("removeEventListener(\n                'storage'"), 'Logger cleanup must remove its storage listener');
expect(cleanup.includes("removeEventListener(\n                'online'"), 'Logger cleanup must remove its connectivity listener');
expect(cleanup.includes("removeEventListener(\n                'message'"), 'Logger cleanup must remove its response listener');

const disconnect = extractFunction(source, 'disconnectMissionLoggerBrowser');
expect(disconnect.includes('MF_MISSION_LOGGER_QUEUE_KEY'), 'Disconnect must remove unsent events so profiles cannot inherit another player queue');
expect(disconnect.includes('MF_MISSION_LOGGER_OBSERVED_KEY'), 'Disconnect must reset player-specific mission observation state');
expect(disconnect.includes('MF_MISSION_LOGGER_MISSION_REGISTRY_KEY'), 'Disconnect must reset player-specific completion state');

const observed = extractFunction(source, 'recordMissionLoggerObservedEvent');
expect(
  observed.indexOf('const queued = queueMissionLoggerEvent(') <
    observed.indexOf('registry[key] = now'),
  'A mission must only be marked observed after its event enters the queue'
);

for (const token of [
  "pairingLifetimeHours: 24",
  "'token_hash'",
  "'code_hash'",
  'sha256_(token)',
  'sha256_(pairingCode)',
  'LockService.getScriptLock()',
  'findAllRowsByValue_(eventSheet, 2, batchId)',
  'getRowsByColumnValue_(unitSheet, 2, batchId)',
  'countLoggerRowIdentities_(prepared.unitRows, loggerUnitIdentity_)',
  'const missingUnitRows = prepared.unitRows.filter',
  "'BATCH_CONFLICT'",
  "status: missingUnitRows.length > 0 ? 'REPAIRED' : 'ACKNOWLEDGED'",
  "duplicate: true",
  'appendRows_(eventSheet, prepared.eventRows)',
  'appendRows_(unitSheet, prepared.unitRows)',
  'setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)',
  "'https://www.missionchief.co.uk'",
  "'https://police.missionchief.co.uk'",
  'createMissionChiefDailyBackup',
  'dispatchDuplicateWindowMs: 15000',
  'duplicateScanEventRows: 1000',
  'filterSemanticDuplicateDispatchRows_',
  "'ACCEPTED_DEDUPED'",
  "name: 'Mission Summary'",
  "name: 'Dashboard Data'",
  "name: 'Archive Index'",
  "name: 'Batch Ledger'",
  'installMissionChiefWeeklyArchiveTrigger',
  'testMissionChiefWeeklyArchiveCopy',
  'runMissionChiefWeeklyArchive',
  "nearMinute(15)",
  "{ purge: false, mode: 'SUNDAY_TEST' }",
  'verifyLoggerArchiveContext_',
  "'VERIFIED_PURGED'",
  'buildId: MC_LOGGER.buildId',
  "'mission-summary'",
  "'native-completion'",
  "'credit-ledger-match'",
  'response.backendBuild = MC_LOGGER.buildId',
  "['actual_credit_capture', 'LIVE_EXACT_TRANSACTION_MATCH'",
  "setNumberFormat('dd/MM/yyyy HH:mm:ss')",
]) {
  requireText(backend, token, `Google backend ${token}`);
}

expect(!backend.includes("'token',\n      'status'"), 'Raw upload tokens must never be workbook columns');
expect(!backend.includes("'pairing_code'"), 'Raw pairing codes must never be workbook columns');

const preparedRows = extractFunction(backend, 'prepareLoggerBatchRows_');
expect(preparedRows.includes('rawEvent.advertisedCredits'), 'Backend must store advertised credits');
expect(preparedRows.includes('rawEvent.actualCredits'), 'Backend must keep actual credits separate');
expect(preparedRows.includes('rawEvent.units'), 'Backend must expand selected units');
expect(preparedRows.includes('safeSheetText_('), 'Backend must block formula injection in logged text');
expect(preparedRows.includes('createLoggerDispatchFingerprint_('), 'Backend must derive its own dispatch fingerprint');

const cleanMissionUrl = extractFunction(backend, 'cleanMissionUrl_');
const readCleanMissionUrl = Function(
  'MC_LOGGER',
  `"use strict"; ${cleanMissionUrl}; return cleanMissionUrl_;`
)({
  allowedReplyOrigins: [
    'https://www.missionchief.co.uk',
    'https://police.missionchief.co.uk',
  ],
});
expect(
  readCleanMissionUrl('https://www.missionchief.co.uk/missions/12345?ignored=yes') ===
    'https://www.missionchief.co.uk/missions/12345',
  'Backend must retain and canonicalise an allowed mission URL'
);
expect(
  readCleanMissionUrl('https://example.com/missions/12345') === '',
  'Backend must reject mission URLs outside the allow-list'
);

const semanticDedupe = extractFunction(
  backend,
  'filterSemanticDuplicateDispatchRows_'
);
expect(semanticDedupe.includes('Math.abs(capturedAt - timestamp)'), 'Backend dedupe must compare capture timestamps');
expect(semanticDedupe.includes('retainedEventIds'), 'Backend dedupe must remove unit rows with suppressed events');

const backendCleanText = extractFunction(backend, 'cleanText_');
const backendCleanIdentifier = extractFunction(backend, 'cleanIdentifier_');
const backendFingerprint = extractFunction(
  backend,
  'createLoggerDispatchFingerprint_'
);
const backendReadMetadata = extractFunction(
  backend,
  'readLoggerEventMetadata_'
);
const backendDedupeRuntime = Function(
  'MC_LOGGER',
  'MC_LOGGER_SHEETS',
  `"use strict";
   ${backendCleanText}
   ${backendCleanIdentifier}
   ${backendFingerprint}
   ${backendReadMetadata}
   ${semanticDedupe}
   return {
     fingerprint: createLoggerDispatchFingerprint_,
     filter: filterSemanticDuplicateDispatchRows_
   };`
)(
  {
    dispatchDuplicateWindowMs: 15000,
    duplicateScanEventRows: 1000,
  },
  { events: { headers: Array(23).fill('') } }
);
const dispatchIdentity = backendDedupeRuntime.fingerprint(
  '123',
  'auto',
  [
    { vehicleId: '22' },
    { vehicleId: '11' },
  ]
);
const makeEventRow = (eventId, capturedAt, batchId = 'batch-new') => {
  const row = Array(23).fill('');
  row[0] = eventId;
  row[1] = batchId;
  row[2] = 'marty';
  row[3] = 'browser-1';
  row[4] = 'dispatch';
  row[5] = new Date(capturedAt);
  row[6] = '123';
  row[21] = JSON.stringify({ dispatchFingerprint: dispatchIdentity });
  return row;
};
const emptyEventSheet = {
  getLastRow() { return 1; },
  getRange() { throw new Error('Empty event sheet must not be read'); },
};
const firstCapture = makeEventRow('event-1', '2026-08-16T12:00:00.000Z');
const retryCapture = makeEventRow('event-2', '2026-08-16T12:00:03.500Z');
const dedupedBatch = backendDedupeRuntime.filter(
  emptyEventSheet,
  {
    eventRows: [firstCapture, retryCapture],
    unitRows: [
      ['event-1'],
      ['event-2'],
    ],
  },
  'batch-new'
);
expect(dedupedBatch.eventRows.length === 1, 'Backend must suppress a same-dispatch retry inside one batch');
expect(dedupedBatch.unitRows.length === 1, 'Backend must suppress the retry event unit rows');
expect(dedupedBatch.suppressedDuplicateEvents === 1, 'Backend must report its semantic suppression count');

const existingEventSheet = {
  getLastRow() { return 2; },
  getRange() {
    return { getValues() { return [firstCapture]; } };
  },
};
const laterBatchRetry = makeEventRow(
  'event-3',
  '2026-08-16T12:00:05.000Z',
  'batch-later'
);
const crossBatchDedupe = backendDedupeRuntime.filter(
  existingEventSheet,
  {
    eventRows: [laterBatchRetry],
    unitRows: [['event-3']],
  },
  'batch-later'
);
expect(crossBatchDedupe.eventRows.length === 0, 'Backend must suppress a repeated dispatch in a later batch');
expect(crossBatchDedupe.unitRows.length === 0, 'Cross-batch suppression must also remove unit rows');

const summaryUpsert = extractFunction(
  backend,
  'upsertMissionSummaryRows_'
);
const summaryEventApply = extractFunction(
  backend,
  'applyMissionEventToSummaryRow_'
);
expect(summaryEventApply.includes("eventType === 'mission-completed' || eventType === 'mission-credit'"), 'Credit events must finalize the matching mission summary');
expect(summaryEventApply.includes('loggerNumber_(eventRow[16], 0)'), 'Credit events must populate actual_credits separately from advertised value');
const summaryFinalise = extractFunction(
  backend,
  'finaliseMissionSummaryRow_'
);
expect(summaryFinalise.includes("? 'CAPTURED'"), 'A verified positive award must change credit_status to CAPTURED');
expect(summaryFinalise.includes("? 'PENDING_TRANSACTION'"), 'A completed mission without an exact award must remain pending');
expect(
  summaryUpsert.indexOf('(Array.isArray(unitRows)') <
    summaryUpsert.indexOf('(Array.isArray(eventRows)'),
  'Summary rebuilds must apply raw unit rows before completion totals'
);
expect(
  summaryUpsert.includes("String(left[4] || '').toLowerCase() === 'dispatch'"),
  'Summary rebuilds must count dispatch events before applying completion floors'
);

const dashboardDayKey = extractFunction(
  backend,
  'loggerDashboardDayKey_'
);
const dashboardUpdater = extractFunction(
  backend,
  'applyDashboardSummaryChanges_'
);
expect(
  dashboardDayKey.includes("Utilities.formatDate(date, MC_LOGGER.timezone, 'yyyy-MM-dd')"),
  'Dashboard day keys must normalise Sheets Date values to the logger date key'
);
expect(
  dashboardUpdater.includes('loggerDashboardDayKey_(row[0])'),
  'Dashboard updates must reuse an existing player/day row after Sheets coerces its date value'
);

const loggerFormatter = extractFunction(
  backend,
  'formatLoggerSheet_'
);
expect(loggerFormatter.includes("/_at$/"), 'Every timestamp header must receive the shared date-time format');
expect(loggerFormatter.includes("'dd/MM/yyyy HH:mm:ss'"), 'Logger timestamps must display both UK date and time');
expect(loggerFormatter.includes('sheet.setColumnWidth(index + 1, 165)'), 'Timestamp columns must be wide enough to display seconds');

const configSeeder = extractFunction(
  backend,
  'seedLoggerConfiguration_'
);
expect(configSeeder.includes("row[0] !== 'deployment_url'"), 'Initialisation must refresh managed build settings without replacing the deployment URL');
expect(configSeeder.includes('setValues([[row[1], row[2]]])'), 'Managed configuration values must update in place');

const loggerDateOrNull = extractFunction(backend, 'loggerDateOrNull_');
const loggerDateKey = extractFunction(backend, 'loggerDateKeyFromUtcDate_');
const addLoggerDays = extractFunction(backend, 'addLoggerCalendarDays_');
const isoWeekInfo = extractFunction(backend, 'getLoggerIsoWeekInfo_');
const readIsoWeekInfo = Function(
  'MC_LOGGER',
  'Utilities',
  `"use strict";
   ${loggerDateOrNull}
   ${loggerDateKey}
   ${addLoggerDays}
   ${isoWeekInfo}
   return getLoggerIsoWeekInfo_;`
)(
  { timezone: 'Europe/London' },
  {
    formatDate(value) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/London',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(value);
      const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
      return `${values.year}-${values.month}-${values.day}`;
    },
  }
);
const sundayWeek = readIsoWeekInfo(new Date('2026-08-16T19:00:00.000Z'));
expect(sundayWeek.weekKey === '2026-W33', 'Sunday test date must remain in ISO week 33');
expect(sundayWeek.startKey === '2026-08-10', 'Weekly archive must start on Monday');
expect(sundayWeek.endKey === '2026-08-16', 'Weekly archive must include Sunday');
expect(
  readIsoWeekInfo(new Date('2026-08-17T03:15:00.000Z')).weekKey === '2026-W34',
  'Monday rollover must advance to the next ISO week'
);

const scopes = JSON.parse(manifest).oauthScopes || [];
expect(scopes.includes('https://www.googleapis.com/auth/spreadsheets'), 'Manifest needs spreadsheet access');
expect(scopes.includes('https://www.googleapis.com/auth/drive'), 'Manifest needs Drive backup access');
expect(scopes.includes('https://www.googleapis.com/auth/script.scriptapp'), 'Manifest needs trigger administration access');

console.log('Mission user logger pairing, queue, dispatch capture, Google sync and backend checks passed.');
