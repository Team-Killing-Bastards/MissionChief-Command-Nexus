    // Manual requirement buttons share the existing matcher, but never enter the
    // Auto selection ledger, paging, logger or dispatch paths.
    function nexusManualSelectionBlocked() {
        if (!/^\/missions\/\d+\/?$/.test(location.pathname) || document.hidden) return 'This mission is not visible.';
        try {
            let win = window;
            while (true) {
                if (/^mcn-v3-(active-worker|pipeline-preload)-/.test(win.name || '')) return 'Background worker.';
                if (win === win.top) break;
                const frame = win.frameElement;
                if (!frame || frame.matches('[data-mcn-v3-worker],[data-mcn-v3-pipeline-preload],#mcn-v3-background-mission-worker') || frame.getAttribute('aria-hidden') === 'true') return 'Background worker.';
                const css = win.parent.getComputedStyle(frame);
                if (css.display === 'none' || css.visibility === 'hidden' || !frame.getClientRects().length) return 'This mission is not visible.';
                win = win.parent;
            }
        } catch (_) { return 'This mission is not accessible.'; }
        if (autoModeRunning || autoModeLoopActive) return 'Stop Auto Mode on this mission before selecting manually.';
        if (globalThis.__NEXUS_RULES__ && !globalThis.__NEXUS_RULES__.isReady()) return 'Vehicle rules are still loading. Try again shortly.';
        return '';
    }
    if (/^\/missions\/\d+\/?$/.test(location.pathname) && !/^mcn-v3-(active-worker|pipeline-preload)-/.test(window.name || '')) {
        window.__NEXUS_MANUAL_REQUIREMENT_SELECTION__ = Object.freeze({
            candidates(label) {
                const blocked = nexusManualSelectionBlocked();
                if (blocked) return { blocked, nodes: [] };
                // A current local snapshot, including checked boxes, makes retries
                // independent of Auto's processedSelectionKeys and cached lists.
                if (document.querySelectorAll('input.vehicle_checkbox').length > 15000) return { blocked: 'Vehicle list is too large. Use the game selection controls.', nodes: [] };
                getVehicleCheckboxSnapshot(true);
                return { nodes: getAllMatchingVehicleCheckboxes(label, resolveUnitName(label), true).filter(node => node.ownerDocument === document && node.matches('#vehicle_show_table_all input.vehicle_checkbox,#occupied input.vehicle_checkbox')) };
            },
            select(node) {
                const blocked = nexusManualSelectionBlocked();
                if (blocked) return { blocked, selected: false };
                if (!node || node.ownerDocument !== document || !node.matches('#vehicle_show_table_all input.vehicle_checkbox,#occupied input.vehicle_checkbox') || !node.isConnected || node.disabled || node.checked) return { selected: false };
                if (getVisibleStaffingShortageText() || getInlinePersonnelQualificationAlertText()) return { blocked: 'The game reports a staffing problem. Check the assigned crew before retrying.', selected: false };
                // Respect native rejection; never force a checkbox back on after
                // the game's click handler has declined the selection.
                node.click();
                return { selected: node.checked === true };
            }
        });
    }
