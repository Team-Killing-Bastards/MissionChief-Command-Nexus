#!/usr/bin/env node

// Executes the live prisoner-context and destination functions against the
// current MissionChief transport-request shape. The first listed prison is
// full/red; Auto Mode must choose the first usable green destination instead.

import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

assert.ok(source.includes('// @version      1.0.119'));
assert.ok(source.includes('MISSION FINDER V10.6.159'));

function section(startToken, endToken) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);

  assert.ok(start >= 0, `Missing production token: ${startToken}`);
  assert.ok(end > start, `Missing production boundary: ${endToken}`);

  return source.slice(start, end);
}

function createLink({ prisonId, vehicleId = '4995258', classNames, label, hidden = false, ariaDisabled = null }) {
  const href = `/vehicles/${vehicleId}/gefangener/${prisonId}?load_all_prisons=false&show_only_available=false`;
  const classes = new Set(classNames.split(/\s+/));

  return {
    hidden,
    href: `https://www.missionchief.co.uk${href}`,
    innerText: label,
    textContent: label,
    classList: {
      contains(name) {
        return classes.has(name);
      },
    },
    getAttribute(name) {
      if (name === 'href') return href;
      if (name === 'data-prison-id') return prisonId;
      if (name === 'aria-disabled') return ariaDisabled;
      return null;
    },
  };
}

const dalgetyBay = createLink({
  prisonId: '1869433',
  classNames: 'btn btn-danger',
  label: 'DALGETY BAY-PS1(Free cells: 0, Distance: 2.06 km)',
});
const staleGreenZero = createLink({
  prisonId: '1870000',
  classNames: 'btn btn-success',
  label: 'STALE-PS1(Free cells: 0, Distance: 10.00 km)',
});
const disabledGreen = createLink({
  prisonId: '1870001',
  classNames: 'btn btn-success disabled',
  label: 'DISABLED-PS1(Free cells: 2, Distance: 11.00 km)',
});
const cardenden = createLink({
  prisonId: '1870522',
  classNames: 'btn btn-success',
  label: 'CARDENDEN-PS1(Free cells: 1, Distance: 22.95 km)',
});
const laterAvailable = createLink({
  prisonId: '1870600',
  classNames: 'btn btn-success',
  label: 'LATER-PS1(Free cells: 4, Distance: 25.00 km)',
});
const destinations = [
  dalgetyBay,
  staleGreenZero,
  disabledGreen,
  cardenden,
  laterAvailable,
];

const cellAlert = {
  innerText: 'Cell Selection',
  textContent: 'Cell Selection',
};
const prisonSelect = { vehicleId: '4995258' };
const prisonerRequest = {
  querySelector(selector) {
    if (selector === '.prison-select[data-vehicle-id]') return prisonSelect;
    if (selector === '.alert.alert-info') return cellAlert;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === 'a.btn.btn-success[data-prison-id][href*="/gefangener/"]') {
      return destinations.filter((link) => link.classList.contains('btn-success'));
    }
    return [];
  },
};
const headerAlert = {
  innerText: 'Transport Request A decision on the mission place is needed.',
  textContent: 'Transport Request A decision on the mission place is needed.',
  closest() {
    return null;
  },
};
const structuredDocument = {
  location: { origin: 'https://www.missionchief.co.uk' },
  body: {},
  querySelectorAll(selector) {
    if (selector === '[data-transport-request="true"][data-transport-request-type="prisoner"]') {
      return [prisonerRequest];
    }
    if (selector === '.alert.alert-info') return [headerAlert, cellAlert];
    return [];
  },
};

const sandbox = {
  URL,
  document: structuredDocument,
  window: { location: { origin: 'https://www.missionchief.co.uk' } },
  mfGetAccessibleDocumentsForTransport: () => [structuredDocument],
  mfIsVisibleInOwnDocument: () => true,
};

vm.createContext(sandbox);
vm.runInContext(
  `${section('function getActivePrisonerCellSelectionContext()', 'function getFirstAvailablePrisonCellDestination(')}\n` +
    `${section('function getFirstAvailablePrisonCellDestination(', 'function readAutoPrisonerCellHandoffState(')}\n` +
    'this.getActivePrisonerCellSelectionContext = getActivePrisonerCellSelectionContext;\n' +
    'this.getFirstAvailablePrisonCellDestination = getFirstAvailablePrisonCellDestination;',
  sandbox
);

const structuredContext = sandbox.getActivePrisonerCellSelectionContext();
assert.equal(structuredContext?.root, prisonerRequest);
assert.equal(structuredContext?.alert, cellAlert);

const selected = sandbox.getFirstAvailablePrisonCellDestination(structuredContext);
assert.equal(selected, cardenden);
assert.equal(selected.getAttribute('data-prison-id'), '1870522');
assert.notEqual(selected, dalgetyBay);

// The legacy sentence remains supported for older/live variants of the page.
const legacyRoot = { querySelectorAll: () => [] };
const legacyAlert = {
  innerText: 'The prisoners should be placed in a cell',
  textContent: 'The prisoners should be placed in a cell',
  closest(selector) {
    return selector === '#col_left' ? legacyRoot : null;
  },
};
const legacyDocument = {
  location: { origin: 'https://www.missionchief.co.uk' },
  body: {},
  querySelectorAll(selector) {
    if (selector === '[data-transport-request="true"][data-transport-request-type="prisoner"]') return [];
    if (selector === '.alert.alert-info') return [legacyAlert];
    return [];
  },
};
sandbox.mfGetAccessibleDocumentsForTransport = () => [legacyDocument];

const legacyContext = sandbox.getActivePrisonerCellSelectionContext();
assert.equal(legacyContext?.root, legacyRoot);
assert.equal(legacyContext?.alert, legacyAlert);

console.log(
  'PASS: Auto Mode detects the current prisoner Cell Selection block, ignores red/full and unusable green destinations, and selects the first usable btn-success cell while retaining the legacy alert fallback.'
);
