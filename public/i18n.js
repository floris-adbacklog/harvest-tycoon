// The translation layer (29 Sep 2026). The game is written in English. For a farmer who plays in another language this swaps every
// text on screen (text, title, aria-label, placeholder, alt) for its translation as soon as it appears, from
// public/i18n/<code>.json: {"English text": "translation"}. A text with parts that change has {0}, {1}, ... in both
// ("Harvested {0} {1}"); the parts are kept, and a part that is itself a known text (a crop's name) is translated too.
// English farmers never load a translation file: for them nothing on the page changes.
// Players' own words (names, chat, family texts) sit in translate="no" and stay as they are.
import {LANGUAGES} from './languages.js';

export const LANGUAGE_KEY='harvest-tycoon:language';
const ATTRS=['title','aria-label','placeholder','alt'];
// Left as they are: code, players' own words (translate="no") and the staff screens, which stay English.
const KEEP='script,style,noscript,textarea,code,[translate="no"],[contenteditable="true"],.admin-dashboard-dialog,.admin-grant';
const READY=new Set(LANGUAGES.filter(language=>language.ready).map(language=>language.code));

// The farmer's choice in Settings, else the device's language if the game speaks it, else English.
export function chosenLanguage(){
 let saved=null;try{saved=localStorage.getItem(LANGUAGE_KEY);}catch{}
 if(saved&&READY.has(saved))return saved;
 if(saved==='en')return 'en';
 for(const tag of globalThis.navigator?.languages??[globalThis.navigator?.language]){
  const code=String(tag??'').slice(0,2).toLowerCase();
  if(READY.has(code))return code;
 }
 return 'en';
}
export function chooseLanguage(code){try{localStorage.setItem(LANGUAGE_KEY,code);}catch{}}

const escapeRe=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export const normalize=text=>text.replace(/\s+/g,' ').trim();

// A dictionary: exact texts, and the texts with changing parts as patterns (the most fixed text first).
export function createTranslator(dict,code='en'){
 const exact=new Map(),patterns=[],cache=new Map(),missing=new Set();
 const plural=typeof Intl!=='undefined'?new Intl.PluralRules(code):null;
 for(const [english,out] of Object.entries(dict)){
  if(!/\{\d+\}/.test(english)){exact.set(english,out);continue;}
  let source='^',anchor='';const order=[];
  for(const part of english.split(/(\{\d+\})/)){
   const hole=part.match(/^\{(\d+)\}$/);
   // A changing part never runs over a " · ": that is a list the code joined, each part is looked up on its own.
   if(hole){order.push(Number(hole[1]));source+='((?:(?! · ).)*?)';}
   else{source+=escapeRe(part);if(part.trim().length>anchor.length)anchor=part.trim();}
  }
  patterns.push({re:new RegExp(`${source}$`,'s'),order,out,anchor,weight:english.replace(/\{\d+\}/g,'').length});
 }
 patterns.sort((a,b)=>b.weight-a.weight);
 // A changing part that is a known text on its own (a crop, a building) is translated as well.
 // A known text on its own, also when the code wrote it in lower case ("high demand"): then the translation starts in lower case
 // too (not in German, where nouns keep their capital).
 const known=key=>{
  const hit=exact.get(key);if(typeof hit==='string')return hit;
  if(!/^\p{Ll}/u.test(key))return undefined;
  const upper=exact.get(key[0].toUpperCase()+key.slice(1));
  return typeof upper!=='string'?undefined:code==='de'?upper:upper[0].toLowerCase()+upper.slice(1);
 };
 // A changing part that is a known text (a crop, a building) is translated as well.
 const part=value=>{const key=value.trim(),hit=key&&known(key);return hit?value.replace(key,hit):value;};
 const fill=(out,values)=>{
  if(out&&typeof out==='object'){
   const n=values.map(v=>parseFloat(String(v).replace(/[^\d.-]/g,''))).find(Number.isFinite);
   out=out[plural&&n!==undefined?plural.select(n):'other']??out.other;
  }
  return String(out).replace(/\{(\d+)\}/g,(all,i)=>values[i]??'');
 };
 // probe: a look-up while taking a text apart, which never counts as missing.
 function translate(key,probe=false){
  if(cache.has(key))return cache.get(key);
  let result=exact.get(key);
  if(result&&typeof result==='object')result=fill(result,[]);
  if(result===undefined){
   for(const pattern of patterns){
    if(pattern.anchor&&!key.includes(pattern.anchor))continue;
    const match=pattern.re.exec(key);if(!match)continue;
    const values=[];pattern.order.forEach((id,i)=>{values[id]=part(match[i+1]);});
    result=fill(pattern.out,values);break;
   }
  }
  if(result===undefined)result=known(key);
  // Texts the code put together itself: a number before a known text ("8/12 Wheat", "+2 wheat"), a list with " · " (each part on
  // its own), or two known texts with ", " or ": " between them ("Feed Mill, Mix barley feed").
  if(result===undefined){
   const lead=key.match(/^([+−-]?\d[\d.,/×%]*\s?[a-z]{0,2})\s+(\S.*)$/),tail=lead&&(translate(lead[2],true)??known(lead[2]));
   if(tail)result=`${lead[1]} ${tail}`;
  }
  if(result===undefined&&/^· |\s·$/.test(key)){
   const inner=key.replace(/^· /,'').replace(/\s·$/,''),done=translate(inner,true);
   if(done!=null)result=key.replace(inner,done);
  }
  if(result===undefined&&key.includes(' · ')){
   const parts=key.split(' · '),done=parts.map(p=>translate(p,true)??p);
   if(done.some((p,i)=>p!==parts[i]))result=done.join(' · ');
  }
  for(const glue of [', ',': ']){
   if(result!==undefined||!key.includes(glue))continue;
   const parts=key.split(glue),done=parts.map(p=>translate(p,true)??known(p));
   if(done.every(p=>p!=null))result=done.join(glue);
  }
  if(result===undefined&&!probe)missing.add(key);
  if(cache.size>5000)cache.clear();
  cache.set(key,result??null);
  return result??null;
 }
 return {translate,missing,code};
}

// Keep a document translated: everything in it now, and every text that is added or changed later.
export function translateDocument(doc,translator){
 const written=new WeakMap(),attrsWritten=new WeakMap();
 const skip=element=>!element||element.closest(KEEP);
 function text(node){
  const data=node.data;
  if(written.get(node)===data||!/\p{L}/u.test(data)||skip(node.parentElement))return;
  const key=normalize(data);if(!key)return;
  const out=translator.translate(key);if(out==null||out===key)return;
  const next=data.match(/^\s*/)[0]+out+data.match(/\s*$/)[0];
  written.set(node,next);node.data=next;
 }
 function attr(element,name){
  const value=element.getAttribute(name);if(!value||!/\p{L}/u.test(value)||skip(element))return;
  let done=attrsWritten.get(element);if(done?.[name]===value)return;
  const out=translator.translate(normalize(value));if(out==null)return;
  if(!done)attrsWritten.set(element,done={});
  done[name]=out;element.setAttribute(name,out);
 }
 function tree(root){
  if(root.nodeType===3){text(root);return;}
  if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;
  if(root.nodeType===1){if(skip(root))return;for(const name of ATTRS)if(root.hasAttribute(name))attr(root,name);}
  const walker=doc.createTreeWalker(root,5,{acceptNode:node=>node.nodeType===1&&node.matches(KEEP)?2:1});
  for(let node=walker.nextNode();node;node=walker.nextNode()){
   if(node.nodeType===3)text(node);
   else for(const name of ATTRS)if(node.hasAttribute(name))attr(node,name);
  }
 }
 tree(doc.documentElement);
 const observer=new MutationObserver(records=>{
  for(const record of records){
   if(record.type==='characterData')text(record.target);
   else if(record.type==='attributes')attr(record.target,record.attributeName);
   else for(const node of record.addedNodes)tree(node);
  }
 });
 observer.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
 return observer;
}

// Start on a page: play.html and farm.html begin loading the file early (window.harvestI18n) and hide the page (class i18n-wait)
// until it is translated, so an English text never flashes by.
export async function startTranslation(doc=globalThis.document){
 const code=chosenLanguage(),root=doc?.documentElement;
 const show=()=>root?.classList.remove('i18n-wait');
 if(!root||code==='en'){show();return null;}
 try{
  const dict=await(globalThis.harvestI18n?.code===code?globalThis.harvestI18n.load:fetch(`/i18n/${code}.json`).then(response=>{if(!response.ok)throw new Error(String(response.status));return response.json();}));
  const translator=createTranslator(dict,code);
  root.lang=code;
  translateDocument(doc,translator);
  globalThis.harvestI18nMissing=translator.missing;
  return translator;
 }catch{return null;}
 finally{show();}
}
