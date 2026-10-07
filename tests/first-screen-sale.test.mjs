import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 7 Oct 2026, CrazyGames Basic Launch: on a laptop the game runs in a frame of about 960x540. There the guide card ran under the camera
// buttons (Show me, the diamonds and View all 10 steps out of sight), and at 1280x720 the Market's sticky "This basket is worth" bar sat
// over the Sell all that Show me pointed at, while the "Sold!" and the next step stayed hidden behind the open window.
test('on a short computer frame the guide card is compact, with Show me next to the title',()=>{
 const css=read('public/beginner.css');
 const block=css.slice(css.indexOf('@media(min-width:901px) and (max-height:660px),(min-width:901px) and (max-width:1040px) and (max-height:780px){'));
 assert.ok(block.length<css.length,'the short-frame block is there');
 assert.match(block,/\.beginner-card #quest-body\{display:grid;grid-template-columns:minmax\(0,1fr\) auto;grid-template-areas:"title help" "text text" "bar xp" "prize prize" "all all";/,'Show me beside the title, the XP beside the bar');
 assert.match(block,/\.beginner-card #quest-body\[hidden\]\{display:none\}/,'collapsing the card still hides its body');
 assert.match(block,/\.beginner-card \.beginner-prize-copy\{display:flex;flex-wrap:wrap;/,'the diamonds on one line');
 assert.match(block,/#quest-body:has\(#claim-reward:not\(\[hidden\]\)\)\{grid-template-areas:"title title" "text text" "bar xp" "help help"/,'the last step\'s Claim gets the whole width');
});

test('on a narrow, short computer frame the camera buttons step aside while the guide card is open',()=>{
 const css=read('public/desktop-hud.css');
 assert.match(css,/@supports selector\(:has\(a\)\)\{@media\(min-width:901px\) and \(max-width:1040px\) and \(max-height:620px\)\{\s*#game:has\(\.beginner-card:not\(\[hidden\]\) #quest-body:not\(\[hidden\]\)\) \.scene-controls\{display:none\}\s*\.beginner-card\{max-height:calc\(100dvh - 225px\)\}/);
 assert.ok(css.indexOf('max-height:calc(100dvh - 225px)')>css.indexOf('max-height:calc(100dvh - 320px)'),'after the rule that lifts them above the dock');
});

test('the Market\'s × stays in sight while the list scrolls on a computer',()=>{
 const css=read('public/desktop-hud.css');
 assert.match(css,/#market-dialog \.dialog-heading\{display:contents\}/);
 assert.match(css,/#market-dialog \.dialog-heading>\.close-dialog\{float:inline-end;position:sticky;top:-16px;z-index:4;/);
 assert.match(css,/#market-dialog \.dialog-heading\+p\{clear:both\}/);
 assert.match(read('public/mobile.css'),/\.game-dialog \.dialog-heading\{position:sticky;/,'phones keep their whole heading on top');
});

test('Show me scrolls a button into view when a sticky part of its own window covers it, not when another layer does',async()=>{
 const {covered}=await import('../public/coach.js');
 const box=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});
 const host={contains:el=>el.inWindow===true};
 const button={getBoundingClientRect:()=>box(400,600,220,44),contains:el=>el===button||el===label,inWindow:true},label={inWindow:true};
 const footer={inWindow:true},toast={inWindow:false};
 const at=hit=>({elementFromPoint:(x,y)=>{assert.equal(x,510);assert.equal(y,622);return hit;}});
 assert.equal(covered(button,host,at(footer)),true,'the Market\'s sticky footer');
 assert.equal(covered(button,host,at(label)),false,'its own text');
 assert.equal(covered(button,host,at(toast)),false,'a toast: scrolling would not help');
 assert.equal(covered(button,host,at(null)),false);
 const coach=read('public/coach.js');
 assert.match(coach,/seen\.right>win\.innerWidth\|\|covered\(el,host,doc\)\)&&Date\.now\(\)-r\.scrolledAt>600\)\{r\.scrolledAt=Date\.now\(\);el\.scrollIntoView\?\.\(\{block:'center',inline:'nearest'\}\);\}/);
});

test('after the guide\'s first sale the Market closes and the coins fly to the coin counter',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/^import \{flyHarvest,bump\} from '\.\/harvest-fly\.js';$/m,'the harvest\'s own flight');
 assert.match(ui,/const tapped=\[\.\.\.document\.querySelectorAll\(key==='category'\?'#sell-all':/,'from the button that was tapped');
 assert.ok(ui.indexOf('const tapped=')<ui.indexOf("marketSelling=true;renderMarket();\n  try{"),'read before the list is drawn again');
 assert.match(ui,/onChange\(\);notify\(`Sold! \+\$\{number\(r\.coins\)\} coins for your next harvest\.`\);\n   if\(r\.guide\?\.some\(step=>step\.step==='sell'\)\)firstSale\(tapped\);/,'only the sale that finishes the guide step');
 assert.match(ui,/function firstSale\(from\)\{\n  \$\('market-dialog'\)\.close\(\);/,'the window closes even when motion is reduced');
 assert.match(ui,/if\(!counter\|\|!from\|\|matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\)return;/);
 assert.match(ui,/flyHarvest\(\{from:\{x:from\.left\+from\.width\/2,y:from\.top\+from\.height\/2\},to:\{x:to\.left\+to\.width\/2,y:to\.top\+to\.height\/2\},html:art\('coins'\),count:5,onArrive:\(\)=>bump\(counter\)\}\);/);
});
