#!/usr/bin/env node
import fs from 'node:fs';

const source = fs.readFileSync('src/missionchief-command-nexus.user.js', 'utf8');

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) fail(`Missing function ${name}`);
  const parameterStart = source.indexOf('(', start);
  let parameterDepth = 0;
  let bodyStart = -1;
  let quote = '';
  let escaped = false;

  for (let index = parameterStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '(') parameterDepth += 1;
    if (character === ')') {
      parameterDepth -= 1;
      if (parameterDepth === 0) {
        bodyStart = source.indexOf('{', index);
        break;
      }
    }
  }

  if (bodyStart < 0) fail(`Missing body for ${name}`);
  let depth = 0;
  quote = '';
  escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '/' && next === '/') {
      const lineEnd = source.indexOf('\n', index + 2);
      index = lineEnd < 0 ? source.length : lineEnd;
      continue;
    }
    if (character === '/' && next === '*') {
      const blockEnd = source.indexOf('*/', index + 2);
      if (blockEnd < 0) fail(`Unclosed comment in ${name}`);
      index = blockEnd + 1;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  fail(`Unable to extract ${name}`);
}

expect(source.includes('// @version      1.0.91'), 'Expected current Command Nexus version');
expect(source.includes('MISSION FINDER V10.6.144'), 'Mission Finder baseline must remain V10.6.144');
expect(source.includes("const UNIT_VERSION = '3.3.16';"), 'Unit Naming must be 3.3.11');
expect(source.includes("const STATION_VERSION = '1.3.10';"), 'Station Naming must be 1.3.5');
expect(source.includes("const PERSONNEL_VERSION = '1.3.9';"), 'Personnel Assignment must remain 1.3.9');

const moduleStart = source.indexOf("if (window.__MC_NAMING_TOOLS_V428__) return;");
const moduleEnd = source.indexOf("const UNIT_VERSION = '3.3.16';", moduleStart);
expect(moduleStart >= 0 && moduleEnd > moduleStart, 'Unable to isolate Resource Administration startup');
const startup = source.slice(moduleStart, moduleEnd);

expect(startup.includes('window.top === window.self'), 'Top-window ownership detection must remain');
expect(startup.includes('const TOOL_IS_STATION_OVERVIEW_FRAME'), 'Missing Stations popup frame classifier');
expect(startup.includes('if (TOOL_IS_TOP_WINDOW) return false;'), 'Top window must not be classified as a child popup');
expect(startup.includes('window.top.location.origin !== location.origin'), 'Popup must be same-origin');
expect(startup.includes("String(location.pathname || '')"), 'Popup classification must use the child document route');
expect(startup.includes('leitstellenansicht'), 'Popup classification must require the Stations overview route');
expect(startup.includes('if (!TOOL_IS_TOP_WINDOW && !TOOL_IS_STATION_OVERVIEW_FRAME) return;'), 'Only top window or the exact Stations popup may own Resource Administration');
expect(!startup.includes('if (!TOOL_IS_TOP_WINDOW) return;'), 'Former blanket child-frame return must not remain');

const overview = extractFunction('isStationOverviewScreen');
const popupGate = overview.indexOf('if (TOOL_IS_STATION_OVERVIEW_FRAME)');
const desktopGate = overview.indexOf('if (!isIosSafariWebsite())');
expect(popupGate >= 0, 'Stations popup must have an explicit overview route');
expect(desktopGate > popupGate, 'Popup route must be evaluated before desktop-only selector matching');
expect(overview.includes('entry.link?.isConnected'), 'Popup must require a connected Station entry');
expect(overview.includes('desktopStationSelector'), 'Dedicated desktop Stations detection must remain');
expect(overview.includes('isRenderedStationOverviewEntry(entry)'), 'iOS rendered Stations lifecycle must remain');

const observerCount = (source.match(/new\s+MutationObserver\s*\(/g) || []).length;
expect(observerCount === 2, `Permanent MutationObserver count changed: ${observerCount}`);

console.log('Normal Stations overview popup ownership and lifecycle checks passed.');
