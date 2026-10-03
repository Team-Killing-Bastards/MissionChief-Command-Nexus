/* Read-only MissionChief mission ownership/data capture for Alliance Planned Appearances. */
(() => {
  'use strict';
  if (window !== window.top || globalThis.__NEXUS_ALLIANCE_MISSION_OWNER_CAPTURE__) return;

  const cleanId = value => /^\d+$/.test(String(value ?? '').trim()) ? String(value).trim() : '';
  const cleanText = (value, max = 240) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  const numberOrNull = value => {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  };
  const epochMs = value => {
    const parsed = numberOrNull(value);
    if (!parsed) return 0;
    return parsed < 1e12 ? parsed * 1000 : parsed;
  };
  const owners = new Map();
  const CAPTURE_EVENT = 'nexus:alliance-mission-owner-update';
  const MAX_OWNER_RECORDS = 20000;
  const RECENT_FALLBACK_MS = 120000;
  // A Planned Appearance can sit on the map for hours before it begins and then run for
  // several more hours. Marker evidence therefore needs a bounded multi-day lifetime,
  // not the two-minute generic mission fallback used by 3.0.43.142.
  const MARKER_FALLBACK_MS = 72 * 60 * 60 * 1000;
  const END_GRACE_MS = 5 * 60 * 1000;
  const candidateCollectionKeys = Object.freeze([
    'items', 'data', 'missions', 'records', 'source', 'allItems', 'filteredItems',
    'visibleItems', 'renderedItems', 'results', 'list'
  ]);
  let currentMapMissionIds = new Set();
  let currentMapHarvestAt = 0;

  function currentUserId() {
    return cleanId(globalThis.user_id ?? globalThis.userId ?? globalThis.current_user_id ?? globalThis.currentUserId);
  }

  function currentAllianceId() {
    return cleanId(globalThis.alliance_id ?? globalThis.allianceId ?? globalThis.current_alliance_id ?? globalThis.currentAllianceId);
  }

  function booleanish(value) {
    if (value === true || value === 1 || value === '1') return true;
    const text = String(value ?? '').trim().toLowerCase();
    return text === 'true' || text === 'yes';
  }

  function sourceKind(source) {
    const name = String(source || 'mission-object').slice(0, 80);
    if (name === 'missionMarkerAdd' || name === 'missionMarkerAddSingle' || name === 'processMissionElement') return 'marker';
    if (name === 'missions_data') return 'missions-data';
    return 'other';
  }

  function isNativeAllianceEvent(mission) {
    // Native identifyMissionTypeFilter uses a null user_id for alliance events.
    // Require the field to exist: an incomplete object is not event evidence.
    return !!mission && Object.prototype.hasOwnProperty.call(mission, 'user_id') &&
      mission.user_id === null && !booleanish(mission.kt) && !booleanish(mission.sw);
  }
  function rememberMission(mission, source = 'mission-object') {
    if (!mission || typeof mission !== 'object') return true;
    const missionId = cleanId(mission.id ?? mission.mission_id ?? mission.missionId);
    const userId = cleanId(mission.user_id ?? mission.userId ?? mission.owner_id ?? mission.ownerId);
    if (!missionId || (!userId && !isNativeAllianceEvent(mission) && !cleanId(mission.alliance_id ?? mission.allianceId))) return true;

    const now = Date.now();
    const previous = owners.get(missionId) || null;
    const kind = sourceKind(source);
    const plannedRaw = mission.sw ?? mission.planned ?? mission.is_planned ?? mission.isPlanned;
    const allianceId = cleanId(mission.alliance_id ?? mission.allianceId) || previous?.allianceId || '';
    const missionTypeId = cleanId(mission.mtid ?? mission.mission_type_id ?? mission.missionTypeId ?? mission.type_id ?? mission.typeId) || previous?.missionTypeId || '';
    const name = cleanText(mission.caption ?? mission.name ?? mission.title ?? mission.mission_title ?? mission.missionTitle) || previous?.name || '';
    const creditsRaw = numberOrNull(mission.average_credits ?? mission.advertised_credits ?? mission.credits);
    const dateEndRaw = numberOrNull(mission.date_end ?? mission.dateEnd);
    const dateNowRaw = numberOrNull(mission.date_now ?? mission.dateNow);
    const swStartInRaw = numberOrNull(mission.sw_start_in ?? mission.swStartIn);

    const next = Object.freeze({
      missionId,
      userId,
      event: isNativeAllianceEvent(mission),
      planned: plannedRaw === undefined || plannedRaw === null ? !!previous?.planned : booleanish(plannedRaw),
      allianceId,
      missionTypeId,
      name,
      credits: creditsRaw === null ? (previous?.credits ?? null) : creditsRaw,
      dateEnd: dateEndRaw === null ? (previous?.dateEnd ?? null) : dateEndRaw,
      dateNow: dateNowRaw === null ? (previous?.dateNow ?? null) : dateNowRaw,
      swStartIn: swStartInRaw === null ? (previous?.swStartIn ?? null) : swStartInRaw,
      seenAt: now,
      markerSeenAt: kind === 'marker' ? now : Number(previous?.markerSeenAt || 0),
      missionsDataSeenAt: kind === 'missions-data' ? now : Number(previous?.missionsDataSeenAt || 0),
      source: String(source || 'mission-object').slice(0, 80),
    });

    const changed = !previous ||
      previous.userId !== next.userId ||
      previous.event !== next.event ||
      previous.planned !== next.planned ||
      previous.allianceId !== next.allianceId ||
      previous.missionTypeId !== next.missionTypeId ||
      previous.name !== next.name ||
      previous.credits !== next.credits ||
      previous.dateEnd !== next.dateEnd ||
      previous.dateNow !== next.dateNow ||
      previous.swStartIn !== next.swStartIn ||
      previous.markerSeenAt !== next.markerSeenAt ||
      previous.missionsDataSeenAt !== next.missionsDataSeenAt;

    owners.set(missionId, next);
    while (owners.size > MAX_OWNER_RECORDS) owners.delete(owners.keys().next().value);
    // Marker/data recency refreshes need to wake the Alliance panel because a planned
    // appearance may have no DOM mission row for MutationObserver to see.
    if (changed) {
      try { window.dispatchEvent(new CustomEvent(CAPTURE_EVENT, { detail: { missionId } })); } catch {}
    }
    return true;
  }

  function scanValue(value, source = 'mission-vl', depth = 0, seen = new WeakSet()) {
    if (!value || depth > 3) return;
    if (typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length && i < 10000; i++) scanValue(value[i], source, depth + 1, seen);
      return;
    }
    if (value instanceof Map) {
      let count = 0;
      for (const item of value.values()) {
        scanValue(item, source, depth + 1, seen);
        if (++count >= 10000) break;
      }
      return;
    }

    rememberMission(value, source);
    for (const key of candidateCollectionKeys) {
      let child;
      try { child = value[key]; } catch { continue; }
      if (child && typeof child === 'object') scanValue(child, source, depth + 1, seen);
    }
  }

  function passiveMissionFilter(mission) {
    rememberMission(mission, 'mission-vl-filter');
    return true;
  }

  function missionVirtualListCallback(...args) {
    for (const arg of args) scanValue(arg, 'mission-vl-callback');
    harvestVirtualScroller();
    harvestMissionMarkers();
  }

  function registerArrayCallback(name, callback) {
    const list = globalThis[name];
    if (!Array.isArray(list) || list.includes(callback)) return false;
    list.push(callback);
    return true;
  }

  function wrapMissionFunction(name) {
    const original = globalThis[name];
    if (typeof original !== 'function' || original.__nexusAllianceOwnerCaptureWrapped) return false;
    const wrapped = function(...args) {
      try { rememberMission(args[0], name); } catch {}
      return original.apply(this, args);
    };
    try { Object.defineProperty(wrapped, '__nexusAllianceOwnerCaptureWrapped', { value: true }); } catch { wrapped.__nexusAllianceOwnerCaptureWrapped = true; }
    try { Object.defineProperty(wrapped, '__nexusAllianceOwnerCaptureOriginal', { value: original }); } catch {}
    try { globalThis[name] = wrapped; } catch { return false; }
    return globalThis[name] === wrapped;
  }

  function harvestVirtualScroller() {
    let scroller;
    try { scroller = globalThis.missionsVirtualScroller; } catch { return; }
    if (!scroller || typeof scroller !== 'object') return;
    scanValue(scroller, 'missionsVirtualScroller');
  }

  // mission_markers is MissionChief's actual live map-marker collection. It is read only as
  // a recovery path for markers that may have been created synchronously before our wrapper
  // was installed. We only accept objects that expose a mission id AND user id, so generic
  // Leaflet marker internals are ignored.
  function harvestMissionMarkers() {
    let markers;
    try { markers = globalThis.mission_markers; } catch { return 0; }
    if (!markers || typeof markers !== 'object') return 0;
    let count = 0;
    const take = marker => {
      if (!marker || typeof marker !== 'object' || count >= MAX_OWNER_RECORDS) return;
      const candidate = marker.mission && typeof marker.mission === 'object' ? marker.mission : marker;
      const missionId = cleanId(candidate.mission_id ?? candidate.missionId ?? candidate.id);
      const userId = cleanId(candidate.user_id ?? candidate.userId ?? candidate.owner_id ?? candidate.ownerId);
      if (!missionId || (!userId && !isNativeAllianceEvent(candidate) && !cleanId(candidate.alliance_id ?? candidate.allianceId))) return;
      rememberMission(candidate, 'missionMarkerAdd');
      count++;
    };
    if (markers instanceof Map) {
      for (const marker of markers.values()) take(marker);
    } else if (Array.isArray(markers)) {
      for (const marker of markers) take(marker);
    } else {
      for (const marker of Object.values(markers)) take(marker);
    }
    return count;
  }

  function harvestMissionData() {
    let data;
    try { data = globalThis.missions_data; } catch { return 0; }
    if (!data || typeof data !== 'object') return 0;

    const ids = new Set();
    let count = 0;
    const take = mission => {
      if (!mission || typeof mission !== 'object' || count >= MAX_OWNER_RECORDS) return;
      const missionId = cleanId(mission.id ?? mission.mission_id ?? mission.missionId);
      if (!missionId) return;
      ids.add(missionId);
      rememberMission(mission, 'missions_data');
      count++;
    };

    if (data instanceof Map) {
      for (const mission of data.values()) take(mission);
    } else if (Array.isArray(data)) {
      for (const mission of data) take(mission);
    } else {
      for (const mission of Object.values(data)) take(mission);
    }

    currentMapMissionIds = ids;
    currentMapHarvestAt = Date.now();
    return count;
  }

  function markerEvidenceCurrent(record) {
    if (!record || !Number(record.markerSeenAt || 0)) return false;
    const end = epochMs(record.dateEnd);
    if (end && Date.now() > end + END_GRACE_MS) return false;
    return Date.now() - Number(record.markerSeenAt || 0) <= MARKER_FALLBACK_MS;
  }

  function isCurrentMission(missionId) {
    const key = cleanId(missionId);
    if (!key) return false;
    const record = owners.get(key);
    if (!record) return false;

    // Positive membership in missions_data is useful, but absence must NOT override direct
    // missionMarkerAdd evidence: live Planned Appearances can be map-only and omitted from
    // the normal mission/card cache.
    if (currentMapMissionIds.has(key)) return true;
    if (markerEvidenceCurrent(record)) return true;

    // A record that was known only through missions_data may be retired when a later map
    // harvest removes it. This preserves 3.0.43.142's stale-row cleanup without discarding
    // independently observed live map markers.
    if (currentMapHarvestAt && Number(record.missionsDataSeenAt || 0)) return false;
    return Date.now() - Number(record.seenAt || 0) <= RECENT_FALLBACK_MS;
  }

  function harvest() {
    harvestVirtualScroller();
    harvestMissionMarkers();
    return harvestMissionData();
  }

  function install() {
    // MissionChief's supported virtual-list filter hook receives the full mission object,
    // including user_id. Returning true makes this capture strictly read-only.
    registerArrayCallback('additionalMissionsFiltersFuncs', passiveMissionFilter);
    registerArrayCallback('onMissionVLInitCallbacks', missionVirtualListCallback);
    registerArrayCallback('onMissionVLRenderCallbacks', missionVirtualListCallback);

    // MissionChief's marker/list functions all receive the full mission object. processMissionElement
    // is included because current virtual-list builds may render through it without creating a
    // traditional mission card.
    wrapMissionFunction('missionMarkerAdd');
    wrapMissionFunction('missionMarkerAddSingle');
    wrapMissionFunction('processMissionElement');
    harvestVirtualScroller();
    harvestMissionMarkers();
  }

  globalThis.__NEXUS_ALLIANCE_MISSION_OWNER_CAPTURE__ = Object.freeze({
    eventName: CAPTURE_EVENT,
    currentUserId,
    currentAllianceId,
    rememberMission,
    get(missionId) { return owners.get(cleanId(missionId)) || null; },
    has(missionId) { return owners.has(cleanId(missionId)); },
    isCurrentMission,
    harvest,
    snapshot() { return [...owners.values()].map(item => ({ ...item })); },
    install,
  });

  install();
  let attempts = 0;
  const installer = window.setInterval(() => {
    install();
    if (++attempts >= 1200) window.clearInterval(installer); // 30 seconds at 25 ms.
  }, 25);
  const rescan = () => { try { install(); harvest(); } catch {} };
  window.addEventListener('load', rescan, { once: true });
  window.addEventListener('pageshow', rescan);
  window.addEventListener('focus', rescan);
  if (typeof document !== 'undefined') document.addEventListener?.('visibilitychange', () => { if (!document.hidden) rescan(); });
})();
