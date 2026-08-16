# Greasy Fork Automated Release Setup

This guide connects the approved `main` branch of MissionChief Command Nexus to Greasy Fork.

## Release architecture

```text
feature/fix branch
        ↓
pull request validation
        ↓
merge approved version to main
        ↓
GitHub push webhook notifies Greasy Fork
        ↓
Greasy Fork fetches the raw main-branch userscript
        ↓
Greasy Fork publishes only when @version is newer
        ↓
trusted-main release reconciliation creates the matching tag and verified assets
        ↓
one verified Discord delivery receipt
```

Greasy Fork's public API is read-only and does not provide an API that can directly publish script updates. Its supported automated route is external code synchronization plus a GitHub webhook.

## Authoritative source

Greasy Fork must synchronize from this exact raw URL:

```text
https://raw.githubusercontent.com/Team-Killing-Bastards/MissionChief-Command-Nexus/main/src/missionchief-command-nexus.user.js
```

Do not synchronize from a feature branch, pull request, GitHub Release asset or copied `.txt` file. `main` is the approved distributable source.

## One-time Greasy Fork setup

These steps must be performed while signed in to the Greasy Fork account that owns the listing.

1. Sign in to Greasy Fork.
2. Create the unified **MissionChief Command Nexus** listing, or open its administration page if it already exists.
3. For the first version, import or paste the contents of `src/missionchief-command-nexus.user.js`.
4. Confirm the listing uses the MIT licence and that the code metadata shows the correct name, namespace, version, matches, homepage and support URL.
5. Open the listing's code synchronization or external-code settings.
6. Enter the authoritative raw URL shown above.
7. Run the first synchronization manually and confirm Greasy Fork can fetch the file.
8. In Greasy Fork's synchronization instructions, locate the unique webhook/payload URL generated for this script.
9. Copy that URL exactly. Do not publish it in an issue, commit, screenshot or documentation.

Greasy Fork controls the wording and location of these controls, so labels may vary slightly. Use the synchronization/webhook instructions shown on the script owner's administration page.

## One-time GitHub webhook setup

Repository Admin access is required.

1. Open `Team-Killing-Bastards/MissionChief-Command-Nexus` on GitHub.
2. Select **Settings**.
3. In the left sidebar, select **Webhooks**.
4. Select **Add webhook**.
5. In **Payload URL**, paste the unique URL copied from Greasy Fork.
6. Set **Content type** to `application/json`.
7. Leave **Secret** empty unless Greasy Fork's own instructions explicitly provide or require one.
8. Keep SSL verification enabled.
9. Under events, select **Just the push event**.
10. Keep **Active** selected.
11. Select **Add webhook**.
12. Open the new webhook and inspect **Recent Deliveries**. GitHub normally sends a ping immediately; a successful delivery should return a 2xx response.

Only the push event is required. The raw synchronization URL points to `main`, so a push to another branch does not change the file Greasy Fork fetches.

## First publication test

1. Confirm `src/missionchief-command-nexus.user.js` is present on `main`.
2. Confirm its `@version` is higher than any version already present on the unified Greasy Fork listing.
3. Merge an approved pull request to `main`.
4. Open GitHub **Settings > Webhooks > [Greasy Fork webhook] > Recent Deliveries**.
5. Confirm the push delivery received a 2xx response.
6. Open the Greasy Fork listing and check its synchronization history/status.
7. Confirm the displayed version matches the userscript metadata.
8. Compare the first lines and SHA-256 checksum where practical.
9. Perform a clean Tampermonkey or Violentmonkey installation from Greasy Fork.
10. Disable the two legacy standalone scripts before enabling Command Nexus.

## Normal release procedure

Every intended Greasy Fork update follows this order:

1. Create a feature or fix branch from current `main`.
2. Make the complete source change in `src/missionchief-command-nexus.user.js`.
3. Increase `@version` using `MAJOR.MINOR.PATCH` format.
4. Update `CHANGELOG.md` with user-visible changes.
5. Run:

   ```bash
   node --check src/missionchief-command-nexus.user.js
   node scripts/validate-userscript.mjs
   for check in scripts/check-*.mjs; do node "$check"; done
   python3 scripts/check_repository.py
   ```

6. Open a pull request into `main`.
7. Wait for **Repository integrity** and **Userscript validation** to pass.
8. Complete the relevant manual MissionChief regression tests.
9. Obtain MartyBlyth's release approval.
10. Merge the pull request to `main`.
11. Verify trusted-main release reconciliation created the matching tag and GitHub Release exactly once.
12. Verify the Greasy Fork webhook delivery and resulting script version.
13. Test installation/update from Greasy Fork.
14. Verify the GitHub Release contains the `.user.js` asset, SHA-256 file and one Discord delivery receipt.

The trusted-main workflow creates or repairs the matching tag and GitHub Release idempotently. The tag does not publish to Greasy Fork; the merge/push to `main` and Greasy Fork webhook perform that publication.

## Version rules

- Use `MAJOR.MINOR.PATCH`, for example `1.0.0`, `1.0.1` or `1.1.0`.
- Increase the version for every code change intended for Greasy Fork.
- Do not reuse a published version.
- A rollback must still use a new, higher version containing the reverted code.
- The release tag must be exactly `v` plus the metadata version.

Examples:

| Change | Old | New |
|---|---:|---:|
| Bug fix | 1.0.0 | 1.0.1 |
| Backward-compatible feature | 1.0.1 | 1.1.0 |
| Breaking change or incompatible storage migration | 1.1.0 | 2.0.0 |

## GitHub safeguards already included

- JavaScript syntax validation.
- Required userscript metadata validation.
- Greasy Fork 2 MB size check.
- Prohibition of `@updateURL`, `@downloadURL` and `@installURL`, so Greasy Fork remains responsible for Greasy Fork-installed updates.
- Pull request failure when source changes without an increased version.
- Automatic discovery and execution of every permanent `scripts/check-*.mjs` regression.
- A repository guard against behavioral tests pinning release or component versions.
- Tag-to-`@version` matching.
- Automatic, idempotent GitHub Release asset, SHA-256 and Discord-receipt reconciliation.

## Emergency stop

To stop automatic publication immediately:

1. Open GitHub **Settings > Webhooks**.
2. Open the Greasy Fork webhook.
3. Clear **Active** or delete the webhook.
4. In Greasy Fork, change synchronization to manual if that option is available.
5. Investigate on a branch; do not repair directly on `main` unless it is an emergency.

To roll back a bad publication, restore the last known-good code on a new branch, increase the patch version, validate it, merge it to `main`, and verify the new Greasy Fork update.

## Troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| GitHub delivery is absent | Webhook inactive or wrong event | Enable it and select the push event |
| Delivery is red/non-2xx | Payload URL is wrong or expired | Copy the current URL from Greasy Fork and update the webhook |
| Delivery is 2xx but no new Greasy Fork version | `main` did not change, version was not increased, or sync URL points elsewhere | Check raw URL and `@version` |
| Greasy Fork cannot fetch code | Raw URL/path/case is wrong or source is not on `main` | Open the raw URL in a private browser window |
| Pull request validation fails | Syntax, metadata, size or version rule failed | Read the Actions log and correct the reported item |
| Tag release fails | Tag and `@version` differ | Delete/correct the unpublished tag or create the correct matching tag |
| A feature branch triggered a webhook | GitHub push hooks cover repository pushes | No publication occurs unless the configured raw `main` file has a newer version |

## Security

- No GitHub personal access token is required for Greasy Fork synchronization.
- Never store Greasy Fork cookies, account passwords or webhook URLs in repository files.
- Keep the payload URL private even if it does not look like a password.
- Keep GitHub SSL verification enabled.
- Protect `main` and require pull-request validation before merge.

## Official references

- Greasy Fork API and webhook information: <https://greasyfork.org/en/help/api>
- GitHub repository webhook instructions: <https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks>
- GitHub webhook delivery management: <https://docs.github.com/en/webhooks/using-webhooks>
