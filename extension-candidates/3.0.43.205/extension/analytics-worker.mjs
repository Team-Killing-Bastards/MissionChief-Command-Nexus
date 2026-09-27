import './nexus-real-locations-offline.mjs';
import './nexus-tools-storage.mjs';
import './collector-worker.mjs';
import {RULES_KEY,validateRules,DOG_RULE_MIGRATION_KEY,repairLegacySearchDogRule} from './rules-core.mjs';
let serial=Promise.resolve();const locked=task=>{const work=serial.then(task);serial=work.catch(()=>{});return work;};
async function ensureSearchDogRuleRepair() {
  return locked(() => navigator.locks.request('nexus-requirement-rules', async () => {
    const saved = await chrome.storage.local.get([RULES_KEY, DOG_RULE_MIGRATION_KEY]);
    if (saved[DOG_RULE_MIGRATION_KEY]) return;
    const data = repairLegacySearchDogRule(saved[RULES_KEY] || {schema: 1, rules: []});
    await chrome.storage.local.set({[RULES_KEY]: data, [DOG_RULE_MIGRATION_KEY]: true});
  }));
}

chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if (message?.type === 'NEXUS_REQUIREMENT_RULES_GET') {
    let allowed = false;
    try { allowed = !!sender.tab && ['https://www.missionchief.co.uk', 'https://police.missionchief.co.uk'].includes(new URL(sender.url).origin); } catch {}
    if (!allowed) return false;
    ensureSearchDogRuleRepair().then(() => chrome.storage.local.get(RULES_KEY)).then(saved => ({ ok: true, data: validateRules(saved[RULES_KEY] || { schema: 1, rules: [] }) }))
      .then(reply, () => reply({ ok: false }));
    return true;
  }


return false;});
chrome.runtime.onInstalled.addListener(()=>{void ensureSearchDogRuleRepair().catch(()=>{});});
void chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}).catch(()=>{});

import './nexus-building-delete-audit.mjs';

import './nexus-account-worker.mjs';

import './nexus-update-notes-worker.mjs';
