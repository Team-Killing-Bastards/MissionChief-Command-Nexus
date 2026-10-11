/* Viewport-only layout for manual Nexus UI. No fleet reads, timers or DOM observers. */
(() => {
  'use strict';
  try {
    for (let win = window; ; win = win.parent) {
      if (/^mcn-v3-(active-worker|pipeline-preload|retired-worker)-/.test(win.name || '') ||
          win.frameElement?.matches('[data-mcn-v3-worker],[data-mcn-v3-pipeline-preload],#mcn-v3-background-mission-worker')) return;
      if (win === win.top) break;
    }
  } catch { return; }
  const root = document.documentElement;
  if (!root || document.getElementById('nexus-responsive-style')) return;
  const style = document.createElement('style'); style.id = 'nexus-responsive-style';
  style.textContent = `
  html[data-nexus-layout=phone] :is(#mc-namer-panel,#nx-command-popover,#mission-finder-wrapper){transform:scale(var(--nx-ui-scale,1))!important;transform-origin:top left!important}
  html[data-nexus-desktop-phone] #mission-finder-wrapper:not(.mf2026-iphone-safari){left:var(--nx-visible-left)!important;top:var(--nx-visible-top)!important;right:auto!important;max-width:var(--nx-visible-width)!important;max-height:var(--nx-visible-height)!important;overflow:auto;overscroll-behavior:contain}
  html[data-nexus-layout=tablet][data-nexus-touch=true] #mc-namer-panel{top:var(--nx-visible-top)!important;max-height:var(--nx-visible-height)!important;max-width:var(--nx-visible-width)!important}
  html[data-nexus-layout=phone] #mission-finder-wrapper.mf2026-iphone-safari{left:var(--nx-visible-left)!important;top:var(--nx-visible-top)!important;right:auto!important;width:var(--nx-visible-width)!important;max-height:var(--nx-visible-height)!important}
  html[data-nexus-layout=phone] #mission-finder-wrapper.mf2026-iphone-safari>.mf2026-panel{max-height:max(60px,calc(var(--nx-visible-height) - var(--mf-iphone-panel-top,42px)))!important}
  html[data-nexus-layout=phone] #mc-namer-panel{
    box-sizing:border-box!important;left:var(--nx-visible-left)!important;top:var(--nx-visible-top)!important;right:auto!important;bottom:auto!important;
    width:var(--nx-visible-width)!important;max-width:var(--nx-visible-width)!important;max-height:var(--nx-visible-height)!important;
    display:flex;flex-direction:column;overflow:hidden}
  html[data-nexus-layout=phone] #mc-namer-panel #mc-namer-body{min-height:0!important;flex:1 1 auto;max-height:none!important;overflow:auto!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
  html[data-nexus-layout=phone] #mc-namer-panel #mc-namer-header{flex-shrink:0;touch-action:pan-y;cursor:default}
  html[data-nexus-layout=phone] #mc-namer-panel.mc-namer-collapsed #mc-namer-body{display:none!important}
  html[data-nexus-layout=phone] #mc-namer-panel :is(.mc-namer-buttons,.mc-nexus-action-bar){flex-wrap:wrap;min-width:0}
  html[data-nexus-layout=phone] #mc-namer-panel :is(input:not([type=checkbox]):not([type=radio]),select,textarea){max-width:100%;min-width:0;box-sizing:border-box}
  html[data-nexus-layout=phone] #nx-command-popover{left:var(--nx-visible-left)!important;top:var(--nx-visible-top)!important;width:var(--nx-visible-width)!important;max-width:var(--nx-visible-width)!important;max-height:var(--nx-visible-height)!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
  html[data-nexus-layout=phone] :is(#nx-building-overview,#nx-personnel-overview){grid-template-columns:minmax(0,1fr)!important;max-width:100%;min-width:0}
  html[data-nexus-layout=phone] #nx-personnel-overview{grid-template-areas:'summary' 'demand' 'filter'!important}
  html[data-nexus-layout=phone] :is(#nx-personnel-summary,#nx-personnel-demand,#nx-patients){overflow-x:auto;-webkit-overflow-scrolling:touch}
  html[data-nexus-layout=phone] #nx-extension-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  html[data-nexus-layout=phone] :is(#nx-missing,#nx-vehicle-tabs,#nx-selected,#nx-personnel-filter){max-width:100%;box-sizing:border-box;overflow-wrap:anywhere}
  html[data-nexus-layout=phone] #nx-command-tools{max-width:100%;box-sizing:border-box}
  html[data-nexus-touch=true] :is(#mc-namer-panel,#nx-command-popover,#nx-personnel-filter) :is(input:not([type=checkbox]):not([type=radio]),select,textarea){font-size:16px!important}
  html[data-nexus-touch=true] :is(#mc-namer-panel,#nx-command-tools,#nx-command-popover,#nx-building-overview,#nx-vehicle-tabs,#nx-personnel-overview) :is(button,a.btn){min-height:44px;touch-action:manipulation}
  html[data-nexus-touch=true] #nx-command-popover label{min-height:44px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  html[data-nexus-touch=true] #nx-personnel-filter label{min-height:44px;display:inline-flex;gap:8px;align-items:center}
  html[data-nexus-touch=true] #mission-finder-wrapper :is(input:not([type=checkbox]):not([type=radio]),select,textarea){font-size:16px!important}
  html[data-nexus-desktop-phone] :is(#nx-building-overview,#nx-personnel-overview,#nx-missing,#nx-patients,#nx-vehicle-tabs,#nx-selected,#nx-personnel-filter,#nx-command-tools){font-size:calc(12px * var(--nx-ui-scale))!important}
  html[data-nexus-desktop-phone] :is(#nx-building-overview,#nx-personnel-overview,#nx-missing,#nx-patients) :is(th,td,small,.nx-badge,.nx-extension-name,.nx-extension-state){font-size:calc(11px * var(--nx-ui-scale))!important}
  html[data-nexus-desktop-phone] :is(#nx-building-overview,#nx-personnel-overview,#nx-vehicle-tabs,#nx-command-tools) :is(button,a.btn){min-height:calc(44px * var(--nx-ui-scale));font-size:calc(12px * var(--nx-ui-scale))!important}
  html[data-nexus-desktop-phone] #nx-personnel-filter input:not([type=checkbox]){font-size:calc(16px * var(--nx-ui-scale))!important}
  `;
  (document.head || root).append(style);
  const coarse = matchMedia('(pointer: coarse)');
  const viewport = window.visualViewport;
  let frame = 0, active = false, scaleKey = '', uiScale = 1;
  function update() {
    frame = 0;
    const width = root.clientWidth || innerWidth;
    const touch = coarse.matches || navigator.maxTouchPoints > 0;
    // Screen's short side keeps a phone in phone layout when rotated; keyboard
    // and pinch zoom must not turn desktop/tablet into a different device.
    const phone = width <= 600 || (touch && Math.min(screen.width, screen.height) <= 600);
    const layout = phone ? 'phone' : width <= 1100 ? 'tablet' : 'desktop';
    if (root.dataset.nexusLayout !== layout) root.dataset.nexusLayout = layout;
    if (root.dataset.nexusTouch !== String(touch)) root.dataset.nexusTouch = String(touch);
    const values = {width: viewport?.width || width, height: viewport?.height || innerHeight,
      left: viewport?.offsetLeft || 0, top: viewport?.offsetTop || 0};
    // Desktop-site mode can lay out ~980 CSS px on a ~390px phone. Compensate
    // Nexus UI only, leaving the game's viewport and the user's zoom untouched.
    // Cache on layout width/physical rotation, not visible height/zoom: opening
    // the keyboard or pinching must not keep changing the UI's base scale.
    const key = [width,screen.width,screen.height,screen.orientation?.angle ?? window.orientation ?? 0,phone,touch].join(':');
    if (key !== scaleKey) {
      scaleKey = key;
      const landscape = matchMedia('(orientation: landscape)').matches;
      const deviceWidth = landscape ? Math.max(screen.width,screen.height) : Math.min(screen.width,screen.height);
      uiScale = phone && touch && deviceWidth > 0 ? Math.max(1,Math.min(8,width/deviceWidth)) : 1;
    }
    root.toggleAttribute('data-nexus-desktop-phone', phone && uiScale > 1.1);
    const set = (name, value) => { if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value); };
    set('--nx-ui-scale', String(uiScale));
    for (const [name, value] of Object.entries(values)) set(`--nx-viewport-${name}`, `${Math.round(value * 100) / 100}px`);
    set('--nx-visible-left', 'calc(var(--nx-viewport-left) + (8px + env(safe-area-inset-left, 0px)) * var(--nx-ui-scale))');
    set('--nx-visible-top', 'calc(var(--nx-viewport-top) + (8px + env(safe-area-inset-top, 0px)) * var(--nx-ui-scale))');
    set('--nx-visible-width', 'max(0px, calc(var(--nx-viewport-width) / var(--nx-ui-scale) - 16px - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))');
    set('--nx-visible-height', 'max(0px, calc(var(--nx-viewport-height) / var(--nx-ui-scale) - 16px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))');
    // Shadow DOM cannot select an ancestor's data attributes directly.
    document.getElementById('nexus-native-tools')?.toggleAttribute('data-compact', phone);
    document.getElementById('nexus-native-tools')?.toggleAttribute('data-touch', touch);
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(update); }
  function start() {
    if (active) return; active = true;
    window.addEventListener('resize', schedule, {passive:true});
    viewport?.addEventListener('resize', schedule, {passive:true});
    viewport?.addEventListener('scroll', schedule, {passive:true});
    coarse.addEventListener('change', schedule); update();
  }
  window.addEventListener('pagehide', () => {
    active = false; cancelAnimationFrame(frame); frame = 0;
    window.removeEventListener('resize', schedule); viewport?.removeEventListener('resize', schedule);
    viewport?.removeEventListener('scroll', schedule); coarse.removeEventListener('change', schedule);
  });
  window.addEventListener('pageshow', start); start();
})();
