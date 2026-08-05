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
    updated, count = re.subn(
        pattern,
        replacement,
        text,
        count=1,
        flags=re.MULTILINE,
    )
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

engine_numbers = [int(value) for value in re.findall(r"V10\.6\.(\d+)", source)]
if not engine_numbers:
    raise RuntimeError("No Mission Finder V10.6.x engine version was found")

old_engine = max(engine_numbers)
new_engine = old_engine + 1
old_engine_token = f"V10.6.{old_engine}"
new_engine_token = f"V10.6.{new_engine}"
engine_reference_count = source.count(old_engine_token)
if engine_reference_count < 1 or engine_reference_count > 12:
    raise RuntimeError(
        f"Unexpected reference count for {old_engine_token}: {engine_reference_count}"
    )
source = source.replace(old_engine_token, new_engine_token)

file_input_html = (
    '<input id="mc-personnel-import-register-file" type="file" '
    'accept="application/json,.json" hidden>'
)
if source.count(file_input_html) != 1:
    raise RuntimeError(
        "Personnel register import input: expected exactly one current HTML control, "
        f"found {source.count(file_input_html)}"
    )

source = sub_once(
    source,
    r"function createCompactActionDisclosure\(\n"
    r"(?P<indent>\s*)container,\n"
    r"(?P=indent)selectors,\n"
    r"(?P=indent)label,\n"
    r"(?P=indent)id\n"
    r"(?P<close>\s*)\) \{",
    lambda match: (
        "function createCompactActionDisclosure(\n"
        f"{match.group('indent')}container,\n"
        f"{match.group('indent')}selectors,\n"
        f"{match.group('indent')}label,\n"
        f"{match.group('indent')}id,\n"
        f"{match.group('indent')}defaultOpen = false\n"
        f"{match.group('close')}) {{"
    ),
    "compact action disclosure default-open parameter",
)

source = replace_once(
    source,
    """            const details = createCompactDisclosure(
                id,
                label,
                buttons,
                false
            );""",
    """            const details = createCompactDisclosure(
                id,
                label,
                buttons,
                defaultOpen
            );""",
    "compact action disclosure default-open forwarding",
)

personnel_tools_pattern = re.compile(
    r"""        createCompactActionDisclosure\(
            compactPersonnelView\?\.querySelector\('\.mc-nexus-action-bar'\),
            \[
                '#mc-personnel-build-register',
                '#mc-personnel-full-register',
                '#mc-personnel-export-register',
                '#mc-personnel-import-register',
                '#mc-personnel-view-station-report',
                '#mc-personnel-copy-station',
                '#mc-personnel-copy',
                '#mc-personnel-debug',
                '#mc-personnel-clear'
            \],
            'Tools and reports',
            'mc-compact-personnel-tools'
        \);"""
)
personnel_tools_replacement = """        createCompactActionDisclosure(
            compactPersonnelView?.querySelector('.mc-nexus-action-bar'),
            [
                '#mc-personnel-build-register',
                '#mc-personnel-full-register',
                '#mc-personnel-export-register',
                '#mc-personnel-import-register',
                '#mc-personnel-view-station-report',
                '#mc-personnel-copy-station',
                '#mc-personnel-copy',
                '#mc-personnel-debug',
                '#mc-personnel-clear'
            ],
            'Tools and reports',
            'mc-compact-personnel-tools',
            isIosSafariWebsite()
        );"""
source, personnel_tools_count = personnel_tools_pattern.subn(
    personnel_tools_replacement,
    source,
    count=1,
)
if personnel_tools_count != 1:
    raise RuntimeError(
        "Personnel Tools and reports call: expected exactly one match, "
        f"found {personnel_tools_count}"
    )

style_anchor = """            #mc-namer-panel.mc-ios-safari .mc-namer-buttons button,
            #mc-namer-panel.mc-ios-safari select,
            #mc-namer-panel.mc-ios-safari input {
                min-height: 36px;
                font-size: 16px;
            }
"""

mobile_contract = """

            /* iOS Safari Personnel Assignment completeness contract. */
            #mc-namer-panel.mc-ios-safari #mc-personnel-import-register-file {
                display: none !important;
                position: absolute !important;
                inline-size: 0 !important;
                block-size: 0 !important;
                overflow: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
            }

            #mc-namer-panel.mc-ios-safari #mc-namer-body {
                min-height: 0;
                max-height: calc(
                    100dvh
                    - env(safe-area-inset-top, 0px)
                    - env(safe-area-inset-bottom, 0px)
                    - 58px
                );
                overflow-y: auto !important;
                overscroll-behavior: contain;
                -webkit-overflow-scrolling: touch;
                padding-bottom: max(14px, env(safe-area-inset-bottom, 0px));
            }

            #mc-namer-panel.mc-ios-safari .mc-nexus-action-bar {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
                align-items: stretch;
            }

            #mc-namer-panel.mc-ios-safari .mc-nexus-action-bar > button {
                display: inline-flex !important;
                align-items: center;
                justify-content: center;
                inline-size: 100%;
                min-inline-size: 0;
                min-height: 44px !important;
                padding: 8px 10px;
                line-height: 1.2;
                white-space: normal;
                overflow-wrap: anywhere;
                touch-action: manipulation;
            }

            #mc-namer-panel.mc-ios-safari #mc-personnel-refresh,
            #mc-namer-panel.mc-ios-safari #mc-personnel-start,
            #mc-namer-panel.mc-ios-safari .mc-compact-action-disclosure {
                grid-column: 1 / -1;
            }

            #mc-namer-panel.mc-ios-safari .mc-compact-disclosure {
                display: block !important;
                min-inline-size: 0;
                margin: 0;
                border: 1px solid #4b5563;
                border-radius: 7px;
                background: #111827;
                overflow: hidden;
            }

            #mc-namer-panel.mc-ios-safari .mc-compact-disclosure-summary {
                display: flex !important;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                min-height: 44px !important;
                padding: 9px 11px;
                color: #f8fafc;
                background: #1f2937;
                font-weight: 700;
                line-height: 1.2;
                list-style: none;
                cursor: pointer;
                user-select: none;
                touch-action: manipulation;
            }

            #mc-namer-panel.mc-ios-safari
            .mc-compact-disclosure-summary::-webkit-details-marker {
                display: none;
            }

            #mc-namer-panel.mc-ios-safari .mc-compact-summary-mark::before {
                content: "+";
                color: #93c5fd;
                font-size: 18px;
                line-height: 1;
            }

            #mc-namer-panel.mc-ios-safari
            .mc-compact-disclosure[open]
            > .mc-compact-disclosure-summary
            .mc-compact-summary-mark::before {
                content: "−";
            }

            #mc-namer-panel.mc-ios-safari .mc-compact-disclosure:not([open])
            > .mc-compact-disclosure-body {
                display: none !important;
            }

            #mc-namer-panel.mc-ios-safari .mc-compact-disclosure[open]
            > .mc-compact-disclosure-body {
                display: block !important;
                min-inline-size: 0;
                padding: 8px;
                border-top: 1px solid #374151;
            }

            #mc-namer-panel.mc-ios-safari .mc-compact-action-disclosure[open]
            > .mc-compact-disclosure-body {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
            }

            #mc-namer-panel.mc-ios-safari .mc-compact-action-disclosure button {
                display: inline-flex !important;
                align-items: center;
                justify-content: center;
                inline-size: 100%;
                min-inline-size: 0;
                min-height: 44px !important;
                padding: 8px;
                white-space: normal;
                overflow-wrap: anywhere;
                touch-action: manipulation;
            }

            #mc-namer-panel.mc-ios-safari .mc-nexus-personnel-grid
            > .mc-compact-disclosure {
                margin: 0 8px 8px;
            }

            /* End iOS Safari Personnel Assignment completeness contract. */
"""
source = replace_once(
    source,
    style_anchor,
    style_anchor + mobile_contract,
    "iOS Safari style anchor",
)

SOURCE_PATH.write_text(source, encoding="utf-8")

readme = README_PATH.read_text(encoding="utf-8")
readme_insert = """## iOS Safari Personnel Assignment completeness

- Mobile retains **Refresh Stations**, **Start**, **Pause** and **Stop** as full touch controls.
- **Tools and reports** opens by default on iOS and contains Quick Refresh Register, Full Verify Register, Export Register, Import Register, station/overall report actions, Debug and Clear Log.
- The native JSON file input is permanently hidden from layout; the visible Import Register button remains the only file-picker control.
- Every compact disclosure has a visible touch-sized header, clear plus/minus state and reliable closed/open body behaviour.
- The panel uses two-column mobile action grids, `100dvh` scrolling and iOS safe-area padding without removing desktop functionality.

"""
readme = replace_once(
    readme,
    "## Capability matrix\n",
    readme_insert + "## Capability matrix\n",
    "README capability matrix anchor",
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
        f"validation workflow path anchors: expected two matches, found {path_count}"
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
print(
    "Made every primary Personnel action visible, default-opened Tools and reports "
    "on iOS, hid the native file input and restored styled disclosures."
)
