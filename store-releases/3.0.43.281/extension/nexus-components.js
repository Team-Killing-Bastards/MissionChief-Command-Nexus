/* Independent feature versions; bundled by the extension manifest version. */
globalThis.NexusComponents=Object.freeze([
  {
    "id": "training",
    "name": "Training",
    "version": "1.3.1",
    "sourceFiles": [
      "nexus-training-core.js",
      "nexus-training.js",
      "nexus-training-storage.mjs"
    ],
    "sharedRuntime": false,
    "changelog": "workstreams/training.md"
  },
  {
    "id": "namer",
    "name": "Namer",
    "version": "1.3.4",
    "sourceFiles": [
      "nexus-naming.js",
      "nexus-naming-bridge.js",
      "nexus-naming-worker.mjs",
      "nexus-naming-places.json",
      "nexus-station-rename.js",
      "nexus-dispatch-centre-rename.js",
      "nexus-renamer-tools.js",
      "nexus-naming-runtime.js",
      "nexus-unit-naming.js"
    ],
    "sharedRuntime": true,
    "changelog": "workstreams/namer.md"
  },
  {
    "id": "automode",
    "name": "Auto Mode",
    "version": "1.0.9",
    "sourceFiles": [],
    "sharedRuntime": true,
    "changelog": "workstreams/automode.md"
  },
  {
    "id": "unit-finder",
    "name": "Unit Finder & requirements",
    "version": "1.1.0",
    "sourceFiles": [],
    "sharedRuntime": true,
    "changelog": "workstreams/unit-finder.md"
  },
  {
    "id": "transports",
    "name": "Patient & prisoner transport",
    "version": "1.0.1",
    "sourceFiles": [],
    "sharedRuntime": true,
    "changelog": "workstreams/transports.md"
  },
  {
    "id": "alliance",
    "name": "Alliance missions",
    "version": "1.0.1",
    "sourceFiles": [],
    "sharedRuntime": true,
    "changelog": "workstreams/alliance.md"
  },
  {
    "id": "personnel",
    "name": "Personnel register & crew",
    "version": "1.2.0",
    "sourceFiles": [
      "nexus-personnel-course-labels.js",
      "nexus-personnel-reader.js",
      "nexus-personnel-store.js",
      "nexus-assign-crew.js",
      "nexus-crew-register.js",
      "nexus-personnel-register-view.js",
      "nexus-naming-runtime.js"
    ],
    "sharedRuntime": true,
    "changelog": "workstreams/personnel.md"
  },
  {
    "id": "buildings",
    "name": "Buildings & upgrades",
    "version": "1.3.0",
    "sourceFiles": [
      "nexus-building-upgrades-core.js",
      "nexus-building-upgrades.js",
      "nexus-building-delete.js",
      "nexus-building-staffing-core.js",
      "nexus-building-staffing.js",
      "nexus-building-sharing-core.js",
      "nexus-building-sharing.js"
    ],
    "sharedRuntime": false,
    "changelog": "workstreams/buildings.md"
  },
  {
    "id": "profiles",
    "name": "Building & staging profiles",
    "version": "1.2.3",
    "sourceFiles": [
      "nexus-station-profiles-store.js",
      "nexus-station-profiles-core.js",
      "nexus-station-profiles-ui.js",
      "nexus-staging-profiles-editor.js",
      "nexus-station-profiles-engine.js",
      "nexus-profile-batch.js",
      "nexus-profile-batch-worker.js",
      "nexus-profile-match.js"
    ],
    "sharedRuntime": false,
    "changelog": "workstreams/profiles.md"
  },
  {
    "id": "realism",
    "name": "Realism map",
    "version": "1.4.2",
    "sourceFiles": ["nexus-real-locations.js", "nexus-real-locations-bridge.js", "nexus-town-core.js", "nexus-town-worker.mjs", "nexus-town-builder.js", "nexus-town-area-ui.js", "nexus-town-ui.js", "nexus-town-client.js", "nexus-town-regions.json"],
    "sharedRuntime": false,
    "changelog": "workstreams/realism.md"
  },
  {
    "id": "account",
    "name": "Discord & sync",
    "version": "1.1.0",
    "sourceFiles": [
      "nexus-account-bridge.js",
      "nexus-account-worker.mjs",
      "nexus-profile-sync.js"
    ],
    "sharedRuntime": false,
    "changelog": "workstreams/account.md"
  },
  {
    "id": "reporting",
    "name": "API reporting",
    "version": "1.0.0",
    "sourceFiles": [
      "collector-game.js",
      "collector-bridge.js"
    ],
    "sharedRuntime": false,
    "changelog": "workstreams/reporting.md"
  },
  {
    "id": "tools",
    "name": "Nexus Tools & settings",
    "version": "1.0.0",
    "sourceFiles": [
      "nexus-tools.js",
      "nexus-tools-core.js",
      "nexus-settings.js"
    ],
    "sharedRuntime": false,
    "changelog": "workstreams/tools.md"
  },
  {
    "id": "events",
    "name": "Event collection",
    "version": "1.0.0",
    "sourceFiles": [
      "nexus-event-collector.js"
    ],
    "sharedRuntime": false,
    "changelog": "workstreams/events.md"
  },
  {
    "id": "shared-runtime",
    "name": "Shared runtime",
    "version": "1.0.0",
    "sourceFiles": [
      "nexus-runtime.js"
    ],
    "sharedRuntime": false,
    "changelog": "workstreams/shared-runtime.md"
  }
].map(feature=>Object.freeze(feature)));
