function buildUi() {
if (document.getElementById(ROOT_ID)) return;
injectStyles();
const root = document.createElement('section');
root.id = ROOT_ID;
root.dataset.phase = state.phase;
root.dataset.collapsed = localStorage.getItem(STORAGE_COLLAPSED) === 'false' ? 'false' : 'true';
root.innerHTML = `
<div class="mcn-panel" id="mcn-auto-focus-panel" role="region" aria-label="Command Nexus V3 controls">
<div class="mcn-head"><span class="mcn-brand-mark" aria-hidden="true">N</span><div><div class="mcn-title">NEXUS</div><div class="mcn-subtitle">Auto Mode</div></div><button type="button" class="mcn-fold" aria-controls="mcn-auto-focus-summary" aria-expanded="true">Minimise</button></div>
<div class="mcn-body">
<div class="mcn-summary" id="mcn-auto-focus-summary">
<div class="mcn-status"><div class="mcn-status-row"><div class="mcn-status-main" aria-live="polite"></div><span class="mcn-state-label" data-mcn-state></span></div><div class="mcn-status-detail"></div></div>
<div class="mcn-mission"><div class="mcn-eyebrow" data-mcn-hero-label>Next mission</div><div class="mcn-mission-name" data-mcn-hero-name></div><div class="mcn-mission-id" data-mcn-hero-id></div></div>
<dl class="mcn-totals"><div><dt>Sent this run</dt><dd data-mcn-sent>0</dd></div><div><dt>Missions seen</dt><dd data-mcn-seen>0</dd></div><div><dt>Advances</dt><dd data-mcn-advances>0</dd></div></dl>
</div>
<div class="mcn-actions"><button type="button" class="mcn-action primary" data-mcn-start>Start Auto Mode</button><button type="button" class="mcn-action stop" data-mcn-stop hidden>Stop Auto Mode</button><button type="button" class="mcn-action" data-mcn-retry>Retry</button></div>
<details class="mcn-disclosure" data-mcn-skip-details><summary><span class="mcn-skips-title">Temporary skips</span><span class="mcn-skip-count" data-mcn-skip-count>0</span><span class="mcn-summary-tail">Reasons</span></summary><ol class="mcn-skip-list" data-mcn-skips></ol><p class="mcn-skip-empty" data-mcn-skips-empty>No temporarily skipped missions.</p></details>
<details class="mcn-disclosure" data-mcn-system-details><summary><span>System details</span><span class="mcn-summary-tail" data-mcn-memory>Memory normal</span></summary><div class="mcn-system-content">
<dl class="mcn-system-list"><div><dt>Phase</dt><dd data-mcn-phase></dd></div><div><dt>Working mission</dt><dd data-mcn-mission></dd></div><div><dt>Top queue</dt><dd data-mcn-top-mission></dd></div><div><dt>Workers</dt><dd data-mcn-pipeline></dd></div><div><dt>Radio transport</dt><dd data-mcn-radio></dd></div><div><dt>Transport seen</dt><dd data-mcn-transport-count></dd></div><div><dt>Live health</dt><dd data-mcn-rule-assists></dd></div></dl>
<button type="button" class="mcn-action mcn-export" data-mcn-export>Export diagnostics</button><div class="mcn-version">Local ${window.__NEXUS_EXTENSION__?.build || MASTER_VERSION} · Master ${MASTER_VERSION} · Mission Finder ${MISSION_FINDER_VERSION}</div>
</div></details>
</div></div>
<button type="button" class="mcn-launcher" aria-label="Open Command Nexus V3" aria-controls="mcn-auto-focus-panel" title="Command Nexus V3"><span class="mcn-core-n" aria-hidden="true">N</span><span class="mcn-dot" aria-hidden="true"></span></button>`;
const navbarHeader = document.querySelector('.navbar-header');
const navbarBrand = navbarHeader?.querySelector('a.navbar-brand.hidden-xs, a.navbar-brand');
if (!navbarHeader || !navbarBrand) { log('Navbar brand not available yet; Nexus launcher mount deferred.'); return; }
navbarBrand.insertAdjacentElement('afterend', root);
const launcher = root.querySelector('.mcn-launcher');
const startButton = root.querySelector('[data-mcn-start]');
const stopButton = root.querySelector('[data-mcn-stop]');
const retryButton = root.querySelector('[data-mcn-retry]');
const setCollapsed = collapsed => {
root.dataset.collapsed = String(collapsed);
localStorage.setItem(STORAGE_COLLAPSED, root.dataset.collapsed);
launcher.setAttribute('aria-expanded', String(!collapsed));
launcher.setAttribute('aria-label', collapsed ? 'Open Command Nexus V3' : 'Close Command Nexus V3');
};
launcher.setAttribute('aria-expanded', String(root.dataset.collapsed === 'false'));
launcher.setAttribute('aria-label', root.dataset.collapsed === 'false' ? 'Close Command Nexus V3' : 'Open Command Nexus V3');
launcher.addEventListener('click', () => setCollapsed(root.dataset.collapsed === 'false'));
root.addEventListener('keydown', event => {
if (event.key === 'Escape' && root.dataset.collapsed === 'false') { event.preventDefault();event.stopPropagation();setCollapsed(true);launcher.focus(); }
});
const fold = root.querySelector('.mcn-fold');
fold.addEventListener('click', () => { const minimised = root.dataset.minimised !== 'true';root.dataset.minimised = String(minimised);fold.textContent = minimised ? 'Expand' : 'Minimise';fold.setAttribute('aria-expanded', String(!minimised)); });
startButton.addEventListener('click', startController);
stopButton.addEventListener('click', gracefulStop);
retryButton.addEventListener('click', retryCurrent);
root.querySelector('[data-mcn-export]').addEventListener('click', exportDiagnostics);
chooseTopMission();
refreshRadioTransportRequests();
state.ui = {
root, statusMain: root.querySelector('.mcn-status-main'),statusDetail: root.querySelector('.mcn-status-detail'),
stateLabel: root.querySelector('[data-mcn-state]'),heroLabel: root.querySelector('[data-mcn-hero-label]'),heroName: root.querySelector('[data-mcn-hero-name]'),heroId: root.querySelector('[data-mcn-hero-id]'),
phase: root.querySelector('[data-mcn-phase]'),mission: root.querySelector('[data-mcn-mission]'),
sent: root.querySelector('[data-mcn-sent]'),seen: root.querySelector('[data-mcn-seen]'),advances: root.querySelector('[data-mcn-advances]'),
transportCount: root.querySelector('[data-mcn-transport-count]'),topMission: root.querySelector('[data-mcn-top-mission]'),pipeline: root.querySelector('[data-mcn-pipeline]'),radio: root.querySelector('[data-mcn-radio]'),
skips: root.querySelector('[data-mcn-skips]'),skipCount: root.querySelector('[data-mcn-skip-count]'),skipDetails: root.querySelector('[data-mcn-skip-details]'),skipEmpty: root.querySelector('[data-mcn-skips-empty]'),skipSignature: '',
ruleAssists: root.querySelector('[data-mcn-rule-assists]'),memory: root.querySelector('[data-mcn-memory]'),startButton,stopButton,retryButton
};
state.ui.skipDetails.addEventListener('toggle', () => renderControllerSkips(activeMissionSkipRecords()));
render();
}
function renderControllerSkips(records) {
const ui = state.ui;
ui.skipCount.textContent = String(records.length);
ui.skipEmpty.hidden = records.length > 0;
// Closed disclosures do not construct or retain a potentially long mission list.
if (!ui.skipDetails.open) { if (ui.skips.childElementCount) ui.skips.replaceChildren();ui.skipSignature = '';return; }
const signature = JSON.stringify(records.map(record => [record.missionId,record.missionName,record.reason,record.evidence,record.issues,record.remaining]));
if (signature === ui.skipSignature) return;
ui.skipSignature = signature;
const fragment = document.createDocumentFragment();
for (const record of records) {
const item = document.createElement('li');
const id = String(record.missionId || '');
const name = document.createElement(/^\d+$/.test(id) ? 'a' : 'span');
name.className = 'mcn-skip-name';
name.textContent = missionDisplay(id, record.missionName);
if (name.tagName === 'A') { name.href = '/missions/' + id;name.classList.add('lightbox-open'); }
item.append(name);
const issues = missionSkipIssueDetails(record);
if (issues.length) {
const list = document.createElement('ul');list.className = 'mcn-skip-issues';
for (const issue of issues) { const row = document.createElement('li');row.textContent = 'Missing / blocked: ' + issue;list.append(row); }
item.append(list);
} else {
const unknown = document.createElement('p');unknown.className = 'mcn-skip-reason';unknown.textContent = 'No specific unit details were recorded.';item.append(unknown);
}
const reason = document.createElement('p');reason.className = 'mcn-skip-reason';reason.textContent = 'Reason: ' + (globalThis.__NEXUS_RECOVERY__?.failureText(record) || record.reason || 'Not recorded');item.append(reason);
const retry = document.createElement('p');retry.className = 'mcn-skip-retry';retry.textContent = `Eligible to retry after ${record.remaining} more mission advance${record.remaining === 1 ? '' : 's'}.`;item.append(retry);
fragment.append(item);
}
ui.skips.replaceChildren(fragment);
}
function render() {
if (!state.ui) return;
const ui = state.ui;
ui.root.dataset.phase = state.phase;
ui.statusMain.textContent = state.phase === 'IDLE' && state.status === 'Ready' ? 'Ready to start' : state.status;
ui.statusDetail.textContent = state.detail || '';
ui.phase.textContent = readablePhaseLabel(state.phase);
const canStop = Boolean(state.wanted || state.worker || state.stopping);
ui.stateLabel.textContent = state.stopping ? 'Stopping' : state.running ? 'Running' : canStop ? 'Waiting' : 'Stopped';
updateCurrentMissionName(getWorkerDocument());
const top = state.topMission || compactMissionCandidate(chooseTopMission());
const workingTopMatch = Boolean(top?.missionId && state.currentMissionId && top.missionId === state.currentMissionId && !state.transportServiceActive);
ui.mission.textContent = state.transportServiceActive
? `TRANSPORT | ${missionDisplay(state.transportServiceMissionId, missionNameForId(state.transportServiceMissionId))}`
: state.lowQueuePaused ? `PAUSED | ${state.lowQueueObservedCount}/${MINIMUM_ACTIONABLE_MISSIONS} available`
: `${missionDisplay(state.currentMissionId, state.currentMissionName)}${workingTopMatch ? ' | TOP' : ''}`;
const heroId = state.transportServiceActive ? state.transportServiceMissionId : canStop && state.currentMissionId ? state.currentMissionId : top?.missionId;
const heroName = state.transportServiceActive ? missionNameForId(heroId) : canStop && state.currentMissionId ? state.currentMissionName : top?.caption;
ui.heroLabel.textContent = state.transportServiceActive ? 'Transport mission' : canStop && state.currentMissionId ? 'Working mission' : 'Next mission';
ui.heroName.textContent = heroId ? heroName || missionNameForId(heroId) || 'Mission' : 'No mission available';
ui.heroId.textContent = heroId ? compactMissionIdLabel(heroId) : '';
ui.sent.textContent = String(missionFinderRunValueSnapshot(state.runStartedAt ? Math.max(0, (Date.now() - Date.parse(state.runStartedAt)) / 1000) : 0).completedDispatches);
ui.seen.textContent = String(state.runUniqueMissionCount);
ui.advances.textContent = String(state.nativeMissionAdvances);
ui.transportCount.textContent = `P${state.runPatientTransports} | R${state.runPrisonerTransports} | cleared ${state.transportServiceCleared}`;
const visualTop = state.visualTopMission;
const visualTopSkipRemaining = visualTop?.missionId ? missionSkipRemaining(visualTop.missionId) : 0;
ui.topMission.textContent = visualTopSkipRemaining > 0
? `${missionDisplay(visualTop.missionId, visualTop.caption)} | SKIP ${visualTopSkipRemaining} -> ${top ? missionDisplay(top.missionId, top.caption) : 'waiting'}`
: top ? `${missionDisplay(top.missionId, top.caption)}${top.actionKind && top.actionKind !== 'OTHER' ? ' | ' + top.actionKind : ''}` : '-';
const failedTop = state.missionSkipRecords.get(String(visualTop?.missionId || top?.missionId || ''));
if (failedTop) {
const explanation = globalThis.__NEXUS_RECOVERY__?.failureText(failedTop) || failedTop.reason;
ui.topMission.textContent += ' | Last failure: ' + explanation;
ui.topMission.title = 'Recorded ' + failedTop.lastSkippedAt + ': ' + explanation;
} else ui.topMission.title = '';
ui.pipeline.textContent = state.workerRole === 'TRANSPORT_B'
? `A: paused | B: transport ${compactMissionIdLabel(state.transportServiceMissionId)}`
: `${state.lowQueuePaused ? 'A: released' : canStop ? 'A: ' + (state.running ? 'dispatching' : 'starting') + ' ' + compactMissionIdLabel(state.currentMissionId) : 'A: standby'} | B: transport standby`;
const nextRadio = state.radioTransportRequests[0] || null;
ui.radio.textContent = nextRadio ? `${state.radioTransportRequests.length} pending | next ${compactMissionIdLabel(nextRadio.missionId)}` : state.runAllianceRadioIgnored ? `0 personal | ${state.runAllianceRadioIgnored} alliance ignored` : '0';
renderControllerSkips(activeMissionSkipRecords());
ui.ruleAssists.textContent = `A mission-only | B transport ${state.transportServiceCleared}/${state.transportServiceAttempts} | RAM ${state.pipelineMemoryPressureActive ? 'guard' : 'normal'} | cycles ${state.runtimeRecycles} | recovery ${state.postDispatchSoftRecoveries}/${state.postDispatchHardRecoveries}`;
ui.memory.textContent = state.pipelineMemoryPressureActive ? 'Memory guard active' : 'Memory normal';
ui.startButton.hidden = canStop;ui.stopButton.hidden = !canStop;
ui.startButton.disabled = state.wanted || state.stopping;
ui.stopButton.disabled = (!state.wanted && !state.worker) || state.stopping;
ui.stopButton.textContent = state.stopping ? 'Stopping…' : 'Stop Auto Mode';
ui.retryButton.disabled = state.stopping || (!state.currentMissionUrl && !collectMissionCandidates().length);
}
