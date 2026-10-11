(() => {
  'use strict';
  if (window !== window.top || location.pathname !== '/') return;
  const map = document.getElementById('map');
  if (!map) return;
  function start() {
  const cache = new Map(), badges = new Map();
  let stopped = false, busy = false, scheduled = 0, controller;
  let imageIndex = new Map(), nameIndex = new Map(), indexedAt = 0;
  const TTL = 60000, STALE = 180000;
  const style = document.createElement('style');
  style.textContent = '.nx-hospital-beds{position:absolute;pointer-events:none;white-space:nowrap;background:#176c42;color:white;border:1px solid #fff;border-radius:8px;padding:1px 5px;font:700 11px/16px Arial,sans-serif;box-shadow:0 1px 3px #0009}.nx-hospital-beds[data-state="near"]{background:#875600}.nx-hospital-beds[data-state="full"]{background:#ad2731}.nx-hospital-beds[data-state="unknown"]{background:#485361}';
  document.head.append(style);
  function index() {
    if (Date.now() - indexedAt < 30000) return;
    indexedAt = Date.now(); imageIndex = new Map(); nameIndex = new Map();
    // Index all building images to reject shared/default icons rather than mislabel them.
    for (const row of document.querySelectorAll('#building_list > li[building_type_id]')) {
      const id = row.id.match(/^building_list_(\d+)$/)?.[1];
      if (!id) continue;
      const hospital = row.getAttribute('building_type_id') === '4';
      const name = row.getAttribute('search_attribute') || '';
      const src = row.querySelector('img.building_marker_image')?.src;
      const data = {id, name, hospital};
      if (src) imageIndex.set(src, imageIndex.has(src) ? null : data);
      if (name) nameIndex.set(name, nameIndex.has(name) ? null : data);
    }
  }
  function identify(icon) {
    const byImage = imageIndex.get(icon.src);
    if (byImage?.hospital) return byImage;
    const tooltip = document.getElementById(icon.getAttribute('aria-describedby'));
    const byName = nameIndex.get((tooltip?.textContent || icon.title || '').trim());
    return byName?.hospital ? byName : null;
  }
  function draw() {
    if (stopped || document.hidden) return [];
    index();
    const found = [], retained = new Set(), bounds = map.getBoundingClientRect();
    for (const icon of map.querySelectorAll('.leaflet-marker-icon')) {
      const data = identify(icon);
      if (!data) continue;
      const rect = icon.getBoundingClientRect();
      if (!rect.width || rect.right < bounds.left || rect.left > bounds.right || rect.bottom < bounds.top || rect.top > bounds.bottom || getComputedStyle(icon).display === 'none') continue;
      retained.add(icon); found.push(data);
      let badge = badges.get(icon);
      if (!badge) {
        badge = document.createElement('span'); badge.className = 'nx-hospital-beds leaflet-zoom-animated';
        icon.parentElement.append(badge); badges.set(icon, badge);
      }
      const item = cache.get(data.id), valid = item?.beds && Date.now() - item.at < STALE;
      const beds = valid ? item.beds : null;
      badge.textContent = beds ? `${beds.used}/${beds.total}` : item?.checked ? '?' : '…';
      badge.dataset.state = !beds ? 'unknown' : beds.used >= beds.total ? 'full' : beds.used / beds.total >= .85 ? 'near' : 'available';
      badge.setAttribute('aria-label', beds ? `${data.name}: ${beds.used} of ${beds.total} patient beds occupied or reserved for patients en route` : `${data.name}: ${item?.checked ? 'patient bed count unavailable' : 'loading patient beds'}`);
      badge.style.transform = `${icon.style.transform} translateX(-50%)`;
      badge.style.marginLeft = `${(parseFloat(icon.style.marginLeft) || 0) + (parseFloat(icon.style.width) || rect.width) / 2}px`;
      badge.style.marginTop = `${(parseFloat(icon.style.marginTop) || 0) + (parseFloat(icon.style.height) || rect.height) + 2}px`;
      badge.style.zIndex = String((parseInt(icon.style.zIndex, 10) || 0) + 1);
      badge.style.opacity = icon.style.opacity || '1';
    }
    for (const [icon, badge] of badges) if (!retained.has(icon)) { badge.remove(); badges.delete(icon); }
    return found;
  }
  async function refresh() {
    if (stopped || document.hidden || busy) return;
    const visible = draw();
    const next = visible.filter(x => !cache.has(x.id) || Date.now() - cache.get(x.id).checked >= TTL).sort((a,b) => (cache.get(a.id)?.checked || 0) - (cache.get(b.id)?.checked || 0))[0];
    if (!next) return;
    busy = true; controller = new AbortController();
    const timeout = setTimeout(() => controller?.abort(), 10000);
    try {
      const response = await fetch(`/buildings/${next.id}`, {credentials:'same-origin', cache:'no-store', signal:controller.signal});
      if (!response.ok) throw Error('Hospital unavailable');
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const text = doc.querySelector('#patienten .alert-info')?.textContent || '';
      const match = text.match(/currently\s+([\d,]+)\s+patients in the hospital or en route[\s\S]*?maximum of\s+([\d,]+)\s+patients/i);
      if (!match) throw Error('Bed summary unavailable');
      const used = Number(match[1].replaceAll(',','')), total = Number(match[2].replaceAll(',',''));
      if (!Number.isSafeInteger(used) || !Number.isSafeInteger(total) || total <= 0) throw Error('Invalid bed summary');
      if (!stopped) cache.set(next.id, {beds:{used,total},at:Date.now(),checked:Date.now()});
    } catch {
      if (!stopped) cache.set(next.id, {...cache.get(next.id),checked:Date.now()});
    } finally {
      clearTimeout(timeout); controller = null; busy = false;
      while (cache.size > 300) cache.delete(cache.keys().next().value);
      if (!stopped) draw();
    }
  }
  function schedule(records) {
    if (stopped || scheduled || document.hidden) return;
    if (records && !records.some(r => r.target.classList?.contains('leaflet-marker-icon') || [...r.addedNodes,...r.removedNodes].some(n => n.classList?.contains('leaflet-marker-icon')))) return;
    scheduled = setTimeout(() => { scheduled = 0; draw(); }, 150);
  }
  const observer = new MutationObserver(schedule);
  observer.observe(map, {subtree:true,childList:true,attributes:true,attributeFilter:['style','src','aria-describedby']});
  const timer = setInterval(refresh, 1000);
  function visibility() { if (!document.hidden) refresh(); }
  document.addEventListener('visibilitychange', visibility);
  function cleanup() {
    stopped = true; clearInterval(timer); clearTimeout(scheduled); controller?.abort(); observer.disconnect();
    document.removeEventListener('visibilitychange', visibility);
    for (const badge of badges.values()) badge.remove();
    badges.clear(); cache.clear(); imageIndex.clear(); nameIndex.clear(); style.remove();
  }
  refresh();
  return cleanup;
  }
  let cleanup;
  function sync() {
    let enabled = false;
    try { enabled = localStorage.getItem('nexusHospitalBedNumbersV1') === 'true'; } catch {}
    if (enabled && !cleanup) cleanup = start();
    else if (!enabled && cleanup) { cleanup(); cleanup = null; }
  }
  function storage(event) { if (!event.key || event.key === 'nexusHospitalBedNumbersV1') sync(); }
  window.addEventListener('nexus:settings-saved', sync);
  window.addEventListener('storage', storage);
  window.addEventListener('pagehide', () => {
    cleanup?.(); cleanup = null;
    window.removeEventListener('nexus:settings-saved', sync);
    window.removeEventListener('storage', storage);
  }, {once:true});
  sync();
})();

