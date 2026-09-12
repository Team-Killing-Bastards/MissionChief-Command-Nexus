/* Coordinate native credit-page navigation and charts with the Nexus replacement view. */
(() => {
  'use strict';
  if(!/^\/credits\/(daily|overview)\/?$/.test(location.pathname)||globalThis.NexusCreditPageChrome)return;
  const navSelector='nav, .navbar, [role="navigation"], ul.nav-tabs';
  const charts='canvas, .highcharts-container, [data-highcharts-chart], [id^="chart-"], #credits_chart, #credits_overview_chart, svg.highcharts-root';
  function creditPath(node){
    try{const url=new URL(node.getAttribute('href')||'',location.origin);if(url.origin!==location.origin)return null;const path=url.pathname.replace(/\/$/,'');return /^\/(credits(?:\/(daily|overview))?|coins\/list)$/.test(path)?path:null;}catch{return null;}
  }
  function navigation(scope,root){
    return [...scope.querySelectorAll(navSelector)].find(nav=>{
      if(root.contains(nav)||nav.contains(root)||nav.hidden||nav.closest('#nx-daily,#nx-overview'))return false;
      const paths=new Set([...nav.querySelectorAll('a[href],button[href]')].map(creditPath).filter(Boolean));
      // A game credit-page toolbar has transactions plus multiple dedicated credit/coin destinations.
      // A lone home-page credits link or account dropdown is not a replacement toolbar.
      return paths.has('/credits')&&paths.size>=3&&(paths.has('/credits/daily')||paths.has('/credits/overview'));
    })||null;
  }
  function surroundingNavigation(root){
    const local=navigation(document,root);if(local)return local;
    try{
      const frame=window.frameElement;
      const lightbox=frame?.closest('.modal,#lightbox_box,#lightbox,[role="dialog"]');
      return lightbox?navigation(lightbox,root):null;
    }catch{return null;}
  }
  function chartWrapper(graph,root,source,toolbar,scope){
    let target=graph;
    // Remove a chart-only sizing wrapper too, avoiding an empty fixed-height gap.
    // Stop before any navigation, source table, new content, text or unrelated controls.
    while(target.parentElement&&target.parentElement!==scope){
      const parent=target.parentElement;
      if(!parent.matches('div,figure,section')||parent.contains(root)||parent.contains(source)||parent===toolbar||parent.contains(toolbar))break;
      const solelyChart=[...parent.childNodes].every(node=>node===target||
        (node.nodeType===Node.TEXT_NODE&&!node.textContent.trim())||node.nodeType===Node.COMMENT_NODE||
        (node.nodeType===Node.ELEMENT_NODE&&(node.matches('script,style,template,br,.chartjs-size-monitor,.chartjs-size-monitor-expand,.chartjs-size-monitor-shrink')||node.hidden||getComputedStyle(node).display==='none')));
      if(!solelyChart)break;target=parent;
    }
    return target;
  }
  function mount({root,fallback,source,mode,hide}){
    let toolbar=null,observer=null,pending=null,settle=null,disposed=false;
    const scope=source.closest('#iframe-inside-container,#lightbox_content,main,[role="main"],.container-fluid,.container')||document.body;
    function ownsNavigation(node){return !!toolbar&&(node===toolbar||node.contains(toolbar)||toolbar.contains(node));}
    function apply(){
      pending=null;if(disposed||!root.isConnected)return;
      toolbar=surroundingNavigation(root);fallback.hidden=!!toolbar;
      // Keep incomplete legacy tab rows only when they are the chosen toolbar.
      for(const tabs of scope.querySelectorAll('ul.nav-tabs'))if(!root.contains(tabs)&&!ownsNavigation(tabs)&&tabs.querySelector('a[href^="/credits"]'))hide(tabs);
      if(mode!=='overview')return;
      for(const graph of scope.querySelectorAll(charts)){
        if(root.contains(graph)||graph.contains(root)||graph===source||graph.contains(source)||ownsNavigation(graph)||graph.closest('nav,.navbar,[role="navigation"],a,button'))continue;
        // The native chart is above the source table/new view. Leave later or unrelated graphics alone.
        if(!(graph.compareDocumentPosition(root)&Node.DOCUMENT_POSITION_FOLLOWING))continue;
        hide(chartWrapper(graph,root,source,toolbar,scope));
      }
    }
    function stopWatching(){observer?.disconnect();observer=null;clearTimeout(pending);pending=null;clearTimeout(settle);settle=null;}
    apply();
    // Native charts/toolbars can be inserted after document_idle. Observe just this credit page's
    // startup, ignore the replacement's own table updates, then disconnect permanently.
    observer=new MutationObserver(records=>{
      if(!pending&&records.some(r=>!root.contains(r.target)&&[...r.addedNodes].some(n=>n.nodeType===Node.ELEMENT_NODE)))pending=setTimeout(apply,60);
    });
    observer.observe(scope,{childList:true,subtree:true});settle=setTimeout(stopWatching,4000);
    return {ownsNavigation,dispose(){disposed=true;stopWatching();toolbar=null;}};
  }
  globalThis.NexusCreditPageChrome=Object.freeze({mount});
})();
