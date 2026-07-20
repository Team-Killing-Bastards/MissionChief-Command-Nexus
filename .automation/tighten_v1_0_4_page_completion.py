from pathlib import Path

path = Path("src/missionchief-command-nexus.user.js")
text = path.read_text(encoding="utf-8")

old = """                if (
                    rowProgressSeen &&
                    signatureStableFor >= 700 &&
                    !loadingIndicatorVisible
                ) {
                    pageCompleted = true;
                    break;
                }

                if (
                    controlTransitionSeen &&
                    pageElapsed >= 800 &&
                    !loadingIndicatorVisible
                ) {
                    pageCompleted = true;
                    break;
                }
"""

new = """                if (
                    rowProgressSeen &&
                    controlTransitionSeen &&
                    pageElapsed >= 800 &&
                    signatureStableFor >= 700 &&
                    !loadingIndicatorVisible
                ) {
                    pageCompleted = true;
                    break;
                }
"""

count = text.count(old)
if count != 1:
    raise SystemExit(
        f"Expected one page-completion block; found {count}."
    )

path.write_text(
    text.replace(old, new, 1),
    encoding="utf-8",
    newline="\n",
)

print(
    "Page completion now requires row progress, control transition, "
    "signature stability and no loading indicator."
)
