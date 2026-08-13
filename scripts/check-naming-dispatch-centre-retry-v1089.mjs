#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Unable to find ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false;
  for (let i = brace; i < source.length; i += 1) {
    const c = source[i], n = source[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (c === '\\') { escaped = true; continue; }
      if (c === quote) quote = '';
      continue;
    }
    if (c === '/' && n === '/') { lineComment = true; i += 1; continue; }
    if (c === '/' && n === '*') { blockComment = true; i += 1; continue; }
    if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
    if (c === '{') depth += 1;
    if (c === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  fail(`Unterminated ${name}`);
}


expect(source.includes('// @version      1.0.111'), 'Expected current Command Nexus version');
const listener = extractFunction('installNamingDispatchCentreRefreshListener');
expect(listener.includes("document.addEventListener('click'"), 'Retry must use a delegated document click listener');
expect(listener.includes('#mc-namer-refresh-dispatch-centres, #mc-station-refresh-dispatch-centres'), 'Delegated listener must own both Retry buttons');
expect(listener.includes('refreshNamingDispatchCentres(true)'), 'Delegated Retry listener must force refresh');
expect(!source.includes("querySelector('#mc-namer-refresh-dispatch-centres').onclick"), 'Fragile Unit direct Retry binding must stay removed');
expect(!source.includes("querySelector('#mc-station-refresh-dispatch-centres').onclick"), 'Fragile Station direct Retry binding must stay removed');

const refresh = extractFunction('refreshNamingDispatchCentres');
const paintAt = refresh.indexOf('await yieldNamingDispatchCentreRefreshPaint();');
const loadAt = refresh.indexOf('await Promise.all([');
expect(paintAt >= 0 && loadAt > paintAt, 'Refreshing state must paint before loading');
expect(refresh.includes("button.dataset.dispatchCentreRefreshState = 'loading'"), 'Retry must expose loading state');
expect(refresh.includes('button.disabled = false'), 'Retry must re-enable after every attempt');
expect(refresh.includes('Retry Dispatch Centres. ${failureReason}'), 'Retry title must expose the failure reason');
expect(source.includes('pointer-events:auto; touch-action:manipulation;'), 'Retry buttons need pointer/touch affordance');
expect(workflow.includes('scripts/check-naming-dispatch-centre-retry-v1089.mjs'), 'v1.0.89 Retry regression must remain registered');

console.log('PASS: v1.0.89 delegated Retry/loading/error interaction remains protected under the v1.0.91 profile hierarchy.');
