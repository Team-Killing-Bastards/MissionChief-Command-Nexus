// Expose only native-tool preferences. The analytics queue stays TRUSTED_CONTEXTS.
const PREFIX = 'nexusNativeToolsV1:';
const clip = (value, limit) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit) : '';
function cleanFavourites(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : []).slice(0, 100).flatMap(item => {
    if (!item || typeof item.href !== 'string' || !/^\/(?:buildings|vehicles|missions|schoolings|profile)\/\d{1,16}$/.test(item.href) || seen.has(item.href)) return [];
    const label = clip(item.label, 180); if (!label) return []; seen.add(item.href);
    return [{ href: item.href, label, kind: item.href.split('/')[1] }];
  });
}
export function cleanToolPreferences(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const data = { showClock: value.showClock === true, mapLinks: value.mapLinks !== false, favourites: cleanFavourites(value.favourites) };
  if (Array.isArray(value.groups)) data.groups = value.groups.slice(0, 12).flatMap(group => {
    const name = clip(group?.name, 40);
    const types = [...new Set((Array.isArray(group?.types) ? group.types : []).slice(0, 200).filter(type => Number.isInteger(type) && type >= 0 && type < 10000))];
    return name && types.length ? [{ name, types }] : [];
  });
  return data;
}
export function createToolStorageHandler(api) {
  let serial = Promise.resolve();
  return (message, sender, reply) => {
    if (!['NEXUS_TOOLS_GET', 'NEXUS_TOOLS_SAVE', 'NEXUS_TOOLS_OPEN_OPTIONS'].includes(message?.type)) return false;
    let host;
    try {
      const url = new URL(sender.url);
      if (sender.id !== api.runtime.id || sender.frameId !== 0 || !sender.tab || !['https://www.missionchief.co.uk', 'https://police.missionchief.co.uk'].includes(url.origin)) return false;
      host = url.hostname;
    } catch { return false; }
    const key = PREFIX + host;
    const task = async () => {
      if (message.type === 'NEXUS_TOOLS_OPEN_OPTIONS') { await api.runtime.openOptionsPage(); return {ok:true}; }
      if (message.type === 'NEXUS_TOOLS_GET') {
        const stored = await api.storage.local.get([key, 'nexusNativeNavigationV1']);
        return { ok: true, data: cleanToolPreferences(stored[key]), legacy: cleanFavourites(stored.nexusNativeNavigationV1) };
      }
      if (JSON.stringify(message.data ?? null).length > 50000) return { ok: false };
      const data = cleanToolPreferences(message.data); if (!data) return { ok: false };
      await api.storage.local.set({ [key]: data }); return { ok: true };
    };
    const work = serial.then(task); serial = work.catch(() => {});
    work.then(reply, () => reply({ ok: false })); return true;
  };
}
if (typeof chrome !== 'undefined') chrome.runtime.onMessage.addListener(createToolStorageHandler(chrome));
