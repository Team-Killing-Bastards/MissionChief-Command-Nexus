#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile('src/missionchief-command-nexus.user.js', 'utf8');
const styleStart = source.indexOf('style.textContent = `');
const styleEnd = source.indexOf('`;\ndocument.head.appendChild(style);', styleStart);
assert.ok(styleStart >= 0 && styleEnd > styleStart, 'V3 panel stylesheet must exist');
const styles = source.slice(styleStart, styleEnd);

for (const token of [
  'max-height: calc(100dvh - 70px)',
  '.mcn-panel {',
  'flex-direction: column',
  '.mcn-body { min-height: 0',
  '.mcn-scroll { min-height: 0',
  'overflow-y: auto',
  'overscroll-behavior: contain',
  '[data-mcn-skips] { max-height: 96px',
  '.mcn-actions { display: grid; flex: 0 0 auto',
]) {
  assert.ok(styles.includes(token), `panel overflow protection lost ${token}`);
}

const markupStart = source.indexOf('root.innerHTML = `');
const markupEnd = source.indexOf('`;\nconst navbarHeader', markupStart);
assert.ok(markupStart >= 0 && markupEnd > markupStart, 'V3 panel markup must exist');
const markup = source.slice(markupStart, markupEnd);
const scrollStart = markup.indexOf('<div class="mcn-scroll">');
const scrollEnd = markup.indexOf('<div class="mcn-actions">');
const stopButton = markup.indexOf('data-mcn-stop');
const exportButton = markup.indexOf('data-mcn-export');
assert.ok(scrollStart >= 0 && scrollEnd > scrollStart, 'scrolling content region must precede fixed controls');
assert.ok(stopButton > scrollEnd && exportButton > scrollEnd, 'Stop and Export must remain outside the scrolling content region');
assert.ok(markup.includes('data-mcn-skips'), 'Temporary Skips card must remain visible');
assert.doesNotMatch(markup, /C: waiting/);

console.log('PASS: long Temporary Skips content scrolls within the viewport while Stop and Export remain reachable.');
