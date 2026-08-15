#!/usr/bin/env node

// Executes the post-release ownership helpers against the supplied live shape:
// an iframe result saying "The prisoners were released." and a Vue-owned
// span.lightbox-close control in the parent modal.

import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  'src/missionchief-command-nexus.user.js',
  'utf8'
);

assert.ok(source.includes('// @version      1.0.115'));
assert.ok(source.includes('MISSION FINDER V10.6.156'));

function section(startToken, endToken) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);

  assert.ok(start >= 0, `Missing production token: ${startToken}`);
  assert.ok(end > start, `Missing production boundary: ${endToken}`);

  return source.slice(start, end);
}

function createOwnedResultFixture(key, successText) {
  const state = {
    successText,
  };

  const closeSpan = {
    id: '',
    isConnected: true,
    parentElement: null,
    ownerDocument: null,
    getAttribute(name) {
      return name === 'title' ? 'Close' : null;
    },
    closest(selector) {
      return selector.includes('lightbox-close') ? this : null;
    },
  };

  const closeSvg = {
    isConnected: true,
    parentElement: closeSpan,
    ownerDocument: null,
    closest() {
      return closeSpan;
    },
  };

  const successAlert = {
    innerText: successText,
    textContent: successText,
    ownerDocument: null,
    closest() {
      return null;
    },
  };

  const overlay = {
    isConnected: true,
    ownerDocument: null,
    getAttribute(name) {
      return name === 'data-modal' ? key : null;
    },
  };

  const modal = {
    isConnected: true,
    ownerDocument: null,
    contains(node) {
      return node === closeSpan || node === closeSvg;
    },
    querySelector(selector) {
      return selector.includes('lightbox-close') ? closeSpan : null;
    },
    querySelectorAll(selector) {
      if (selector.includes('svg[data-icon="xmark"]')) return [closeSvg];
      return [];
    },
  };

  const container = {
    isConnected: true,
    ownerDocument: null,
    contains(node) {
      return modal.contains(node) || node === modal || node === overlay;
    },
    querySelector(selector) {
      return selector === '.vm--overlay[data-modal]' ? overlay : null;
    },
    querySelectorAll(selector) {
      if (selector.includes('.vm--modal')) return [modal];
      if (selector.includes('.vm--overlay')) return [overlay];
      return [];
    },
  };

  const frame = {
    ownerDocument: null,
    contentDocument: null,
    contentWindow: null,
    closest(selector) {
      return selector === '.vm--container' ? container : null;
    },
  };

  const resultDocument = {
    body: {},
    defaultView: null,
    querySelectorAll(selector) {
      if (selector === '.alert.alert-success') {
        successAlert.innerText = state.successText;
        successAlert.textContent = state.successText;
        return state.successText ? [successAlert] : [];
      }
      if (selector === 'iframe') return [];
      return [];
    },
  };

  const outerWindow = {
    document: null,
    parent: null,
    getComputedStyle() {
      return { zIndex: '1000' };
    },
  };

  const outerDocument = {
    body: {},
    defaultView: outerWindow,
    querySelectorAll(selector) {
      if (selector === 'iframe') return [frame];
      if (selector.includes('.vm--container')) return [container];
      if (selector === '.alert.alert-success') return [];
      return [];
    },
  };

  outerWindow.document = outerDocument;
  outerWindow.parent = outerWindow;
  frame.ownerDocument = outerDocument;
  frame.contentDocument = resultDocument;
  frame.contentWindow = { document: resultDocument };
  resultDocument.defaultView = {
    document: resultDocument,
    frameElement: frame,
    parent: outerWindow,
  };

  for (const element of [closeSpan, closeSvg, overlay, modal, container]) {
    element.ownerDocument = outerDocument;
  }
  successAlert.ownerDocument = resultDocument;

  return {
    state,
    closeSpan,
    successAlert,
    container,
    frame,
    resultDocument,
    outerDocument,
  };
}

const owned = createOwnedResultFixture(
  'prisoner-release-owned',
  'The prisoners were released.'
);
const foreign = createOwnedResultFixture(
  'unrelated-modal',
  'The prisoners were released.'
);

const runnerDocument = {
  body: {},
  defaultView: {
    parent: null,
    getComputedStyle() {
      return { zIndex: '0' };
    },
  },
  querySelectorAll(selector) {
    if (selector === 'iframe') return [];
    if (selector.includes('.vm--container')) return [];
    if (selector === '.alert.alert-success') return [];
    return [];
  },
};
runnerDocument.defaultView.document = runnerDocument;
runnerDocument.defaultView.parent = runnerDocument.defaultView;

const releaseFrame = {
  ownerDocument: owned.outerDocument,
  closest(selector) {
    return selector === '.vm--container' ? owned.container : null;
  },
};
const releaseDocument = {
  body: {},
  defaultView: {
    frameElement: releaseFrame,
    parent: owned.outerDocument.defaultView,
  },
  querySelectorAll(selector) {
    return selector === 'iframe' ? [] : [];
  },
};
const releaseContext = {
  document: releaseDocument,
  alert: { ownerDocument: releaseDocument, closest: () => null },
  root: { ownerDocument: releaseDocument, closest: () => null },
};

const sandbox = {
  Array,
  Number,
  Set,
  String,
  document: runnerDocument,
  window: runnerDocument.defaultView,
  mfGetAccessibleDocumentsForTransport: () => [runnerDocument],
  mfIsVisibleInOwnDocument: () => true,
};

vm.createContext(sandbox);
vm.runInContext(
  `${section(
    'function getAutoPrisonerReleaseOwnerContainer(',
    'function getVisibleAutoPrisonerReleaseDismissContexts('
  )}\n` +
    'this.captureAutoPrisonerReleaseOwnerContext = captureAutoPrisonerReleaseOwnerContext;\n' +
    'this.resolveAutoPrisonerReleaseDismissContext = resolveAutoPrisonerReleaseDismissContext;\n' +
    'this.getAutoPrisonerReleaseSuccessContext = getAutoPrisonerReleaseSuccessContext;',
  sandbox
);

// Capture the parent Vue owner while the original cell-selection document is
// still attached. The release navigation then detaches that old document.
const captured = sandbox.captureAutoPrisonerReleaseOwnerContext(
  releaseContext
);
assert.equal(captured?.container, owned.container);
releaseDocument.defaultView = null;

// Include both an unrelated modal and the real owner. Exact owner identity must
// reject the foreign success alert even though its text is identical.
owned.outerDocument.querySelectorAll = function querySelectorAll(selector) {
  if (selector === 'iframe') return [foreign.frame, owned.frame];
  if (selector.includes('.vm--container')) {
    return [foreign.container, owned.container];
  }
  if (selector === '.alert.alert-success') return [];
  return [];
};

const success = sandbox.getAutoPrisonerReleaseSuccessContext(
  releaseContext,
  captured
);
assert.equal(success?.alert, owned.successAlert);
assert.equal(success?.dismissContext?.container, owned.container);

const resolved = sandbox.resolveAutoPrisonerReleaseDismissContext(
  success.dismissContext
);
assert.equal(resolved?.closeButton, owned.closeSpan);

owned.state.successText = '';
const foreignOnly = sandbox.getAutoPrisonerReleaseSuccessContext(
  releaseContext,
  captured
);
assert.equal(foreignOnly, null);

const releaseHandler = section(
  'async function handleAutoPrisonerReleaseAfterActions()',
  'function mfIsPoliceOrPrisonerTransportActive('
);
const captureIndex = releaseHandler.indexOf(
  'captureAutoPrisonerReleaseOwnerContext(context)'
);
const releaseClickIndex = releaseHandler.indexOf(
  'realClickForQueueRestart(releaseLink)'
);
const closeCallIndex = releaseHandler.indexOf(
  'await closeAutoPrisonerReleaseDismissAfterClick('
);
assert.ok(captureIndex >= 0 && captureIndex < releaseClickIndex);
assert.ok(closeCallIndex > releaseClickIndex);
assert.ok(releaseHandler.includes('dismissContextBeforeClick'));

const closeHandler = section(
  'async function closeAutoPrisonerReleaseDismissAfterClick(',
  'function getExactAutoReleasePrisonersLink('
);
assert.ok(closeHandler.includes('getAutoPrisonerReleaseSuccessContext('));
assert.ok(closeHandler.includes('if (!successContext) return \'stuck\';'));
assert.ok(closeHandler.includes('current.closeButton'));
assert.ok(closeHandler.includes('isAutoPrisonerReleaseDismissContextVisible('));

console.log(
  'PASS: Auto Mode captures the prisoner modal before release navigation, waits for the exact released-prisoners success alert, rejects unrelated modals, reacquires the live parent lightbox-close span and verifies closure before restart.'
);
