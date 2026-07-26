#!/usr/bin/env python3
from pathlib import Path

path = Path('scripts/check-police-search-advisor-register.mjs')
text = path.read_text(encoding='utf-8')
text = text.replace(
    "const pattern = new RegExp(`^\\\\s*function\\\\s+${name}\\\\s*\\\\(`, 'm');",
    "const pattern = new RegExp(`^\\\\s*(?:async\\\\s+)?function\\\\s+${name}\\\\s*\\\\(`, 'm');"
)
text = text.replace(
    "const next = /^\\s*function\\s+[A-Za-z0-9_$]+\\s*\\(/m.exec(rest);",
    "const next = /^\\s*(?:async\\s+)?function\\s+[A-Za-z0-9_$]+\\s*\\(/m.exec(rest);"
)
path.write_text(text, encoding='utf-8')
