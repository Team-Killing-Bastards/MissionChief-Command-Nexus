/* Nexus daily-credit arithmetic and classification; no game state or network access. */
(() => {
  'use strict';
  if (typeof window !== 'undefined' && /^mcn-v3-(active-worker|pipeline-preload)-/.test(window.name || '')) return;
  if (globalThis.NexusDailyCore) return;
  function number(value, integer = false) {
    const raw = String(value ?? '').trim().replace(/(?:\s*Credits|\s*[x×])$/i, '').replace(/[\s\u00a0\u202f]/g, '').replace(/−/g, '-');
    if (!/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/.test(raw)) return null;
    const n = Number(raw.replaceAll(',', ''));
    return Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER && (!integer || Number.isSafeInteger(n)) ? n : null;
  }
  function classifier(data) {
    const names = new Set(data.missions);
    const rules = data.categories.filter(c => c.pattern).map(c => [c.id, new RegExp(c.pattern, c.flags)]);
    return desc => {
      const types = rules.filter(([,regex]) => regex.test(desc)).map(([id]) => id);
      const cancelled = / - [cC]ancel(?:l)?ed$/.test(desc);
      const name = desc.replace(/ - (?:[cC]ancel(?:l)?ed|False Alarm)$/, '').replace(/ \(Fire Alarm System\)$/, '');
      if (names.has(name)) types.push(cancelled ? 'cancelledMissions' : 'mission');
      return types.length ? types : ['others'];
    };
  }
  function entry(cells, classify, index) {
    if (cells.length !== 4) return null;
    const total = number(cells[0], true), average = number(cells[1]), count = number(cells[2], true);
    const desc = String(cells[3] ?? '').replace(/\s+/g, ' ').trim();
    if (total === null || average === null || count === null || count < 0 || !desc || desc.length > 600) return null;
    return { total, average, count, desc, types: classify(desc), index };
  }
  function totals(rows) {
    const result = { income: 0, spending: 0, net: 0, count: 0, average: null };
    for (const row of rows) {
      result.income += Math.max(0, row.total); result.spending += Math.min(0, row.total); result.net += row.total; result.count += row.count;
      if (![result.income,result.spending,result.net,result.count].every(Number.isSafeInteger)) throw Error('Credit totals exceed the safe numeric range.');
    }
    result.average = result.count ? result.net / result.count : null;
    return result;
  }
  function categories(rows, definitions) {
    const groups = new Map(definitions.map(c => [c.id, { ...c, total: 0, count: 0, rows: 0 }]));
    for (const row of rows) for (const type of row.types) {
      const group = groups.get(type); if (!group) continue;
      group.total += row.total; group.count += row.count; group.rows++;
    }
    return [...groups.values()].filter(c => c.rows).sort((a,b) => a.title.localeCompare(b.title, 'en-GB'));
  }
  function filter(rows, options) {
    const needle = options.query.trim().toLowerCase();
    return rows.filter(r => r.total >= options.min && r.total <= options.max && r.types.some(t => options.types.has(t)) && (!needle || `${r.desc} ${r.total} ${r.average} ${r.count}`.toLowerCase().includes(needle)))
      .sort((a,b) => (options.sort === 'desc' ? a.desc.localeCompare(b.desc, 'en-GB', {numeric:true}) : a[options.sort] - b[options.sort]) * options.direction || a.index-b.index);
  }
  function date(page, now = Date.now()) {
    const n = Number(page || 0); if (!Number.isInteger(n) || n < -7 || n > 1) return null;
    const today = new Date(now); today.setUTCDate(today.getUTCDate()+n); return today.toISOString().slice(0,10);
  }
  globalThis.NexusDailyCore = Object.freeze({number,classifier,entry,totals,categories,filter,date});
})();
