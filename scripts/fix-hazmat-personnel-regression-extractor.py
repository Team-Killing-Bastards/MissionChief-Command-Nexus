#!/usr/bin/env python3
from pathlib import Path

path = Path(__file__).resolve().parents[1] / 'scripts/check-hazmat-personnel-osu.mjs'
text = path.read_text(encoding='utf-8')
old = """  let depth = 0;
  let quote = '';
  let escaped = false;
  let templateExpressionDepth = 0;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\\\') {
        escaped = true;
        continue;
      }
      if (quote === '`' && character === '$' && next === '{') {
        templateExpressionDepth += 1;
        depth += 1;
        index += 1;
        continue;
      }
      if (character === quote && templateExpressionDepth === 0) quote = '';
      if (quote === '`' && character === '}' && templateExpressionDepth > 0) {
        templateExpressionDepth -= 1;
      }
      continue;
    }
"""
new = """  let depth = 0;
  let quote = '';
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1] || '';

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === '\\\\') {
        escaped = true;
        continue;
      }
      if (character === quote) quote = '';
      continue;
    }
"""
if text.count(old) != 1:
    raise SystemExit(f'Expected one buggy extractor block, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Corrected HazMat regression function extractor.')
