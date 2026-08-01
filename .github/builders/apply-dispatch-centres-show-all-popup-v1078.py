#!/usr/bin/env python3
from pathlib import Path

feature = '/* Dispatch Centres Show all middle-click popup V1.0.78. */\n(function() {\n    \'use strict\';\n\n    const SHOW_ALL_SELECTOR =\n        \'a.lightbox-open[href="/leitstellenansicht"]\';\n    const POPUP_NAME =\n        \'missionchief-dispatch-centres-show-all\';\n\n    function installDispatchCentresShowAllMiddleClick() {\n        const root = document.documentElement;\n        if (\n            !root ||\n            root.dataset.mcnDispatchCentresPopupInstalled === \'true\'\n        ) {\n            return;\n        }\n\n        root.dataset.mcnDispatchCentresPopupInstalled = \'true\';\n\n        document.addEventListener(\n            \'auxclick\',\n            event => {\n                if (event.button !== 1) {\n                    return;\n                }\n\n                const target =\n                    event.target &&\n                    typeof event.target.closest === \'function\'\n                        ? event.target\n                        : event.target?.parentElement;\n                const anchor =\n                    target &&\n                    typeof target.closest === \'function\'\n                        ? target.closest(SHOW_ALL_SELECTOR)\n                        : null;\n\n                if (!anchor) {\n                    return;\n                }\n\n                event.preventDefault();\n                event.stopPropagation();\n                event.stopImmediatePropagation?.();\n\n                const width = 1280;\n                const height = 900;\n                const left = Math.max(\n                    0,\n                    Math.round(\n                        Number(window.screenX || 0) +\n                            (Number(window.outerWidth || width) -\n                                width) /\n                                2\n                    )\n                );\n                const top = Math.max(\n                    0,\n                    Math.round(\n                        Number(window.screenY || 0) +\n                            (Number(window.outerHeight || height) -\n                                height) /\n                                2\n                    )\n                );\n                const popup = window.open(\n                    new URL(\n                        anchor.getAttribute(\'href\') ||\n                            \'/leitstellenansicht\',\n                        window.location.origin\n                    ).href,\n                    POPUP_NAME,\n                    [\n                        \'popup=yes\',\n                        `width=${width}`,\n                        `height=${height}`,\n                        `left=${left}`,\n                        `top=${top}`,\n                        \'resizable=yes\',\n                        \'scrollbars=yes\'\n                    ].join(\',\')\n                );\n\n                popup?.focus();\n            },\n            true\n        );\n    }\n\n    installDispatchCentresShowAllMiddleClick();\n})();'
test = '#!/usr/bin/env node\nimport fs from \'node:fs\';\n\nconst source = fs.readFileSync(\n  \'src/missionchief-command-nexus.user.js\',\n  \'utf8\'\n);\n\nfunction fail(message) {\n  console.error(`ERROR: ${message}`);\n  process.exit(1);\n}\n\nfunction expect(condition, message) {\n  if (!condition) fail(message);\n}\n\nexpect(\n  source.includes(\'// @version      1.0.78\'),\n  \'Expected Command Nexus 1.0.78\'\n);\nexpect(\n  source.includes(\n    `\'a.lightbox-open[href="/leitstellenansicht"]\'`\n  ),\n  \'Exact Dispatch Centres Show all selector is missing\'\n);\n\nconst start = source.indexOf(\n  \'function installDispatchCentresShowAllMiddleClick(\'\n);\nconst end = source.indexOf(\n  \'installDispatchCentresShowAllMiddleClick();\',\n  start\n);\nexpect(start >= 0 && end > start, \'Popup installer is missing\');\n\nconst feature = source.slice(start, end);\nfor (const token of [\n  \'mcnDispatchCentresPopupInstalled\',\n  "document.addEventListener(",\n  "\'auxclick\'",\n  \'event.button !== 1\',\n  \'target.closest(SHOW_ALL_SELECTOR)\',\n  \'event.preventDefault()\',\n  \'event.stopPropagation()\',\n  \'stopImmediatePropagation\',\n  "anchor.getAttribute(\'href\')",\n  "\'/leitstellenansicht\'",\n  \'window.open(\',\n  \'POPUP_NAME\',\n  "\'popup=yes\'",\n  "\'resizable=yes\'",\n  "\'scrollbars=yes\'",\n  \'popup?.focus()\'\n]) {\n  expect(\n    feature.includes(token),\n    `Middle-click popup contract missing ${token}`\n  );\n}\n\nexpect(\n  !feature.includes("addEventListener(\'click\'"),\n  \'Normal left-click lightbox behaviour must remain untouched\'\n);\nexpect(\n  (source.match(\n    /installDispatchCentresShowAllMiddleClick\\(\\);/g\n  ) || []).length === 1,\n  \'Popup installer must run exactly once\'\n);\n\nconsole.log(\n  \'Dispatch Centres Show all middle-click popup checks passed.\'\n);'
changelog = "## [1.0.78] - 2026-08-01\n\n### Added\n\n- Middle-clicking the exact Dispatch Centres **Show all** lightbox link opens `/leitstellenansicht` in a centred, resizable popup window.\n- The popup uses a stable window name, focuses after opening and retains scrolling.\n\n### Safety and compatibility\n\n- Normal left-click behaviour remains MissionChief's existing lightbox.\n- Only middle-clicks on `a.lightbox-open[href=\"/leitstellenansicht\"]` are intercepted.\n- The delegated listener installs once and supports dynamically rendered **Show all** links.\n- The 1.0.77 Stations popup ownership fix, Mission Finder, Unit Finder, Vehicle Load, Auto Mode and iOS/iPadOS paths remain unchanged.\n\n"

source_path = Path("src/missionchief-command-nexus.user.js")
source = source_path.read_text(encoding="utf-8")
if "// @version      1.0.77" not in source:
    raise SystemExit("Expected Command Nexus 1.0.77 baseline")
if "installDispatchCentresShowAllMiddleClick" in source:
    raise SystemExit("Popup feature already exists")
source = source.replace("1.0.77", "1.0.78")
source_path.write_text(source.rstrip() + "\n\n" + feature + "\n", encoding="utf-8")

for path in Path("scripts").glob("check-*.mjs"):
    content = path.read_text(encoding="utf-8")
    updated = content.replace("1.0.77", "1.0.78")
    if updated != content:
        path.write_text(updated, encoding="utf-8")

Path("scripts/check-dispatch-centres-show-all-popup-v1078.mjs").write_text(
    test + "\n", encoding="utf-8"
)

for filename, old, new in [
    ("README.md", "**Current version:** `1.0.77`", "**Current version:** `1.0.78`"),
    ("src/README.md", "| Command Nexus version | `1.0.77` |", "| Command Nexus version | `1.0.78` |"),
]:
    path = Path(filename)
    content = path.read_text(encoding="utf-8")
    if old not in content:
        raise SystemExit(f"Version anchor missing in {filename}")
    path.write_text(content.replace(old, new, 1), encoding="utf-8")

path = Path("CHANGELOG.md")
content = path.read_text(encoding="utf-8")
anchor = "The project uses Semantic Versioning for the unified userscript release line.\n\n"
if anchor not in content:
    raise SystemExit("CHANGELOG anchor missing")
path.write_text(content.replace(anchor, anchor + changelog, 1), encoding="utf-8")

print("Applied Command Nexus 1.0.78 Dispatch Centres popup.")
