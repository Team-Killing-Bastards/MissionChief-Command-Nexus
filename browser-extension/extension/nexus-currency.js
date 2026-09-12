/* Nexus currency dropdown. Uses the game's original balances, without wrapping game updates. */
(() => {
  'use strict';
  if (globalThis.NexusSettings?.enabled('currency') === false) return;
  if (window !== window.top || location.pathname !== '/' || /^mcn-v3-(active-worker|pipeline-preload)-/.test(window.name || '')) return;
  const flags = window.__NEXUS_COMFORT_DATA__?.flags.creditsextension;
  if (!flags || (!flags.creditsInNavbar && !flags.coinsInNavbar) || window.__NEXUS_CURRENCY__) return;
  const nf = new Intl.NumberFormat('en-GB');
  let root, toggle, menu, total, rank, alliance, controller = null, expiryTimer = null, request = 0, snapshot = null;
  const sources = new Set();
  const state = { updates: 0, requests: 0, pending: false, update, suspend };
  window.__NEXUS_CURRENCY__ = state;
  function node(tag, value, className) {
    const el = document.createElement(tag); el.dataset.nexusCurrency = '1';
    if (value !== undefined) el.textContent = value;
    if (className) el.className = className;
    return el;
  }
  function set(el, value) { if (el.textContent !== value) el.textContent = value; }
  function number(raw) {
    if (typeof raw === 'number') return Number.isSafeInteger(raw) && raw >= 0 ? raw : null;
    if (typeof raw !== 'string' || !/^\s*\d[\d,.\s\u00a0\u202f]*\s*$/.test(raw)) return null;
    const value = Number(raw.replace(/[,\.\s\u00a0\u202f]/g, ''));
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  function read(anchor, selector) {
    const nested = anchor.matches(selector) ? anchor : anchor.querySelector(selector);
    // Prefer the actual navbar value, not a stale duplicate elsewhere in the document.
    const raw = nested?.textContent ?? anchor.textContent;
    const match = String(raw).slice(0, 300).match(/\d(?:[\d,.\s\u00a0\u202f]*\d)?/);
    return number(match?.[0]) ?? number(document.querySelector(selector)?.textContent);
  }
  function icon(kind) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    const shapes = {
      credit: ['circle', { cx: 12, cy: 12, r: 9 }, 'path', { d: 'M15 8a5 5 0 1 0 0 8M11 5v3m0 8v3' }],
      coin: ['circle', { cx: 12, cy: 12, r: 9 }, 'path', { d: 'M15 8c-5-3-9 3-3 4s3 7-3 4M12 5v14' }],
      table: ['rect', { x: 3, y: 4, width: 18, height: 16, rx: 1 }, 'path', { d: 'M3 10h18M3 15h18M10 10v10M16 10v10' }],
      chart: ['path', { d: 'M3 3v18h18M7 17V11h2v6m4 0V7h2v10m4 0V3h2v14' }],
      list: ['path', { d: 'M3 5h2M3 12h2M3 19h2M9 5h12M9 12h12M9 19h12' }]
    };
    const parts = shapes[kind];
    for (let i = 0; i < parts.length; i += 2) {
      const shape = document.createElementNS(svg.namespaceURI, parts[i]);
      for (const [key, value] of Object.entries(parts[i + 1])) shape.setAttribute(key, value);
      shape.setAttribute('fill', 'none'); shape.setAttribute('stroke', 'currentColor'); shape.setAttribute('stroke-width', '2'); shape.setAttribute('stroke-linecap', 'round'); svg.append(shape);
    }
    return svg;
  }
  function link(href, label, className = '') {
    const a = node('a', undefined, `lightbox-open ${className}`); a.href = href; a.title = label; a.setAttribute('aria-label', label); return a;
  }
  function balance(kind, label, inMenu) {
    const el = node('span', undefined, 'nx-money'); el.append(icon(kind));
    if (inMenu) el.append(node('span', `${label}: `));
    const value = node('span', '—'); value.dataset.nxBalance = kind; el.append(value); return el;
  }
  function shortcut(href, label, kind) {
    const a = link(href, label, 'nx-money-shortcut'); a.append(icon(kind)); return a;
  }
  function mount(anchor) {
    root?.remove();
    const wrapper = anchor.parentElement?.tagName === 'LI' ? anchor.parentElement : anchor;
    root = node(wrapper.tagName === 'LI' ? 'li' : 'div'); root.id = 'nx-currency-menu';
    toggle = node('button', undefined, 'nx-money-toggle'); toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Credits and coins'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-controls', 'nx-currency-dropdown');
    if (flags.creditsInNavbar) toggle.append(balance('credit', 'Credits', false));
    if (flags.coinsInNavbar) toggle.append(balance('coin', 'Coins', false));
    toggle.append(node('span', '', 'nx-money-caret'));
    menu = node('div'); menu.id = 'nx-currency-dropdown'; menu.hidden = true; menu.setAttribute('aria-label', 'Credit and coin shortcuts');
    const creditsRow = node('div', undefined, 'nx-money-row'), credits = link('/credits', 'Credits'); credits.append(balance('credit', 'Credits', true));
    creditsRow.append(credits, shortcut('/credits/daily', 'Daily credits summary', 'table'), shortcut('/credits/overview', 'Credit overview', 'chart'));
    const coinsRow = node('div', undefined, 'nx-money-row'), coins = link('/coins', 'Coins'); coins.append(balance('coin', 'Coins', true));
    coinsRow.append(coins, shortcut('/coins/list', 'Coin history', 'list'));
    const details = node('div', undefined, 'nx-money-details');
    const totalLabel = node('div', 'Total earned credits:'); total = node('div', 'Open to load', 'nx-money-indent'); total.id = 'nx-currency-total';
    rank = link('/level', 'Rank progress', 'nx-money-rank'); rank.id = 'nx-currency-rank'; rank.append(node('div', 'Next rank:'), node('div', 'Open to load', 'nx-money-indent'));
    alliance = link('/verband/kasse', 'Alliance funds', 'nx-money-alliance'); alliance.hidden = true;
    details.append(totalLabel, total, rank, alliance); menu.append(creditsRow, coinsRow, details); root.append(toggle, menu); wrapper.before(root);
    let parent = anchor;
    for (let i = 0; parent && i < 6; i++, parent = parent.parentElement) {
      const color = getComputedStyle(parent).backgroundColor;
      if (color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') { root.style.setProperty('--nx-money-bg', color); break; }
    }
    root.style.color = getComputedStyle(anchor).color;
    toggle.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); open(menu.hidden); });
    root.addEventListener('click', event => { if (event.target.closest('a')) queueMicrotask(() => open(false)); });
    root.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); open(false); toggle.focus(); }
      else if (event.key === 'ArrowDown' && event.target === toggle) { event.preventDefault(); open(true); menu.querySelector('a').focus(); }
    });
    // activeElement can temporarily be body between blur and focus during a pointer click.
    // Use the destination so that moving from the toggle to a shortcut cannot hide it mid-click.
    root.addEventListener('focusout', event => { if (event.relatedTarget && !root.contains(event.relatedTarget)) open(false); });
  }
  function hideOriginal(anchor) {
    const wrapper = anchor.parentElement?.tagName === 'LI' ? anchor.parentElement : anchor;
    wrapper.classList.add('nx-currency-source'); sources.add(wrapper);
  }
  function update() {
    if (document.hidden) return;
    const credits = document.getElementById('navigation_top'), coins = document.getElementById('coins_top');
    if (!credits || !coins || !credits.parentElement || !coins.parentElement) {
      if (root?.isConnected) { suspend(); root.remove(); for (const el of sources) el.classList.remove('nx-currency-source'); sources.clear(); }
      return;
    }
    if (!root?.isConnected || root.parentElement !== (credits.parentElement.tagName === 'LI' ? credits.parentElement.parentElement : credits.parentElement)) { suspend(); mount(credits); }
    for (const el of sources) if (!el.isConnected) sources.delete(el);
    hideOriginal(credits); hideOriginal(coins);
    for (const [kind, value] of [['credit', read(credits, '.credits-value')], ['coin', read(coins, '.coins-value')]]) {
      const formatted = value === null ? '—' : nf.format(value);
      for (const el of root.querySelectorAll(`[data-nx-balance="${kind}"]`)) set(el, formatted);
    }
    state.updates++;
  }
  function open(show) {
    if (!menu) return;
    menu.hidden = !show; toggle.setAttribute('aria-expanded', String(show));
    if (show) { update(); void loadSummary(); }
    else cancel();
  }
  function cancel() {
    request++; controller?.abort(); controller = null; clearTimeout(expiryTimer); expiryTimer = null; state.pending = false;
  }
  function suspend() { open(false); }
  async function json(response, signal) {
    if (!response.ok || !/\bjson\b/i.test(response.headers.get('content-type') || '')) throw Error('Summary unavailable');
    if (Number(response.headers.get('content-length')) > 65536 || !response.body) throw Error('Summary unavailable');
    const reader = response.body.getReader(), decoder = new TextDecoder(); let body = '', size = 0;
    try {
      while (true) {
        if (signal.aborted) throw Error('Cancelled');
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength; if (size > 65536) throw Error('Summary too large');
        body += decoder.decode(value, { stream: true });
      }
      return JSON.parse(body + decoder.decode());
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
  function renderSummary() {
    if (!snapshot) return;
    set(total, nf.format(snapshot.total)); total.title = `Game total checked ${new Date(snapshot.at).toLocaleTimeString('en-GB')}`;
    const flavour = window.gameFlavour === 'policechief' || location.hostname.startsWith('police.') ? 'policechief' : 'missionchief';
    const ranks = window.__NEXUS_CURRENCY_RANKS__?.[flavour] || {};
    const next = Object.keys(ranks).map(Number).sort((a,b) => a-b).find(value => value > snapshot.total);
    rank.replaceChildren(node('div', next === undefined ? 'Rank progress' : 'Next rank:'));
    if (next !== undefined) rank.append(node('div', ranks[next], 'nx-money-indent'), node('div', `${nf.format(next - snapshot.total)} Credits remaining`, 'nx-money-indent'));
    else rank.append(node('div', 'View rank details', 'nx-money-indent'));
    alliance.hidden = flags.hideAllianceFunds || !snapshot.allianceActive;
    if (!alliance.hidden) alliance.replaceChildren(node('div', 'Alliance funds:'), node('div', `${snapshot.allianceCurrent === null ? '—' : nf.format(snapshot.allianceCurrent)} Credits currently`, 'nx-money-indent'), node('div', `${snapshot.allianceTotal === null ? '—' : nf.format(snapshot.allianceTotal)} Credits total`, 'nx-money-indent'));
  }
  async function loadSummary() {
    if (state.pending || document.hidden || !root?.isConnected || menu.hidden) return;
    if (snapshot && Date.now() - snapshot.at < 60000) { renderSummary(); return; }
    const ticket = ++request, abort = new AbortController(); controller = abort; state.pending = true; state.requests++;
    set(total, 'Loading…'); rank.replaceChildren(node('div', 'Next rank:'), node('div', 'Loading…', 'nx-money-indent')); alliance.hidden = true;
    expiryTimer = setTimeout(() => abort.abort(), 10000);
    try {
      const response = await fetch('/api/userinfo', { credentials: 'same-origin', signal: abort.signal, cache: 'no-store', headers: { Accept: 'application/json' } });
      const data = await json(response, abort.signal);
      if (ticket !== request || abort.signal.aborted) return;
      const earned = number(data?.credits_user_total); if (earned === null) throw Error('Missing earned total');
      // Retain only four financial scalars. Never retain account identity or the full API response.
      snapshot = { at: Date.now(), total: earned, allianceActive: data.credits_alliance_active === true, allianceCurrent: number(data.credits_alliance_current), allianceTotal: number(data.credits_alliance_total) };
      renderSummary();
    } catch {
      if (ticket === request) { set(total, 'Currently unavailable'); rank.replaceChildren(node('div', 'View rank details')); }
    } finally {
      if (ticket === request) { clearTimeout(expiryTimer); expiryTimer = null; controller = null; state.pending = false; }
    }
  }
  const style = node('style');
  style.textContent = `
  .nx-currency-source{display:none!important}
  #nx-currency-menu{position:relative;display:inline-block;list-style:none;margin:0;vertical-align:middle;--nx-money-bg:#c6322c;font-weight:normal}
  #nx-currency-menu *{box-sizing:border-box}#nx-currency-menu [hidden]{display:none!important}
  #nx-currency-menu svg{height:23px;width:23px;flex-shrink:0;vertical-align:middle}
  #nx-currency-menu .nx-money-toggle{display:flex;align-items:center;gap:8px;padding:12px 15px;min-height:50px;border:0;color:inherit;background:transparent;font:inherit;cursor:pointer}
  #nx-currency-menu .nx-money{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
  #nx-currency-menu .nx-money-caret{border:4px solid transparent;border-bottom:0;border-top-color:currentColor;margin-left:2px}
  #nx-currency-menu button:focus-visible,#nx-currency-menu a:focus-visible{outline:2px solid currentColor;outline-offset:-3px}
  #nx-currency-menu .nx-money-toggle:hover,#nx-currency-menu .nx-money-toggle[aria-expanded=true]{background:rgba(0,0,0,.1)}
  #nx-currency-dropdown{position:absolute;top:100%;right:0;width:350px;max-width:calc(100vw - 20px);padding:10px 12px;background:var(--nx-money-bg);color:inherit;box-shadow:0 5px 12px #0005;border:1px solid #0003;z-index:1050;font-size:16px;line-height:1.6}
  #nx-currency-menu a{color:inherit!important;text-decoration:none}#nx-currency-menu a:hover{background:rgba(0,0,0,.1)}
  #nx-currency-menu .nx-money-row{display:flex;align-items:center;gap:4px;padding:2px 0}#nx-currency-menu .nx-money-row>a:first-child{flex:1;min-width:0}
  #nx-currency-menu .nx-money-shortcut{display:inline-flex;align-items:center;justify-content:center;width:31px;height:31px;border:1px solid #171717;border-radius:4px;background:linear-gradient(#575757,#202020);color:#fff!important;flex-shrink:0;box-shadow:inset 0 1px #ffffff35}
  #nx-currency-menu .nx-money-shortcut svg{width:19px;height:19px}#nx-currency-menu .nx-money-shortcut:hover{background:#606060}
  #nx-currency-menu .nx-money-details{margin:10px -12px 0;padding:14px 16px 5px;border-top:1px solid #ffffff50}
  #nx-currency-menu .nx-money-indent{padding-left:20px}#nx-currency-menu .nx-money-rank,#nx-currency-menu .nx-money-alliance{display:block;margin-top:12px}
  @media(max-width:480px){#nx-currency-dropdown{font-size:14px;width:315px}#nx-currency-menu .nx-money-toggle{padding:12px 8px}}
  `;
  document.head.append(style);
  document.addEventListener('click', event => { if (root && !root.contains(event.target)) open(false); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
  window.addEventListener('pagehide', () => { suspend(); snapshot = null; });
})();
