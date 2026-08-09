#!/usr/bin/env node
// v1.0.96 introduced the towing regression. Keep this historical entrypoint
// chained into repository validation, but enforce the corrected v1.0.97 contract.
await import('./check-hgv-recovery-v1097.mjs');
