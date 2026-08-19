# Command Nexus README artwork

This directory contains the repository-owned visual system used by the main README.

| Asset | Purpose |
|---|---|
| `readme-hero.svg` | Flagship Command Nexus identity and command-studio scene |
| `readme-operational-chain.svg` | Resource-data to controlled-dispatch narrative |
| `readme-command-surfaces.svg` | Desktop, tablet and iPhone Safari presentation |

Each SVG is a self-contained 1600 × 700 composition with embedded raster artwork and deterministic vector typography. Keeping the image data inside the SVG prevents broken external dependencies while preserving exact titles, captions and accessible descriptions.

The scenes are conceptual product artwork created for this repository. They are not screenshots of MissionChief, an official MissionChief product, or representations of a real emergency-service control system. No third-party stock imagery, emergency-service crest or MissionChief logo is included. The flagship hero remains completely unoccupied so it cannot imply a contributor's likeness, authorship or operational role.

When replacing an asset:

1. Keep the 1600 × 700 view box and rounded outer frame.
2. Preserve an informative `title`, `desc` and README alt text.
3. Keep all visible wording deterministic; do not rely on generated lettering.
4. Keep the flagship hero free of people, silhouettes, portraits and human reflections.
5. Render the SVG locally and inspect it at full width and a narrow README width.
6. Run `python3 scripts/check_repository.py` before publication.
