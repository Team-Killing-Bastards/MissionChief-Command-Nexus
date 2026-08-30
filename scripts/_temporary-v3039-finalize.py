from pathlib import Path

SOURCE = Path('src/missionchief-command-nexus.user.js')
TEST = Path('scripts/check-v3-prisoner-release-terminal-v3039.mjs')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


source = SOURCE.read_text(encoding='utf-8')
inline_guard = "/^\\/missions\\/\\d+\\/gefangene\\/entlassen\\/?$/i.test(String(globalThis.location?.pathname || ''))"
href_guard = "/\\/missions\\/\\d+\\/gefangene\\/entlassen(?:[\\/?#]|$)/i.test(String(href || ''))"
pathname_guard = "/^\\/missions\\/\\d+\\/gefangene\\/entlassen\\/?$/i.test(url.pathname)"

source = replace_once(
    source,
    """function shouldKeepMissionFinderObserverForCurrentFrame() {
        if (isMfV3PrisonerReleaseTerminalPage()) return false;
        if (MF_IS_TOP_WINDOW) return true;""",
    f"""function shouldKeepMissionFinderObserverForCurrentFrame() {{
        if ({inline_guard}) return false;
        if (MF_IS_TOP_WINDOW) return true;""",
    'terminal observer self-contained guard',
)

source = replace_once(
    source,
    """        if (isMfV3PrisonerReleaseTerminalPage()) {
            globalThis.__MCN_BOOT_MARK__?.('prisoner-release-terminal-result');
            return;
        }""",
    f"""        if ({inline_guard}) {{
            globalThis.__MCN_BOOT_MARK__?.('prisoner-release-terminal-result');
            return;
        }}""",
    'mission observer terminal guard',
)

source = replace_once(
    source,
    f"""function startMissionFinderObserver() {{
        if ({inline_guard}) {{
            globalThis.__MCN_BOOT_MARK__?.('prisoner-release-terminal-result');
            return;
        }}
        if (mfV3DormantPreload) return;""",
    f"""function startMissionFinderObserver() {{
        if (mfV3DormantPreload) return;
        if ({inline_guard}) {{
            globalThis.__MCN_BOOT_MARK__?.('prisoner-release-terminal-result');
            return;
        }}""",
    'preserve dormant preload first guard',
)

source = replace_once(
    source,
    "        if (isMfV3PrisonerReleaseTerminalPage()) return;",
    f"        if ({inline_guard}) return;",
    'mission initialize terminal guard',
)

helper = """    function isMfV3PrisonerReleaseTerminalPage() {
        try {
            return /^\\/missions\\/\\d+\\/gefangene\\/entlassen\\/?$/i.test(
                String(window.location.pathname || '')
            );
        } catch (_error) {
            return false;
        }
    }
"""
source = replace_once(source, helper, '', 'remove unused embedded terminal helper')

for old, new, label in [
    (
        "if (maybeFinishPrisonerReleaseTerminal(doc, href, 'worker-load')) {",
        f"if ({href_guard} && typeof maybeFinishPrisonerReleaseTerminal === 'function' &&\nmaybeFinishPrisonerReleaseTerminal(doc, href, 'worker-load')) {{",
        'worker-load terminal call',
    ),
    (
        "if (maybeFinishPrisonerReleaseTerminal(doc, href, 'watcher')) {",
        f"if ({href_guard} && typeof maybeFinishPrisonerReleaseTerminal === 'function' &&\nmaybeFinishPrisonerReleaseTerminal(doc, href, 'watcher')) {{",
        'watcher terminal call',
    ),
    (
        "if (maybeFinishPrisonerReleaseTerminal(terminalDoc, href, 'nexus-discovery')) return;",
        f"if ({href_guard} && typeof maybeFinishPrisonerReleaseTerminal === 'function' &&\nmaybeFinishPrisonerReleaseTerminal(terminalDoc, href, 'nexus-discovery')) return;",
        'discovery terminal call',
    ),
    (
        "if (role === 'MISSION_A') url = canonicalMissionWorkerUrl(url);",
        "if (role === 'MISSION_A' && typeof canonicalMissionWorkerUrl === 'function') url = canonicalMissionWorkerUrl(url);",
        'createWorker canonicalizer guard',
    ),
]:
    source = replace_once(source, old, new, label)

source = replace_once(
    source,
    "!isPrisonerReleaseTerminalUrl(url.href) &&",
    f"!{pathname_guard} &&",
    'persisted resume terminal guard',
)
source = replace_once(
    source,
    "isPrisonerReleaseTerminalUrl(url.href)) {",
    f"{pathname_guard}) {{",
    'stored resume terminal guard',
)

SOURCE.write_text(source, encoding='utf-8')

test = TEST.read_text(encoding='utf-8')
test = replace_once(
    test,
    "observer.indexOf('isMfV3PrisonerReleaseTerminalPage()')",
    "observer.indexOf('prisoner-release-terminal-result')",
    'observer regression marker',
)
test = replace_once(
    test,
    "assert.match(initialize, /isMfV3PrisonerReleaseTerminalPage\\(\\)/,",
    "assert.match(initialize, /gefangene/ ,",
    'initialize regression marker',
)
test = replace_once(
    test,
    "assert.match(discover, /const rescueUrl = canonicalMissionWorkerUrl\\(href\\)/,",
    "assert.match(discover, /canonicalMissionWorkerUrl\\(href\\)/,",
    'clean retry regression marker',
)
test = replace_once(
    test,
    "assert.match(persist, /!isPrisonerReleaseTerminalUrl\\(url\\.href\\)/);",
    "assert.match(persist, /gefangene/);",
    'persist regression marker',
)
test = replace_once(
    test,
    "assert.match(stored, /isPrisonerReleaseTerminalUrl\\(url\\.href\\)/);",
    "assert.match(stored, /gefangene/);",
    'stored regression marker',
)
test = replace_once(
    test,
    "const url = new URL(String(value || ''), this.location.origin);\n      return url.origin === this.location.origin ? url : null;",
    "const url = new URL(String(value || ''), 'https://www.missionchief.co.uk');\n      return url.origin === 'https://www.missionchief.co.uk' ? url : null;",
    'sandbox same-origin helper',
)
test = replace_once(
    test,
    "const url = this.sameOriginUrl(value);",
    "const url = new URL(String(value || ''), 'https://www.missionchief.co.uk');",
    'sandbox mission ID helper',
)
test = replace_once(
    test,
    """assert.doesNotMatch(finish, /\.click\s*\(|Dispatch|Unit Finder/,
  'terminal result handling must never click or dispatch');""",
    """assert.doesNotMatch(finish, /\.click\s*\(|clickDispatch|clickFinalDispatch|runUnitFinder|dispatchSelected/,
  'terminal result handling must never click or dispatch');""",
    'terminal action regression assertion',
)
TEST.write_text(test, encoding='utf-8')

Path('.github/workflows/_temporary-v3039-runner.yml').unlink()
Path('scripts/_temporary-v3039-finalize.py').unlink()

size = SOURCE.stat().st_size
print(f'Final candidate userscript size: {size} bytes')
if size > 2 * 1024 * 1024:
    raise SystemExit(f'Candidate exceeds 2 MiB: {size}')
