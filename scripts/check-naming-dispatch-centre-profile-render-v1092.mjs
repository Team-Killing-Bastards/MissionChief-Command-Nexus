#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');
const hierarchyCheck = await readFile('scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const asyncMarker = `async function ${name}(`;
  const syncMarker = `function ${name}(`;
  const asyncStart = source.indexOf(asyncMarker);
  const start = asyncStart >= 0 ? asyncStart : source.indexOf(syncMarker);
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

class Anchor {
  constructor(href, text) { this.href = href; this.textContent = text; }
  getAttribute(name) { return name === 'href' ? this.href : ''; }
}
class Panel {
  constructor(anchors) { this.anchors = anchors; }
  querySelectorAll(selector) { return selector === 'a[href]' ? this.anchors : []; }
}
class EmptyProfileDoc {
  querySelectorAll(selector) { return selector === '.profile-dispatchcenter' ? [] : []; }
}
class RenderedProfileDoc {
  constructor() {
    this.panels = [
      new Panel([]),
      new Panel([new Anchor('/buildings/2634040', 'LODON DISPATCH')]),
      new Panel([new Anchor('/buildings/2638525', 'NI Ambulance Dispatch')]),
      new Panel([new Anchor('/buildings/2638524', 'NI Fire Dispatch')]),
      new Panel([new Anchor('/buildings/2638571', 'NI Hospitals')]),
      new Panel([new Anchor('/buildings/2632635', 'NI Police Dispatch')]),
      new Panel([new Anchor('/buildings/2638564', 'North England Dispatch')]),
      new Panel([new Anchor('/buildings/1859041', 'Scotlands Dispatch')])
    ];
  }
  querySelectorAll(selector) { return selector === '.profile-dispatchcenter' ? this.panels : []; }
}

const fakeIframe = {
  src: '',
  contentDocument: new EmptyProfileDoc(),
  style: {},
  removed: false,
  setAttribute() {},
  remove() { this.removed = true; }
};
const host = { appendChild(node) { expect(node === fakeIframe, 'Unexpected renderer node'); } };
const context = {
  URL,
  location: { origin: 'https://www.missionchief.co.uk' },
  cleanText: value => String(value || '').replace(/\s+/g, ' ').trim(),
  document: {
    body: host,
    documentElement: host,
    createElement: tag => {
      expect(tag === 'iframe', `Expected iframe renderer, got ${tag}`);
      return fakeIframe;
    }
  },
  Date,
  Promise,
  Map,
  String,
  setTimeout: callback => {
    fakeIframe.contentDocument = new RenderedProfileDoc();
    callback();
    return 1;
  },
  result: null
};

expect(source.includes('// @version      1.0.92'), 'Expected Command Nexus 1.0.92');
expect(source.includes("const UNIT_VERSION = '3.3.17';"), 'Expected Unit Naming 3.3.17');
expect(source.includes("const STATION_VERSION = '1.3.11';"), 'Expected Station Naming 1.3.11');

vm.runInNewContext(
  `${extractFunction('getNamingDispatchCentreIdFromHref')}\n` +
  `${extractFunction('extractNamingDispatchCentresFromProfileDocument')}\n` +
  `${extractFunction('loadNamingDispatchCentresFromRenderedProfile')}\n` +
  `result = loadNamingDispatchCentresFromRenderedProfile('/profile/419938', 1000);`,
  context
);
const centres = new Map(await context.result);
expect(centres.size === 7, `Expected seven centres after rendered DOM appears, got ${centres.size}`);
expect(centres.get('2634040') === 'LODON DISPATCH', 'LODON DISPATCH missing after rendered profile lifecycle');
expect(centres.get('1859041') === 'Scotlands Dispatch', 'Scotlands Dispatch missing after rendered profile lifecycle');
expect(fakeIframe.removed === true, 'Hidden profile renderer must always be removed after use');
expect(fakeIframe.src === '/profile/419938', `Renderer must load own profile path, got ${fakeIframe.src}`);

const listLoader = extractFunction('loadNamingDispatchCentreList');
expect(listLoader.includes('await loadNamingDispatchCentresFromRenderedProfile(profilePath)'), 'Centre loader must wait for rendered profile DOM');
expect(!listLoader.includes('stationFetchWithTimeout'), 'Centre loader must not parse a static fetched profile shell');
expect(!listLoader.includes('response.text()'), 'Centre loader must not depend on raw profile HTML');
expect(source.includes("document.createElement('iframe')"), 'Rendered profile loader must use a same-origin iframe');
expect(source.includes("iframe.remove();"), 'Rendered profile loader cleanup missing');
expect(source.includes('extractNamingDispatchCentresFromProfileDocument'), 'Rendered DOM parser helper missing');
expect(workflow.includes('scripts/check-naming-dispatch-centre-profile-hierarchy-v1091.mjs'), 'Registered profile hierarchy regression must remain in Validate userscript');
expect(hierarchyCheck.includes("check-naming-dispatch-centre-profile-render-v1092.mjs"), 'Registered profile hierarchy regression must execute the v1.0.92 renderer regression');

console.log('PASS: v1.0.92 waits for MissionChief/Vue to render the signed-in profile before reading Dispatch Centres.');
