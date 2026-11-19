'use strict';
const status = document.querySelector('#status');
const openButton = document.querySelector('#open');
document.querySelector('#version').textContent = chrome.runtime.getManifest().version_name;
let tabId;

async function inGame(func) {
  const results = await chrome.scripting.executeScript({
    target: { tabId }, world: 'MAIN', func
  });
  return results[0]?.result;
}

async function inspect() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = new URL(tab?.url || 'about:blank');
    if (url.protocol !== 'https:' || !['www.missionchief.co.uk', 'police.missionchief.co.uk'].includes(url.hostname)) {
      status.textContent = 'Open your MissionChief UK game tab.';
      return;
    }
    tabId = tab.id;
    const state = await inGame(() => ({
      runtime: window.__NEXUS_EXTENSION__ || null,
      controller: Boolean(document.querySelector('#mcn-v3-map-controller .mcn-launcher')),
      mission: Boolean(document.querySelector('#mission-finder-wrapper')),
      resources: Boolean(window.__MC_NAMING_TOOLS_V428__)
    }));
    if (!state?.runtime) {
      status.textContent = 'Refresh this game tab to load the extension. Disable the old Nexus userscript first.';
    } else if (state.runtime.status === 'existing-runtime') {
      status.textContent = 'Another Nexus runtime was already active. Disable the old userscript, then refresh the game.';
    } else if (state.runtime.build !== chrome.runtime.getManifest().version) {
      status.textContent = 'This tab is still running the previous build. Stop Auto Mode, then refresh the game.';
    } else {
      status.textContent = state.controller || state.mission || state.resources
        ? 'Nexus is loaded. Use the original in-game controls.'
        : 'Extension loaded. Waiting for a supported game screen.';
      openButton.disabled = !state.controller;
    }
  } catch (error) {
    status.textContent = `Cannot read this tab. Refresh the game and reopen Nexus. ${error.message}`;
  }
}

openButton.addEventListener('click', async () => {
  try {
    await inGame(() => {
      const root = document.getElementById('mcn-v3-map-controller');
      if (root && root.dataset.collapsed !== 'false') root.querySelector('.mcn-launcher')?.click();
    });
    window.close();
  } catch {
    status.textContent = 'The game tab changed. Reopen Nexus from the game tab.';
  }
});
inspect();
