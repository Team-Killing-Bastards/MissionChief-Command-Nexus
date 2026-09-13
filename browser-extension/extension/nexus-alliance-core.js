/* Shared-mission presentation and native vehicle evidence. No game actions. */
(() => {
  'use strict';
  const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const id = value => /^\d+$/.test(String(value ?? '')) ? String(value) : '';
  const number = value => value !== null && value !== undefined && clean(value) !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;
  const ranges = [['all','All values',0,Infinity],['0','0–3k',0,3000],['3','3–5k',3000,5000],['5','5–10k',5000,10000],['10','10–15k',10000,15000],['15','15–20k',15000,20000],['20','20k+',20000,Infinity]];
  function participation(value) {
    const text = clean(value).toLowerCase().replace(/[\s-]+/g, '_');
    if (/^(new|no|false|0|not_participat(?:ed|ing)|not_involved|unjoined|unsupported)$/.test(text)) return false;
    if (/^(yes|true|1|own|participat(?:ed|ing)|joined|involved|supported)$/.test(text)) return true;
    return null;
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
    for (const node of doc.querySelectorAll('.missionSideBarEntry[data-alliance-mission="true"],.missionSideBarEntry[data-shared-mission="true"],.missionSideBarEntry.alliance-mission,.missionSideBarEntry.mission-alliance')) entries.add(node);
    for (const entry of entries) {
      const missionId = id(entry.getAttribute('mission_id') || entry.dataset.missionId);
      if (!missionId || result.has(missionId)) continue;
      let credits = null;
      try { const raw = entry.getAttribute('data-sortable-by') || entry.getAttribute('data-sortable_by'); if (raw?.length < 4096) credits = number(JSON.parse(raw)?.average_credits); } catch {}
      if (credits === null) {
        const badge = entry.querySelector('[data-nx-mission-reward]');
        const amount = clean(badge?.textContent).match(/^≈\s*([\d,]+)$/);
        if (amount) credits = number(amount[1].replaceAll(',',''));
      }
      const caption = entry.querySelector('[id="mission_caption_'+missionId+'"]');
      const link = entry.querySelector('a.mission-alarm-button,a[href*="/missions/"]');
      result.set(missionId, {id:missionId, name:clean(caption?.childNodes[0]?.textContent || caption?.textContent || link?.textContent || 'Mission '+missionId).slice(0,240), credits,
        joined:participation(entry.getAttribute('data-mission-participation-filter')), entry});
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
  globalThis.NexusAllianceCore = Object.freeze({clean,id,number,ranges,participation,inRange,supportedMissions,missions,enabled,vehicleId,homeUnits,officers,success,attending});
})();
