(function(root){
  'use strict';
  const fields=['name','nickname','subtitle','nationality','birth','birthplace','position','number','biography','quote','quoteSource','source','counting','international','honours','awards','footer'];
  const empty=()=>({id:globalThis.crypto?.randomUUID?.()||`p-${Date.now()}-${Math.random()}`,name:'Nieuwe legende',nickname:'',subtitle:'Nederlandse voetballegende',nationality:'Nederlands',birth:'',birthplace:'',position:'',number:'',biography:'',quote:'',quoteSource:'',source:'',counting:'Competitiewedstrijden',international:'',honours:'',awards:'',footer:'FOREVER A LEGEND',clubs:[],photos:[],reviewed:false});
  function normalize(p){
    if(!p||typeof p!=='object'||typeof p.name!=='string'||!p.name.trim())throw Error('Elke speler moet een naam hebben.');
    const q=empty();q.id=typeof p.id==='string'&&p.id.length<150?p.id:q.id;
    for(const k of fields) q[k]=typeof p[k]==='string'?p[k].slice(0,8000):q[k];
    q.name=q.name.trim();q.reviewed=p.reviewed===true;
    q.clubs=(Array.isArray(p.clubs)?p.clubs:[]).slice(0,40).map(c=>({name:String(c.name||'').slice(0,150),period:String(c.period||'').slice(0,80),matches:number(c.matches),goals:number(c.goals)}));
    q.photos=(Array.isArray(p.photos)?p.photos:[]).slice(0,8).filter(x=>x&&typeof x.data==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(x.data)&&x.data.length<4000000).map(x=>({data:x.data,source:String(x.source||'').slice(0,1000),credit:String(x.credit||'').slice(0,1000),verified:x.verified===true}));
    return q;
  }
  function number(v){return v!==''&&v!=null&&Number.isInteger(Number(v))&&Number(v)>=0?Number(v):'';}
  const key=p=>p.name.trim().toLocaleLowerCase('nl');
  function merge(existing,incoming){const out=existing.map(p=>structuredClone(p));for(const raw of incoming){const n=normalize(raw);const old=out.find(p=>key(p)===key(n));if(!old){if(out.some(p=>p.id===n.id))n.id=empty().id;out.push(n);continue;}let changed=false;for(const k of fields)if(!old[k]&&n[k]){old[k]=n[k];changed=true;}for(const k of ['clubs','photos'])if(!old[k].length&&n[k].length){old[k]=n[k];changed=true;}if(changed)old.reviewed=false;}return out;}
  function issues(p){const list=[];if(!p.name.trim()||p.name==='Nieuwe legende')list.push('Vul de naam van de speler in.');if(!p.birth||!p.position)list.push('Vul geboortedatum en positie in.');if(!p.clubs.length||p.clubs.some(c=>!c.name||!c.period||c.matches===''||c.goals===''))list.push('Maak de clubcarrière compleet.');if(!p.source)list.push('Voeg de bron van de carrièregegevens toe.');if(!p.international)list.push('Vul de interlandcarrière in.');if(!p.photos.length)list.push('Voeg een originele spelersfoto toe.');if(p.photos.some(x=>!x.source||!x.credit||!x.verified))list.push('Controleer herkomst en gebruiksrechten van alle foto’s.');if(p.quote&&!p.quoteSource)list.push('Voeg een controleerbare bron voor het citaat toe.');if(!p.reviewed)list.push('Controleer en bevestig de inhoud.');return list;}
  function parse(text){const d=JSON.parse(text);if(d.version!==1||!Array.isArray(d.players)||!d.players.length||d.players.length>500)throw Error('Kies een back-up van deze kaartenstudio (versie 1, maximaal 500 spelers).');const p=d.players.map(normalize);if(new Set(p.map(key)).size!==p.length)throw Error('Het bestand bevat dubbele spelersnamen.');return p;}
  const api={fields,empty,normalize,merge,issues,parse};if(typeof module!=='undefined')module.exports=api;else root.Cards=api;
})(globalThis);
