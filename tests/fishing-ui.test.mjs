import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
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
  if(f.chance>=9)assert.ok(first/N>=.9,`${species}: ${first}/${N} on the first try`);
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
 assert.match(game,/if\(pond\?\.hold\(\(\)=>giftPopup\(gift,\{eyebrow,title,icon,text\}\)\)\)return;/,'a gift waits while fishing');
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
 assert.match(ui,/document\.querySelector\('#buildings-dialog \.utility-shortcuts'\)\?\.append\(shortcut\)/,'and in Buildings › Around the farm (computers have no More menu)');
 assert.match(read('public/pond.css'),/\.pond-book-list \.is-missing \.pond-book-art\{filter:brightness\(0\) opacity\(\.25\)\}/,'a fish not caught yet is its own shadow');
});
