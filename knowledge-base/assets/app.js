(()=>{
 'use strict';
 const input=document.querySelector('#search'),results=document.querySelector('#results'),status=document.querySelector('#search-status');
 document.querySelector('form[role=search]').addEventListener('submit',event=>event.preventDefault());
 let docs=null,generation=0;
 input.addEventListener('input',async()=>{
  const current=++generation,q=input.value.trim().toLocaleLowerCase();results.replaceChildren();status.textContent='';if(!q)return;
  try{
   if(!docs){const response=await fetch('/guide/search.json');if(!response.ok)throw Error();docs=await response.json();}
   if(current!==generation)return;
   const words=q.split(/\s+/),ranked=docs.map(a=>({a,score:words.every(w=>(a.title+' '+a.text).toLocaleLowerCase().includes(w))?words.reduce((n,w)=>n+(a.title.toLocaleLowerCase().includes(w)?10:1),0):0})).filter(x=>x.score).sort((a,b)=>b.score-a.score).slice(0,8);
   status.textContent=ranked.length?ranked.length+' matching guides':'No matches. Try profiles, crew or ambulance.';
   for(const {a}of ranked){const li=document.createElement('li'),link=document.createElement('a');link.href=a.url;link.textContent=a.title;li.append(link);results.append(li);}
  }catch{if(current===generation)status.textContent='Search is unavailable. Use the article navigation below.';}
 });
 document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();document.querySelector('#navigation').open=true;input.focus();}if(event.key==='Escape'&&document.activeElement===input){input.value='';input.dispatchEvent(new Event('input'));}});
 if(matchMedia('(max-width:800px)').matches)document.querySelector('#navigation').open=false;
 const dialog=document.querySelector('#image-dialog');let opener;
 for(const img of document.querySelectorAll('article img')){
  const button=document.createElement('button');button.className='enlarge';button.type='button';button.setAttribute('aria-label','Enlarge screenshot: '+img.alt);img.replaceWith(button);button.append(img);
  button.addEventListener('click',()=>{opener=button;dialog.querySelector('img').src=img.src;dialog.querySelector('img').alt=img.alt;dialog.querySelector('p').textContent=img.alt;dialog.showModal();});
 }
 document.querySelector('#close-image').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>opener?.focus());
})();
