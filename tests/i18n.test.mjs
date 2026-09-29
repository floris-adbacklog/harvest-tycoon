import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createTranslator,chosenLanguage,startTranslation,LANGUAGE_KEY} from '../public/i18n.js';
import {LANGUAGES} from '../public/languages.js';
import {extract} from '../scripts/i18n-extract.mjs';
import {catalog,translations,problem} from '../scripts/i18n.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 29 Sep 2026: the game speaks more languages through a translation layer (public/i18n.js) over the English page.
test('the translator: exact texts, texts with changing parts, a known name inside them, number forms and " · " lists',()=>{
 const t=createTranslator({
  'Settings':'Ajustes','Wheat':'Trigo','Harvested {0} {1}':'Cosechaste {0} {1}','{0} of {1} quests done':'{0} de {1} misiones hechas',
  '{0} coins':{one:'{0} moneda',other:'{0} monedas'},'Ready':'Listo','{0} left':'Quedan {0}'
 },'es');
 assert.equal(t.translate('Settings'),'Ajustes');
 assert.equal(t.translate('Harvested 3 Wheat'),'Cosechaste 3 Trigo','the crop in the text is translated too');
 assert.equal(t.translate('2 of 12 quests done'),'2 de 12 misiones hechas');
 assert.equal(t.translate('1 coins'),'1 moneda');assert.equal(t.translate('1,250 coins'),'1,250 monedas');
 assert.equal(t.translate('Ready · 5m left'),'Listo · Quedan 5m');
 assert.equal(t.translate('Something new'),null);assert.ok(t.missing.has('Something new'));
});

test('English farmers load no translation; the device language picks a translated language, a choice in Settings wins',async()=>{
 const saved=Object.getOwnPropertyDescriptor(globalThis,'navigator'),store=new Map();
 globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 try{
  Object.defineProperty(globalThis,'navigator',{value:{languages:['nl-NL','en-GB']},configurable:true});
  assert.equal(chosenLanguage(),'en');
  let fetched=false;globalThis.fetch=()=>{fetched=true;return Promise.reject(new Error('no'));};
  const classes=new Set(['i18n-wait']);
  assert.equal(await startTranslation({documentElement:{classList:{remove:c=>classes.delete(c)}}}),null);
  assert.equal(fetched,false,'no file is loaded for English');assert.equal(classes.size,0,'the page is shown');
  store.set(LANGUAGE_KEY,'en');assert.equal(chosenLanguage(),'en');
  for(const {code,ready} of LANGUAGES.filter(l=>l.code!=='en')){
   store.clear();Object.defineProperty(globalThis,'navigator',{value:{languages:[`${code}-XX`,'en']},configurable:true});
   assert.equal(chosenLanguage(),ready?code:'en',code);
  }
 }finally{
  delete globalThis.localStorage;delete globalThis.fetch;
  if(saved)Object.defineProperty(globalThis,'navigator',saved);else delete globalThis.navigator;
 }
});

test('both pages start the translation first, and the early script knows the same translated languages',()=>{
 for(const page of ['public/play.html','public/farm.html'])assert.match(read(page),/<meta charset="utf-8"><script src="\/i18n-boot\.js"><\/script>/i,page);
 const ready=LANGUAGES.filter(l=>l.ready&&l.code!=='en').map(l=>l.code);
 assert.match(read('public/i18n-boot.js'),new RegExp(`var READY=' ${ready.map(c=>`${c} `).join('')}';`));
 assert.match(read('public/game.js'),/\nstartTranslation\(\);\n/);
 assert.match(read('src/main.js'),/\nstartTranslation\(\);\n/);
 // What players write themselves is never translated.
 assert.match(read('src/chat-ui.js'),/<span translate="no">\$\{m\.sender_staff\?linkify\(m\.body\):esc\(m\.body\)\}<\/span>/);
});

test('every English text a player can see is in i18n/catalog.json (run node scripts/i18n-extract.mjs after changing texts)',()=>{
 const now=extract(),saved=catalog();
 const added=Object.keys(now).filter(k=>!(k in saved)),gone=Object.keys(saved).filter(k=>!(k in now));
 assert.deepEqual({added:added.slice(0,20),gone:gone.slice(0,20)},{added:[],gone:[]});
});

test('a language is only in the game when every text is translated, and every translation keeps the changing parts',()=>{
 const all=Object.keys(catalog());
 for(const {code,ready} of LANGUAGES.filter(l=>l.code!=='en')){
  const done=translations(code);
  if(ready){assert.ok(existsSync(new URL(`../public/i18n/${code}.json`,import.meta.url)),code);assert.deepEqual(all.filter(k=>!(k in done)).slice(0,10),[],`${code}: texts still to translate`);}
  const wrong=Object.entries(done).map(([en,out])=>[en,problem(en,out)]).filter(([,p])=>p);
  assert.deepEqual(wrong.slice(0,10),[],code);
 }
});
