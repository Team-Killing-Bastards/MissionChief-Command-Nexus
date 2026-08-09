#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const workflow = await readFile('.github/workflows/validate-userscript.yml', 'utf8');
const fail = message => { console.error(`ERROR: ${message}`); process.exit(1); };
const expect = (condition, message) => { if (!condition) fail(message); };

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Unable to find ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let i = brace; i < source.length; i += 1) {
    const c = source[i];
    const n = source[i + 1];
    if (lineComment) {
      if (c === '\n') lineComment = false;
      continue;
    }
    if (blockComment) {
      if (c === '*' && n === '/') { blockComment = false; i += 1; }
      continue;
    }
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
    if (c === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  fail(`Unterminated ${name}`);
}

class FixtureAnchor {
  constructor(href, text, className, row = null) {
    this.hrefValue = href;
    this.textContent = text;
    this.className = className;
    this.row = row;
  }
  getAttribute(name) {
    if (name === 'href') return this.hrefValue;
    if (name === 'class') return this.className;
    return '';
  }
  closest() { return this.row; }
}

class FixtureRow {
  constructor(html) {
    this.anchors = [];
    const anchorPattern = /<a\b([^>]*)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(anchorPattern)) {
      const attrs = `${match[1]} ${match[3]}`;
      const className = attrs.match(/\bclass=["']([^"']*)["']/i)?.[1] || '';
      const text = match[4].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      this.anchors.push(new FixtureAnchor(match[2], text, className, this));
    }
  }
  querySelectorAll(selector) {
    if (selector.includes('a[href*="/buildings/"]')) return this.anchors.filter(anchor => anchor.hrefValue.includes('/buildings/'));
    return [];
  }
  querySelector(selector) {
    if (selector.includes('.map_position_mover')) {
      return this.anchors.find(anchor => anchor.className.split(/\s+/).includes('map_position_mover') && anchor.hrefValue.includes('/buildings/')) || null;
    }
    if (selector.includes('a[href*="/buildings/"]')) return this.anchors.find(anchor => anchor.hrefValue.includes('/buildings/')) || null;
    return null;
  }
}

class FixtureDocument {
  constructor(html) {
    this.rows = [];
    const rowPattern = /<li\b[^>]*class=["'][^"']*\bbuilding_list_li\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
    for (const match of html.matchAll(rowPattern)) this.rows.push(new FixtureRow(match[1]));
    this.allAnchors = [];
    const anchorPattern = /<a\b([^>]*)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
    for (const match of html.matchAll(anchorPattern)) {
      const attrs = `${match[1]} ${match[3]}`;
      const className = attrs.match(/\bclass=["']([^"']*)["']/i)?.[1] || '';
      const text = match[4].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      this.allAnchors.push(new FixtureAnchor(match[2], text, className, null));
    }
  }
  querySelectorAll(selector) {
    if (selector.includes('.building_list_li') && !selector.includes('a[href')) return this.rows;
    if (selector === 'a[href*="/buildings/"]') return this.allAnchors.filter(anchor => anchor.hrefValue.includes('/buildings/'));
    return [];
  }
}

class FixtureDOMParser { parseFromString(html) { return new FixtureDocument(html); } }

const getIdSource = extractFunction('getNamingDispatchCentreIdFromHref');
const parserSource = extractFunction('extractNamingDispatchCentresFromHtml');

expect(source.includes('// @version      1.0.87'), 'Expected Command Nexus 1.0.87');
expect(source.includes("const UNIT_VERSION = '3.3.12';"), 'Expected Unit Naming 3.3.12');
expect(source.includes("const STATION_VERSION = '1.3.6';"), 'Expected Station Naming 1.3.6');
expect(!parserSource.includes('building_type_id="7"'), 'Parser must not depend on building_type_id=7 wrappers');
expect(parserSource.includes("parsed.querySelectorAll('a[href*=\\\"/buildings/\\\"]')") || parserSource.includes("parsed.querySelectorAll('a[href*=\"/buildings/\"]')"), 'Exact-link fallback missing');

function runParser(fixture) {
  const context = {
    DOMParser: FixtureDOMParser,
    URL,
    location: { origin: 'https://www.missionchief.co.uk' },
    cleanText: value => String(value || '').replace(/\s+/g, ' ').trim(),
    fixture,
    result: null,
    Map,
    String,
    Boolean
  };
  vm.runInNewContext(`${getIdSource}\n${parserSource}\nresult = extractNamingDispatchCentresFromHtml(fixture);`, context);
  return new Map(context.result);
}

const nativeFixture = `
<ul id="building_list">
  <li class="building_list_li" building_id="41001">
    <div class="building_list_caption">
      <a href="/buildings/41001/edit">Edit</a>
      <a class="map_position_mover" href="/buildings/41001">Edinburgh Control</a>
    </div>
  </li>
  <li class="building_list_li" data-building-id="41002">
    <div class="building_list_caption">
      <a class="map_position_mover" href="https://www.missionchief.co.uk/buildings/41002/">Glasgow Control</a>
    </div>
  </li>
</ul>
<nav><a href="/buildings/99999">Unrelated navigation building</a></nav>
`;
const nativeCentres = runParser(nativeFixture);
expect(nativeCentres.size === 2, `Expected two native Dispatch Centres, got ${nativeCentres.size}`);
expect(nativeCentres.get('41001') === 'Edinburgh Control', 'First Dispatch Centre label was not parsed');
expect(nativeCentres.get('41002') === 'Glasgow Control', 'Second Dispatch Centre label was not parsed');
expect(!nativeCentres.has('99999'), 'Scoped parser must ignore unrelated page-level building links');

const wrapperlessFixture = `
<a href="/buildings/52001">Fallback Control</a>
<a href="/buildings/52001/edit">Edit</a>
<a href="https://example.invalid/buildings/52002">Wrong origin</a>
`;
const fallbackCentres = runParser(wrapperlessFixture);
expect(fallbackCentres.size === 1, `Expected one fallback Dispatch Centre, got ${fallbackCentres.size}`);
expect(fallbackCentres.get('52001') === 'Fallback Control', 'Wrapperless exact-link fallback failed');

const refreshSource = extractFunction('refreshNamingDispatchCentres');
expect(refreshSource.includes("'Refreshing…'"), 'Refresh action must expose a loading state');
expect(refreshSource.includes("'Retry Dispatch Centres'"), 'Refresh failure must expose a retry state');
expect(refreshSource.includes('listLoaded && assignmentsLoaded && centreCount > 0'), 'Refresh must require both centre names and assignments');
const populateSource = extractFunction('populateNamingDispatchCentreFilter');
expect(populateSource.includes("'Dispatch Centres unavailable — refresh'"), 'Disabled selector must explain the refresh failure');
expect(populateSource.includes('NAMING_DISPATCH_CENTRE_STATE.listLoaded'), 'Selector must require native list readiness');
expect(populateSource.includes('NAMING_DISPATCH_CENTRE_STATE.loaded'), 'Selector must require assignment readiness');
expect(workflow.includes('scripts/check-naming-dispatch-centre-refresh-v1087.mjs'), 'v1.0.87 refresh regression must be registered in Validate userscript');
console.log('PASS: Dispatch Centre refresh parser, fallback and visible failure states are covered.');
