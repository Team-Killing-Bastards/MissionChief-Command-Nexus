from pathlib import Path

for script_path in Path("scripts").glob("*"):
    if not script_path.is_file():
        continue
    text = script_path.read_text(encoding="utf-8")
    updated = text.replace("// @version      1.0.35", "// @version      1.0.36")
    updated = updated.replace("v1.0.35 metadata", "v1.0.36 metadata")
    if updated != text:
        script_path.write_text(updated, encoding="utf-8")
