/* Compact only the home-page mission list. Native nodes and text remain intact. */
(() => {
  'use strict';
  if (window !== window.top || location.pathname !== '/' ||
      /^mcn-v3-/.test(window.name) || globalThis.NexusSettings?.enabled('compactMissions') === false) return;
  if (document.getElementById('nx-compact-missions-style')) return;
  const style = document.createElement('style');
  style.id = 'nx-compact-missions-style';
  style.textContent = `
    .nx-compact-mission {position:relative}
    .nx-compact-mission .nx-compact-heading {padding-right:65px!important;min-height:25px}
    .nx-compact-toggle {position:absolute;right:5px;top:3px;z-index:2;color:#d9f3ff;background:#193a50;border:1px solid #61859b;border-radius:3px;padding:2px 6px;font:11px Arial;line-height:16px;cursor:pointer}
    .nx-compact-toggle:focus-visible {outline:2px solid #69c8ff}
    .nx-compact-mission:not(.nx-mission-expanded) table {table-layout:fixed;width:100%}
    .nx-compact-mission:not(.nx-mission-expanded) td {vertical-align:top!important;padding-top:3px!important;padding-bottom:3px!important}
    .nx-compact-mission:not(.nx-mission-expanded) .alert {margin:1px 0!important;padding:3px 5px!important;line-height:16px!important;max-height:22px!important;overflow:hidden!important;white-space:nowrap!important;text-overflow:ellipsis!important;box-sizing:border-box}
    .nx-compact-mission:not(.nx-mission-expanded) .panel-body {padding:4px!important}
    .nx-compact-mission:not(.nx-mission-expanded) .nx-compact-patients {font-size:11px!important;line-height:15px!important}
    .nx-compact-mission:not(.nx-mission-expanded) .nx-compact-patients .alert {padding:1px 3px!important;line-height:14px!important;max-height:16px!important;font-size:10px!important}
    @media(pointer:coarse) {.nx-compact-toggle {min-height:32px;min-width:55px}.nx-compact-mission .nx-compact-heading {min-height:35px}}
  `;
  document.head.append(style);
  const cards = new Set(); let scheduled = false;
  function decorate(card) {
    if (!card.isConnected) return;
    const heading = card.querySelector('.panel-heading,[id^="mission_panel_heading"],.mission_panel_heading') || card.firstElementChild;
    if (!heading || !card.querySelector('.alert,[id^="mission_bar_outer_"]')) return;
    card.classList.add('nx-compact-mission'); heading.classList.add('nx-compact-heading');
    let button = card.querySelector(':scope > .nx-compact-toggle');
    if (!button) {
      button = document.createElement('button'); button.type = 'button'; button.className = 'nx-compact-toggle';
      button.textContent = 'Expand'; button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-label', 'Expand mission details');
      button.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation();
        const expanded = card.classList.toggle('nx-mission-expanded');
        button.textContent = expanded ? 'Compact' : 'Expand';
        button.setAttribute('aria-expanded', String(expanded));
        button.setAttribute('aria-label', expanded ? 'Compact mission details' : 'Expand mission details');
      });
      card.append(button);
    }
    for (const alert of card.querySelectorAll('.alert')) {
      const value = (alert.textContent || '').replace(/\s+/g,' ').trim();
      // A native tooltip preserves access to the complete warning while compact.
      if (!alert.hasAttribute('title') || alert.dataset.nxCompactTitle === '1') {
        if (alert.title !== value) alert.title = value;
        alert.dataset.nxCompactTitle = '1';
      }
      if (/\bWe need\s*:/i.test(value)) {
        const column = alert.closest('td,[class*="col-xs-"],[class*="col-sm-"]');
        if (column && card.contains(column)) column.classList.add('nx-compact-patients');
      }
    }
  }
  function queue(card) {if(card?.matches?.('.missionSideBarEntry'))cards.add(card);if(!scheduled&&cards.size){scheduled=true;setTimeout(flush,50);}}
  function flush() {scheduled=false;let count=0;for(const card of cards){cards.delete(card);decorate(card);if(++count===40)break;}if(cards.size){scheduled=true;setTimeout(flush,16);}}
  const root = document.getElementById('missions-panel-body');
  if (!root) return;
  root.querySelectorAll('.missionSideBarEntry').forEach(queue);
  const observer = new MutationObserver(records => {
    for (const record of records) {
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (target?.closest('.nx-compact-toggle')) continue;
      queue(target?.closest('.missionSideBarEntry'));
      for (const node of record.addedNodes) if(node.nodeType===1&&!node.matches('.nx-compact-toggle')) {
        queue(node);node.querySelectorAll('.missionSideBarEntry').forEach(queue);
      }
    }
  });
  observer.observe(root,{childList:true,characterData:true,subtree:true});
  window.addEventListener('pagehide',()=>{observer.disconnect();cards.clear();},{once:true});
})();
