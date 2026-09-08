import fs from 'node:fs';
const source=['Code.gs','Rolling.gs'].map(name=>fs.readFileSync('extension/google-backend/'+name,'utf8')).join('\n');
fs.mkdirSync('audit',{recursive:true});
fs.writeFileSync('audit/google-backend.gs',source);
console.log('Built audit/google-backend.gs. Configure the two private IDs in Apps Script, preserve the existing web deployment, then run installNexusRollingLogger.');
