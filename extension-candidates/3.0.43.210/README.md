# Nexus 3.0.43.210 upgrade response fix

Stacked on .209, preserving its editable credit budget and current
specialisation pricing, the .208 scan/review fixes and existing automation.

Live inspection reproduced a false stop at Bangor: Foam Specialization was
already under construction, while the returned station HTML also contained
two standing prerequisite warnings in its inactive Building Complex tab.
The old response handler interpreted every .alert-danger as purchase failure
before reading the actual result. Check uncertain result in the existing live
.209 tab confirmed the pre-existing purchase without issuing a new request.
No new purchases were made during this investigation.

After a successful HTTP response, the requested new level or construction is
now checked against a fresh station read first. Verified work is recorded and
the batch continues. If verification fails, general purchase warnings and
warnings relevant to the action remain usable; unrelated-tab and Building
Complex warnings are excluded. An unverified outcome still pauses with a
durable checkpoint and no automatic resend. HTTP failures remain fail closed.

33 intercepted Edge upgrade checks retain .208/.209 cases and reproduce the
hidden complex warnings on successful specialisation, level and extension
responses. They also cover a genuine failure, an unchanged station, and
action-specific warning selection. All fixture requests are intercepted.
Audit, notification, priority, memory, claims and Alliance Auto regressions
run separately. Syntax, references, hashes, permissions and release key are
validated. Changelog/popup links point to an immutable documentation commit.

Only synthetic UI images are versioned here; the live confirmation image is
kept locally. No store submission or historical publishing-file changes.
