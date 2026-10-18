// Players' own names stay as typed in every language (17 Oct 2026). The page's translation (public/i18n.js) swaps every text that is
// also one of the game's, alone or as a changing part of a sentence: a farmer called "Sunny Acres" (the name of a music track, and of
// every new farmer's default name) showed as "Zonnige Akkers" in Dutch. A name alone sits in translate="no" (ownWords); a sentence
// with a name in it is translated in code with the name held out and filled in as typed (translateText's names, ownLine, setOwnText);
// a toast or a notice holds the names it is given. Checked here with the real Dutch, Russian and Arabic translations, run over the
// game's own markup as the page runs them (tests/helpers/mini-dom.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {miniDocument,NoMutations,shownText,shownAttrs} from './helpers/mini-dom.mjs';
import {createTranslator,translateDocument,startTranslation,translateText,ownWords,ownLine,ownText,setOwnText,LANGUAGE_KEY} from '../public/i18n.js';
import {toastParts} from '../public/toast-ui.js';
import {renderFamilyProfile} from '../public/family-profile.js';
import {renderFamilyInvitation,renderSentInvitations} from '../public/family-invitations-ui.js';
import {renderPlayerProfile,renderPlayerSearch,renderLogEntries} from '../src/player-profiles.js';
import {familyProfile,emptyFamilyContext,familyWeek,createFarm,xpForLevel} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Names that are also texts of the game in all three languages: a music track (and the default names' first words), a crop, a button.
const NAMES=['Sunny Acres','Wheat','Harvest'];
const LANGUAGES=['nl','ru','ar'];
const dicts=Object.fromEntries(LANGUAGES.map(code=>[code,JSON.parse(read(`public/i18n/${code}.json`))]));
const fill=(text,...values)=>text.replace(/\{(\d+)\}/g,(all,i)=>values[i]);
// Text to compare: without the marks that hold numbers left to right in Arabic (isolateNumbers), the dot the page shows as a wide space
// (undot) and any run of spaces as one (as shownText reads the page).
const plain=text=>String(text).replace(/[\u2066-\u2069]/g,'').replace(/ · /g,' ').replace(/\s+/g,' ');
// The page in that language: the farmer's choice saved, the file already loaded (public/i18n-boot.js), the page translated.
async function speak(code){
 const store=new Map([[LANGUAGE_KEY,code]]);
 globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};
 globalThis.MutationObserver=NoMutations;globalThis.harvestI18n={code,load:Promise.resolve(dicts[code])};
 await startTranslation(miniDocument(''));
 return createTranslator(dicts[code],code);
}
// What a farmer in that language sees of some markup: the page's translation run over it.
function shown(html,translator){const doc=miniDocument(html);translateDocument(doc,translator);return {text:shownText(doc),attrs:shownAttrs(doc)};}
const emblem=()=>'<span class="family-emblem"></span>';
const actionButton=(type,label)=>`<button type="button" data-family-action="${type}">${label}</button>`;
// A family called "Harvest" with farmers called "Sunny Acres" and "Wheat" (game/farm-state.js familyProfile, as farm-api reads it).
function profile(){
 const now=Date.UTC(2026,9,17,12),week=familyWeek(now),c=emptyFamilyContext();
 c.families=[{id:'f1',name:'Harvest',emblem:'5',join_mode:'request',created_at:'2026-09-18T10:00:00Z'}];
 c.members=[{player_id:'a',family_id:'f1',role:'leader'},{player_id:'b',family_id:'f1',role:'member'}];
 c.players=[{player_id:'a',username:'Sunny Acres',level:30,online:true},{player_id:'b',username:'Wheat',level:12}];
 c.chests=[{family_id:'f1',week,points:1600}];
 const farm=createFarm(now);farm.xp=xpForLevel(20);
 return familyProfile(c,'f1','x',farm,now);
}

test('English: no translation, the sentence as written, and a sentence with a name in it is kept from the page as a whole',()=>{
 assert.equal(translateText('Sunny Acres joined your family.',['Sunny Acres']),null,'no translation file for English');
 assert.equal(ownLine('Sunny Acres joined your family.',['Sunny Acres']),'<span translate="no">Sunny Acres joined your family.</span>');
 assert.equal(ownLine('Welcome back!',['Sunny Acres']),'Welcome back!','no name in it: the page translates it as any text');
 assert.equal(ownWords('<b>Sunny</b>'),'<span translate="no">&lt;b&gt;Sunny&lt;/b&gt;</span>','escaped');
 assert.equal(ownText('Ready · Sunny Acres',['Sunny Acres']),'Ready  Sunny Acres','no middle dot on screen, as the page does');
 const el={attrs:{},textContent:'',setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];}};
 setOwnText(el,'Sunny Acres is blocked.',['Sunny Acres']);assert.deepEqual([el.textContent,el.attrs.translate],['Sunny Acres is blocked.','no']);
 setOwnText(el,'Thanks, a moderator will take a look.',['Sunny Acres']);assert.deepEqual([el.textContent,el.attrs.translate],['Thanks, a moderator will take a look.',undefined],'the next note is the page\'s again');
});

for(const code of LANGUAGES){
 test(`${code}: a name that is also a text of the game stays as typed, the sentence around it is translated`,async()=>{
  const t=await speak(code),dict=dicts[code];
  // The bug this pins: the page translates such a name, alone and inside a sentence.
  assert.equal(shown('<p>Sunny Acres</p>',t).text,dict['Sunny Acres']);
  assert.equal(translateText('Sunny Acres joined your family.'),fill(dict['{0} joined your family.'],dict['Sunny Acres']));
  for(const name of NAMES){
   for(const [english,key] of [[`${name} joined your family.`,'{0} joined your family.'],[`Welcome to ${name}!`,'Welcome to {0}!'],[`${name} is now a member.`,'{0} is now a member.'],[`${name}: family profile`,'{0}: family profile'],[`Open ${name}’s profile`,'Open {0}’s profile']]){
    assert.equal(translateText(english,[name]),fill(dict[key],name),`${code}: ${english}`);
    assert.equal(ownText(english,[name]),fill(dict[key],name));
   }
   // In the page: alone, and in a sentence.
   const page=shown(`<div><h3>Farmers</h3><strong>${ownWords(name)}</strong><p>${ownLine(`${name} joined your family.`,[name])}</p></div>`,t);
   assert.equal(page.text,`${dict.Farmers}${name}${fill(dict['{0} joined your family.'],name)}`,`${code}: ${name}`);
  }
  // Two names, one of them a crop that is also a changing part of the sentence: only the farmer's name is held, the crop translated.
  assert.equal(translateText('You sent 4 Wheat to Sunny Acres.',['Sunny Acres']),fill(dict['You sent {0} {1} to {2}.'],'4',dict.Wheat,'Sunny Acres'));
  // A name's digits never pick the form of the number after it ("Betty 2026", family-idle-leave's sentence): the days do.
  assert.equal(translateText('You left Betty 2026 after 31 days away.',['Betty 2026']),fill(typeof dict['You left {0} after {1} days away.']==='string'?dict['You left {0} after {1} days away.']:dict['You left {0} after {1} days away.'][new Intl.PluralRules(code).select(31)]??dict['You left {0} after {1} days away.'].other,'Betty 2026','31'));
  // Only a whole name counts: "Ann" is not held inside "Anna".
  assert.equal(translateText('Anna joined your family.',['Ann']),translateText('Anna joined your family.'));
  // A name with a game text after it ("Sunny Acres: 40% done", the event standings): the sentence as the translations have it, and a
  // name glued to a text they know on its own (": ") keeps the rest translated.
  assert.equal(plain(translateText('Sunny Acres: 40% done',['Sunny Acres'])),plain(fill(dict['{0}: {1}% done'],'Sunny Acres','40')));
  assert.equal(translateText('Sunny Acres: Farmers',['Sunny Acres']),`Sunny Acres: ${dict.Farmers}`);
  // A toast or a notice (farm-api's "… joined your family.", a gift sent): held, shown as typed, kept from the page.
  const toast=toastParts('Sunny Acres joined your family.',translateText,['Sunny Acres']);
  assert.equal(toast.local,true);assert.equal(toast.html,fill(dict['{0} joined your family.'],'Sunny Acres'));
  assert.ok(toastParts('Sunny Acres joined your family.').html.includes(dict['Sunny Acres']),'without its names the toast translated the name');
 });

 test(`${code}: the game's own screens show the farmers' and the family's names as typed`,async()=>{
  const t=await speak(code),dict=dicts[code];
  const kept=(page,what)=>{for(const name of NAMES){assert.ok(page.text.includes(name)||page.attrs.some(a=>a.includes(name)),`${code} ${what}: ${name} shown`);assert.ok(!page.text.includes(dict[name]),`${code} ${what}: ${name} not translated to ${dict[name]}`);}};
  // A family's profile: the family's name, its farmers.
  const family=shown(renderFamilyProfile(profile(),{emblem,now:Date.UTC(2026,9,17,12)}),t);
  kept(family,'family profile');assert.ok(family.text.includes(dict.Farmers),'the heading is translated');
  // An invitation, and the invitations a leader sent.
  const view={config:{maxMembers:10},family:{manager:true},invitation:{family:{name:'Harvest',emblem:'5',members:2},invitedBy:'Sunny Acres',canAccept:true,expiresAt:Date.now()+86400000,id:'i1'},sentInvitations:[{id:'s1',username:'Wheat',expiresAt:Date.now()+86400000}]};
  const invited=shown(renderFamilyInvitation(view,Date.now(),emblem,actionButton)+renderSentInvitations(view,Date.now(),actionButton),t);
  assert.ok(plain(invited.text).includes(plain(fill(dict['Invited by {0} · {1} / {2} farmers'],'Sunny Acres','2','10'))),`${code}: the invitation's line, translated around the name`);
  assert.ok(invited.text.includes('Harvest')&&invited.text.includes('Wheat')&&!invited.text.includes(dict['Sunny Acres']));
  assert.ok(!invited.text.includes('YOU ARE INVITED'),'no small-capitals line over the invitation (18 Oct 2026, the window shell)');
  // A farmer's profile and the search: the farmer, their family, the family button's label; the staff member in the log.
  const farmer=shown(renderPlayerProfile({playerId:'a',username:'Sunny Acres',level:30,online:true,stats:{},badges:[],family:{id:'f1',name:'Harvest',emblem:'5',role:'Leader'}}),t);
  assert.ok(farmer.text.includes('Sunny Acres')&&farmer.text.includes('Harvest'));assert.ok(!farmer.text.includes(dict['Sunny Acres'])&&!farmer.text.includes(dict.Harvest));
  assert.ok(farmer.attrs.includes(fill(dict['{0}: family profile'],'Harvest')),`${code}: the family button's label in the language, the name as typed`);
  const search=shown(renderPlayerSearch([{playerId:'b',username:'Wheat',level:12,family:{name:'Sunny Acres'}},{playerId:'c',username:'Harvest',level:3,family:null}]),t);
  kept(search,'player search');assert.ok(search.text.includes(dict['No family yet']));
  const log=shown(renderLogEntries([{id:1,at:new Date().toISOString(),category:'staff',text:'Received a gift from the admin',by:'Wheat'}],Date.now()),t);
  assert.ok(log.text.includes('Wheat')&&!log.text.includes(dict.Wheat),`${code}: the staff member in the log`);
 });
}

test('every place a name reaches the screen uses the shared way (the screens above, and the ones the page builds in place)',()=>{
 const has=(file,re,why)=>assert.match(read(file),re,`${file}: ${why}`);
 // The family window, its profile, the invitations, sharing.
 has('public/family-ui.js',/<strong>\$\{ownWords\(m\.username\)\}\$\{vipBadge\(/,'a member');
 has('public/family-ui.js',/<div><strong>\$\{ownWords\(r\.username\)\}<\/strong>/,'a farmer asking to join');
 has('public/family-ui.js',/<summary translate="no" aria-label="\$\{esc\(ownText\(`Options for \$\{m\.username\}`,\[m\.username\]\)\)\}">/,'a member\'s menu');
 has('public/family-ui.js',/\$\{ownLine\(`You asked to join \$\{mine\.family\.name\}\./,'the family you asked to join');
 has('public/family-ui.js',/:result\.message,\{names:\[\.\.\.names,\.\.\.namesIn\(view\)\]\}\)/,'farm-api\'s answers ("… joined your family.")');
 has('public/family-ui.js',/catch\(e\)\{error=e\.message;notify\(error,\{names\}\);\}/,'and its refusals');
 has('public/family-ui.js',/setOwnText\(document\.getElementById\('family-feedback'\),error,/,'the refusal under the window');
 has('public/family-profile.js',/<strong>\$\{ownWords\(m\.username\)\}\$\{vipBadge\(/,'a member');
 has('public/family-invitations-ui.js',/names:\(\)=>players\.map\(p=>p\.username\)/,'the farmers found, for "Invitation sent to …"');
 has('public/social-ui.js',/<strong>\$\{ownWords\(m\.name\)\}<\/strong>/,'a member to help');
 has('public/social-ui.js',/\$\{ownLine\(mine\?`You need \$\{r\.quantity\} \$\{itemName\(r\.item\)\}`:`\$\{r\.name\} needs/,'a request');
 has('public/social-ui.js',/showCenterNotice\(host,message,\{refused,names\}\);else notify\?\.\(message,\{names\}\);/,'"You sent … to Sunny Acres."');
 has('public/invite-ui.js',/<strong>\$\{ownWords\(f\.name\)\}<\/strong>/,'a friend you invited');
 has('public/invite-ui.js',/\$\{ownLine\(invitedBy\.rewarded\?/,'who invited you');
 has('public/live-events-ui.js',/<strong>\$\{ownWords\(r\.username\)\}\$\{vipBadge\(/,'the event standings');
 has('public/live-events-ui.js',/aria-label="\$\{esc\(ownText\(`Open \$\{r\.username\}’s profile`,\[r\.username\]\)\)\}"/,'and their label');
 has('public/game.js',/setOwnText\(\$\('gift-title'\),title,names\);/,'"Thanks to … !"');
 has('public/game.js',/title:`Thanks to \$\{reward\.from\}!`,icon:'invite-friends',names:\[reward\.from\]/,'who invited you');
 has('public/discord-link-ui.js',/setOwnText\(copy,linkQuestion\(who,name\),\[who,name\]\);/,'the Discord question');
 has('public/discord-link-ui.js',/tone:'danger',names:\[name\]\}/,'the Discord farm to delete');
 has('public/wiki-ui.js',/\$\{ownLine\(`Nothing found for “\$\{q\}”\./,'what the farmer searched for');
 has('public/confirm-dialog.js',/setOwnText\(dialog\.querySelector\('h2'\),title,own\);setOwnText\(dialog\.querySelector\('p'\),description,own\);/,'a confirmation\'s question and line');
 has('public/toast-ui.js',/const local=translate\?\.\(text,names\);/,'a toast holds its names');
 has('public/center-notice.js',/toastParts\(message,undefined,names\)/,'a notice too');
 // The chat.
 has('src/chat-ui.js',/data-profile="\$\{esc\(id\)\}" translate="no" aria-label="\$\{esc\(ownText\(label,\[name\]\)\)\}"/,'a profile button');
 for(const card of ['asks for','is now the top farmer of the week.','was removed from the family.','is now a member.'])has('src/chat-ui.js',new RegExp(`ownLine\\(\`?[^)]*${card.replace(/\./g,'\\.')}`),`the "${card}" card`);
 has('src/chat-ui.js',/<p class="chat-text">\$\{ownLine\(text,\[m\.sender_name\]\)\}<\/p>/,'a new rank');
 has('src/chat-ui.js',/<strong>\$\{ownWords\(t\.otherName\)\}\$\{t\.otherVip\?VIP:''\}<\/strong>/,'a private chat in the list');
 has('src/chat-ui.js',/<strong>\$\{ownWords\(p\.username\)\}<\/strong><small>Level \$\{esc\(p\.level\)\}\$\{p\.family\?` · \$\{ownWords\(p\.family\.name\)\}`:''\}<\/small>/,'a farmer found');
 has('src/chat-ui.js',/ownLine\(n\.body,noticeNames\(n\.body\)\)/,'farm-api\'s notices with names');
 has('src/chat-ui.js',/input\.setAttribute\('translate','no'\);input\.placeholder=ownText\(hint,compose\.names\);/,'"Message Sunny Acres…"');
 has('src/chat-ui.js',/note\(on\?`\$\{name\} is blocked\.`:`\$\{name\} is unblocked\.`,\[name\]\)/,'a note');
 has('src/chat-ui.js',/title\.setAttribute\('aria-label',ownText\(`Chat with \$\{thread\.otherName\}`,\[thread\.otherName\]\)\)/,'the private chat\'s heading');
 // The leaderboard, profiles, the account, the invite on the sign-in page.
 has('src/leaderboard.js',/typed\.setAttribute\('translate','no'\);typed\.textContent=row\.username;/,'a farmer on the board');
 has('src/leaderboard.js',/setOwnText\(value,category==='level'\?/,'your own line');
 has('src/player-profiles.js',/<h3>\$\{ownWords\(player\.username\)\}\$\{vipBadge\(/,'a profile');
 has('src/player-profiles.js',/setOwnText\(button,sent\?'Invited':label,\[offer\.familyName\]\)/,'"Invite to <family>"');
 has('src/ui.js',/setOwnText\(\$\('player-name'\),profile\?profile\.username:'Pick your farmer name',\[profile\?\.username\]\);/,'your farmer name in Settings');
 has('src/ui.js',/<b id="name-nudge-current" translate="no">/,'your default name');
 has('src/main.js',/setOwnText\(box\.querySelector\('strong'\),text\.title,\[name\]\);setOwnText\(box\.querySelector\('span'\),text\.body,\[name\]\);/,'the friend who invited you');
 has('src/account-delete.js',/typeToConfirm:farmer,names:\[farmer\]/,'the name to type');
});

test('no name escaped straight into the page outside a kept element (the staff screens stay English and are kept as a whole)',()=>{
 const files=[...readdirSync(new URL('../public/',import.meta.url)).filter(f=>f.endsWith('.js')).map(f=>`public/${f}`),...readdirSync(new URL('../src/',import.meta.url)).filter(f=>f.endsWith('.js')&&!f.startsWith('admin-')).map(f=>`src/${f}`)];
 const loose=[];
 for(const file of files){
  const src=read(file);
  for(const m of src.matchAll(/\$\{esc\(([\w?.]*\.(?:username|sender_name|senderName|otherName|invitedBy|fulfilled_name|familyName))\)\}/g)){
   // Kept: the element the name sits in says translate="no", or the button around it does (chat's profile buttons).
   const before=src.slice(Math.max(0,m.index-160),m.index),tag=before.slice(before.lastIndexOf('<'));
   if(/^<[a-z][^>]*translate="no"[^>]*>$/.test(tag))continue;
   loose.push(`${file}: ${m[1]}`);
  }
 }
 assert.deepEqual(loose,[]);
});
