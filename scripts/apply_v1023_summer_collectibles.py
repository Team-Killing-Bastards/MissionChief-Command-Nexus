from __future__ import annotations

import re
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


source_path = Path("src/missionchief-command-nexus.user.js")
source = source_path.read_text(encoding="utf-8")

source = replace_once(
    source,
    "// @version      1.0.22",
    "// @version      1.0.23",
    "userscript version",
)
source = replace_once(
    source,
    " * MODULE 2: MISSION FINDER V10.6.87",
    " * MODULE 2: MISSION FINDER V10.6.88",
    "Mission Finder version",
)

module_marker = " * MODULE 2: MISSION FINDER V10.6.88"
module_index = source.find(module_marker)
if module_index < 0:
    raise SystemExit("Mission Finder module marker was not found")

release_anchor = source.find("    // V10.6.87:", module_index)
if release_anchor < 0:
    raise SystemExit("Mission Finder V10.6.87 release-note anchor was not found")

release_note = (
    "    // V10.6.88: visible seasonal mission collectibles, including the\n"
    "    // summer sunflower item, are claimed through MissionChief's exact\n"
    "    // claim_found_object_sync route without navigating away from the mission.\n"
)
source = source[:release_anchor] + release_note + source[release_anchor:]

if "MF_EVENT_COLLECTIBLE_SELECTOR" in source:
    raise SystemExit("Seasonal collectible collector already exists")

module_tail = source[module_index:]
guard_match = re.search(
    r"(?P<guard>\n\s*if\s*\(\s*window\.__[A-Za-z0-9_$]+__\s*\)\s*return;\s*"
    r"\n\s*window\.__[A-Za-z0-9_$]+__\s*=\s*true;\s*\n)",
    module_tail,
)
if not guard_match:
    raise SystemExit("Mission Finder installation guard was not found")

insert_at = module_index + guard_match.end("guard")
collector = r'''
    const MF_EVENT_COLLECTIBLE_SELECTOR =
        'a#easter-egg-link[href^="/missions/"][href*="/claim_found_object_sync"]';
    const MF_EVENT_COLLECTIBLE_SCAN_INTERVAL_MS = 1000;
    const MF_EVENT_COLLECTIBLE_REQUEST_COOLDOWN_MS = 10000;
    const MF_EVENT_COLLECTIBLE_MAX_TRACKED = 250;
    const mfEventCollectibleClaimTimes = new Map();
    let mfEventCollectibleScanTimer = null;
    let mfEventCollectibleScanRunning = false;

    function getMissionEventCollectibleDocuments() {
        const documents = [];
        const seen = new Set();
        const queue = [document];

        while (
            queue.length > 0 &&
            documents.length < 24
        ) {
            const candidate = queue.shift();

            if (
                !candidate ||
                seen.has(candidate)
            ) {
                continue;
            }

            seen.add(candidate);
            documents.push(candidate);

            try {
                candidate
                    .querySelectorAll('iframe')
                    .forEach(frame => {
                        try {
                            const frameDocument =
                                frame.contentDocument;

                            if (
                                frameDocument &&
                                !seen.has(frameDocument)
                            ) {
                                queue.push(frameDocument);
                            }
                        } catch (_error) {}
                    });
            } catch (_error) {}
        }

        return documents;
    }

    function readMissionEventCollectibleClaim(link) {
        if (
            !link ||
            link.id !== 'easter-egg-link'
        ) {
            return null;
        }

        const href =
            String(
                link.getAttribute('href') || ''
            ).trim();

        const match =
            href.match(
                /^\/missions\/(\d+)\/claim_found_object_sync(?:[?#].*)?$/
            );

        if (!match) return null;

        return {
            href,
            missionId: match[1]
        };
    }

    function pruneMissionEventCollectibleClaimTimes(now = Date.now()) {
        for (
            const [href, claimedAt] of
            mfEventCollectibleClaimTimes
        ) {
            if (
                now - claimedAt >
                MF_EVENT_COLLECTIBLE_REQUEST_COOLDOWN_MS
            ) {
                mfEventCollectibleClaimTimes.delete(href);
            }
        }

        while (
            mfEventCollectibleClaimTimes.size >
            MF_EVENT_COLLECTIBLE_MAX_TRACKED
        ) {
            const oldestHref =
                mfEventCollectibleClaimTimes
                    .keys()
                    .next()
                    .value;

            if (!oldestHref) break;
            mfEventCollectibleClaimTimes.delete(oldestHref);
        }
    }

    async function claimMissionEventCollectible(link, claim) {
        const now = Date.now();
        pruneMissionEventCollectibleClaimTimes(now);

        let absoluteUrl = '';

        try {
            absoluteUrl =
                new URL(
                    claim.href,
                    link.ownerDocument?.location?.href ||
                    window.location.href
                ).href;
        } catch (_error) {
            return false;
        }

        const lastClaimAt =
            mfEventCollectibleClaimTimes.get(absoluteUrl) || 0;

        if (
            now - lastClaimAt <
            MF_EVENT_COLLECTIBLE_REQUEST_COOLDOWN_MS
        ) {
            return false;
        }

        mfEventCollectibleClaimTimes.set(
            absoluteUrl,
            now
        );
        link.setAttribute(
            'data-mc-event-claiming',
            'true'
        );

        try {
            const response =
                await fetch(
                    absoluteUrl,
                    {
                        method: 'GET',
                        credentials: 'same-origin',
                        cache: 'no-store',
                        redirect: 'follow'
                    }
                );

            if (!response.ok) {
                throw new Error(
                    `Collectible claim returned HTTP ${response.status}`
                );
            }

            if (link.isConnected) {
                link.remove();
            }

            try {
                window.dispatchEvent(
                    new CustomEvent(
                        'mc-mission-event-collectible-claimed',
                        {
                            detail: {
                                missionId: claim.missionId,
                                href: claim.href
                            }
                        }
                    )
                );
            } catch (_error) {}

            return true;
        } catch (_error) {
            mfEventCollectibleClaimTimes.delete(
                absoluteUrl
            );

            if (link.isConnected) {
                link.removeAttribute(
                    'data-mc-event-claiming'
                );
            }

            return false;
        }
    }

    async function scanMissionEventCollectibles() {
        if (
            mfEventCollectibleScanRunning ||
            document.visibilityState === 'hidden'
        ) {
            return;
        }

        mfEventCollectibleScanRunning = true;

        try {
            const documents =
                getMissionEventCollectibleDocuments();

            for (const candidateDocument of documents) {
                let links = [];

                try {
                    const exactLink =
                        candidateDocument.getElementById(
                            'easter-egg-link'
                        );

                    if (
                        exactLink &&
                        exactLink.matches(
                            MF_EVENT_COLLECTIBLE_SELECTOR
                        )
                    ) {
                        links = [exactLink];
                    }
                } catch (_error) {}

                for (const link of links) {
                    const claim =
                        readMissionEventCollectibleClaim(
                            link
                        );

                    if (!claim) continue;

                    await claimMissionEventCollectible(
                        link,
                        claim
                    );
                }
            }
        } finally {
            mfEventCollectibleScanRunning = false;
        }
    }

    function startMissionEventCollectibleCollector() {
        if (mfEventCollectibleScanTimer !== null) {
            return;
        }

        void scanMissionEventCollectibles();

        mfEventCollectibleScanTimer =
            window.setInterval(
                () => {
                    void scanMissionEventCollectibles();
                },
                MF_EVENT_COLLECTIBLE_SCAN_INTERVAL_MS
            );
    }

    startMissionEventCollectibleCollector();

'''
source = source[:insert_at] + collector + source[insert_at:]
source_path.write_text(source, encoding="utf-8", newline="\n")

changelog_path = Path("CHANGELOG.md")
changelog = changelog_path.read_text(encoding="utf-8")
release = """## [1.0.23] - 2026-07-24

### Added

- Added automatic collection for visible seasonal mission items, including the current summer sunflower, when MissionChief renders the exact `#easter-egg-link` claim control.
- The collector recognises only `/missions/{id}/claim_found_object_sync`, including mission content rendered inside same-origin lightboxes and iframes.

### Safety and performance

- Claims use a same-origin background GET, so collecting an item does not navigate away from the mission or interrupt dispatch selection.
- Duplicate requests are guarded by an in-flight/retry cooldown and a bounded claim cache.
- The collector uses a lightweight one-second exact-ID scan and adds no new `MutationObserver`, preserving the v1.0.22 runtime-hardening contract.

### Changed

- Mission Finder increased from `V10.6.87` to `V10.6.88`.

"""
changelog = replace_once(
    changelog,
    "## [1.0.22] - 2026-07-24",
    release + "## [1.0.22] - 2026-07-24",
    "changelog release",
)
changelog_path.write_text(changelog, encoding="utf-8", newline="\n")

readme_path = Path("README.md")
readme = readme_path.read_text(encoding="utf-8")
readme = replace_once(
    readme,
    "**Current version:** `1.0.22` · **Mission Finder engine:** `V10.6.87`",
    "**Current version:** `1.0.23` · **Mission Finder engine:** `V10.6.88`",
    "README version",
)
readme = replace_once(
    readme,
    "[**v1.0.22**](#current-v1022-behaviour)",
    "[**v1.0.23**](#current-v1023-behaviour)",
    "README navigation",
)
readme = replace_once(
    readme,
    "## Current v1.0.22 behaviour\n\n### Verified Fire training profiles",
    "## Current v1.0.23 behaviour\n\n### Seasonal mission collectibles\n\n- Visible event items using MissionChief's exact `#easter-egg-link` and `/missions/{id}/claim_found_object_sync` route are collected automatically without leaving the mission.\n- The current summer sunflower item is covered, including mission pages rendered inside same-origin lightboxes and iframes.\n- Collection adds no new DOM observer and uses bounded duplicate-request protection.\n\n### Verified Fire training profiles",
    "README current behaviour",
)
readme_path.write_text(readme, encoding="utf-8", newline="\n")

source_readme_path = Path("src/README.md")
source_readme = source_readme_path.read_text(encoding="utf-8")
source_readme = replace_once(
    source_readme,
    "| Command Nexus version | `1.0.22` |",
    "| Command Nexus version | `1.0.23` |",
    "source README version",
)
source_readme = replace_once(
    source_readme,
    "| Mission Finder baseline | `V10.6.87` |",
    "| Mission Finder baseline | `V10.6.88` |",
    "source README Mission Finder",
)
source_readme_path.write_text(source_readme, encoding="utf-8", newline="\n")
