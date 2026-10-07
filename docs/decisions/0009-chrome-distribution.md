# ADR-0009: Chrome Store is the current distribution authority

**Status:** accepted  
**Date:** 2026-10-07  
**Decision owner:** MartyBlyth

## Context

The project now ships a Chrome extension. The owner requested that GitHub installation links and operating guidance stop presenting Tampermonkey/Greasy Fork as current distribution. The public [Chrome listing](https://chromewebstore.google.com/detail/missionchief-command-nexu/pheccockibcappcdgonjjfcmlkemmaln) reports `3.0.43.205`; the repository has versioned source for that version.

## Decision and supersession

The Chrome Web Store is the supported installation and update route. `project-state.json.distribution` records that route, public listing version/date, current source and the limits of verification. A listing version match is not an independent package hash audit.

This supersedes ADR-0001's userscript-first authority for current product distribution and ADR-0007's older pipeline as the current build source. Existing runtime decisions remain subject to actual extension source and evidence. The `canonical` and `production` fields retain historical userscript records for compatibility with source validators; they must be labelled legacy in generated documentation.

## Locked consequences

- No Tampermonkey or Greasy Fork installation calls to action in current user guidance.
- Migration disables all older Nexus copies without assuming cross-identity storage migration.
- Routine pushes and merges validate but do not publish or announce legacy userscript releases.
- Legacy recovery requires explicit manual opt-in. Its parity and duplicate-delivery protections remain intact.
- The historical `.82` store publisher requires manual opt-in; it cannot run from a documentation merge.
- Current extension source, package hashes and identity remain unchanged by this documentation migration.
- Store submissions and notifications remain separately authorized actions.

## Validation

Repository checks validate README/manifest versions and the Store route. Project-state validation checks current source and generated documentation. Workflow regressions check manual recovery guards and retain immutable-source and single-delivery protections.
