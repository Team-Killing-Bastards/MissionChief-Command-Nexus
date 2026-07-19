# Security Policy

## Supported versions

MissionChief Command Nexus is currently in pre-release development. Security support will begin with the first published release.

| Version | Supported |
|---|---|
| Pre-release development | Best effort |
| Latest stable release | Yes, once published |
| Older stable releases | Case by case |

## Reporting a security issue

Do not publish sensitive vulnerabilities, account data, authentication material or exploitable automation behaviour in a public issue.

Use GitHub's private vulnerability reporting feature when it is available for this repository. If private reporting is unavailable, contact an organisation owner privately and provide:

- A concise description of the problem.
- The affected version or commit.
- Reproduction steps.
- The potential impact.
- Any suggested mitigation.

Please do not include MissionChief credentials, session cookies, personal information or private alliance data.

## Scope

Security-relevant reports may include:

- Exposure of account or session information.
- Unsafe storage or transmission of user data.
- Unintended actions performed without clear operator control.
- Script behaviour that can repeatedly submit, rename, assign or dispatch because of lifecycle failures.
- Supply-chain risks in external dependencies or update sources.

General gameplay defects, incorrect vehicle selection and ordinary compatibility problems should use the public bug-report form unless they expose sensitive information or create a material security risk.

## Response expectations

Reports will be assessed by **MartyBlyth**, the project developer. Acknowledgement and remediation timing depend on severity, reproducibility and project availability. No guaranteed response time is offered.

## Disclaimer

This is an independent community userscript and is not affiliated with MissionChief or its operators.
