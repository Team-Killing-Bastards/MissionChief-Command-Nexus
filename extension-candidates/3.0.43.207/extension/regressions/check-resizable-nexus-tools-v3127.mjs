import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const tools = fs.readFileSync(path.join(root, 'nexus-tools.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'nexus-runtime.js'), 'utf8');

assert.equal(manifest.version, '3.0.43.189', 'manifest must expose the resizable Nexus Tools build');
assert.ok(runtime.includes("const MISSION_FINDER_VERSION = '10.6.191';"), 'Mission Finder must remain unchanged by the Tools-only resize release');
assert.ok(tools.includes("const TOOL_PANEL_SIZE_KEY = 'nexusToolsPanelSizeV1';"), 'desktop Tools size must have a dedicated persisted storage key');
assert.ok(tools.includes('TOOL_PANEL_MIN_WIDTH = 520'), 'Tools must retain a bounded minimum width');
assert.ok(tools.includes('TOOL_PANEL_MIN_HEIGHT = 360'), 'Tools must retain a bounded minimum height');
assert.ok(tools.includes('max-width:calc(100vw - 32px)'), 'Tools width must stay bounded to the viewport');
assert.ok(tools.includes('max-height:calc(100vh - 70px)'), 'Tools height must stay bounded to the viewport');
assert.ok(tools.includes('id="resizeHandle"'), 'Tools must render a visible desktop resize grip');
assert.ok(tools.includes("resizeHandle.addEventListener('pointerdown'"), 'resize grip must start pointer-driven resizing');
assert.ok(tools.includes("resizeHandle.addEventListener('pointermove'"), 'resize grip must update width/height while dragging');
assert.ok(tools.includes("localStorage.setItem(TOOL_PANEL_SIZE_KEY"), 'chosen size must persist');
assert.ok(tools.includes("resizeHandle.addEventListener('dblclick'"), 'double-click must reset to default size');
assert.ok(tools.includes(':host([data-compact]) #resizeHandle,:host([data-touch]) #resizeHandle{display:none}'), 'compact/touch layouts must keep existing responsive geometry');
assert.ok(tools.includes("width: toolsResize.width - (event.clientX - toolsResize.startX)"), 'lower-left grip must widen when dragged left on the right-anchored panel');
assert.ok(tools.includes("height: toolsResize.height + (event.clientY - toolsResize.startY)"), 'lower-left grip must resize height naturally');

console.log('PASS: 3.0.43.151 makes Nexus Tools desktop-resizable with persisted viewport-bounded sizing while leaving Mission Finder unchanged.');
