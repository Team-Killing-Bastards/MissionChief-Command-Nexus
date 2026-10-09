# Nexus 3.0.43.212 Any vehicle ambulance correction

Stacked on .211; its choose-first building upgrades and all prior fixes remain.
The latest export shows one vehicle selected then dispatch rejected for Any
vehicle on Slurred Speech and Ineffective Breathing. The native warning has
no number; the old generic parser required one. The final ready check therefore
could not recognise coverage even after the known medical fallback selected.

The exact unnumbered wording now yields one vehicle. The existing exact normal
Ambulance type 5 matcher serves both selection and coverage. Native Any vehicle
demand is retained when Toolkit's live panel omits it, together with companion
numbered native requirements. Unknown unnumbered vehicle warnings fail closed.
The correction never forces readiness for absent/incorrect ambulances or
staffing errors. No permissions, sync endpoints or background scans are added.

20 isolated Edge checks reproduce .211's failure and exercise the actual
packaged parser, full requirement reader, matcher and final ready gate.
Priority, memory/ownership, vehicle claims, Alliance Auto, durable checkpoints
and update notices are tested separately. No live game dispatch or store
submission was performed. Install and verify the real next run before release.
