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

// The leaderboard (30 Sep 2026): the top 100 in one light read, ten a page with Previous and Next, a jump to your own page, and a
// quieter window (no intro line, the sync line only when something is wrong, no second line under each name).
test('the leaderboard shows the top 100, ten a page, and keeps the window quiet',async()=>{
 const board=read('src/leaderboard.js'),cloud=read('src/game-cloud.js'),ui=read('src/ui.js');
 const {BOARD_SIZE,BOARD_PAGE}=await import('../src/leaderboard.js');assert.equal(BOARD_SIZE,100);assert.equal(BOARD_PAGE,10);
 assert.match(board,/const BOARD_FIELDS=\['player_id','username','level','last_active_at','vip_expires_at','avatar_id'\];/,'only what the board shows');
 assert.match(board,/\.limit\(BOARD_SIZE\)/);assert.match(board,/slice\(shown\*BOARD_PAGE,\(shown\+1\)\*BOARD_PAGE\)/);
 assert.match(board,/`Page \$\{shown\+1\} of \$\{pages\}`/);assert.match(board,/step\('‹ Previous',shown-1,'previous'\),where,step\('Next ›',shown\+1,'next'\)/);
 assert.match(board,/jump\.textContent='Show';jump\.onclick=\(\)=>onPage\(mine\);/,'your own page, when you are in the top 100');
 assert.match(board,/small\.textContent=row\.player_id===playerId\?'You':'';/,'no "Level 160" under every name');
 assert.match(cloud,/if\(!quiet\|\|board\?\.category!==result\.category\)boardPage=0;board=result;drawBoard\(\);/,'a refresh keeps the page, a new board starts on page 1');
 assert.doesNotMatch(ui,/leaderboard-intro|A green dot means online now|cloud-privacy/,'no intro and no privacy footnote');assert.match(read('public/retention.css'),/#leaderboard-dialog \.cloud-sync:has\(#cloud-status:empty\)\{display:none\}/);
});
test('empty states are cards: the journal before your first harvest, and an empty board',()=>{
 assert.match(read('public/retention-ui.js'),/<div class="quest-empty journal-empty">\$\{art\(journalTab==='crops'\?'harvest'/);
 assert.match(read('src/leaderboard.js'),/box\.className='quest-empty leaderboard-empty';box\.innerHTML=`\$\{art\(rankArtKey\(category\)\)\}<h3>The valley is quiet<\/h3><p>Be the first farmer on this board\.<\/p>`/);
});

// Farm Family (30 Sep 2026): one job per tab, less text, no empty blocks, the same numbers once.
test('Farm Family is cleaner: the week is the chest and the order, the tournament has its goods, members come first',async()=>{
 const ui=read('public/family-ui.js'),tour=read('public/family-tournament.js'),social=read('public/social-ui.js'),css=read('public/family.css');
 assert.doesNotMatch(ui,/tournamentLink|Grow something together|family-settings-header|A green dot means/);
 assert.match(ui,/renderFamilyTournament\(\{view,now:farmNow\(\),emblem,rewards:rewardCards\(\),preview:prizePreview\(\),extra:extraGoods\(\)\}\)/,'Tournament goods live on the Tournament tab');
 assert.match(ui,/aria-label="Family Order delivered"><\/progress>[^\n]*<details class="family-rewards-fold">/,'your rewards fold inside the order card');
 assert.match(ui,/<p class="family-chest-how">Everything your family does on the farm fills it\. A new chest every Monday\.<\/p><ul class="family-chest-tiers">/,'how the chest fills sits in its fold');
 assert.match(ui,/document\.querySelector\('#family-heading-emblem \.family-emblem'\)\?\.replaceWith\(/,'a new emblem shows in the window header as you pick it');
 assert.doesNotMatch(tour,/family-prize-ladder|family-podium-stats|family-podium-empty/);
 assert.match(tour,/<ol class="family-podium">\$\{Array\.from\(\{length:3\},\(_,i\)=>podiumRow\(t\.top\[i\],i\)\)\.join\(''\)\}<\/ol>/,'three places, always');
 assert.match(tour,/<strong>\$\{num\(f\?f\.diamonds:prizes\[index\]\?\?0\)\}<\/strong>/,'an open place shows what it would win');
 assert.match(tour,/<summary>How rewards work<\/summary>\$\{growth\}/);
 const {renderSentInvitations}=await import('../public/family-invitations-ui.js');
 assert.equal(renderSentInvitations({family:{manager:true},sentInvitations:[]},0,()=>''),'','no empty "Pending invitations"');
 assert.ok(social.indexOf('<h3>Today’s requests</h3>')<social.indexOf('<h3>Help your family</h3>'),'requests first');
 assert.match(social,/action\('help',m\.id,'Help','coins',helpBlocked\)/,'the cost of Help is said once, above the list');
 assert.match(css,/\.family-open-row>\.pretty-select\{flex:none;width:210px\}/,'Who can join keeps its width');
});
test('profiles are cleaner: a family\'s action right under its name, the name once on a farmer\'s profile, no footnotes',async()=>{
 const family=read('public/family-profile.js'),player=read('src/player-profiles.js');
 assert.ok(family.indexOf('<div class="family-profile-actions">')<family.indexOf('<section class="family-profile-level"'),'Join or Open your family comes first');
 assert.match(family,/\$\{p\.recent\.length\?`<section class="family-profile-recent">/,'no empty Recent tournaments');
 assert.doesNotMatch(player,/FARMER OF THE VALLEY|'s profile`|Online status is based on activity/);
 assert.match(player,/\$\{self\?vipBadge\(player\.vipExpiresAt,now,true\):''\}/,'the VIP time left only on your own profile');
 assert.match(read('public/player-profiles.css'),/\.farmer-profile-status:empty\{display:none\}/);
});
