# Contributing to MissionChief Command Nexus

MissionChief Command Nexus is developed and maintained by **MartyBlyth**. Community reports, testing evidence, documentation improvements and focused pull requests are welcome.

**Conroy1988 is a project helper, not a userscript developer.** Technical decisions and source-code direction remain with MartyBlyth.

## Before contributing

1. Search the existing issues and pull requests before opening a duplicate.
2. Use the appropriate issue form for bugs or feature proposals.
3. Keep reports focused on one reproducible problem or one coherent enhancement.
4. Remove account details, tokens, private alliance information and other sensitive data from screenshots or logs.
5. Discuss large architectural changes in an issue before writing substantial code.

## Bug reports

A useful bug report includes:

- Command Nexus version or source-script version.
- MissionChief domain and browser.
- Userscript manager and version.
- Device or operating system.
- Exact reproduction steps.
- Expected and actual behaviour.
- Console output where relevant.
- Whether the issue persists with other userscripts disabled.

## Pull requests

Pull requests should:

- Target the smallest practical change.
- Explain the user impact and technical rationale.
- Avoid unrelated formatting or refactoring.
- Preserve existing stored settings unless migration is documented.
- Avoid adding unnecessary global variables, observers, timers or repeated DOM scans.
- Include manual validation notes.
- Update documentation and changelog entries when behaviour changes.

## Development principles

- Preserve proven behaviour from the two original scripts.
- Prefer modular, explicit lifecycle management.
- Prevent duplicate interfaces, listeners and background work.
- Treat mission selection, personnel training and saved user data as high-risk areas.
- Keep preview modes available before bulk changes.
- Do not claim compatibility that has not been tested.

## Attribution

All source-code authorship must be represented accurately. MartyBlyth is the project developer. Assistance with repository administration, documentation or testing must not be described as userscript development unless code was actually authored.

## Licence

By contributing, you agree that your contribution may be distributed under the repository's MIT Licence.
