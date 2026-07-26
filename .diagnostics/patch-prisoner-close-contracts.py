#!/usr/bin/env python3
from pathlib import Path

ROOT = Path('.')


def once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one match, found {count}')
    return text.replace(old, new, 1)


for path in sorted((ROOT / 'scripts').glob('*.mjs')):
    text = path.read_text(encoding='utf-8')
    updated = text.replace('1.0.46', '1.0.47').replace('V10.6.110', 'V10.6.111')
    if updated != text:
        path.write_text(updated, encoding='utf-8')

check_path = ROOT / 'scripts/check-auto-prisoner-cell-gate.mjs'
check = check_path.read_text(encoding='utf-8')
check = once(
    check,
    "  ['await closeAutoPrisonerReleaseDismissAfterClick();', 'release dismiss invocation'],",
    "  ['await closeAutoPrisonerReleaseDismissAfterClick(context);', 'release dismiss invocation with owner context'],",
    'dismiss invocation token'
)
check = once(
    check,
    "  ['function closeAutoPrisonerReleaseDismissAfterClick(', 'release-result dismiss handler'],",
    "  ['function closeAutoPrisonerReleaseDismissAfterClick(', 'release-result dismiss handler'],\n" +
    "  ['function getAutoPrisonerReleaseOwnerContainer(', 'release iframe to parent modal owner'],\n" +
    "  ['function resolveAutoPrisonerReleaseDismissContext(', 'live Vue modal reacquisition'],\n" +
    "  [\"getAttribute('data-modal')\", 'stable Vue modal identity'],",
    'new close contract tokens'
)
check = once(
    check,
    "const dismissCall = finalBody.indexOf('await closeAutoPrisonerReleaseDismissAfterClick();');",
    "const dismissCall = finalBody.indexOf('await closeAutoPrisonerReleaseDismissAfterClick(context);');",
    'dismiss call order'
)
check = once(
    check,
    "  'getTopmostAutoPrisonerReleaseDismissContext()',",
    "  'getTopmostAutoPrisonerReleaseDismissContext(releaseContext)',",
    'owner-scoped topmost chooser requirement'
)
check = once(
    check,
    "  'dismissContext.closeButton',\n  'isAutoPrisonerReleaseDismissContextVisible(',",
    "  'resolveAutoPrisonerReleaseDismissContext(',\n  'current.closeButton',\n  'current.overlay',\n  'isAutoPrisonerReleaseDismissContextVisible(',",
    'dismiss body requirements'
)
check = once(
    check,
    "const resultCloseLookup = dismissBody.indexOf('getTopmostAutoPrisonerReleaseDismissContext()');",
    "const resultCloseLookup = dismissBody.indexOf('resolveAutoPrisonerReleaseDismissContext(dismissContext)');",
    'live dismiss lookup order token'
)
check = once(
    check,
    "const resultCloseClick = dismissBody.indexOf('dismissContext.closeButton');",
    "const resultCloseClick = dismissBody.indexOf('realClickForQueueRestart(current.closeButton)');",
    'native dismiss click order token'
)
final_log = "console.log('Auto Mode prefers active cells, finishes normal actions when none are available, clicks only the exact current-mission Release Prisoners fallback, closes its direct result lightbox and restarts the mission cycle before dispatch.');"
extra = r'''const visibleContextsStart = source.indexOf('function getVisibleAutoPrisonerReleaseDismissContexts(');
const visibleContextsEnd = source.indexOf('function getTopmostAutoPrisonerReleaseDismissContext(', visibleContextsStart);
const visibleContextsBody = source.slice(visibleContextsStart, visibleContextsEnd);
for (const token of [
  '#modals-container .vm--container',
  'getAutoPrisonerReleaseOwnerContainer(',
  'getAutoPrisonerReleaseContainerKey(',
  'resolveAutoPrisonerReleaseDismissContext(',
]) {
  if (!visibleContextsBody.includes(token)) fail(`Prisoner close owner scoping is missing: ${token}`);
}

const visibilityStart = source.indexOf('function isAutoPrisonerReleaseDismissContextVisible(');
const visibilityEnd = source.indexOf('function closeAutoPrisonerReleaseDismissAfterClick(', visibilityStart);
const visibilityBody = source.slice(visibilityStart, visibilityEnd);
if (!visibilityBody.includes('resolveAutoPrisonerReleaseDismissContext(context)')) {
  fail('Close verification must reacquire the current Vue modal instead of trusting the old node');
}
if (visibilityBody.includes('context.modal.isConnected === false')) {
  fail('A disconnected old modal must not prove that its Vue replacement closed');
}

for (const token of [
  "['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']",
  'attempt === 3 && current.overlay',
  'getTopmostAutoPrisonerReleaseDismissContext(releaseContext)',
]) {
  if (!dismissBody.includes(token)) fail(`Scoped prisoner close retry is missing: ${token}`);
}

console.log('Auto Mode prefers active cells, completes the exact current-mission release fallback, follows the owning Vue vm--container/data-modal identity, reacquires replacement close spans and verifies the current lightbox is gone before restart.');'''
check = once(check, final_log, extra, 'final prisoner regression block')
check_path.write_text(check, encoding='utf-8')

readme_path = ROOT / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
readme = once(
    readme,
    '**Current version:** `1.0.46` · **Mission Finder engine:** `V10.6.110`',
    '**Current version:** `1.0.47` · **Mission Finder engine:** `V10.6.111`',
    'README version'
)
readme_path.write_text(readme, encoding='utf-8')

src_readme_path = ROOT / 'src/README.md'
src_readme = src_readme_path.read_text(encoding='utf-8')
src_readme = once(src_readme, '| Command Nexus version | `1.0.46` |', '| Command Nexus version | `1.0.47` |', 'source README version')
src_readme = once(src_readme, '| Mission Finder baseline | `V10.6.110` |', '| Mission Finder baseline | `V10.6.111` |', 'source README engine')
src_readme_path.write_text(src_readme, encoding='utf-8')

changelog_path = ROOT / 'CHANGELOG.md'
changelog = changelog_path.read_text(encoding='utf-8')
entry = '''## [1.0.47] - 2026-07-26\n\n### Fixed\n\n- Auto Mode now closes the exact Vue prisoner-release result lightbox after releasing prisoners.\n- The close handler follows the owning `.vm--container` and its `data-modal` identity, reacquires the live close span after Vue replaces modal nodes, and verifies that the current replacement modal is gone before restarting.\n- Scoped pointer and overlay fallbacks run only inside the same prisoner lightbox when the native close click does not dismiss it.\n\n### Changed engine baseline\n\n- Mission Finder increased from `V10.6.110` to `V10.6.111`.\n\n'''
changelog = once(changelog, '## [1.0.46] - 2026-07-26\n', entry + '## [1.0.46] - 2026-07-26\n', 'changelog entry')
changelog_path.write_text(changelog, encoding='utf-8')
