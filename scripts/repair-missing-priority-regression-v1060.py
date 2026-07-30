#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).with_name('check-missing-requirements-priority.mjs')
text = path.read_text(encoding='utf-8')
start = text.index('function extractFunction(name) {')
end = text.index('\n\nrequireText(', start)
replacement = r'''function extractFunction(name) {
  const syncToken = `function ${name}(`;
  const asyncToken = `async function ${name}(`;
  let start = source.indexOf(syncToken);
  if (start < 0) start = source.indexOf(asyncToken);
  if (start < 0) fail(`Unable to find function ${name}`);

  const opening = source.indexOf('{', start);
  let depth = 0;
  let state = 'code';
  let quote = '';
  let escaped = false;

  for (let index = opening; index < source.length; index += 1) {
    const character = source[index];
    const following = source[index + 1] || '';

    if (state === 'line-comment') {
      if (character === '\n') state = 'code';
      continue;
    }
    if (state === 'block-comment') {
      if (character === '*' && following === '/') {
        state = 'code';
        index += 1;
      }
      continue;
    }
    if (state === 'string' || state === 'template') {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) {
        state = 'code';
        quote = '';
      }
      continue;
    }
    if (character === '/' && following === '/') {
      state = 'line-comment';
      index += 1;
      continue;
    }
    if (character === '/' && following === '*') {
      state = 'block-comment';
      index += 1;
      continue;
    }
    if (character === "'" || character === '"') {
      state = 'string';
      quote = character;
      continue;
    }
    if (character === '`') {
      state = 'template';
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }

  fail(`Unable to extract function ${name}`);
}'''
path.write_text(text[:start] + replacement + text[end:], encoding='utf-8')
print('Repaired priority regression function locator.')
