import fs from 'node:fs';
export function releaseProvenance() {
  const baseline=JSON.parse(fs.readFileSync('reference/local-43.json'));
  const version=JSON.parse(fs.readFileSync('extension/manifest.json')).version;
  if(version===baseline.version)return {...baseline,sourceRuntimeSha256:baseline.testedRuntimeSha256};
  const update=JSON.parse(fs.readFileSync('reference/rules-44.json'));
  if(update.baseVersion!==baseline.version)throw Error('Unreviewed rules base');
  const allowed=['manifest.json','nexus-runtime.js','nexus-tools.js','rules-core.mjs','rules.js','rules.html','rules-catalogue.json'];
  if(Object.keys(update.files).some(file=>!allowed.includes(file)))throw Error('Unexpected rules-release change');
  const rules={...baseline,version:update.version,sourceRuntimeSha256:update.sourceRuntimeSha256,changes:[...baseline.changes,...update.changes],files:{...baseline.files,...update.files}};
  if(version===update.version)return rules;
  const responsive=JSON.parse(fs.readFileSync('reference/responsive-45.json'));
  if(version!==responsive.version||responsive.baseVersion!==rules.version)throw Error('Unreviewed responsive release');
  if(Object.keys(responsive.files).some(file=>!['manifest.json','nexus-runtime.js','nexus-tools.js','nexus-responsive.js'].includes(file)))throw Error('Unexpected responsive-release change');
  return {...rules,version,sourceRuntimeSha256:responsive.sourceRuntimeSha256,changes:[...rules.changes,...responsive.changes],files:{...rules.files,...responsive.files}};
}
