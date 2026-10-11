// Shared browser/worker/backend allow-list. Never serialize arbitrary game objects.
export function cleanRecord(raw) {
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
