// Runs only inside the collector's serial upload worker, never a game worker.
export async function automaticRegistration(client, meta) {
 if (!meta.enabled || !meta.identity) return meta;
 if (meta.token && meta.pairedPlayer === meta.identity.player) return meta;
 if (!meta.installationId || !meta.registrationSecret) {
  meta = await client.store.update({installationId:meta.installationId || crypto.randomUUID(),registrationSecret:meta.registrationSecret || crypto.randomUUID()+crypto.randomUUID()});
 }
 const ua=globalThis.navigator?.userAgent||'';
 const browser=/Edg\//.test(ua)?'Edge':/Firefox\//.test(ua)?'Firefox':'Chrome';
 const os=/Windows/.test(ua)?'Windows':/Macintosh/.test(ua)?'macOS':/Android/.test(ua)?'Android':'device';
 const label=meta.deviceLabel && meta.deviceLabel!=='Nexus private browser'?meta.deviceLabel:`${meta.identity.username} — ${browser} on ${os} — ${meta.installationId.slice(0,4)}`;
 const response=await client.http('/v1/register',{game_player_id:meta.identity.player,username:meta.identity.username,device_label:label.slice(0,128),installation_id:meta.installationId,registration_secret:meta.registrationSecret});
 if(typeof response.device_token!=='string'||response.device_token.length<16||response.device_token.length>256||typeof response.device_id!=='string'||!response.device_id)throw Error('Collector registration response was incomplete');
 const current=await client.store.meta();
 if(current.identity?.player!==meta.identity.player || !current.enabled)return current;
 return client.store.update({token:response.device_token,deviceId:response.device_id,pairedPlayer:meta.identity.player,deviceLabel:label.slice(0,128),needsPair:false,lastError:'',attempts:0,nextAttempt:0});
}
