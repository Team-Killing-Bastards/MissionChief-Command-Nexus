# Chrome extension release process

## Current distribution

[Chrome Web Store listing](https://chromewebstore.google.com/detail/missionchief-command-nexu/pheccockibcappcdgonjjfcmlkemmaln) is the supported installation and update channel. The public listing was checked on 7 October 2026 and reports `3.0.43.205`. The corresponding versioned source is [extension-candidates/3.0.43.205](../extension-candidates/3.0.43.205/README.md).

MartyBlyth remains the technical owner and final release authority. A GitHub merge, a ZIP, a Store submission, Store approval and delivery to browsers are different states. Do not report an update as live based only on CI or an upload response.

## Prepare and validate

1. Start from the current versioned extension, not the retained `.82` pipeline or `.user.js` baseline.
2. Use a higher valid four-part manifest version for changed distributable bytes. Preserve the established Store ID and approved permissions.
3. Update the extension changelog, bundled update notes, package provenance and relevant privacy/migration documentation.
4. Run repository checks and the versioned extension checks. The current commands are:

   ```bash
   python3 scripts/check_workflow_yaml.py
   python3 scripts/check_repository.py
   node scripts/check-project-state.mjs
   python3 extension-candidates/3.0.43.205/package.py
   node extension-candidates/3.0.43.205/validate.mjs
   NEXUS_SKIP_BROWSER=1 node extension-candidates/3.0.43.205/check-update-notes.mjs
   ```

5. Run affected runtime regressions and browser/live tests. Record exact environments and untested limitations.
6. Review the exact commit and package before requesting publication.

## Submission and rollout

Submit the verified ZIP to the existing Chrome item `pheccockibcappcdgonjjfcmlkemmaln` only when a Store release is requested. Preserve its identity so existing installations receive updates. Record the package hash, manifest version and submission result. Then verify Store approval, the public listing and the installed version separately. An announcement needs its own authorization and delivery record; documentation maintenance must not send one.

The older [browser-extension](../browser-extension/README.md) workflow builds `.82` and must not be mistaken for a builder for the versioned `.205` source. Its publication now requires an explicit manual input; editing documentation cannot submit that old package. Future automation must deliberately point to the reviewed current package before it becomes the normal release path. Edge submission remains a separate decision.

## Repository-only maintenance

Installation links, documentation, issue templates and project records can change without bumping an extension or userscript version when packaged bytes are unchanged. Keep the current extension package and provenance intact. Normal pushes and merges run validation, not legacy userscript publication or Discord announcements.

The retained userscript workflows are labelled legacy. Recovery requires a manual dispatch with `legacy_recovery` enabled and a specific recovery purpose. They still verify immutable source, assets, Greasy Fork parity and duplicate-delivery receipts if deliberately used; they are not the Chrome release pipeline.

## Completion record and recovery

Record the exact source commit, version, package hash, checks, approval, submission/review status, Store observation and rollout evidence. A version match is not proof that local bytes equal the Store package. Stop unsafe automation first; deliver corrected behavior as a higher extension version instead of reusing a published version.

Update `project-state.json` and regenerate `docs/PROJECT_STATE.md`. Google Memory Bank and Rules documents provide historical navigation; they must not override current source, verified release evidence or the repository state.
