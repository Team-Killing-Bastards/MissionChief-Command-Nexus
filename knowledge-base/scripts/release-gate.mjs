import fs from 'node:fs/promises';import path from 'node:path';import {root} from './build.mjs';
const config=JSON.parse(await fs.readFile(path.join(root,'site.json'),'utf8'));
const checks=JSON.parse(await fs.readFile(path.join(root,'publication-checks.json'),'utf8'));
const pending=Object.entries(checks).filter(([,value])=>value!==true).map(([key])=>key);
if(!config.publicationReady)pending.unshift('site.publicationReady');
if(pending.length){console.error('Publication blocked: '+pending.join(', '));process.exitCode=1;}
else console.log('Recorded publication checks passed. Follow deployment runbook.');
