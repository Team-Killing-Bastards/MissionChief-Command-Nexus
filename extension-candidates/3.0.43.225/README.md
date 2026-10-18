# Nexus 3.0.43.225 — OSU-first HazMat alternatives and shortage recovery

Two unsuccessful rechecks for a mission name used to prevent other missions with the same name and shortage category from receiving a fresh search for up to a week. Historical outcomes no longer veto a different mission's recovery. The existing bounded per-mission attempt is retained.

HazMat/CBRN selection now prefers OSU (39), HazMat Unit (7), then CBRN Vehicle (32), using alternatives only for the remaining demand. Exact type checks, ETA ordering within each type, exclusion of unavailable vehicles and legacy saved-rule fallback are tested. A specific CBRN request accepts OSU or CBRN. HazMat rows no longer collapse into Welfare/BASU rows, because specialist alternatives do not share all OSU capabilities; already selected OSUs can still cover both rows.

The candidate preserves the .224 police vehicle preference order, exact trained-personnel coverage, transport priority, full-list verification, completed crew-search shortcut and duplicate-dispatch checks. There is no new timer or background scan.

`check-recovery.mjs` reproduces the old family-wide suppression, verifies legacy data, per-mission limits and expiry, and checks runtime change scope against .224. `check-hazmat.mjs` covers preference, mixed fleets, coverage and separate capability demands. The supplied export records 22 skips across 32 missions, including 12 HazMat/CBRN, six armed-personnel and one Welfare shortfall. It does not retain candidate-level evidence proving the first-selection cause. The user confirmed manual successes used OSUs, so specialist fallback alone does not explain those failures. The exported run also ended with a 30-second worker load timeout; this candidate does not claim to fix that separate issue.

Local candidate only. Live resolution and sustained throughput remain unverified. No store submission.
