# Nexus feature workstreams

The browser package retains one four-part manifest version. Each feature has its own version and changelog, displayed under Nexus Tools > Overview > Feature versions. 1.0.0 is the initial baseline; it is not a reconstruction of historical release numbers.

Training is a separate module and has no Auto Mode hooks, polling, background register rebuilds or persisted personnel cache. Other existing features may still share nexus-runtime.js; separate tracking does not imply process or failure isolation.

For every change, update the affected feature version (patch for fixes, minor for compatible features, major for incompatible behaviour) and its workstream changelog. Bump shared-runtime when its executable code changes, plus the logical feature(s) affected. Metadata-only package version replacements do not change feature versions. Keep the overall release changelog and manifest version for bundled releases. Source publication and store submission remain separate steps.
