#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const SOURCE_PATH = 'src/missionchief-command-nexus.user.js';
const source = await readFile(SOURCE_PATH, 'utf8');

const logicStart = source.indexOf('    function isIosSafariBrowser()');
const logicEnd = source.indexOf('    function init()', logicStart);

assert.notEqual(logicStart, -1, 'Missing isIosSafariBrowser()');
assert.notEqual(logicEnd, -1, 'Could not isolate iOS screen-detection functions');

const detectorSource = source.slice(logicStart, logicEnd);

function createNavigationElement({ active = false, current = null } = {}) {
    return {
        textContent: 'Stations',
        classList: {
            contains(name) {
                return active && name === 'active';
            }
        },
        getAttribute(name) {
            return name === 'aria-current' ? current : null;
        }
    };
}

function evaluateDetection({
    userAgent,
    platform,
    maxTouchPoints,
    pathname,
    stationRows = false,
    activeStationsNavigation = false,
    desktopStationSelector = false
}) {
    const document = {
        querySelector(selector) {
            if (selector.includes('.building_list_li')) {
                return stationRows ? { id: 'station-row' } : null;
            }
            if (selector.includes('a.lightbox-open.list-group-item.active')) {
                return desktopStationSelector ? { id: 'desktop-station-selector' } : null;
            }
            return null;
        },
        querySelectorAll(selector) {
            if (selector === 'a, button' && activeStationsNavigation) {
                return [createNavigationElement({ active: true })];
            }
            return [];
        }
    };

    const context = {
        navigator: { userAgent, platform, maxTouchPoints },
        window: { location: { pathname } },
        document,
        String,
        Number,
        Boolean,
        Array,
        RegExp
    };

    vm.createContext(context);
    vm.runInContext(`${detectorSource}\nthis.__result = {\n` +
        '    safari: isIosSafariBrowser(),\n' +
        '    iosStations: isIosStationsListScreen(),\n' +
        '    stationOverview: isStationOverviewScreen()\n' +
        '};', context);

    return context.__result;
}

const IPHONE_SAFARI =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) ' +
    'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 ' +
    'Mobile/15E148 Safari/604.1';
const IPAD_SAFARI =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) ' +
    'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 ' +
    'Mobile/15E148 Safari/604.1';
const IOS_CHROME =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) ' +
    'AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.0.0 ' +
    'Mobile/15E148 Safari/604.1';
const DESKTOP_SAFARI =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
    'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';

assert.deepEqual(
    evaluateDetection({
        userAgent: IPHONE_SAFARI,
        platform: 'iPhone',
        maxTouchPoints: 5,
        pathname: '/buildings',
        stationRows: true
    }),
    { safari: true, iosStations: true, stationOverview: true },
    'iPhone Safari Stations list must activate the mobile menu'
);

assert.deepEqual(
    evaluateDetection({
        userAgent: IPAD_SAFARI,
        platform: 'MacIntel',
        maxTouchPoints: 5,
        pathname: '/buildings/',
        activeStationsNavigation: true
    }),
    { safari: true, iosStations: true, stationOverview: true },
    'iPadOS Safari desktop-style user agent must activate on Stations'
);

assert.deepEqual(
    evaluateDetection({
        userAgent: IPHONE_SAFARI,
        platform: 'iPhone',
        maxTouchPoints: 5,
        pathname: '/missions/12345',
        stationRows: true
    }),
    { safari: true, iosStations: false, stationOverview: false },
    'The iOS surface must not load outside the Stations list route'
);

assert.deepEqual(
    evaluateDetection({
        userAgent: IOS_CHROME,
        platform: 'iPhone',
        maxTouchPoints: 5,
        pathname: '/buildings',
        stationRows: true
    }),
    { safari: false, iosStations: false, stationOverview: false },
    'Alternative iOS browsers must not enter the Safari-specific path'
);

assert.deepEqual(
    evaluateDetection({
        userAgent: DESKTOP_SAFARI,
        platform: 'MacIntel',
        maxTouchPoints: 0,
        pathname: '/buildings/123',
        desktopStationSelector: true
    }),
    { safari: false, iosStations: false, stationOverview: true },
    'Existing desktop station detection must remain unchanged'
);

const requiredContracts = [
    "panel.classList.add('mc-namer-ios-safari')",
    "panel.dataset.mcMobileSurface = 'ios-safari-stations'",
    'function makeIosPanelDraggable(panel, handle)',
    'IOS_COLLAPSED_STORAGE_KEY',
    'IOS_POSITION_STORAGE_KEY',
    'env(safe-area-inset-top, 0px)',
    '-webkit-overflow-scrolling: touch',
    'makePanelDraggable(panel, panelHeader);'
];

for (const contract of requiredContracts) {
    assert.ok(source.includes(contract), `Missing iOS menu contract: ${contract}`);
}

console.log('iOS Safari Stations menu regression checks passed.');
