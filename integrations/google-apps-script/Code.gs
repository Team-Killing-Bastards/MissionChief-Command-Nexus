/**
 * MissionChief Command Nexus - User Logger backend
 *
 * Bind this project to the native Google Sheet created for issue #334.
 * Run initialiseMissionChiefLogger() once, then deploy the project as a web
 * app that executes as the owner and is accessible to anyone. The public
 * The web-app deployment URL is the private logger credential. Command Nexus
 * sends the selected active player name with each batch; per-device pairing and
 * upload tokens are disabled. Keep the deployed /exec URL private.
 */

const MC_LOGGER = Object.freeze({
  schemaVersion: 1,
  buildId: '1.1.6-private-profile-1',
  timezone: 'Europe/London',
  maxPayloadChars: 2800000,
  maxEventsPerBatch: 40,
  maxUnitsPerEvent: 500,
  dispatchDuplicateWindowMs: 15000,
  duplicateScanEventRows: 1000,
  pairingLifetimeHours: 24,
  batchLedgerRetentionDays: 35,
  summaryStaleDays: 35,
  archiveChunkRows: 5000,
  archiveSafetyCellThreshold: 7500000,
  liveSheetRowBuffer: 1000,
  responseSource: 'missionchief-nexus-logger',
  allowedReplyOrigins: Object.freeze([
    'https://www.missionchief.co.uk',
    'https://police.missionchief.co.uk'
  ]),
  spreadsheetProperty: 'MISSIONCHIEF_LOGGER_SPREADSHEET_ID',
  rootFolderProperty: 'MISSIONCHIEF_LOGGER_ROOT_FOLDER_ID',
  backupFolderProperty: 'MISSIONCHIEF_LOGGER_BACKUP_FOLDER_ID',
  weeklyArchiveFolderProperty: 'MISSIONCHIEF_LOGGER_WEEKLY_ARCHIVE_FOLDER_ID'
});

const MC_LOGGER_SHEETS = Object.freeze({
  players: Object.freeze({
    name: 'Players',
    headers: Object.freeze([
      'player_id',
      'display_name',
      'status',
      'created_at',
      'last_seen_at',
      'active_devices',
      'notes'
    ])
  }),
  pairings: Object.freeze({
    name: 'Pairings',
    headers: Object.freeze([
      'pairing_id',
      'player_id',
      'code_hash',
      'status',
      'created_at',
      'expires_at',
      'redeemed_at',
      'redeemed_device_id'
    ])
  }),
  devices: Object.freeze({
    name: 'Devices',
    headers: Object.freeze([
      'device_id',
      'player_id',
      'device_label',
      'token_hash',
      'status',
      'paired_at',
      'last_seen_at',
      'last_upload_at',
      'client_version'
    ])
  }),
  events: Object.freeze({
    name: 'Mission Events',
    headers: Object.freeze([
      'event_id',
      'batch_id',
      'player_id',
      'device_id',
      'event_type',
      'captured_at',
      'mission_id',
      'mission_definition_id',
      'mission_name',
      'mission_url',
      'ownership',
      'generator_station_id',
      'generator_station_name',
      'dispatch_mode',
      'shared',
      'advertised_credits',
      'actual_credits',
      'patient_count',
      'prisoner_count',
      'transport_count',
      'requirements_json',
      'metadata_json',
      'received_at'
    ])
  }),
  units: Object.freeze({
    name: 'Dispatch Units',
    headers: Object.freeze([
      'event_id',
      'batch_id',
      'player_id',
      'device_id',
      'mission_id',
      'captured_at',
      'vehicle_id',
      'vehicle_type_id',
      'vehicle_name',
      'vehicle_type_name',
      'station_id',
      'station_name',
      'vehicle_status',
      'dispatch_mode',
      'estimated_distance_km',
      'estimated_eta_seconds'
    ])
  }),
  uploads: Object.freeze({
    name: 'Uploads',
    headers: Object.freeze([
      'batch_id',
      'player_id',
      'device_id',
      'received_at',
      'event_count',
      'unit_count',
      'client_version',
      'duplicate',
      'status',
      'error'
    ])
  }),
  summaries: Object.freeze({
    name: 'Mission Summary',
    headers: Object.freeze([
      'mission_key',
      'player_id',
      'mission_id',
      'mission_definition_id',
      'mission_name',
      'mission_url',
      'ownership',
      'first_observed_at',
      'first_unit_sent_at',
      'completed_at',
      'response_seconds',
      'mission_duration_seconds',
      'advertised_credits',
      'actual_credits',
      'credit_status',
      'dispatch_count',
      'unit_count',
      'patient_count',
      'prisoner_count',
      'shared',
      'first_dispatch_mode',
      'archive_week',
      'last_event_at',
      'last_updated_at'
    ])
  }),
  dashboard: Object.freeze({
    name: 'Dashboard Data',
    headers: Object.freeze([
      'day',
      'week_key',
      'player_id',
      'missions_observed',
      'missions_dispatched',
      'missions_completed',
      'advertised_credits',
      'actual_credits',
      'dispatch_events',
      'dispatched_units',
      'response_seconds_total',
      'response_seconds_count',
      'mission_duration_seconds_total',
      'mission_duration_seconds_count',
      'avg_response_seconds',
      'avg_mission_duration_seconds',
      'pending_credits',
      'updated_at'
    ])
  }),
  journeys: Object.freeze({
    name: 'Journey Data',
    headers: Object.freeze([
      'week_key',
      'period_start',
      'period_end',
      'player_id',
      'station_key',
      'station_id',
      'station_name',
      'unit_journeys',
      'distance_km_total',
      'distance_km_count',
      'distance_km_max',
      'eta_seconds_total',
      'eta_seconds_count',
      'eta_seconds_max',
      'missing_distance_count',
      'missing_eta_count',
      'updated_at'
    ])
  }),
  archives: Object.freeze({
    name: 'Archive Index',
    headers: Object.freeze([
      'week_key',
      'period_start',
      'period_end',
      'spreadsheet_id',
      'spreadsheet_url',
      'status',
      'mission_summary_rows',
      'mission_event_rows',
      'dispatch_unit_rows',
      'upload_rows',
      'created_at',
      'verified_at',
      'purged_at',
      'cell_count',
      'notes'
    ])
  }),
  batchLedger: Object.freeze({
    name: 'Batch Ledger',
    headers: Object.freeze([
      'batch_id',
      'player_id',
      'device_id',
      'received_at',
      'event_count',
      'unit_count',
      'client_version',
      'batch_checksum',
      'status',
      'expires_at'
    ])
  }),
  configuration: Object.freeze({
    name: 'Configuration',
    headers: Object.freeze([
      'key',
      'value',
      'description'
    ])
  })
});

const MC_LOGGER_ARCHIVE_MANIFEST = Object.freeze({
  name: 'Archive Manifest',
  headers: Object.freeze([
    'week_key',
    'period_start',
    'period_end',
    'source_spreadsheet_id',
    'archive_spreadsheet_id',
    'schema_version',
    'status',
    'created_at',
    'last_updated_at'
  ])
});

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Logger Admin')
    .addItem('Initialise / repair logger', 'initialiseMissionChiefLogger')
    .addSeparator()
    .addItem('Install daily backup trigger', 'installMissionChiefDailyBackupTrigger')
    .addItem('Create yesterday backup now', 'createMissionChiefDailyBackup')
    .addSeparator()
    .addItem('Install weekly archive trigger', 'installMissionChiefWeeklyArchiveTrigger')
    .addItem('Preview tonight\'s weekly rollover', 'previewMissionChiefWeeklyArchive')
    .addItem('Test archive copy now (keeps live rows)', 'testMissionChiefWeeklyArchiveCopy')
    .addItem('Run due weekly rollover now', 'runMissionChiefWeeklyArchiveNow')
    .addSeparator()
    .addItem('Rebuild mission summary + dashboard', 'rebuildMissionChiefMissionSummary')
    .addToUi();
}

function initialiseMissionChiefLogger() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error('Open the logger spreadsheet before running initialisation.');
  }

  const properties = PropertiesService.getScriptProperties();
  properties.setProperty(MC_LOGGER.spreadsheetProperty, spreadsheet.getId());

  Object.keys(MC_LOGGER_SHEETS).forEach(function(key) {
    ensureLoggerSheet_(spreadsheet, MC_LOGGER_SHEETS[key]);
  });

  seedLoggerConfiguration_(spreadsheet);
  const rootFolder = resolveLoggerRootFolder_(spreadsheet);
  if (rootFolder) {
    properties.setProperty(MC_LOGGER.rootFolderProperty, rootFolder.getId());
    const backupFolder = getOrCreateChildFolder_(rootFolder, 'Raw Daily Backups');
    properties.setProperty(MC_LOGGER.backupFolderProperty, backupFolder.getId());
    const weeklyArchiveFolder = getOrCreateChildFolder_(rootFolder, 'Weekly Archives');
    properties.setProperty(
      MC_LOGGER.weeklyArchiveFolderProperty,
      weeklyArchiveFolder.getId()
    );
  }

  trimLoggerWorkbookColumns_(spreadsheet);
  formatLoggerWorkbook_(spreadsheet);
  rebuildMissionSummaryFromRawIfNeeded_(spreadsheet);
  rebuildJourneyDataFromRawIfNeeded_(spreadsheet);
  spreadsheet.setSpreadsheetTimeZone(MC_LOGGER.timezone);
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert(
    'MissionChief logger is initialised. Deploy this Apps Script project as a new private web app, then save that URL and a user name in Nexus.'
  );
}

function createMissionChiefPlayerPairing() {
  const ui = SpreadsheetApp.getUi();
  const namePrompt = ui.prompt(
    'Create player',
    'Display name, for example Marty or Conroy:',
    ui.ButtonSet.OK_CANCEL
  );
  if (namePrompt.getSelectedButton() !== ui.Button.OK) return;

  const displayName = cleanText_(namePrompt.getResponseText(), 120);
  if (!displayName) {
    ui.alert('A display name is required.');
    return;
  }

  const idPrompt = ui.prompt(
    'Player ID',
    'Optional stable ID. Leave blank to generate one:',
    ui.ButtonSet.OK_CANCEL
  );
  if (idPrompt.getSelectedButton() !== ui.Button.OK) return;

  const requestedId = cleanIdentifier_(idPrompt.getResponseText(), 80);
  const playerId = requestedId || createPlayerId_(displayName);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const spreadsheet = getLoggerSpreadsheet_();
    ensureLoggerWorkbook_(spreadsheet);
    const players = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.players.name);

    const existingDisplayName = findActivePlayerByDisplayName_(
    players,
    displayName
  );
  if (existingDisplayName) {
    throw new Error(
      'An active player already uses the display name "' + displayName +
      '". Use Create another device pairing with player ID ' +
      existingDisplayName.playerId + ' instead.'
    );
  }

    if (findRowByValue_(players, 1, playerId)) {
      throw new Error('That player ID already exists.');
    }

    players.appendRow([
      safeSheetText_(playerId),
      safeSheetText_(displayName),
      'ACTIVE',
      new Date(),
      '',
      0,
      ''
    ]);

    const pairing = createPairingForPlayer_(spreadsheet, playerId);
    SpreadsheetApp.flush();
    showPairingCode_(ui, displayName, pairing);
  } finally {
    lock.releaseLock();
  }
}

function createMissionChiefDevicePairing() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt(
    'Create another device pairing',
    'Existing player ID:',
    ui.ButtonSet.OK_CANCEL
  );
  if (prompt.getSelectedButton() !== ui.Button.OK) return;

  const playerId = cleanIdentifier_(prompt.getResponseText(), 80);
  if (!playerId) {
    ui.alert('A valid player ID is required.');
    return;
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const spreadsheet = getLoggerSpreadsheet_();
    ensureLoggerWorkbook_(spreadsheet);
    const player = getActivePlayer_(spreadsheet, playerId);
    const pairing = createPairingForPlayer_(spreadsheet, playerId);
    SpreadsheetApp.flush();
    showPairingCode_(ui, player.displayName, pairing);
  } finally {
    lock.releaseLock();
  }
}

function revokeMissionChiefLoggerDevice() {
  const ui = SpreadsheetApp.getUi();
  const prompt = ui.prompt(
    'Revoke device',
    'Device ID from the Devices tab:',
    ui.ButtonSet.OK_CANCEL
  );
  if (prompt.getSelectedButton() !== ui.Button.OK) return;

  const deviceId = cleanIdentifier_(prompt.getResponseText(), 160);
  if (!deviceId) {
    ui.alert('A valid device ID is required.');
    return;
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const spreadsheet = getLoggerSpreadsheet_();
    const devices = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.devices.name);
    const row = findRowByValue_(devices, 1, deviceId);
    if (!row) throw new Error('Device ID not found.');

    devices.getRange(row, 5).setValue('REVOKED');
    const playerId = String(devices.getRange(row, 2).getValue() || '');
    updatePlayerActivity_(spreadsheet, playerId);
    SpreadsheetApp.flush();
    ui.alert('Device revoked. Its stored token can no longer upload.');
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      ok: true,
      service: 'missionchief-nexus-logger',
      schemaVersion: MC_LOGGER.schemaVersion,
      buildId: MC_LOGGER.buildId,
      features: [
        'mission-summary',
        'native-completion',
        'credit-ledger-match',
        'dispatch-journey-metrics',
        'private-url-profile',
        'weekly-archive',
        'batch-ledger'
      ],
      time: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  const requestId = cleanIdentifier_(
    event && event.parameter ? event.parameter.request_id : '',
    180
  ) || createOpaqueId_('request');
  const requestedOrigin = String(
    event && event.parameter ? event.parameter.reply_origin || '' : ''
  );
  const replyOrigin = isAllowedReplyOrigin_(requestedOrigin)
    ? requestedOrigin
    : MC_LOGGER.allowedReplyOrigins[0];
  let response;

  try {
    if (!isAllowedReplyOrigin_(requestedOrigin)) {
      throw loggerError_('INVALID_ORIGIN', 'The reply origin is not an approved MissionChief UK domain.');
    }

    const rawPayload = String(
      event && event.parameter ? event.parameter.payload || '' : ''
    );
    if (!rawPayload || rawPayload.length > MC_LOGGER.maxPayloadChars) {
      throw loggerError_('INVALID_PAYLOAD', 'The logger request is empty or exceeds the batch safety limit.');
    }

    const payload = JSON.parse(rawPayload);
    if (String(payload.requestId || '') !== requestId) {
      throw loggerError_('REQUEST_MISMATCH', 'The logger request identifier does not match.');
    }
    if (Number(payload.schemaVersion) !== MC_LOGGER.schemaVersion) {
      throw loggerError_('SCHEMA_MISMATCH', 'The logger schema version is not supported.');
    }

    const action = String(payload.action || '').toLowerCase();
    if (action === 'upload') {
      response = handleLoggerUpload_(payload);
    } else if (action === 'pair' || action === 'revoke') {
      throw loggerError_(
        'PAIRING_DISABLED',
        'This private logger deployment uses the saved URL and user name; pairing and device tokens are disabled.'
      );
    } else {
      throw loggerError_('UNKNOWN_ACTION', 'Unknown logger action.');
    }
  } catch (error) {
    response = {
      ok: false,
      code: cleanText_(error && error.code ? error.code : 'LOGGER_ERROR', 80),
      error: cleanText_(error && error.message ? error.message : String(error), 500)
    };
  }

  response.source = MC_LOGGER.responseSource;
  response.requestId = requestId;
  response.backendBuild = MC_LOGGER.buildId;
  return createLoggerPostMessageResponse_(response, replyOrigin);
}

function handleLoggerPair_(payload) {
  const pairingCode = normalisePairingCode_(payload.pairingCode);
  const deviceId = cleanIdentifier_(payload.deviceId, 160);
  const deviceLabel = cleanText_(payload.deviceLabel || 'MissionChief browser', 120);
  const clientVersion = cleanText_(payload.clientVersion, 40);

  if (pairingCode.length !== 12) {
    throw loggerError_('INVALID_PAIRING_CODE', 'The one-time pairing code is invalid.');
  }
  if (!deviceId || deviceId.length < 8) {
    throw loggerError_('INVALID_DEVICE', 'The browser device identifier is invalid.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const spreadsheet = getLoggerSpreadsheet_();
    ensureLoggerWorkbook_(spreadsheet);
    const pairings = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.pairings.name);
    const pairRows = getDataRows_(pairings);
    const codeHash = sha256_(pairingCode);
    const now = new Date();
    let pairing = null;

    for (let index = 0; index < pairRows.length; index += 1) {
      const values = pairRows[index];
      if (
        String(values[2] || '') === codeHash &&
        String(values[3] || '').toUpperCase() === 'ACTIVE'
      ) {
        pairing = { row: index + 2, values: values };
        break;
      }
    }

    if (!pairing) {
      throw loggerError_('PAIRING_NOT_FOUND', 'The pairing code is invalid or has already been used.');
    }

    const expiresAt = new Date(pairing.values[5]);
    if (!expiresAt.getTime() || expiresAt.getTime() <= now.getTime()) {
      pairings.getRange(pairing.row, 4).setValue('EXPIRED');
      throw loggerError_('PAIRING_EXPIRED', 'The pairing code has expired. Create another code from Logger Admin.');
    }

    const playerId = cleanIdentifier_(pairing.values[1], 80);
    const player = getActivePlayer_(spreadsheet, playerId);
    const devices = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.devices.name);
    const deviceRow = findRowByValue_(devices, 1, deviceId);

    if (deviceRow) {
      const existingPlayer = cleanIdentifier_(devices.getRange(deviceRow, 2).getValue(), 80);
      if (existingPlayer && existingPlayer !== playerId) {
        throw loggerError_('DEVICE_ALREADY_PAIRED', 'This browser device is already assigned to another player.');
      }
    }

    const token = createUploadToken_();
    const tokenHash = sha256_(token);
    const deviceValues = [
      safeSheetText_(deviceId),
      safeSheetText_(playerId),
      safeSheetText_(deviceLabel),
      tokenHash,
      'ACTIVE',
      now,
      now,
      '',
      safeSheetText_(clientVersion)
    ];

    if (deviceRow) {
      devices.getRange(deviceRow, 1, 1, deviceValues.length).setValues([deviceValues]);
    } else {
      devices.appendRow(deviceValues);
    }

    pairings.getRange(pairing.row, 4, 1, 5).setValues([[
      'REDEEMED',
      pairing.values[4],
      pairing.values[5],
      now,
      safeSheetText_(deviceId)
    ]]);
    updatePlayerActivity_(spreadsheet, playerId, now);
    SpreadsheetApp.flush();

    return {
      ok: true,
      action: 'pair',
      playerId: playerId,
      playerName: player.displayName,
      deviceId: deviceId,
      token: token,
      pairedAt: now.toISOString()
    };
  } finally {
    lock.releaseLock();
  }
}

function handleLoggerUpload_(payload) {
  const batchId = cleanIdentifier_(payload.batchId, 180);
  const profileName = cleanText_(
    payload.profileName || payload.playerName,
    120
  );
  const deviceId = cleanIdentifier_(payload.deviceId, 160);
  const deviceLabel = cleanText_(
    payload.deviceLabel || 'MissionChief browser',
    120
  );
  const clientVersion = cleanText_(payload.clientVersion, 40);
  const events = Array.isArray(payload.events) ? payload.events : [];

  if (!batchId || !profileName || !deviceId) {
    throw loggerError_(
      'INVALID_UPLOAD',
      'The private logger URL, user name or batch identifier is invalid.'
    );
  }
  if (events.length < 1 || events.length > MC_LOGGER.maxEventsPerBatch) {
    throw loggerError_('INVALID_EVENT_COUNT', 'The logger batch contains an invalid number of events.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const spreadsheet = getLoggerSpreadsheet_();
    ensureLoggerWorkbook_(spreadsheet);
    const profile = resolveActiveLoggerProfile_(
      spreadsheet,
      profileName
    );
    const playerId = profile.playerId;
    const receivedAt = new Date();
    const device = upsertLoggerProfileDevice_(
      spreadsheet,
      playerId,
      deviceId,
      deviceLabel,
      clientVersion,
      receivedAt
    );
    const eventSheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.events.name);
    const unitSheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.units.name);
    const uploadSheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.uploads.name);
    const preparedRaw = prepareLoggerBatchRows_(
      events,
      batchId,
      playerId,
      deviceId,
      receivedAt
    );
    const batchChecksum = createLoggerBatchChecksum_(
      playerId,
      deviceId,
      preparedRaw
    );
    const duplicateRows = findAllRowsByValue_(eventSheet, 2, batchId);
    const ledgerRecord = findLoggerBatchLedgerRecord_(
      spreadsheet,
      batchId
    );

    if (ledgerRecord) {
      assertLoggerBatchLedgerMatch_(
        ledgerRecord,
        playerId,
        deviceId,
        batchChecksum
      );

      if (duplicateRows.length === 0) {
        appendUploadAudit_(uploadSheet, {
          batchId: batchId,
          playerId: playerId,
          deviceId: deviceId,
          receivedAt: receivedAt,
          eventCount: preparedRaw.eventRows.length,
          unitCount: preparedRaw.unitRows.length,
          clientVersion: clientVersion,
          duplicate: true,
          status: 'ACKNOWLEDGED_ARCHIVED',
          error: ''
        });
        updateDeviceActivity_(spreadsheet, device.row, clientVersion, receivedAt, true);
        updatePlayerActivity_(spreadsheet, playerId, receivedAt);
        SpreadsheetApp.flush();

        return {
          ok: true,
          action: 'upload',
          playerId: playerId,
          playerName: profile.displayName,
          batchId: batchId,
          duplicate: true,
          archived: true,
          acceptedEvents: preparedRaw.eventRows.length,
          acceptedUnits: preparedRaw.unitRows.length,
          receivedAt: receivedAt.toISOString()
        };
      }
    }

    const prepared = filterSemanticDuplicateDispatchRows_(
      eventSheet,
      preparedRaw,
      batchId
    );

    if (duplicateRows.length > 0) {
      const existingEventRows = getRowsByColumnValue_(eventSheet, 2, batchId);
      const expectedEventIds = prepared.eventRows
        .map(function(row) { return String(row[0] || ''); })
        .sort();
      const existingEventIds = existingEventRows
        .map(function(row) { return String(row[0] || ''); })
        .sort();
      const eventIdentityMatches = existingEventRows.every(function(row) {
        return String(row[2] || '') === playerId && String(row[3] || '') === deviceId;
      });

      if (
        !eventIdentityMatches ||
        JSON.stringify(existingEventIds) !== JSON.stringify(expectedEventIds)
      ) {
        throw loggerError_(
          'BATCH_CONFLICT',
          'This batch identifier already exists with different mission events or a different profile/device identity.'
        );
      }

      const existingUnitRows = getRowsByColumnValue_(unitSheet, 2, batchId);
      const expectedUnitCounts = countLoggerRowIdentities_(prepared.unitRows, loggerUnitIdentity_);
      const existingUnitCounts = countLoggerRowIdentities_(existingUnitRows, loggerUnitIdentity_);
      const unitIdentityMatches = existingUnitRows.every(function(row) {
        const identity = loggerUnitIdentity_(row);
        return String(row[2] || '') === playerId &&
          String(row[3] || '') === deviceId &&
          Boolean(expectedUnitCounts[identity]) &&
          existingUnitCounts[identity] <= expectedUnitCounts[identity];
      });

      if (!unitIdentityMatches) {
        throw loggerError_(
          'BATCH_CONFLICT',
          'This batch identifier already exists with different dispatched-unit data.'
        );
      }

      const retainedUnitCounts = {};
      const missingUnitRows = prepared.unitRows.filter(function(row) {
        const identity = loggerUnitIdentity_(row);
        retainedUnitCounts[identity] = (retainedUnitCounts[identity] || 0) + 1;
        return retainedUnitCounts[identity] > (existingUnitCounts[identity] || 0);
      });
      appendRows_(unitSheet, missingUnitRows);
      appendUploadAudit_(uploadSheet, {
        batchId: batchId,
        playerId: playerId,
        deviceId: deviceId,
        receivedAt: receivedAt,
        eventCount: prepared.eventRows.length,
        unitCount: prepared.unitRows.length,
        clientVersion: clientVersion,
        duplicate: true,
        status: missingUnitRows.length > 0 ? 'REPAIRED' : 'ACKNOWLEDGED',
        error: ''
      });
      const summaryChanges = upsertMissionSummaryRows_(
        spreadsheet,
        [],
        missingUnitRows,
        receivedAt
      );
      applyDashboardSummaryChanges_(
        spreadsheet,
        summaryChanges,
        receivedAt
      );
      applyJourneyUnitRows_(
        spreadsheet,
        missingUnitRows,
        receivedAt
      );
      upsertLoggerBatchLedger_(spreadsheet, {
        batchId: batchId,
        playerId: playerId,
        deviceId: deviceId,
        receivedAt: receivedAt,
        eventCount: prepared.eventRows.length,
        unitCount: prepared.unitRows.length,
        clientVersion: clientVersion,
        batchChecksum: batchChecksum,
        status: missingUnitRows.length > 0 ? 'REPAIRED' : 'ACCEPTED'
      });
      updateDeviceActivity_(spreadsheet, device.row, clientVersion, receivedAt, true);
      updatePlayerActivity_(spreadsheet, playerId, receivedAt);
      scheduleMissionChiefEmergencyArchiveIfNeeded_(spreadsheet);
      SpreadsheetApp.flush();

      return {
        ok: true,
        action: 'upload',
        playerId: playerId,
        playerName: profile.displayName,
        batchId: batchId,
        duplicate: true,
        repairedUnits: missingUnitRows.length,
        acceptedEvents: prepared.eventRows.length,
        acceptedUnits: prepared.unitRows.length,
        suppressedDuplicateEvents: prepared.suppressedDuplicateEvents,
        receivedAt: receivedAt.toISOString()
      };
    }

    appendRows_(eventSheet, prepared.eventRows);
    appendRows_(unitSheet, prepared.unitRows);
    appendUploadAudit_(uploadSheet, {
      batchId: batchId,
      playerId: playerId,
      deviceId: deviceId,
      receivedAt: receivedAt,
      eventCount: prepared.eventRows.length,
      unitCount: prepared.unitRows.length,
      clientVersion: clientVersion,
      duplicate: false,
      status: prepared.suppressedDuplicateEvents > 0
        ? 'ACCEPTED_DEDUPED'
        : 'ACCEPTED',
      error: ''
    });
    const summaryChanges = upsertMissionSummaryRows_(
      spreadsheet,
      prepared.eventRows,
      prepared.unitRows,
      receivedAt
    );
    applyDashboardSummaryChanges_(
      spreadsheet,
      summaryChanges,
      receivedAt
    );
    applyJourneyUnitRows_(
      spreadsheet,
      prepared.unitRows,
      receivedAt
    );
    upsertLoggerBatchLedger_(spreadsheet, {
      batchId: batchId,
      playerId: playerId,
      deviceId: deviceId,
      receivedAt: receivedAt,
      eventCount: prepared.eventRows.length,
      unitCount: prepared.unitRows.length,
      clientVersion: clientVersion,
      batchChecksum: batchChecksum,
      status: prepared.suppressedDuplicateEvents > 0
        ? 'ACCEPTED_DEDUPED'
        : 'ACCEPTED'
    });
    updateDeviceActivity_(spreadsheet, device.row, clientVersion, receivedAt, true);
    updatePlayerActivity_(spreadsheet, playerId, receivedAt);
    scheduleMissionChiefEmergencyArchiveIfNeeded_(spreadsheet);
    SpreadsheetApp.flush();

    return {
      ok: true,
      action: 'upload',
      playerId: playerId,
      playerName: profile.displayName,
      batchId: batchId,
      duplicate: false,
      acceptedEvents: prepared.eventRows.length,
      acceptedUnits: prepared.unitRows.length,
      suppressedDuplicateEvents: prepared.suppressedDuplicateEvents,
      receivedAt: receivedAt.toISOString()
    };
  } finally {
    lock.releaseLock();
  }
}

function handleLoggerRevoke_(payload) {
  const playerId = cleanIdentifier_(payload.playerId, 80);
  const deviceId = cleanIdentifier_(payload.deviceId, 160);
  const token = String(payload.token || '');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const spreadsheet = getLoggerSpreadsheet_();
    const device = authenticateLoggerDevice_(spreadsheet, playerId, deviceId, token);
    const devices = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.devices.name);
    devices.getRange(device.row, 5).setValue('REVOKED');
    updatePlayerActivity_(spreadsheet, playerId, new Date());
    SpreadsheetApp.flush();

    return {
      ok: true,
      action: 'revoke',
      playerId: playerId,
      deviceId: deviceId
    };
  } finally {
    lock.releaseLock();
  }
}

function prepareLoggerBatchRows_(events, batchId, playerId, deviceId, receivedAt) {
  const eventRows = [];
  const unitRows = [];
  const eventIds = {};

  events.forEach(function(rawEvent) {
    if (!rawEvent || typeof rawEvent !== 'object') {
      throw loggerError_('INVALID_EVENT', 'A logger event is not an object.');
    }

    const eventId = cleanIdentifier_(rawEvent.eventId, 180);
    if (!eventId || eventIds[eventId]) {
      throw loggerError_('INVALID_EVENT_ID', 'A logger event identifier is missing or duplicated in the batch.');
    }
    eventIds[eventId] = true;

    const capturedAt = parseLoggerDate_(rawEvent.capturedAt);
    const missionId = cleanIdentifier_(rawEvent.missionId, 80);
    const eventType = cleanText_(rawEvent.eventType, 60) || 'unknown';
    const dispatchMode = cleanText_(rawEvent.dispatchMode, 80);
    const requirements = Array.isArray(rawEvent.requirements)
      ? rawEvent.requirements.slice(0, 250)
      : [];
    const metadata = rawEvent.metadata && typeof rawEvent.metadata === 'object'
      ? Object.assign({}, rawEvent.metadata)
      : {};
    const units = Array.isArray(rawEvent.units) ? rawEvent.units : [];

    if (units.length > MC_LOGGER.maxUnitsPerEvent) {
      throw loggerError_('TOO_MANY_UNITS', 'A dispatch event exceeds the selected-unit safety limit.');
    }

    if (eventType.toLowerCase() === 'dispatch') {
      metadata.dispatchFingerprint = createLoggerDispatchFingerprint_(
        missionId,
        dispatchMode,
        units
      );
    }

    eventRows.push([
      safeSheetText_(eventId),
      safeSheetText_(batchId),
      safeSheetText_(playerId),
      safeSheetText_(deviceId),
      safeSheetText_(eventType),
      capturedAt,
      safeSheetText_(missionId),
      safeSheetText_(cleanIdentifier_(rawEvent.missionDefinitionId, 80)),
      safeSheetText_(cleanText_(rawEvent.missionName, 240)),
      safeSheetText_(cleanMissionUrl_(rawEvent.missionUrl)),
      safeSheetText_(cleanText_(rawEvent.ownership, 40)),
      safeSheetText_(cleanIdentifier_(rawEvent.generatorStationId, 80)),
      safeSheetText_(cleanText_(rawEvent.generatorStationName, 160)),
      safeSheetText_(dispatchMode),
      rawEvent.shared === true,
      cleanNumberOrBlank_(rawEvent.advertisedCredits, 0, 1000000000),
      cleanNumberOrBlank_(rawEvent.actualCredits, 0, 1000000000),
      cleanNumberOrBlank_(rawEvent.patientCount, 0, 10000),
      cleanNumberOrBlank_(rawEvent.prisonerCount, 0, 10000),
      cleanNumberOrBlank_(rawEvent.transportCount, 0, 10000),
      safeSheetText_(safeJson_(requirements)),
      safeSheetText_(safeJson_(metadata)),
      receivedAt
    ]);

    units.forEach(function(rawUnit) {
      const unit = rawUnit && typeof rawUnit === 'object' ? rawUnit : {};
      unitRows.push([
        safeSheetText_(eventId),
        safeSheetText_(batchId),
        safeSheetText_(playerId),
        safeSheetText_(deviceId),
        safeSheetText_(missionId),
        capturedAt,
        safeSheetText_(cleanIdentifier_(unit.vehicleId, 100)),
        safeSheetText_(cleanIdentifier_(unit.vehicleTypeId, 80)),
        safeSheetText_(cleanText_(unit.vehicleName, 180)),
        safeSheetText_(cleanText_(unit.vehicleTypeName, 160)),
        safeSheetText_(cleanIdentifier_(unit.stationId, 80)),
        safeSheetText_(cleanText_(unit.stationName, 180)),
        safeSheetText_(cleanText_(unit.status, 80)),
        safeSheetText_(dispatchMode),
        cleanNumberOrBlank_(unit.estimatedDistanceKm, 0, 100000),
        cleanNumberOrBlank_(unit.estimatedEtaSeconds, 0, 604800)
      ]);
    });
  });

  return { eventRows: eventRows, unitRows: unitRows };
}

function createMissionSummaryKey_(playerId, missionId) {
  const player = cleanIdentifier_(playerId, 80);
  const mission = cleanIdentifier_(missionId, 80);
  return player && mission ? player + '|' + mission : '';
}

function loggerDateOrNull_(value) {
  if (value instanceof Date && value.getTime()) return value;
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(value);
  return date.getTime() ? date : null;
}

function loggerEarlierDate_(left, right) {
  const leftDate = loggerDateOrNull_(left);
  const rightDate = loggerDateOrNull_(right);
  if (!leftDate) return rightDate || '';
  if (!rightDate) return leftDate;
  return leftDate.getTime() <= rightDate.getTime() ? leftDate : rightDate;
}

function loggerLaterDate_(left, right) {
  const leftDate = loggerDateOrNull_(left);
  const rightDate = loggerDateOrNull_(right);
  if (!leftDate) return rightDate || '';
  if (!rightDate) return leftDate;
  return leftDate.getTime() >= rightDate.getTime() ? leftDate : rightDate;
}

function loggerNumber_(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : Number(fallback || 0);
}

function createBlankMissionSummaryRow_(missionKey, playerId, missionId) {
  const row = new Array(MC_LOGGER_SHEETS.summaries.headers.length).fill('');
  row[0] = safeSheetText_(missionKey);
  row[1] = safeSheetText_(playerId);
  row[2] = safeSheetText_(missionId);
  row[15] = 0;
  row[16] = 0;
  row[17] = 0;
  row[19] = false;
  return row;
}

function applyMissionEventToSummaryRow_(row, eventRow) {
  const eventType = String(eventRow[4] || '').toLowerCase();
  const capturedAt = loggerDateOrNull_(eventRow[5]);
  const metadata = readLoggerEventMetadata_(eventRow[21]);
  const metadataObservedAt = loggerDateOrNull_(
    metadata.firstObservedAt || metadata.observedAt
  );
  const metadataDispatchedAt = loggerDateOrNull_(
    metadata.firstUnitSentAt || metadata.firstDispatchedAt
  );
  const metadataCompletedAt = loggerDateOrNull_(
    metadata.completedAt
  );

  if (!row[3] && eventRow[7]) row[3] = eventRow[7];
  if (!row[4] && eventRow[8]) row[4] = eventRow[8];
  if (!row[5] && eventRow[9]) row[5] = eventRow[9];
  if (!row[6] && eventRow[10]) row[6] = eventRow[10];

  if (metadataObservedAt) {
    row[7] = loggerEarlierDate_(row[7], metadataObservedAt);
  }
  if (metadataDispatchedAt) {
    row[8] = loggerEarlierDate_(row[8], metadataDispatchedAt);
  }
  if (metadataCompletedAt) {
    row[9] = loggerEarlierDate_(row[9], metadataCompletedAt);
  }

  if (eventType === 'mission-observed' && capturedAt) {
    row[7] = loggerEarlierDate_(row[7], capturedAt);
  }
  if (eventType === 'dispatch' && capturedAt) {
    row[8] = loggerEarlierDate_(row[8], capturedAt);
    row[15] = Math.max(
      loggerNumber_(row[15], 0) + 1,
      loggerNumber_(metadata.dispatchCount, 0)
    );
    if (!row[20] && eventRow[13]) row[20] = eventRow[13];
  } else if (metadata.dispatchCount !== undefined) {
    row[15] = Math.max(
      loggerNumber_(row[15], 0),
      loggerNumber_(metadata.dispatchCount, 0)
    );
  }
  if (
    (eventType === 'mission-completed' || eventType === 'mission-credit') &&
    capturedAt
  ) {
    row[9] = loggerEarlierDate_(row[9], metadataCompletedAt || capturedAt);
  }

  row[12] = Math.max(
    loggerNumber_(row[12], 0),
    loggerNumber_(eventRow[15], 0)
  );
  if (eventRow[16] !== '' && eventRow[16] !== null) {
    row[13] = Math.max(
      loggerNumber_(row[13], 0),
      loggerNumber_(eventRow[16], 0)
    );
  }
  row[17] = Math.max(
    loggerNumber_(row[17], 0),
    loggerNumber_(eventRow[17], 0)
  );
  if (eventRow[18] !== '' && eventRow[18] !== null) {
    row[18] = Math.max(
      loggerNumber_(row[18], 0),
      loggerNumber_(eventRow[18], 0)
    );
  }
  row[19] = row[19] === true || eventRow[14] === true;
  row[16] = Math.max(
    loggerNumber_(row[16], 0),
    loggerNumber_(metadata.unitCount, 0)
  );
  row[22] = loggerLaterDate_(row[22], capturedAt);
}

function finaliseMissionSummaryRow_(row, updatedAt) {
  const observedAt = loggerDateOrNull_(row[7]);
  const dispatchedAt = loggerDateOrNull_(row[8]);
  const completedAt = loggerDateOrNull_(row[9]);

  row[10] = observedAt && dispatchedAt
    ? Math.max(0, Math.round((dispatchedAt.getTime() - observedAt.getTime()) / 1000))
    : '';
  row[11] = dispatchedAt && completedAt
    ? Math.max(0, Math.round((completedAt.getTime() - dispatchedAt.getTime()) / 1000))
    : '';
  row[14] = row[13] !== '' && row[13] !== null && loggerNumber_(row[13], 0) > 0
    ? 'CAPTURED'
    : completedAt
      ? 'PENDING_TRANSACTION'
      : 'NOT_COMPLETED';

  const archiveDate = dispatchedAt || observedAt || loggerDateOrNull_(row[22]);
  row[21] = archiveDate ? getLoggerIsoWeekInfo_(archiveDate).weekKey : '';
  row[23] = updatedAt;
  return row;
}

function upsertMissionSummaryRows_(spreadsheet, eventRows, unitRows, updatedAt) {
  const sheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.summaries.name);
  const width = MC_LOGGER_SHEETS.summaries.headers.length;
  const existingRows = sheet.getLastRow() >= 2
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues()
    : [];
  const rowByKey = {};
  existingRows.forEach(function(row, index) {
    const key = String(row[0] || '');
    if (key) rowByKey[key] = { rowNumber: index + 2, values: row };
  });

  const working = {};
  const changes = {};
  const getWorking = function(playerId, missionId) {
    const key = createMissionSummaryKey_(playerId, missionId);
    if (!key) return null;
    if (!working[key]) {
      const existing = rowByKey[key];
      working[key] = existing
        ? existing.values.slice()
        : createBlankMissionSummaryRow_(key, playerId, missionId);
      changes[key] = {
        key: key,
        rowNumber: existing ? existing.rowNumber : 0,
        before: existing ? existing.values.slice() : null,
        after: null
      };
    }
    return working[key];
  };

  (Array.isArray(unitRows) ? unitRows : []).forEach(function(unitRow) {
    const row = getWorking(unitRow[2], unitRow[4]);
    if (!row) return;
    row[8] = loggerEarlierDate_(row[8], unitRow[5]);
    row[16] = loggerNumber_(row[16], 0) + 1;
    row[22] = loggerLaterDate_(row[22], unitRow[5]);
  });

  // Unit rows are applied first and dispatch events before completion events.
  // That ordering lets a full rebuild use completion totals as a floor without
  // double-counting the raw unit and dispatch rows that are also present.
  (Array.isArray(eventRows) ? eventRows : []).slice().sort(function(left, right) {
    const leftDispatch = String(left[4] || '').toLowerCase() === 'dispatch';
    const rightDispatch = String(right[4] || '').toLowerCase() === 'dispatch';
    return leftDispatch === rightDispatch ? 0 : (leftDispatch ? -1 : 1);
  }).forEach(function(eventRow) {
    const row = getWorking(eventRow[2], eventRow[6]);
    if (!row) return;
    applyMissionEventToSummaryRow_(row, eventRow);
  });

  const newRows = [];
  const orderedChanges = Object.keys(changes).map(function(key) {
    const change = changes[key];
    const finalRow = finaliseMissionSummaryRow_(working[key], updatedAt);
    change.after = finalRow.slice();
    if (change.rowNumber) {
      sheet.getRange(change.rowNumber, 1, 1, width).setValues([finalRow]);
    } else {
      newRows.push(finalRow);
    }
    return change;
  });

  appendRows_(sheet, newRows);
  return orderedChanges;
}

function missionSummaryContribution_(row) {
  if (!row) return null;
  const dayDate = loggerDateOrNull_(row[8]) || loggerDateOrNull_(row[7]);
  const playerId = String(row[1] || '');
  if (!dayDate || !playerId) return null;

  const responseSeconds = row[10] === '' ? null : loggerNumber_(row[10], 0);
  const durationSeconds = row[11] === '' ? null : loggerNumber_(row[11], 0);
  const actualCredits = loggerNumber_(row[13], 0);
  const completed = Boolean(loggerDateOrNull_(row[9]));

  return {
    day: Utilities.formatDate(dayDate, MC_LOGGER.timezone, 'yyyy-MM-dd'),
    weekKey: getLoggerIsoWeekInfo_(dayDate).weekKey,
    playerId: playerId,
    observed: loggerDateOrNull_(row[7]) ? 1 : 0,
    dispatched: loggerDateOrNull_(row[8]) ? 1 : 0,
    completed: completed ? 1 : 0,
    advertisedCredits: loggerNumber_(row[12], 0),
    actualCredits: actualCredits,
    dispatchEvents: loggerNumber_(row[15], 0),
    dispatchedUnits: loggerNumber_(row[16], 0),
    responseTotal: responseSeconds === null ? 0 : responseSeconds,
    responseCount: responseSeconds === null ? 0 : 1,
    durationTotal: durationSeconds === null ? 0 : durationSeconds,
    durationCount: durationSeconds === null ? 0 : 1,
    pendingCredits: completed && actualCredits <= 0 ? 1 : 0
  };
}

function applyDashboardContribution_(row, contribution, direction) {
  if (!row || !contribution) return;
  const multiplier = direction < 0 ? -1 : 1;
  row[3] = Math.max(0, loggerNumber_(row[3], 0) + multiplier * contribution.observed);
  row[4] = Math.max(0, loggerNumber_(row[4], 0) + multiplier * contribution.dispatched);
  row[5] = Math.max(0, loggerNumber_(row[5], 0) + multiplier * contribution.completed);
  row[6] = Math.max(0, loggerNumber_(row[6], 0) + multiplier * contribution.advertisedCredits);
  row[7] = Math.max(0, loggerNumber_(row[7], 0) + multiplier * contribution.actualCredits);
  row[8] = Math.max(0, loggerNumber_(row[8], 0) + multiplier * contribution.dispatchEvents);
  row[9] = Math.max(0, loggerNumber_(row[9], 0) + multiplier * contribution.dispatchedUnits);
  row[10] = Math.max(0, loggerNumber_(row[10], 0) + multiplier * contribution.responseTotal);
  row[11] = Math.max(0, loggerNumber_(row[11], 0) + multiplier * contribution.responseCount);
  row[12] = Math.max(0, loggerNumber_(row[12], 0) + multiplier * contribution.durationTotal);
  row[13] = Math.max(0, loggerNumber_(row[13], 0) + multiplier * contribution.durationCount);
  row[16] = Math.max(0, loggerNumber_(row[16], 0) + multiplier * contribution.pendingCredits);
}

function loggerDashboardDayKey_(value) {
  const date = loggerDateOrNull_(value);
  if (date) {
    return Utilities.formatDate(date, MC_LOGGER.timezone, 'yyyy-MM-dd');
  }
  return cleanText_(value, 32);
}

function applyDashboardSummaryChanges_(spreadsheet, changes, updatedAt) {
  if (!Array.isArray(changes) || changes.length === 0) return;
  const sheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.dashboard.name);
  const width = MC_LOGGER_SHEETS.dashboard.headers.length;
  const existingRows = sheet.getLastRow() >= 2
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues()
    : [];
  const rowsByKey = {};
  existingRows.forEach(function(row, index) {
    // A yyyy-MM-dd value is commonly returned by Sheets as a Date after the
    // column receives date formatting. Normalise both representations so a
    // later upload updates the existing player/day row instead of appending a
    // second delta row for the same key.
    const key = [loggerDashboardDayKey_(row[0]), row[2]].join('|');
    rowsByKey[key] = { rowNumber: index + 2, values: row };
  });
  const touched = {};

  const getRow = function(contribution) {
    if (!contribution) return null;
    const key = [contribution.day, contribution.playerId].join('|');
    if (!touched[key]) {
      const existing = rowsByKey[key];
      const values = existing
        ? existing.values.slice()
        : new Array(width).fill('');
      values[0] = contribution.day;
      values[1] = contribution.weekKey;
      values[2] = contribution.playerId;
      touched[key] = {
        rowNumber: existing ? existing.rowNumber : 0,
        values: values
      };
    }
    return touched[key].values;
  };

  changes.forEach(function(change) {
    const before = missionSummaryContribution_(change.before);
    const after = missionSummaryContribution_(change.after);
    applyDashboardContribution_(getRow(before), before, -1);
    applyDashboardContribution_(getRow(after), after, 1);
  });

  const newRows = [];
  Object.keys(touched).forEach(function(key) {
    const touchedRow = touched[key];
    const row = touchedRow.values;
    row[14] = loggerNumber_(row[11], 0) > 0
      ? Math.round(loggerNumber_(row[10], 0) / loggerNumber_(row[11], 1))
      : '';
    row[15] = loggerNumber_(row[13], 0) > 0
      ? Math.round(loggerNumber_(row[12], 0) / loggerNumber_(row[13], 1))
      : '';
    row[17] = updatedAt;
    if (touchedRow.rowNumber) {
      sheet.getRange(touchedRow.rowNumber, 1, 1, width).setValues([row]);
    } else {
      newRows.push(row);
    }
  });
  appendRows_(sheet, newRows);
}

function loggerJourneyStationKey_(stationId, stationName) {
  const id = cleanIdentifier_(stationId, 80);
  if (id) return 'id:' + id;

  const name = cleanText_(stationName, 180).toLowerCase();
  return name ? 'name:' + name : 'unknown';
}

function loggerJourneyMetricOrNull_(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function missionJourneyContribution_(unitRow) {
  if (!Array.isArray(unitRow)) return null;
  const capturedAt = loggerDateOrNull_(unitRow[5]);
  const playerId = cleanIdentifier_(unitRow[2], 80);
  if (!capturedAt || !playerId) return null;

  const stationId = cleanIdentifier_(unitRow[10], 80);
  const stationName = cleanText_(unitRow[11], 180) || 'Unknown / not logged';
  const weekInfo = getLoggerIsoWeekInfo_(capturedAt);
  const distanceKm = loggerJourneyMetricOrNull_(unitRow[14]);
  const etaSeconds = loggerJourneyMetricOrNull_(unitRow[15]);

  return {
    weekKey: weekInfo.weekKey,
    periodStart: weekInfo.startKey,
    periodEnd: weekInfo.endKey,
    playerId: playerId,
    stationKey: loggerJourneyStationKey_(stationId, stationName),
    stationId: stationId,
    stationName: stationName,
    distanceKm: distanceKm,
    etaSeconds: etaSeconds
  };
}

function applyJourneyUnitRows_(spreadsheet, unitRows, updatedAt) {
  if (!Array.isArray(unitRows) || unitRows.length === 0) return 0;
  const sheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.journeys.name);
  const width = MC_LOGGER_SHEETS.journeys.headers.length;
  const existingRows = sheet.getLastRow() >= 2
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, width).getValues()
    : [];
  const rowsByKey = {};
  existingRows.forEach(function(row, index) {
    const key = [row[0], row[3], row[4]].join('|');
    rowsByKey[key] = { rowNumber: index + 2, values: row };
  });
  const touched = {};

  unitRows.forEach(function(unitRow) {
    const contribution = missionJourneyContribution_(unitRow);
    if (!contribution) return;
    const key = [
      contribution.weekKey,
      contribution.playerId,
      contribution.stationKey
    ].join('|');
    if (!touched[key]) {
      const existing = rowsByKey[key];
      touched[key] = {
        rowNumber: existing ? existing.rowNumber : 0,
        values: existing ? existing.values.slice() : new Array(width).fill('')
      };
    }

    const row = touched[key].values;
    row[0] = contribution.weekKey;
    row[1] = contribution.periodStart;
    row[2] = contribution.periodEnd;
    row[3] = contribution.playerId;
    row[4] = contribution.stationKey;
    row[5] = contribution.stationId;
    row[6] = contribution.stationName;
    row[7] = loggerNumber_(row[7], 0) + 1;

    if (contribution.distanceKm === null) {
      row[14] = loggerNumber_(row[14], 0) + 1;
    } else {
      row[8] = Math.round(
        (loggerNumber_(row[8], 0) + contribution.distanceKm) * 1000
      ) / 1000;
      row[9] = loggerNumber_(row[9], 0) + 1;
      row[10] = Math.max(
        loggerNumber_(row[10], 0),
        contribution.distanceKm
      );
    }

    if (contribution.etaSeconds === null) {
      row[15] = loggerNumber_(row[15], 0) + 1;
    } else {
      row[11] = loggerNumber_(row[11], 0) + contribution.etaSeconds;
      row[12] = loggerNumber_(row[12], 0) + 1;
      row[13] = Math.max(
        loggerNumber_(row[13], 0),
        contribution.etaSeconds
      );
    }
    row[16] = updatedAt;
  });

  const newRows = [];
  Object.keys(touched).forEach(function(key) {
    const touchedRow = touched[key];
    if (touchedRow.rowNumber) {
      sheet.getRange(touchedRow.rowNumber, 1, 1, width)
        .setValues([touchedRow.values]);
    } else {
      newRows.push(touchedRow.values);
    }
  });
  appendRows_(sheet, newRows);
  return Object.keys(touched).length;
}

function rebuildJourneyDataFromRawIfNeeded_(spreadsheet) {
  const journeySheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.journeys.name);
  const unitSheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.units.name);
  if (journeySheet.getLastRow() >= 2 || unitSheet.getLastRow() < 2) return false;
  applyJourneyUnitRows_(spreadsheet, getDataRows_(unitSheet), new Date());
  return journeySheet.getLastRow() >= 2;
}

function createLoggerBatchChecksum_(playerId, deviceId, prepared) {
  const eventIdentities = (prepared.eventRows || []).map(function(row) {
    return [
      row[0], row[4], row[5] instanceof Date ? row[5].toISOString() : row[5],
      row[6], row[13], row[15], row[16]
    ];
  });
  const unitIdentities = (prepared.unitRows || [])
    .map(loggerUnitIdentity_)
    .sort();
  return sha256_(JSON.stringify([
    String(playerId || ''),
    String(deviceId || ''),
    eventIdentities,
    unitIdentities
  ]));
}

function findLoggerBatchLedgerRecord_(spreadsheet, batchId) {
  const sheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.batchLedger.name);
  const rowNumber = findRowByValue_(sheet, 1, batchId);
  if (!rowNumber) return null;
  return {
    rowNumber: rowNumber,
    values: sheet.getRange(
      rowNumber,
      1,
      1,
      MC_LOGGER_SHEETS.batchLedger.headers.length
    ).getValues()[0]
  };
}

function assertLoggerBatchLedgerMatch_(record, playerId, deviceId, checksum) {
  const values = record && record.values ? record.values : [];
  if (
    String(values[1] || '') !== String(playerId || '') ||
    String(values[2] || '') !== String(deviceId || '') ||
    String(values[7] || '') !== String(checksum || '')
  ) {
    throw loggerError_(
      'BATCH_CONFLICT',
      'This batch identifier was already accepted with different mission data or device identity.'
    );
  }
}

function upsertLoggerBatchLedger_(spreadsheet, batch) {
  const sheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.batchLedger.name);
  const existing = findLoggerBatchLedgerRecord_(spreadsheet, batch.batchId);
  const expiresAt = new Date(
    batch.receivedAt.getTime() +
      MC_LOGGER.batchLedgerRetentionDays * 24 * 60 * 60 * 1000
  );
  const row = [
    safeSheetText_(batch.batchId),
    safeSheetText_(batch.playerId),
    safeSheetText_(batch.deviceId),
    batch.receivedAt,
    Number(batch.eventCount || 0),
    Number(batch.unitCount || 0),
    safeSheetText_(batch.clientVersion),
    safeSheetText_(batch.batchChecksum),
    safeSheetText_(batch.status),
    expiresAt
  ];

  if (existing) {
    assertLoggerBatchLedgerMatch_(
      existing,
      batch.playerId,
      batch.deviceId,
      batch.batchChecksum
    );
    sheet.getRange(existing.rowNumber, 1, 1, row.length).setValues([row]);
  } else {
    appendRows_(sheet, [row]);
  }
}

function createLoggerDispatchFingerprint_(missionId, dispatchMode, units) {
  const selectedIds = (Array.isArray(units) ? units : [])
    .map(function(unit) {
      const value = unit && typeof unit === 'object'
        ? (unit.vehicleId || unit.vehicleName || '')
        : '';
      return cleanText_(value, 180);
    })
    .filter(function(value) { return Boolean(value); })
    .sort();

  return JSON.stringify([
    cleanIdentifier_(missionId, 80),
    cleanText_(dispatchMode, 80),
    selectedIds
  ]);
}

function readLoggerEventMetadata_(value) {
  try {
    const parsed = JSON.parse(String(value || ''));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    return {};
  }
}

function filterSemanticDuplicateDispatchRows_(eventSheet, prepared, batchId) {
  const recentByKey = {};
  const lastRow = eventSheet.getLastRow();
  const firstRow = Math.max(
    2,
    lastRow - MC_LOGGER.duplicateScanEventRows + 1
  );

  if (lastRow >= firstRow) {
    const existingRows = eventSheet.getRange(
      firstRow,
      1,
      lastRow - firstRow + 1,
      MC_LOGGER_SHEETS.events.headers.length
    ).getValues();

    existingRows.forEach(function(row) {
      if (
        String(row[1] || '') === String(batchId || '') ||
        String(row[4] || '').toLowerCase() !== 'dispatch'
      ) return;

      const metadata = readLoggerEventMetadata_(row[21]);
      const fingerprint = cleanText_(
        metadata.dispatchFingerprint,
        4000
      );
      const capturedAt = row[5] instanceof Date
        ? row[5].getTime()
        : new Date(row[5]).getTime();
      if (!fingerprint || !capturedAt) return;

      const key = [row[2], row[3], fingerprint]
        .map(function(value) { return String(value || ''); })
        .join('|');
      recentByKey[key] = recentByKey[key] || [];
      recentByKey[key].push(capturedAt);
    });
  }

  const retainedEventRows = [];
  const retainedEventIds = {};
  let suppressedDuplicateEvents = 0;

  prepared.eventRows.forEach(function(row) {
    let duplicate = false;

    if (String(row[4] || '').toLowerCase() === 'dispatch') {
      const metadata = readLoggerEventMetadata_(row[21]);
      const fingerprint = cleanText_(
        metadata.dispatchFingerprint,
        4000
      );
      const capturedAt = row[5] instanceof Date
        ? row[5].getTime()
        : new Date(row[5]).getTime();
      const key = [row[2], row[3], fingerprint]
        .map(function(value) { return String(value || ''); })
        .join('|');
      const recentTimes = recentByKey[key] || [];

      duplicate = Boolean(
        fingerprint &&
        capturedAt &&
        recentTimes.some(function(timestamp) {
          return Math.abs(capturedAt - timestamp) <
            MC_LOGGER.dispatchDuplicateWindowMs;
        })
      );

      if (!duplicate && fingerprint && capturedAt) {
        recentByKey[key] = recentTimes;
        recentTimes.push(capturedAt);
      }
    }

    if (duplicate) {
      suppressedDuplicateEvents += 1;
      return;
    }

    retainedEventRows.push(row);
    retainedEventIds[String(row[0] || '')] = true;
  });

  return {
    eventRows: retainedEventRows,
    unitRows: prepared.unitRows.filter(function(row) {
      return Boolean(retainedEventIds[String(row[0] || '')]);
    }),
    suppressedDuplicateEvents: suppressedDuplicateEvents
  };
}


function resolveActiveLoggerProfile_(spreadsheet, suppliedName) {
  const target = cleanText_(suppliedName, 120).toLowerCase();
  if (!target) {
    throw loggerError_(
      'PROFILE_REQUIRED',
      'Choose a valid logger user name.'
    );
  }

  const players = spreadsheet.getSheetByName(
    MC_LOGGER_SHEETS.players.name
  );
  const matches = getDataRows_(players)
    .map(function(values, index) {
      return {
        row: index + 2,
        playerId: cleanIdentifier_(values[0], 80),
        displayName: cleanText_(values[1], 120),
        status: String(values[2] || '').toUpperCase()
      };
    })
    .filter(function(player) {
      return player.status === 'ACTIVE' &&
        player.playerId &&
        (
          player.playerId.toLowerCase() === target ||
          player.displayName.toLowerCase() === target
        );
    });

  if (matches.length === 0) {
    throw loggerError_(
      'PROFILE_NOT_FOUND',
      'The selected logger user is not active in the private workbook Players tab.'
    );
  }
  if (matches.length > 1) {
    throw loggerError_(
      'PROFILE_AMBIGUOUS',
      'More than one active player has that logger user name.'
    );
  }
  return matches[0];
}

function upsertLoggerProfileDevice_(
  spreadsheet,
  playerId,
  deviceId,
  deviceLabel,
  clientVersion,
  timestamp
) {
  const devices = spreadsheet.getSheetByName(
    MC_LOGGER_SHEETS.devices.name
  );
  const row = findRowByValue_(devices, 1, deviceId);
  const pairedAt = row
    ? devices.getRange(row, 6).getValue() || timestamp
    : timestamp;
  const values = [
    safeSheetText_(deviceId),
    safeSheetText_(playerId),
    safeSheetText_(deviceLabel || 'MissionChief browser'),
    '',
    'ACTIVE',
    pairedAt,
    timestamp,
    timestamp,
    safeSheetText_(clientVersion)
  ];

  if (row) {
    devices.getRange(row, 1, 1, values.length)
      .setValues([values]);
    return { row: row, values: values };
  }

  devices.appendRow(values);
  return {
    row: devices.getLastRow(),
    values: values
  };
}

function authenticateLoggerDevice_(spreadsheet, playerId, deviceId, token) {
  const devices = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.devices.name);
  const rows = getDataRows_(devices);
  const tokenHash = sha256_(token);

  for (let index = 0; index < rows.length; index += 1) {
    const values = rows[index];
    if (
      String(values[0] || '') === deviceId &&
      String(values[1] || '') === playerId &&
      String(values[3] || '') === tokenHash &&
      String(values[4] || '').toUpperCase() === 'ACTIVE'
    ) {
      return { row: index + 2, values: values };
    }
  }

  throw loggerError_('UNAUTHORISED_DEVICE', 'The logger device token is invalid or revoked. Pair this browser again.');
}

function updateDeviceActivity_(spreadsheet, row, clientVersion, timestamp, uploaded) {
  const devices = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.devices.name);
  devices.getRange(row, 7).setValue(timestamp);
  if (uploaded) devices.getRange(row, 8).setValue(timestamp);
  if (clientVersion) devices.getRange(row, 9).setValue(safeSheetText_(clientVersion));
}

function updatePlayerActivity_(spreadsheet, playerId, timestamp) {
  const players = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.players.name);
  const playerRow = findRowByValue_(players, 1, playerId);
  if (!playerRow) return;

  const devices = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.devices.name);
  const activeDeviceCount = getDataRows_(devices).filter(function(values) {
    return String(values[1] || '') === playerId &&
      String(values[4] || '').toUpperCase() === 'ACTIVE';
  }).length;

  if (timestamp) players.getRange(playerRow, 5).setValue(timestamp);
  players.getRange(playerRow, 6).setValue(activeDeviceCount);
}

function appendUploadAudit_(sheet, audit) {
  appendRows_(sheet, [[
    safeSheetText_(audit.batchId),
    safeSheetText_(audit.playerId),
    safeSheetText_(audit.deviceId),
    audit.receivedAt,
    Number(audit.eventCount || 0),
    Number(audit.unitCount || 0),
    safeSheetText_(audit.clientVersion),
    audit.duplicate === true,
    safeSheetText_(audit.status),
    safeSheetText_(audit.error)
  ]]);
}

function appendRows_(sheet, rows) {
  if (!rows || rows.length === 0) return;
  ensureLoggerSheetRowCapacity_(
    sheet,
    sheet.getLastRow() + rows.length
  );
  sheet.getRange(
    sheet.getLastRow() + 1,
    1,
    rows.length,
    rows[0].length
  ).setValues(rows);
}

function createLoggerPostMessageResponse_(response, replyOrigin) {
  const responseJson = JSON.stringify(response)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const originJson = JSON.stringify(replyOrigin);
  const html = [
    '<!doctype html><html><head><meta charset="utf-8"></head><body>',
    '<script>',
    'try{window.parent.postMessage(', responseJson, ',', originJson, ');}catch(e){}',
    'try{if(window.top!==window.parent){window.top.postMessage(', responseJson, ',', originJson, ');}}catch(e){}',
    '</script>',
    '</body></html>'
  ].join('');

  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function ensureLoggerWorkbook_(spreadsheet) {
  Object.keys(MC_LOGGER_SHEETS).forEach(function(key) {
    ensureLoggerSheet_(spreadsheet, MC_LOGGER_SHEETS[key]);
  });
  rebuildJourneyDataFromRawIfNeeded_(spreadsheet);
}

function ensureLoggerSheet_(spreadsheet, definition) {
  let sheet = spreadsheet.getSheetByName(definition.name);
  if (!sheet) sheet = spreadsheet.insertSheet(definition.name);

  const width = definition.headers.length;
  if (sheet.getMaxColumns() < width) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      width - sheet.getMaxColumns()
    );
  }
  const current = sheet.getRange(1, 1, 1, width).getDisplayValues()[0];
  const hasAnyHeader = current.some(function(value) { return String(value).trim() !== ''; });

  if (hasAnyHeader) {
    let missingFrom = width;
    for (let index = 0; index < width; index += 1) {
      const value = String(current[index] || '').trim();
      if (!value) {
        missingFrom = index;
        break;
      }
      if (value !== definition.headers[index]) {
        throw new Error(
          definition.name + ' has an unexpected header in column ' + (index + 1) + '. Repair it manually before logging.'
        );
      }
    }
    for (let index = missingFrom; index < width; index += 1) {
      if (String(current[index] || '').trim()) {
        throw new Error(
          definition.name + ' has a non-contiguous header in column ' + (index + 1) + '. Repair it manually before logging.'
        );
      }
    }
    if (missingFrom < width) {
      const missingHeaders = definition.headers.slice(missingFrom);
      sheet.getRange(1, missingFrom + 1, 1, missingHeaders.length)
        .setValues([missingHeaders]);
    }
  } else {
    sheet.getRange(1, 1, 1, width).setValues([definition.headers.slice()]);
  }

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, width)
    .setFontWeight('bold')
    .setBackground('#e8eaed')
    .setFontColor('#202124');
  return sheet;
}

function ensureLoggerSheetRowCapacity_(sheet, requiredLastRow) {
  const required = Math.max(1, Number(requiredLastRow || 1));
  const current = sheet.getMaxRows();
  if (required <= current) return;
  const increase = Math.max(
    required - current,
    MC_LOGGER.liveSheetRowBuffer
  );
  sheet.insertRowsAfter(current, increase);
}

function trimLoggerSheetColumns_(sheet, width) {
  const maxColumns = sheet.getMaxColumns();
  if (maxColumns <= width) return;
  const extraRange = sheet.getRange(
    1,
    width + 1,
    Math.max(1, sheet.getLastRow()),
    maxColumns - width
  );
  if (extraRange.isBlank()) {
    sheet.deleteColumns(width + 1, maxColumns - width);
  }
}

function trimLoggerWorkbookColumns_(spreadsheet) {
  Object.keys(MC_LOGGER_SHEETS).forEach(function(key) {
    const definition = MC_LOGGER_SHEETS[key];
    const sheet = spreadsheet.getSheetByName(definition.name);
    if (sheet) trimLoggerSheetColumns_(sheet, definition.headers.length);
  });
}

function formatLoggerSheet_(sheet, definition) {
  const dataRows = Math.max(1, sheet.getMaxRows() - 1);
  definition.headers.forEach(function(header, index) {
    const name = String(header || '');
    if (/_at$/.test(name)) {
      sheet.getRange(2, index + 1, dataRows, 1)
        .setNumberFormat('dd/MM/yyyy HH:mm:ss');
      sheet.setColumnWidth(index + 1, 165);
      return;
    }
    if (/distance_km/.test(name)) {
      sheet.getRange(2, index + 1, dataRows, 1)
        .setNumberFormat('0.000');
      return;
    }
    if (/eta_seconds/.test(name)) {
      sheet.getRange(2, index + 1, dataRows, 1)
        .setNumberFormat('0');
    }
  });
}

function formatLoggerWorkbook_(spreadsheet) {
  Object.keys(MC_LOGGER_SHEETS).forEach(function(key) {
    const definition = MC_LOGGER_SHEETS[key];
    const sheet = spreadsheet.getSheetByName(definition.name);
    if (sheet) formatLoggerSheet_(sheet, definition);
  });
}

function trimLoggerSheetRows_(sheet) {
  const keepRows = Math.max(
    MC_LOGGER.liveSheetRowBuffer,
    sheet.getLastRow() + MC_LOGGER.liveSheetRowBuffer
  );
  const maxRows = sheet.getMaxRows();
  if (maxRows > keepRows) {
    sheet.deleteRows(keepRows + 1, maxRows - keepRows);
  }
}

function seedLoggerConfiguration_(spreadsheet) {
  const sheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.configuration.name);
  const existing = {};
  getDataRows_(sheet).forEach(function(values, index) {
    existing[String(values[0] || '')] = index + 2;
  });

  const seeds = [
    ['schema_version', MC_LOGGER.schemaVersion, 'Nexus logger payload schema accepted by this backend.'],
    ['backend_build', MC_LOGGER.buildId, 'Deployed Apps Script build expected by this workbook.'],
    ['identity_mode', 'PRIVATE_URL_AND_PLAYER_NAME', 'The private deployment URL plus an active Players display name authorises uploads on any browser.'],
    ['max_events_per_batch', MC_LOGGER.maxEventsPerBatch, 'Maximum events accepted in one five-minute upload.'],
    ['deployment_url', '', 'Paste the deployed Apps Script /exec URL here for the admins reference.'],
    ['actual_credit_capture', 'LIVE_EXACT_TRANSACTION_MATCH', 'Exact mission awards are matched locally against MissionChief Credits transactions; ambiguous transactions remain pending.'],
    ['dispatch_journey_metrics', 'DISTANCE_KM_AND_ETA_SECONDS', 'Stores MissionChief dispatch-time estimated route distance and arrival delay for each selected unit.'],
    ['weekly_archive_schedule', 'MONDAY_03:15_EUROPE_LONDON', 'Archives the completed ISO week after the Sunday daily backup.'],
    ['weekly_archive_cell_safety', MC_LOGGER.archiveSafetyCellThreshold, 'Schedules an early archive before the workbook reaches the Google Sheets hard limit.'],
    ['batch_ledger_retention_days', MC_LOGGER.batchLedgerRetentionDays, 'Retains compact accepted-batch identities across weekly rollovers.']
  ];

  seeds.forEach(function(row) {
    const rowNumber = existing[row[0]];
    if (!rowNumber) {
      sheet.appendRow(row);
      return;
    }
    if (row[0] !== 'deployment_url') {
      sheet.getRange(rowNumber, 2, 1, 2)
        .setValues([[row[1], row[2]]]);
    }
  });
}

function getLoggerSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty(MC_LOGGER.spreadsheetProperty);
  if (!id) {
    throw loggerError_('LOGGER_NOT_INITIALISED', 'Run Logger Admin > Initialise / repair logger first.');
  }
  return SpreadsheetApp.openById(id);
}

function getActivePlayer_(spreadsheet, playerId) {
  const players = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.players.name);
  const rows = getDataRows_(players);

  for (let index = 0; index < rows.length; index += 1) {
    const values = rows[index];
    if (String(values[0] || '') === playerId) {
      if (String(values[2] || '').toUpperCase() !== 'ACTIVE') {
        throw loggerError_('PLAYER_DISABLED', 'The logger player profile is disabled.');
      }
      return {
        row: index + 2,
        playerId: playerId,
        displayName: cleanText_(values[1] || playerId, 120)
      };
    }
  }

  throw loggerError_('PLAYER_NOT_FOUND', 'The logger player profile was not found.');
}

function createPairingForPlayer_(spreadsheet, playerId) {
  getActivePlayer_(spreadsheet, playerId);
  const pairings = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.pairings.name);
  const code = createPairingCode_();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + MC_LOGGER.pairingLifetimeHours * 60 * 60 * 1000
  );
  const pairingId = createOpaqueId_('pairing');

  pairings.appendRow([
    safeSheetText_(pairingId),
    safeSheetText_(playerId),
    sha256_(normalisePairingCode_(code)),
    'ACTIVE',
    now,
    expiresAt,
    '',
    ''
  ]);

  return {
    pairingId: pairingId,
    code: code,
    expiresAt: expiresAt
  };
}

function showPairingCode_(ui, displayName, pairing) {
  ui.alert(
    'Pairing created for ' + displayName,
    'Code: ' + pairing.code + '\n\nExpires: ' + pairing.expiresAt.toLocaleString('en-GB', { timeZone: 'Europe/London' }) + '\n\nThis code is shown once and becomes invalid immediately after use.',
    ui.ButtonSet.OK
  );
}

function createPlayerId_(displayName) {
  const slug = String(displayName || 'player')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'player';
  return slug + '-' + randomReadableString_(4).toLowerCase();
}

function createPairingCode_() {
  const value = randomReadableString_(12);
  return value.slice(0, 4) + '-' + value.slice(4, 8) + '-' + value.slice(8, 12);
}

function normalisePairingCode_(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function randomReadableString_(length) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let seed = '';
  while (seed.length < length * 2) {
    seed += Utilities.getUuid().replace(/-/g, '').toUpperCase();
  }
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed);
  let output = '';
  for (let index = 0; index < length; index += 1) {
    output += alphabet.charAt((digest[index] & 255) % alphabet.length);
  }
  return output;
}

function createUploadToken_() {
  const raw = Utilities.getUuid() + Utilities.getUuid() + new Date().getTime();
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw);
  return Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, '');
}

function createOpaqueId_(prefix) {
  return cleanIdentifier_(prefix, 40) + '-' + Utilities.getUuid();
}

function sha256_(value) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ''),
    Utilities.Charset.UTF_8
  );
  return digest.map(function(byte) {
    return (byte & 255).toString(16).padStart(2, '0');
  }).join('');
}

function cleanIdentifier_(value, maxLength) {
  return String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9_-]/g, '')
    .slice(0, maxLength || 160);
}

function cleanText_(value, maxLength) {
  return String(value == null ? '' : value)
    .replace(/\u00a0/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength || 500);
}

function safeSheetText_(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function safeJson_(value) {
  let json = '{}';
  try {
    json = JSON.stringify(value == null ? null : value);
  } catch (error) {
    json = JSON.stringify({ serialisationError: cleanText_(error.message, 200) });
  }
  return json.slice(0, 45000);
}

function cleanNumberOrBlank_(value, minimum, maximum) {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return '';
  return Math.max(minimum, Math.min(maximum, number));
}

function parseLoggerDate_(value) {
  const date = new Date(String(value || ''));
  if (!date.getTime()) {
    throw loggerError_('INVALID_EVENT_DATE', 'A logger event timestamp is invalid.');
  }
  return date;
}

function cleanMissionUrl_(value) {
  const match = String(value || '').trim().match(
    /^https:\/\/([^\/?#]+)\/missions\/(\d+)\/?(?:[?#].*)?$/i
  );
  if (!match) return '';

  const origin = 'https://' + String(match[1] || '').toLowerCase();
  if (MC_LOGGER.allowedReplyOrigins.indexOf(origin) < 0) return '';

  return origin + '/missions/' + match[2];
}

function isAllowedReplyOrigin_(origin) {
  return MC_LOGGER.allowedReplyOrigins.indexOf(String(origin || '')) >= 0;
}

function loggerError_(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function getDataRows_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn < 1) return [];
  return sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
}

function findRowByValue_(sheet, column, value) {
  const rows = findAllRowsByValue_(sheet, column, value);
  return rows.length ? rows[0] : 0;
}

function findAllRowsByValue_(sheet, column, value) {
  if (sheet.getLastRow() < 2) return [];
  return sheet
    .getRange(2, column, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(value || ''))
    .matchEntireCell(true)
    .findAll()
    .map(function(range) { return range.getRow(); });
}

function getRowsByColumnValue_(sheet, column, value) {
  const rowNumbers = findAllRowsByValue_(sheet, column, value);
  if (rowNumbers.length === 0) return [];

  const firstRow = Math.min.apply(null, rowNumbers);
  const lastRow = Math.max.apply(null, rowNumbers);
  const values = sheet
    .getRange(firstRow, 1, lastRow - firstRow + 1, sheet.getLastColumn())
    .getValues();

  return rowNumbers.map(function(rowNumber) {
    return values[rowNumber - firstRow];
  });
}

function countLoggerRowIdentities_(rows, identityFunction) {
  return rows.reduce(function(counts, row) {
    const identity = identityFunction(row);
    counts[identity] = (counts[identity] || 0) + 1;
    return counts;
  }, {});
}

function loggerUnitIdentity_(row) {
  const eventId = String(row[0] || '');
  const vehicleId = String(row[6] || '');
  if (vehicleId) return eventId + '|vehicle:' + vehicleId;

  return [eventId, row[7], row[8], row[10], row[11], row[12]]
    .map(function(value) { return String(value || ''); })
    .join('|');
}

function clearLoggerSheetData_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow >= 2 && lastColumn >= 1) {
    sheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent();
  }
  ensureLoggerSheetRowCapacity_(sheet, MC_LOGGER.liveSheetRowBuffer);
  trimLoggerSheetRows_(sheet);
}

function rebuildMissionSummaryFromRawIfNeeded_(spreadsheet) {
  const summarySheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.summaries.name);
  const eventSheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.events.name);
  if (summarySheet.getLastRow() >= 2 || eventSheet.getLastRow() < 2) return false;

  const changes = upsertMissionSummaryRows_(
    spreadsheet,
    getDataRows_(eventSheet),
    getDataRows_(spreadsheet.getSheetByName(MC_LOGGER_SHEETS.units.name)),
    new Date()
  );
  applyDashboardSummaryChanges_(spreadsheet, changes, new Date());
  return changes.length > 0;
}

function rebuildMissionChiefMissionSummary() {
  const ui = SpreadsheetApp.getUi();
  const confirmation = ui.alert(
    'Rebuild mission summary',
    'This rebuilds Mission Summary, Dashboard Data and Journey Data from the raw rows currently held in this live workbook. Weekly archive files are not modified.',
    ui.ButtonSet.OK_CANCEL
  );
  if (confirmation !== ui.Button.OK) return;

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const spreadsheet = getLoggerSpreadsheet_();
    ensureLoggerWorkbook_(spreadsheet);
    const summarySheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.summaries.name);
    const dashboardSheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.dashboard.name);
    const journeySheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.journeys.name);
    clearLoggerSheetData_(summarySheet);
    clearLoggerSheetData_(dashboardSheet);
    clearLoggerSheetData_(journeySheet);
    const now = new Date();
    const rawUnitRows = getDataRows_(
      spreadsheet.getSheetByName(MC_LOGGER_SHEETS.units.name)
    );
    const changes = upsertMissionSummaryRows_(
      spreadsheet,
      getDataRows_(spreadsheet.getSheetByName(MC_LOGGER_SHEETS.events.name)),
      rawUnitRows,
      now
    );
    applyDashboardSummaryChanges_(spreadsheet, changes, now);
    applyJourneyUnitRows_(spreadsheet, rawUnitRows, now);
    SpreadsheetApp.flush();
    ui.alert(
      'Mission summary rebuilt',
      changes.length + ' mission summaries are available and Dashboard Data plus Journey Data have been refreshed.',
      ui.ButtonSet.OK
    );
  } finally {
    lock.releaseLock();
  }
}

function resolveLoggerRootFolder_(spreadsheet) {
  try {
    const parents = DriveApp.getFileById(spreadsheet.getId()).getParents();
    return parents.hasNext() ? parents.next() : null;
  } catch (error) {
    return null;
  }
}

function getOrCreateChildFolder_(parent, name) {
  const folders = parent.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parent.createFolder(name);
}

function loggerDateKeyFromUtcDate_(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0')
  ].join('-');
}

function addLoggerCalendarDays_(dateKey, days) {
  const date = new Date(String(dateKey) + 'T00:00:00.000Z');
  date.setUTCDate(date.getUTCDate() + Number(days || 0));
  return loggerDateKeyFromUtcDate_(date);
}

function getLoggerIsoWeekInfo_(value) {
  const date = loggerDateOrNull_(value) || new Date();
  const localDateKey = Utilities.formatDate(
    date,
    MC_LOGGER.timezone,
    'yyyy-MM-dd'
  );
  const localDate = new Date(localDateKey + 'T00:00:00.000Z');
  const mondayIndex = (localDate.getUTCDay() + 6) % 7;
  const monday = new Date(localDate.getTime());
  monday.setUTCDate(monday.getUTCDate() - mondayIndex);
  const thursday = new Date(monday.getTime());
  thursday.setUTCDate(thursday.getUTCDate() + 3);
  const isoYear = thursday.getUTCFullYear();
  const januaryFourth = new Date(Date.UTC(isoYear, 0, 4));
  const januaryFourthIndex = (januaryFourth.getUTCDay() + 6) % 7;
  const firstMonday = new Date(januaryFourth.getTime());
  firstMonday.setUTCDate(firstMonday.getUTCDate() - januaryFourthIndex);
  const weekNumber = 1 + Math.round(
    (monday.getTime() - firstMonday.getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );
  const startKey = loggerDateKeyFromUtcDate_(monday);

  return {
    weekKey: isoYear + '-W' + String(weekNumber).padStart(2, '0'),
    startKey: startKey,
    endKey: addLoggerCalendarDays_(startKey, 6),
    endExclusiveKey: addLoggerCalendarDays_(startKey, 7)
  };
}

function parseLoggerLocalMidnight_(dateKey) {
  return Utilities.parseDate(
    String(dateKey) + ' 00:00:00',
    MC_LOGGER.timezone,
    'yyyy-MM-dd HH:mm:ss'
  );
}

function getLoggerCurrentWeekCutoff_(now) {
  return parseLoggerLocalMidnight_(getLoggerIsoWeekInfo_(now).startKey);
}

function getLoggerUpcomingWeekCutoff_(now) {
  const info = getLoggerIsoWeekInfo_(now);
  return parseLoggerLocalMidnight_(info.endExclusiveKey);
}

function getLoggerWeeklyArchiveFolder_(spreadsheet) {
  const properties = PropertiesService.getScriptProperties();
  const storedId = properties.getProperty(MC_LOGGER.weeklyArchiveFolderProperty);
  if (storedId) {
    try {
      return DriveApp.getFolderById(storedId);
    } catch (error) {}
  }

  const root = resolveLoggerRootFolder_(spreadsheet);
  if (!root) throw new Error('The logger root folder could not be resolved.');
  const folder = getOrCreateChildFolder_(root, 'Weekly Archives');
  properties.setProperty(MC_LOGGER.weeklyArchiveFolderProperty, folder.getId());
  return folder;
}

function configureLoggerArchiveSpreadsheet_(archive) {
  const definitions = [
    MC_LOGGER_SHEETS.summaries,
    MC_LOGGER_SHEETS.events,
    MC_LOGGER_SHEETS.units,
    MC_LOGGER_SHEETS.uploads,
    MC_LOGGER_ARCHIVE_MANIFEST
  ];
  const existingSheets = archive.getSheets();
  if (
    existingSheets.length === 1 &&
    definitions.every(function(definition) {
      return !archive.getSheetByName(definition.name);
    })
  ) {
    existingSheets[0].setName(definitions[0].name);
  }

  definitions.forEach(function(definition) {
    const sheet = ensureLoggerSheet_(archive, definition);
    trimLoggerSheetColumns_(sheet, definition.headers.length);
    formatLoggerSheet_(sheet, definition);
  });
  archive.setSpreadsheetTimeZone(MC_LOGGER.timezone);
}

function loggerArchiveName_(weekInfo) {
  return 'MissionChief User Logger - ' + weekInfo.weekKey +
    ' - ' + weekInfo.startKey + ' to ' + weekInfo.endKey;
}

function getArchiveIndexRecord_(spreadsheet, weekKey) {
  const sheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.archives.name);
  const rowNumber = findRowByValue_(sheet, 1, weekKey);
  if (!rowNumber) return null;
  return {
    rowNumber: rowNumber,
    values: sheet.getRange(
      rowNumber,
      1,
      1,
      MC_LOGGER_SHEETS.archives.headers.length
    ).getValues()[0]
  };
}

function getOrCreateLoggerWeeklyArchive_(spreadsheet, weekInfo) {
  const existingIndex = getArchiveIndexRecord_(spreadsheet, weekInfo.weekKey);
  if (existingIndex && existingIndex.values[3]) {
    try {
      const existingArchive = SpreadsheetApp.openById(String(existingIndex.values[3]));
      configureLoggerArchiveSpreadsheet_(existingArchive);
      return {
        spreadsheet: existingArchive,
        indexRecord: existingIndex,
        created: false
      };
    } catch (error) {}
  }

  const folder = getLoggerWeeklyArchiveFolder_(spreadsheet);
  const name = loggerArchiveName_(weekInfo);
  const matchingFiles = folder.getFilesByName(name);
  if (matchingFiles.hasNext()) {
    const file = matchingFiles.next();
    const archive = SpreadsheetApp.openById(file.getId());
    configureLoggerArchiveSpreadsheet_(archive);
    return {
      spreadsheet: archive,
      indexRecord: existingIndex,
      created: false
    };
  }

  const archive = SpreadsheetApp.create(name);
  DriveApp.getFileById(archive.getId()).moveTo(folder);
  configureLoggerArchiveSpreadsheet_(archive);
  return {
    spreadsheet: archive,
    indexRecord: existingIndex,
    created: true
  };
}

function loggerArchiveRowIdentity_(definitionKey, row) {
  if (definitionKey === 'summaries') return String(row[0] || '');
  if (definitionKey === 'events') return String(row[0] || '');
  if (definitionKey === 'units') return loggerUnitIdentity_(row);
  if (definitionKey === 'uploads') {
    const receivedAt = loggerDateOrNull_(row[3]);
    return [
      row[0],
      receivedAt ? receivedAt.toISOString() : row[3],
      row[8],
      row[7]
    ].map(String).join('|');
  }
  return '';
}

function readLoggerArchiveIdentities_(sheet, definitionKey, width) {
  const identities = {};
  const lastRow = sheet.getLastRow();
  for (let start = 2; start <= lastRow; start += MC_LOGGER.archiveChunkRows) {
    const count = Math.min(MC_LOGGER.archiveChunkRows, lastRow - start + 1);
    const rows = sheet.getRange(start, 1, count, width).getValues();
    rows.forEach(function(row, offset) {
      const identity = loggerArchiveRowIdentity_(definitionKey, row);
      if (identity) identities[identity] = start + offset;
    });
  }
  return identities;
}

function getLoggerArchiveContext_(liveSpreadsheet, weekInfo, contexts) {
  if (contexts[weekInfo.weekKey]) return contexts[weekInfo.weekKey];
  const resolved = getOrCreateLoggerWeeklyArchive_(liveSpreadsheet, weekInfo);
  const context = {
    weekInfo: weekInfo,
    spreadsheet: resolved.spreadsheet,
    indexRecord: resolved.indexRecord,
    created: resolved.created,
    identities: {},
    expected: {},
    copied: {},
    sourceRows: {}
  };
  contexts[weekInfo.weekKey] = context;
  return context;
}

function upsertLoggerArchiveRows_(context, definitionKey, definition, rows) {
  if (!rows || rows.length === 0) return;
  const sheet = context.spreadsheet.getSheetByName(definition.name);
  const width = definition.headers.length;
  if (!context.identities[definitionKey]) {
    context.identities[definitionKey] = readLoggerArchiveIdentities_(
      sheet,
      definitionKey,
      width
    );
  }
  if (!context.expected[definitionKey]) context.expected[definitionKey] = {};
  if (!context.copied[definitionKey]) context.copied[definitionKey] = 0;
  if (!context.sourceRows[definitionKey]) context.sourceRows[definitionKey] = 0;

  const identities = context.identities[definitionKey];
  const newRows = [];
  rows.forEach(function(row) {
    const identity = loggerArchiveRowIdentity_(definitionKey, row);
    if (!identity) return;
    context.expected[definitionKey][identity] = true;
    context.sourceRows[definitionKey] += 1;
    const existingRow = identities[identity];
    if (existingRow && definitionKey === 'summaries') {
      sheet.getRange(existingRow, 1, 1, width).setValues([row]);
      return;
    }
    if (existingRow) return;
    newRows.push(row);
  });

  if (newRows.length > 0) {
    const firstNewRow = sheet.getLastRow() + 1;
    appendRows_(sheet, newRows);
    newRows.forEach(function(row, index) {
      identities[loggerArchiveRowIdentity_(definitionKey, row)] = firstNewRow + index;
    });
    context.copied[definitionKey] += newRows.length;
  }
}

function loggerArchiveDateForRow_(definitionKey, row) {
  if (definitionKey === 'summaries') {
    return loggerDateOrNull_(row[8]) ||
      loggerDateOrNull_(row[7]) ||
      loggerDateOrNull_(row[22]);
  }
  if (definitionKey === 'events' || definitionKey === 'units') {
    return loggerDateOrNull_(row[5]);
  }
  if (definitionKey === 'uploads') return loggerDateOrNull_(row[3]);
  return null;
}

function shouldPurgeLoggerSummaryRow_(row, cutoff) {
  const completedAt = loggerDateOrNull_(row[9]);
  const dispatchedAt = loggerDateOrNull_(row[8]);
  if (completedAt || !dispatchedAt) return true;
  return dispatchedAt.getTime() <
    cutoff.getTime() - MC_LOGGER.summaryStaleDays * 24 * 60 * 60 * 1000;
}

function collectLoggerRowsForArchive_(
  liveSpreadsheet,
  definitionKey,
  definition,
  cutoff,
  contexts,
  purge
) {
  const source = liveSpreadsheet.getSheetByName(definition.name);
  const width = definition.headers.length;
  const lastRow = source.getLastRow();
  const rowsToDelete = [];

  for (let start = 2; start <= lastRow; start += MC_LOGGER.archiveChunkRows) {
    const count = Math.min(MC_LOGGER.archiveChunkRows, lastRow - start + 1);
    const rows = source.getRange(start, 1, count, width).getValues();
    const grouped = {};

    rows.forEach(function(row, offset) {
      const archiveDate = loggerArchiveDateForRow_(definitionKey, row);
      if (!archiveDate || archiveDate.getTime() >= cutoff.getTime()) return;
      const weekInfo = getLoggerIsoWeekInfo_(archiveDate);
      grouped[weekInfo.weekKey] = grouped[weekInfo.weekKey] || {
        weekInfo: weekInfo,
        rows: []
      };
      grouped[weekInfo.weekKey].rows.push(row);
      if (
        purge &&
        (
          definitionKey !== 'summaries' ||
          shouldPurgeLoggerSummaryRow_(row, cutoff)
        )
      ) {
        rowsToDelete.push(start + offset);
      }
    });

    Object.keys(grouped).forEach(function(weekKey) {
      const group = grouped[weekKey];
      const context = getLoggerArchiveContext_(
        liveSpreadsheet,
        group.weekInfo,
        contexts
      );
      upsertLoggerArchiveRows_(
        context,
        definitionKey,
        definition,
        group.rows
      );
    });
  }

  return rowsToDelete;
}

function verifyLoggerArchiveContext_(context) {
  SpreadsheetApp.flush();
  const definitions = {
    summaries: MC_LOGGER_SHEETS.summaries,
    events: MC_LOGGER_SHEETS.events,
    units: MC_LOGGER_SHEETS.units,
    uploads: MC_LOGGER_SHEETS.uploads
  };

  Object.keys(context.expected).forEach(function(definitionKey) {
    const definition = definitions[definitionKey];
    const sheet = context.spreadsheet.getSheetByName(definition.name);
    const verified = readLoggerArchiveIdentities_(
      sheet,
      definitionKey,
      definition.headers.length
    );
    const missing = Object.keys(context.expected[definitionKey]).filter(function(identity) {
      return !verified[identity];
    });
    if (missing.length > 0) {
      throw new Error(
        context.weekInfo.weekKey + ' archive verification failed for ' +
        definition.name + ': ' + missing.length + ' row identities are missing.'
      );
    }
    context.identities[definitionKey] = verified;
  });
}

function countLoggerSpreadsheetCells_(spreadsheet) {
  return spreadsheet.getSheets().reduce(function(total, sheet) {
    return total + sheet.getMaxRows() * sheet.getMaxColumns();
  }, 0);
}

function updateLoggerArchiveManifest_(context, sourceSpreadsheet, status, timestamp) {
  const sheet = context.spreadsheet.getSheetByName(MC_LOGGER_ARCHIVE_MANIFEST.name);
  const row = [
    context.weekInfo.weekKey,
    context.weekInfo.startKey,
    context.weekInfo.endKey,
    sourceSpreadsheet.getId(),
    context.spreadsheet.getId(),
    MC_LOGGER.schemaVersion,
    status,
    context.created ? timestamp : (sheet.getRange(2, 8).getValue() || timestamp),
    timestamp
  ];
  if (sheet.getLastRow() >= 2) {
    sheet.getRange(2, 1, 1, row.length).setValues([row]);
  } else {
    appendRows_(sheet, [row]);
  }
}

function updateLoggerArchiveIndex_(liveSpreadsheet, context, status, timestamp, purged, notes) {
  const sheet = liveSpreadsheet.getSheetByName(MC_LOGGER_SHEETS.archives.name);
  const existing = getArchiveIndexRecord_(liveSpreadsheet, context.weekInfo.weekKey);
  const archive = context.spreadsheet;
  const counts = {
    summaries: Math.max(0, archive.getSheetByName(MC_LOGGER_SHEETS.summaries.name).getLastRow() - 1),
    events: Math.max(0, archive.getSheetByName(MC_LOGGER_SHEETS.events.name).getLastRow() - 1),
    units: Math.max(0, archive.getSheetByName(MC_LOGGER_SHEETS.units.name).getLastRow() - 1),
    uploads: Math.max(0, archive.getSheetByName(MC_LOGGER_SHEETS.uploads.name).getLastRow() - 1)
  };
  const row = [
    context.weekInfo.weekKey,
    context.weekInfo.startKey,
    context.weekInfo.endKey,
    archive.getId(),
    archive.getUrl(),
    status,
    counts.summaries,
    counts.events,
    counts.units,
    counts.uploads,
    existing ? existing.values[10] : timestamp,
    timestamp,
    purged ? timestamp : (existing ? existing.values[12] : ''),
    countLoggerSpreadsheetCells_(archive),
    safeSheetText_(notes || '')
  ];

  if (existing) {
    sheet.getRange(existing.rowNumber, 1, 1, row.length).setValues([row]);
  } else {
    appendRows_(sheet, [row]);
  }
}

function deleteLoggerRowsByNumber_(sheet, rowNumbers) {
  if (!Array.isArray(rowNumbers) || rowNumbers.length === 0) return 0;
  const uniqueDescending = Array.from(new Set(rowNumbers))
    .sort(function(left, right) { return right - left; });
  let deleted = 0;
  let rangeHigh = uniqueDescending[0];
  let rangeLow = rangeHigh;

  const flushRange = function() {
    sheet.deleteRows(rangeLow, rangeHigh - rangeLow + 1);
    deleted += rangeHigh - rangeLow + 1;
  };

  for (let index = 1; index < uniqueDescending.length; index += 1) {
    const row = uniqueDescending[index];
    if (row === rangeLow - 1) {
      rangeLow = row;
    } else {
      flushRange();
      rangeHigh = row;
      rangeLow = row;
    }
  }
  flushRange();
  return deleted;
}

function pruneLoggerBatchLedger_(spreadsheet, now) {
  const sheet = spreadsheet.getSheetByName(MC_LOGGER_SHEETS.batchLedger.name);
  if (sheet.getLastRow() < 2) return 0;
  const expiries = sheet.getRange(2, 10, sheet.getLastRow() - 1, 1).getValues();
  const rows = [];
  expiries.forEach(function(values, index) {
    const expiresAt = loggerDateOrNull_(values[0]);
    if (expiresAt && expiresAt.getTime() < now.getTime()) rows.push(index + 2);
  });
  return deleteLoggerRowsByNumber_(sheet, rows);
}

function archiveMissionChiefLoggerBefore_(cutoff, options) {
  const settings = options || {};
  const purge = settings.purge === true;
  const mode = cleanText_(settings.mode || 'WEEKLY', 40);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const liveSpreadsheet = getLoggerSpreadsheet_();
    ensureLoggerWorkbook_(liveSpreadsheet);
    rebuildMissionSummaryFromRawIfNeeded_(liveSpreadsheet);
    const contexts = {};
    const deletions = {};
    const definitions = [
      ['summaries', MC_LOGGER_SHEETS.summaries],
      ['events', MC_LOGGER_SHEETS.events],
      ['units', MC_LOGGER_SHEETS.units],
      ['uploads', MC_LOGGER_SHEETS.uploads]
    ];

    definitions.forEach(function(entry) {
      deletions[entry[0]] = collectLoggerRowsForArchive_(
        liveSpreadsheet,
        entry[0],
        entry[1],
        cutoff,
        contexts,
        purge
      );
    });

    const timestamp = new Date();
    Object.keys(contexts).forEach(function(weekKey) {
      const context = contexts[weekKey];
      verifyLoggerArchiveContext_(context);
      const status = purge ? 'VERIFIED_PENDING_PURGE' : 'TEST_VERIFIED';
      updateLoggerArchiveManifest_(context, liveSpreadsheet, status, timestamp);
      updateLoggerArchiveIndex_(
        liveSpreadsheet,
        context,
        status,
        timestamp,
        false,
        mode + (purge ? ' copy verified; source purge pending.' : ' copy-only verification.')
      );
    });
    SpreadsheetApp.flush();

    let deletedRows = 0;
    if (purge) {
      ['units', 'events', 'uploads', 'summaries'].forEach(function(definitionKey) {
        const definition = MC_LOGGER_SHEETS[definitionKey];
        const sheet = liveSpreadsheet.getSheetByName(definition.name);
        deletedRows += deleteLoggerRowsByNumber_(sheet, deletions[definitionKey]);
        trimLoggerSheetRows_(sheet);
      });
      pruneLoggerBatchLedger_(liveSpreadsheet, timestamp);
      Object.keys(contexts).forEach(function(weekKey) {
        const context = contexts[weekKey];
        updateLoggerArchiveManifest_(context, liveSpreadsheet, 'VERIFIED_PURGED', timestamp);
        updateLoggerArchiveIndex_(
          liveSpreadsheet,
          context,
          'VERIFIED_PURGED',
          timestamp,
          true,
          mode + ' archive verified before ' + deletedRows + ' live rows were removed.'
        );
      });
    }

    SpreadsheetApp.flush();
    return {
      cutoff: cutoff,
      purge: purge,
      mode: mode,
      archiveWeeks: Object.keys(contexts),
      deletedRows: deletedRows,
      liveCellCount: countLoggerSpreadsheetCells_(liveSpreadsheet)
    };
  } finally {
    lock.releaseLock();
  }
}

function previewLoggerArchiveCounts_(spreadsheet, cutoff) {
  const definitions = [
    ['summaries', MC_LOGGER_SHEETS.summaries],
    ['events', MC_LOGGER_SHEETS.events],
    ['units', MC_LOGGER_SHEETS.units],
    ['uploads', MC_LOGGER_SHEETS.uploads]
  ];
  const counts = {};
  definitions.forEach(function(entry) {
    const key = entry[0];
    const definition = entry[1];
    const sheet = spreadsheet.getSheetByName(definition.name);
    let count = 0;
    if (sheet.getLastRow() >= 2) {
      for (let start = 2; start <= sheet.getLastRow(); start += MC_LOGGER.archiveChunkRows) {
        const size = Math.min(MC_LOGGER.archiveChunkRows, sheet.getLastRow() - start + 1);
        const rows = sheet.getRange(start, 1, size, definition.headers.length).getValues();
        rows.forEach(function(row) {
          const date = loggerArchiveDateForRow_(key, row);
          if (date && date.getTime() < cutoff.getTime()) count += 1;
        });
      }
    }
    counts[key] = count;
  });
  counts.estimatedCells =
    counts.summaries * MC_LOGGER_SHEETS.summaries.headers.length +
    counts.events * MC_LOGGER_SHEETS.events.headers.length +
    counts.units * MC_LOGGER_SHEETS.units.headers.length +
    counts.uploads * MC_LOGGER_SHEETS.uploads.headers.length;
  return counts;
}

function installMissionChiefWeeklyArchiveTrigger() {
  const existing = ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction() === 'runMissionChiefWeeklyArchive';
  });
  if (!existing) {
    ScriptApp.newTrigger('runMissionChiefWeeklyArchive')
      .timeBased()
      .everyWeeks(1)
      .onWeekDay(ScriptApp.WeekDay.MONDAY)
      .atHour(3)
      .nearMinute(15)
      .inTimezone(MC_LOGGER.timezone)
      .create();
  }
  SpreadsheetApp.getUi().alert(
    existing
      ? 'The Monday weekly archive trigger is already installed.'
      : 'Weekly archive installed for approximately 03:15 every Monday, after the daily backup.'
  );
}

function previewMissionChiefWeeklyArchive() {
  const spreadsheet = getLoggerSpreadsheet_();
  ensureLoggerWorkbook_(spreadsheet);
  rebuildMissionSummaryFromRawIfNeeded_(spreadsheet);
  const cutoff = getLoggerUpcomingWeekCutoff_(new Date());
  const counts = previewLoggerArchiveCounts_(spreadsheet, cutoff);
  SpreadsheetApp.getUi().alert(
    'Tonight\'s weekly rollover preview',
    [
      'Cutoff: ' + cutoff.toLocaleString('en-GB', { timeZone: MC_LOGGER.timezone }),
      'Mission Summary: ' + counts.summaries,
      'Mission Events: ' + counts.events,
      'Dispatch Units: ' + counts.units,
      'Uploads: ' + counts.uploads,
      'Estimated populated archive cells: ' + counts.estimatedCells,
      'Live workbook allocated cells: ' + countLoggerSpreadsheetCells_(spreadsheet)
    ].join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function testMissionChiefWeeklyArchiveCopy() {
  const ui = SpreadsheetApp.getUi();
  const confirmation = ui.alert(
    'Test weekly archive copy',
    'This creates or updates the real weekly archive and verifies every copied row identity. It does not delete anything from the live workbook.',
    ui.ButtonSet.OK_CANCEL
  );
  if (confirmation !== ui.Button.OK) return;
  const result = archiveMissionChiefLoggerBefore_(
    getLoggerUpcomingWeekCutoff_(new Date()),
    { purge: false, mode: 'SUNDAY_TEST' }
  );
  ui.alert(
    'Archive test passed',
    'Verified weeks: ' + (result.archiveWeeks.join(', ') || 'none') +
      '\nLive rows deleted: 0' +
      '\nLive allocated cells: ' + result.liveCellCount,
    ui.ButtonSet.OK
  );
}

function runMissionChiefWeeklyArchive() {
  return archiveMissionChiefLoggerBefore_(
    getLoggerCurrentWeekCutoff_(new Date()),
    { purge: true, mode: 'WEEKLY' }
  );
}

function runMissionChiefWeeklyArchiveNow() {
  const ui = SpreadsheetApp.getUi();
  const confirmation = ui.alert(
    'Run due weekly rollover',
    'This archives and removes only rows older than the start of the current ISO week. Copy verification must pass before any live rows are deleted.',
    ui.ButtonSet.OK_CANCEL
  );
  if (confirmation !== ui.Button.OK) return;
  const result = runMissionChiefWeeklyArchive();
  ui.alert(
    'Weekly rollover complete',
    'Archived weeks: ' + (result.archiveWeeks.join(', ') || 'none due') +
      '\nLive rows deleted: ' + result.deletedRows +
      '\nLive allocated cells: ' + result.liveCellCount,
    ui.ButtonSet.OK
  );
}

function scheduleMissionChiefEmergencyArchiveIfNeeded_(spreadsheet) {
  if (countLoggerSpreadsheetCells_(spreadsheet) < MC_LOGGER.archiveSafetyCellThreshold) return false;
  const existing = ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction() === 'runMissionChiefEmergencyArchive';
  });
  if (!existing) {
    ScriptApp.newTrigger('runMissionChiefEmergencyArchive')
      .timeBased()
      .after(60 * 1000)
      .create();
  }
  return true;
}

function runMissionChiefEmergencyArchive() {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000);
  return archiveMissionChiefLoggerBefore_(
    cutoff,
    { purge: true, mode: 'EMERGENCY_CELL_LIMIT' }
  );
}

function installMissionChiefDailyBackupTrigger() {
  const existing = ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction() === 'createMissionChiefDailyBackup';
  });

  if (!existing) {
    ScriptApp.newTrigger('createMissionChiefDailyBackup')
      .timeBased()
      .atHour(2)
      .everyDays(1)
      .inTimezone('Europe/London')
      .create();
  }

  SpreadsheetApp.getUi().alert(
    existing
      ? 'The daily backup trigger is already installed.'
      : 'Daily raw JSON backup installed for approximately 02:00 Europe/London.'
  );
}

function createMissionChiefDailyBackup() {
  const spreadsheet = getLoggerSpreadsheet_();
  ensureLoggerWorkbook_(spreadsheet);
  const timezone = 'Europe/London';
  const now = new Date();
  const day = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dayKey = Utilities.formatDate(day, timezone, 'yyyy-MM-dd');
  const payload = {
    format: 'missionchief-nexus-daily-log',
    schemaVersion: MC_LOGGER.schemaVersion,
    day: dayKey,
    createdAt: now.toISOString(),
    events: rowsForBackupDay_(
      spreadsheet.getSheetByName(MC_LOGGER_SHEETS.events.name),
      'received_at',
      dayKey,
      timezone
    ),
    dispatchUnits: rowsForBackupDay_(
      spreadsheet.getSheetByName(MC_LOGGER_SHEETS.units.name),
      'captured_at',
      dayKey,
      timezone
    ),
    uploads: rowsForBackupDay_(
      spreadsheet.getSheetByName(MC_LOGGER_SHEETS.uploads.name),
      'received_at',
      dayKey,
      timezone
    )
  };

  const properties = PropertiesService.getScriptProperties();
  let folderId = properties.getProperty(MC_LOGGER.backupFolderProperty);
  let folder;

  if (folderId) {
    try { folder = DriveApp.getFolderById(folderId); } catch (error) {}
  }
  if (!folder) {
    const root = resolveLoggerRootFolder_(spreadsheet);
    if (!root) throw new Error('The logger backup folder could not be resolved.');
    folder = getOrCreateChildFolder_(root, 'Raw Daily Backups');
    properties.setProperty(MC_LOGGER.backupFolderProperty, folder.getId());
  }

  const fileName = 'MissionChief-User-Logger-' + dayKey + '.json';
  const content = JSON.stringify(payload, null, 2);
  const existing = folder.getFilesByName(fileName);
  if (existing.hasNext()) {
    existing.next().setContent(content);
  } else {
    folder.createFile(fileName, content, MimeType.PLAIN_TEXT);
  }
}

function rowsForBackupDay_(sheet, dateHeader, dayKey, timezone) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2) return [];

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const headers = values[0].map(String);
  const dateIndex = headers.indexOf(dateHeader);
  if (dateIndex < 0) return [];

  return values.slice(1).filter(function(row) {
    const date = row[dateIndex] instanceof Date
      ? row[dateIndex]
      : new Date(row[dateIndex]);
    return date.getTime() && Utilities.formatDate(date, timezone, 'yyyy-MM-dd') === dayKey;
  }).map(function(row) {
    const object = {};
    headers.forEach(function(header, index) {
      const value = row[index];
      object[header] = value instanceof Date ? value.toISOString() : value;
    });
    return object;
  });
}

function findActivePlayerByDisplayName_(sheet, displayName) {
  if (!sheet || sheet.getLastRow() < 2) return null;
  const target = cleanText_(displayName, 120).toLowerCase();
  if (!target) return null;

  const rows = sheet.getRange(
    2,
    1,
    sheet.getLastRow() - 1,
    3
  ).getValues();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (String(row[2] || '').toUpperCase() !== 'ACTIVE') continue;
    const candidate = cleanText_(row[1], 120).toLowerCase();
    if (candidate === target) {
      return {
        rowNumber: index + 2,
        playerId: String(row[0] || '')
      };
    }
  }
  return null;
}
