import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync,readdirSync} from 'node:fs';
import {createReel,REEL,FIGHTS} from '../public/pond-reel.js';
import {FISH,POND_FIRST_FISH} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// The Fishing pond's screen (11 Oct 2026, part C): pond-ui.js (the screen), pond-reel.js (the reel), pond-scene.js (the 3D pieces).
const seeded=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
// A player who watches the fish with a delay and holds while it is above the middle of the green (slow: half a second behind, sloppy).
function play(species,{tries=0,first=false,seed=1,delay=.45,skill=.5,idle=false,frame=1/60}={}){
 const random=seeded(seed),r=createReel(species,{tries,first,random}),seen=[];let t=0;
 while(!r.done&&t<90){seen.push(r.fish);const late=seen[Math.max(0,seen.length-1-Math.round(delay/frame))],aim=late+(random()-.5)*8*(2-skill);
  r.run(frame,!idle&&aim>r.zone+r.size/2+r.v*.22*skill);t+=frame;}
 return r;
}
test('the reel: a slow, sloppy player lands every common fish and most rare ones within three tries; doing nothing lands no big fish',()=>{
 for(const [species,f] of Object.entries(FISH)){
  let first=0,within=0;const N=60;
  for(let i=0;i<N;i++){let ok=false;for(let tries=0;tries<3&&!ok;tries++){const r=play(species,{tries,seed:i*31+tries*7+1});if(r.done==='landed'){ok=true;if(!tries)first++;}}if(ok)within++;}
  if(f.chance>=9||f.chance20>=9)assert.ok(first/N>=.9,`${species}: ${first}/${N} on the first try`);   // the common kinds, below level 20 or from it
  assert.ok(within/N>=.9,`${species}: ${within}/${N} within three tries`);
  let idle=0;for(let i=0;i<N;i++)if(play(species,{idle:true,seed:i+500}).done==='landed')idle++;
  if(['roach','carp','whiskers'].includes(species))assert.equal(idle,0,`${species}: never landed by doing nothing`);else assert.ok(idle/N<=.3,`${species}: ${idle}/${N} by doing nothing`);
 }
 // The farm's very first fish (a Minnow) hardly moves and drains slowly: a player who does anything lands it.
 for(let i=0;i<40;i++)assert.equal(play(POND_FIRST_FISH[0][0],{first:true,seed:i+900,delay:.6,skill:.3}).done,'landed');
});
test('the reel plays in bar units and seconds: the same fish on a slow screen and a quick one, a tired fish easier',()=>{
 for(const species of Object.keys(FISH)){
  const quick=play(species,{seed:77,frame:1/120}),slow=play(species,{seed:77,frame:1/30});
  assert.ok(quick.done&&slow.done,species);
 }
 const fresh=createReel('pike',{random:seeded(1)}),tired=createReel('pike',{tries:9,random:seeded(1)});
 assert.equal(tired.size,FISH.pike.zone+REEL.tireZone*REEL.tireMax,'more green with each try, up to four tries\' worth');assert.equal(tired.fill,FISH.pike.fill+REEL.tireFill*REEL.tireMax);assert.ok(tired.size>fresh.size);
 const r=createReel('carp',{random:seeded(3)});assert.equal(r.progress,REEL.start);assert.ok(r.inside,'the green starts round the fish');
 r.run(.1,true);r.run(5,true);assert.ok(r.zone<=100-r.size&&r.zone>=0,'the green stays in the bar');
 for(const fight of new Set(Object.values(FISH).map(f=>f.fight)))assert.ok(fight==='phases'||FIGHTS[fight],fight);
 // Perfect: the fish never left the green. One that left it is not.
 const out=createReel('minnow',{random:seeded(5)});for(let i=0;i<60&&!out.done;i++)out.run(1/30,true);assert.equal(out.perfect,false);
});
test('the pond screen: one button (tap, click, Space or Enter; hold to reel), the rule on the screen, no middle dots, cards wait',()=>{
 const ui=read('public/pond-ui.js'),css=read('public/pond.css'),game=read('public/game.js');
 assert.match(ui,/if\(event\.key!==' '&&event\.key!=='Enter'\)return;/,'Space and Enter press the button');
 assert.match(ui,/event\.preventDefault\(\);if\(event\.type==='keydown'\)\{if\(!event\.repeat\)press\(\);\}else lift\(\);/,'held down to reel, let go to give line');
 assert.match(ui,/act\.addEventListener\('pointerdown'/);assert.match(ui,/water\.addEventListener\('pointerdown'/,'or anywhere on the water');
 assert.match(ui,/<li>Tap or press Space to cast\. When the float dips, tap again\. Hold to reel and keep the fish in the green\.<\/li><li>A fish that gets away stays in the pond: a cast is only used when you land a fish or let it go\.<\/li>/,'How fishing works, in the Fish book');
 for(const text of ui.match(/'[^'\n]*'|`[^`]*`/g))assert.doesNotMatch(text,/ · /,'no middle dot shown');
 assert.doesNotMatch(read('public/pond-scene.js')+css,/ · /);
 // It is an open window that is not modal: every card that waits while a window is open (a level-up, the admin's pop-ups, offers)
 // waits for "Back to my farm"; a gift is held by the pond itself.
 assert.match(ui,/dialog\.show\(\)/);assert.doesNotMatch(ui,/dialog\.showModal\(\)/);
 assert.match(read('public/progression-ui.js'),/document\.querySelector\('dialog\[open\]'\)/,'the level-up card waits for an open window');
 assert.match(game,/if\(pond\?\.hold\(\(\)=>giftPopup\(gift,\{eyebrow,title,icon,text,action\}\)\)\)return;/,'a gift waits while fishing');
 assert.match(ui,/const finish=\(\)=>\{if\(isOpen\)return;resize\(\);if\(dialog\.open\)dialog\.close\(\);const later=held;held=\[\];for\(const show of later\)show\(\);\};/,'and comes once the farm is back');
 // Reduced motion: a cut instead of the glide, no bobbing.
 assert.match(ui,/ms:reducedMotion\?0:600/);assert.match(read('public/pond-scene.js'),/const bob=reducedMotion\?0:/);
 // The farm's buttons fold away and the farm fills the screen; the camera hook keeps the farm's own view.
 assert.match(css,/body\.fishing :is\(\.topbar,\.side-tools,\.bottom-hud,\.scene-controls,\.quest-card,/);assert.match(css,/body\.fishing #world\{inset:0;border-radius:0\}/);
 assert.match(game,/if\(pond\?\.viewing\(\)\)focus=pond\.frame\(camera,focus,aspect\);\n camera\.position\.copy\(focus\)/);
 // The layouts: a short frame keeps the main button and the catch card's main button in view; nothing heavier than bold 700.
 assert.match(css,/@media \(max-height:540px\)\{/);assert.match(css,/\.pond-card\{z-index:2;position:absolute;left:50%;bottom:calc\(14px/);
 assert.doesNotMatch(css,/font-weight:(800|900)|font:(800|900) /);
 assert.match(css,/\.pond-card-actions button\{flex:1 1 0;min-height:44px/);
});
test('the fish pictures are the owner\'s WebP, registered like the others, in the menus and on the level card',()=>{
 const icons=read('public/visual-icons.js');
 for(const name of ['fish-minnow','fish-perch','fish-roach','fish-carp','fish-tench','fish-pike','fish-goldencarp','fish-whiskers','fishingpond']){
  const file=new URL(`../public/assets/icons/${name}.webp`,import.meta.url);assert.ok(existsSync(file),name);assert.ok(statSync(file).size<40000,`${name}: small`);
  assert.equal(readFileSync(file).subarray(8,12).toString('ascii'),'WEBP',name);assert.ok(!existsSync(new URL(`../public/assets/icons/${name}.png`,import.meta.url)),`${name}: no PNG`);
  assert.ok(icons.includes(`'${name}'`),`${name} registered`);
 }
 assert.ok(icons.indexOf('for(const key of FISH_PICTURES)pictures[key]=key;')<icons.indexOf('export const ART_KEYS='),'in ART_KEYS, so a level card may show them');
 assert.match(icons,/for\(const key of FISH_PICTURES\)webpPictures\.add\(key\);/);
 for(const key of Object.keys(FISH))assert.ok(read('public/pond-ui.js').includes('art(`fish-${')&&key,'every fish has its picture');
 const ui=read('public/pond-ui.js');
 assert.match(ui,/tile\.dataset\.menuUtility='fishing'/,'a More tile, greyed and "Reach level 4." until then like the other features (progression-ui.js)');
 assert.match(ui,/document\.querySelector\('#buildings-dialog \.utility-shortcuts'\)\?\.prepend\(shortcut\);/,'and first in Buildings › Around the farm (computers have no More menu; the others open from level 7)');
 assert.match(read('public/pond.css'),/\.pond-book-list \.is-missing \.pond-book-art\{filter:brightness\(0\) opacity\(\.25\)\}/,'a fish not caught yet is its own shadow');
});
// The review of part C (11 Oct 2026). The pin over the pier: on the home view of a phone and of a computer the pier is at or just past
// the bottom edge (on a computer under the bar of tools), so it was hidden at level 4. These are the spots measured on the stage.
test('the pond\'s pin waits at the edge for a pier just below it, above the bar of tools and beside the camera buttons',()=>{
 const ui=read('public/pond-ui.js'),code=ui.match(/\nconst overlaps=[^\n]*\nexport const pinSpot=[\s\S]*?\n\};\n/)[0].replace('export const','const');
 const pinSpot=new Function(`${code}return pinSpot;`)(),ndc=(y,h)=>1-2*y/h;
 // A phone (390 x 844, the farm 588 high): the pier at 583 is in view, the pin stays on it (it was hidden below 92% of the height).
 assert.deepEqual(pinSpot(328,583,.68,ndc(583,588),588,[{left:8,right:382,top:588,bottom:701}],[{left:0,right:390,top:708,bottom:772}]),{x:328,y:582,edge:false});
 // A computer, 1280 x 800: the pier at 788 is under the bar of tools (688 to 780), so the pin waits just above the bar, pointing down.
 const bar1280={left:379,right:901,top:688,bottom:780},cam1280={left:1036,right:1260,top:728,bottom:780};
 assert.deepEqual(pinSpot(770,788,.2,ndc(788,800),800,[bar1280],[cam1280]),{x:770,y:682,edge:true});
 // 918 x 516: above the bar, and to the side of the camera buttons that stand above its right end.
 const spot=pinSpot(668,509,.46,ndc(509,516),516,[{left:189,right:729,top:415,bottom:507}],[{left:674,right:898,top:340,bottom:392}]);
 assert.deepEqual(spot,{x:644,y:409,edge:true});
 // A phone on its side (844 x 390, the farm 248 high, the tools below it): the pier 94 px past the edge, the pin at the edge.
 assert.deepEqual(pinSpot(486,342,.272,-1.757,248),{x:486,y:242,edge:true});
 // In view and clear of everything: right on the pier. Far below (more than half the height), above the top or off a side: hidden.
 assert.deepEqual(pinSpot(500,300,0,0,600),{x:500,y:300,edge:false});
 assert.equal(pinSpot(500,760,0,ndc(760,500),500),null);assert.equal(pinSpot(500,20,0,ndc(20,600),600),null);assert.equal(pinSpot(990,300,.95,0,600),null);
 assert.match(ui,/pin\.hidden=!spot;if\(!spot\)return;pin\.style\.left=`\$\{spot\.x\}px`;pin\.style\.top=`\$\{spot\.y\}px`;pin\.classList\.toggle\('edge',spot\.edge\);/);
 assert.match(ui,/blocked=\{bars:find\('\.bottom-hud'\),sides:find\('\.scene-controls,\.side-tools'\)\};/,'measured where the labels are');
 assert.match(read('public/pond.css'),/\.pond-label\.edge::after\{content:'';position:absolute;left:50%;bottom:-9px;/,'a small point down at the pier');
 // The level-4 card says where it is, like a building ("open Buildings") and a field ("at the Farmhouse").
 assert.match(read('public/progression-ui.js'),/if\(e\.id==='feature:fishing'\)return 'Activity · tap its pin over the pier';/);
});
test('the pond screen says what a new kind pays, a refused catch takes its card along, and a long press selects nothing',()=>{
 const ui=read('public/pond-ui.js'),css=read('public/pond.css');
 // The first of each kind pays 3 times its coins and 10 XP more (farm-state.js landFish): the catch card and the Fish book say so.
 assert.match(ui,/if\(r\.first\)tags\.push\(\['is-new',`New fish for your book: \$\{POND_NEW_FISH_COINS\+1\}× coins, \+\$\{POND_NEW_FISH_XP\} XP`\]\);/);
 assert.ok(ui.includes('<li>Every fish pays coins (more for a heavier fish and at a higher level) and XP. The first of each kind pays ${POND_NEW_FISH_COINS+1} times its coins and ${POND_NEW_FISH_XP} XP more.</li>'),'in How fishing works, the wiki\'s own words');
 assert.ok(read('public/wiki-content.js').includes('The first of each kind pays ${POND_NEW_FISH_COINS+1} times its coins and ${POND_NEW_FISH_XP} XP more.'));
 // While a catch card is up the pond's count is the fish after it; when the farm takes the catch back (farm-client.js rolls it back
 // with its coins) the card goes, and the next cast fishes the same fish again.
 assert.match(ui,/shown=r\.n;paid=state\.stats\[W\.stats\.coins\]\?\?0;setPhase\('result'\)/);
 assert.match(ui,/if\(isOpen&&phase==='result'&&\(current\(\)!==shown\+1\|\|\(state\.stats\[W\.stats\.coins\]\?\?0\)!==paid\)\)\{card\.hidden=true;idle\(\);\}/);
 assert.match(ui,/function cast\(\)\{\n  if\(casts\(\)\.casts<1\|\|sending\)\{idle\(\);return;\}\n  if\(fishN!==current\(\)\)\{fishN=current\(\);tries=0;escapes=0;\}/);
 // Holding on the water or the button (to reel) selects no text and opens no callout on an iPhone.
 assert.match(css,/\.pond-view\{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none\}/);
 // The game's palette only: every colour in pond.css is one the game already uses (or a buttons.css token).
 const others=readdirSync(new URL('../public/',import.meta.url)).filter(f=>f.endsWith('.css')&&f!=='pond.css').map(f=>read(`public/${f}`)).join('\n').toLowerCase();
 for(const hex of new Set(css.toLowerCase().match(/#[0-9a-f]{6}(?=[0-9a-f]{2}\b|\b)/g)))assert.ok(others.includes(hex),`${hex} is not a colour of the game`);
});
test('the phone\'s offer tiles fold away while fishing and lift no picture on a long press (14 Oct 2026, the owner on an iPhone)',()=>{
 const pond=read('public/pond.css'),offer=read('public/offer.css'),starter=read('public/starter-pack.css');
 // The tiles hang on the body (src/offer-ui.js, src/starter-pack-ui.js), outside #game, which isolates the pond screen on a phone:
 // they must be in the list of what folds away, or they sit on the water mid-screen and take its taps and holds (pond and lake alike).
 const fold=pond.match(/body\.fishing :is\(([^)]*)\)\{opacity:0;visibility:hidden;pointer-events:none\}/)?.[1].split(',')??[];
 for(const tile of ['#offer-button','#starter-pack-button'])assert.ok(fold.includes(tile),`${tile} folds away while fishing`);
 assert.match(read('src/offer-ui.js'),/doc\.body\.append\(tile,dialog\)/);assert.match(read('src/starter-pack-ui.js'),/document\.body\.append\(button,dialog\)/);
 assert.match(read('public/mobile.css'),/#game\{height:100dvh;min-height:0;isolation:isolate\}/);
 // Holding a tile on the farm opens no iPhone callout, which lifted the chest or the crate to the top of the screen.
 assert.match(offer,/#offer-button\{position:fixed;[^}]*;-webkit-touch-callout:none\}/);
 assert.match(starter,/#starter-pack-button\{position:fixed;[^}]*;-webkit-touch-callout:none\}/);
});
test('the offer does not open by itself on the water or in the seconds after it (14 Oct 2026, the owner on an iPhone)',async()=>{
 const {AFTER_FISHING}=await import('../src/offer-ui.js');
 assert.ok(AFTER_FISHING>=5000&&AFTER_FISHING<=15000,'a few seconds, not minutes');
 const src=read('src/offer-ui.js');
 // The 2-second check counts the fishing screen (the pond and the lake set body.fishing) as busy, and waits AFTER_FISHING after it.
 assert.match(src,/let fished=0;const quiet=\(\)=>\{if\(doc\.body\?\.classList\?\.contains\?\.\('fishing'\)\)fished=Date\.now\(\);return !doc\.querySelector\('dialog\[open\]'\)&&Date\.now\(\)-fished>=AFTER_FISHING;\};/);
 assert.match(read('public/pond-ui.js'),/document\.body\.classList\.add\('fishing'\)/);
});
