/* Nexus native tools. Independently implemented; no LSS runtime or copied module code. */
(() => {
  'use strict';
  if (window !== window.top || globalThis.NexusNativeCore) return;
  const text = (value, max = 180) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  const number = value => value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value)) ? Number(value) : null;
  const id = value => /^\d{1,16}$/.test(String(value)) ? String(value) : null;
  const paths = /^\/(?:$|(?:buildings|vehicles|missions|profile|schoolings)\/\d+(?:\/(?:personals|zuweisung))?$|schoolings$|credits(?:\/(?:daily|overview))?$)/;
  function safePath(value, origin = location.origin) {
    try {
      const url = new URL(value, origin);
      return url.origin === origin && !url.search && !url.hash && paths.test(url.pathname) ? url.pathname : null;
    } catch { return null; }
  }
  const groups = [
    ['Firetruck', '0 1 16 17 37 38'],
    ['Other Fire Apparatus', '2 3 4 6 7 14 15 18 23 26 35 36 39 40 41 42 43 44 45 46 47 48 49 50 84'],
    ['Water', '57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74'],
    ['Ambulance', '5 9 10 19 20 21 22 27 28 29 30 31 32 33 34'],
    ['Police', '8 11 12 13 19 24 25 51 52 53 54 55 56'],
    ['Airport', '75 76 77 78 79 80 81 82']
  ].map(([name, types]) => ({ name, types: types.split(' ').map(Number) }));
  function cleanGroups(input) {
    if (!Array.isArray(input)) return groups.map(g => ({ name: g.name, types: [...g.types] }));
    return input.slice(0, 12).map(g => ({ name: text(g?.name, 40),
      types: [...new Set((Array.isArray(g?.types) ? g.types : []).map(number).filter(n => n !== null && Number.isInteger(n) && n >= 0 && n < 10000))].slice(0, 200)
    })).filter(g => g.name && g.types.length);
  }
  function project(item, kind) {
    if (!item || !id(item.id)) return null;
    const record = { id: id(item.id), href: `/${kind}/${id(item.id)}`, kind, label: text(item.caption) || `${kind} ${item.id}` };
    if (kind === 'buildings') return { ...record, type: number(item.building_type), personnel: number(item.personal_count),
      target: number(item.personal_count_target), level: number(item.level), dispatchCentre: id(item.leitstelle_building_id),
      extensions: Array.isArray(item.extensions) ? item.extensions.length : null };
    if (kind === 'vehicles') return { ...record, type: number(item.vehicle_type), typeLabel: text(item.vehicle_type_caption, 80),
      building: id(item.building_id), status: number(item.fms_real), assigned: number(item.assigned_personnel_count),
      personnelLimit: number(item.max_personnel_override), mission: item.target_type === 'mission' ? id(item.target_id) : null };
    return record;
  }
  function favourite(item) {
    const href = safePath(item?.href);
    return href && text(item?.label) ? { href, label: text(item.label), kind: href.split('/')[1] || 'page' } : null;
  }
  function parseCredits(value) {
    const raw = text(value).replace(/[,\s£]/g, '').replace(/−/g, '-');
    return /^[+-]?\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : null;
  }
  function filter(rows, { query = '', group = '', status = '', sort = 'name', groups: tabs = [] } = {}) {
    const needle = text(query).toLocaleLowerCase();
    const typeIds = tabs[Number(group)]?.types;
    const output = rows.filter(row => (!needle || `${row.label} ${row.id ?? ''} ${row.typeLabel ?? ''} ${row.building ?? ''} ${row.detail ?? ''}`.toLocaleLowerCase().includes(needle)) &&
      (group === '' || !typeIds || typeIds.includes(row.type)) &&
      (status === '' || String(row.status) === status));
    if (sort === 'amount') output.sort((a, b) => (b.amount ?? -Infinity) - (a.amount ?? -Infinity));
    else if (sort === 'personnel') output.sort((a, b) => (a.personnel ?? a.assigned ?? Infinity) - (b.personnel ?? b.assigned ?? Infinity));
    else if (sort === 'id') output.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
    else output.sort((a, b) => a.label.localeCompare(b.label, 'en-GB', { numeric: true }));
    return output;
  }
  globalThis.NexusNativeCore = Object.freeze({ text, number, id, safePath, groups, cleanGroups, project, favourite, parseCredits, filter });
})();
