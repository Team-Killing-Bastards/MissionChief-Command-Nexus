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


source = SOURCE_PATH.read_text(encoding="utf-8")

source = replace_once(
    source,
    "const PERSONNEL_VERSION = '1.3.8';",
    "const PERSONNEL_VERSION = '1.3.9';",
    "Personnel Assignment version",
)

engine_numbers = [
    int(value)
    for value in re.findall(r"V10\.6\.(\d+)", source)
]
if not engine_numbers:
    raise RuntimeError("No Mission Finder V10.6.x engine version was found")

old_engine = max(engine_numbers)
new_engine = old_engine + 1
old_engine_token = f"V10.6.{old_engine}"
new_engine_token = f"V10.6.{new_engine}"
engine_reference_count = source.count(old_engine_token)
if engine_reference_count < 1 or engine_reference_count > 12:
    raise RuntimeError(
        "Unexpected current Mission Finder engine reference count for "
        f"{old_engine_token}: {engine_reference_count}"
    )
source = source.replace(old_engine_token, new_engine_token)

file_input_anchor = "    fileInput.id = 'mf-personnel-import-file';\n"
file_input_hardening = file_input_anchor + """    fileInput.hidden = true;
    fileInput.setAttribute('aria-hidden', 'true');
    fileInput.tabIndex = -1;
    fileInput.style.display = 'none';
"""
source = replace_once(
    source,
    file_input_anchor,
    file_input_hardening,
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
    f"Mission Finder {old_engine_token} -> {new_engine_token} "
    f"across {engine_reference_count} current references."
)
print("Applied permanent iOS Safari action/disclosure/safe-area CSS contract.")
