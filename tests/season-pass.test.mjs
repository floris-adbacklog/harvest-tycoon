import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SEASON_PASS,PASS_TRACKS,passPhase,passLanterns,passTier,passPremium,passVisible,passWaiting,passReward,claimPassTier,createFarm,normalizeFarm,applyFarmAction,xpForLevel,levelOf,utcDay,DIAMOND_PACKS,VIP_PLANS,BOOSTS} from '../game/farm-state.js';
import {PASS,paymentPack,validatePaidSession} from '../game/payments.js';
import {instantResult} from '../public/farm-client.js';
import {passRule,passPaidTotals,passValueLine,passRewardParts,rewardParts,passPhaseLine,lanternChip} from '../public/pass-ui.js';
import {wikiArticle} from '../public/wiki-content.js';
import {PASS_LOADING_TIP} from '../public/loading-screen.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const H=3600000,D=24*H,OPEN=SEASON_PASS.startsAt+H;
// A farm at a level, as it is just before the given moment.
function farm(level=20,now=OPEN){const s=createFarm(now-3*D);s.xp=xpForLevel(level)+5;return normalizeFarm(s,now);}
// One of each thing that brings lanterns: today's gift, a daily challenge (finished) and a delivery (goods in storage).
function gift(s,now){return applyFarmAction(s,{type:'checkin'},now);}
function challenge(s,now){
 normalizeFarm(s,now);const task=s.daily.tasks[0];s.stats[task.stat]=(s.daily.baseline[task.stat]??0)+task.target;
 return applyFarmAction(s,{type:'daily',id:0,day:utcDay(now)},now);
}
function delivery(s,now){
 normalizeFarm(s,now);const order=s.daily.orderBoard.findIndex((o,i)=>!s.daily.orders.includes(i));
 for(const [k,n] of Object.entries(s.daily.orderBoard[order].input))s.inventory[k]=(s.inventory[k]??0)+n;
 return applyFarmAction(s,{type:'delivery',id:order,day:utcDay(now),revision:s.daily.orderRevisions?.[order]??0},now);
}

test('the season: a preview, eleven open days from 23 October, a week to collect, then hidden',()=>{
 assert.equal(passPhase(Date.UTC(2026,9,2)),'soon');
 assert.equal(passPhase(Date.UTC(2026,9,23)),'open');assert.equal(passPhase(Date.UTC(2026,10,3)-1),'open');
 assert.equal(passPhase(Date.UTC(2026,10,3)),'claim');assert.equal(passPhase(Date.UTC(2026,10,10)-1),'claim');
 assert.equal(passPhase(Date.UTC(2026,10,10)),'over');
 assert.equal((SEASON_PASS.endsAt-SEASON_PASS.startsAt)/D,11);assert.equal((SEASON_PASS.claimUntil-SEASON_PASS.endsAt)/D,7);
 assert.equal(SEASON_PASS.tiers.length,30);assert.equal(SEASON_PASS.perTier,2);assert.equal(SEASON_PASS.level,10);
 assert.deepEqual({...SEASON_PASS.points},{gift:2,daily:1,delivery:1});
});

test('lanterns count only the daily gift (2), daily challenges (1) and deliveries (1), from when the season opens for the farm',()=>{
 const before=farm(20,SEASON_PASS.startsAt-H);gift(before,SEASON_PASS.startsAt-H);
 assert.equal(before.pass,undefined,'nothing counts before the season opens');
 const s=farm(20,OPEN);
 assert.deepEqual(s.pass.free,[]);assert.equal(passLanterns(s),0,'what was done before the season does not count');
 gift(s,OPEN);assert.equal(passLanterns(s),2);
 challenge(s,OPEN+60000);assert.equal(passLanterns(s),3);
 delivery(s,OPEN+120000);assert.equal(passLanterns(s),4);assert.equal(passTier(s),2);
 // Harvests, sales, quests and the rest bring none.
 s.stats.harvested+=500;s.stats.sold+=500;s.stats.earned+=100000;s.stats.chores=(s.stats.chores??0)+50;
 assert.equal(passLanterns(s),4);
 // A tier every 2 lanterns, up to 30.
 s.login.visits+=100;assert.equal(passTier(s),30);
});

test('a farm below level 10 gets no pass; reaching level 10 during the season starts its count there',()=>{
 const s=farm(8,OPEN);assert.equal(s.pass,undefined);assert.equal(passVisible(s,OPEN),false);
 s.login.visits+=5;s.xp=xpForLevel(10)+5;normalizeFarm(s,OPEN+H);
 assert.deepEqual(s.pass.base,{visits:s.login.visits,dailies:s.stats.dailies,deliveries:s.stats.deliveries});
 assert.equal(passLanterns(s),0,'gifts before level 10 do not count');
 assert.throws(()=>claimPassTier(farm(9,OPEN),'free',1,OPEN),/opens at level 10/);
});

test('the lanterns stand still at the end; collecting goes on for a week, then nothing can be claimed',()=>{
 const s=farm(20,OPEN);gift(s,OPEN);challenge(s,OPEN+60000);
 const end=SEASON_PASS.endsAt;
 gift(s,end+H);assert.equal(s.pass.final,3,'frozen before the action that came after the end');assert.equal(passLanterns(s),3);
 assert.equal(passTier(s),1);
 assert.equal(claimPassTier(s,'free',1,end+2*H).tier,1,'collecting still works');
 assert.equal(passVisible(s,end+2*H),true);
 assert.throws(()=>claimPassTier(s,'free',1,SEASON_PASS.claimUntil),/has ended/);
 assert.equal(passVisible(s,SEASON_PASS.claimUntil),false,'after the collecting week it hides');
 assert.equal(passVisible(farm(20,end+H),end+H),false,'a farm that never took part sees nothing in the collecting week');
});

test('claims one by one: refused before the season, before the tier, twice, and on the paid row before it is bought',()=>{
 const s=farm(20,OPEN);
 assert.throws(()=>claimPassTier(farm(20,SEASON_PASS.startsAt-H),'free',1,SEASON_PASS.startsAt-H),/not open yet/);
 assert.throws(()=>claimPassTier(s,'free',1,OPEN),/Collect 2 more lanterns/);
 gift(s,OPEN);
 assert.throws(()=>claimPassTier(s,'gold',1,OPEN),/free or a paid/);
 assert.throws(()=>claimPassTier(s,'free',0,OPEN),/Choose a tier/);assert.throws(()=>claimPassTier(s,'free',31,OPEN),/Choose a tier/);
 assert.throws(()=>claimPassTier(s,'paid',1,OPEN),/Unlock the paid rewards first/);
 assert.equal(passWaiting(s,OPEN),1);
 const r=applyFarmAction(s,{type:'pass_claim',track:'free',tier:1},OPEN);assert.deepEqual([r.track,r.tier],['free',1]);
 assert.throws(()=>applyFarmAction(s,{type:'pass_claim',track:'free',tier:1},OPEN),/already collected/);
 assert.equal(passWaiting(s,OPEN),0);
 // Bought (the database adds the pass id): the paid rewards of tiers already reached open at once, each still its own claim.
 s.passPremium=[SEASON_PASS.id];s.login.visits+=10;normalizeFarm(s,OPEN);
 assert.equal(passPremium(s),true);assert.equal(passTier(s),11);assert.equal(passWaiting(s,OPEN),10+11);
 assert.equal(applyFarmAction(s,{type:'pass_claim',track:'paid',tier:7},OPEN).tier,7,'in any order');
 assert.equal(passWaiting(s,OPEN),20);
 const ui=read('public/pass-ui.js');
 assert.doesNotMatch(ui,/claim all|collect all|claimAll/i,'never all at once');
 assert.match(ui,/data-pass-claim="\$\{track\}" data-pass-tier="\$\{t\}"/,'a button per tier and row');
});

test('the rewards: coins with the level and never as "earned", boosts and VIP added after what runs, items into storage',()=>{
 const s=farm(20,OPEN);s.passPremium=[SEASON_PASS.id];s.login.visits+=30;normalizeFarm(s,OPEN);
 const earned=s.stats.earned,coins=s.coins;
 const r=applyFarmAction(s,{type:'pass_claim',track:'free',tier:1},OPEN);
 assert.equal(r.coins,200,'10 × level 20');assert.equal(s.coins,coins+200);assert.equal(s.stats.earned,earned,'a farm event\'s Earn coins goal never counts it');
 assert.equal(passReward({coins:10},7).coins,70);assert.equal(passReward({coins:30},13).coins,390);assert.equal(passReward({coins:10},1).coins,10);
 const pies=s.inventory.pie;applyFarmAction(s,{type:'pass_claim',track:'paid',tier:4},OPEN);assert.equal(s.inventory.pie,pies+1);
 s.boosts.harvestUntil=OPEN+H;applyFarmAction(s,{type:'pass_claim',track:'paid',tier:6},OPEN);assert.equal(s.boosts.harvestUntil,OPEN+2*H,'after the boost that runs');
 const days=s.stats.vip_days;applyFarmAction(s,{type:'pass_claim',track:'paid',tier:20},OPEN);
 assert.equal(s.vipExpiresAt,OPEN+7*D);assert.equal(s.stats.vip_days,days+7,'VIP counted like VIP bought');
 const diamonds=s.diamonds,spent=s.stats.diamonds_spent;applyFarmAction(s,{type:'pass_claim',track:'paid',tier:25},OPEN);
 assert.equal(s.diamonds,diamonds+200);assert.equal(s.stats.diamonds_spent,spent);
 assert.equal(s.xp,farm(20,OPEN).xp,'no XP from the pass');
});

test('the balance: no diamonds on the free row; the paid row holds the 500 of the €4.99 pack, a week of VIP and nine boosts',()=>{
 const sum=(track,key)=>SEASON_PASS.tiers.reduce((n,t)=>n+(t[track][key]??0),0);
 assert.equal(sum('free','diamonds'),0,'no extra free diamonds');assert.equal(sum('free','vipDays'),0);
 assert.equal(sum('paid','diamonds'),500);assert.equal(sum('paid','vipDays'),7);
 assert.equal(SEASON_PASS.tiers.filter(t=>t.paid.boost).length,9);
 assert.equal(SEASON_PASS.tiers.filter(t=>t.free.boost).every(t=>t.free.length==='30m'),true,'the free boosts are 30 minutes, like the daily gift\'s');
 assert.ok(SEASON_PASS.tiers.every(t=>PASS_TRACKS.every(track=>Object.keys(t[track]).length&&!('xp' in t[track]))),'every tier has both rewards, none of them XP');
 // Shop worth of the paid row in diamonds: 500 + VIP 7 days + the boosts at their own prices: about five times the price.
 const worth=sum('paid','diamonds')+VIP_PLANS.week.cost+SEASON_PASS.tiers.filter(t=>t.paid.boost).reduce((n,t)=>n+BOOSTS[t.paid.boost].prices[t.paid.length],0);
 assert.equal(worth,2530);
 assert.equal(SEASON_PASS.tiers.reduce((n,t)=>n+(t.free.coins??0),0),570);assert.equal(sum('paid','coins'),560);
 assert.equal(passPaidTotals().diamonds,500);
 assert.equal(DIAMOND_PACKS.find(p=>p.amount===500).price,'€4.99');
 assert.equal(passValueLine(),'The 500 diamonds alone cost €4.99 in the shop.','a true comparison, never a made-up "was" price');
 assert.doesNotMatch(read('public/pass-ui.js'),/normally|<s>|Worth /i);
});

test('the farm keeps what was bought; a pass from another season is cleared',()=>{
 const s=farm(20,OPEN);s.passPremium=[SEASON_PASS.id,SEASON_PASS.id,7,'spring-2027'];normalizeFarm(s,OPEN);
 assert.deepEqual(s.passPremium,[SEASON_PASS.id,'spring-2027']);
 s.pass={id:'halloween-2025',base:{visits:0},free:[1,2],paid:[]};normalizeFarm(s,OPEN);
 assert.equal(s.pass.id,SEASON_PASS.id);assert.deepEqual(s.pass.free,[]);
 s.pass.free=[1,1,99,'2',3];normalizeFarm(s,OPEN);assert.deepEqual(s.pass.free,[1,3]);
 assert.equal(createFarm(OPEN).passPremium,undefined,'nothing new on a farm that never bought one');
});

test('a claim shows at once, like the other claims',()=>{
 const s=farm(20,OPEN);gift(s,OPEN);
 const shown=instantResult(s,{type:'pass_claim',track:'free',tier:1},OPEN);
 assert.ok(shown);assert.deepEqual(shown.trial.pass.free,[1]);assert.equal(s.pass.free.length,0,'the farm itself waits for the server');
});

test('payments: the pass is one €4.99 purchase with no diamonds of its own, on the same dates as the game',()=>{
 assert.equal(PASS.id,SEASON_PASS.id);assert.equal(PASS.startsAt,SEASON_PASS.startsAt);assert.equal(PASS.endsAt,SEASON_PASS.endsAt);
 assert.equal(PASS.level,SEASON_PASS.level);assert.equal(PASS.cents,SEASON_PASS.cents);assert.equal(PASS.cents,499);assert.equal(PASS.name,SEASON_PASS.name);
 assert.equal(paymentPack('pass').pass,true);
 // Until the Stripe price exists the pack has none, and checkout says the pass is not available yet.
 if(!PASS.price){assert.equal(PASS.product,null);}else{assert.match(PASS.price,/^price_/);assert.match(PASS.product,/^prod_/);}
 const price=PASS.price??'price_pass_fixture';
 const fixture=()=>({
  purchase:{id:'purchase',player_id:'player',pack:'pass',pass_id:PASS.id,diamonds:0,coins:0,amount_cents:499,price_id:price,livemode:true,stripe_session_id:'cs_1'},
  session:{id:'cs_1',payment_status:'paid',status:'complete',mode:'payment',livemode:true,client_reference_id:'player',metadata:{purchase_id:'purchase',player_id:'player',app:'harvest-tycoon'},currency:'eur',amount_total:499,amount_subtotal:499,payment_intent:'pi_1'},
  items:{has_more:false,data:[{quantity:1,price:{id:price}}]}});
 const f=fixture();
 if(PASS.price)assert.equal(validatePaidSession(f.session,f.purchase,f.items),'pi_1');
 else assert.throws(()=>validatePaidSession(f.session,f.purchase,f.items),/Payment items mismatch/,'no price, no valid receipt');
 for(const mutate of [x=>x.purchase.pass_id='spring-2027',x=>x.purchase.pass_id=null,x=>x.purchase.diamonds=500,x=>x.purchase.coins=1000])
  {const g=fixture();mutate(g);assert.throws(()=>validatePaidSession(g.session,g.purchase,g.items),/Pass mismatch/);}
 const cheap=fixture();cheap.session.amount_total=cheap.session.amount_subtotal=199;assert.throws(()=>validatePaidSession(cheap.session,cheap.purchase,cheap.items));
 assert.equal(read('supabase/functions/diamond-checkout/payments.js'),read('game/payments.js'));
 assert.equal(read('supabase/functions/stripe-webhook/payments.js'),read('game/payments.js'));
 assert.equal(read('public/farm-state.js'),read('game/farm-state.js'));
 assert.equal(read('supabase/functions/farm-api/farm-state.js'),read('game/farm-state.js'));
});

test('checkout: only while open, from level 10, once per farmer per pass, and not before the Stripe price exists',()=>{
 const fn=read('supabase/functions/diamond-checkout/index.ts');
 assert.match(fn,/if\(Date\.now\(\)<PASS\.startsAt\)return reply\(\{error:`The \$\{PASS\.name\} is not open yet\.`\},409\);/);
 assert.match(fn,/if\(!passOnSale\(\)\)return reply\(\{error:`The \$\{PASS\.name\} has ended\.`\},409\);/);
 assert.match(fn,/if\(!PASS\.price\)return reply\(\{error:`The \$\{PASS\.name\} is not available yet\.`\},503\);/);
 assert.match(fn,/if\(\(level\.data\?\.level\?\?1\)<PASS\.level\)return reply/);
 assert.match(fn,/\.eq\('pack','pass'\)\.eq\('pass_id',PASS\.id\)\.in\('status',\['credited','test_paid'\]\)/);
 assert.match(fn,/if\(owned\.data\?\.length\)return reply\(\{error:`You already have the \$\{PASS\.name\}\.`\},409\);/);
 assert.match(fn,/\.\.\.\(packId==='pass'\?\{pass_id:pack\.passId\}:\{\}\)/,'the purchase row names the pass');
 assert.match(fn,/packId==='pass'\?query\.eq\('pack','pass'\)\.eq\('pass_id',pack\.passId\)\.neq\('status','expired'\)/,'a second tap reuses the checkout');
 assert.match(fn,/const pass=\{id:PASS\.id,cents:PASS\.cents,startsAt:PASS\.startsAt,endsAt:PASS\.endsAt,level:PASS\.level,ready:Boolean\(PASS\.price\)\};/,'the catalogue needs no extra look-up');
});

test('the database: a pass row, one per farmer per pass, crediting adds it to passPremium and never fails a valid payment',()=>{
 const sql=read('supabase/season-pass.sql');
 assert.match(sql,/add column if not exists pass_id text check \(pass_id is null or pass_id ~ '\^\[a-z0-9-\]\{3,40\}\$'\)/);
 assert.match(sql,/'starter','offer','pass'\]\)\)/);
 assert.match(sql,/\(pack='pass' and diamonds=0\)/);
 assert.match(sql,/\(pack='pass' and pass_id is not null and diamonds=0 and coins=0 and vip_days=0 and amount_cents=499\)\);/);
 assert.match(sql,/create unique index if not exists harvest_one_pass_per_player on public\.harvest_purchases\(player_id, pass_id\)\n where pack='pass' and status<>'expired';/);
 assert.match(sql,/if purchase\.pack='pass' then\n   farm_state:=jsonb_set\(farm_state,'\{passPremium\}',\(select coalesce\(jsonb_agg\(distinct v\),'\[\]'::jsonb\)/);
 assert.match(sql,/case when jsonb_typeof\(farm_state->'passPremium'\)='array' then farm_state->'passPremium' else '\[\]'::jsonb end/,'a broken list never stops the credit');
 assert.equal((sql.match(/when new\.pack='pass' then 'the Halloween Pass'/g)??[]).length,2,'the admin notice and the farmer\'s log');
 // Everything else in the credit function is the live one (special-offer.sql), unchanged.
 const live=read('supabase/special-offer.sql'),body=src=>src.slice(src.indexOf('create or replace function public.harvest_credit_purchase'),src.indexOf('end $function$;',src.indexOf('create or replace function public.harvest_credit_purchase')));
 const passBranch=/  if purchase\.pack='pass' then\n[\s\S]*?\n  end if;\n/;
 assert.equal(body(sql).replace(passBranch,''),body(live));
 assert.match(read('supabase/functions/farm-api/player-log.js'),/pass_claim:\['rewards',/);
 assert.match(read('src/admin-dashboard.js'),/p\.pack==='pass'\?'Halloween Pass'/);
});

test('screens: a button and a More tile from level 10, a window that opens only when tapped, the rule where lanterns are earned',()=>{
 const html=read('public/farm.html'),ui=read('public/pass-ui.js'),game=read('public/game.js');
 assert.match(html,/<button class="icon-button" id="pass-button" aria-label="Open the Halloween Pass" aria-haspopup="dialog" title="Halloween Pass" hidden><i data-game-art="giant-small"><\/i><span id="pass-dot" aria-hidden="true" hidden>!<\/span><\/button><button class="icon-button" id="family-button"/);
 assert.match(html,/<button data-menu-action="events-button">[^\n]*\n    <button data-menu-action="pass-button" id="pass-menu-entry" hidden>/,'under Every day, after Events');
 assert.match(html,/<dialog id="pass-dialog" class="game-dialog wide-dialog" aria-labelledby="pass-title">/);
 assert.match(read('public/pass.css'),/@media\(max-width:900px\),\(max-height:550px\) and \(pointer:coarse\)\{#pass-button\{display:none\}\}/,'a clean header on phones, like Farm family');
 assert.match(read('public/mobile-ui.js'),/passTile\.hidden=pass\.hidden;/);
 assert.match(read('public/mobile-ui.js'),/&&!passWaiting&&!familyWaiting&&!chatWaiting&&!emailWaiting;/);
 assert.equal((ui.match(/showModal\(\)/g)??[]).length,1,'one way in');assert.match(ui,/function open\(\)\{\n  if\(!passVisible\(state,now\(\)\)\)return;/);
 assert.match(ui,/button\.onclick=open;/);assert.doesNotMatch(ui,/autoOpen|setTimeout\(open|localStorage|sessionStorage/,'never by itself, nothing kept on the device');
 assert.match(game,/passUI=createPassUI\(\{state,runAction,notify:toast,onChange:updateUI\}\);/);assert.match(game,/familyUI\?\.refresh\(\);passUI\?\.refresh\(\);/);
 assert.equal(passVisible(farm(9,SEASON_PASS.startsAt-D),SEASON_PASS.startsAt-D),false);
 assert.equal(passVisible(farm(10,SEASON_PASS.startsAt-D),SEASON_PASS.startsAt-D),true,'the preview from level 10');
 assert.equal(passRule(),'Every daily gift gives 2 lanterns, every daily challenge and delivery 1. Every 2 lanterns open the next tier.');
 assert.equal(passPhaseLine(SEASON_PASS.startsAt-2*D-3*H),'Coming soon · opens in 2d 3h');
 assert.equal(passPhaseLine(SEASON_PASS.endsAt-5*H),'Ends in 5h');
 assert.equal(passPhaseLine(SEASON_PASS.endsAt+D),'Collect your rewards · 6d left');
 assert.deepEqual(passRewardParts({coins:20},15).map(p=>p.label),['300 coins']);
 assert.deepEqual(rewardParts({boost:'harvest',length:'1d'}).map(p=>p.label),['Double harvest · 1 day']);
 assert.deepEqual(rewardParts({vipDays:7}).map(p=>p.label),['VIP · 7 days']);
 // Today: the lantern chip on the gift, each challenge and each order, only while the farm's lanterns count.
 const s=farm(20,OPEN);assert.match(lanternChip(s,'gift',OPEN),/\+2 lanterns/);assert.match(lanternChip(s,'daily',OPEN),/\+1 lantern</);
 assert.equal(lanternChip(s,'gift',SEASON_PASS.endsAt),'');assert.equal(lanternChip(farm(20,SEASON_PASS.startsAt-H),'gift',SEASON_PASS.startsAt-H),'');
 const today=read('public/retention-ui.js');
 for(const kind of ['gift','daily','delivery'])assert.match(today,new RegExp(`lanternChip\\(state,'${kind}'`));
 // The Diamond shop banner only while it is for sale and not bought.
 assert.match(ui,/banner\(visible&&passPhase\(t\)==='open'&&!passPremium\(state\)\);/);
});

test('texts: the wiki, a loading tip, the purchase screens and the privacy policy say the same rule',()=>{
 const daily=wikiArticle('daily',{now:OPEN}).html.replace(/<[^>]+>/g,'');
 assert.match(daily,/From 23 October to 2 November\. Every daily gift gives 2 lanterns, every daily challenge and every delivery 1\. Every 2 lanterns open the next of 30 tiers\. Collect each reward with its own button, until 9 November\./);
 assert.match(daily,/For €4\.99 the paid rewards open too: 500 diamonds, 7 days of VIP, 9 boosts/);
 assert.match(daily,/30-minute boosts/);
 assert.match(wikiArticle('daily',{now:Date.UTC(2026,9,2)}).html,/Halloween Pass/,'the preview too');
 assert.doesNotMatch(wikiArticle('daily',{now:SEASON_PASS.claimUntil}).html,/Halloween Pass/,'gone after the collecting week');
 assert.match(wikiArticle('diamonds',{now:OPEN}).html,/opens its paid rewards for €4\.99, from level 10\./);
 assert.doesNotMatch(wikiArticle('diamonds',{now:SEASON_PASS.endsAt}).html,/Halloween Pass/);
 assert.equal(PASS_LOADING_TIP[0],'giant-small');assert.ok(read('public/assets/icons/giant-small.webp').length>1000,'existing art, WebP');
 assert.match(read('public/game.js'),/passPhase\(Date\.now\(\)\)==='open'\?\[PASS_LOADING_TIP,\.\.\.LOADING_TIPS\]:LOADING_TIPS/,'the tip only while it is open');
 assert.match(read('src/payment-ui.js'),/if\(result\.pack==='pass'\)display\('credited','Your Halloween Pass is here!'/);
 assert.match(read('public/privacy.html'),/When you buy diamonds, a pack, a special offer or a season pass such as the Halloween Pass, you pay on a checkout page run by <strong>Stripe<\/strong>\./);
 assert.match(read('src/analytics.js'),/'starter','offer','pass'\]\)/);
});
