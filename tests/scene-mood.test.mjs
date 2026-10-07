import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
// Every rule in a stylesheet that styles the farm's mood layer (.vignette), with the media query it sits in ('' outside one).
function vignetteRules(css){
 const rules=[];let media='',depth=0,start=0;
 for(let i=0;i<css.length;i++){
  if(css[i]==='{'){const head=css.slice(start,i).trim();if(head.startsWith('@media'))media=head;depth++;start=i+1;if(/\.vignette/.test(head)&&!head.startsWith('@'))rules.push({media:depth>1?media:'',selector:head,body:css.slice(i+1,css.indexOf('}',i))});}
  else if(css[i]==='}'){depth--;if(depth===0)media='';start=i+1;}
  else if(css[i]===';'&&depth===0)start=i+1;
 }
 return rules;
}
const css=read('public/styles.css').replace(/\/\*[\s\S]*?\*\//g,''),rules=vignetteRules(css);

test('the farm\'s mood like the loading-screen art (6 Oct 2026): one layer right on the 3D view, under every label, button and window',()=>{
 const farm=read('public/farm.html');
 assert.match(farm,/<div id="world"[^>]*><\/div>\n\s*<div class="vignette" aria-hidden="true"><\/div>\n\s*<div id="plot-labels"><\/div><div id="building-labels"><\/div>/,'straight after the 3D view, before the labels and the HUD');
 assert.equal((farm.match(/class="vignette"/g)||[]).length,1,'one layer, not a second one beside it');
 for(const r of rules)assert.doesNotMatch(r.body,/z-index/,`${r.selector}: no z-index, so everything after it in the page stays on top`);
 const base=rules.find(r=>r.selector==='.vignette'&&!r.media);
 assert.match(base.body,/position:absolute;inset:0;pointer-events:none/,'taps and drags go straight through to the farm');
 assert.doesNotMatch(base.body,/backdrop-filter|filter:|opacity|mask/,'the layer itself is one still picture (and never cuts the blur off from the farm behind it)');
});
test('a faint haze towards the far side and no dark corners: the farm looks fun and cheerful (7 Oct 2026)',()=>{
 const base=rules.find(r=>r.selector==='.vignette'&&!r.media).body;
 const haze=/linear-gradient\(180deg,#([0-9a-f]{6})([0-9a-f]{2}),#\1([0-9a-f]{2}) 15%,#\1(?:00) 34%\)/.exec(base);
 assert.ok(haze,'the haze fades out over the top third of the screen (the farthest away)');
 const [r,g,b]=[0,2,4].map(i=>parseInt(haze[1].slice(i,i+2),16));
 assert.ok(r>=g&&g>b&&b>=180,'warm sunlight, pale enough to read as air and not as yellow paint');
 assert.ok(parseInt(haze[2],16)<=0x1a,'barely there: a stronger haze turned the top of the valley milky and khaki (6 Oct 2026)');
 assert.doesNotMatch(base,/radial-gradient/,'no dark corners: they made the farm look gloomy');
});
test('the gentle blur at the top and bottom edges only on computers: never on phones, tablets, in the apps or with less transparency asked',()=>{
 const blurred=rules.filter(r=>/backdrop-filter/.test(r.body));
 assert.ok(blurred.length>0);
 for(const r of blurred){
  assert.match(r.media,/^@media\(pointer:fine\) and \(hover:hover\) and \(min-width:901px\) and \(max-width:1920px\)$/,'a mouse and a wide screen (the phone layout starts at 900px), but not a huge retina one');
  for(const s of r.selector.split(','))assert.match(s,/^html:not\(\[data-app\]\):not\(\[data-app-mode\]\) \.vignette::(before|after)$/,'never in the Android or iPhone app or the installed app');
  assert.match(r.body,/-webkit-backdrop-filter:blur\(2\.5px\);backdrop-filter:blur\(2\.5px\)/);
 }
 const top=rules.find(r=>/::before$/.test(r.selector)&&/top:0/.test(r.body)),bottom=rules.find(r=>/::after$/.test(r.selector)&&/bottom:0/.test(r.body));
 assert.match(top.body,/top:0;height:16%;-webkit-mask-image:linear-gradient\(#000,#0000\);mask-image:linear-gradient\(#000,#0000\)/,'fades out towards the middle');
 assert.match(bottom.body,/bottom:0;height:14%;-webkit-mask-image:linear-gradient\(#0000,#000\);mask-image:linear-gradient\(#0000,#000\)/);
 assert.match(css,/@media\(prefers-reduced-transparency:reduce\)\{\.vignette::before,\.vignette::after\{display:none!important\}\}/);
 for(const file of readdirSync(new URL('public/',root)).filter(f=>f.endsWith('.css')&&f!=='styles.css'))
  for(const r of vignetteRules(read(`public/${file}`).replace(/\/\*[\s\S]*?\*\//g,'')))assert.doesNotMatch(r.body,/backdrop-filter|z-index/,`${file} keeps the layer as it is`);
});
test('the map picture and the farm photo are copied from the 3D view itself, so the mood layer never ends up in them',()=>{
 const game=read('public/game.js');
 assert.match(game,/out\.drawImage\(renderer\.domElement,/,'the map picture');
 assert.match(game,/ctx\.drawImage\(renderer\.domElement,0,0,width,height\)/,'the farm photo');
 for(const file of readdirSync(new URL('public/',root)).filter(f=>f.endsWith('.js')))assert.doesNotMatch(read(`public/${file}`),/html2canvas|foreignObject/,`${file} pictures the page's HTML`);
});
