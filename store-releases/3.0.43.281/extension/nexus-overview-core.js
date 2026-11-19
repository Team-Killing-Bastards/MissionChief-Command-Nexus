/* Nexus credit overview arithmetic and date mapping. No framework or network requests. */
(() => {
  'use strict';
  if (globalThis.NexusOverviewCore) return;
  function number(value) {
    if(String(value??'').length>120)return null;
    const raw=String(value??'').trim().replace(/\s*Credits$/i,'').replace(/[\s\u00a0\u202f]/g,'').replace(/−/g,'-');
    if(!/^[+-]?(?:\d{1,3}(?:,\d{3})+|\d+)$/.test(raw))return null;
    const n=Number(raw.replaceAll(',',''));return Number.isSafeInteger(n)?n:null;
  }
  function date(value) {
    const raw=String(value??'').trim();
    const iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/),british=raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if(!iso&&!british)return null;
    const day=iso?`${iso[1]}-${iso[2]}-${iso[3]}`:`${british[3]}-${british[2]}-${british[1]}`;
    const parsed=new Date(`${day}T00:00:00Z`);return Number.isFinite(+parsed)&&parsed.toISOString().slice(0,10)===day?day:null;
  }
  function dayAt(end,index,length) { const parsed=new Date(`${end}T00:00:00Z`);parsed.setUTCDate(parsed.getUTCDate()-(length-1-index));return parsed.toISOString().slice(0,10); }
  function columns(headers,length) {
    const result={};headers.forEach((h,i)=>{const label=String(h).trim().toLowerCase();if(/^(date|day)$/.test(label))result.date=i;else if(/^(revenue|income|earnings)$/.test(label))result.revenue=i;else if(/^(spendings?|expenses?|expenditure)$/.test(label))result.spending=i;else if(/^(sum|total|net)$/.test(label))result.net=i;});
    if(['revenue','spending','net'].every(key=>key in result))return result;
    // Original UK overview has three columns, oldest first: sum, spending, revenue.
    return length===3?{net:0,spending:1,revenue:2}:null;
  }
  function row(values,map,index,length,end,explicitDate=null) {
    const revenue=number(values[map.revenue]),spending=number(values[map.spending]),net=number(values[map.net]);
    if([revenue,spending,net].every(n=>n===null))return null;
    const rawDate=map.date===undefined?explicitDate:values[map.date];
    const stamp=rawDate!==null&&rawDate!==undefined?date(rawDate):dayAt(end,index,length);
    if(!stamp)return null;
    return {date:stamp,revenue,spending,net,index,inferredDate:rawDate===null||rawDate===undefined,
      missing:[revenue,spending,net].some(n=>n===null),mismatch:revenue!==null&&spending!==null&&net!==null&&revenue+spending!==net};
  }
  function scale(values) {
    const numbers=values.filter(n=>typeof n==='number'&&Number.isFinite(n));
    const low=Math.min(0,...numbers),high=Math.max(0,...numbers);
    if(low===high)return {min:-1,max:1,step:1};
    const rough=(high-low)/5,base=10**Math.floor(Math.log10(rough));
    const step=[1,2,5,10].map(n=>n*base).find(n=>n>=rough);
    let min=Math.floor(low/step)*step,max=Math.ceil(high/step)*step;
    if(min===max)max=min+step;
    return {min,max,step};
  }
  globalThis.NexusOverviewCore=Object.freeze({number,date,dayAt,columns,row,scale});
})();
