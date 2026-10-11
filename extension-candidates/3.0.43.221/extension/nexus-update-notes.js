/* One small, local update notice. No game requests, recurring polling or observers. */
(() => {
  'use strict';
  if(window!==window.top)return;
  let host=null,stopped=false,busy=false,automaticDone=false,retryTimer=0;
  const call=message=>chrome.runtime.sendMessage(message);
  const visibleHome=()=>location.pathname==='/'&&!document.hidden&&!!document.querySelector('#map, .credits-value');
  function show(data) {
    if(host)return;
    const previousFocus=document.activeElement;
    host=document.createElement('div');host.id='nexus-update-notice';
    const shadow=host.attachShadow({mode:'open'});
    shadow.innerHTML=`<style>
      :host{all:initial}*{box-sizing:border-box}dialog{width:min(550px,calc(100vw - 24px));max-height:calc(100dvh - 32px);padding:0;border:1px solid #42617e;border-radius:14px;background:#101f30;color:#edf4ff;box-shadow:0 18px 70px #0009;font:14px/1.5 system-ui,sans-serif;overflow:auto}dialog::backdrop{background:#0007}
      header{padding:20px 24px 14px;border-bottom:1px solid #30455b}small{color:#86d8fa;font-weight:700;letter-spacing:1px}h1{font-size:24px;margin:4px 0}p{color:#b8cadd;margin:6px 0}ul{list-style:none;margin:0;padding:4px 24px 14px}li{padding:14px 0;border-bottom:1px solid #30455b}li:last-child{border:0}a{color:#93d9ff;text-underline-offset:3px}li a{font-weight:650}li p{margin-bottom:0}footer{padding:14px 24px;display:flex;justify-content:space-between;align-items:center;gap:16px;border-top:1px solid #30455b;background:#13263a;position:sticky;bottom:0}button{border:1px solid #73c4ef;border-radius:7px;background:#2586b9;color:white;padding:8px 20px;font:inherit;cursor:pointer;white-space:nowrap}button:focus-visible,a:focus-visible{outline:3px solid #ffd57a;outline-offset:3px}@media(max-width:400px){header,footer{padding:14px 16px}ul{padding-inline:16px}h1{font-size:21px}}
      </style><dialog aria-labelledby="update-title" aria-describedby="update-summary"><header><small>NEXUS UPDATED</small><h1 id="update-title">What’s changed</h1><p id="update-summary"></p></header><ul></ul><footer><a target="_blank" rel="noopener noreferrer">Full GitHub changelog ↗</a><button type="button" autofocus>Got it</button></footer></dialog>`;
    shadow.querySelector('#update-summary').textContent=`Version ${data.version}`+(data.from?` · Changes since ${data.from}`:' · Recent updates');
    const list=shadow.querySelector('ul');
    for(const note of data.notes) {
      const li=document.createElement('li'),link=document.createElement('a'),text=document.createElement('p');
      link.textContent=note.title+' ↗';link.href=note.url;link.target='_blank';link.rel='noopener noreferrer';
      text.textContent=note.text;li.append(link,text);list.append(li);
    }
    shadow.querySelector('footer a').href=data.changelog;
    const dialog=shadow.querySelector('dialog');
    dialog.addEventListener('close',()=>{host?.remove();host=null;if(previousFocus?.isConnected)previousFocus.focus();},{once:true});
    shadow.querySelector('button').addEventListener('click',()=>dialog.close());
    document.body.append(host);
    try {dialog.showModal();}catch(error){host.remove();host=null;throw error;}
  }
  async function open(manual=false) {
    if(stopped||busy||host||(!manual&&(automaticDone||!visibleHome())))return;
    busy=true;let token;
    try {
      const data=await call({type:manual?'NEXUS_UPDATES_READ':'NEXUS_UPDATES_CLAIM'});
      token=data?.token;
      if(!data?.ok)return;
      if(!manual&&!data.show){if(data.retry&&!retryTimer)retryTimer=setTimeout(()=>{retryTimer=0;void open();},16000);else if(!data.retry)automaticDone=true;return;}
      if(stopped||(!manual&&!visibleHome())){if(token)await call({type:'NEXUS_UPDATES_RELEASE',token});return;}
      show(data);
      if(token)await call({type:'NEXUS_UPDATES_SHOWN',token});
      automaticDone=true;
    } catch {
      if(token)try{await call({type:'NEXUS_UPDATES_RELEASE',token});}catch{}
    } finally {busy=false;}
  }
  const auto=()=>void open();
  const manual=()=>void open(true);
  window.addEventListener('nexus:show-update-notes',manual);
  document.addEventListener('visibilitychange',auto);
  window.addEventListener('focus',auto);
  const initial=setTimeout(auto,1500);
  window.addEventListener('pagehide',()=>{
    stopped=true;clearTimeout(initial);clearTimeout(retryTimer);
    document.removeEventListener('visibilitychange',auto);window.removeEventListener('focus',auto);window.removeEventListener('nexus:show-update-notes',manual);
    host?.remove();host=null;
  },{once:true});
})();
