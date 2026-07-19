# Support

MissionChief Command Nexus currently provides one merged v1.0.1 userscript from the canonical `main` source. It remains a development baseline until the compatibility, migration and release gates are completed and approved by MartyBlyth.

## Supported support routes

- Use the **Bug report** issue form for one reproducible defect.
- Use the **Feature request** issue form for one coherent improvement proposal.
- Use [SECURITY.md](SECURITY.md) for sensitive vulnerabilities, credentials, private data exposure or exploitable unsafe automation.
- Do not post webhook URLs, session cookies, account IDs or private alliance information publicly.

## Before opening a bug report

1. Confirm the Command Nexus version and, for a development build, the commit SHA.
2. Confirm both legacy standalone scripts are disabled.
3. Stop automation or batch work before repeating a potentially unsafe defect.
4. Reload MissionChief and reproduce the problem on the smallest safe scope.
5. Test with unrelated userscripts disabled where practical.
6. Search existing issues for the same behaviour.
7. Remove private information from screenshots and logs.

## Information required

Support requests should include:

- Command Nexus version and commit.
- MissionChief domain.
- Browser, operating system and userscript manager versions.
- Other enabled userscripts.
- Relevant mission, station, vehicle, personnel or training type.
- Starting state, including selected resources, active automation and migration state where relevant.
- Exact reproduction steps.
- Expected and actual behaviour.
- Whether Stop worked and whether the action repeated.
- Sanitized screenshots, requirement rows or console output where useful.

## High-risk reports

Clearly identify defects that could:

- Dispatch or submit the wrong mission action.
- Repeat dispatch, rename or personnel-assignment actions.
- Ignore patient or trained-personnel demand.
- Act against a previous or different mission instance.
- Rename or assign outside the disclosed scope.
- Continue after Stop.
- Corrupt or lose stored settings or training data.
- Create duplicate interfaces or growing background work.

Do not repeatedly reproduce a destructive defect merely to gather more evidence.

## Current support boundaries

- Current `main` and the latest publicly synchronized build receive best-effort support.
- Compatibility is claimed only for environments with recorded evidence.
- Mobile, Safari and interacting-script combinations remain unsupported until validated.
- Older versions may be investigated when the issue remains reproducible on the current baseline.
- The project cannot provide MissionChief account recovery, official game support, alliance administration or guarantees about actions taken by the game operator.
- No response-time guarantee is offered.

## Authority

Development and technical decisions are handled by **MartyBlyth**. **Conroy1988 assists with repository administration, documentation and general project support only; he is not a userscript developer.**

Start with [Developer Handoff](docs/DEVELOPER_HANDOFF.md) for development context and [Testing Strategy](docs/TESTING.md) for evidence requirements.
