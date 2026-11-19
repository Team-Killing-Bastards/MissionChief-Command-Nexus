/* Keep the home-page game navigation visible without moving its controls. */
(() => {
  'use strict';
  if(window!==window.top || location.pathname!=='/' || /^mcn-v3-/.test(window.name) ||
    globalThis.NexusSettings?.enabled('fixedNavigation')===false) return;
  const header=document.querySelector('nav.navbar,.navbar.navbar-default,.navbar.navbar-inverse') ||
    document.querySelector('.navbar-header')?.closest('.navbar');
  if(!header || header.dataset.nxFixedNavigation) return;
  header.dataset.nxFixedNavigation='1';
  const alreadyFixed=getComputedStyle(header).position==='fixed';
  const spacer=document.createElement('div');spacer.setAttribute('aria-hidden','true');
  spacer.dataset.nxNavigationSpacer='1';
  if(!alreadyFixed){spacer.style.height=header.getBoundingClientRect().height+'px';header.before(spacer);}
  const style=document.createElement('style');style.textContent=`
    [data-nx-fixed-navigation="1"]{position:fixed!important;top:0!important;left:0!important;right:0!important;width:auto!important;margin-top:0!important;z-index:1030!important}
  `;document.head.append(style);
  const observer=new ResizeObserver(()=>{if(!alreadyFixed)spacer.style.height=header.getBoundingClientRect().height+'px';});
  observer.observe(header);
  window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
})();
