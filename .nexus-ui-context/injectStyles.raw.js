    function injectStyles() {
        if (document.getElementById('mission-finder-2026-styles')) return;

        const style = document.createElement('style');
        style.id = 'mission-finder-2026-styles';
        style.textContent = `
            #mission-finder-wrapper {
                position: fixed;
                z-index: 999999;
                display: flex;
                gap: 8px;
                align-items: flex-start;
                font-family: Arial, Helvetica, sans-serif;
            }

            .mf2026-panel {
                width: 270px;
                min-height: 0;
                padding: 8px;
                background: rgba(0, 0, 0, 0.88);
                color: white;
                font-size: 13px;
                border: 2px solid white;
                border-radius: 8px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                gap: 7px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.35);
            }

            .mf2026-header {
                font-size: 15px;
                font-weight: bold;
                text-align: center;
                background: #555;
                padding: 6px;
                border-radius: 4px;
            }

            .mf2026-drag {
                cursor: move;
            }

            .mf2026-box {
                background: #444;
                padding: 7px;
                border-radius: 5px;
            }

            #status-box {
                min-height: 44px;
                line-height: 1.35;
                overflow-wrap: break-word;
            }

            .mf2026-button {
                padding: 7px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
            }

            .mf2026-section-title {
                font-size: 13px;
                font-weight: bold;
                margin-bottom: 5px;
                color: #ddd;
            }

            .mf2026-row {
                display: flex;
                justify-content: space-between;
                gap: 8px;
                padding: 4px 0;
                border-bottom: 1px solid rgba(255,255,255,0.08);
            }

            .mf2026-row:last-child {
                border-bottom: none;
            }

            .mf2026-name {
                flex: 1;
            }

            .mf2026-count {
                white-space: nowrap;
                font-weight: bold;
            }

            .mf2026-good {
                color: #42ff75;
            }

            .mf2026-bad {
                color: #ff6666;
            }

            .mf2026-warn {
                color: #ffd166;
            }

            .mf2026-small {
                font-size: 12px;
                color: #ccc;
            }

            .mf2026-progress-wrap {
                background: #222;
                border-radius: 6px;
                overflow: hidden;
                height: 10px;
            }

            .mf2026-progress-bar {
                height: 10px;
                width: 0%;
                background: #42ff75;
                transition: width 0.25s ease;
            }

            #vehicle-load-list-content {
                max-height: 210px;
                overflow-y: auto;
                padding-right: 4px;
            }


            #trained-personnel-content {
                max-height: 280px;
                overflow-y: auto;
                padding-right: 4px;
            }

            .mf2026-training-vehicle {
                padding: 7px 0;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .mf2026-training-vehicle:last-child {
                border-bottom: none;
            }

            .mf2026-training-vehicle-name {
                margin-bottom: 5px;
                color: #fff;
                font-weight: bold;
            }

            .mf2026-training-person {
                display: grid;
                grid-template-columns: auto minmax(0, 1fr);
                gap: 8px;
                align-items: start;
                padding: 3px 0;
            }

            .mf2026-training-person-label {
                color: #42ff75;
                font-weight: bold;
                white-space: nowrap;
            }

            .mf2026-training-course-list {
                color: #ddd;
                text-align: right;
                overflow-wrap: anywhere;
            }

            #mf-mission-ready-delay-input {
                width: 100%;
                color: black;
                padding: 4px;
                border-radius: 4px;
                border: none;
                box-sizing: border-box;
            }

            .mf2026-checkbox-row {
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                user-select: none;
            }

            .mf2026-checkbox-row input {
                width: 17px;
                height: 17px;
                margin: 0;
                flex: 0 0 auto;
            }

            #session-panel-content {
                max-height: 180px;
                overflow-y: auto;
                padding-right: 4px;
            }

            .mf2026-stat-grid {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 4px 8px;
                font-size: 12px;
                color: #ccc;
            }

            .mf2026-stat-grid strong {
                color: white;
            }

            .mf2026-log-row {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 8px;
                padding: 4px 0;
                border-bottom: 1px solid rgba(255,255,255,0.08);
                font-size: 12px;
            }

            .mf2026-log-row:last-child {
                border-bottom: none;
            }

            .mf2026-log-main {
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .mf2026-log-value {
                white-space: nowrap;
                font-weight: bold;
            }


            #control-panel {
                width: 260px;
            }

            #vehicle-load-list-box {
                width: 300px;
            }


            #trained-personnel-box {
                width: 300px;
            }

            #control-panel.mf2026-control-collapsed {
                width: 44px;
                min-height: 0;
                padding: 6px;
                overflow: hidden;
            }

            #control-panel.mf2026-control-collapsed .mf-control-body {
                display: none;
            }

            #control-panel.mf2026-control-collapsed .mf2026-header {
                writing-mode: vertical-rl;
                text-orientation: mixed;
                min-height: 120px;
                padding: 8px 4px;
                cursor: pointer;
            }

            .mf2026-control-header-row {
                display: flex;
                gap: 6px;
                align-items: center;
            }

            .mf2026-control-header-row .mf2026-header {
                flex: 1;
            }

            #mf-control-centre,
            #mf-control-minimize {
                width: 34px;
                padding: 6px 0;
                background: #6c757d;
                color: white;
                flex: 0 0 34px;
            }

            #mf-control-centre {
                background: #0d6efd;
            }


            #vehicle-load-list-box.mf2026-load-collapsed {
                width: 44px;
                min-height: 0;
                padding: 6px;
                overflow: hidden;
            }

            #vehicle-load-list-box.mf2026-load-collapsed .mf-load-body {
                display: none;
            }

            #vehicle-load-list-box.mf2026-load-collapsed .mf2026-header {
                writing-mode: vertical-rl;
                text-orientation: mixed;
                min-height: 130px;
                padding: 8px 4px;
                cursor: pointer;
            }

            .mf2026-load-header-row {
                display: flex;
                gap: 6px;
                align-items: center;
            }

            .mf2026-load-header-row .mf2026-header {
                flex: 1;
            }

            #mf-load-minimize {
                width: 34px;
                padding: 6px 0;
                background: #6c757d;
                color: white;
            }


            #trained-personnel-box.mf2026-trained-collapsed {
                width: 44px;
                min-height: 0;
                padding: 6px;
                overflow: hidden;
            }

            #trained-personnel-box.mf2026-trained-collapsed .mf-trained-body {
                display: none;
            }

            #trained-personnel-box.mf2026-trained-collapsed .mf2026-header {
                writing-mode: vertical-rl;
                text-orientation: mixed;
                min-height: 145px;
                padding: 8px 4px;
                cursor: pointer;
            }

            .mf2026-trained-header-row {
                display: flex;
                gap: 6px;
                align-items: center;
            }

            .mf2026-trained-header-row .mf2026-header {
                flex: 1;
            }

            #mf-trained-minimize {
                width: 34px;
                padding: 6px 0;
                background: #6c757d;
                color: white;
            }

            .mf2026-button-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
            }

            .mf2026-primary-actions {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 6px;
            }

            .mf2026-primary-actions #dispatch-share-box,
            .mf2026-primary-actions #auto-mode-box {
                grid-column: 1 / -1;
            }

            .mf-control-advanced {
                display: flex;
                flex-direction: column;
                gap: 7px;
            }

            #mf-iphone-advanced-toggle {
                display: none;
            }

            #mission-finder-wrapper.mf2026-ios-safari {
                top: calc(8px + env(safe-area-inset-top, 0px));
                right: calc(8px + env(safe-area-inset-right, 0px));
                left: calc(8px + env(safe-area-inset-left, 0px));
                width: auto;
                max-width: none;
                max-height: calc(
                    100vh
                    - 16px
                    - env(safe-area-inset-top, 0px)
                    - env(safe-area-inset-bottom, 0px)
                );
                display: flex;
                flex-direction: column;
                align-items: stretch;
                gap: 6px;
                overflow-x: hidden;
                overflow-y: auto;
                overscroll-behavior: contain;
                -webkit-overflow-scrolling: touch;
                -webkit-transform: translateZ(0);
                box-sizing: border-box;
            }

            @supports (height: 100dvh) {
                #mission-finder-wrapper.mf2026-ios-safari {
                    max-height: calc(
                        100dvh
                        - 16px
                        - env(safe-area-inset-top, 0px)
                        - env(safe-area-inset-bottom, 0px)
                    );
                }
            }

            #mission-finder-wrapper.mf2026-ios-safari .mf2026-panel,
            #mission-finder-wrapper.mf2026-ios-safari #control-panel,
            #mission-finder-wrapper.mf2026-ios-safari #vehicle-load-list-box,
            #mission-finder-wrapper.mf2026-ios-safari #trained-personnel-box {
                width: 100%;
                max-width: none;
                flex: 0 0 auto;
            }

            #mission-finder-wrapper.mf2026-ios-safari .mf2026-header {
                min-height: 42px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-sizing: border-box;
            }

            #mission-finder-wrapper.mf2026-ios-safari .mf2026-drag {
                cursor: grab;
                touch-action: none;
                -webkit-user-select: none;
                user-select: none;
            }

            #mission-finder-wrapper.mf2026-ios-safari .mf2026-drag:active {
                cursor: grabbing;
            }

            #mission-finder-wrapper.mf2026-ios-safari .mf-control-body,
            #mission-finder-wrapper.mf2026-ios-safari .mf-load-body,
            #mission-finder-wrapper.mf2026-ios-safari .mf-trained-body,
            #mission-finder-wrapper.mf2026-ios-safari #vehicle-load-list-content,
            #mission-finder-wrapper.mf2026-ios-safari #trained-personnel-content,
            #mission-finder-wrapper.mf2026-ios-safari #session-panel-content {
                -webkit-overflow-scrolling: touch;
            }

            #mission-finder-wrapper.mf2026-ios-safari .mf2026-button {
                min-height: 42px;
                font-size: 14px;
                touch-action: manipulation;
            }

            #mission-finder-wrapper.mf2026-ios-safari input,
            #mission-finder-wrapper.mf2026-ios-safari select {
                min-height: 38px;
                font-size: 16px;
            }

            #mission-finder-wrapper.mf2026-ios-safari #mf-control-position-box,
            #mission-finder-wrapper.mf2026-ios-safari #mf-control-centre {
                display: none;
            }

            #mission-finder-wrapper.mf2026-ios-safari #mf-control-minimize {
                width: 44px;
                flex: 0 0 44px;
                padding: 6px 0;
                font-size: 20px;
                line-height: 1;
            }

            #mission-finder-wrapper.mf2026-ios-safari
            #control-panel.mf2026-control-collapsed {
                width: 100%;
                min-height: 0;
                padding: 6px;
                overflow: hidden;
            }

            #mission-finder-wrapper.mf2026-ios-safari
            #control-panel.mf2026-control-collapsed
            .mf2026-control-header-row {
                width: 100%;
            }

            #mission-finder-wrapper.mf2026-ios-safari
            #control-panel.mf2026-control-collapsed
            .mf2026-header {
                writing-mode: horizontal-tb;
                text-orientation: mixed;
                min-height: 42px;
                padding: 8px 10px;
                justify-content: flex-start;
                text-align: left;
            }

            #mission-finder-wrapper.mf2026-ios-safari
            #vehicle-load-list-box.mf2026-load-collapsed {
                width: 100%;
                min-height: 0;
                padding: 6px;
                overflow: hidden;
            }

            #mission-finder-wrapper.mf2026-ios-safari
            #vehicle-load-list-box.mf2026-load-collapsed
            .mf2026-header {
                writing-mode: horizontal-tb;
                text-orientation: mixed;
                min-height: 42px;
                padding: 8px 10px;
                justify-content: flex-start;
                text-align: left;
            }

            #mission-finder-wrapper.mf2026-ios-safari
            #trained-personnel-box.mf2026-trained-collapsed {
                width: 100%;
                min-height: 0;
                padding: 6px;
                overflow: hidden;
            }

            #mission-finder-wrapper.mf2026-ios-safari
            #trained-personnel-box.mf2026-trained-collapsed
            .mf2026-header {
                writing-mode: horizontal-tb;
                text-orientation: mixed;
                min-height: 42px;
                padding: 8px 10px;
                justify-content: flex-start;
                text-align: left;
            }

            /* iPhone Safari only. iPad remains on the established iOS layout. */
            #mission-finder-wrapper.mf2026-iphone-safari {
                --mf-iphone-close-gutter: 48px;
                --mf-iphone-launcher-top: 0px;
                --mf-iphone-launcher-right: 112px;
                --mf-iphone-launcher-max-width: calc(100% - 120px);
                --mf-iphone-panel-top: 42px;
                top: calc(4px + env(safe-area-inset-top, 0px));
                right: calc(4px + env(safe-area-inset-right, 0px));
                left: calc(4px + env(safe-area-inset-left, 0px));
                display: block;
                gap: 0;
                pointer-events: none;
                max-height: calc(
                    100vh
                    - 8px
                    - env(safe-area-inset-top, 0px)
                    - env(safe-area-inset-bottom, 0px)
                );
                overflow: visible;
                scrollbar-width: none;
            }

            #mission-finder-wrapper.mf2026-iphone-safari::-webkit-scrollbar,
            #mission-finder-wrapper.mf2026-iphone-safari *::-webkit-scrollbar {
                display: none;
            }

            @supports (height: 100dvh) {
                #mission-finder-wrapper.mf2026-iphone-safari {
                    max-height: calc(
                        100dvh
                        - 8px
                        - env(safe-area-inset-top, 0px)
                        - env(safe-area-inset-bottom, 0px)
                    );
                }
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            #mf-iphone-panel-launcher {
                position: absolute;
                top: var(--mf-iphone-launcher-top, 0px);
                right: var(--mf-iphone-launcher-right, 52px);
                z-index: 4;
                display: flex;
                align-items: center;
                justify-content: flex-end;
                gap: 4px;
                max-width: var(
                    --mf-iphone-launcher-max-width,
                    calc(100% - 60px)
                );
                pointer-events: auto;
                padding: 3px;
                border: 1px solid rgba(255, 255, 255, 0.22);
                border-radius: 11px;
                background: rgba(28, 28, 30, 0.96);
                box-shadow: 0 5px 16px rgba(0, 0, 0, 0.32);
                -webkit-backdrop-filter: blur(16px) saturate(135%);
                backdrop-filter: blur(16px) saturate(135%);
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            .mf-iphone-launcher-button {
                min-width: 66px;
                min-height: 34px;
                padding: 6px 10px;
                border: 0;
                border-radius: 8px;
                background: rgba(118, 118, 128, 0.28);
                color: #f2f2f7;
                font-size: 12px;
                font-weight: 750;
                line-height: 1;
                white-space: nowrap;
                touch-action: manipulation;
                -webkit-tap-highlight-color: transparent;
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            .mf-iphone-launcher-button.mf2026-active,
            #mission-finder-wrapper.mf2026-iphone-safari
            .mf-iphone-launcher-button[aria-pressed="true"] {
                background: #0a84ff;
                color: #fff;
                box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22);
            }

            #mission-finder-wrapper.mf2026-iphone-safari > .mf2026-panel {
                position: absolute;
                top: var(--mf-iphone-panel-top, 42px);
                right: 0;
                left: 0;
                width: 100%;
                max-width: 100%;
                max-height: calc(
                    100vh
                    - var(--mf-iphone-panel-top, 42px)
                    - 8px
                    - env(safe-area-inset-bottom, 0px)
                );
                pointer-events: auto;
                overflow-y: auto;
                overscroll-behavior: contain;
                -webkit-overflow-scrolling: touch;
            }

            @supports (height: 100dvh) {
                #mission-finder-wrapper.mf2026-iphone-safari > .mf2026-panel {
                    max-height: calc(
                        100dvh
                        - var(--mf-iphone-panel-top, 42px)
                        - 8px
                        - env(safe-area-inset-bottom, 0px)
                    );
                }
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            #trained-personnel-box {
                display: none !important;
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            #control-panel.mf2026-control-collapsed,
            #mission-finder-wrapper.mf2026-iphone-safari
            #vehicle-load-list-box.mf2026-load-collapsed {
                display: none !important;
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            .mf2026-control-header-row,
            #mission-finder-wrapper.mf2026-iphone-safari
            .mf2026-load-header-row {
                display: none !important;
            }

            #mission-finder-wrapper.mf2026-iphone-safari .mf2026-panel {
                padding: 5px;
                gap: 4px;
                border: 1px solid rgba(255, 255, 255, 0.24);
                border-radius: 14px;
                background: rgba(28, 28, 30, 0.96);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.36);
                -webkit-backdrop-filter: blur(16px) saturate(135%);
                backdrop-filter: blur(16px) saturate(135%);
            }

            #mission-finder-wrapper.mf2026-iphone-safari .mf-control-body {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }

            #mission-finder-wrapper.mf2026-iphone-safari #status-box {
                min-height: 0;
                max-height: 54px;
                overflow-y: auto;
                padding: 7px 9px;
                border-radius: 10px;
                font-size: 12px;
                line-height: 1.25;
                background: rgba(118, 118, 128, 0.20);
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            #mf-iphone-advanced-toggle {
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
                min-height: 34px;
                padding: 6px 10px;
                border: 0;
                border-radius: 10px;
                background: rgba(118, 118, 128, 0.24);
                color: #f2f2f7;
                font-size: 12px;
                font-weight: 700;
                touch-action: manipulation;
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            .mf-control-advanced {
                display: none;
                gap: 5px;
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            .mf-control-advanced.mf2026-expanded {
                display: flex;
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            .mf-control-advanced .mf2026-box {
                padding: 7px;
                border-radius: 10px;
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            .mf2026-section-title {
                margin-bottom: 3px;
                font-size: 12px;
            }

            #mission-finder-wrapper.mf2026-iphone-safari .mf2026-small {
                font-size: 11px;
                line-height: 1.25;
            }

            #mission-finder-wrapper.mf2026-iphone-safari input,
            #mission-finder-wrapper.mf2026-iphone-safari select {
                min-height: 34px;
                font-size: 16px;
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            .mf2026-primary-actions {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 5px;
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            .mf2026-primary-actions #dispatch-share-box,
            #mission-finder-wrapper.mf2026-iphone-safari
            .mf2026-primary-actions #auto-mode-box {
                grid-column: auto;
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            .mf2026-primary-actions .mf2026-button {
                min-width: 0;
                min-height: 38px;
                padding: 6px 7px;
                border-radius: 10px;
                font-size: 12.5px;
                line-height: 1.15;
                white-space: normal;
                touch-action: manipulation;
            }

            #mission-finder-wrapper.mf2026-iphone-safari .mf-load-body {
                display: flex;
                flex-direction: column;
                gap: 4px;
                max-height: 42vh;
                overflow-y: auto;
                overscroll-behavior: contain;
                -webkit-overflow-scrolling: touch;
            }

            @supports (height: 100dvh) {
                #mission-finder-wrapper.mf2026-iphone-safari .mf-load-body {
                    max-height: 42dvh;
                }
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            .mf-load-body .mf2026-box {
                padding: 6px;
                border-radius: 10px;
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            #vehicle-load-list-content {
                max-height: 22vh;
                padding-right: 0;
            }

            #mission-finder-wrapper.mf2026-iphone-safari
            #session-panel-content {
                max-height: 12vh;
                padding-right: 0;
            }


            /* MissionChief Nexus integrated mission dashboard (V10.6.132). */
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) {
                display: grid;
                grid-template-columns: 66px repeat(3, minmax(235px, 1fr));
                grid-template-areas:
                    "rail control load trained"
                    "footer footer footer footer";
                align-items: stretch;
                gap: 10px;
                width: min(1360px, calc(100vw - 32px));
                max-width: calc(100vw - 32px);
                max-height: calc(100vh - 32px);
                padding: 10px;
                overflow: auto;
                box-sizing: border-box;
                border: 1px solid rgba(82, 155, 255, 0.24);
                border-radius: 14px;
                background:
                    radial-gradient(circle at 8% 0%, rgba(20, 92, 170, 0.18), transparent 34%),
                    linear-gradient(145deg, rgba(5, 16, 29, 0.98), rgba(4, 21, 38, 0.98));
                box-shadow: 0 18px 55px rgba(0, 0, 0, 0.55);
                color: #eaf2ff;
            }

            #mission-finder-wrapper.mf-nexus-dashboard.mf-dashboard-utility-open:not(.mf2026-ios-safari) {
                grid-template-columns: 66px minmax(250px, 285px) repeat(3, minmax(225px, 1fr));
                grid-template-areas:
                    "rail utility control load trained"
                    "footer footer footer footer footer";
                width: min(1580px, calc(100vw - 32px));
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) .mf2026-panel {
                width: auto;
                min-width: 0;
                max-height: calc(100vh - 96px);
                padding: 0;
                gap: 0;
                overflow: hidden;
                border: 1px solid rgba(126, 167, 218, 0.18);
                border-radius: 12px;
                background: linear-gradient(155deg, rgba(18, 32, 48, 0.97), rgba(7, 23, 39, 0.97));
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035), 0 10px 30px rgba(0, 0, 0, 0.24);
                font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) #control-panel { grid-area: control; }
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) #vehicle-load-list-box { grid-area: load; }
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) #trained-personnel-box { grid-area: trained; }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) .mf2026-control-header-row,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) .mf2026-load-header-row,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) .mf2026-trained-header-row {
                min-height: 48px;
                padding: 8px 10px;
                border-bottom: 1px solid rgba(126, 167, 218, 0.14);
                background: rgba(9, 23, 38, 0.72);
                box-sizing: border-box;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) .mf2026-header {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 0;
                text-align: left;
                text-transform: uppercase;
                letter-spacing: 0.035em;
                background: transparent;
                color: #f4f8ff;
                font-size: 13px;
                font-weight: 800;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) #mf-control-title::before {
                content: "◎";
                display: grid;
                place-items: center;
                width: 28px;
                height: 28px;
                border-radius: 8px;
                background: linear-gradient(145deg, #0d6efd, #063f91);
                color: white;
                box-shadow: 0 0 16px rgba(13, 110, 253, 0.36);
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) #mf-load-title::before {
                content: "▣";
                color: #49a4ff;
                font-size: 21px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) #mf-trained-title::before {
                content: "♙";
                color: #c86cff;
                font-size: 22px;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) .mf-control-body,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) .mf-load-body,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) .mf-trained-body {
                display: flex;
                flex-direction: column;
                gap: 9px;
                padding: 10px;
                overflow-y: auto;
                min-height: 0;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) .mf2026-box {
                padding: 10px;
                border: 1px solid rgba(126, 167, 218, 0.13);
                border-radius: 9px;
                background: rgba(255, 255, 255, 0.025);
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) #status-box {
                min-height: 52px;
                background: rgba(6, 20, 34, 0.72);
                color: #dce8f7;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) .mf2026-section-title {
                color: #eff6ff;
                font-size: 12px;
                letter-spacing: 0.01em;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) .mf2026-small {
                color: #aebdd0;
                line-height: 1.4;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) .mf2026-primary-actions {
                gap: 8px;
                margin-top: auto;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) .mf2026-primary-actions .mf2026-button,
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) #mf-export-unit-finder-diagnostics {
                min-height: 42px;
                border: 1px solid rgba(255, 255, 255, 0.11);
                border-radius: 8px;
                color: #fff !important;
                box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.10), 0 5px 14px rgba(0, 0, 0, 0.22);
                transition: transform 120ms ease, filter 120ms ease, box-shadow 120ms ease;
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) .mf2026-button:hover {
                filter: brightness(1.1);
                transform: translateY(-1px);
            }

            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) #unit-finder-box {
                background: linear-gradient(145deg, #f2a900, #b96d00) !important;
            }
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) #mf-ally-steal {
                background: linear-gradient(145deg, #d42b86, #861653) !important;
            }
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) #mission-update-box {
                background: linear-gradient(145deg, #1268da, #08418e) !important;
            }
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) #dispatch-box {
                background: linear-gradient(145deg, #526273, #303b47) !important;
            }
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) #dispatch-share-box {
                background: linear-gradient(145deg, #13864e, #07582f) !important;
            }
            #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari) #auto-mode-box {
                background: linear-gradient(145deg, #743bc0, #452178) !important;
            }

            #mf-dashboard-rail {
                grid-area: rail;
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 6px;
                border: 1px solid rgba(126, 167, 218, 0.16);
                border-radius: 11px;
                background: rgba(6, 19, 33, 0.88);
            }

            .mf-dashboard-tab {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 4px;
                min-height: 72px;
                padding: 7px 4px;
                border: 1px solid transparent;
                border-radius: 9px;
                background: transparent;
                color: #9fb1c8;
                font-size: 10px;
                font-weight: 700;
                cursor: pointer;
            }

            .mf-dashboard-tab:hover,
            .mf-dashboard-tab.mf-dashboard-tab-active {
                border-color: rgba(34, 137, 255, 0.58);
                background: linear-gradient(145deg, rgba(21, 104, 204, 0.58), rgba(7, 48, 96, 0.66));
                color: #fff;
                box-shadow: 0 0 18px rgba(13, 110, 253, 0.20);
            }

            .mf-dashboard-tab-icon {
                font-size: 22px;
                line-height: 1;
                color: #55a9ff;
            }

            #mf-dashboard-utility {
                grid-area: utility;
                min-width: 0;
                max-height: calc(100vh - 96px);
                overflow: hidden;
                border: 1px solid rgba(126, 167, 218, 0.18);
                border-radius: 12px;
                background: linear-gradient(155deg, rgba(18, 32, 48, 0.97), rgba(7, 23, 39, 0.97));
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.24);
            }

            #mf-dashboard-utility[hidden],
            .mf-dashboard-utility-pane[hidden] {
                display: none !important;
            }

            .mf-dashboard-utility-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-height: 48px;
                padding: 8px 11px;
                border-bottom: 1px solid rgba(126, 167, 218, 0.14);
                color: #f4f8ff;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                font-size: 13px;
                font-weight: 800;
                box-sizing: border-box;
            }

            #mf-dashboard-utility-close {
                width: 30px;
                height: 30px;
                border: 0;
                border-radius: 7px;
                background: rgba(255, 255, 255, 0.08);
                color: #dce8f7;
                cursor: pointer;
            }

            .mf-dashboard-utility-pane {
                display: flex;
                flex-direction: column;
                gap: 9px;
                padding: 10px;
                overflow-y: auto;
                max-height: calc(100vh - 154px);
                box-sizing: border-box;
            }

            #mf-dashboard-settings-pane .mf-control-advanced {
                display: flex;
                gap: 9px;
            }

            #mf-dashboard-settings-pane input,
            #mf-dashboard-diagnostics-pane input {
                color: #f4f8ff !important;
                background: rgba(2, 13, 25, 0.78) !important;
                border: 1px solid rgba(126, 167, 218, 0.20) !important;
                border-radius: 7px !important;
                min-height: 38px;
                padding: 7px 9px !important;
                box-sizing: border-box;
            }

            .mf-dashboard-toggle-row {
                align-items: flex-start;
            }

            #mf-event-scanner-state {
                margin-top: 7px;
            }

            #mf-dashboard-diagnostics-pane #mf-export-unit-finder-diagnostics {
                width: 100%;
                background: linear-gradient(145deg, #27394d, #172638) !important;
            }

            #mf-dashboard-footer {
                grid-area: footer;
                padding: 4px 10px 0;
                text-align: center;
                color: #7f91a8;
                font-size: 11px;
                letter-spacing: 0.02em;
            }

            @media (max-width: 1180px) and (min-width: 701px) {
                #mission-finder-wrapper.mf-nexus-dashboard:not(.mf2026-ios-safari),
                #mission-finder-wrapper.mf-nexus-dashboard.mf-dashboard-utility-open:not(.mf2026-ios-safari) {
                    grid-template-columns: 62px repeat(2, minmax(250px, 1fr));
                    grid-template-areas:
                        "rail control load"
                        "rail trained trained"
                        "utility utility utility"
                        "footer footer footer";
                    width: min(920px, calc(100vw - 24px));
                }

                #mf-dashboard-utility {
                    max-height: 310px;
                }
            }
        `;
        document.head.appendChild(style);
    }