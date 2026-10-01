// The translation layer (29 Sep 2026). The game is written in English. For a farmer who plays in another language this swaps every
// text on screen (text, title, aria-label, placeholder, alt) for its translation as soon as it appears, from
// public/i18n/<code>.json: {"English text": "translation"}. A text with parts that change has {0}, {1}, ... in both
// ("Harvested {0} {1}"); the parts are kept, and a part that is itself a known text (a crop's name) is translated too.
// English farmers never load a translation file: for them nothing on the page changes.
// Players' own words (names, chat, family texts) sit in translate="no" and stay as they are.
import {LANGUAGES,RTL_LANGUAGES} from './languages.js';

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
 // A changing part that is a known text (a crop, a building) is translated as well, and so is one that is a text with its own
 // changing parts ("8 / 40 fields" inside "Level 1 · 8 / 40 fields", 1 Oct 2026).
 const part=value=>{const key=value.trim();if(!key)return value;const hit=known(key)??(/\p{L}/u.test(key)&&/\d/.test(key)?translate(key,true):null);return hit?value.replace(key,hit):value;};
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

// Numbers the game writes the English way (1,456 coins, 1.6×, 24.9K) in the language's own notation (29 Sep 2026): its thousands
// separator (1.456, 1 456) and a decimal comma where it uses one. Only the English forms change: a dot with three digits after it
// is a translator's thousands (1.000), never an English decimal, and no translation holds an English "1,456". Japanese and Hindi
// write numbers as English does. Returns null when nothing needs changing.
export function localNumbers(code){
 // Arabic and Chinese games write numbers the English way too (1,456; Western digits), as Japanese and Hindi do.
 if(!code||['en','ja','hi','ar','zh'].includes(code)||typeof Intl==='undefined')return null;
 const whole=new Intl.NumberFormat(code,{maximumFractionDigits:0});
 const decimal=new Intl.NumberFormat(code).formatToParts(1.5).find(part=>part.type==='decimal')?.value??'.';
 return text=>text
  .replace(/(?<![\d.,])\d{1,3}(?:,\d{3})+(?![\d.,])/g,match=>whole.format(Number(match.replace(/,/g,''))))
  .replace(/(?<![\d.,])(\d+)\.(\d{1,2})(?![\d.,])/g,`$1${decimal}$2`);
}

// Right to left (Arabic, 1 Oct 2026): a number with a sign, a slash, a percent or a times sign keeps its own order ("0 / 3", "+10",
// "60%", "×2", a date like 05-07-2026) inside a sentence that runs right to left; Unicode isolates hold it left to right. Taken off first, so a text that
// is written again never gets them twice.
const ISOLATE=/\d{1,4}-\d{1,2}-\d{1,4}|[+\-−×]\d[\d.,]*[%×KMk]?|\d[\d.,]*[%×KMk]?\s*\/\s*[+\-−]?\d[\d.,]*[%×KMk]?|\d[\d.,]*%/g;
export const isolateNumbers=text=>text.replace(/[\u2066\u2069]/g,'').replace(ISOLATE,match=>`\u2066${match}\u2069`);
// Keep a document translated: everything in it now, and every text that is added or changed later.
export function translateDocument(doc,translator){
 const written=new WeakMap(),attrsWritten=new WeakMap(),numbers=localNumbers(translator.code),rtl=RTL_LANGUAGES.includes(translator.code);
 const skip=element=>!element||element.closest(KEEP);
 function text(node){
  const data=node.data;
  if(written.get(node)===data||skip(node.parentElement))return;
  let next=data;
  if(/\p{L}/u.test(data)){
   const key=normalize(data),out=key?translator.translate(key):null;
   if(out!=null&&out!==key)next=data.match(/^\s*/)[0]+out+data.match(/\s*$/)[0];
  }
  if(numbers&&/\d/.test(next))next=numbers(next);
  if(rtl&&/\d/.test(next))next=isolateNumbers(next);
  if(next===data)return;
  written.set(node,next);node.data=next;
 }
 function attr(element,name){
  const value=element.getAttribute(name);if(!value||!/\p{L}/u.test(value)||skip(element))return;
  let done=attrsWritten.get(element);if(done?.[name]===value)return;
  let out=translator.translate(normalize(value));if(out==null)return;
  if(numbers&&/\d/.test(out))out=numbers(out);
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
  root.lang=code;root.dir=RTL_LANGUAGES.includes(code)?'rtl':'ltr';
  translateDocument(doc,translator);
  globalThis.harvestI18nMissing=translator.missing;
  return translator;
 }catch{return null;}
 finally{show();}
}
