import test from 'node:test';
import assert from 'node:assert/strict';
import { functions } from './helpers.mjs';

async function run({signature = () => 'rows', loading = () => false, control = () => true, mission = () => 'one'} = {}) {
  let now = 0;
  const ctx = functions(['waitForVehicleNextPageReady'], {
    Date: {now: () => now}, MF_VEHICLE_NEXT_PAGE_SETTLE_MS: 1200,
    getLocalMissionInstanceKey: () => mission(now),
    invalidateVehicleListStructureCache() {},
    getVehicleCheckboxListSignature: () => ({signature: signature(now)}),
    getVisibleVehicleListLoadControl: () => control(now),
    isVehicleListLoadingIndicatorVisible: () => loading(now),
    wait: async ms => {now += ms;}
  });
  await ctx.waitForVehicleNextPageReady('rows', 'one');
  return now;
}
test('ready next page removes 800ms of redundant waiting', async () => {
  assert.equal(await run(), 400);
});
test('changing rows restart the stability window', async () => {
  assert.equal(await run({signature: t => t >= 300 ? 'more-rows' : 'rows'}), 700);
});
test('spinner and absent next control preserve the original pause', async () => {
  assert.equal(await run({loading: () => true}), 1200);
  assert.equal(await run({control: () => false}), 1200);
});
test('mission changes return to the outer mission guard', async () => {
  assert.equal(await run({mission: t => t >= 200 ? 'two' : 'one'}), 200);
});
