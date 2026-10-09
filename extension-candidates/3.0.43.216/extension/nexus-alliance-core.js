/* Shared-mission presentation and native vehicle evidence. No game actions. */
(() => {
  'use strict';
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const id = value => /^\d+$/.test(String(value ?? '')) ? String(value) : '';
  const number = value => value !== null && value !== undefined && clean(value) !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
  const ranges = [['all','All values',0,Infinity],['0','0â€“3k',0,3000],['3','3â€“5k',3000,5000],['5','5â€“10k',5000,10000],['10','10â€“15k',10000,15000],['15','15â€“20k',15000,20000],['20','20k+',20000,Infinity]];
  // MissionChief definitions that currently restrict dispatch to Ocean vehicles only.
  // Mixed Regular + Ocean missions are deliberately not filtered.
  const offshoreOnlyMissionTypeIds = Object.freeze(['544','553','554','561','562','598','600','761','766','787']);
  function isOffshoreMissionType(value) { const key=id(value); return !!key && offshoreOnlyMissionTypeIds.includes(key); }
  function isOffshoreMission(item) { return !!item && isOffshoreMissionType(item.missionTypeId); }
  function participation(value) {
    const text = clean(value).toLowerCase().replace(/[\s-]+/g, '_');
    if (/^(new|no|false|0|not_participat(?:ed|ing)|not_involved|unjoined|unsupported)$/.test(text)) return false;
    if (/^(yes|true|1|own|participat(?:ed|ing)|joined|involved|supported)$/.test(text)) return true;
    return null;
  }
  const plannedMissionListId = 'mission_list_sicherheitswache';
  function explicitAllianceEvidence(entry) {
    if (!entry) return false;
    try {
      if (entry.matches?.('.mission-alliance,.alliance-mission,[data-alliance-mission="true"],[data-shared-mission="true"],[data-mission-shared="true"],[data-alliance="true"]')) return true;
    } catch {}
    const classes = clean(entry.className);
    const text = clean(entry.textContent);
    return /(?:^|[\s_-])(?:alliance|shared)(?:$|[\s_-])/i.test(classes) || /\[alliance\]|\bview mission\s+alliance\b/i.test(text);
  }
  function missionOwnerEvidence(entry) {
    const missionId = id(entry?.getAttribute?.('mission_id') || entry?.dataset?.missionId);
    if (!missionId) return null;
    const capture = globalThis.__NEXUS_ALLIANCE_MISSION_OWNER_CAPTURE__;
    const evidence = capture?.get?.(missionId);
    const currentUserId = id(capture?.currentUserId?.() || globalThis.user_id || globalThis.userId);
    if (!evidence?.userId || !currentUserId) return null;
    return Object.freeze({ missionId, ownerUserId: id(evidence.userId), currentUserId, foreign: id(evidence.userId) !== currentUserId, source: evidence.source || 'mission-owner-capture' });
  }
  function isSharedPlannedAppearance(entry) {
    if (!entry) return false;
    let planned = false;
    try { planned = !!entry.closest?.('#' + plannedMissionListId); } catch {}
    if (!planned) return false;

    // data-mission-participation-filter is participation state (new/joined/etc.),
    // not mission ownership. Planned appearances are Alliance support work only
    // when MissionChief's mission object says they belong to another user.
    const owner = missionOwnerEvidence(entry);
    return !!owner?.foreign;
  }
  function capturedSharedPlannedAppearances() {
    const capture = globalThis.__NEXUS_ALLIANCE_MISSION_OWNER_CAPTURE__;
    if (!capture?.snapshot) return [];
    const currentUserId = id(capture.currentUserId?.() || globalThis.user_id || globalThis.userId);
    const currentAllianceId = id(capture.currentAllianceId?.() || globalThis.alliance_id || globalThis.allianceId);
    if (!currentUserId) return [];
    const result = [];
    for (const record of capture.snapshot()) {
      const missionId = id(record?.missionId);
      const ownerUserId = id(record?.userId);
      if (!missionId || ownerUserId === currentUserId) continue;
      const sharedAlliance = id(record?.allianceId);
      const allianceMatches = !!currentAllianceId && sharedAlliance === currentAllianceId;
      // Event missions can have no player owner (or owner zero). Require the
      // current alliance in that case; foreign map missions remain shared evidence.
      if ((!ownerUserId || ownerUserId === '0') && !allianceMatches && record.event !== true) continue;
      // If MissionChief supplied an alliance id, it must agree with the signed-in alliance.
      // When the field is absent, map visibility + foreign owner + planned status is the
      // authority: other players' missions are only exposed to this map through alliance sharing.
      const recordAllianceId = id(record?.allianceId);
      if (recordAllianceId && currentAllianceId && recordAllianceId !== currentAllianceId) continue;
      if (capture.isCurrentMission && !capture.isCurrentMission(missionId)) continue;
      const item = {
        id: missionId,
        missionTypeId: id(record?.missionTypeId),
        name: clean(record?.name || ('Mission ' + missionId)).slice(0,240),
        credits: number(record?.credits),
        joined: null,
        entry: null,
        planned: !!record.planned,
        event: record.event === true,
        source: 'mission-map',
      };
      item.offshore = isOffshoreMission(item);
      result.push(item);
    }
    return result;
  }
  function inRange(credits, key) {
    if (key === 'all') return true;
    const range = ranges.find(r => r[0] === key);
    return !!range && credits !== null && credits >= range[2] && credits < range[3];
  }
  function supportedMissions(vehicles) {
    if (!Array.isArray(vehicles)) throw Error('The game did not return a vehicle list.');
    const missions = new Set();
    for (const vehicle of vehicles) {
      if (!vehicle || !id(vehicle.id)) throw Error('The game returned an incomplete vehicle list.');
      // /api/vehicles contains the player's fleet. target_type/target_id covers
      // both travelling and on-scene units, of every service. A queued follow-up
      // alone is not participation and a building target is not a mission.
      if (vehicle.target_type === 'mission' && id(vehicle.target_id) && Number(vehicle.target_id) > 0) missions.add(String(vehicle.target_id));
    }
    return missions;
  }
  function missions(doc) {
    const result = new Map();
    const containers = doc.querySelectorAll('#mission_list_alliance,#mission_list_alliance_event,#mission_list_alliance_event_missions');
    const entries = new Set([...containers].flatMap(root => [...root.querySelectorAll('[mission_id],.missionSideBarEntry[data-mission-id]')]));
    const planned = doc.getElementById?.(plannedMissionListId) || doc.querySelector?.('#' + plannedMissionListId);
    if (planned) {
      for (const entry of planned.querySelectorAll('[mission_id],.missionSideBarEntry[data-mission-id]')) {
        if (isSharedPlannedAppearance(entry)) entries.add(entry);
      }
    }
    for (const node of doc.querySelectorAll('.missionSideBarEntry[data-alliance-mission="true"],.missionSideBarEntry[data-shared-mission="true"],.missionSideBarEntry.alliance-mission,.missionSideBarEntry.mission-alliance')) entries.add(node);
    for (const entry of entries) {
      const missionId = id(entry.getAttribute('mission_id') || entry.dataset.missionId);
      if (!missionId || result.has(missionId)) continue;
      const missionTypeId = id(entry.getAttribute('mission_type_id') || entry.getAttribute('data-mission-type-id') || entry.dataset.missionTypeId);
      let credits = null;
      try { const raw = entry.getAttribute('data-sortable-by') || entry.getAttribute('data-sortable_by'); if (raw?.length < 4096) credits = number(JSON.parse(raw)?.average_credits); } catch {}
      if (credits === null) {
        const badge = entry.querySelector('[data-nx-mission-reward]');
        const amount = clean(badge?.textContent).match(/^â‰ˆ\s*([\d,]+)$/);
        if (amount) credits = number(amount[1].replaceAll(',',''));
      }
      const caption = entry.querySelector('[id="mission_caption_'+missionId+'"]');
      const link = entry.querySelector('a.mission-alarm-button,a[href*="/missions/"]');
      const name=clean(caption?.childNodes[0]?.textContent || caption?.textContent || link?.textContent || 'Mission '+missionId).slice(0,240);
      const item={id:missionId, missionTypeId, name, credits, joined:participation(entry.getAttribute('data-mission-participation-filter')), entry};
      item.planned=!!entry.closest?.('#'+plannedMissionListId);
      item.offshore=isOffshoreMission(item);
      result.set(missionId,item);
    }
    // MissionChief can render shared missions and events on the map without creating
    // any mission sidebar/card row. Merge those live map mission objects after DOM rows
    // so native cards remain the preferred presentation source and IDs are deduplicated.
    for (const item of capturedSharedPlannedAppearances()) {
      if (!result.has(item.id)) result.set(item.id, item);
    }
    return [...result.values()];
  }
  function enabled(node) { return !!node && !node.disabled && node.getAttribute('aria-disabled') !== 'true' && !node.closest('.disabled,[disabled]'); }
  function vehicleId(box) { return id(box.getAttribute('vehicle_id') || box.dataset.vehicleId || (/^\d+$/.test(box.value) ? box.value : '') || box.id.match(/(?:vehicle_checkbox_|vehicle_)(\d+)$/)?.[1]); }
  const homeUnits = Object.freeze([['3','Fire Officer'],['10','RRV'],['20','OTL'],['21','General Practitioner'],['22','Community First Responder'],['34','Ambulance Officer'],['95','Community Midwife'],['96','Specialist Paramedic RRV']].map(Object.freeze));
  function officers(doc, reserved = new Set(), vehicleType = '3') {
    if (!homeUnits.some(([id]) => id === String(vehicleType))) return {items:[],unknownOrder:false};
    const found = new Map();
    for (const box of doc.querySelectorAll('#vehicle_list_step input.vehicle_checkbox,input.vehicle_checkbox[name="vehicle_ids[]"]')) {
      const row = box.closest('tr'), key = vehicleId(box);
      const type = box.getAttribute('vehicle_type_id') ?? box.dataset.vehicleTypeId ?? row?.querySelector('[vehicle_type_id]')?.getAttribute('vehicle_type_id');
      if (!key || String(type) !== String(vehicleType) || !enabled(box) || box.checked || reserved.has(key) || box.closest('#mission_vehicle_driving,#mission_vehicle_at_mission,#vehicle_show_table_alliance')) continue;
      const delay = number(row?.getAttribute('data-sortvalue') ?? row?.getAttribute('timevalue'));
      const distance = number(row?.getAttribute('data-distance'));
      const link = row?.querySelector('a[href^="/vehicles/"]');
      const item = {id:key, name:clean(link?.textContent || row?.querySelector('label')?.textContent || 'Support vehicle '+key).slice(0,140), delay, distance, box};
      if (!found.has(key)) found.set(key,item);
    }
    const list = [...found.values()];
    // Never silently treat missing arrival data as zero or use arbitrary DOM order.
    if (list.some(item => item.delay === null) && list.some(item => item.distance === null)) return {items:[],unknownOrder:!!list.length};
    const byDelay = list.every(item => item.delay !== null);
    list.sort((a,b) => (byDelay ? a.delay-b.delay : a.distance-b.distance) || (a.distance??Infinity)-(b.distance??Infinity) || Number(a.id)-Number(b.id));
    return {items:list,unknownOrder:false};
  }
  function success(doc, vehicle, previous = new Set()) {
    return [...doc.querySelectorAll('.alert.alert-success')].some(alert =>
      !previous.has(alert) && /has successfully been dispatched\.?/i.test(clean(alert.textContent)) &&
      [...alert.querySelectorAll('a[href]')].some(link => link.getAttribute('href')?.split('?')[0] === '/vehicles/'+vehicle));
  }
  function attending(doc, vehicle) {
    return [...doc.querySelectorAll('#mission_vehicle_driving a[href],#mission_vehicle_at_mission a[href]')].some(link => link.getAttribute('href')?.split('?')[0] === '/vehicles/'+vehicle);
  }
  globalThis.NexusAllianceCore = Object.freeze({clean,id,number,ranges,participation,inRange,supportedMissions,missions,isSharedPlannedAppearance,missionOwnerEvidence,capturedSharedPlannedAppearances,plannedMissionListId,isOffshoreMissionType,isOffshoreMission,offshoreOnlyMissionTypeIds,enabled,vehicleId,homeUnits,officers,success,attending});
})();
