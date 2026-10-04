// Narrow audit writes through the trusted worker; never expose collector tokens.
export function createDeletionAuditHandler(api) {
  return (message, sender, reply) => {
    if (message?.type !== 'NEXUS_BUILDING_DELETE_AUDIT') return false;
    try {
      if (sender.id !== api.runtime.id || sender.frameId !== 0 || !sender.tab ||
          !['https://www.missionchief.co.uk', 'https://police.missionchief.co.uk'].includes(new URL(sender.url).origin)) return false;
      const value = message.value;
      const keys = Object.keys(value || {});
      if (keys.length !== 1 || !['nexusBuildingDeletionLastRun', 'nexusBuildingDeletionFailure'].includes(keys[0]) || JSON.stringify(value).length > 1000000) {
        reply({ok:false,error:'Invalid deletion audit'}); return false;
      }
      api.storage.local.set(value).then(() => reply({ok:true}), () => reply({ok:false,error:'Background audit storage failed'}));
      return true;
    } catch { reply({ok:false,error:'Invalid deletion audit'}); return false; }
  };
}
if (globalThis.chrome?.runtime?.onMessage) chrome.runtime.onMessage.addListener(createDeletionAuditHandler(chrome));
