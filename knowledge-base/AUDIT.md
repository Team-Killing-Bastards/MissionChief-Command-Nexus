# Nexus knowledge-base audit - 24 October 2026

## Verified observations

- Repository: Team-Killing-Bastards/MissionChief-Command-Nexus.
- GitHub default-branch README, project-state and extension manifest identify 3.0.43.205. Their Store verification date is 7 October 2026, not today.
- The clean local release-72 checkout was at e0160800 on codex/critical-care-ambulance-priority-235, dated 24 October. Its .235 notes state that live behaviour and long-run throughput are unverified and no Store submission is included.
- GitHub could not resolve local e0160800 via the connector. Do not describe that commit or .235 as published.
- Older local root/github-release workspaces are unsuitable as the current extension authority. The latter contains unrelated modifications, which were left alone.
- The live domain opened through the connected browser and its root displayed {"detail":"Not Found"}. This proves that response for that request only; it does not prove that the stats dashboard is absent on another route.
- Shell DNS lookup failed and direct SSH to the previously configured VPS address failed with Permission denied. No live Caddy/Compose file, running container, mount, database state or health endpoint was inspected.
- Connected-browser Chrome Store access returned Not allowed. Search-service retrieval also failed. Current Store delivery cannot be asserted.
- Fresh isolated Edge capture failed to launch twice. No current screenshot or responsive browser result is claimed.

## Existing functionality established by source

The .235 manifest and modules expose MissionChief UK/police UK controls, personal Auto Mode, Unit Finder, update/upgrade selection, transport, fleet naming, personnel/register operations, building profiles, settings, alliance support, schooling conveniences, credit views, account sync, Realism and staging tools.

The important profile finding is explicit permanent vehicle removal and credit purchase approval. Existing crew bindings remain; only eligible empty seats are filled. The profile specialisation label does not purchase building extensions.

The source exposes Discord support and optional Discord account sync. It does not establish a mandatory community membership or access-approval workflow.

## Is /guide compatible?

Architecturally yes: a specific static /guide route can precede the existing catch-all reverse proxy, keeping the collector and API independent. This is conditional on the actual Caddy site, directive ordering and visible filesystem mount. Compatibility with the live configuration has NOT been verified.

Use an exact /guide redirect plus a /guide/* handler. Do not use /guide* (it also captures unrelated paths). Unknown guide paths must return 404 rather than forwarding to the API or serving the guide home page. The design needs no new database, backend process or public port.

The supplied Caddy fragment is a proposal, not a replacement Caddyfile. If Caddy is containerised and the docs path is not mounted, adding a mount recreates Caddy. That production step requires inspection, backups, a rollback plan and risk approval before execution.

## Implemented safely

A separate static documentation project with 14 source chapters, search, sidebar, quick start, previous/next, screenshot-dialog support, mobile CSS, version/evidence metadata and two PDFs generated from the same content. The design uses existing extension colours and system typography; matching the unknown stats dashboard remains outstanding.

A custom static generator is used as the lightweight equivalent to Starlight: no runtime framework, no new service or running costs. Current dependencies are pinned in package.json; clean online npm installation and a lockfile are still required.

No collector/API, PostgreSQL, Caddy, production container, extension permissions or operational extension source was changed. No browser-store submission was performed.

## Publication blockers

1. Verify current Store listing and installed game build; resolve .205/.235 source authority.
2. Inspect live Caddy and Compose configuration, mounts, service names and existing dashboard source/URL.
3. Establish an authorised working VPS connection.
4. Capture real current UI with personal data removed and highlighted controls for every tutorial.
5. Complete live naming, register, profile-review, manual dispatch, Auto Mode, alliance and advanced walkthroughs.
6. Verify exact onboarding/access procedure with the maintainer.
7. Run browser-based accessibility, search, screenshot and desktop/tablet/mobile checks in a working browser.
8. Verify the proposed Caddy config and baseline/post-change stats and public API behaviour.
9. Approve content and deploy site/PDFs together, then integrate dashboard/extension links.
10. Only set publicationReady=true after all evidence in publication-checks.json is complete.

## Production status

Not deployed. Stats navigation and extension Help links are proposals only. No availability or unchanged-health claim is made for inaccessible production services.

## Additional connection evidence

The account's registered Desktop Commander device named vps-daa24069 is offline (reported last seen 667 hours ago). Reconnect that existing authorised VPS device to continue the live configuration audit. This does not prove the Nexus service or VPS itself is offline.

Documentation is saved in draft PR #449. The final review PDFs contain 6 and 16 pages respectively. Persistent PDF transfer failed because the upload helper could not resolve its service; local PDF copies remain available.
