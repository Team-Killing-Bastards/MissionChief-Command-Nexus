#!/usr/bin/env python3

from __future__ import annotations

import re
from pathlib import Path

SOURCE_PATH = Path("src/missionchief-command-nexus.user.js")
README_PATH = Path("README.md")
VALIDATE_WORKFLOW_PATH = Path(".github/workflows/validate-userscript.yml")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


def sub_once(text: str, pattern: str, replacement, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.MULTILINE)
    if count != 1:
        raise RuntimeError(f"{label}: expected exactly one match, found {count}")
    return updated


source = SOURCE_PATH.read_text(encoding="utf-8")

source = replace_once(
    source,
    "const PERSONNEL_VERSION = '1.3.8';",
    "const PERSONNEL_VERSION = '1.3.9';",
    "Personnel Assignment version",
)

engine_patterns = [
    r"(const\s+MISSION_FINDER_VERSION\s*=\s*'V10\.6\.)(\d+)(';)",
    r"(const\s+MISSION_FINDER_ENGINE_VERSION\s*=\s*'V10\.6\.)(\d+)(';)",
    r"(const\s+VERSION\s*=\s*'V10\.6\.)(\d+)(';)",
]
engine_match = None
engine_pattern = None
for candidate in engine_patterns:
    match = re.search(candidate, source)
    if match:
        engine_match = match
        engine_pattern = candidate
        break

if engine_match is None or engine_pattern is None:
    occurrences = sorted(set(re.findall(r"V10\.6\.\d+", source)))
    raise RuntimeError(
        "Mission Finder version constant was not found. Visible versions: "
        + ", ".join(occurrences[-10:])
    )

old_engine = int(engine_match.group(2))
new_engine = old_engine + 1
source = sub_once(
    source,
    engine_pattern,
    lambda match: f"{match.group(1)}{new_engine}{match.group(3)}",
    "Mission Finder engine version",
)

file_input_old = """    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.style.display = 'none';"""
file_input_new = """    fileInput.type = 'file';
    fileInput.accept = '.json,application/json';
    fileInput.hidden = true;
    fileInput.setAttribute('aria-hidden', 'true');
    fileInput.tabIndex = -1;
    fileInput.style.display = 'none';"""
source = replace_once(
    source,
    file_input_old,
    file_input_new,
    "hidden Personnel Assignment import input",
)

mobile_pattern = re.compile(
    r"""@media \(max-width: 820px\) \{
\s*#mf-personnel-panel \.mf-personnel-action-row,
\s*#mf-personnel-panel \.mf-personnel-tools-disclosure \.mf-compact-tools-grid \{
\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);
\s*\}

\s*#mf-personnel-panel \.mf-personnel-refresh-control,
\s*#mf-personnel-panel \.mf-personnel-import-control,
\s*#mf-personnel-panel \.mf-personnel-start-control \{
\s*grid-column: auto;
\s*\}
\s*\}""",
    re.MULTILINE,
)

mobile_contract = """/* iOS Safari Personnel Assignment completeness contract. */
#mf-personnel-import-file {
    display: none !important;
    position: absolute !important;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
}

#mf-personnel-panel .mf-personnel-action-row {
    display: grid !important;
}

#mf-personnel-panel .mf-personnel-action-row > .mf-button {
    display: inline-flex !important;
    visibility: visible !important;
    opacity: 1 !important;
    position: static !important;
    min-width: 0 !important;
}

#mf-personnel-panel details.mf-personnel-tools-disclosure {
    display: block !important;
}

#mf-personnel-panel details.mf-personnel-tools-disclosure > summary {
    display: flex !important;
}

#mf-personnel-panel details.mf-personnel-tools-disclosure:not([open])
    > .mf-compact-disclosure-content {
    display: none !important;
}

#mf-personnel-panel details.mf-personnel-tools-disclosure[open]
    > .mf-compact-disclosure-content {
    display: block !important;
}

@media (max-width: 820px), (hover: none) and (pointer: coarse) {
    #mf-personnel-panel {
        min-height: 0;
        max-height: calc(
            100dvh
            - env(safe-area-inset-top)
            - env(safe-area-inset-bottom)
            - 12px
        );
        overflow-y: auto !important;
        overscroll-behavior: contain;
        -webkit-overflow-scrolling: touch;
        padding-bottom: max(14px, env(safe-area-inset-bottom));
    }

    #mf-personnel-panel .mf-personnel-action-row,
    #mf-personnel-panel .mf-personnel-tools-disclosure .mf-compact-tools-grid {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 8px;
    }

    #mf-personnel-panel .mf-personnel-action-row > .mf-button,
    #mf-personnel-panel .mf-personnel-tools-disclosure .mf-button,
    #mf-personnel-panel details.mf-personnel-tools-disclosure > summary {
        min-height: 44px !important;
        font-size: 14px;
        touch-action: manipulation;
    }

    #mf-personnel-panel .mf-personnel-refresh-control,
    #mf-personnel-panel .mf-personnel-import-control,
    #mf-personnel-panel .mf-personnel-start-control,
    #mf-personnel-panel .mf-personnel-pause-control,
    #mf-personnel-panel .mf-personnel-stop-control {
        display: inline-flex !important;
        grid-column: auto;
    }
}

@media (max-width: 520px) {
    #mf-personnel-panel .mf-personnel-action-row,
    #mf-personnel-panel .mf-personnel-tools-disclosure .mf-compact-tools-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    #mf-personnel-panel .mf-personnel-refresh-control {
        grid-column: 1 / -1 !important;
    }

    #mf-personnel-panel .mf-personnel-import-control,
    #mf-personnel-panel .mf-personnel-start-control,
    #mf-personnel-panel .mf-personnel-pause-control,
    #mf-personnel-panel .mf-personnel-stop-control {
        grid-column: auto !important;
    }
}
/* End iOS Safari Personnel Assignment completeness contract. */"""

source, mobile_count = mobile_pattern.subn(mobile_contract, source, count=1)
if mobile_count != 1:
    raise RuntimeError(
        "Personnel Assignment mobile CSS anchor: expected exactly one match, "
        f"found {mobile_count}"
    )

SOURCE_PATH.write_text(source, encoding="utf-8")

readme = README_PATH.read_text(encoding="utf-8")
readme_anchor = "## Current v1.0.84 behaviour\n"
readme_insert = """
### Complete Personnel Assignment controls on iOS Safari

- Mobile and touch layouts retain **Refresh Stations**, **Import**, **Start**, **Pause** and **Stop**; no desktop action is removed.
- The native JSON file input remains hidden while the visible Import control opens it directly.
- **Tools and reports** remains a proper disclosure: closed content stays hidden and every report/status tool appears when opened.
- The Personnel panel uses touch-sized controls, two-column compact grids, safe-area padding and bounded `100dvh` scrolling on iPhone/iPad Safari.

"""
readme = replace_once(
    readme,
    readme_anchor,
    readme_anchor + readme_insert,
    "README current mobile behaviour",
)
README_PATH.write_text(readme, encoding="utf-8")

workflow = VALIDATE_WORKFLOW_PATH.read_text(encoding="utf-8")
workflow = replace_once(
    workflow,
    "faster patient/prisoner transport response, Missing-on-mission authority",
    "faster patient/prisoner transport response, complete iOS Personnel Assignment controls, Missing-on-mission authority",
    "validation workflow coverage summary",
)

path_anchor = "      - 'scripts/check-auto-transport-response-v1083.mjs'\n"
path_replacement = (
    path_anchor
    + "      - 'scripts/check-personnel-assignment-ios-completeness-v1084.mjs'\n"
)
path_count = workflow.count(path_anchor)
if path_count != 2:
    raise RuntimeError(
        "validation workflow path anchors: expected two matches, "
        f"found {path_count}"
    )
workflow = workflow.replace(path_anchor, path_replacement)

step_anchor = """      - name: Validate faster patient and prisoner transport response
        run: node scripts/check-auto-transport-response-v1083.mjs
"""
step_replacement = step_anchor + """
      - name: Validate complete iOS Safari Personnel Assignment controls
        run: node scripts/check-personnel-assignment-ios-completeness-v1084.mjs
"""
workflow = replace_once(
    workflow,
    step_anchor,
    step_replacement,
    "validation workflow iOS Personnel Assignment step",
)
VALIDATE_WORKFLOW_PATH.write_text(workflow, encoding="utf-8")

print(
    "Patched Personnel Assignment 1.3.8 -> 1.3.9; "
    f"Mission Finder V10.6.{old_engine} -> V10.6.{new_engine}."
)
print("Applied permanent iOS Safari action/disclosure/safe-area CSS contract.")
