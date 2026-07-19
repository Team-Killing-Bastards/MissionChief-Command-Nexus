# Source Directory

The authoritative distributable source for MissionChief Command Nexus is:

```text
src/missionchief-command-nexus.user.js
```

## Current source intake

- Unified release line: `1.0.x`
- Imported baseline: Mission Finder V10.6.69 with Unit, Station & Personnel Tools V4.2.8
- Initial repository metadata version: `1.0.0`
- Licence: MIT
- Developer and source-code owner: **MartyBlyth**
- Project helper: **Conroy1988**

The original uploaded source was converted from `.txt` to the installable `.user.js` filename. Only the userscript metadata block was standardized for repository, licence, support and release automation. The operational script body and compatibility guards were retained.

## Distribution rule

`src/missionchief-command-nexus.user.js` on `main` is the single source Greasy Fork must fetch. Feature branches are development-only and must not be used as the synchronization URL.

Raw production source:

```text
https://raw.githubusercontent.com/Team-Killing-Bastards/MissionChief-Command-Nexus/main/src/missionchief-command-nexus.user.js
```

## Required release checks

Before merging a source change:

- Increase `@version`.
- Run `node --check src/missionchief-command-nexus.user.js`.
- Run `node scripts/validate-userscript.mjs`.
- Update `CHANGELOG.md`.
- Complete the relevant MissionChief regression checks.
- Confirm no account-specific data, credentials or private configuration was introduced.
- Do not run the unified script and either legacy standalone script simultaneously.

See [Greasy Fork Automated Release Setup](../docs/GREASY_FORK_SETUP.md) for publication details.
