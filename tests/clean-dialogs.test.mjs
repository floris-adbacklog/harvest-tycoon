import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 30 Sep 2026: cleaner windows. One job per window, less text per row, fewer tabs, Settings as a short list, one green button per
// window and no text below 12 px inside the windows.
test('one job per window: the market pick lives in the Market only, and the Market drops tomorrow\'s outlook',()=>{
 const today=read('public/retention-ui.js'),market=read('public/economy-ui.js');
 assert.match(today,/\$\('today-market'\)\.hidden=true;\$\('today-market'\)\.innerHTML='';/);assert.doesNotMatch(today,/TODAY’S MARKET PICK/);
 assert.doesNotMatch(market,/Tomorrow’s outlook|market-forecast/);assert.match(market,/TODAY’S MARKET/,'today\'s pick stays in the Market');
 assert.doesNotMatch(read('public/wiki-content.js'),/the outlook shows tomorrow’s/,'the wiki says the same');
});

test('less text per row: a building is one line (level and what it does), a fair price has no label',()=>{
 const market=read('public/economy-ui.js');
 assert.match(market,/const catalogLine=\(key,s\)=>key!=='familyhall'&&\(key==='farmhouse'\|\|buildingUnlocked\(state,key\)\)\?`Level \$\{state\.buildings\[key\]\.level\} · \$\{s\.kind==='idle'\?'Ready to work':s\.text\}`:s\.text;/);
 assert.doesNotMatch(market,/<small>Level \$\{state\.buildings\[key\]\.level\}<\/small>/,'no second line');
 assert.match(market,/text=el\.closest\('#building-catalog'\)\?catalogLine\(key,s\):s\.text/,'the live update keeps the one line');
 assert.match(market,/\$\{q\.demand==='fair'\|\|!q\.demand\|\|q\.label==='Fair price'\?'':`<span class="demand-pill/);
});

test('fewer tabs: one quest list with the completed ones folded away, and the journal shows what you have',()=>{
 const quests=read('public/quests-ui.js'),journal=read('public/retention-ui.js');
 assert.doesNotMatch(quests,/data-quest-filter/);assert.match(quests,/Show completed \(\$\{done\}\)/);
 assert.match(quests,/\[\.\.\.groups\.ready\.map\(entry=>row\(entry,'ready'\)\),\.\.\.groups\.active\.map\(entry=>row\(entry,'active'\)\)\]/,'ready first, then in progress');
 assert.match(journal,/const have=keys\.filter\(seen\),left=keys\.length-have\.length;/);assert.match(journal,/collection-left/);assert.doesNotMatch(journal,/'Not yet'/);
});

test('Settings is a short list: the account on top, one row per part that opens only that part, and a way back',()=>{
 const nav=read('public/settings-nav.js'),settings=read('public/sound-settings.js'),css=read('public/settings.css');
 assert.match(settings,/import \{createSettingsNav\} from '\.\/settings-nav\.js';/);assert.match(settings,/createSettingsNav\(dialog\);/);
 assert.match(nav,/parts\(\)\.filter\(p=>!p\.hidden&&titleOf\(p\)\)/,'a hidden part has no row');
 assert.match(nav,/All settings/);assert.match(nav,/observe\(dialog,\{attributes:true,attributeFilter:\['open'\]\}\)/,'it opens on the list');
 assert.match(css,/#sound-dialog:not\(\.settings-one\) :is\(#avatar-settings,\.settings-section\)\{display:none\}/);
 assert.match(css,/#sound-dialog\.settings-one :is\(#avatar-settings,\.settings-section\):not\(\.is-open\),#sound-dialog\.settings-one \.settings-account\{display:none\}/);
});

test('one green button per window: the stall\'s Upgrade is the quiet one next to Collect',()=>{
 const growth=read('public/growth-ui.js');
 assert.match(growth,/<button id="stall-upgrade" class="secondary-button"/);assert.match(growth,/<button id="stall-collect" class="primary-button"/);
});

test('no text below 12 px inside the windows (the map labels and the top bar keep their own small sizes)',()=>{
 const DIALOG=/dialog|#market|#tasks|#today|#journal|#sound|#estate|#building|#family|#events|#boost|#invite|#help|#feedback|quest|market-|sharing|streak|daily|order-|delivery|journal|collection|settings|notify|stall|estate|shop-|pack-|family|event|invite|recipe|ingredient|upgrade|building-card|building-status|chat-|email-check|reward|demand|lab-|visitor|valley|depot|fair|ranch|workshop|project|chore|activity|mastery|silo|tractor-|leaderboard|profile|avatar|vip|offer|starter/;
 const HUD=/topbar|\.resources|level-card|side-tool|tool-dock|bottom-nav|plot-label|building-label|utility-label|menu-pill|-dot\b|badge|toast|lvl|\.brand|hud|float|harvest-fly|coin-counter|diamond-counter|loading|welcome|beginner-card|scene-|context-hint|touch-/;
 const tiny=/font(?:-size)?:[^;}]*?\b(9|9\.5|10|10\.5|11|11\.5)px/;const skip=new Set(['welcome.css','legal.css','beginner.css','wiki.css']);
 const found=[];
 for(const file of readdirSync(new URL('../public/',import.meta.url)).filter(f=>f.endsWith('.css')&&!skip.has(f))){
  for(const [,selector,body] of read(`public/${file}`).matchAll(/([^{}]+)\{([^{}]*)\}/g)){const s=selector.trim();if(tiny.test(body)&&DIALOG.test(s)&&!HUD.test(s))found.push(`${file}: ${s.slice(0,80)}`);}
 }
 assert.deepEqual(found,[]);
});
