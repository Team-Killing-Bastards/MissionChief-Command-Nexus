# Chrome Web Store release 3.0.43.281

This is the cumulative .281 extension promoted from local candidate commit `513040c0`, replacing the published Chrome version .235. It includes the intervening Auto/Alliance, Training, Profiles, Renamer, Personnel Register, building tools and Home Response work described in the packaged changelog.

The 179 packaged files match the candidate's verified hashes except the immutable GitHub changelog URL, which now points at the published cumulative documentation commit. The extension ID, permissions, runtime behavior, settings and native purchase safeguards are unchanged from the tested .281 candidate. The older `browser-extension` publisher is not a source for this release and has not been triggered.

Run `python check-package.py` to validate candidate/report hashes, promotion scope, manifest, packaged references and exact ZIP bytes. `node check-load.mjs` checks every JavaScript file and loads the actual extension in an isolated Edge profile, verifying its service worker, ID and popup/options pages. The candidate reports preserve 147 passing isolated feature checks; they do not establish live-game performance or store approval.

Package: `Nexus-3.0.43.281-Chrome-Web-Store.zip`. Submission state is recorded separately after observing the Chrome dashboard. Existing unlisted distribution is retained.
