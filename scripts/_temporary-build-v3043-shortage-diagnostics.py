from pathlib import Path
import hashlib
import json
import re
import subprocess

SOURCE = Path('src/missionchief-command-nexus.user.js')


def function_span(text: str, name: str, start_at: int = 0):
    match = re.search(rf'(?m)^\s*(?:async\s+)?function\s+{re.escape(name)}\s*\(', text[start_at:])
    if not match:
        raise SystemExit(f'Function not found: {name}')
    start = start_at + match.start()
    paren = text.find('(', start)
    pdepth = 0
    quote = ''
    escaped = False
    i = paren
    while i < len(text):
        ch = text[i]
        if quote:
            if escaped: escaped = False
            elif ch == '\\': escaped = True
            elif ch == quote: quote = ''
            i += 1
            continue
        if ch in "'\"`":
            quote = ch
            i += 1
            continue
        if ch == '(':
            pdepth += 1
        elif ch == ')':
            pdepth -= 1
            if pdepth == 0:
                i += 1
                break
        i += 1
    brace = text.find('{', i)
    depth = 0
    quote = ''
    escaped = False
    line_comment = False
    block_comment = False
    i = brace
    while i < len(text):
        ch = text[i]
        nxt = text[i + 1] if i + 1 < len(text) else ''
        if line_comment:
            if ch == '\n': line_comment = False
            i += 1
            continue
        if block_comment:
            if ch == '*' and nxt == '/':
                block_comment = False
                i += 2
                continue
            i += 1
            continue
        if quote:
            if escaped: escaped = False
            elif ch == '\\': escaped = True
            elif ch == quote: quote = ''
            i += 1
            continue
        if ch == '/' and nxt == '/':
            line_comment = True
            i += 2
            continue
        if ch == '/' and nxt == '*':
            block_comment = True
            i += 2
            continue
        if ch in "'\"`":
            quote = ch
            i += 1
            continue
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return start, i + 1
        i += 1
    raise SystemExit(f'Unterminated function: {name}')


def replace_function(text: str, name: str, replacement: str, start_at: int = 0) -> str:
    start, end = function_span(text, name, start_at)
    return text[:start] + replacement.strip() + text[end:]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


def compact_function_leading_space(text: str, name: str) -> str:
    start, end = function_span(text, name)
    body = text[start:end]
    # Do not alter indentation inside multi-line template literals.
    in_template = False
    escaped = False
    for ch in body:
        if in_template:
            if escaped:
                escaped = False
            elif ch == '\\':
                escaped = True
            elif ch == '`':
                in_template = False
        elif ch == '`':
            in_template = True
    # Balanced templates are required, but a template may still span lines.
    lines = body.splitlines()
    template_open = False
    compacted = []
    for line in lines:
        if not template_open:
            compacted.append(line.lstrip())
        else:
            compacted.append(line)
        escaped = False
        for ch in line:
            if escaped:
                escaped = False
                continue
            if ch == '\\':
                escaped = True
                continue
            if ch == '`':
                template_open = not template_open
    if template_open:
        raise SystemExit(f'Unbalanced template literal while compacting {name}')
    compacted_body = '\n'.join(line for line in compacted if line.strip())
    return text[:start] + compacted_body + text[end:]


source = SOURCE.read_text(encoding='utf-8')
if source.count('3.0.42') < 3:
    raise SystemExit('Expected Command Nexus 3.0.42 baseline.')
if 'MISSION FINDER V10.6.179' not in source:
    raise SystemExit('Expected Mission Finder V10.6.179 baseline.')
source = source.replace('3.0.42', '3.0.43')
source = source.replace('10.6.179', '10.6.180')

# Diagnostic-only extension of the canonical requirement matcher. Existing callers keep includeDisabled=false.
start, end = function_span(source, 'getAllMatchingVehicleCheckboxes')
matcher = source[start:end]
matcher = replace_once(
    matcher,
    'function getAllMatchingVehicleCheckboxes(originalName, mappedName, includeChecked) {',
    'function getAllMatchingVehicleCheckboxes(originalName, mappedName, includeChecked, includeDisabled = false) {',
    'diagnostic includeDisabled signature',
)
matcher = matcher.replace('if (input.disabled) return false;', 'if (!includeDisabled && input.disabled) return false;')
matcher = matcher.replace('if (input.disabled) {', 'if (!includeDisabled && input.disabled) {')
matcher = matcher.replace('!input.disabled &&', '(includeDisabled || !input.disabled) &&')
if 'input.disabled ||' in matcher:
    matcher = matcher.replace('input.disabled ||', '(!includeDisabled && input.disabled) ||')
if re.search(r'(?<!includeDisabled && )\binput\.disabled\b', matcher):
    # Raw occurrences are allowed only in diagnostic-independent expressions after the transformations above.
    leftovers = sorted(set(re.findall(r'.{0,60}input\.disabled.{0,60}', matcher)))
    raise SystemExit('Unreviewed input.disabled matcher occurrences remain:\n' + '\n'.join(leftovers[:20]))
source = source[:start] + matcher + source[end:]

# Add compact diagnostic-only candidate evidence helpers immediately before the snapshot builder.
insert_at, _ = function_span(source, 'mfBuildUnitFinderDiagnosticSnapshot')
helpers = r'''
function mfDiagnosticVehicleEvidence(input,registry,reason=''){
const row=input?.closest?.('tr')||null,reg=mfGetDiagnosticRegistryEvidence(input,registry),link=row?.querySelector?.('a[href*="/buildings/"]')||null;
const attr=name=>String(input?.getAttribute?.(name)||row?.getAttribute?.(name)||''),buildingId=attr('building_id')||attr('building-id')||attr('data-building-id');
const stationName=String(reg?.stationName||link?.textContent||link?.innerText||'').replace(/\s+/g,' ').trim().slice(0,240),stationHref=String(reg?.stationHref||link?.getAttribute?.('href')||'').slice(0,500);
return{vehicleId:getMissionVehicleId(input),vehicleName:getVehicleDebugName(input),vehicleTypeIds:getVehicleTypeIdentifiers(input).map(String).slice(0,8),stationName,stationHref,buildingId,checked:input?.checked===true,disabled:input?.disabled===true,reason:String(reason||''),registryMatchMode:String(reg?.matchType||''),registrySource:String(reg?.source||''),assignedPersonnelCount:Number.isFinite(Number(reg?.assignedPersonnelCount))?Math.max(0,parseInt(reg.assignedPersonnelCount,10)||0):null,assignmentScanComplete:reg?.assignmentScanComplete===true,trainingProfilesComplete:reg?.trainingProfilesComplete===true};
}
function mfDiagnosticStationSummary(items){
const map=new Map();(items||[]).forEach(v=>{const key=v.stationName||v.stationHref||v.buildingId||'Unknown station',x=map.get(key)||{stationName:v.stationName||'Unknown station',stationHref:v.stationHref||'',buildingId:v.buildingId||'',candidateCount:0,selectedCount:0,disabledCount:0,availableUnselectedCount:0,qualifyingPersonnel:0,reasons:{}};x.candidateCount+=1;if(v.checked)x.selectedCount+=1;if(v.disabled)x.disabledCount+=1;if(!v.checked&&!v.disabled)x.availableUnselectedCount+=1;x.qualifyingPersonnel+=Math.max(0,Number(v.qualifyingPersonnelCount||0));const r=String(v.reason||'unknown');x.reasons[r]=(x.reasons[r]||0)+1;map.set(key,x);});return Array.from(map.values()).sort((a,b)=>b.disabledCount-a.disabledCount||b.availableUnselectedCount-a.availableUnselectedCount||b.candidateCount-a.candidateCount||a.stationName.localeCompare(b.stationName));
}
function mfGetDiagnosticRequirementCandidateEvidence(rows){
let registry={vehicles:{}};try{registry=readPersonnelTrainingRegistry();}catch(_error){}return(rows||[]).filter(r=>Number(r?.required||0)>Number(r?.selected||0)&&!/assigned trained/i.test(String(r?.originalName||r?.mappedName||''))).map(r=>{let boxes=[];try{boxes=getAllMatchingVehicleCheckboxes(r.originalName,r.mappedName,true,true);}catch(_error){}const items=boxes.map(input=>mfDiagnosticVehicleEvidence(input,registry,input.checked?'selected':input.disabled?'disabled-or-unavailable':'available-not-selected'));return{name:String(r.originalName||r.mappedName||''),mappedName:String(r.mappedName||''),required:Math.max(0,Number(r.required||0)),selected:Math.max(0,Number(r.selected||0)),shortfall:Math.max(0,Number(r.required||0)-Number(r.selected||0)),matchedCandidates:items.length,selectedCandidates:items.filter(v=>v.checked).length,disabledOrUnavailable:items.filter(v=>v.disabled&&!v.checked).length,availableUnselected:items.filter(v=>!v.disabled&&!v.checked).length,stationSummary:mfDiagnosticStationSummary(items),candidates:items.slice(0,16)};});
}
function mfGetDiagnosticTrainedCandidateEvidence(rows){
let registry={vehicles:{}};try{registry=readPersonnelTrainingRegistry();}catch(_error){}const reqMap=new Map();(rows||[]).forEach(row=>(row?.personnelTrainingRequirements||[]).forEach(req=>{const key=JSON.stringify([req.code,req.requirementType,req.requiredTrainingCodes,req.eligibleVehicleTypeIds]);const old=reqMap.get(key);if(!old||Number(req.personnelRequired||req.required||0)>Number(old.personnelRequired||old.required||0))reqMap.set(key,req);}));const boxes=getVehicleCheckboxSnapshot(true);return Array.from(reqMap.values()).map(req=>{const types=new Set((req.eligibleVehicleTypeIds||[]).map(String)),codes=(req.requiredTrainingCodes||[]).map(String);const items=boxes.filter(input=>getVehicleTypeIdentifiers(input).some(id=>types.has(String(id)))).map(input=>{const match=getRegistryEntryForMissionCheckbox(input,registry),entry=match?.entry||null,profiles=Array.isArray(entry?.assignedTrainingProfiles)?entry.assignedTrainingProfiles:[],qualifying=profiles.filter(profile=>codes.every(code=>(profile||[]).map(String).includes(code))).length;let reason=input.checked?'selected-qualified':input.disabled?'disabled-or-unavailable':!entry?'registry-entry-missing':entry.assignmentScanComplete!==true?'assignment-scan-incomplete':entry.trainingProfilesComplete!==true?'training-profiles-incomplete':qualifying<=0?'no-required-training-combination':'available-qualified-not-selected';return{...mfDiagnosticVehicleEvidence(input,registry,reason),qualifyingPersonnelCount:qualifying,requiredTrainingCodes:codes};});return{code:String(req.code||''),label:String(req.label||''),requirementType:String(req.requirementType||''),required:Math.max(0,Number(req.required||0)),personnelRequired:Math.max(0,Number(req.personnelRequired||0)),requiredTrainingCodes:codes,eligibleVehicleTypeIds:Array.from(types),candidatesFound:items.length,qualifyingPersonnelFound:items.reduce((sum,v)=>sum+Math.max(0,Number(v.qualifyingPersonnelCount||0)),0),stationSummary:mfDiagnosticStationSummary(items),candidates:items.slice(0,24)};}).filter(item=>item.personnelRequired>0||item.required>0);
}
'''
source = source[:insert_at] + helpers.strip() + '\n' + source[insert_at:]

# Snapshot: compute rows once and append diagnostic candidate evidence only when relevant.
start, end = function_span(source, 'mfBuildUnitFinderDiagnosticSnapshot')
snap = source[start:end]
snap = replace_once(
    snap,
    """        const diagnosticBoxes = getVehicleCheckboxSnapshot(true);
        return {""",
    """        const diagnosticBoxes = getVehicleCheckboxSnapshot(true);
        const diagnosticLoadRows = vehicleLoadState.rows.map(row => ({
            originalName: String(row.originalName || ''), mappedName: String(row.mappedName || ''),
            required: Math.max(0, parseInt(row.required, 10) || 0), selected: Math.max(0, parseInt(row.selected, 10) || 0),
            status: String(row.status || '')
        }));
        const requirementCandidateEvidence = mfGetDiagnosticRequirementCandidateEvidence(diagnosticLoadRows);
        const trainedCandidateEvidence = mfGetDiagnosticTrainedCandidateEvidence(mfUnitFinderDiagnosticContext.processedRows);
        return {""",
    'diagnostic candidate evidence locals',
)
snap = snap.replace("commandNexus: '3.0.37'", "commandNexus: '3.0.43'")
snap = snap.replace("missionFinder: 'V10.6.180'", "missionFinder: 'V10.6.180'")
snap = snap.replace("personnelAssignment: '1.3.8'", "personnelAssignment: '1.3.12'")
old_rows = """                    rows: vehicleLoadState.rows.map(row => ({
                        originalName: String(row.originalName || ''),
                        mappedName: String(row.mappedName || ''),
                        required: Math.max(
                            0,
                            parseInt(row.required, 10) || 0
                        ),
                        selected: Math.max(
                            0,
                            parseInt(row.selected, 10) || 0
                        ),
                        status: String(row.status || '')
                    })),"""
snap = replace_once(snap, old_rows, '                    rows: diagnosticLoadRows,', 'reuse diagnostic load rows')
snap = replace_once(
    snap,
    """                selectedVehicles,
                knownUnstaffedAmbulanceExclusions:""",
    """                requirementCandidateEvidence,
                trainedCandidateEvidence,
                selectedVehicles,
                knownUnstaffedAmbulanceExclusions:""",
    'snapshot candidate evidence fields',
)
source = source[:start] + snap + source[end:]

# Persist meaningful evidence and signature changes.
start, end = function_span(source, 'mfPersistUnitFinderDiagnostic')
persist = source[start:end]
persist = replace_once(
    persist,
    """            snapshot.selectionSummary.vehicleLoadState.rows.length ||
            snapshot.selectionSummary.selectedVehicles.length ||""",
    """            snapshot.selectionSummary.vehicleLoadState.rows.length ||
            snapshot.selectionSummary.requirementCandidateEvidence.length ||
            snapshot.selectionSummary.trainedCandidateEvidence.length ||
            snapshot.selectionSummary.selectedVehicles.length ||""",
    'candidate evidence useful-data gate',
)
persist = replace_once(
    persist,
    """            selected: snapshot.selectionSummary.selectedVehicles
                .map(vehicle => vehicle.vehicleId || vehicle.vehicleName),
            knownUnstaffed:""",
    """            selected: snapshot.selectionSummary.selectedVehicles
                .map(vehicle => vehicle.vehicleId || vehicle.vehicleName),
            candidateIssues: snapshot.selectionSummary.requirementCandidateEvidence.map(item => [item.mappedName,item.shortfall,item.disabledOrUnavailable,item.availableUnselected]),
            trainedIssues: snapshot.selectionSummary.trainedCandidateEvidence.map(item => [item.code,item.personnelRequired,item.qualifyingPersonnelFound]),
            knownUnstaffed:""",
    'candidate evidence signature',
)
source = source[:start] + persist + source[end:]

# Controller failure export now retains latest per-mission evidence and aggregates station/vehicle issue hotspots.
start, end = function_span(source, 'buildRunFailureDiagnostics')
run_diag = source[start:end]
run_diag = replace_once(
    run_diag,
    """selectionShortfalls: [],
visibleAlerts: [],
selectedVehicleCount: 0,""",
    """selectionShortfalls: [],
requirementCandidateEvidence: [],
trainedCandidateEvidence: [],
visibleAlerts: [],
selectedVehicleCount: 0,""",
    'mission diagnostic evidence fields',
)
run_diag = replace_once(
    run_diag,
    """mission.selectionShortfalls = selectionShortfalls;
mission.visibleAlerts =""",
    """mission.selectionShortfalls = selectionShortfalls;
mission.requirementCandidateEvidence = Array.isArray(snapshot?.selectionSummary?.requirementCandidateEvidence) ? snapshot.selectionSummary.requirementCandidateEvidence : [];
mission.trainedCandidateEvidence = Array.isArray(snapshot?.selectionSummary?.trainedCandidateEvidence) ? snapshot.selectionSummary.trainedCandidateEvidence : [];
mission.visibleAlerts =""",
    'copy candidate evidence into mission record',
)
insert_marker = """const unresolvedMissions = missions.filter(mission =>
mission.fulfilment === 'partially-fulfilled' ||
mission.fulfilment === 'unfulfilled' ||
mission.staffingFailures.length ||
mission.retriesAndRecoveries.length ||
stalledTransportMissionIds.has(mission.missionId)
);"""
aggregation = insert_marker + r'''
const stationIssueMap=new Map(),vehicleIssueMap=new Map();
missions.forEach(mission=>[...(mission.requirementCandidateEvidence||[]),...(mission.trainedCandidateEvidence||[])].forEach(group=>(group.candidates||[]).forEach(vehicle=>{const reason=String(vehicle.reason||'unknown');if(/^selected/.test(reason))return;const sk=vehicle.stationName||vehicle.stationHref||vehicle.buildingId||'Unknown station',s=stationIssueMap.get(sk)||{stationName:vehicle.stationName||'Unknown station',stationHref:vehicle.stationHref||'',buildingId:vehicle.buildingId||'',occurrences:0,missionIds:new Set(),requirements:new Set(),reasons:{}};s.occurrences+=1;s.missionIds.add(mission.missionId);s.requirements.add(String(group.label||group.name||group.mappedName||group.code||''));s.reasons[reason]=(s.reasons[reason]||0)+1;stationIssueMap.set(sk,s);const vk=vehicle.vehicleId||`${sk}|${vehicle.vehicleName}`,v=vehicleIssueMap.get(vk)||{vehicleId:vehicle.vehicleId||'',vehicleName:vehicle.vehicleName||'',stationName:vehicle.stationName||'',stationHref:vehicle.stationHref||'',buildingId:vehicle.buildingId||'',occurrences:0,missionIds:new Set(),requirements:new Set(),reasons:{}};v.occurrences+=1;v.missionIds.add(mission.missionId);v.requirements.add(String(group.label||group.name||group.mappedName||group.code||''));v.reasons[reason]=(v.reasons[reason]||0)+1;vehicleIssueMap.set(vk,v);})));const compactIssue=item=>({...item,missionIds:Array.from(item.missionIds),requirements:Array.from(item.requirements).filter(Boolean)}),stationIssueSummary=Array.from(stationIssueMap.values()).map(compactIssue).sort((a,b)=>b.occurrences-a.occurrences||a.stationName.localeCompare(b.stationName)).slice(0,100),vehicleIssueSummary=Array.from(vehicleIssueMap.values()).map(compactIssue).sort((a,b)=>b.occurrences-a.occurrences).slice(0,160);'''
run_diag = replace_once(run_diag, insert_marker, aggregation, 'station and vehicle issue aggregation')
run_diag = replace_once(
    run_diag,
    """staffingFailureCount: Number(staffingFailures?.currentRunFailureCount || 0),
zeroSelectionRecoveryCount:""",
    """staffingFailureCount: Number(staffingFailures?.currentRunFailureCount || 0),
stationIssueCount: stationIssueSummary.length,
vehicleIssueCount: vehicleIssueSummary.length,
zeroSelectionRecoveryCount:""",
    'summary issue counts',
)
run_diag = replace_once(
    run_diag,
    """stalledTransports,
unresolvedMissions,
missions,""",
    """stalledTransports,
stationIssueSummary,
vehicleIssueSummary,
unresolvedMissions,
missions,""",
    'export issue summaries',
)
source = source[:start] + run_diag + source[end:]

# Reclaim release-size headroom by removing indentation only in large diagnostic/matcher functions.
for name in [
    'getAllMatchingVehicleCheckboxes',
    'mfBuildUnitFinderDiagnosticSnapshot',
    'mfPersistUnitFinderDiagnostic',
    'selectVehiclesForTrainedPersonnelRequirements',
    'refreshPoliceInspectorRegistryFromLiveVehicles',
    'refreshArmedResponseRegistryFromLiveVehicles',
]:
    source = compact_function_leading_space(source, name)

SOURCE.write_text(source, encoding='utf-8')

# Focused regressions.
Path('scripts/check-v3-shortage-station-diagnostics-v3043.mjs').write_text(r'''#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js','utf8');
function fn(name){const m=source.match(new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`));assert.ok(m,`${name} missing`);const start=m.index,brace=source.indexOf('{',source.indexOf(')',start));let d=0,q='',e=false;for(let i=brace;i<source.length;i++){const c=source[i];if(q){if(e)e=false;else if(c==='\\\\')e=true;else if(c===q)q='';continue;}if(c==="'"||c==='"'||c==='`'){q=c;continue;}if(c==='{')d++;if(c==='}'&&--d===0)return source.slice(start,i+1);}assert.fail(`${name} unterminated`);}
const matcher=fn('getAllMatchingVehicleCheckboxes');
assert.match(matcher,/includeDisabled\s*=\s*false/,'diagnostic matcher switch missing');
assert.match(matcher,/!includeDisabled\s*&&\s*input\.disabled/,'default selection must still reject disabled vehicles');
const build=fn('mfBuildUnitFinderDiagnosticSnapshot');
assert.match(build,/requirementCandidateEvidence/);
assert.match(build,/trainedCandidateEvidence/);
const ordinary=fn('mfGetDiagnosticRequirementCandidateEvidence');
assert.match(ordinary,/getAllMatchingVehicleCheckboxes\([^)]*true,true\)/s,'diagnostics must reuse the exact matcher while including disabled candidates');
assert.match(ordinary,/disabled-or-unavailable/);
assert.match(ordinary,/available-not-selected/);
const trained=fn('mfGetDiagnosticTrainedCandidateEvidence');
for(const token of ['registry-entry-missing','assignment-scan-incomplete','training-profiles-incomplete','no-required-training-combination','available-qualified-not-selected'])assert.ok(trained.includes(token),`trained evidence lost ${token}`);
assert.match(trained,/requiredTrainingCodes/);
assert.match(trained,/stationSummary/);
const vehicle=fn('mfDiagnosticVehicleEvidence');
for(const token of ['stationName','stationHref','buildingId','registryMatchMode','assignedPersonnelCount'])assert.ok(vehicle.includes(token),`vehicle evidence lost ${token}`);
assert.doesNotMatch(trained,/personnelName|personName|firstName|lastName/i,'diagnostics must not retain personnel names');
console.log('PASS: v3.0.43 exports exact candidate vehicles, station identity and rejection reasons without changing normal disabled-vehicle selection.');
''',encoding='utf-8')

Path('scripts/check-v3-shortage-export-aggregation-v3043.mjs').write_text(r'''#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source=await readFile('src/missionchief-command-nexus.user.js','utf8');
const start=source.indexOf('function buildRunFailureDiagnostics(');assert.ok(start>=0);const end=source.indexOf('\nfunction diagnosticsSnapshot(',start);assert.ok(end>start);const body=source.slice(start,end);
for(const token of ['requirementCandidateEvidence','trainedCandidateEvidence','stationIssueSummary','vehicleIssueSummary','stationIssueCount','vehicleIssueCount'])assert.ok(body.includes(token),`run export lost ${token}`);
assert.match(body,/missionIds:new Set\(\)/);
assert.match(body,/requirements:new Set\(\)/);
assert.match(body,/reasons:\{\}/);
assert.match(source,/commandNexus:\s*'3\.0\.43'/,'Unit Finder diagnostic version must identify the live build');
assert.match(source,/missionFinder:\s*'V10\.6\.180'/);
assert.match(source,/personnelAssignment:\s*'1\.3\.12'/);
console.log('PASS: v3.0.43 aggregates candidate rejection evidence into station and vehicle issue summaries.');
''',encoding='utf-8')

# Update component lock and docs.
endurance=Path('scripts/check-v3-12-hour-endurance-telemetry.mjs')
text=endurance.read_text(encoding='utf-8').replace("const MISSION_FINDER_VERSION = '10.6.179';","const MISSION_FINDER_VERSION = '10.6.180';")
endurance.write_text(text,encoding='utf-8')

changelog=Path('CHANGELOG.md')
text=changelog.read_text(encoding='utf-8')
entry="""## [3.0.43] - 2026-09-03

### Diagnostics

- Add diagnostic-only candidate tracing for incomplete Unit Finder requirements. The export now shows exact vehicle IDs/names, station identity when available, selected/disabled/available state and the reason a matched candidate did not satisfy the mission.
- Add trained-personnel candidate evidence with required training codes, verified assignment/profile state and qualifying-personnel counts by vehicle and station. Personnel names are never exported.
- Add `stationIssueSummary` and `vehicleIssueSummary` to run failure diagnostics so repeated shortages can be ranked by station, vehicle, requirement and rejection reason.
- Reuse the canonical Unit Finder requirement matcher with an opt-in diagnostic `includeDisabled` flag; normal selection behavior remains unchanged because all existing calls retain the default `false` value.
- Correct stale component labels inside Unit Finder diagnostics and increase Command Nexus from `3.0.42` to `3.0.43` / Mission Finder from `10.6.179` to `10.6.180`.

"""
if '## [3.0.43]' not in text:text=text.replace('## [Unreleased]\n\n','## [Unreleased]\n\n'+entry,1)
changelog.write_text(text,encoding='utf-8')
for filename in ['README.md','src/README.md','docs/ARCHITECTURE.md','docs/DEVELOPER_HANDOFF.md','docs/MIGRATION.md','docs/README.md','docs/ROADMAP.md']:
    p=Path(filename);t=p.read_text(encoding='utf-8').replace('3.0.42','3.0.43').replace('10.6.179','10.6.180');p.write_text(t,encoding='utf-8')

evidence=Path('docs/evidence/shortage-station-diagnostics-gap-v3.0.42-2026-09-03.md')
evidence.write_text('''# Shortage station diagnostics gap — v3.0.42

## Source

Two owner-supplied Command Nexus `3.0.42` exports from 3 September 2026.

## Confirmed gap

The runs correctly retained requirement-level shortages such as EOD Response Vehicle, Coastguard Commander, Control Van, PRV/SRV and Armed Response trained personnel. However, the new resource/trained-personnel fail-closed paths did not retain the full matched candidate vehicle trail. `staffingFailures.stationSummary` remained limited to older staffing events, so the exports could not reliably name the station behind these newer shortages.

## v3.0.43 diagnostic correction

The canonical Unit Finder matcher is reused in diagnostic mode to include disabled/busy candidates without changing normal selection. Failure snapshots retain exact candidate vehicle identity, station/building evidence where available, selected/disabled/available state, training-verification status and rejection reason. Controller exports aggregate these into station and vehicle issue summaries.

No selection, dispatch, Worker A/B, transport, trained-personnel qualification or shortage policy is changed by this release.

## Live acceptance

Run Auto Mode normally and export diagnostics after several skips or a trained-personnel stop. `run.failureDiagnostics.stationIssueSummary`, `vehicleIssueSummary`, and each unresolved mission's candidate evidence should identify the stations/vehicles repeatedly unavailable or rejected. If a station remains unknown, the export must still provide the exact vehicle ID/name and rejection reason for follow-up.
''',encoding='utf-8')
idx=Path('docs/evidence/README.md');t=idx.read_text(encoding='utf-8');line='- [Shortage station diagnostics gap — v3.0.42](shortage-station-diagnostics-gap-v3.0.42-2026-09-03.md)\n';
if line not in t:t=t.rstrip()+'\n'+line
idx.write_text(t,encoding='utf-8')

# Candidate project state: reconcile published 3.0.42 while staging 3.0.43.
state_path=Path('project-state.json');state=json.loads(state_path.read_text(encoding='utf-8'))
size=SOURCE.stat().st_size;sha=hashlib.sha256(SOURCE.read_bytes()).hexdigest()
state['lastUpdated']='2026-09-03';state['canonical']['status']='candidate';state['canonical']['version']='3.0.43';state['canonical']['sourceBytes']=size;state['canonical']['sourceSha256']=sha;state['canonical']['components']['missionFinder']='10.6.180'
state['production'].update({'version':'3.0.42','tag':'v3.0.42','releaseCommit':'cae34b09c37a941624c18492d95e8519e2cffc4c','releaseUrl':'https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/releases/tag/v3.0.42','publishedAt':'2026-09-02T18:24:59Z','releaseStatus':'published','liveValidationStatus':'partial','liveValidationNote':'3.0.42 prevented known partial dispatches, but the 3 September exports exposed a diagnostics gap: shortage paths did not retain enough station/candidate rejection evidence.'})
state['production']['asset']={'name':'MissionChief-Command-Nexus-3.0.42.user.js','bytes':2096471,'sha256':'5e4d83e0004e4e07bb88a56c1448dd2c54124cc3a3a0d45ea760b29b423a4eb0'}
eid='RUN-2026-09-03-V3042-STATION-DIAGNOSTICS'
if not any(e.get('id')==eid for e in state.get('evidence',[])):state['evidence'].append({'id':eid,'title':'Shortage station diagnostics gap','file':str(evidence),'kind':'sanitised-summary','supports':['station-level shortage evidence','candidate rejection diagnostics']})
state['handover']['nextAction']='Install and run 3.0.43, then export diagnostics after shortage/trained-personnel events and rank run.failureDiagnostics.stationIssueSummary before changing any selection rules.'
if str(evidence) not in state['handover']['readOrder']:state['handover']['readOrder'].insert(-1,str(evidence))
state_path.write_text(json.dumps(state,indent=2)+'\n',encoding='utf-8');subprocess.run(['node','scripts/render-project-state.mjs'],check=True)

# Clean all one-use inspection/build artifacts.
for p in Path('.').glob('.tmp-v3043-*'):p.unlink()
Path('.github/workflows/_temporary-v3043-shortage-diagnostics-inspection.yml').unlink(missing_ok=True)
Path('scripts/_temporary-build-v3043-shortage-diagnostics.py').unlink(missing_ok=True)

print(f'Candidate userscript size: {size} bytes')
print(f'Candidate SHA-256: {sha}')
if size>=2*1024*1024:raise SystemExit(f'Candidate exceeds 2 MiB ceiling: {size}')
