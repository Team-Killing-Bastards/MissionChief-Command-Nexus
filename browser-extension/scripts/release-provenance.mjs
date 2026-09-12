import fs from 'node:fs';
export function releaseProvenance() {
  const baseline=JSON.parse(fs.readFileSync('reference/local-43.json'));
  const version=JSON.parse(fs.readFileSync('extension/manifest.json')).version;
  if(version===baseline.version)return {...baseline,sourceRuntimeSha256:baseline.testedRuntimeSha256};
  const update=JSON.parse(fs.readFileSync('reference/rules-44.json'));
  if(version!==update.version||update.baseVersion!==baseline.version)throw Error('Unreviewed release version');
  const allowed=['manifest.json','nexus-runtime.js','nexus-tools.js','rules-core.mjs','rules.js','rules.html','rules-catalogue.json'];
  if(Object.keys(update.files).some(file=>!allowed.includes(file)))throw Error('Unexpected rules-release change');
  return {...baseline,version,sourceRuntimeSha256:update.sourceRuntimeSha256,changes:[...baseline.changes,...update.changes],files:{...baseline.files,...update.files}};
}
