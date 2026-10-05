import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SEASON_PASS,PASS_TRACKS,passPhase,passLanterns,passTier,passPremium,passVisible,passWaiting,passReward,claimPassTier,createFarm,normalizeFarm,applyFarmAction,xpForLevel,levelOf,utcDay,DIAMOND_PACKS,VIP_PLANS,BOOSTS} from '../game/farm-state.js';
import {PASS,paymentPack,validatePaidSession,passOnSale,passCheckoutProblem} from '../game/payments.js';
import {instantResult} from '../public/farm-client.js';
import {passRule,passPaidTotals,passValueLine,passRewardParts,rewardParts,passPhaseLine,lanternChip,passStartsLine,passPaidBox,createPassUI} from '../public/pass-ui.js';
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
 const idle=farm(20,OPEN);normalizeFarm(idle,end+H);assert.equal(idle.pass.id,SEASON_PASS.id);
 assert.equal(passVisible(idle,end+H),false,'nor one that reached no tier: nothing to collect, so no button for a week');
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

// The pre-sale (Oct 2026): the database writes the pass into the farm whenever it is paid, also weeks before 23 October.
test('a pass bought in the pre-sale shows as bought at once, but nothing can be claimed before 23 October, and then only reached tiers',()=>{
 const before=SEASON_PASS.startsAt-3*D,s=farm(20,before);
 s.passPremium=[SEASON_PASS.id];normalizeFarm(s,before);
 assert.equal(passPremium(s),true,'bought shows at once');assert.equal(s.pass,undefined,'no lanterns before the season');
 gift(s,before);assert.equal(passLanterns(s),0,'a daily gift before the season brings none');
 for(const track of PASS_TRACKS)for(const tier of [1,30])assert.throws(()=>claimPassTier(s,track,tier,before),/not open yet/);
 assert.throws(()=>applyFarmAction(s,{type:'pass_claim',track:'paid',tier:1},SEASON_PASS.startsAt-1),/not open yet/,'not a moment before it opens');
 assert.equal(passWaiting(s,before),0,'no "!" before the season');
 // The season opens: the paid row is open, the count starts there, and every paid reward still needs its tier.
 normalizeFarm(s,OPEN);assert.equal(passPremium(s),true);assert.equal(passLanterns(s),0);assert.deepEqual(s.pass.paid,[]);
 assert.throws(()=>claimPassTier(s,'paid',1,OPEN),/Collect 2 more lanterns/);
 gift(s,OPEN);assert.equal(passWaiting(s,OPEN),2,'the free and the paid reward of tier 1');
 assert.throws(()=>claimPassTier(s,'paid',2,OPEN),/Collect 2 more lanterns/);
 const diamonds=s.diamonds;assert.equal(applyFarmAction(s,{type:'pass_claim',track:'paid',tier:1},OPEN).diamonds,50);assert.equal(s.diamonds,diamonds+50);
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
 // The owner's changes to the map's tables (no decorations or avatars in this first season).
 assert.deepEqual({...SEASON_PASS.tiers[9].free},{coins:20});assert.deepEqual({...SEASON_PASS.tiers[29].free},{coins:100});
 assert.deepEqual({...SEASON_PASS.tiers[11].paid},{coins:40});assert.deepEqual({...SEASON_PASS.tiers[29].paid},{boost:'harvest',length:'1d'});
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
 // The Stripe product 'Halloween Pass' (2 Oct 2026): checkout charges this price and checks it belongs to this product.
 assert.equal(PASS.price,'price_1ULzBo04FdNTUSp4ncaXGr2m');assert.equal(PASS.product,'prod_VMidVtFUFBIZTw');assert.equal(paymentPack('pass').price,PASS.price);
 const price=PASS.price;
 const fixture=()=>({
  purchase:{id:'purchase',player_id:'player',pack:'pass',pass_id:PASS.id,diamonds:0,coins:0,amount_cents:499,price_id:price,livemode:true,stripe_session_id:'cs_1'},
  session:{id:'cs_1',payment_status:'paid',status:'complete',mode:'payment',livemode:true,client_reference_id:'player',metadata:{purchase_id:'purchase',player_id:'player',app:'harvest-tycoon'},currency:'eur',amount_total:499,amount_subtotal:499,payment_intent:'pi_1'},
  items:{has_more:false,data:[{quantity:1,price:{id:price}}]}});
 const f=fixture();
 assert.equal(validatePaidSession(f.session,f.purchase,f.items),'pi_1','a real receipt for the pass is valid');
 const other=fixture();other.purchase.price_id=other.items.data[0].price.id='price_1UI5oE04FdNTUSp4F2BP95IK';
 assert.throws(()=>validatePaidSession(other.session,other.purchase,other.items),/Payment items mismatch/,'not with the €4.99 diamond pack\'s price');
 const test=fixture();test.session.livemode=false;assert.throws(()=>validatePaidSession(test.session,test.purchase,test.items),/Payment mode mismatch/);
 for(const mutate of [x=>x.purchase.pass_id='spring-2027',x=>x.purchase.pass_id=null,x=>x.purchase.diamonds=500,x=>x.purchase.coins=1000])
  {const g=fixture();mutate(g);assert.throws(()=>validatePaidSession(g.session,g.purchase,g.items),/Pass mismatch/);}
 const cheap=fixture();cheap.session.amount_total=cheap.session.amount_subtotal=199;assert.throws(()=>validatePaidSession(cheap.session,cheap.purchase,cheap.items));
 assert.equal(read('supabase/functions/diamond-checkout/payments.js'),read('game/payments.js'));
 assert.equal(read('supabase/functions/stripe-webhook/payments.js'),read('game/payments.js'));
 assert.equal(read('public/farm-state.js'),read('game/farm-state.js'));
 assert.equal(read('supabase/functions/farm-api/farm-state.js'),read('game/farm-state.js'));
});

// The pre-sale (Oct 2026): "you can buy it already, it starts on 23 October", so the paid row is for sale from the preview on.
test('checkout: for sale already before the season (the pre-sale) until it ends, from level 10, once per farmer per pass, with its Stripe price',()=>{
 const soon=Date.UTC(2026,9,2),start=PASS.startsAt,end=PASS.endsAt;
 assert.equal(passOnSale(soon),true,'the pre-sale');assert.equal(passOnSale(start-1),true);assert.equal(passOnSale(start),true);assert.equal(passOnSale(end-1),true);
 assert.equal(passOnSale(end),false,'sales stop when the season ends');assert.equal(passOnSale(SEASON_PASS.claimUntil),false);
 assert.equal(passCheckoutProblem({level:10,now:soon}),null,'accepted before the season opens');
 assert.equal(passCheckoutProblem({level:10,now:start-1}),null);assert.equal(passCheckoutProblem({level:80,now:OPEN}),null,'and while it is open');
 assert.deepEqual(passCheckoutProblem({level:20,now:end}),{error:'The Halloween Pass has ended.',status:409});
 assert.deepEqual(passCheckoutProblem({level:20,now:end+5*D}),{error:'The Halloween Pass has ended.',status:409},'not in the collecting week');
 assert.deepEqual(passCheckoutProblem({level:9,now:soon}),{error:'The Halloween Pass opens at level 10.',status:409});
 assert.deepEqual(passCheckoutProblem({level:9,now:OPEN}),{error:'The Halloween Pass opens at level 10.',status:409});
 assert.deepEqual(passCheckoutProblem({level:NaN,now:soon}),{error:'The Halloween Pass opens at level 10.',status:409},'no level, no pass');
 assert.deepEqual(passCheckoutProblem({level:20,owned:true,now:soon}),{error:'You already have the Halloween Pass.',status:409});
 assert.deepEqual(passCheckoutProblem({level:20,owned:true,now:OPEN}),{error:'You already have the Halloween Pass.',status:409});
 assert.deepEqual(passCheckoutProblem({level:20,now:soon,price:null}),{error:'The Halloween Pass is not available yet.',status:503});
 assert.deepEqual(passCheckoutProblem({level:20,now:end,owned:true,price:null}),{error:'The Halloween Pass has ended.',status:409},'after the end it says so first');
 // diamond-checkout asks exactly that, with the farmer's level and whether a paid pass purchase exists; nothing waits for 23 October.
 const fn=read('supabase/functions/diamond-checkout/index.ts');
 assert.doesNotMatch(fn,/not open yet|Date\.now\(\)<PASS\.startsAt/,'no wait for the season');
 assert.match(fn,/const problem=passCheckoutProblem\(\{level:level\.data\?\.level\?\?1,owned:Boolean\(owned\.data\?\.length\)\}\);\n   if\(problem\)return reply\(\{error:problem\.error\},problem\.status\);/);
 assert.match(fn,/\.eq\('pack','pass'\)\.eq\('pass_id',PASS\.id\)\.in\('status',\['credited','test_paid'\]\)/);
 assert.match(fn,/pack=\{id:'pass',cents:PASS\.cents,price:PASS\.price,product:PASS\.product,diamonds:0,coins:0,passId:PASS\.id\};/,'the price must belong to the Halloween Pass product');
 assert.match(fn,/\(live&&pack\.product&&price\.product!==pack\.product\)/);
 assert.match(fn,/const purchaseReply=\(p:any\)=>\(\{id:p\.id,pack:p\.pack,coins:p\.coins,diamonds:p\.diamonds,status:p\.status,livemode:p\.livemode,vipDays:p\.vip_days\?\?0,serverNow:Date\.now\(\)\}\);/,'the purchase status carries the server clock (the return text)');
 assert.match(fn,/if\(body\.operation==='status'\)\{[^]*?return reply\(purchaseReply\(r\.data\)\);\n  \}/);
 assert.match(fn,/\.\.\.\(packId==='pass'\?\{pass_id:pack\.passId\}:\{\}\)/,'the purchase row names the pass');
 assert.match(fn,/packId==='pass'\?query\.eq\('pack','pass'\)\.eq\('pass_id',pack\.passId\)\.neq\('status','expired'\)/,'a second tap reuses the checkout');
 assert.match(fn,/const pass=\{id:PASS\.id,cents:PASS\.cents,startsAt:PASS\.startsAt,endsAt:PASS\.endsAt,level:PASS\.level,ready:Boolean\(PASS\.price\)&&passOnSale\(\)\};/,'the catalogue says it is for sale during the preview too, with no extra look-up');
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
 // A narrow computer: with the pass button the header held one button too many (Help fell off at 1024 and 1200 px with the chat on).
 const css=read('public/pass.css');
 assert.match(css,/@media\(min-width:901px\) and \(max-width:1365px\)\{\n \.topbar \.resources:has\(>#pass-button:not\(\[hidden\]\)\)\{gap:3px\}\n \.topbar \.resources:has\(>#pass-button:not\(\[hidden\]\)\)>:is\(#pass-button,#family-button,#chat-button,#admin-button,#sound-button,#feedback-button,#help-button\)\{width:36px;padding-inline:3px\}\n\}/,'narrower icon buttons only while the pass button shows');
 assert.match(css,/@media\(min-width:901px\) and \(max-width:1199px\)\{\.topbar \.resources:has\(>#pass-button:not\(\[hidden\]\)\) \.resource-label\{display:none\}\}/);
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
 // The Diamond shop banner only while it is for sale (the pre-sale too, Oct 2026) and not bought; never where payments are off (CrazyGames,
 // the Android app: public/portal.js).
 assert.match(ui,/banner\(visible&&\['soon','open'\]\.includes\(passPhase\(t\)\)&&!passPremium\(state\)&&!portalOff\('payments'\)&&catalog\?\.pass\?\.ready!==false\);/);
});

test('texts: the wiki, a loading tip, the purchase screens and the privacy policy say the same rule',()=>{
 const daily=wikiArticle('daily',{now:OPEN}).html.replace(/<[^>]+>/g,'');
 assert.match(daily,/From 23 October to 2 November\. Every daily gift gives 2 lanterns, every daily challenge and every delivery 1\. Every 2 lanterns open the next of 30 tiers\. Collect each reward with its own button, until 9 November\./);
 assert.match(daily,/For €4\.99 the paid rewards open too: 500 diamonds, 7 days of VIP, 9 boosts/);
 assert.match(daily,/30-minute boosts/);
 assert.match(wikiArticle('daily',{now:Date.UTC(2026,9,2)}).html,/Halloween Pass/,'the preview too');
 assert.doesNotMatch(wikiArticle('daily',{now:SEASON_PASS.claimUntil}).html,/Halloween Pass/,'gone after the collecting week');
 assert.match(wikiArticle('diamonds',{now:OPEN}).html.replace(/<[^>]+>/g,''),/From level 10 the Halloween Pass opens its paid rewards for €4\.99\. You can buy it until 2 November\./);
 // The pre-sale (Oct 2026): before the season the wiki says it can be bought already, and when it starts.
 for(const id of ['daily','diamonds'])assert.match(wikiArticle(id,{now:Date.UTC(2026,9,2)}).html,/You can buy it already; it starts on 23 October\./);
 assert.doesNotMatch(wikiArticle('daily',{now:OPEN}).html,/buy it already/);assert.doesNotMatch(wikiArticle('daily',{now:SEASON_PASS.endsAt}).html,/You can buy it/,'not in the collecting week');
 // In the game the wiki reads the farm's clock (the server's), as the pass window does, never the device's.
 const wikiUI=read('public/wiki-ui.js');
 assert.match(wikiUI,/^import \{farmNow\} from '\.\/farm-client\.js';$/m);assert.match(wikiUI,/function ctx\(\)\{return \{level:farm\?levelOf\(farm\):null,href:id=>`#wiki-\$\{id\}`,now:farmNow\(\)\};\}/);
 assert.doesNotMatch(wikiArticle('diamonds',{now:SEASON_PASS.endsAt}).html,/Halloween Pass/);
 assert.equal(PASS_LOADING_TIP[0],'giant-small');assert.ok(read('public/assets/icons/giant-small.webp').length>1000,'existing art, WebP');
 assert.match(read('public/game.js'),/passPhase\(Date\.now\(\)\)==='open'\?\[PASS_LOADING_TIP,\.\.\.LOADING_TIPS\]:LOADING_TIPS/,'the tip only while it is open');
 assert.match(read('src/payment-ui.js'),/if\(result\.pack==='pass'\)\{const wait=PASS\.startsAt-\(Number\(result\.serverNow\)\|\|Date\.now\(\)\);display\('credited','Your Halloween Pass is here!',wait>0\?`It starts in \$\{formatDuration\(wait\)\}\./,'bought in the pre-sale, it says when it starts (tests/payment-return.test.mjs runs it)');
 assert.match(read('public/privacy.html'),/When you buy diamonds, a pack, a special offer or a season pass such as the Halloween Pass on our website, you pay on a checkout page run by <strong>Stripe<\/strong>\./);
 assert.match(read('src/analytics.js'),/'starter','offer','pass'\]\)/);
});

// A stand-in for the farm page, enough for public/pass-ui.js: the pass button, its window, the More tile's line and the Diamond shop.
function passPage(){
 const node=(extra={})=>({hidden:false,textContent:'',dataset:{},...extra});
 const buy=node(),content={html:'',set innerHTML(v){this.html=v;},get innerHTML(){return this.html;},querySelectorAll:()=>[],querySelector:sel=>sel==='.pass-buy'&&content.html.includes('pass-buy')?buy:null};
 const dialog=node({open:false,showModal(){this.open=true;},close(){this.open=false;}});
 const nodes={'pass-button':node(),'pass-dot':node(),'pass-dialog':dialog,'pass-content':content,'pass-menu-hint':node()};
 const wallet={after(b){nodes['shop-pass']=b;}};
 const doc={getElementById:id=>nodes[id]??null,querySelectorAll:()=>[],querySelector:sel=>sel==='#boost-dialog .boost-wallet'?wallet:null,createElement:()=>({hidden:false,dataset:{},set innerHTML(v){this.html=v;}})};
 const listeners={};
 return {doc,nodes,dialog,content,buy,window:{addEventListener(name,fn){listeners[name]=fn;},removeEventListener(){}},close:()=>listeners.pagehide?.()};
}
const settle=async()=>{for(let n=0;n<10;n++)await Promise.resolve();};
test('the pass window before the season: Buy for €4.99 with "Starts in", then "You have the Halloween Pass", never a Claim (the pre-sale)',async()=>{
 const page=passPage(),saved={window:globalThis.window,document:globalThis.document};
 globalThis.window=page.window;globalThis.document={querySelectorAll:()=>[]};
 try{
  let t=SEASON_PASS.startsAt-(20*D+18*H);const s=farm(20,t),checkouts=[],catalogs=[];
  const bridge={payments:async q=>{catalogs.push(q);return {enabled:true,mode:'live',pass:{id:PASS.id,cents:499,ready:true}};},checkout:async(...args)=>{checkouts.push(args);}};
  const ui=createPassUI({state:s,runAction:async()=>{},notify(){},bridge:()=>bridge,doc:page.doc,clock:()=>t});
  assert.equal(page.dialog.open,false,'it never opens by itself');assert.equal(page.nodes['pass-button'].hidden,false,'the button from level 10, as before');
  assert.equal(page.nodes['pass-menu-hint'].textContent,'Coming soon');
  const banner=page.nodes['shop-pass'];assert.equal(banner.hidden,false,'the Diamond shop shows the pre-sale');assert.match(banner.html,/<small>Starts in 20d 18h<\/small>/);assert.match(banner.html,/€4\.99/);
  ui.open();await settle();
  assert.equal(page.dialog.open,true);assert.deepEqual(catalogs,[{operation:'catalog'}]);
  const html=page.content.html;
  assert.match(html,/<p class="pass-phase" data-pass-phase>Coming soon · opens in 20d 18h<\/p>/);
  assert.match(html,/<button type="button" class="primary-button pass-buy" >Buy for €4\.99<\/button>/,'an enabled gold Buy button');
  assert.match(html,/<small class="pass-starts" data-pass-starts>Starts in 20d 18h<\/small>/);
  assert.match(html,/500 diamonds, 7 days of VIP, 9 boosts and more\.<\/small>/,'no "tiers you already reached" before there are any');
  assert.doesNotMatch(html,/data-pass-claim|Tiers you already reached/);assert.equal((html.match(/primary-button/g)??[]).length,1,'one big button in the window');
  assert.equal((html.match(/data-pass-row=/g)??[]).length,30,'the reward preview stays');
  page.buy.onclick();await settle();assert.deepEqual(checkouts.map(c=>c[0]),['pass'],'Buy opens the pass checkout');
  // Paid: the database writes the pass into the farm; the window says so and when it starts, still without a Claim.
  s.passPremium=[SEASON_PASS.id];normalizeFarm(s,t);t+=H;ui.refresh();
  const bought=page.content.html;
  assert.match(bought,/<section class="pass-paid-box is-owned"><div class="pass-paid-copy"><strong data-pass-starts>You have the Halloween Pass · starts in 20d 17h<\/strong><\/div><\/section>/);
  assert.doesNotMatch(bought,/pass-buy|data-pass-claim|primary-button/);assert.match(bought,/<b>Paid<\/b>/,'the paid row shows as bought');
  assert.equal(page.nodes['shop-pass'].hidden,true,'no banner once bought');
  // The season opens: the paid row is open, every reward with its own Claim once its tier is reached.
  t=OPEN;normalizeFarm(s,t);gift(s,t);ui.refresh();
  const open=page.content.html;
  assert.doesNotMatch(open,/pass-paid-box|You have the Halloween Pass/);
  assert.match(open,/data-pass-claim="free" data-pass-tier="1"/);assert.match(open,/data-pass-claim="paid" data-pass-tier="1"/);assert.doesNotMatch(open,/data-pass-tier="2"/);
 }finally{page.close();globalThis.window=saved.window;globalThis.document=saved.document;if(saved.window===undefined)delete globalThis.window;if(saved.document===undefined)delete globalThis.document;}
});

test('the buy box: also during the season until it ends, not bought yet; quiet while the price is missing; none after',()=>{
 const s=farm(20,OPEN),catalog={enabled:true,mode:'live',pass:{cents:499,ready:true}},soon=SEASON_PASS.startsAt-2*D;
 const during=passPaidBox(s,{phase:'open',now:OPEN,catalog});
 assert.match(during,/class="primary-button pass-buy" >Buy for €4\.99</);assert.doesNotMatch(during,/Starts in/);assert.match(during,/Tiers you already reached open at once\./);
 assert.match(passPaidBox(s,{phase:'soon',now:soon,catalog:{...catalog,mode:'test'}}),/pass-buy" >Test purchase · €4\.99</);
 const off=passPaidBox(s,{phase:'soon',now:soon,catalog:{...catalog,pass:{cents:499,ready:false}}});
 assert.match(off,/pass-buy" disabled>Buy for €4\.99</);assert.match(off,/Purchases are not available yet\. Please check back later\./);
 assert.match(passPaidBox(s,{phase:'soon',now:soon,catalog:null}),/pass-buy" disabled>/,'until the catalogue has come');
 assert.match(passPaidBox(s,{phase:'soon',now:soon,catalog,pending:true}),/pass-buy" disabled>Opening secure checkout…</);
 for(const phase of ['claim','over'])assert.equal(passPaidBox(s,{phase,now:SEASON_PASS.endsAt+D,catalog}),'','no sale after the end');
 s.passPremium=[SEASON_PASS.id];
 assert.equal(passPaidBox(s,{phase:'open',now:OPEN,catalog}),'','bought: the paid row is open, no box');
 assert.equal(passStartsLine(s,soon),'You have the Halloween Pass · starts in 2d');assert.equal(passStartsLine(farm(20,OPEN),soon-3*H),'Starts in 2d 3h');
});
