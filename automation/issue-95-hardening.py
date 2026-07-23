#!/usr/bin/env python3

from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match; found {count}")
    file_path.write_text(text.replace(old, new, 1), encoding="utf-8", newline="\n")


replace_once(
    "src/missionchief-command-nexus.user.js",
    """            const pageMutation = isIosSafariWebsite() && records.some(record => {
                const target = record.target?.nodeType === Node.ELEMENT_NODE
                    ? record.target
                    : record.target?.parentElement;
                if (target?.closest?.('#mc-namer-panel')) return false;
                return record.addedNodes.length > 0 || record.removedNodes.length > 0;
            });
""",
    """            const pageMutation = isIosSafariWebsite() && records.some(record => {
                const target = record.target?.nodeType === Node.ELEMENT_NODE
                    ? record.target
                    : record.target?.parentElement;
                if (target?.closest?.('#mc-namer-panel')) return false;

                return [...record.addedNodes, ...record.removedNodes].some(node =>
                    node?.nodeType === Node.ELEMENT_NODE && (
                        node.matches?.('.building_list, .building_list_li') ||
                        node.querySelector?.('.building_list, .building_list_li')
                    )
                );
            });
""",
    "targeted Stations-list mutation detection",
)

check_path = Path("scripts/check-ios-compatibility.mjs")
check_text = check_path.read_text(encoding="utf-8")
marker = "requireText(\n  \"document.addEventListener('click', handleNavigationClick, true);\",\n  'responsive navigation lifecycle check'\n);\n"
if check_text.count(marker) != 1:
    raise SystemExit("navigation lifecycle check marker is not unique")
addition = marker + "requireText(\n  \"node.matches?.('.building_list, .building_list_li')\",\n  'targeted Stations-list lifecycle observation'\n);\n"
check_path.write_text(check_text.replace(marker, addition, 1), encoding="utf-8", newline="\n")

print("Issue #95 observer hardening applied.")
