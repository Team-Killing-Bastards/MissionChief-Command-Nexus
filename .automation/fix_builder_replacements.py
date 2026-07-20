from pathlib import Path

path = Path(".automation/build_v1_0_4.py")
text = path.read_text(encoding="utf-8")

replacements = (
    (
        "    visibility_replacement,\n    source,",
        "    lambda _match: visibility_replacement,\n    source,",
    ),
    (
        "    loader_replacement,\n    source,",
        "    lambda _match: loader_replacement,\n    source,",
    ),
)

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"Expected one builder replacement anchor for {old!r}; found {count}"
        )
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8", newline="\n")
print("Converted regex replacements to literal callable substitutions")
