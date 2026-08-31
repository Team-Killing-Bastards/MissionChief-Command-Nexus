from pathlib import Path

path = Path('scripts/_temporary-build-durable-project-memory.py')
text = path.read_text(encoding='utf-8')
old = """    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match in {path}, found {count}')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')"""
new = """    count = text.count(old)
    if label == 'validate workflow pull-request paths':
        if count != 2:
            raise SystemExit(f'{label}: expected two matches in {path}, found {count}')
        file_path.write_text(text.replace(old, new, 2), encoding='utf-8')
        return
    if label == 'validate workflow push paths' and count == 0 and text.count(new) == 2:
        return
    if count != 1:
        raise SystemExit(f'{label}: expected one match in {path}, found {count}')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')"""
if old not in text:
    raise SystemExit('Builder replace_once patch marker not found.')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
