import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('automatic store release submits only to Chrome; Edge requires a separate explicit dispatch',()=>{
  const workflow=fs.readFileSync('../.github/workflows/edge-extension.yml','utf8').replaceAll('\r\n','\n');
  const edge=workflow.slice(workflow.indexOf('\n  publish:\n'),workflow.indexOf('\n  publish-chrome:\n'));
  assert.match(edge,/if: github\.ref == 'refs\/heads\/main' && github\.event_name == 'workflow_dispatch' && inputs\.publish_edge == true/);
  assert.match(workflow,/publish_edge:[\s\S]*?type: boolean[\s\S]*?default: false/);
  const chrome=workflow.slice(workflow.indexOf('\n  publish-chrome:\n'));
  assert.match(chrome,/if: github\.ref == 'refs\/heads\/main' && github\.event_name != 'pull_request'/);
  assert.match(chrome,/needs: verify/);
  assert.match(chrome,/node scripts\/publish-chrome\.mjs/);
});
