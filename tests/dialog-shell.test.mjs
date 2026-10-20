// The window shell (18 Oct 2026, the owner: "Maak de UI cleaner zonder dat het ten koste gaat van functionaliteit, op browser & mobiel",
// then "Maak het iets moderner, minder AI-gegenereerd ogend"). One frame for every window (public/dialog-shell.css): is-sheet (a window
// with a list or tabs, a bottom sheet on a phone), is-card (a short card in the middle) or is-side (the chat panel and the fishing scene),
// and for a sheet or a card one size (is-s, is-m, is-l). These guards keep it that way.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {SMALL_WINDOW} from '../public/small-window.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const farm=read('public/farm.html'),shell=read('public/dialog-shell.css'),hud=read('public/hud.css');
const PHONE='@media(max-width:900px),(max-height:550px) and (pointer:coarse)';
// Every script that makes a window: the game's own (public/), the cloud script's (src/), not the staff's dashboard (it stays as it is).
const scripts=[...readdirSync(new URL('../public/',import.meta.url)).filter(f=>f.endsWith('.js')).map(f=>`public/${f}`),...readdirSync(new URL('../src/',import.meta.url)).filter(f=>f.endsWith('.js')&&!f.startsWith('admin-')).map(f=>`src/${f}`)];
// The class of every <dialog> written as markup, and of every one made with createElement('dialog') (its className, set on the same line).
function dialogs(){
 const out=[];
 for(const [tag] of farm.matchAll(/<dialog\b[^>]*>/g))out.push({where:'public/farm.html',tag,cls:tag.match(/\sclass="([^"]*)"/)?.[1]??''});
 for(const file of scripts){
  const js=read(file);
  for(const [tag] of js.matchAll(/<dialog\s[^>]*>/g))out.push({where:file,tag,cls:tag.match(/\sclass="([^"]*)"/)?.[1]??''});   // a tag with its attributes (not one named in a comment)
  for(const m of js.matchAll(/createElement\('dialog'\)/g)){
   // Its className follows within a few lines (the Discord box sets it two lines down).
   const near=js.slice(m.index,m.index+900),cls=near.match(/\.className=(?:'([^']*)'|`([^`]*)`)/);
   out.push({where:file,tag:near.slice(0,near.indexOf('\n')).slice(0,160),cls:cls?(cls[1]??cls[2]):''});
  }
 }
 return out;
}
// The selectors of a rule, split at its own commas only (not those inside :is() or :not()).
function split(selectors){const out=[];let depth=0,start=0;for(let i=0;i<selectors.length;i++){const c=selectors[i];if(c==='(')depth++;else if(c===')')depth--;else if(c===','&&!depth){out.push(selectors.slice(start,i).trim());start=i+1;}}out.push(selectors.slice(start).trim());return out.filter(Boolean);}
const shape=cls=>['is-sheet','is-card','is-side'].filter(c=>new RegExp(`(^|\\s)${c}(\\s|$|\\$)`).test(cls));
const size=cls=>['is-s','is-m','is-l'].filter(c=>new RegExp(`(^|\\s)${c}(\\s|$|\\$)`).test(cls));

test('every window has one shape of the shell, and a sheet or a card one size',()=>{
 const all=dialogs();
 assert.ok(all.length>=40,`${all.length} windows found`);
 for(const d of all){
  const shapes=shape(d.cls);
  assert.equal(shapes.length,1,`${d.where}: ${d.tag}`);
  if(shapes[0]!=='is-side')assert.equal(size(d.cls).length,1,`${d.where}: ${d.tag}`);
 }
 // The chat keeps its own panel and the fishing scene its own screen.
 assert.ok(all.some(d=>d.where==='src/chat-ui.js'&&/chat-dialog is-side/.test(d.cls)));
 assert.ok(all.some(d=>d.where==='public/pond-ui.js'&&/pond-view is-side/.test(d.cls)));
 // Confirms and celebrations are small cards; a celebration has the warm glow.
 for(const id of ['welcome-back-dialog','level-up-dialog','rookie-dialog','popup-dialog','collection-cheer','chore-result']){
  const d=all.find(x=>x.tag.includes(`'${id}'`)||x.tag.includes(`"${id}"`));assert.ok(d,id);assert.match(d.cls,/is-card is-s is-cheer/,id);
 }
});

test('no small capitals line above a title: no eyebrow in any heading, and the windows\' titles are the names of their buttons',()=>{
 for(const file of ['public/farm.html',...scripts]){
  const text=read(file);
  for(const [heading] of text.matchAll(/<div class="dialog-heading[^"]*">[^]*?<h2/g))assert.doesNotMatch(heading,/class="eyebrow"/,file);
 }
 for(const [id,title] of [['today-title','Today'],['quests-title','Quests'],['seed-dialog-title','Seeds'],['market-title','Market'],['buildings-dialog-title','Buildings'],['journal-title','Farm journal'],['estate-title','Estate'],['more-title','More'],['boost-title','Boosts']])
  assert.match(farm,new RegExp(`<h2 id="${id}">${title}</h2>`),id);
 assert.match(read('src/ui.js'),/<h2 id="leaderboard-title">Leaderboard<\/h2>/);
 // The shop is called Boosts like the button that opens it (the owner, 18 Oct 2026; it was "Diamonds & boosts"), also where the bonus
 // overview says where VIP is and in the admin's pop-up choices.
 assert.match(farm,/<button class="side-tool" id="boosts-button" aria-haspopup="dialog"><span><i data-lucide="sparkles"><\/i><\/span><b>Boosts<\/b><\/button>/);
 assert.match(farm,/<button data-menu-action="boosts-button"><i data-lucide="gem"><\/i><span><strong>Boosts<\/strong>/);
 assert.match(read('public/bonus-overview.js'),/where:'Boosts'/);assert.match(read('src/popup-ui.js'),/shop:'Boosts'/);
 for(const file of ['public/farm.html',...scripts])assert.doesNotMatch(read(file),/Diamonds &(amp;)? boosts/,file);
 assert.match(read('public/retention-ui.js'),/\$\('utility-title'\)\.textContent='Tractor';/);
});

test('a modal window is never a grid (Safari grew one to its max-height on 29 Sep 2026); one that is flex is so only while it is open',()=>{
 const ids=new Set([...farm.matchAll(/<dialog id="([^"]+)"/g)].map(m=>m[1]));
 for(const file of scripts){for(const m of read(file).matchAll(/(?:(?:dialog|box)\.id='([\w-]+)'|<dialog id="([\w-]+)")/g))ids.add(m[1]??m[2]);}
 const wrong=[];
 for(const file of readdirSync(new URL('../public/',import.meta.url)).filter(f=>f.endsWith('.css')&&f!=='admin-view.css')){
  const css=read(`public/${file}`).replace(/\/\*[^]*?\*\//g,'');
  for(const [,selectors,body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
   if(!/display:\s*(inline-)?grid/.test(body))continue;
   for(const sel of split(selectors)){
    const last=sel.split(/\s+|>/).filter(Boolean).at(-1)??'';
    const isDialog=/^dialog\b/.test(last)||[...ids].some(id=>new RegExp(`#${id}(?![\\w-])`).test(last))||/^(\.game-dialog|\.wide-dialog|\.is-sheet|\.is-card)\b/.test(last);
    if(isDialog&&!/::backdrop/.test(last))wrong.push(`${file}: ${sel}`);
   }
  }
  for(const [,selectors,body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
   if(!/display:\s*flex/.test(body))continue;
   for(const sel of split(selectors)){
    const last=sel.split(/\s+|>/).filter(Boolean).at(-1)??'';
    if([...ids].some(id=>new RegExp(`^#${id}$`).test(last)))wrong.push(`${file}: ${sel} (flex without [open])`);
   }
  }
 }
 assert.deepEqual(wrong,[]);
 assert.match(shell,/dialog\.is-sheet,dialog\.is-card\{\n box-sizing:border-box;/);assert.doesNotMatch(shell,/dialog[^{]*\{[^}]*display:grid/);
});

test('the shell and the farm screen\'s look come last, and no screen sets the padding of a sheet (the shell owns its foot)',()=>{
 const sheets=[...farm.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(sheets.slice(-2),['/dialog-shell.css','/hud.css']);
 const sheetIds=[...farm.matchAll(/<dialog id="([^"]+)" class="[^"]*is-sheet[^"]*"/g)].map(m=>m[1]);
 for(const file of scripts)for(const m of read(file).matchAll(/\.id='([\w-]+)';[^\n]*?className='[^']*is-sheet/g))sheetIds.push(m[1]);
 assert.ok(sheetIds.length>25,sheetIds.join(' '));
 const wrong=[];
 for(const file of readdirSync(new URL('../public/',import.meta.url)).filter(f=>f.endsWith('.css')&&f!=='dialog-shell.css')){
  const css=read(`public/${file}`).replace(/\/\*[^]*?\*\//g,'');
  for(const [,selectors,body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
   if(!/(^|;)\s*padding:/.test(body))continue;
   for(const sel of split(selectors))if(sheetIds.some(id=>new RegExp(`(^|\\s|>)#${id}(\\[[^\\]]*\\])?(:[\\w-]+(\\([^)]*\\))?)*$`).test(sel)))wrong.push(`${file}: ${sel}`);
  }
 }
 assert.deepEqual(wrong,[]);
});

test('the shell: the frame, the heading that stays on top with the opener\'s picture, the round close and back, one badge for what waits',()=>{
 assert.match(shell,/--panel:#fffdf5;--panel-card:#fbf8f3;--panel-line:#e6ddd1;/,'the game\'s own cream');
 assert.match(shell,/\.is-s\{--w:var\(--w-s\)\}\.is-m\{--w:var\(--w-m\)\}\.is-l\{--w:var\(--w-l\)\}/);
 assert.match(shell,/dialog\.is-sheet \.dialog-heading,dialog\.is-card \.dialog-heading\{\n position:sticky;top:calc\(-1\*var\(--panel-pad\)\);/);
 assert.match(shell,/\.back-round::before\{content:"";/);assert.match(shell,/\[dir="rtl"\] \.back-round::before\{rotate:-135deg;/,'the chevron points the other way in Arabic');
 assert.match(shell,/\.badge-wait\{display:inline-grid;/);
 assert.match(shell,/details\.fold>summary\{/);
 // The scroll mark and the heading's height come from one quiet listener (public/dialog-shell.js), imported by the game.
 assert.match(read('public/game.js'),/(^|\n)import '\.\/dialog-shell\.js';\n/);
 assert.match(read('public/dialog-shell.js'),/document\.addEventListener\('scroll',onScroll,\{capture:true,passive:true\}\)/);
 // Logical sides only (RTL): no left or right margins or paddings in the new sheets.
 for(const [name,css] of [['dialog-shell.css',shell],['hud.css',hud]])assert.doesNotMatch(css,/(margin|padding)-(left|right)\s*:/,name);
});

test('phones and small computer windows use the same words as the rest of the game',()=>{
 for(const [name,css] of [['dialog-shell.css',shell],['hud.css',hud]]){
  assert.ok(css.includes(`${PHONE}{`),`${name}: the phone words of mobile-ui.js mobileLayout`);
  assert.ok(css.includes(`@media${SMALL_WINDOW}{`),`${name}: the SMALL_WINDOW words of small-window.js`);
 }
 assert.ok(hud.includes('@media(min-width:901px) and (min-height:551px),(min-width:901px) and (pointer:fine){'),'the computer words of desktop-hud.css');
});

test('the farm screen on a computer: More at the end of the rail, and what moved there is still one tap away in More',()=>{
 assert.match(hud,/\.side-tools #more-button\{display:flex;order:99\}/);
 assert.match(hud,/\.side-tools #invite-button,\.side-tools #leaderboard-button,\.side-tools #boosts-button\{display:none\}/);
 assert.match(hud,/\.topbar \.resources #sound-button,\.topbar \.resources #feedback-button,\.topbar \.resources #help-button\{display:none\}/);
 for(const id of ['invite-button','leaderboard-button','boosts-button','sound-button','feedback-button','help-button'])assert.match(farm,new RegExp(`data-menu-action="${id}"`),id);
 assert.doesNotMatch(hud,/\.brand\{display:none/,'the farm map stays; only the logo in the corner goes');
});

test('the new texts have no middle dot of their own',()=>{
 for(const text of ['Farm production','Village production','Your homestead','Not built yet','Seeds','Levels {0}–{1}','Level {0} rewards','New avatar: pick it in Settings','+1 of each of the {0} crops','Collect within {0}','Deliver 1','+{0}% rewards','Power-ups'])
  assert.doesNotMatch(text,/ · /,text);
});

// The owner's question a (18 Oct 2026): My farm moves the camera back, without a toast; its text is gone from every language.
test('My farm has no toast of its own: the camera move shows it',()=>{
 const game=read('public/game.js');
 assert.match(game,/\$\('farm-button'\)\.addEventListener\('click',\(\)=>\{document\.querySelectorAll\('dialog\[open\]'\)\.forEach\(d=>d\.close\(\)\);if\(villageWorld\)\{travel\('farm'\);return;\}resetView\(\);\}\);/);
 assert.ok(!game.includes('Back to the heart of your farm.'));
 assert.ok(!('Back to the heart of your farm.' in JSON.parse(read('i18n/catalog.json'))));
 for(const file of readdirSync(new URL('../public/i18n/',import.meta.url)).filter(f=>f.endsWith('.json')))assert.ok(!read(`public/i18n/${file}`).includes('Back to the heart of your farm.'),file);
});

// The owner's question b (18 Oct 2026): on a phone Today, Events and the Halloween Pass come into the event rail, right under the top bar
// next to the Special offer, only while something waits there (their own badge); they stay in More; a computer is unchanged.
test('the phone\'s event rail: Today, Events and the pass only while their badge shows, at the right under the top bar; still in More',async()=>{
 const rail=read('public/event-rail.js');
 globalThis.matchMedia??=()=>({matches:true,addEventListener(){}});
 const {RAIL_IDS,WAIT_DOTS,markWaiting}=await import('../public/event-rail.js');
 assert.deepEqual([...RAIL_IDS],['offer-button','today-button','events-button','pass-button','season-button'],'the Season Pass too (Oct 2026)');
 assert.deepEqual({...WAIT_DOTS},{'today-button':'today-dot','events-button':'events-dot','pass-button':'pass-dot','season-button':'season-dot'},'the same signal as their badges');
 // is-waiting follows the badge, whatever the button itself is (a hidden button stays hidden through its own [hidden]).
 const page=Object.fromEntries([['today-button',false],['today-dot',false],['events-button',false],['events-dot',true],['pass-button',true],['pass-dot',false]].map(([id,hidden])=>{const on=new Set();return [id,{hidden,on,classList:{toggle:(n,v)=>v?on.add(n):on.delete(n)}}];}));
 markWaiting({getElementById:id=>page[id]??null});
 assert.deepEqual(['today-button','events-button','pass-button'].map(id=>page[id].on.has('is-waiting')),[true,false,true]);
 page['events-dot'].hidden=false;page['today-dot'].hidden=true;markWaiting({getElementById:id=>page[id]??null});
 assert.deepEqual(['today-button','events-button','pass-button'].map(id=>page[id].on.has('is-waiting')),[false,true,true]);
 assert.doesNotThrow(()=>markWaiting({getElementById:()=>{throw new Error('gone');}}),'never throws');
 // The badges are watched, the buttons move on a phone only and back on a computer.
 assert.match(rail,/badges\.observe\(el,\{attributes:true,attributeFilter:\['hidden'\]\}\)/);
 assert.match(rail,/if\(mobileLayout\.matches\)\{/);assert.match(rail,/home\.parent\.insertBefore\(node,/);
 // hud.css, phone block only: at the right-hand edge under the top bar (under the goal line and the boosts pill), the three hidden
 // unless waiting and not hidden by the page, round, in a fixed order after the offer; their names stay for a screen reader.
 const phone=hud.slice(hud.indexOf(`${PHONE}{\n #active-boosts`));
 assert.match(phone,/#event-rail\{position:fixed;z-index:12;inset-inline-end:max\(10px,env\(safe-area-inset-right\)\);top:calc\(var\(--mobile-top\) \+ 94px\);display:flex;flex-direction:column;/);
 assert.match(phone,/#event-rail>:is\(#today-button,#events-button,#pass-button\)\{display:none\}/);
 assert.match(phone,/#event-rail>:is\(#today-button,#events-button,#pass-button\)\.is-waiting:not\(\[hidden\]\)\{position:relative;display:grid;[^}]*border-radius:50%;/);
 assert.match(phone,/#event-rail #offer-button\{position:static;order:1;/);
 assert.match(phone,/#event-rail>#today-button\{order:2\}#event-rail>#events-button\{order:3\}#event-rail>#pass-button\{order:4\}/);
 assert.match(phone,/#event-rail>\.side-tool>b\{position:absolute;width:1px;height:1px;/);
 assert.doesNotMatch(hud,/#event-rail\{[^}]*bottom:/,'no longer at the bottom');
 // Every rule that places or shows something in the rail is a phone's (upright, or on its side as a row): a computer keeps them where they were.
 const LANDSCAPE='@media(max-height:550px) and (orientation:landscape) and (max-width:900px),(max-height:550px) and (orientation:landscape) and (pointer:coarse)';
 const rules=[];{const css=hud.replace(/\/\*[^]*?\*\//g,''),stack=[];let start=0;for(let i=0;i<css.length;i++){if(css[i]==='{'){const head=css.slice(start,i).trim();if(head.startsWith('@')){stack.push(head);start=i+1;continue;}const end=css.indexOf('}',i);rules.push({media:stack.join(' '),selector:head,body:css.slice(i+1,end)});i=end;start=i+1;}else if(css[i]==='}'){stack.pop();start=i+1;}}}
 const placing=rules.filter(r=>r.selector.includes('#event-rail')&&/(^|;)\s*(display:(grid|flex)|top:|inset-inline[a-z-]*:|flex-direction:|order:)/.test(r.body));
 assert.ok(placing.length>=5);
 for(const r of placing)assert.ok([PHONE,LANDSCAPE].includes(r.media),`${r.media} ${r.selector}`);
 assert.match(rules.find(r=>r.media===LANDSCAPE&&r.selector==='#event-rail').body,/^flex-direction:row-reverse;/,'on its side a row under the boosts pill, the offer at the edge');
 // The red badge, but the streak's flame keeps its own look (#today-dot.is-streak wins over #event-rail em).
 assert.match(hud,/\.side-tools \.side-tool em,#event-rail em,#family-dot,#pass-dot/);
 assert.match(read('public/retention.css'),/#today-dot\.is-streak\{display:grid;/);
 // Still in More, by the same buttons.
 for(const id of ['today-button','events-button','pass-button'])assert.match(farm,new RegExp(`data-menu-action="${id}"`),id);
 // Out of the way while fishing, and never in the admin view.
 assert.match(read('public/pond.css'),/body\.fishing :is\([^)]*#event-rail\)\{opacity:0;visibility:hidden;pointer-events:none\}/);
 assert.match(read('public/admin-view.css'),/html\[data-admin-view\] :is\(#starter-pack-button,#offer-button,#event-rail,/);
 assert.match(read('public/game.js'),/(^|\n)import '\.\/event-rail\.js';\n/);
});

// The review of 18 Oct 2026, after the owner's a to d.
test('every round back button keeps its name for a screen reader: its words in an .sr-only span, as its own text, or an aria-label',()=>{
 let seen=0;
 for(const file of ['public/farm.html',...scripts]){
  for(const m of read(file).matchAll(/<button\b[^>]*class="[^"]*\bback-round\b[^"]*"[^>]*>([^]*?)<\/button>/g)){
   seen++;const tag=m[0].match(/<button\b[^>]*>/)[0],inner=m[1].replace(/<span aria-hidden="true">[^<]*<\/span>/g,'').replace(/<i\b[^>]*><\/i>/g,'');
   assert.ok(/aria-label=/.test(tag)||/<span class="sr-only">[^<]+<\/span>/.test(inner)||/^[^<]*[^\s<][^<]*(<|$)/.test(inner),`${file}: ${m[0].slice(0,160)}`);
  }
 }
 assert.ok(seen>=3,`${seen} round back buttons in markup`);
 // The fishing scene's way back: a chevron, and the place it goes back to for a screen reader (its words were display:none).
 assert.match(read('public/pond-ui.js'),/class="pond-back back-round" data-pond-back><span aria-hidden="true">‹<\/span><span class="sr-only">\$\{lake\?'Village':'My farm'\}<\/span><\/button>/);
 assert.match(read('public/settings-nav.js'),/back\.className='back-button settings-back back-round';back\.hidden=true;back\.innerHTML='<i data-lucide="chevron-left" data-line-icon><\/i>All settings';/);
});

test('no small capitals line in the game\'s windows and cards: no eyebrow outside the staff screens and the outer sign-in page',()=>{
 const outer=new Set(['src/account-form.js','src/main.js']);
 for(const file of scripts.filter(f=>!outer.has(f)))assert.doesNotMatch(read(file),/class=\\?["']eyebrow\b/,file);
 assert.doesNotMatch(farm,/class="eyebrow\b/);
 // The small label over a name says it in its own words, not in spaced capitals: Your league, Farmer name, Planting.
 const retention=read('public/retention.css');
 for(const sel of ['.event-league>div>span','#sound-dialog .account-who small','.tractor-seed small']){const rule=retention.slice(retention.indexOf(`${sel}{`)).split('}')[0];assert.ok(rule.startsWith(`${sel}{`),sel);assert.doesNotMatch(rule,/uppercase/,sel);}
 // The Family Chest's bonus is a quiet tag now.
 assert.match(read('public/family-ui.js'),/\$\{bonus\?`<span class="tag-info">\+\$\{bonus\}% rewards<\/span>`:''\}/);
});

test('the review\'s fixes on the farm screen: the camera row clear of the dock, the chat panel the full phone width, the quick Claim never while fishing',()=>{
 // Under 1100 px a computer's dock reaches the camera row's corner: the row sits above the dock.
 assert.match(hud,/@media\(min-width:901px\) and \(max-width:1099px\) and \(min-height:551px\),\(min-width:901px\) and \(max-width:1099px\) and \(pointer:fine\)\{\n \.scene-controls\{bottom:124px\}\n\}/);
 assert.ok(hud.indexOf('.scene-controls{bottom:124px}')>hud.indexOf(' .scene-controls{bottom:20px}'),'after the computer rule, so it wins');
 // The chat panel is not held to the browser's own dialog width (100% - 38px on a phone).
 assert.match(shell,/dialog\.is-side\{color:var\(--ink\);max-width:none\}/);
 // The phone's quick Claim hides with the goal line while fishing and in the admin view.
 assert.match(read('public/pond.css'),/body\.fishing :is\([^)]*\.beginner-mobile,#next-goal-claim-mobile,[^)]*\)\{opacity:0;visibility:hidden;pointer-events:none\}/);
 assert.match(read('public/admin-view.css'),/#next-goal-mobile,#next-goal-claim-mobile,/);
 // While it shows, the line is the quest's name only (the green Claim says "ready"), so it fits on a 375 px phone.
 assert.match(read('public/beginner-ui.js'),/goal\.kind==='quest'\?\(quickClaim\?goal\.title:`Quest ready: \$\{goal\.title\}`\)/);
 // The Market's button has no count of goods: a red badge means something waits (the owner, 18 Oct 2026); only the first basket's worth shows.
 const game=read('public/game.js');
 assert.match(game,/badge\.hidden=!worth;/);assert.doesNotMatch(game,/badge\.textContent=count\.toLocaleString/);
 // A pin under the phone's event rail moves clear of it.
 assert.match(game,/ placeLandmarks\(width,height\);\n clearRail\(\);\n\}/);assert.match(game,/function clearRail\(\)\{\n if\(!mobileLayout\.matches\)return;/);
});

test('the review\'s fixes in windows: a button that is off is flat and faded, Settings shows the part\'s own picture and the Sound switch its name',()=>{
 const buttons=read('public/buttons.css');
 assert.match(buttons,/--btn-off:#f1ebe2;--btn-off-line:#e6ddd1;--btn-off-text:#b3a893;/);
 assert.match(buttons,/\.small-button:disabled,\n\.secondary-button:disabled,[^{]*\{\n background:var\(--btn-off\);border-color:var\(--btn-off-line\);color:var\(--btn-off-text\);box-shadow:none;transform:none;/);
 const nav=read('public/settings-nav.js'),css=read('public/settings.css');
 assert.match(nav,/for\(const p of parts\(\)\)p\.classList\.toggle\('is-open',p\.id===id\);\n  badge\(part\);/);
 assert.match(nav,/holder\.innerHTML=key\?art\(key,'dialog-badge'\):face\?/);
 assert.match(css,/#sound-dialog\.settings-one #sound-settings>\.sound-switch>span\{position:static;width:auto;height:auto;overflow:visible;clip:auto;/);
 assert.match(css,/#sound-dialog\.settings-one #avatar-settings\.is-open \.avatar-settings-header h3:not\(:has\(\.settings-copy\)\)\{display:none\}/);
 // The shop's tab says what it holds; the window keeps the owner's title.
 assert.match(farm,/<button type="button" data-shop-jump="shop-boosts" aria-controls="shop-boosts" aria-pressed="false"><i data-game-art="boost"><\/i><span>Power-ups<\/span><\/button>/);
 assert.match(farm,/<h2 id="boost-title">Boosts<\/h2>/);
 // The diamond shop looked at again (18 Oct 2026, the owner): the balance in the heading on every tab, the Special offer and the pass
 // above the packs on the Diamonds tab only, one small Secure checkout line, Earn daily a row at the bottom of every tab.
 assert.match(farm,/<i class="dialog-badge" data-game-art="boost" aria-hidden="true"><\/i><div class="dialog-titles"><h2 id="boost-title">Boosts<\/h2><\/div><span class="shop-balance"><i data-game-art="diamonds" aria-hidden="true"><\/i><strong id="boost-wallet">0<\/strong><span class="sr-only">diamonds to spend<\/span><\/span>/);
 assert.match(farm,/<i data-game-art="diamonds"><\/i><span>Diamonds<\/span><\/button>/);
 assert.match(farm,/<section class="diamond-store" id="diamond-store"[^>]*><h3 id="diamond-store-title">Get diamonds<\/h3><div class="shop-deals" id="shop-deals"><\/div><div id="diamond-packs" class="diamond-packs"><\/div><p class="shop-secure"><i data-lucide="lock"><\/i>Secure checkout<\/p><\/section>/);
 assert.match(farm,/<div id="boost-catalog"><\/div><button type="button" class="shop-earn" id="boost-daily">/);
 assert.doesNotMatch(farm,/class="boost-wallet"/);
 assert.match(read('public/pass-ui.js'),/deals\.append\(b\);/);
 const shop=read('public/shop.css');
 assert.match(shop,/#boost-dialog \.boost-detail\[data-state=ready\]\{display:none\}/);
 assert.match(shop,/#diamond-packs \.pack-best\{position:absolute;top:-12px;/);
 // How to play names the one way to Feedback on every screen.
 const wiki=read('public/wiki-content.js');
 assert.ok(!wiki.includes('Tap the mailbox next to How to play'));assert.equal(wiki.split('Tap More, then Feedback, choose Feedback').length,3);
});

test('a pill menu gives the focus back only when the window did not move it, and closes with its window',()=>{
 const pill=read('public/pill-menu.js');
 assert.match(pill,/const a=document\.activeElement;if\(!a\|\|a===document\.body\|\|list\.contains\(a\)\|\|!a\.isConnected\)t\.focus\?\.\(\{preventScroll:true\}\);/);
 assert.match(pill,/if\(box\?\.tagName==='DIALOG'&&!box\.open\)for\(const t of box\.querySelectorAll\(OPEN\)\)setPill\(t,false\);/);
 assert.match(pill,/const open=all\.find\(showing\);/);
});

