# Nexus 3.0.43.226 — background event-item collection

Repairs automatic collection of native mission event items when the main map avoids the heavy mission runtime. A lightweight document agent reports only an observed native claim URL to a top-frame coordinator. It works with hidden Auto Mode frames and standalone mission pages; the existing Event Scanner setting is retained.

Documents check at DOM ready, with one delayed check on mission pages. No recurring scan, DOM mutation observer, extra mission/fleet loading, or waiting in the dispatch path. The tab has one request at a time, a five-second deadline, at most 24 waiting scalar jobs and 250 recent scalar records. The coordinator does not retain a closed mission frame. Uncertain responses are not automatically replayed.

Settings off cancels pending work and aborts the current request. Exports include collection state, request/HTTP acknowledgement counts, failures and timeouts. HTTP acceptance is separate from verification of the in-game event score. Browser suspension can still pause background work.

`check-event-collector.mjs` uses isolated Edge contexts and intercepts all network traffic. It covers hidden frames, simultaneous duplicate documents, worker removal, slow requests without dispatch waits, feature toggles, invalid links, errors, login redirects, timeouts, late controls, back/forward restoration and bounded queues/history. `check-collector-scope.mjs` checks that the remainder of the runtime and manifest permissions are unchanged. Existing vehicle, crew, throughput and isolated browser regressions are retained.

Candidate for local testing. Live game collection and sustained throughput remain unverified. No Chrome or Edge store submission.
