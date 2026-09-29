// Translating the game (29 Sep 2026). The English texts are in i18n/catalog.json (scripts/i18n-extract.mjs); a language's
// translations are in public/i18n/<code>.json: {"English text": "translation"}, which the game loads (public/i18n.js).
//
//   node scripts/i18n.mjs status                 how far every language is
//   node scripts/i18n.mjs next <code> [count]    the next texts to translate, as "id|English" lines (in the order of the files)
//   node scripts/i18n.mjs apply <code> <file>    add translations written as "id|translation" lines
//
// A translation keeps every {0}, {1}, ... of the English text. Where a language needs more forms for a number, a translation may be
// {"one":"...","few":"...","many":"...","other":"..."} (Intl.PluralRules names; the first number in the text decides).
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {LANGUAGES} from '../public/languages.js';

const ROOT=new URL('../',import.meta.url);
const readJson=(path,fallback)=>existsSync(new URL(path,ROOT))?JSON.parse(readFileSync(new URL(path,ROOT),'utf8')):fallback;
export const catalog=()=>readJson('i18n/catalog.json',{});
export const translations=code=>readJson(`public/i18n/${code}.json`,{});

// A short, stable id for an English text (FNV-1a, base 36).
export function textId(text){let h=0x811c9dc5;for(const ch of text){h^=ch.codePointAt(0);h=Math.imul(h,0x01000193)>>>0;}return h.toString(36).padStart(7,'0');}
const holes=text=>[...new Set(text.match(/\{\d+\}/g)??[])].sort().join(',');

// What is wrong with a translation of an English text ('' when it is fine).
export function problem(english,out){
 const forms=out&&typeof out==='object'?Object.entries(out):[['',out]];
 if(!forms.length)return 'empty';
 for(const [form,text] of forms){
  if(typeof text!=='string'||!text.trim())return `empty${form?` (${form})`:''}`;
  if(form&&!['zero','one','two','few','many','other'].includes(form))return `unknown form ${form}`;
  const want=holes(english),got=holes(text);
  // A plural form may leave out the number itself ("one" in some languages), never add a part.
  if(got!==want&&!(form&&want.split(',').filter(Boolean).every(h=>got.includes(h)||h==='{0}')&&got.split(',').filter(Boolean).every(h=>want.includes(h))))return `parts ${want||'none'} became ${got||'none'}${form?` (${form})`:''}`;
  if(/\n/.test(text))return 'a line break';
 }
 if(forms.length>1&&!out.other)return 'no "other" form';
 return '';
}

function save(code,done){
 const order=Object.keys(catalog());
 const sorted=Object.fromEntries(order.filter(key=>key in done).map(key=>[key,done[key]]));
 writeFileSync(new URL(`public/i18n/${code}.json`,ROOT),JSON.stringify(sorted,null,0).replace(/,"(?=[^"]*":)/g,',\n"').replace(/^\{/,'{\n')+'\n');
}

function next(code,count){
 const all=catalog(),done=translations(code);
 // In the order of the files, so texts from one screen stay together.
 const todo=Object.entries(all).filter(([key])=>!(key in done)).sort((a,b)=>a[1]<b[1]?-1:a[1]>b[1]?1:0).slice(0,count);
 let file='';
 for(const [key,source] of todo){if(source!==file){file=source;console.log(`# ${file}`);}console.log(`${textId(key)}|${key}`);}
 console.log(`# ${todo.length} shown, ${Object.keys(all).filter(key=>!(key in done)).length} left`);
}

function apply(code,path){
 const all=catalog(),byId=new Map(Object.keys(all).map(key=>[textId(key),key])),done=translations(code),errors=[];let added=0;
 for(const line of readFileSync(path,'utf8').split('\n')){
  if(!line.trim()||line.startsWith('#'))continue;
  const at=line.indexOf('|');const id=line.slice(0,at).trim(),value=line.slice(at+1).trim();
  const english=byId.get(id);if(!english){errors.push(`${id}: unknown id`);continue;}
  let out=value;if(value.startsWith('{"')){try{out=JSON.parse(value);}catch{errors.push(`${id}: broken forms`);continue;}}
  const wrong=problem(english,out);if(wrong){errors.push(`${id}: ${wrong} — ${english}`);continue;}
  if(!(english in done))added++;
  done[english]=out;
 }
 save(code,done);
 console.log(`${added} added to public/i18n/${code}.json`);
 if(errors.length){console.log(`${errors.length} not added:`);for(const e of errors)console.log(`  ${e}`);process.exitCode=1;}
}

function status(){
 const all=Object.keys(catalog());
 for(const {code,name,ready} of LANGUAGES){
  if(code==='en')continue;
  const done=translations(code),have=all.filter(key=>key in done).length;
  console.log(`${code} ${name.padEnd(12)} ${String(have).padStart(5)}/${all.length}${ready?' (in the game)':''}`);
 }
}

if(import.meta.url===`file://${process.argv[1]}`){
 const [command,code,arg]=process.argv.slice(2);
 if(command==='next')next(code,Number(arg??200));
 else if(command==='apply')apply(code,arg);
 else status();
}
