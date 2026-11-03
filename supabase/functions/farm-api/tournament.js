// The Super Tournament (3 Nov 2026, the owner: "Maak een super tournement feature: iedereen die in die dag (duur instelbaar) bijvoorbeeld
// het meeste harvest krijgt coins en diamonds, prijzen afhankelijk van deelnemers aan het tournament", "iedereen kan meedoen, vanaf
// lvl 1", "Maak het instelbaar vanuit admin panel, altijd handmatig", "bouw niks nieuws in database, alleen dingen die al gemeten
// worden"). The admin starts one by hand (src/admin-dashboard.js); farm-api (tournament-service.js) checks it against these rules and
// supabase/super-tournament.sql keeps the score: what a farm's own counters (state.stats, and state.xp) rose by since the farmer's
// first counted action of the tournament, nothing measured anew. Copied to public/ and farm-api by scripts/sync-game.mjs.

// The kinds the admin chooses from. score: the counters and their weights (a point each, unless the allround's weights say more);
// pick: the kind needs a crop or a good from the admin, whose own counter is the score; from: the level its counters open at (a kind
// from level 1 suits everyone, the owner's wish; a later one is offered with that level beside it).
export const TOURNAMENT_KINDS=Object.freeze({
 harvest:{title:'Harvest Champion',rule:'Who harvests the most crops?',score:[['harvested',1]],how:'Harvest ready fields. Every crop you harvest is 1 point.',from:1},
 crop:{title:'Crop Tournament',rule:'Who harvests the most of this crop?',pick:'crop',how:'Plant and harvest this one crop. Every one you harvest is 1 point.',from:1},
 produce:{title:'Production Tournament',rule:'Who makes the most goods?',score:[['produced',1]],how:'Collect goods from your buildings. Every good you collect is 1 point.',from:1},
 good:{title:'Goods Tournament',rule:'Who makes the most of this good?',pick:'good',how:'Make and collect this one good. Every one you collect is 1 point.',from:1},
 deliveries:{title:'Delivery Tournament',rule:'Who delivers the most orders?',score:[['deliveries',1]],how:'Fill delivery orders. Every order you deliver is 1 point.',from:1},
 market:{title:'Market Trader',rule:'Who sells the most at the Market?',score:[['sold',1]],how:'Sell crops and goods at the Market. Every item you sell is 1 point.',from:1},
 earned:{title:'Coin Collector',rule:'Who earns the most coins?',score:[['earned',1]],how:'Earn coins: sell, deliver and do chores. Every coin you earn is 1 point.',from:1},
 spender:{title:'Big Spender',rule:'Who spends the most coins?',score:[['coins_spent',1]],how:'Spend coins on seeds, buildings and upgrades. Every coin you spend is 1 point.',from:1},
 chores:{title:'Chore Champion',rule:'Who does the most chores?',score:[['chores',1]],how:'Do farm chores. Every chore you finish is 1 point.',from:1},
 quests:{title:'Quest Hunter',rule:'Who completes the most quests?',score:[['quests_claimed',1]],how:'Complete quests and collect them. Every quest is 1 point.',from:1},
 xp:{title:'XP Race',rule:'Who earns the most XP?',score:[['xp',1]],how:'Earn XP with anything you do on the farm. Every XP is 1 point.',from:1},
 builder:{title:'Master Builder',rule:'Who upgrades the most buildings?',score:[['upgrades',1]],how:'Upgrade your buildings. Every upgrade is 1 point.',from:1},
 grain:{title:'Grain Rush',rule:'Who harvests the most wheat, barley and corn?',score:[['harvest_wheat',1],['harvest_barley',1],['harvest_corn',1]],how:'Harvest wheat, barley and corn. Every one you harvest is 1 point.',from:1},
 vegetables:{title:'Vegetable Market',rule:'Who harvests the most lettuce, cabbage, cauliflower, red cabbage and green beans?',score:[['harvest_lettuce',1],['harvest_cabbage',1],['harvest_cauliflower',1],['harvest_redcabbage',1],['harvest_greenbeans',1]],how:'Harvest lettuce, cabbage, cauliflower, red cabbage and green beans. Every one you harvest is 1 point.',from:3},
 autumn:{title:'Autumn Harvest',rule:'Who harvests the most pumpkins and squash?',score:[['harvest_pumpkin',1],['harvest_squash',1]],how:'Harvest pumpkins and squash. Every one you harvest is 1 point.',from:13},
 fruit:{title:'Fruit Festival',rule:'Who harvests the most apples, berries, cider apples and cherries?',score:[['harvest_apples',1],['harvest_berries',1],['harvest_ciderapples',1],['harvest_cherries',1]],how:'Harvest apples, berries, cider apples and cherries. Every one you harvest is 1 point.',from:20},
 allround:{title:'Farmer of the Week',rule:'Points for everything: 1 a harvest, 2 a good, 3 a chore, 5 an order.',score:[['harvested',1],['produced',2],['chores',3],['deliveries',5]],how:'Do a bit of everything: a harvest is 1 point, a good 2, a chore 3 and an order 5.',from:1},
 village:{title:'Village Helper',rule:'Who helps the most villagers?',score:[['village_requests',1]],how:'Help the villagers in the Village. Every request you fill is 1 point.',from:100},
 harbour:{title:'Harbour Captain',rule:'Who sends the most ships?',score:[['ships_sent',1]],how:'Send ships from the Harbour. Every ship you send is 1 point.',from:200}
});

// how: what a farmer does to score, in one sentence (the wiki lists every kind with it, 3 Nov 2026, the owner: "zet in wiki welke soorten
// tournamenten er zijn voor spelers en wat ze concreet moeten doen").
// Random (3 Nov 2026, the owner: "start er random 3 per week van 24 uur, met normale prijspot, random tournament soort, elke keer een
// ander"): a plan or a start may name 'random'; it then takes one of these, every one open to everyone from level 1 and needing no
// crop or good chosen, and never one of the last three tournaments' kinds (supabase/super-tournament.sql harvest_tournament_autostart).
export const TOURNAMENT_RANDOM='random';
export const TOURNAMENT_POOL=Object.freeze(Object.entries(TOURNAMENT_KINDS).filter(([,k])=>k.from===1&&!k.pick).map(([kind,k])=>Object.freeze({kind,title:k.title,scoring:k.score})));
export function tournamentRandom(recent=[],random=Math.random){
 const fresh=TOURNAMENT_POOL.filter(p=>!recent.includes(p.kind)),from=fresh.length?fresh:TOURNAMENT_POOL;
 return from[Math.floor(random()*from.length)%from.length];
}

// The prize settings, as the owner approved them (3 Nov 2026); the admin may change each within its limits. maxDiamonds and maxCoins
// cap the pot; one farmer wins at most TOURNAMENT_PRIZE_MAX whatever the pot (the owner: "Max. te winnen supertournament is 500
// diamanten", "0-1.000.000 coins", "per speler"): with the pot's top share of 25 %, a pot of 2,000 diamonds pays the first place 500.
// winners (3 Nov 2026, the owner: "Aantal winnaars"): a set number of winning places from TOURNAMENT_WIDE_FROM farmers who count;
// 0 keeps one place per placeStep farmers.
export const TOURNAMENT_DEFAULTS=Object.freeze({diamondsPerPlayer:2,coinsPerPlayer:2000,maxDiamonds:2000,maxCoins:4000000,placeStep:10,minScore:10,winners:0});
export const TOURNAMENT_LIMITS=Object.freeze({diamondsPerPlayer:[0,10],coinsPerPlayer:[0,20000],maxDiamonds:[0,5000],maxCoins:[0,10000000],placeStep:[5,100],minScore:[1,1000],winners:[0,500]});
export const TOURNAMENT_PRIZE_MAX=Object.freeze({diamonds:500,coins:1000000});
export const TOURNAMENT_HOURS=Object.freeze([1,72]);
// Below this many counted farmers only the top 3 win (50 / 30 / 20 %); from it one more place per placeStep farmers, the top 3 25 /
// 15 / 10 % and the other places 50 % in equal parts, so a lower place never wins more than a higher one.
export const TOURNAMENT_WIDE_FROM=80;

const STAT=/^(xp|[a-z][a-z_]{1,40})$/;
// The counters and weights a kind scores, or null when the kind or its pick is not valid. crops and goods: the game's own lists.
export function tournamentScoring(kind,pick,{crops={},goods={}}={}){
 const k=TOURNAMENT_KINDS[kind];if(!k)return null;
 if(k.pick==='crop')return Object.hasOwn(crops,pick)?[['harvest_'+pick,1]]:null;
 if(k.pick==='good')return Object.hasOwn(goods,pick)?[['made_'+pick,1]]:null;
 return k.score.map(([stat,weight])=>[stat,weight]);
}
// A tournament's settings: the defaults, each value the admin sent kept within its limits.
export function tournamentSettings(sent={}){
 const out={};
 for(const [key,fallback] of Object.entries(TOURNAMENT_DEFAULTS)){const [lo,hi]=TOURNAMENT_LIMITS[key];const n=Number(sent?.[key]);out[key]=Number.isFinite(n)?Math.min(hi,Math.max(lo,Math.round(n))):fallback;}
 return out;
}
// What a farm's counters stand at, for the counters a tournament scores (supabase/super-tournament.sql reads them the same way).
export function tournamentCounters(state,scoring){
 return Object.fromEntries(scoring.map(([stat])=>[stat,Math.max(0,Math.floor(Number(stat==='xp'?state?.xp:state?.stats?.[stat])||0))]));
}
export function tournamentScore(counters,baseline,scoring){
 return scoring.reduce((sum,[stat,weight])=>sum+weight*Math.max(0,(counters?.[stat]??0)-(baseline?.[stat]??0)),0);
}
// The pot and its places for this many counted farmers (a score of minScore or more).
export function tournamentPot(counted,settings=TOURNAMENT_DEFAULTS){
 const n=Math.max(0,Math.floor(counted)||0);
 const diamonds=Math.min(settings.maxDiamonds,n*settings.diamondsPerPlayer),coins=Math.min(settings.maxCoins,n*settings.coinsPerPlayer);
 const winners=Number(settings.winners)||0;
 const places=n<TOURNAMENT_WIDE_FROM?Math.min(3,n):Math.min(n,Math.max(3,winners>0?winners:Math.floor(n/settings.placeStep)));
 return {counted:n,diamonds,coins,places};
}
// The share of the pot for each paid place, top first; together they are 1. Each place's prize is its share of the pot rounded down,
// at most TOURNAMENT_PRIZE_MAX (so a lower place still never wins more than a higher one).
export function tournamentShares(places){
 if(places<=0)return [];
 if(places<4)return [[1],[0.625,0.375],[0.5,0.3,0.2]][places-1];
 const rest=0.5/(places-3);return [0.25,0.15,0.1,...Array(places-3).fill(rest)];
}
export function tournamentPrizes(counted,settings=TOURNAMENT_DEFAULTS){
 const pot=tournamentPot(counted,settings);
 return tournamentShares(pot.places).map(share=>({diamonds:Math.min(TOURNAMENT_PRIZE_MAX.diamonds,Math.floor(pot.diamonds*share)),coins:Math.min(TOURNAMENT_PRIZE_MAX.coins,Math.floor(pot.coins*share))}));
}
