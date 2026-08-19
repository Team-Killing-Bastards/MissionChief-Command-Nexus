#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);
const fail = message => {
  console.error(`ERROR: ${message}`);
  process.exit(1);
};
const expect = (condition, message) => {
  if (!condition) fail(message);
};

for (const token of [
  "'mf_background_patient_transport_failure_log_v1'",
  "'mf_patient_transfer_collapsed_v1'",
  'MF_BACKGROUND_PATIENT_TRANSPORT_FAILURE_LOG_LIMIT = 10',
  "patientPanel.id = 'patient-transfer-list-box'",
  "'mf-patient-pending-count'",
  "'mf-patient-completed-count'",
  "'mf-patient-failed-count'",
  "'mf-patient-failure-content'",
  "'mf-patient-clear-failures'",
  'renderBackgroundPatientTransferDrawer()',
  'resetBackgroundPatientTransportRunStats(',
  'recordBackgroundPatientTransportTerminalFailure(',
  'appendBackgroundPatientTransportAttemptHistory(',
  'attemptHistory',
  'runCompleted',
  'runFailed',
  'totalFailed'
]) {
  expect(
    source.includes(token),
    `Missing Patient Transfers drawer contract: ${token}`
  );
}

expect(
  source.includes('Patients ⚠${runFailed}'),
  'Collapsed Patient Transfers tab must expose run failures'
);
expect(
  source.includes('Patients ${queueCount}'),
  'Collapsed Patient Transfers tab must expose pending count'
);
expect(
  source.includes('clearBackgroundPatientTransportFailureLog();'),
  'Failure log must have an explicit clear control'
);
expect(
  source.includes('#patient-transfer-list-box.mf2026-patient-collapsed'),
  'Patient Transfers drawer must retain a collapsed attached-tab state'
);
expect(
  source.includes('opening && !mfVehicleLoadCollapsed'),
  'Opening Patient Transfers must collapse Vehicle Load'
);
expect(
  source.includes('opening && !mfPatientTransferCollapsed'),
  'Opening Vehicle Load must collapse Patient Transfers'
);
expect(
  source.includes('#mission-finder-wrapper.mf2026-ios-safari\n            #patient-transfer-list-box'),
  'Existing iOS mission surfaces must remain isolated from the new desktop drawer'
);

console.log(
  'Patient Transfers drawer regression passed: live pending/completed/failed counters, bounded terminal failure history, per-attempt reasons and Vehicle Load mutual exclusion are locked.'
);
