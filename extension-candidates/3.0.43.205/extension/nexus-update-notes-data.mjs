// Packaged text only: opening a notice never fetches remote content.
export const CHANGELOG_URL = 'https://github.com/Team-Killing-Bastards/MissionChief-Command-Nexus/blob/main/docs/extension-changelog.md';
export const NOTES = [
  {version:'3.0.43.205', id:'update-notes', title:'See what changed after an update', text:'A one-time update notice shows the changes since your previous version. Reopen recent notes in Nexus Tools → Overview. Each change links to its GitHub entry.'},
  {version:'3.0.43.204', id:'automatic-station-checks', title:'Automatic station checks across all services', text:'Checks up to 30 staffed stations or vehicle bases per minute, with a shared allowance across game tabs. Older unchecked stations are prioritised; slow responses can reduce the rate.'},
  {version:'3.0.43.203', id:'check-a-station', title:'Check an individual station', text:'The profile-menu Check a station button accepts an exact station name or ID when you want a fresh check of one location.'},
  {version:'3.0.43.202', id:'fresh-station-evidence', title:'Use fresh station evidence between tabs', text:'Inventory exports reload saved station evidence before syncing, so an older tab does not keep sending its stale cached copy.'},
  {version:'3.0.43.201', id:'sar-requirements', title:'Read the complete SAR vehicle requirement', text:'Mission Update and Auto Mode recognise “Operational Support Vans, Trailers or Personal SAR Vehicles”, prefer Operational Support Vans by default, and can use eligible alternatives.'},
  {version:'3.0.43.200', id:'multi-pc-sign-in', title:'Discord sign-in on multiple PCs', text:'Packaged releases keep a stable extension ID, allowing the configured Nexus account service to recognise sign-in from another PC. Use the same Discord account for your saved profile.'},
  {version:'3.0.43.192', id:'account-sync', title:'Personnel register and account sync', text:'Optional Discord sign-in connects supported settings, saved profiles and personnel-register records across browsers. MissionChief player profiles remain separate, and the local register remains available offline.'}
];
export function compareVersions(a, b) {
  const left=String(a||'0').split('.').map(Number), right=String(b||'0').split('.').map(Number);
  for(let i=0;i<Math.max(left.length,right.length);i++) {
    const delta=(left[i]||0)-(right[i]||0); if(delta) return Math.sign(delta);
  }
  return 0;
}
export function notesSince(from, current) {
  return NOTES.filter(note=>compareVersions(note.version,current)<=0 && (!from || compareVersions(note.version,from)>0))
    .map(note=>({...note,url:`${CHANGELOG_URL}#v${note.version.replaceAll('.','-')}-${note.id}`}));
}
