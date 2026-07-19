# Security Policy

## Supported versions

MissionChief Command Nexus is in active pre-release development. Security reports are accepted for the current canonical `main` source and the latest publicly synchronized build.

| Version | Support position |
|---|---|
| Current `main` / latest development baseline | Best effort |
| Latest approved formal release | Supported once published |
| Older builds | Case by case; reproduce on the current baseline where safe |

Compatibility, migration and ordinary gameplay defects remain subject to the evidence standards in [TESTING.md](docs/TESTING.md).

## Reporting a security issue

Do not publish sensitive vulnerabilities, account data, authentication material, private webhook URLs or exploitable unsafe automation in a public issue.

Use GitHub's private vulnerability reporting feature when available. If private reporting is unavailable, contact an organisation owner privately and provide:

- A concise description of the issue.
- The affected Command Nexus version and commit.
- MissionChief domain and environment.
- Minimal reproduction steps.
- Potential impact and affected data or actions.
- Whether the issue can repeat dispatch, rename, assignment or storage changes.
- Whether Stop or disabling the userscript prevents continuation.
- Any known mitigation or safe rollback.

Never include MissionChief credentials, session cookies, personal information, private alliance data, webhook tokens or unrelated browser storage.

## Security scope

Security-relevant reports may include:

- Exposure of account, session or personal information.
- Unsafe storage or transmission of user data.
- Credential, token or webhook leakage.
- Supply-chain compromise in update or release paths.
- Unintended actions performed without clear operator control.
- Repeated dispatch, rename, assignment or storage modification caused by lifecycle failure.
- Actions against a different mission, station, vehicle or person than the user selected.
- Automation continuing after an explicit stop or disable action.
- Maliciously crafted page data causing unsafe execution.

General incorrect vehicle selection, ordinary compatibility problems and non-sensitive UI defects should use the public bug-report form unless they expose private data or create material security risk.

## Safe handling

- Do not repeatedly reproduce destructive behaviour.
- Disable the userscript or affected webhook when necessary to contain impact.
- Preserve sanitized logs and the exact affected commit.
- Do not create public proof-of-concept instructions before remediation.
- Coordinate publication timing with MartyBlyth.

## Response expectations

Reports are assessed by **MartyBlyth**, the project developer and technical owner. Severity, reproducibility, user impact and project availability determine acknowledgement and remediation timing. No guaranteed response time is offered.

Conroy1988 may assist with private repository administration and documentation, but technical security decisions and release approval remain with MartyBlyth.

## Disclaimer

MissionChief Command Nexus is an independent community userscript and is not affiliated with, endorsed by or officially supported by MissionChief or its operators.
