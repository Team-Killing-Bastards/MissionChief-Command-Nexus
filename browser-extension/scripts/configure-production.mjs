import fs from 'node:fs';
import {validEndpoint} from '../extension/analytics-core.mjs';
const endpoint=process.env.EDGE_LOGGER_ENDPOINT;
if(!endpoint||!validEndpoint(endpoint))throw Error('Missing or invalid EDGE_LOGGER_ENDPOINT repository secret');
fs.writeFileSync('extension/deployment-config.mjs','// Production destination injected by the trusted release workflow.\nexport const GOOGLE_ENDPOINT = '+JSON.stringify(endpoint)+';\n');
console.log('Production logger destination configured; value omitted from logs.');
