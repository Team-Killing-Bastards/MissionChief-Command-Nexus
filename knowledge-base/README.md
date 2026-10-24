# Nexus Knowledge Base

Review edition, source audited against local 3.0.43.235. Read AUDIT.md first. This is not deployed or approved for publication.

## Build and preview

Use Node 22+ and Python 3.12. Install pinned Node dependencies with npm install in this directory. A dependency lockfile must be created and reviewed on the first online build; subsequent automation should use npm ci. The initial offline build used Codex's bundled marked 17.0.5 and Playwright 1.62.1 through dependency.mjs.

Install Python dependencies from requirements.txt. Then run, from this directory:

    node scripts/build.mjs
    python scripts/manuals.py
    node --test tests/*.test.mjs
    node scripts/serve.mjs

Open http://127.0.0.1:4380/guide/. The preview binds only to loopback and is not a production service. All specified /guide/article routes exist as directory index files, with or without a trailing slash.

## Sources and outputs

- content/*.md: shared website/manual chapters. JSON metadata between --- delimiters contains title, description and evidence filenames.
- site.json: revision, local source authority and publication status.
- assets/: website CSS and accessible browser behaviour.
- public/assets/: approved screenshots and Nexus icon.
- scripts/build.mjs: static HTML, search index and manual-source.json.
- scripts/manuals.py: both linked PDFs, bookmarks, contents and build hashes.
- scripts/capture-ui.mjs: optional isolated synthetic fixture capture. It does not access a real game or prove a successful dispatch.
- scripts/audit-source.mjs: exact source inventory and SHA-256 evidence.
- scripts/prepare-help-links.mjs: non-installable extension-link preview.
- ops/: conditional routing, navigation and deployment runbook.
- dist/: assembled site; ignored by Git.
- qa/: private verification outputs; ignored by Git.

## Updating

1. Resolve the current installed/Store/source version. Never infer it from the highest folder name.
2. Read and hash the changed module; update source evidence and affected chapter.
3. Capture the real current UI in a controlled account. Remove private data, highlight controls, record build/date/workflow/outcome. Do not call synthetic fixtures live screenshots.
4. Replace the screenshot-pending note with a Markdown image under /guide/assets/. Give descriptive alt text.
5. Update revision and review metadata. Rebuild site and both PDFs together.
6. Run source/route/link/PDF tests and browser QA. Render every PDF page and review for layout problems.
7. Obtain content approval and satisfy publication checks before packaging production files.
8. Deploy using ops/DEPLOYMENT.md, verify public URLs, then activate dashboard/extension Help links.

The renderer supports screenshot enlargement already. Screenshots are deliberately omitted until a usable capture exists; current captures failed rather than silently using old images.

## Scope limits

The full PDF contains all current chapters, but remains a review edition with advanced walkthroughs and live evidence outstanding. It is not represented as exhaustive. The static site is deliberately isolated from API behaviour and needs no accounts, credentials, database migrations or server-side search.
