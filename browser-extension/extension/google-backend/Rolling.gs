// Rolling logger v2. Raw files are immutable; JSON state is authoritative.
// Sheets contain bounded archives and replaceable compact contributions.
const NX2_LIMIT=2000000;
const NX2_HEADERS=['event_id','captured_at','received_at','player_id','kind','mission_id','batch_id','raw_file_id','record_json','is_replay'];
const NX2_PARTS=['part_id','spreadsheet_id','url','status','rows','cells','updated_at'];
const NX2_CONTRIBUTIONS=['source_key',...MC_LOGGER_SHEETS.dashboard.headers];
function nx2MissionBucket(player,id){return 'm-'+String(player)+'-'+Math.floor(Number(id)/1000);}
function nx2Chunk(body,start){
  const keys=new Set(),events=[];
  for(const e of body.events.slice(start)){const r=e.record||{},next=[];
    if(e.kind==='mission'&&/^\d+$/.test(r.missionId||''))next.push(nx2MissionBucket(e.player,r.missionId));
    if(r.transactionId&&nxTime(r.transactionAt)!==null){next.push('c-'+e.player+'-'+nxDay(r.transactionAt));if(/^\d+$/.test(r.missionId||''))next.push(nx2MissionBucket(e.player,r.missionId));}
    if(events.length&&(new Set([...keys,...next]).size>4||events.length>=250))break;
    next.forEach(k=>keys.add(k));events.push(e);
  }
  return {...body,events};
}
function nx2ReduceMission(state,e){
  const r=e.record||{},id=String(r.missionId||e.missionId||'');
  if(!/^\d+$/.test(id))return;
  const m=state.missions[id]||(state.missions[id]={row:new Array(24).fill(''),dispatch:{},units:{}}),s=m.row;
  s[0]=e.player+'|'+id;s[1]=String(e.player);s[2]=id;
  const min=(i,v)=>{const n=nxTime(v);if(n!==null&&(nxTime(s[i])===null||n<nxTime(s[i])))s[i]=new Date(n).toISOString();};
  const max=(i,v)=>{if(v!==''&&v!=null&&Number.isFinite(Number(v)))s[i]=s[i]===''?Number(v):Math.max(Number(s[i]),Number(v));};
  if(nxTime(s[22])===null||e.at>=nxTime(s[22])){
    for(const [i,k] of [[3,'missionDefinitionId'],[4,'missionName'],[5,'missionUrl'],[6,'ownership'],[20,'dispatchMode']])if(r[k])s[i]=r[k];
    s[22]=new Date(e.at).toISOString();
  }
  min(7,r.firstObservedAt);if(r.eventType==='mission-observed')min(7,e.at);
  min(8,r.firstUnitSentAt);
  if(r.eventType==='dispatch'){min(8,e.at);m.dispatch[e.id]=e.at;}
  if((r.eventType==='mission-completed'&&r.completionVerified===true)||r.eventType==='mission-credit')min(9,r.completedAt||e.at);
  for(const [i,k]of [[12,'advertisedCredits'],[13,'actualCredits'],[17,'patientCount'],[18,'prisonerCount']])max(i,r[k]);
  if(r.transactionId)m.ledgerMatched=true;
  for(const u of r.units||[])if(u.vehicleId)m.units[e.id+'|'+u.vehicleId]=e.at;
  s[15]=Object.keys(m.dispatch).length;s[16]=Object.keys(m.units).length;s[19]=s[19]===true||r.shared===true;
  s[10]=s[7]&&s[8]?Math.max(0,(nxTime(s[8])-nxTime(s[7]))/1000):'';
  s[11]=s[8]&&s[9]?Math.max(0,(nxTime(s[9])-nxTime(s[8]))/1000):'';
  s[14]=m.ledgerMatched?'CAPTURED':s[9]?'PENDING_TRANSACTION':'NOT_COMPLETED';
  s[21]=nxWeek(s[8]||s[7]||s[22]).key;s[23]=new Date().toISOString();
}
function nx2ReduceCredit(state,e){
  const r=e.record||{};
  if(!r.transactionId||nxTime(r.transactionAt)===null||r.actualCredits==null||r.actualCredits===''||!Number.isFinite(Number(r.actualCredits))||Number(r.actualCredits)<0)return;
  const key=String(e.player)+'|'+r.transactionId;
  const value={player:String(e.player),record:{transactionId:String(r.transactionId),transactionAt:new Date(r.transactionAt).toISOString(),actualCredits:Number(r.actualCredits),missionId:r.missionId||''}};
  const old=state.credits[key];
  if(old&&(old.record.transactionAt!==value.record.transactionAt||old.record.actualCredits!==value.record.actualCredits))throw Error('Conflicting credit transaction '+key);
  state.credits[key]=old?.record.missionId?old:value;
}
function nx2Totals(state,now){
  const summaries=[],events=[],units=[];
  for(const m of Object.values(state.missions)){
    const s=m.row.slice();
    // Actual revenue comes only from transaction identities/times. Unknown is
    // pending, never an advertised reward silently treated as a bank payment.
    s[13]='';summaries.push(s);
    for(const [id,at]of Object.entries(m.dispatch)){const e=new Array(23).fill('');e[0]=id;e[2]=s[1];e[4]='dispatch';e[5]=at;events.push(e);}
    for(const [id,at]of Object.entries(m.units)){const u=new Array(16).fill('');u[0]=id;u[2]=s[1];u[5]=at;u[6]=id;units.push(u);}
  }
  return nxIncomeRows(summaries,events,Object.values(state.credits),units,[],now).days;
}
function nx2Combine(rows,now){
  const map=new Map();
  for(const r of rows){const key=r[2]+'|'+nxDay(r[0]);if(!map.has(key))map.set(key,[nxDay(r[0]),r[1],String(r[2]),...new Array(14).fill(0),now]);const d=map.get(key);for(const i of [3,4,5,6,7,8,9,10,11,12,13,16])d[i]+=Number(r[i])||0;}
  return Array.from(map.values(),d=>{d[14]=d[11]?d[10]/d[11]:0;d[15]=d[13]?d[12]/d[13]:0;return d;});
}
function nx2Document(folder,name,initial){
  const found=folder.getFilesByName(name+'.json'),file=found.hasNext()?found.next():folder.createFile(name+'.json',JSON.stringify(initial),MimeType.PLAIN_TEXT);
  return {file,value:JSON.parse(file.getBlob().getDataAsString())};
}
function nx2Save(doc){const text=JSON.stringify(doc.value);doc.file.setContent(text);if(nxHash(doc.file.getBlob().getDataAsString())!==nxHash(text))throw Error('State verification failed');}
function nx2Context(){
  const root=DriveApp.getFolderById(NX_FOLDER),folder=nxFolder(root,'Nexus Rolling Logger');
  const props=PropertiesService.getScriptProperties();let id=props.getProperty('NX2_REPORT_BOOK');
  if(!id){
    const files=folder.getFilesByName('Nexus Live Reporting v2');
    const report=files.hasNext()?SpreadsheetApp.openById(files.next().getId()):SpreadsheetApp.create('Nexus Live Reporting v2');
    report.setSpreadsheetTimeZone('Europe/London');DriveApp.getFileById(report.getId()).moveTo(folder);
    const old=SpreadsheetApp.openById(NX_SHEET);
    for(const [name,headers]of [['Metric Contributions',NX2_CONTRIBUTIONS],['Mission Summary',MC_LOGGER_SHEETS.summaries.headers]]){
      const s=old.getSheetByName(name),target=nxSheet(report,name,headers);
      if(s&&s.getLastRow()>1&&target.getLastRow()===1)nxSetRows(target,2,s.getRange(2,1,s.getLastRow()-1,headers.length).getValues(),[0]);
    }
    props.setProperty('NX2_REPORT_BOOK',report.getId());id=report.getId();
  }
  return {folder,state:nxFolder(folder,'State'),receipts:nxFolder(folder,'Receipts'),book:SpreadsheetApp.openById(id),pending:[],docs:new Map(),raw:new Map()};
}
function nx2Part(ctx,receipt,count){
  const props=PropertiesService.getScriptProperties();
  let id=receipt.value.partId||props.getProperty('NX2_ACTIVE_PART');
  let book=id?SpreadsheetApp.openById(id):null;
  if(!receipt.value.partId&&book&&((book.getSheets().reduce((n,s)=>n+s.getMaxRows()*s.getMaxColumns(),0)+(count+(ctx.raw.get(id)?.rows.length||0))*NX2_HEADERS.length)>NX2_LIMIT)){
    nx2IndexPart(ctx,book,'SEALED');book=null;
  }
  if(!book){book=SpreadsheetApp.create('Nexus Event Archive '+new Date().toISOString());book.setSpreadsheetTimeZone('Europe/London');const sheet=book.getSheets()[0];sheet.setName('Events');sheet.getRange(1,1,1,NX2_HEADERS.length).setValues([NX2_HEADERS]);if(sheet.getMaxColumns()>NX2_HEADERS.length)sheet.deleteColumns(NX2_HEADERS.length+1,sheet.getMaxColumns()-NX2_HEADERS.length);DriveApp.getFileById(book.getId()).moveTo(ctx.folder);props.setProperty('NX2_ACTIVE_PART',book.getId());}
  // Persist allocation BEFORE appending. A retry across a rollover must return
  // to its original part, not duplicate the file into the next workbook.
  if(!receipt.value.partId){receipt.value.partId=book.getId();nx2Save(receipt);}
  return book;
}
function nx2IndexPart(ctx,book,status){const s=book.getSheetByName('Events');nxStore(nxSheet(ctx.book,'Rolling Archives',NX2_PARTS),[[book.getId(),book.getId(),book.getUrl(),status,Math.max(0,s.getLastRow()-1),book.getSheets().reduce((n,s)=>n+s.getMaxRows()*s.getMaxColumns(),0),new Date()]],[0],true);}
function nx2Import(ctx,marker,body){
  const receipt=nx2Document(ctx.receipts,body.id,{id:body.id,rawFileId:marker.fileId,status:'PENDING'});
  if(receipt.value.rawFileId!==marker.fileId)throw Error('Receipt raw file conflict');
  if(receipt.value.status==='DONE')return receipt;
  const total=body.events.length,start=receipt.value.nextEventOffset||0;
  body=nx2Chunk(body,start);
  const part=nx2Part(ctx,receipt,body.events.length),sheet=part.getSheetByName('Events');
  const rows=body.events.map(e=>{const json=JSON.stringify(e);return [e.id,new Date(e.at).toISOString(),body.received_at||'',String(e.player),e.kind,e.record?.missionId||e.missionId||'',body.id,marker.fileId,json.length<45000?json:JSON.stringify({rawFileId:marker.fileId,eventId:e.id,oversize:true}),body.telemetry?.[e.id]?.isReplay===true];});
  if(!ctx.raw.has(part.getId()))ctx.raw.set(part.getId(),{part,sheet,rows:[]});
  ctx.raw.get(part.getId()).rows.push(...rows);
  const groups=new Map(),add=(key,type,e)=>{if(!groups.has(key))groups.set(key,[]);groups.get(key).push([type,e]);};
  for(const e of body.events){const r=e.record||{},id=String(r.missionId||e.missionId||'');if(e.kind==='mission'&&/^\d+$/.test(id))add(nx2MissionBucket(e.player,id),'mission',e);
    if(r.transactionId&&nxTime(r.transactionAt)!==null){add('c-'+e.player+'-'+nxDay(r.transactionAt),'credit',e);if(/^\d+$/.test(id))add(nx2MissionBucket(e.player,id),'mission',e);}}
  for(const [key,items]of groups){
    if(!ctx.docs.has(key))ctx.docs.set(key,nx2Document(ctx.state,key,{schema:2,missions:{},credits:{}}));
    const doc=ctx.docs.get(key);
    for(const [type,e]of items)if(type==='mission')nx2ReduceMission(doc.value,e);else nx2ReduceCredit(doc.value,e);
  }
  ctx.pending.push({receipt,body,nextEventOffset:start+body.events.length,total});return receipt;
}
function nx2Flush(ctx){
  if(!ctx.pending.length)return;
  for(const {part,sheet,rows}of ctx.raw.values()){nxStore(sheet,rows,[0]);nx2IndexPart(ctx,part,part.getId()===PropertiesService.getScriptProperties().getProperty('NX2_ACTIVE_PART')?'ACTIVE':'SEALED');}
  for(const [key,doc]of ctx.docs){
    nx2Save(doc);
    const now=new Date(),totals=nx2Totals(doc.value,now);
    const table=nxSheet(ctx.book,'Metric Contributions',NX2_CONTRIBUTIONS);
    // Replace all previously emitted days, including days emptied by an earlier
    // first-observed timestamp arriving late. Never increment on a retry.
    const previous=nxFindRows(table,1,[key],19),next=new Map(totals.map(r=>[r[2]+'|'+nxDay(r[0]),r]));
    for(const {row}of previous){const r=row.slice(1),k=r[2]+'|'+nxDay(r[0]);if(!next.has(k))next.set(k,[nxDay(r[0]),r[1],String(r[2]),...new Array(14).fill(0),now]);}
    nxStore(table,Array.from(next.values(),r=>[key,...r]),[0,1,3],true);
    if(Object.keys(doc.value.missions).length)nxStore(nxTable(ctx.book,'summaries'),Object.values(doc.value.missions).map(m=>{const r=m.row.slice();for(const i of [7,8,9,22,23])if(r[i])r[i]=new Date(r[i]);return r;}),[0],true);
  }
  const health=ctx.pending.filter(x=>x.body.loggerHealth).map(({body})=>{const h=body.loggerHealth;return [body.id,new Date(body.received_at),new Date(h.newestEventAt),h.oldestQueuedEventAt?new Date(h.oldestQueuedEventAt):'',h.freshEventCount,h.backlogEventCount,h.queueDepth,h.activityDate];});
  if(health.length)nxStore(nxSheet(ctx.book,'Logger Health',['batch_id','received_at','newest_event_time','oldest_queued_event_time','fresh_event_count','backlog_event_count','queue_depth','activity_date']),health);
  nxStore(nxTable(ctx.book,'uploads'),ctx.pending.map(({body})=>[body.id,Array.from(new Set(body.events.map(e=>e.player))).join(','),body.events[0]?.device||'',new Date(body.received_at||body.createdAt),body.events.length,body.events.reduce((n,e)=>n+(e.record?.units?.length||0),0),body.events.find(e=>e.record?.clientVersion)?.record.clientVersion||'extension',false,'IMPORTED_V2','']));
  for(const {body,receipt,nextEventOffset,total}of ctx.pending){
  receipt.value.nextEventOffset=nextEventOffset;receipt.value.status=nextEventOffset>=total?'DONE':'PARTIAL';receipt.value.completedAt=new Date().toISOString();nx2Save(receipt);
  }
  ctx.pending=[];ctx.docs.clear();ctx.raw.clear();
}
function nx2Publish(ctx){
  const sheet=nxSheet(ctx.book,'Metric Contributions',NX2_CONTRIBUTIONS),now=new Date();
  const rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,19).getValues().map(r=>r.slice(1)):[];
  const totals=nx2Combine(rows,now);if(!totals.length)return;
  nxStore(nxTable(ctx.book,'dashboard'),totals,[0,2],true);
  const props=PropertiesService.getScriptProperties();props.setProperty('NEXUS_LAST_REPORT',now.toISOString());props.deleteProperty('NEXUS_REPORT_ERROR');
  const ready=props.getProperty('NX2_HISTORY_READY')==='1';
  nxSetRows(nxSheet(ctx.book,'Pipeline Health',['metric','value']),2,[['coverage',ready?'Accepted raw-file history processed; live updates continue.':'Historical recovery in progress. Processed totals are partial; captured credits are recorded transactions, not estimated rewards.'],['updated_at',now],['reporting_book',ctx.book.getUrl()]]);
  nxTable(ctx.book,'dashboard').getRange(2,18,Math.max(1,totals.length),1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
}
function nx2Queue(ctx,folderName,cursorKey,deadline){
  const props=PropertiesService.getScriptProperties(),root=DriveApp.getFolderById(NX_FOLDER),pending=nxFolder(root,folderName),done=nxFolder(root,'Extension Imported Batches');
  let files;try{const token=props.getProperty(cursorKey);files=token?DriveApp.continueFileIterator(token):pending.getFiles();}catch{files=pending.getFiles();}
  let count=0;
  while(Date.now()<deadline-20000&&files.hasNext()){
    const f=files.next();try{const marker=JSON.parse(f.getBlob().getDataAsString()),body=JSON.parse(DriveApp.getFileById(marker.fileId).getBlob().getDataAsString());
      if(marker.id!==body.id||marker.createdAt!==body.createdAt)throw Error('Raw identity mismatch');
      const receipt=nx2Import(ctx,marker,body);
      // Queue marker movement is deferred until every archive/state write has
      // verified. A crash only replays idempotent event/transaction identities.
      if(!ctx.moves)ctx.moves=[];ctx.moves.push({file:f,receipt});count++;
      if(ctx.pending.length>=4||ctx.docs.size>=4){nx2Flush(ctx);for(const item of ctx.moves)if(item.receipt.value.status==='DONE')item.file.moveTo(done);ctx.moves=[];props.setProperty('NEXUS_LAST_IMPORT',new Date().toISOString());}
    }catch(e){ctx.errors=true;props.setProperty('NX2_ERROR',String(e.message).slice(0,500));console.error(e);}
    props.setProperty(cursorKey,files.getContinuationToken());
  }
  nx2Flush(ctx);for(const item of ctx.moves||[])if(item.receipt.value.status==='DONE')item.file.moveTo(done);ctx.moves=[];
  if(count)props.setProperty('NEXUS_LAST_IMPORT',new Date().toISOString());
  if(!files.hasNext())props.deleteProperty(cursorKey);return count;
}
function nx2Backfill(ctx,deadline){
  const props=PropertiesService.getScriptProperties(),root=DriveApp.getFolderById(NX_FOLDER),batches=nxFolder(root,'Extension Batches');
  // Current day first, then older folders. Each accepted file has a durable v2
  // receipt, so restarting a cursor neither drops nor double-counts reports.
  const today=Utilities.formatDate(new Date(),'UTC','yyyy-MM-dd'),folders=batches.getFolders(),days=[];
  while(folders.hasNext()){const f=folders.next();if(/^\d{4}-\d{2}-\d{2}$/.test(f.getName()))days.push({id:f.getId(),day:f.getName()});}
  days.sort((a,b)=>b.day.localeCompare(a.day));
  props.setProperty('NX2_HISTORY_READY',days.every(item=>props.getProperty('NX2_DAY_DONE_'+item.day)==='1')?'1':'0');
  for(const item of days){if(Date.now()>deadline-25000)break;if(props.getProperty('NX2_DAY_DONE_'+item.day)==='1')continue;
    const key='NX2_DAY_CURSOR_'+item.day;let files;try{const token=props.getProperty(key);files=token?DriveApp.continueFileIterator(token):DriveApp.getFolderById(item.id).getFiles();}catch{files=DriveApp.getFolderById(item.id).getFiles();}
    while(files.hasNext()&&Date.now()<deadline-25000){
      const f=files.next(),name=f.getName().replace(/\.json$/,''),existing=ctx.receipts.getFilesByName(name+'.json');
      if(existing.hasNext()&&JSON.parse(existing.next().getBlob().getDataAsString()).status==='DONE'){props.setProperty(key,files.getContinuationToken());continue;}
      const body=JSON.parse(f.getBlob().getDataAsString());
      if(body.schema!==1||!Array.isArray(body.events))throw Error('Invalid saved batch '+name);
      let receipt;
      do {receipt=nx2Import(ctx,{fileId:f.getId()},body);nx2Flush(ctx);}
      while(receipt.value.status!=='DONE'&&Date.now()<deadline-25000);
      // Never advance a backfill cursor past a partially processed file.
      if(receipt.value.status!=='DONE')return;
      props.setProperty(key,files.getContinuationToken());
    }
    nx2Flush(ctx);
    props.setProperty(key,files.getContinuationToken());
    if(!files.hasNext()){props.deleteProperty(key);props.setProperty('NX2_DAY_DONE_'+item.day,'1');}else break;
  }
  props.setProperty('NX2_HISTORY_READY',days.every(item=>props.getProperty('NX2_DAY_DONE_'+item.day)==='1')?'1':'0');
}
function nexusRollingTick(){
  const lock=LockService.getScriptLock();if(!lock.tryLock(1000))return;const props=PropertiesService.getScriptProperties();
  if(Number(props.getProperty('NEXUS_REPORT_LEASE')||0)>Date.now()){lock.releaseLock();return;}
  props.setProperty('NEXUS_REPORT_LEASE',String(Date.now()+360000));lock.releaseLock();
  const start=Date.now();let ctx;
  try{ctx=nx2Context();nx2Queue(ctx,'Extension Pending Live Imports','NX2_LIVE_CURSOR',start+85000);nx2Publish(ctx);nx2Queue(ctx,'Extension Pending Imports','NX2_BACKLOG_CURSOR',start+135000);nx2Publish(ctx);nx2Backfill(ctx,start+205000);nx2Publish(ctx);if(!ctx.errors)props.deleteProperty('NX2_ERROR');}
  catch(e){props.setProperty('NX2_ERROR',String(e.message).slice(0,500));console.error(e);}
  finally{if(lock.tryLock(1000)){props.deleteProperty('NEXUS_REPORT_LEASE');lock.releaseLock();}}
}
function installNexusRollingLogger(){
  const props=PropertiesService.getScriptProperties();
  // Existing raw files and data tables stay intact for reconciliation/rollback.
  nx2Context();props.setProperty('NX2_ENABLED','1');
  installNexusReportTrigger();console.log('Rolling logger enabled; raw history preserved; current-day backfill prioritised.');
}
function nexusRollingHealth(){
  const p=PropertiesService.getScriptProperties(),ctx={book:SpreadsheetApp.openById(p.getProperty('NX2_REPORT_BOOK')||NX_SHEET)},root=DriveApp.getFolderById(NX_FOLDER),result={engine:2,enabled:p.getProperty('NX2_ENABLED'),reportBook:ctx.book.getId(),error:p.getProperty('NX2_ERROR'),lastImport:p.getProperty('NEXUS_LAST_IMPORT'),lastReport:p.getProperty('NEXUS_LAST_REPORT'),leaseUntil:p.getProperty('NEXUS_REPORT_LEASE'),pendingLive:nxFolder(root,'Extension Pending Live Imports').getFiles().hasNext(),pendingBacklog:nxFolder(root,'Extension Pending Imports').getFiles().hasNext(),activePart:p.getProperty('NX2_ACTIVE_PART')};
  const table=ctx.book.getSheetByName('Metric Contributions');result.contributionRows=table?Math.max(0,table.getLastRow()-1):0;
  console.log(JSON.stringify(result));return result;
}
