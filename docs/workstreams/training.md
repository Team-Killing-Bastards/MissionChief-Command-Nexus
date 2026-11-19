# Training

## 1.3.1 — 13 November 2026

Unticked Use already trained now means no completed qualifications, rather than preferring fewer qualifications and filling remaining places with trained people. Automatic selection, manual choices and final enrolment eligibility all use this rule. The complete roster is required to prove no training, in addition to the course-specific admission attributes. This excludes qualifications omitted from an academy's list without adding network reads.

The opt-in starting-qualification mode is unchanged. Top up counts already-qualified personnel and confirmed trainees as before, while choosing any additional people from the untrained pool by default. The review reports shortfalls instead of selecting trained people as a fallback. In-progress training, availability, vehicle status and durable enrolment verification remain enforced.

The .268 package retains .267 Auto Mode recovery and .266 station filters. 32 new default-selection checks, 67 existing Training checks and 49 filter checks passed with simulated responses; no live training was started.

## 1.3.0 — 11 November 2026

Adds Station type alongside Dispatch centre, before loading course choices. Service groups cover medical, fire, police and coastal/rescue stations; individual type names use the shared UK building catalogue. Unknown types retain a readable fallback and are not guessed from captions. All medical stations includes types 2, 4, 5, 20, 21, 22, 25 and 32. Only staffed stations admitted by the chosen native course appear.

The station list, Select all matching and count queue intersect type, dispatch centre, native course admission and search. Type or centre changes clear selected stations/manual people, invalidate review, reset pagination and cancel the previous count queue. Existing compact count caches and two-request concurrency remain. Academy discovery and final allocation are independent of the station-type filter, preserving all suitable owned academies outside the selected centre.

The .266 bundle passes the existing 67 Training checks and 49 filter checks with simulated responses, including precise enrolment IDs, old-plan rejection, count cancellation, unreadable/unknown types and desktop/mobile layouts. No live course was started. Other feature workstreams are unchanged.

## 1.2.0 — 31 October 2026

A Trained column beside Personnel shows completed qualifications for the selected course, including busy qualified staff. Choosing a course reads matching station rosters with two concurrent requests; compact qualification counts can then serve other course choices without another scan. Refresh trained counts checks again. Unknown/loading/failed reads never show a false zero. Full station scans and enrolment verification also update these totals. Counts are snapshots; they do not replace fresh eligibility checks.

Expand a station name to view staff, qualifications and availability. Automatic selections can be changed with checkboxes, up to that station's current requested amount. Empty manual choices stay empty; manual IDs do not silently fall back to automatic staff. Use automatic selection restores the default. Course, amount, dispatch-centre or starting-qualification changes clear manual choices. Only one detailed station list is retained at once, and closing Training cancels count scans and releases the lists. Plans and submissions recheck the exact selected people.

Fix: .242 directly accessed chrome.storage.local from a content script, while the extension sets that storage to TRUSTED_CONTEXTS. That causes Access to storage is not allowed from this context at Start. A narrow background handler now reads and saves only bounded training checkpoints for the sender's permitted game origin and player. The original key and pending-course record are retained. General storage protection, mutation locking, verification and no-replay behaviour remain.

Validation reproduces the .242 storage denial in an isolated browser, exercises the actual new message handler, checks exact manually selected enrolment IDs, failures and the updated layout. Real game enrolment remains separate from these tests.

## 1.1.0 — 31 October 2026

The workflow is dispatch centre, course, stations, then people per station. **Top up** reaches a target qualified total, subtracting already-qualified staff (including busy crews) and people positively identified on the same course. **Add** selects the requested number of additional eligible people at each station. Unknown ongoing courses hold top-up for the affected station. The existing strict starting-qualification option and current native personnel/vehicle availability checks remain.

The review scans all owned academies of the relevant service types, including academies outside the selected dispatch centre. It allocates selected people across their free classrooms while respecting each academy's station admissions, uses the smallest supported number of rooms for each course, and shows personnel/capacity shortfalls before starting. Single-free-classroom native forms are supported without inventing an omitted room field.

Each course gets fresh availability checks and a durable player-scoped checkpoint before one native submission. The run verifies every selected person's qualification or identified ongoing course before starting the next academy. Lost responses can be reconciled by reads; uncertain results survive reopening, block another submission and expose a read-only Check previous result action. Stop finishes checking a submitted course before stopping. No automatic enrolment replay, recurring scan or Auto Mode change.

Toolkit's supplied workflow documentation was used as reference only. Implementation is independent Nexus code. Live native forms were inspected read-only; browser fixtures exercise allocation, submissions, verification, interruptions and layout. Real course enrolment remains untested in the live game.

## 1.0.0 — 31 October 2026

New on-demand Training screen: dispatch centres, individual/all matching stations, native academy courses, people per station, optional existing-qualification filter, current personnel and vehicle availability, review and one native enrolment submission after rechecking. No automatic course retries.

Source: `nexus-training-core.js`, `nexus-training.js`
