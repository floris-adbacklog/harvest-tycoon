import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createTranslator,chosenLanguage,startTranslation,LANGUAGE_KEY,codeTranslator,t} from '../public/i18n.js';
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
 // Texts the code puts together itself.
 const u=createTranslator({'Wheat':'Trigo','High demand':'Mucha demanda','Feed Mill':'Molino de piensos','Mix barley feed':'Mezcla pienso de cebada','Quick delivery':'Reparto rápido','· {0} expected.':'· se espera {0}.'},'es');
 assert.equal(u.translate('8/12 Wheat'),'8/12 Trigo');assert.equal(u.translate('+2 wheat'),'+2 trigo');
 assert.equal(u.translate('· high demand expected.'),'· se espera mucha demanda.','a known text in lower case stays lower case');
 assert.equal(u.translate('Feed Mill, Mix barley feed'),'Molino de piensos, Mezcla pienso de cebada');
 assert.equal(u.translate('Quick delivery ·'),'Reparto rápido ·');
 assert.equal(u.translate('Feed Mill, something else'),null,'only when every part is known');
 assert.equal(createTranslator({'Wheat':'Weizen'},'de').translate('+2 wheat'),'+2 Weizen','German nouns keep their capital');
});

test('English farmers load no translation; the device language picks a translated language, a choice in Settings wins',async()=>{
 const saved=Object.getOwnPropertyDescriptor(globalThis,'navigator'),store=new Map();
 globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 try{
  Object.defineProperty(globalThis,'navigator',{value:{languages:['sv-SE','en-GB']},configurable:true});
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
 // 1 Oct 2026: a label with a colon and a word with a hyphen looked like a storage key or an id and stayed English.
 for(const key of ['Goal: {0}','Now:','You:','Co-leader'])assert.ok(key in now,key);
 assert.ok(!Object.keys(now).some(k=>/^[a-z][\w-]*:(\{\d+\})?$/.test(k)),'a storage key is no text');
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

test('a text box keeps what a farmer types, but its hint and label are the game\'s and get translated (1 Oct 2026)',()=>{
 const src=readFileSync(new URL('../public/i18n.js',import.meta.url),'utf8');
 assert.match(src,/const KEEP_ATTRS=KEEP\.split\(','\)\.filter\(s=>s!=='textarea'\)\.join\(','\);/);
 assert.match(src,/if\(!value\|\|!\/\\p\{L\}\/u\.test\(value\)\|\|skipAttr\(element\)\)return;/,'attributes use the list without textarea');
 assert.match(src,/acceptNode:node=>node\.nodeType===1&&node\.matches\(KEEP\)\?\(attrs\(node\),2\):1/,'a kept element still has its hint translated, never its text');
});

// Oct 2026: texts the page never shows as text (the words on the Share my farm picture, the share sheet's text) are translated in code.
test('t(): the whole English text looked up, its parts filled in as they are, numbers the language\'s way, English without a file',()=>{
 assert.equal(t('Level {0}',12),'Level 12','English (or no file yet): the English text, filled in');
 assert.equal(t('Something {0} new',1250),'Something 1,250 new');
 const es=codeTranslator({'Level {0}':'Nivel {0}','Wheat':'Trigo','{0}’s farm':'La granja de {0}'},'es');
 assert.equal(es('Level {0}',12),'Nivel 12');assert.equal(es('{0}’s farm','Wheat'),'La granja de Wheat','a part is never translated: a farmer called Wheat stays Wheat');
 assert.equal(es('Not in the file {0}','x'),'Not in the file x','a missing text stays English');
 const nl=codeTranslator({'{0} diamonds at level {1}':{one:'{0} diamant op level {1}',other:'{0} diamanten op level {1}'}},'nl');
 assert.equal(nl('{0} diamonds at level {1}',1,10),'1 diamant op level 10');assert.equal(nl('{0} diamonds at level {1}',150,10),'150 diamanten op level 10');
 assert.equal(codeTranslator({'{0} coins':'{0} Münzen'},'de')('{0} coins',1250),'1.250 Münzen','the German thousands');
 assert.match(readFileSync(new URL('../public/i18n.js',import.meta.url),'utf8'),/const translator=createTranslator\(dict,code\);codeText=codeTranslator\(dict,code\);/,'the same file as the page');
});
