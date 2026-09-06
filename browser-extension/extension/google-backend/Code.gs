// Nexus extension logger 3.0.43.8. Durable asynchronous imports and batched reports.
const NX_FOLDER = 'CONFIGURE_PRIVATE_FOLDER_ID';
const NX_SHEET = 'CONFIGURE_PRIVATE_SHEET_ID';
const NX_TAB = 'Extension Events';
const NX_COLUMNS = ['Event ID','Time (UTC)','Username','Player ID','Device ID','Session ID','Event','Mission ID','Mission name','Category','Phase','Stage','Reason','Outcome','Elapsed ms','Heap bytes','Selected','Remaining','Batch ID'];
const NX_WEEK = 7 * 86400000;
function nxJson(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function nxHash(text) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text).map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join(''); }
function nxFolder(parent, name) { const files = parent.getFoldersByName(name); return files.hasNext() ? files.next() : parent.createFolder(name); }
// JSON object member order is not schema. Extension storage may reconstruct
// dictionaries in a different order. Keep values, keys and array order strict.
function nxSameRecord(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v,i) => nxSameRecord(v,b[i]));
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every(k => Object.prototype.hasOwnProperty.call(b,k) && nxSameRecord(a[k],b[k]));
}
function nxValidEvent(e) {
  const fields = ['id','session','device','kind','player','username','at','missionId','missionName','category','phase','stage','reason','outcome','elapsedMs','usedHeapBytes','selected','remaining','record'];
  const strings = ['username','missionId','missionName','category','phase','stage','reason','outcome'];
  const numbers = ['elapsedMs','usedHeapBytes','selected','remaining'];
  return e && Object.keys(e).every(k => fields.indexOf(k) >= 0) &&
    strings.every(k => e[k] == null || (typeof e[k] === 'string' && e[k].length <= (k === 'reason' ? 600 : 120))) &&
    numbers.every(k => e[k] == null || (Number.isFinite(e[k]) && e[k] >= 0)) &&
    /^[a-f0-9-]{36}$/i.test(String(e.id)) && /^[a-f0-9-]{36}$/i.test(String(e.session)) && /^[a-f0-9-]{36}$/i.test(String(e.device)) &&
    /^\d+$/.test(String(e.player)) && Number.isFinite(e.at) && Math.abs(Date.now() - e.at) <= NX_WEEK &&
    ['mission','activity','session','lifecycle','recovery-attempt','recovery-result','committed-coverage','performance','status'].indexOf(e.kind) >= 0 &&
    (!['mission','activity','session'].includes(e.kind) || (e.record && nxSameRecord(e.record, cleanRecord(e.record)))) &&
    (e.kind !== 'mission' || (/^\d+$/.test(e.record.missionId || '') && ['mission-observed','mission-update','dispatch','mission-completed','mission-credit','transport'].includes(e.record.eventType))) &&
    JSON.stringify(e).length <= 501000;
}
function nxCell(value) {
  // Text from the game is data, including names beginning with '='.
  if (typeof value === 'number') return value;
  const text = value == null ? '' : String(value);
  return /^[=+\-@\t\r\n]/.test(text) ? "'" + text : text;
}
function nxRows(body) {
  return body.events.map(e => [e.id, new Date(e.at).toISOString(), e.username || '(name unavailable)', e.player,
    e.device, e.session, e.kind, e.missionId, e.missionName, e.category, e.phase, e.stage,
    e.reason, e.outcome, e.elapsedMs, e.usedHeapBytes, e.selected, e.remaining, body.id].map(nxCell));
}
function nxWriteSheet(body) {
  const book = SpreadsheetApp.openById(NX_SHEET);
  let sheet = book.getSheetByName(NX_TAB);
  if (!sheet) sheet = book.insertSheet(NX_TAB);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, NX_COLUMNS.length).setValues([NX_COLUMNS]);
    sheet.setFrozenRows(1);
  }
  // Refuse a changed layout instead of overwriting someone else's columns.
  if (JSON.stringify(sheet.getRange(1, 1, 1, NX_COLUMNS.length).getValues()[0]) !== JSON.stringify(NX_COLUMNS)) throw Error('Sheet header changed');
  const rows = nxRows(body), existing = new Set(), last = sheet.getLastRow();
  if (last > 1) {
    // Read matching IDs in blocks, never one remote getValue call per event.
    for (const found of nxFindRows(sheet, 1, body.events.map(e => e.id), 1)) existing.add(String(found.row[0]));
  }
  const missing = rows.filter(row => !existing.has(row[0]));
  if (!missing.length) return;
  const first = sheet.getLastRow() + 1;
  const required = first + missing.length - 1;
  if (required > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), required - sheet.getMaxRows());
  sheet.getRange(first, 1, missing.length, NX_COLUMNS.length).setNumberFormat('@').setValues(missing);
  sheet.getRange(first, 15, missing.length, 4).setNumberFormat('0.##');
  SpreadsheetApp.flush();
  const saved = sheet.getRange(first, 1, missing.length, 1).getValues().map(row => String(row[0]));
  if (JSON.stringify(saved) !== JSON.stringify(missing.map(row => row[0]))) throw Error('Sheet write verification failed');
}
// Acknowledgement now means the raw file AND recoverable queue entry are saved.
// Rollout is gated until the processing trigger has been installed successfully.
function doPost(request) {
  if(PropertiesService.getScriptProperties().getProperty('NEXUS_ASYNC_ENABLED')!=='1')return nxLegacyPost(request);
  let lock;
  try {
    const raw=String(request?.postData?.contents||'');
    if(raw.length>600000)return nxJson({ok:false,error:'SIZE'});
    const body=JSON.parse(raw),uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if(!body||body.schema!==1||!uuid.test(body.id)||!Number.isFinite(body.createdAt)||Math.abs(Date.now()-body.createdAt)>NX_WEEK||
      !Array.isArray(body.events)||!body.events.length||body.events.length>500||!body.events.every(nxValidEvent)||
      new Set(body.events.map(e=>e.id)).size!==body.events.length)return nxJson({ok:false,error:'SCHEMA'});
    lock=LockService.getScriptLock();if(!lock.tryLock(1000))return nxJson({ok:false,error:'BUSY'});
    const root=DriveApp.getFolderById(NX_FOLDER),payload={schema:1,id:body.id,createdAt:body.createdAt,events:body.events};
    const day=Utilities.formatDate(new Date(body.createdAt),'UTC','yyyy-MM-dd');
    const folder=nxFolder(nxFolder(root,'Extension Batches'),day),name=body.id+'.json';
    const matches=folder.getFilesByName(name);
    const file=matches.hasNext()?matches.next():folder.createFile(name,JSON.stringify(payload),MimeType.PLAIN_TEXT);
    // Semantic equality tolerates dictionary ordering, never different values.
    if(!nxSameRecord(JSON.parse(file.getBlob().getDataAsString()),payload))return nxJson({ok:false,error:'CONFLICT'});
    const pending=nxFolder(root,'Extension Pending Imports'),done=nxFolder(root,'Extension Imported Batches');
    const marker={schema:1,id:body.id,fileId:file.getId(),createdAt:body.createdAt};
    const finished=done.getFilesByName(name),waiting=pending.getFilesByName(name);
    const receipt=finished.hasNext()?finished.next():waiting.hasNext()?waiting.next():pending.createFile(name,JSON.stringify(marker),MimeType.PLAIN_TEXT);
    if(!nxSameRecord(JSON.parse(receipt.getBlob().getDataAsString()),marker))return nxJson({ok:false,error:'VERIFY'});
    // A crash before this point leaves the client's exact batch pending. A crash
    // after this point leaves Google's durable job available to the worker.
    return nxJson({ok:true,id:body.id,eventIds:body.events.map(e=>e.id)});
  }catch(_error){return nxJson({ok:false,error:'BACKEND'});}
  finally{if(lock&&lock.hasLock())lock.releaseLock();}
}

// Called only while nexusRefreshReports owns the maintenance lease. No age
// check here: accepted raw data must still import after an extended outage.
function nexusProcessSavedBatches(deadline){
  const props=PropertiesService.getScriptProperties(),root=DriveApp.getFolderById(NX_FOLDER);
  const pending=nxFolder(root,'Extension Pending Imports'),done=nxFolder(root,'Extension Imported Batches');
  let files;
  try{const token=props.getProperty('NEXUS_IMPORT_CURSOR');files=token?DriveApp.continueFileIterator(token):pending.getFiles();}
  catch(_error){props.deleteProperty('NEXUS_IMPORT_CURSOR');files=pending.getFiles();}
  let count=0,failed=false;
  while(count<8&&Date.now()<deadline-30000&&files.hasNext()){
    const markerFile=files.next();count++;
    try{
      const marker=JSON.parse(markerFile.getBlob().getDataAsString());
      const body=JSON.parse(DriveApp.getFileById(marker.fileId).getBlob().getDataAsString());
      if(marker.schema!==1||body.schema!==1||body.id!==marker.id||body.createdAt!==marker.createdAt||!Array.isArray(body.events))throw Error('Saved batch identity mismatch');
      nxWriteSheet(body);nxWriteStructured(body);
      // Move only after all verified, idempotent writes and report scheduling.
      markerFile.moveTo(done);
      props.setProperty('NEXUS_LAST_IMPORT',new Date().toISOString());
    }catch(_error){failed=true;props.setProperty('NEXUS_IMPORT_ERROR','An import failed; raw data and its queue entry are retained for retry.');}
    // Failed jobs remain in Pending and are retried on the next full traversal;
    // one bad batch cannot starve all later jobs.
    props.setProperty('NEXUS_IMPORT_CURSOR',files.getContinuationToken());
  }
  if(!files.hasNext())props.deleteProperty('NEXUS_IMPORT_CURSOR');
  if(!failed&&!pending.getFiles().hasNext())props.deleteProperty('NEXUS_IMPORT_ERROR');
  return count;
}

function installNexusAsyncProcessing(){
  // This is an explicit deployment step; saving code alone keeps legacy ACKs.
  const root=DriveApp.getFolderById(NX_FOLDER);
  nxFolder(root,'Extension Pending Imports');nxFolder(root,'Extension Imported Batches');
  installNexusReportTrigger();
  if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='nexusRefreshReports'))throw Error('Processing trigger was not installed');
  PropertiesService.getScriptProperties().setProperty('NEXUS_ASYNC_ENABLED','1');
}

function nxLegacyPost(request) {
  let lock;
  try {
    const raw = String(request && request.postData && request.postData.contents || '');
    if (raw.length > 600000) return nxJson({ ok: false, error: 'SIZE' });
    const body = JSON.parse(raw);
    // No login or shared password. Identity fields are labels, not authentication.
    if (!body || body.schema !== 1 || !/^[a-f0-9-]{36}$/i.test(String(body.id)) || !Number.isFinite(body.createdAt) ||
        Math.abs(Date.now() - body.createdAt) > NX_WEEK || !Array.isArray(body.events) || !body.events.length || body.events.length > 500 ||
        !body.events.every(nxValidEvent) || new Set(body.events.map(e => e.id)).size !== body.events.length) return nxJson({ ok: false, error: 'SCHEMA' });
    lock = LockService.getScriptLock();
    if (!lock.tryLock(1000)) return nxJson({ ok: false, error: 'BUSY' });
    const root = DriveApp.getFolderById(NX_FOLDER);
    const batches = nxFolder(root, 'Extension Batches');
    const date = Utilities.formatDate(new Date(body.createdAt), 'UTC', 'yyyy-MM-dd');
    const folder = nxFolder(batches, date);
    const name = body.id + '.json';
    // Stable batch ID and creation day make retries deterministic after timeouts/restarts.
    const payload = JSON.stringify({ schema: 1, id: body.id, createdAt: body.createdAt, events: body.events });
    const matching = folder.getFilesByName(name);
    if (matching.hasNext()) {
      if (nxHash(matching.next().getBlob().getDataAsString()) !== nxHash(payload)) return nxJson({ ok: false, error: 'CONFLICT' });
    } else {
      const file = folder.createFile(name, payload, MimeType.PLAIN_TEXT);
      if (nxHash(file.getBlob().getDataAsString()) !== nxHash(payload)) return nxJson({ ok: false, error: 'VERIFY' });
    }
    // This ledger row is written LAST, only after all raw tables and report
    // scheduling succeed. A lost response can be acknowledged without rescanning
    // and rewriting every event. Raw file hash above still proves exact identity.
    const receiptBook = SpreadsheetApp.openById(NX_SHEET);
    const receiptSheet = nxTable(receiptBook, 'batchLedger');
    const receipts = nxFindRows(receiptSheet, 1, [body.id], MC_LOGGER_SHEETS.batchLedger.headers.length);
    if (receipts.some(x => x.row[0] === body.id && x.row[8] === 'RAW_SAVED' &&
        Number(x.row[4]) === body.events.length && x.row[7] === nxHash(JSON.stringify(body)))) {
      return nxJson({ ok: true, id: body.id, eventIds: body.events.map(e => e.id) });
    }
    // A saved raw file is not an acknowledgement: the Sheet must succeed too.
    // Retrying after a partial write finds existing event IDs and appends only missing rows.
    try { nxWriteSheet(body); nxWriteStructured(body); } catch (error) {
      console.error(String(error && error.stack || error).slice(0,2000));
      return nxJson({ ok: false, error: 'SHEET' });
    }
    return nxJson({ ok: true, id: body.id, eventIds: body.events.map(e => e.id) });
  } catch (_error) { return nxJson({ ok: false, error: 'BACKEND' }); }
  finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}
// Copy immutable batches and verify hashes. Source records are never purged.
// Revisit the past eight days: late acknowledgements/backlogs may add old-day files.
function nexusBackup() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return;
  const start = Date.now();
  try {
    nxArchiveSnapshot();
    const root = DriveApp.getFolderById(NX_FOLDER);
    const daily = nxFolder(root, 'Extension Daily Backups');
    const weekly = nxFolder(root, 'Extension Weekly Archives');
    const dates = nxFolder(root, 'Extension Batches').getFolders();
    while (dates.hasNext()) {
      const source = dates.next(), day = source.getName();
      const time = Date.parse(day + 'T00:00:00Z');
      if (!Number.isFinite(time) || Date.now() - time > 8 * 86400000) continue;
      const date = new Date(time); const monday = new Date(time - ((date.getUTCDay() + 6) % 7) * 86400000);
      const targets = [nxFolder(daily, day), nxFolder(nxFolder(weekly, Utilities.formatDate(monday, 'UTC', 'yyyy-MM-dd')), day)];
      const files = source.getFiles();
      while (files.hasNext()) {
        if (Date.now() - start > 240000) throw Error('Backup time budget reached; source retained. Run nexusBackup again.');
        const file = files.next(), text = file.getBlob().getDataAsString();
        for (const target of targets) {
          const matches = target.getFilesByName(file.getName());
          const copy = matches.hasNext() ? matches.next() : file.makeCopy(file.getName(), target);
          if (nxHash(copy.getBlob().getDataAsString()) !== nxHash(text)) throw Error('Archive verification failed: ' + file.getName());
        }
      }
    }
    PropertiesService.getScriptProperties().setProperty('NEXUS_LAST_BACKUP', new Date().toISOString());
    PropertiesService.getScriptProperties().deleteProperty('NEXUS_BACKUP_ERROR');
  } catch (error) {
    PropertiesService.getScriptProperties().setProperty('NEXUS_BACKUP_ERROR', String(error.message)); throw error;
  } finally { lock.releaseLock(); }
}
function installNexusBackupTrigger() {
  const exists = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'nexusBackup');
  if (!exists) ScriptApp.newTrigger('nexusBackup').timeBased().everyDays(1).atHour(2).inTimezone('Europe/London').create();
}

// Shared browser/worker/backend allow-list. Never serialize arbitrary game objects.
function cleanRecord(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const text = (v, n = 240) => String(v ?? '').replace(/[\u0000-\u0008]/g, '').slice(0, n);
  const number = v => v !== '' && v != null && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null;
  const path = v => { const s=String(v??'').replace(/^https:\/\/(?:www|police)\.missionchief\.co\.uk(?=\/)/,''); return /^\/(?!\/)/.test(s) ? s.split(/[?#]/)[0].slice(0,240) : ''; };
  const r = {};
  for (const k of ['eventType','missionId','missionDefinitionId','missionName','ownership','generatorStationId','generatorStationName','dispatchMode',
    'source','category','action','phase','outcome','vehicleId','patientId','stationId','dispatchCentreId','targetTag','targetId','targetLabel','inputType','correlationId','message','clientVersion','userAgent','viewport','timezone','transactionId','completionSource','actualCreditsSource']) {
    if (raw[k] != null) r[k] = text(raw[k], k === 'message' ? 600 : 240);
  }
  for (const k of ['advertisedCredits','actualCredits','patientCount','prisonerCount','transportCount','durationMs','attempt','httpStatus']) if (k in raw) r[k] = number(raw[k]);
  for (const k of ['missionUrl','route','targetHref']) if (k in raw) r[k] = path(raw[k]);
  for (const k of ['shared','completionVerified','dispatchConfirmed']) if (k in raw) r[k] = raw[k] === true;
  for (const k of ['firstObservedAt','firstUnitSentAt','completedAt','transactionAt']) if (raw[k] && Number.isFinite(Date.parse(raw[k]))) r[k] = new Date(raw[k]).toISOString();
  if (Array.isArray(raw.requirements)) r.requirements = raw.requirements.slice(0,250).map(x => ({ kind: text(x?.kind,40), name: text(x?.name), required: number(x?.required), stillNeeded: number(x?.stillNeeded), source: text(x?.source,80) }));
  if (Array.isArray(raw.units)) {
    const seen = new Set();
    r.units = raw.units.slice(0,500).filter(x => /^\d+$/.test(String(x?.vehicleId)) && !seen.has(String(x.vehicleId)) && seen.add(String(x.vehicleId))).map(x => {
      const u = {}; for (const k of ['vehicleId','vehicleTypeId','vehicleName','vehicleTypeName','stationId','stationName','status']) u[k] = text(x[k],180);
      u.estimatedDistanceKm = number(x.estimatedDistanceKm); u.estimatedEtaSeconds = number(x.estimatedEtaSeconds);
      if (u.estimatedDistanceKm > 100000) u.estimatedDistanceKm = null;
      if (u.estimatedEtaSeconds > 604800) u.estimatedEtaSeconds = null;
      return u;
    });
  }
  return r;
}

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
  sessions: Object.freeze({
    name: 'Sessions',
    headers: Object.freeze([
      'session_id','player_id','username','device_id','client_version',
      'started_at','last_seen_at','ended_at','start_route','last_route',
      'user_agent','viewport','timezone','auto_mode_runs','user_actions',
      'nexus_actions','missionchief_actions','system_events','event_count','status'
    ])
  }),
  activity: Object.freeze({
    name: 'Activity Log',
    headers: Object.freeze([
      'activity_id','event_time','received_at','player_id','username','device_id',
      'session_id','source','category','action','phase','outcome','route','mission_id',
      'vehicle_id','patient_id','station_id','dispatch_centre_id','target_tag','target_id',
      'target_label','target_href','input_type','correlation_id','duration_ms','attempt',
      'message','payload_json','client_version','schema_version','privacy_class','batch_id'
    ])
  }),
  actionSummary: Object.freeze({
    name: 'Action Summary',
    headers: Object.freeze([
      'period_date','player_id','username','source','category','action','outcome',
      'event_count','first_event_at','last_event_at','total_duration_ms',
      'avg_duration_ms','failed_count','session_count','last_rebuilt_at'
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
      'notes',
      'activity_rows',
      'session_rows',
      'action_summary_rows'
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


// Raw rows are idempotent; reports are rebuilt from those rows, never incremented
// on a retry. Pending batches remain durable until every affected report succeeds.
const NX_REPORT_COLUMNS = ['batch_id','created_at','scope_json','status','updated_at','error'];
function nxSheet(book, name, headers) {
  let s=book.getSheetByName(name); if(!s)s=book.insertSheet(name);
  if(s.getMaxColumns && s.getMaxColumns()<headers.length)s.insertColumnsAfter(s.getMaxColumns(),headers.length-s.getMaxColumns());
  if(!s.getLastRow()){s.getRange(1,1,1,headers.length).setValues([headers]);s.setFrozenRows(1);}
  if(JSON.stringify(s.getRange(1,1,1,headers.length).getValues()[0])!==JSON.stringify(headers))throw Error('Header mismatch: '+name);
  return s;
}
function nxTable(book,key){const def=MC_LOGGER_SHEETS[key];return nxSheet(book,def.name,def.headers);}
function nxKey(row,cols){return JSON.stringify(cols.map(c=>row[c] instanceof Date?Utilities.formatDate(row[c],'Europe/London','yyyy-MM-dd'):String(row[c]??'')));}
function nxFindRows(sheet,col,values,width) {
  if(sheet.getLastRow()<2 || !values.length)return [];
  const pattern='^(?:'+Array.from(new Set(values.map(String))).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')$';
  const matches=sheet.getRange(2,col,sheet.getLastRow()-1,1).createTextFinder(pattern).useRegularExpression(true).matchEntireCell(true).matchCase(true).findAll();
  const blocks=new Map();
  for(const cell of matches){const index=cell.getRow();const base=2+Math.floor((index-2)/100)*100;if(!blocks.has(base))blocks.set(base,[]);blocks.get(base).push(index);}
  const out=[];
  for(const [base,indices] of blocks){const rows=sheet.getRange(base,1,Math.min(100,sheet.getLastRow()-base+1),width).getValues();for(const i of indices)out.push({index:i,row:rows[i-base]});}
  return out;
}
function nxSetRows(sheet,first,rows,keyColumns=[]){
  if(!rows.length)return;
  const needed=first+rows.length-1;if(needed>sheet.getMaxRows())sheet.insertRowsAfter(sheet.getMaxRows(),needed-sheet.getMaxRows());
  for(const col of keyColumns)sheet.getRange(first,col+1,rows.length,1).setNumberFormat('@');
  // Strings are formula-escaped; native numbers, booleans and dates retain types.
  sheet.getRange(first,1,rows.length,rows[0].length).setValues(rows.map(r=>r.map(v=>v instanceof Date || typeof v==='boolean'?v:nxCell(v))));
}
function nxStore(sheet,rows,cols=[0],replace=false) {
  if(!rows.length)return;
  // Legacy date columns auto-convert ISO day strings. Locate report rows by
  // player, normalise existing native dates, then store future keys as text.
  const anchor=['Action Summary','Dashboard Data'].includes(sheet.getName())?cols[1]:cols[0];
  const existing=nxFindRows(sheet,anchor+1,rows.map(r=>r[anchor]),rows[0].length);
  const byKey=new Map(existing.map(x=>[nxKey(x.row,cols),x])),unique=new Map(),fresh=[],updates=[];
  for(const row of rows){const key=nxKey(row,cols);if(replace||!unique.has(key))unique.set(key,row);}
  for(const [key,row] of unique){const found=byKey.get(key);if(found){if(replace)updates.push({index:found.index,row});}else fresh.push(row);}
  // Adjacent report rows share one values write and one format operation per
  // key column. Never bridge gaps: unrelated rows must not be overwritten.
  updates.sort((a,b)=>a.index-b.index);
  for(let i=0;i<updates.length;){const first=updates[i].index,block=[updates[i++].row];
    while(i<updates.length&&updates[i].index===first+block.length&&block.length<2000)block.push(updates[i++].row);
    nxSetRows(sheet,first,block,cols);
  }
  const first=sheet.getLastRow()+1;nxSetRows(sheet,first,fresh,cols);
  if(fresh.length){SpreadsheetApp.flush();const saved=sheet.getRange(first,1,fresh.length,rows[0].length).getValues();
    if(JSON.stringify(saved.map(r=>nxKey(r,cols)))!==JSON.stringify(fresh.map(r=>nxKey(r,cols))))throw Error('Row verification: '+sheet.getName());}
}
function nxWriteStructured(body) {
  const book=SpreadsheetApp.openById(NX_SHEET),now=new Date(),events=[],units=[],activity=[],requirements=[];
  const scope={missions:[],sessions:[],days:[],weeks:[],players:[]};
  for(const e of body.events){const r=e.record||{},at=new Date(e.at),iso=at.toISOString();
    if(e.kind==='mission'){
      const metadata={...r};delete metadata.units;delete metadata.requirements;
      metadata.unitCount=(r.units||[]).length;
      const requirementJson=JSON.stringify(r.requirements||[]);
      if(requirementJson.length>45000)for(const [index,item]of (r.requirements||[]).entries())requirements.push([e.id,index,e.player,r.missionId,item.kind,item.name,item.required,item.stillNeeded,item.source]);
      events.push([e.id,body.id,e.player,e.device,r.eventType,at,r.missionId,r.missionDefinitionId,r.missionName,
        r.missionUrl?'https://www.missionchief.co.uk'+r.missionUrl:'',r.ownership,r.generatorStationId,r.generatorStationName,r.dispatchMode,r.shared===true,
        r.advertisedCredits,r.actualCredits,r.patientCount,r.prisonerCount,r.transportCount,requirementJson.length>45000?JSON.stringify({table:'Mission Requirements',eventId:e.id,count:r.requirements.length}):requirementJson,JSON.stringify(metadata),now]);
      for(const u of r.units||[])units.push([e.id,body.id,e.player,e.device,r.missionId,at,u.vehicleId,u.vehicleTypeId,u.vehicleName,u.vehicleTypeName,u.stationId,u.stationName,u.status,r.dispatchMode,u.estimatedDistanceKm,u.estimatedEtaSeconds]);
      scope.missions.push([e.player,r.missionId]);
    }
    const source=['USER','NEXUS','MISSIONCHIEF','SYSTEM'].includes(r.source)?r.source:(e.kind==='session'?'SYSTEM':'NEXUS');
    const payload=e.record ? {...e.record,units:undefined,requirements:undefined} : {selected:e.selected,remaining:e.remaining,usedHeapBytes:e.usedHeapBytes};
    activity.push([e.id,at,now,e.player,e.username||'',e.device,e.session,source,r.category||e.category||e.kind,
      r.action||r.eventType||e.stage||e.kind,r.phase||e.phase||'',r.outcome||e.outcome||'',r.route||r.missionUrl||'',r.missionId||e.missionId||'',
      r.vehicleId||'',r.patientId||'',r.stationId||'',r.dispatchCentreId||'',r.targetTag||'',r.targetId||'',r.targetLabel||'',r.targetHref||'',r.inputType||'',r.correlationId||'',
      r.durationMs??e.elapsedMs??'',r.attempt??'',r.message||e.reason||'',JSON.stringify(payload),r.clientVersion||'extension-pre-3.0.43.6',2,'operational-metadata',body.id]);
    scope.sessions.push(e.session);scope.days.push([e.player,nxDay(at)]);scope.weeks.push([e.player,nxWeek(at).key]);scope.players.push(e.player);
  }
  nxStore(nxTable(book,'events'),events);
  nxStore(nxTable(book,'units'),units,[0,6]);
  if(requirements.length)nxStore(nxSheet(book,'Mission Requirements',['event_id','requirement_index','player_id','mission_id','kind','name','required','still_needed','source']),requirements,[0,1]);
  nxStore(nxTable(book,'activity'),activity);
  for(const k of Object.keys(scope))scope[k]=Array.from(new Map(scope[k].map(v=>[JSON.stringify(v),v])).values());
  const queue=nxSheet(book,'Report Queue',NX_REPORT_COLUMNS);
  nxStore(queue,[[body.id,now,JSON.stringify(scope),'PENDING',now,'']]);
  nxStore(nxTable(book,'uploads'),[[body.id,Array.from(new Set(body.events.map(e=>e.player))).join(','),body.events[0].device,now,body.events.length,units.length,body.events.find(e=>e.record?.clientVersion)?.record.clientVersion||'extension',false,'RAW_SAVED','']]);
  nxStore(nxTable(book,'batchLedger'),[[body.id,body.events[0].player,body.events[0].device,now,body.events.length,units.length,'3.0.43.8',nxHash(JSON.stringify(body)), 'RAW_SAVED',new Date(body.createdAt+NX_WEEK)]]);
}
function nxDay(value){if(value===''||value==null)return '';const t=new Date(value);return Number.isFinite(t.getTime())?Utilities.formatDate(t,'Europe/London','yyyy-MM-dd'):'';}
function nxTime(value){if(value==='' || value==null)return null;const n=new Date(value).getTime();return Number.isFinite(n)?n:null;}
function nxWeek(value){const d=new Date(value);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()+3-(d.getUTCDay()+6)%7);const year=d.getUTCFullYear();const week=1+Math.round(((d-new Date(Date.UTC(year,0,4)))/86400000-3+(new Date(Date.UTC(year,0,4)).getUTCDay()+6)%7)/7);const mon=new Date(d);mon.setUTCDate(d.getUTCDate()-3);return {key:year+'-W'+String(week).padStart(2,'0'),start:mon,end:new Date(+mon+7*86400000-1)};}
function nxJsonObject(value){try{return JSON.parse(String(value||'{}'));}catch{return {};}}
function nxEach(sheet,width,fn,deadline){const last=sheet.getLastRow();for(let first=2;first<=last;first+=2000){if(Date.now()>deadline)throw Error('Report time budget; pending rows retained');for(const row of sheet.getRange(first,1,Math.min(2000,last-first+1),width).getValues())fn(row);}}
function nxMissionSummary(player,id,eventRows,unitRows,now){
  const row=new Array(24).fill('');row[0]=player+'|'+id;row[1]=player;row[2]=id;row[15]=0;row[16]=unitRows.length;row[19]=false;
  const earliest=(col,v)=>{const t=nxTime(v);if(t!==null && (nxTime(row[col])===null || t<nxTime(row[col])))row[col]=new Date(t);};
  const latest=(col,v)=>{const t=nxTime(v);if(t!==null && (nxTime(row[col])===null || t>nxTime(row[col])))row[col]=new Date(t);};
  const max=(col,v)=>{if(v!=='' && v!=null && Number.isFinite(Number(v)))row[col]=row[col]===''?Number(v):Math.max(Number(row[col]),Number(v));};
  for(const e of eventRows){const meta=nxJsonObject(e[21]);for(const [to,from]of [[3,7],[4,8],[5,9],[6,10]])if(e[from])row[to]=e[from];
    if(e[4]==='mission-observed')earliest(7,e[5]);earliest(7,meta.firstObservedAt);earliest(8,meta.firstUnitSentAt);
    if(e[4]==='dispatch'){earliest(8,e[5]);row[15]++;if(!row[20])row[20]=e[13];}
    if(e[4]==='mission-completed' && meta.completionVerified===true || e[4]==='mission-credit')earliest(9,meta.completedAt||e[5]);
    for(const [to,from]of [[12,15],[13,16],[17,17],[18,18]])max(to,e[from]);row[19]=row[19]||e[14]===true;latest(22,e[5]);
  }
  row[10]=row[7]&&row[8]?Math.max(0,(row[8]-row[7])/1000):'';row[11]=row[8]&&row[9]?Math.max(0,(row[9]-row[8])/1000):'';
  row[14]=row[13]!==''?'CAPTURED':row[9]?'PENDING_TRANSACTION':'NOT_COMPLETED';
  row[21]=row[8]||row[7]||row[22]?nxWeek(row[8]||row[7]||row[22]).key:'';row[23]=now;return row;
}
function nxReports(book,scope,deadline){
  const now=new Date(),missionKeys=new Set(scope.missions.map(x=>x.join('|'))),ids=scope.missions.map(x=>x[1]);
  const eventRows=nxFindRows(nxTable(book,'events'),7,ids,23).map(x=>x.row),unitRows=nxFindRows(nxTable(book,'units'),5,ids,16).map(x=>x.row);
  const summary=nxTable(book,'summaries'),old=nxFindRows(summary,1,Array.from(missionKeys),24).map(x=>x.row),newRows=[];
  for(const [player,id]of scope.missions){const events=eventRows.filter(r=>String(r[2])===player && String(r[6])===id);if(events.length)newRows.push(nxMissionSummary(player,id,events,unitRows.filter(r=>String(r[2])===player && String(r[4])===id),now));}
  nxStore(summary,newRows,[0],true);
  const days=new Set(scope.days.map(x=>x.join('|'))),weeks=new Set(scope.weeks.map(x=>x.join('|')));
  for(const r of [...old,...newRows]){const date=r[8]||r[7]||r[22];if(date)days.add(r[1]+'|'+nxDay(date));}
  const ledgerEvents=[];const sessions=new Map(),actions=new Map(),players=new Map(),devices=new Map();const sessionIds=new Set(scope.sessions),playerIds=new Set(scope.players);
  nxEach(nxTable(book,'activity'),32,r=>{
    const p=String(r[3]),at=nxTime(r[1]),day=nxDay(r[1]),payload=nxJsonObject(r[27]);if(at===null)return;
    if(r[9]==='CREDIT_TRANSACTION')ledgerEvents.push({player:p,record:payload});
    if(playerIds.has(p)){
      const previous=players.get(p);if(!previous||at>previous.at)players.set(p,{at,name:r[4]});
      const key=p+'|'+r[5],d=devices.get(key)||{first:at,last:at,name:r[4],version:r[28],device:r[5],player:p};d.first=Math.min(d.first,at);if(at>=d.last){d.last=at;d.name=r[4];d.version=r[28];}devices.set(key,d);
    }
    if(sessionIds.has(String(r[6]))){
      const key=String(r[6]),s=sessions.get(key)||{row:[r[6],p,r[4],r[5],r[28],new Date(at),new Date(at),'',r[12],r[12],'','','',0,0,0,0,0,0,'OPEN'],first:at,last:at};
      if(at<s.first){s.first=at;s.row[5]=new Date(at);s.row[8]=r[12];}if(at>=s.last){s.last=at;s.row[6]=new Date(at);s.row[9]=r[12];s.row[2]=r[4];}
      if(r[9]==='SESSION_END')s.row[7]=new Date(at);
      for(const [col,k]of [[10,'userAgent'],[11,'viewport'],[12,'timezone']])if(payload[k])s.row[col]=payload[k];
      if(/AUTO.*START|AUTO_MODE_RUN/.test(r[9]))s.row[13]++;
      const col={USER:14,NEXUS:15,MISSIONCHIEF:16,SYSTEM:17}[r[7]];if(col)s.row[col]++;s.row[18]++;sessions.set(key,s);
    }
    if(days.has(p+'|'+day)){
      const key=JSON.stringify([day,p,r[7],r[8],r[9],r[11]]),a=actions.get(key)||{row:[day,p,r[4],r[7],r[8],r[9],r[11],0,new Date(at),new Date(at),0,0,0,0,now],sessions:new Set()};
      a.row[7]++;if(at<+a.row[8])a.row[8]=new Date(at);if(at>+a.row[9])a.row[9]=new Date(at);a.row[10]+=Number(r[24])||0;
      if(/fail|error|stop|shortage/i.test(r[11]))a.row[12]++;a.sessions.add(String(r[6]));actions.set(key,a);
    }
  },deadline);
  nxStore(nxTable(book,'sessions'),Array.from(sessions.values(),s=>{s.row[19]=s.row[7]?'CLOSED':Date.now()-s.last>120000?'INACTIVE':'OPEN';return s.row;}),[0],true);
  nxStore(nxTable(book,'actionSummary'),Array.from(actions.values(),a=>{a.row[11]=a.row[10]/a.row[7];a.row[13]=a.sessions.size;return a.row;}),[0,1,3,4,5,6],true);
  nxStore(nxTable(book,'devices'),Array.from(devices.values(),d=>[d.device,d.player,d.name+' / '+String(d.device).slice(0,8),'','ACTIVE',new Date(d.first),new Date(d.last),now,d.version]),[0,1],true);
  nxStore(nxTable(book,'players'),Array.from(players,([p,v])=>[p,v.name,'ACTIVE',new Date(Math.min(...Array.from(devices.values()).filter(d=>d.player===p).map(d=>d.first))),new Date(v.at),Array.from(devices.values()).filter(d=>d.player===p).length,'Automatic username + device; no login']),[0],true);
  nxRefreshIncome(book,ledgerEvents,now,deadline);
  const journeys=new Map();
  nxEach(nxTable(book,'units'),16,r=>{const week=nxWeek(r[5]);if(!weeks.has(r[2]+'|'+week.key))return;const station=r[10]||r[11]||'unknown',key=r[2]+'|'+week.key+'|'+station;
    const j=journeys.get(key)||[week.key,week.start,week.end,r[2],station,r[10],r[11],0,0,0,0,0,0,0,0,0,now];j[7]++;
    if(r[14]!==''&&r[14]!=null){j[8]+=Number(r[14]);j[9]++;j[10]=Math.max(j[10],Number(r[14]));}else j[14]++;
    if(r[15]!==''&&r[15]!=null){j[11]+=Number(r[15]);j[12]++;j[13]=Math.max(j[13],Number(r[15]));}else j[15]++;journeys.set(key,j);
  },deadline);
  nxStore(nxTable(book,'journeys'),Array.from(journeys.values()),[0,3,4],true);
}
function nexusRefreshReports(){
  const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
  const props=PropertiesService.getScriptProperties();
  if(Number(props.getProperty('NEXUS_REPORT_LEASE')||0)>Date.now()){lock.releaseLock();return;}
  props.setProperty('NEXUS_REPORT_LEASE',String(Date.now()+360000));lock.releaseLock();
  try{
    // One maintenance lease serializes raw imports, historical repair and reports.
    // Uploads hold only their short Drive save lock, never a spreadsheet lock.
    const deadline=Date.now()+210000;
    if(props.getProperty('NEXUS_INCOME_REPAIR_PENDING')==='1'){
      const book=SpreadsheetApp.openById(NX_SHEET),ledgerEvents=[];
      nxEach(nxTable(book,'activity'),32,r=>{if(r[9]==='CREDIT_TRANSACTION')ledgerEvents.push({player:String(r[3]),record:nxJsonObject(r[27])});},deadline);
      nxRefreshIncome(book,ledgerEvents,new Date(),deadline);
      props.deleteProperty('NEXUS_INCOME_REPAIR_PENDING');
      props.setProperty('NEXUS_INCOME_REPAIRED_AT',new Date().toISOString());
      console.log('Income repair completed');return;
    }
    if(props.getProperty('NEXUS_ASYNC_ENABLED')!==null){
      nexusProcessSavedBatches(Math.min(deadline,Date.now()+90000));
      if(Date.now()>deadline-30000)return;
    }
    const book=SpreadsheetApp.openById(NX_SHEET),queue=nxSheet(book,'Report Queue',NX_REPORT_COLUMNS);
    const pending=nxFindRows(queue,4,['PENDING'],6).slice(0,8);
    if(!pending.length){nexusBackfillDiagnostics();return;}
    const scope={missions:[],sessions:[],days:[],weeks:[],players:[]};for(const item of pending){const part=nxJsonObject(item.row[2]);for(const k of Object.keys(scope))scope[k].push(...(part[k]||[]));}
    for(const k of Object.keys(scope))scope[k]=Array.from(new Map(scope[k].map(v=>[JSON.stringify(v),v])).values());
    nxReports(book,scope,deadline);
    for(const item of pending){queue.getRange(item.index,4,1,3).setValues([['DONE',new Date(),'']]);}
    PropertiesService.getScriptProperties().setProperty('NEXUS_LAST_REPORT',new Date().toISOString());
    PropertiesService.getScriptProperties().deleteProperty('NEXUS_REPORT_ERROR');
  }catch(error){props.setProperty('NEXUS_REPORT_ERROR',String(error.message));throw error;}finally{if(lock.tryLock(1000)){props.deleteProperty('NEXUS_REPORT_LEASE');lock.releaseLock();}}
}
function installNexusReportTrigger(){
  const exists=ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='nexusRefreshReports');
  if(!exists)ScriptApp.newTrigger('nexusRefreshReports').timeBased().everyMinutes(1).create();
}
function nexusBackfillDiagnostics(){
  const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;
  try{
    const book=SpreadsheetApp.openById(NX_SHEET),sheet=book.getSheetByName(NX_TAB),props=PropertiesService.getScriptProperties();
    let first=Number(props.getProperty('NEXUS_DIAGNOSTIC_BACKFILL_ROW')||2);if(!sheet)return;
    if(!props.getProperty('NEXUS_DIAGNOSTIC_BACKFILL_END'))props.setProperty('NEXUS_DIAGNOSTIC_BACKFILL_END',String(sheet.getLastRow()));
    const last=Math.min(Number(props.getProperty('NEXUS_DIAGNOSTIC_BACKFILL_END')),sheet.getLastRow());if(first>last)return;
    const rows=sheet.getRange(first,1,Math.min(100,last-first+1),19).getValues();
    for(let i=0;i<rows.length;i+=25){const batch=rows.slice(i,i+25).filter(r=>!['mission','activity','session'].includes(r[6]));if(!batch.length)continue;nxWriteStructured({id:'backfill-'+(first+i),createdAt:Date.now(),events:batch.map(r=>({id:String(r[0]),at:Date.parse(r[1]),username:String(r[2]),player:String(r[3]),device:String(r[4]),session:String(r[5]),kind:String(r[6]),missionId:String(r[7]),missionName:String(r[8]),category:String(r[9]),phase:String(r[10]),stage:String(r[11]),reason:String(r[12]),outcome:String(r[13]),elapsedMs:r[14]||undefined,usedHeapBytes:r[15]||undefined,selected:r[16]||undefined,remaining:r[17]||undefined}))});}
    props.setProperty('NEXUS_DIAGNOSTIC_BACKFILL_ROW',String(first+rows.length));
  }finally{lock.releaseLock();}
}
function nexusLoggerHealth(){
  const props=PropertiesService.getScriptProperties();
  const book=SpreadsheetApp.openById(NX_SHEET),result={version:'3.0.43.8',rows:{},asyncEnabled:props.getProperty('NEXUS_ASYNC_ENABLED')==='1',lastImport:props.getProperty('NEXUS_LAST_IMPORT'),importError:props.getProperty('NEXUS_IMPORT_ERROR'),lastReport:props.getProperty('NEXUS_LAST_REPORT'),reportError:props.getProperty('NEXUS_REPORT_ERROR')};
  for(const key of ['events','units','activity','sessions','players','devices','summaries','actionSummary','dashboard','journeys','uploads','batchLedger']){const s=book.getSheetByName(MC_LOGGER_SHEETS[key].name);result.rows[key]=s?Math.max(0,s.getLastRow()-1):0;}
  console.log(JSON.stringify(result));return result;
}
function nxArchiveSnapshot(){
  const now=new Date(),day=nxDay(now),week=nxWeek(now),root=DriveApp.getFolderById(NX_FOLDER);
  const target=nxFolder(nxFolder(root,'Extension Weekly Archives'),week.key),name='Nexus report snapshot '+day;
  const matches=target.getFilesByName(name);let archive;
  if(matches.hasNext())archive=SpreadsheetApp.openById(matches.next().getId());
  else {archive=SpreadsheetApp.openById(NX_SHEET).copy(name);DriveApp.getFileById(archive.getId()).moveTo(target);}
  const count=key=>{const d=MC_LOGGER_SHEETS[key],s=archive.getSheetByName(d.name);if(!s)return 0;
    if(s.getLastRow() && JSON.stringify(s.getRange(1,1,1,d.headers.length).getValues()[0])!==JSON.stringify(d.headers))throw Error('Archive header mismatch: '+d.name);
    return Math.max(0,s.getLastRow()-1);};
  const rows=[[week.key,week.start,now,archive.getId(),archive.getUrl(),'SNAPSHOT_VERIFIED',count('summaries'),count('events'),count('units'),count('uploads'),now,now,'',
    archive.getSheets().reduce((sum,s)=>sum+s.getLastRow()*s.getLastColumn(),0),'Cumulative daily snapshot; raw batches retained separately; no source deletion',count('activity'),count('sessions'),count('actionSummary')]];
  nxStore(nxTable(SpreadsheetApp.openById(NX_SHEET),'archives'),rows,[0,3],true);
}

// Income is a ledger measure; mission activity uses each event's own London day.
function nxIncomeRows(summaries, missionEvents, ledgerEvents, unitRows, previousDays, now) {
  const transactions = new Map(), matched = new Set();
  const add = (player, r, source) => {
    if (!r.transactionId || nxTime(r.transactionAt) === null || r.actualCredits == null || r.actualCredits === '' || !Number.isFinite(Number(r.actualCredits)) || Number(r.actualCredits) < 0) return;
    const key = String(player) + '|' + r.transactionId;
    const row = [key,String(player),r.transactionId,new Date(r.transactionAt),Number(r.actualCredits),r.missionId||'',source,'TRANSACTION_TIME'];
    const old = transactions.get(key);
    if (old && (+old[3] !== +row[3] || old[4] !== row[4])) throw Error('Conflicting credit transaction: ' + key);
    if (!old || (!old[5] && row[5])) transactions.set(key,row);
    if (row[5]) matched.add(String(player)+'|'+row[5]);
  };
  for (const e of ledgerEvents) add(e.player,e.record,'CREDIT_LEDGER');
  for (const e of missionEvents) {
    const r = nxJsonObject(e[21]);
    if (e[4] === 'mission-credit') add(e[2],{...r,actualCredits:e[16],missionId:e[6]},'MATCHED_MISSION');
  }
  // Older native completion payloads have no transaction identity/time. Keep
  // their captured amount, explicitly attributed to completion, without also
  // counting it when a genuine ledger transaction is available for the mission.
  for (const r of summaries) if (!matched.has(String(r[1])+'|'+r[2]) && r[13] !== '' && r[13] != null && nxTime(r[9]) !== null) {
    const key=String(r[1])+'|native-mission-'+r[2];
    transactions.set(key,[key,String(r[1]),'native-mission-'+r[2],new Date(r[9]),Number(r[13]),r[2],'NATIVE_COMPLETION','COMPLETION_TIME_FALLBACK']);
  }
  const days=new Map();
  const dayRow=(player,date)=>{
    const day=nxDay(date);if(!day)return null;
    const key=String(player)+'|'+day;
    if(!days.has(key))days.set(key,[day,nxWeek(day).key,String(player),0,0,0,0,0,0,0,0,0,0,0,0,0,0,now]);
    return days.get(key);
  };
  for(const r of previousDays)dayRow(r[2],r[0]);
  for(const r of summaries){
    let d=dayRow(r[1],r[7]);if(d){d[3]++;d[6]+=Number(r[12])||0;}
    d=dayRow(r[1],r[8]);if(d){d[4]++;if(r[10]!==''&&r[10]!=null){d[10]+=Number(r[10]);d[11]++;}}
    d=dayRow(r[1],r[9]);if(d){d[5]++;if(r[14]==='PENDING_TRANSACTION')d[16]++;if(r[11]!==''&&r[11]!=null){d[12]+=Number(r[11]);d[13]++;}}
  }
  const seenDispatch=new Set(),seenUnits=new Set();
  for(const e of missionEvents)if(e[4]==='dispatch'&&!seenDispatch.has(e[0])){seenDispatch.add(e[0]);const d=dayRow(e[2],e[5]);if(d)d[8]++;}
  for(const u of unitRows){const k=u[0]+'|'+u[6];if(seenUnits.has(k))continue;seenUnits.add(k);const d=dayRow(u[2],u[5]);if(d)d[9]++;}
  for(const t of transactions.values()){const d=dayRow(t[1],t[3]);if(d)d[7]+=t[4];}
  return {transactions:Array.from(transactions.values()),days:Array.from(days.values(),d=>{d[14]=d[11]?d[10]/d[11]:0;d[15]=d[13]?d[12]/d[13]:0;return d;})};
}
function nxRefreshIncome(book, ledgerEvents, now, deadline) {
  const read=(sheet,width)=>{const rows=[];nxEach(sheet,width,r=>rows.push(r),deadline);return rows;};
  const result=nxIncomeRows(read(nxTable(book,'summaries'),24),read(nxTable(book,'events'),23),ledgerEvents,read(nxTable(book,'units'),16),read(nxTable(book,'dashboard'),18),now);
  nxStore(nxTable(book,'dashboard'),result.days,[0,2],true);
  const ledger=nxSheet(book,'Captured Income',['credit_key','player_id','transaction_id','paid_at','credits','mission_id','source','time_basis']);
  // The derived table is rebuilt to remove native fallbacks superseded by real transactions.
  const oldLast=ledger.getLastRow();
  nxSetRows(ledger,2,result.transactions,[0]);
  if(oldLast>result.transactions.length+1)ledger.getRange(result.transactions.length+2,1,oldLast-result.transactions.length-1,8).clearContent();
  ledger.getRange(2,4,Math.max(1,result.transactions.length),1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  ledger.getRange(2,5,Math.max(1,result.transactions.length),1).setNumberFormat('#,##0');
}

function nexusRepairIncomeNow(){
 const lock=LockService.getScriptLock();if(!lock.tryLock(30000))throw Error('Logger busy; retry later');
 const props=PropertiesService.getScriptProperties();
 if(Number(props.getProperty('NEXUS_REPORT_LEASE')||0)>Date.now()){lock.releaseLock();throw Error('Reports busy; retry later');}
 props.setProperty('NEXUS_REPORT_LEASE',String(Date.now()+360000));lock.releaseLock();
 try{const book=SpreadsheetApp.openById(NX_SHEET),ledgerEvents=[],deadline=Date.now()+210000;
 nxEach(nxTable(book,'activity'),32,r=>{if(r[9]==='CREDIT_TRANSACTION')ledgerEvents.push({player:String(r[3]),record:nxJsonObject(r[27])});},deadline);
 nxRefreshIncome(book,ledgerEvents,new Date(),deadline);
 console.log(JSON.stringify({status:'REPAIRED',incomeRows:book.getSheetByName('Captured Income').getLastRow()-1,timeZone:'Europe/London'}));
 }finally{if(lock.tryLock(1000)){props.deleteProperty('NEXUS_REPORT_LEASE');lock.releaseLock();}}
}

function nexusQueueIncomeRepair(){PropertiesService.getScriptProperties().setProperty('NEXUS_INCOME_REPAIR_PENDING','1');console.log('Income repair queued for the next free reporting cycle');nexusRefreshReports();}
