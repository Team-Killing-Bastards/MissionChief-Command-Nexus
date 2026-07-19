## Summary

Describe what changed, why it is needed and the user-visible result.

## Linked work

Closes #

## Project area

- [ ] Core runtime or lifecycle
- [ ] Storage or migration
- [ ] Mission requirements or dispatch
- [ ] Patients or specialist medical resources
- [ ] Vehicle capability or trained personnel
- [ ] Station, unit or personnel administration
- [ ] Queue or transport continuation
- [ ] Interface
- [ ] Performance
- [ ] Documentation, automation or release process

## Version and changelog

- [ ] Userscript source is unchanged; no version increase is required.
- [ ] Userscript source changed and `@version` was increased.
- [ ] `CHANGELOG.md` describes the user-visible change.

## User impact

Explain visible behaviour, compatibility impact, stored-data impact and any migration requirement.

## Automated validation

```text
node --check src/missionchief-command-nexus.user.js
node scripts/validate-userscript.mjs
python3 scripts/check_repository.py
```

- [ ] JavaScript syntax passed.
- [ ] Userscript validation passed.
- [ ] Repository integrity passed.

## Live validation

Record the exact environment:

| Field | Value |
|---|---|
| Command Nexus version/commit | |
| MissionChief domain | |
| Browser/version | |
| Userscript manager/version | |
| OS/device | |
| Other enabled userscripts | |
| Test scope | |
| Result | |

- [ ] Existing behaviour was recorded before the change.
- [ ] Relevant preview mode was tested before write actions.
- [ ] Manual mission controls were tested before Auto Mode where affected.
- [ ] Patient and trained-personnel requirements were checked where affected.
- [ ] No duplicate panels, observers, timers, listeners or submissions were introduced.
- [ ] Saved settings remain compatible or migration is documented.
- [ ] Stop, cancellation and navigation cleanup were tested where affected.
- [ ] Private information and temporary debug output were removed.

## Evidence

Add sanitized screenshots, logs, mission examples or test notes. Remove account IDs, tokens, webhook URLs and private alliance information.

## Risks and rollback

Describe likely failure modes, release blockers, storage impact and how the change can be reverted safely.

## Technical approval

- [ ] This change is ready for MartyBlyth's technical review when required.

MartyBlyth is the project developer and final technical approver. Contributors must describe their own contribution accurately and must not attribute userscript development to repository, documentation or testing assistance alone.
