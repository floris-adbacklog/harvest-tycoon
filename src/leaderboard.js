import {avatarImage} from '../public/player-avatars.js';
import {framed,lookBadge} from '../public/look-marks.js';
import {vipBadge,refreshVipBadges} from '../public/vip-ui.js';
import {staffRole,staffBadge} from './staff-badge.js';
import {familyBadge} from '../public/family-badge.js';
import {rankArt} from '../public/rank-art.js';
import {art} from '../public/visual-icons.js';
import {rankArtKey} from '../public/rank-picker.js';
import {CROPS,CROP_LEVELS,MASTERY_TIERS,ITEMS,RECIPES,BUILDING_LEVELS,QUESTS,worldTwoItem,worldThreeItem,otherWorldItem,WORLD_TWO_LEVEL,WORLD_THREE_LEVEL} from '../public/farm-state.js';
import {ONLINE_WINDOW} from './presence.js';
import {countLines} from './player-counts.js';
import {ownText} from '../public/i18n.js';
const CROP_BOARDS=Object.keys(CROPS).sort((a,b)=>(CROP_LEVELS[a]??1)-(CROP_LEVELS[b]??1));
// The level at which a good can first be made: its earliest recipe outside the Factory (the building's level or the recipe's own).
const goodLevel=key=>Math.min(...Object.values(RECIPES).filter(r=>r.building!=='factory'&&r.output[key]).map(r=>Math.max(BUILDING_LEVELS[r.building]??1,r.minLevel??1)),Infinity);
const byLevel=(a,b)=>goodLevel(a)-goodLevel(b)||ITEMS[a].name.localeCompare(ITEMS[b].name);
// World II's goods (30 Sep 2026) are boards of their own, under Village, which only a farmer from level 100 sees (src/ui.js). The 13 goods
// of its later places (Oct 2026, noBoard) have none: the Village row holds the first fourteen and Villagers helped.
const GOOD_BOARDS=Object.keys(ITEMS).filter(key=>!CROPS[key]&&!ITEMS[key].heirloom&&!otherWorldItem(key)).sort(byLevel);
const VILLAGE_BOARDS=Object.keys(ITEMS).filter(key=>!CROPS[key]&&worldTwoItem(key)&&!ITEMS[key].noBoard).sort(byLevel);
// World III's goods (29 Oct 2026): every harbour good a board of its own, under Harbour, which only a farmer from level 200 sees.
const HARBOUR_BOARDS=Object.keys(ITEMS).filter(key=>!CROPS[key]&&worldThreeItem(key)).sort(byLevel);   // noBoard (game/farm-state.js) was "none yet"
export const LEADERBOARD_CATEGORIES=Object.freeze({
 level:{label:'Highest level',heading:'Level',unit:'level',description:'Your farmer level, earned through farming experience.'},
 currency:{label:'Most coins',heading:'Coins',unit:'coins',description:'Current coin balance. Spending coins can change your position.'},

 harvested_crops:{label:'Most crops harvested',heading:'Crops',unit:'crops harvested',description:'Lifetime harvest of all crop varieties, including extra yield from water and care.'},
 goods_produced:{label:'Most goods produced',heading:'Goods made',unit:'goods produced',description:'Lifetime production goods collected from every building, from honey to berry tart.'},
 building_upgrades:{label:'Most building upgrades',heading:'Upgrades',unit:'upgrades',description:'Every building upgrade counts the same: level 1 to 2 as much as level 9 to 10.'},
 items_sold:{label:'Most items sold',heading:'Items sold',unit:'items sold',description:'Lifetime crops and goods sold at the market. Counts from when this board launched.'},
 // Crop medals (2 Oct 2026): called Medals, as on the estate's Medals tab (they were Badges here and on profiles).
 badges:{label:'Most medals',heading:'Medals',unit:'medals',description:`Crop medals you have claimed. Up to ${Object.keys(CROPS).length*MASTERY_TIERS.length} to earn.`},
 quests_done:{label:'Most quests done',heading:'Quests',unit:'quests done',description:`Quests finished and claimed, out of ${QUESTS.length}.`},
 deliveries:{label:'Most deliveries',heading:'Deliveries',unit:'deliveries',description:'Total delivery orders completed for your neighbours.'},
 events_finished:{label:'Most events finished',heading:'Events',unit:'events finished',description:'Events you finished.'},
 best_streak:{label:'Longest daily streak',heading:'Streak',unit:'days in a row',description:'The most days in a row you came back to collect your daily gift.'},
 farm_fields:{label:'Biggest farm',heading:'Farm size',unit:'fields',description:'Fields on your farm, up to 40.'},
 chores_done:{label:'Most chores',heading:'Chores',unit:'chores done',description:'Farm chores completed.'},
 helping_rounds:{label:'Most helping-hand rounds',heading:'Helping hands',unit:'rounds',description:'Rounds of all four helping-hand jobs finished.'},
 estate_projects:{label:'Most estate projects',heading:'Estate',unit:'projects',description:'Estate chapters and commissions completed.'},
 // One board per crop, straight from the game's crop list (in the order they unlock), so a new crop gets its board. Each reads the
 // crop's own column in player_stats, which the crop's migration adds (supabase/midgame-crop-columns.sql for the midgame crops).
 ...Object.fromEntries(CROP_BOARDS.map(key=>[`harvested_${key}`,{label:`${CROPS[key].name} harvested`,heading:CROPS[key].name,unit:`${CROPS[key].name.toLowerCase()} harvested`,group:'crops',description:`Lifetime ${CROPS[key].name.toLowerCase()} harvested, including extra yield from water and care.`}])),
 // One board per good, in the order the goods unlock. Each reads the good's count in player_stats.goods_made (the farm journal's
 // numbers, kept up to date on every save: supabase/leaderboard-goods.sql).
 ...Object.fromEntries(GOOD_BOARDS.map(key=>[`made_${key}`,{label:`${ITEMS[key].name} made`,heading:ITEMS[key].name,unit:`${ITEMS[key].name.toLowerCase()} made`,group:'goods',good:key,description:`Lifetime ${ITEMS[key].name.toLowerCase()} collected from your buildings.`}])),
 // The market square's own board (Oct 2026), first in the Village row: villagers helped, from stats.village_requests (its own column,
 // player_stats.villagers_helped: supabase/world-two-phase-2-5.sql).
 villagers_helped:{label:'Most villagers helped',heading:'Villagers helped',unit:'villagers helped',group:'village',description:'Villagers helped at the market square in the village.'},
 // Village events (20 Oct 2026): events finished in a village league (player_stats.village_events_finished, supabase/world-two-leagues-a.sql).
 // They count in Events too; that board's own description stays without the village, since every farmer reads it.
 village_events_finished:{label:'Most village events finished',heading:'Village events',unit:'village events finished',group:'village',description:`Events you finished in a village league, from level ${WORLD_TWO_LEVEL}. They count in Events too.`},
 ...Object.fromEntries(VILLAGE_BOARDS.map(key=>[`made_${key}`,{label:`${ITEMS[key].name} made`,heading:ITEMS[key].name,unit:`${ITEMS[key].name.toLowerCase()} made`,group:'village',good:key,description:`Lifetime ${ITEMS[key].name.toLowerCase()} made for and in the village.`}])),
 // The harbour (29 Oct 2026, the owner: "zoals village"): ships sent (stats.ships_sent, player_stats.ships_sent), events finished in a
 // harbour league (player_stats.harbour_events_finished) and every harbour good (goods_made): supabase/leaderboard-harbour.sql.
 ships_sent:{label:'Most ships sent',heading:'Ships sent',unit:'ships sent',group:'harbour',description:'Ships you loaded and sent off from the harbour.'},
 harbour_events_finished:{label:'Most harbour events finished',heading:'Harbour events',unit:'harbour events finished',group:'harbour',description:`Events you finished in a harbour league, from level ${WORLD_THREE_LEVEL}. They count in Events too.`},
 ...Object.fromEntries(HARBOUR_BOARDS.map(key=>[`made_${key}`,{label:`${ITEMS[key].name} made`,heading:ITEMS[key].name,unit:`${ITEMS[key].name.toLowerCase()} made`,group:'harbour',good:key,description:`Lifetime ${ITEMS[key].name.toLowerCase()} made in the harbour.`}]))
});
function categoryFor(key){if(!Object.hasOwn(LEADERBOARD_CATEGORIES,key))throw new Error('Choose a valid leaderboard category.');return LEADERBOARD_CATEGORIES[key];}
// A good's board reads one key of goods_made ("goods_made->bread" to the database); every other board is its own column.
const columnOf=category=>{const config=categoryFor(category);return config.good?`goods_made->${config.good}`:category;};
export const scoreOf=(row,category)=>{const config=categoryFor(category);return Number((config.good?row?.goods_made?.[config.good]:row?.[category])??0);};
// The top 1000 (30 Oct 2026, the owner; the top 100 since 30 Sep 2026), shown ten a page, read a hundred at a time (BOARD_CHUNK): a board
// opens with the first hundred, as before, and the next hundred is read when a page past them is asked for. Only what the board shows,
// so a hundred rows stay light: who, their picture and VIP mark, the level, when they last played (the online dot) and the board's score.
const BOARD_FIELDS=['player_id','username','level','last_active_at','vip_expires_at','avatar_id','look'];
export const BOARD_SIZE=1000,BOARD_PAGE=10,BOARD_CHUNK=100;
// How many rows to read for a page: whole hundreds, enough for that page, at least the first hundred, at most the top 1000.
export const boardReadFor=page=>Math.min(BOARD_SIZE,Math.max(BOARD_CHUNK,Math.ceil((Math.max(0,page)+1)*BOARD_PAGE/BOARD_CHUNK)*BOARD_CHUNK));
// The admins are on no board (3 Oct 2026): they make the game and cannot play on their admin accounts, so on a quiet board their
// zeros would still fill places. Who is admin comes from the database's one staff check (chat_staff_list, supabase/chat-staff-list.sql),
// asked once per session; moderators stay on the boards. Should that list not load, the board shows as before and asks again next time.
const adminLists=new WeakMap();
// The admins' level everywhere (farm-state.js SHOWCASE_LEVEL), which no farmer reaches.
export const ADMIN_LEVEL=999;
export function boardAdmins(client){
 if(typeof client?.rpc!=='function')return Promise.resolve([]);
 let list=adminLists.get(client);
 if(!list){list=Promise.resolve().then(()=>client.rpc('chat_staff_list')).then(({data,error})=>{if(error)throw error;return (Array.isArray(data)?data:[]).filter(s=>s?.role==='admin'&&/^[0-9a-f-]{36}$/i.test(String(s.player_id))).map(s=>s.player_id);}).catch(()=>{adminLists.delete(client);return [];});adminLists.set(client,list);}
 return list;
}
// How many farmers the valley has and how many of them are online (6 Oct 2026): the line above the board. Two counts in the
// database, the admins left out as on the boards; online is a farm action in the last 30 minutes, as the dots, by the server's clock
// (now). The counts are the same on every board, so switching boards within 25 seconds asks nothing new; a failed count shows no line.
const countLists=new WeakMap();
export function fetchPlayerCounts(client,admins=[],now=Date.now()){
 const kept=countLists.get(client);if(kept&&now-kept.at>=0&&now-kept.at<25000)return kept.counts;
 const count=filter=>{let query=client.from('player_stats').select('player_id',{count:'exact',head:true});if(admins.length)query=query.not('player_id','in',`(${admins.join(',')})`);return Promise.resolve(filter(query)).then(({count,error})=>{if(error||!Number.isFinite(count))throw error??new Error('No count');return count;});};
 const counts=Promise.all([count(query=>query),count(query=>query.gt('last_active_at',new Date(now-ONLINE_WINDOW).toISOString()))]).then(([total,online])=>({total,online:Math.min(online,total)})).catch(()=>{countLists.delete(client);return null;});
 countLists.set(client,{at:now,counts});return counts;
}
// counts: the game's own board asks for the farmer counts too (src/main.js, src/farm-session.js), side by side with the board.
export async function fetchLeaderboard(client,playerId,category='level',{counts=false,now=Date.now(),upTo=BOARD_CHUNK}={}){
 const limit=Math.min(BOARD_SIZE,Math.max(BOARD_CHUNK,Math.ceil((Number(upTo)||BOARD_CHUNK)/BOARD_CHUNK)*BOARD_CHUNK));
 const config=categoryFor(category),column=columnOf(category),fields=[...BOARD_FIELDS,...(config.good?['goods_made']:BOARD_FIELDS.includes(category)?[]:[category])].join(',');
 const admins=await boardAdmins(client),ranked=query=>admins.length?query.not('player_id','in',`(${admins.join(',')})`):query;
 const counting=counts?fetchPlayerCounts(client,admins,now):null;
 let {data,error}=await ranked(client.from('player_stats').select(fields)).order(column,{ascending:false,nullsFirst:false}).order('player_id',{ascending:true}).limit(limit);
 if(error)throw error;
 // More past these: the read came back full and the top 1000 is not reached yet.
 const more=Array.isArray(data)&&data.length>=limit&&limit<BOARD_SIZE;
 // Should the admin list not load, the admins still stay off: they alone are level 999 (3 Oct 2026, supabase/admin-level.sql).
 if(!admins.length&&Array.isArray(data))data=data.filter(row=>!(Number(row.level)>=ADMIN_LEVEL));
 let own=data?.find(row=>row.player_id===playerId)??null;
 // An admin looking at a board has no place on it, so no "Your rank" either.
 if(!own&&playerId&&!admins.includes(playerId)){const response=await client.from('player_stats').select(fields).eq('player_id',playerId).maybeSingle();if(response.error)throw response.error;own=response.data;}
 let rank=null;
 if(own){const listed=data?.findIndex(row=>row.player_id===playerId)??-1;if(listed>=0)rank=listed+1;else{const result=await ranked(client.from('player_stats').select('player_id',{count:'exact',head:true})).gt(column,scoreOf(own,category));if(result.error)throw result.error;const ties=await ranked(client.from('player_stats').select('player_id',{count:'exact',head:true})).eq(column,scoreOf(own,category)).lt('player_id',own.player_id);if(ties.error)throw ties.error;rank=(result.count??0)+(ties.count??0)+1;}}
 return {rows:data??[],own,rank,category,more,players:counting?await counting:null};
}
export function rankedRows(rows,category='level'){
 categoryFor(category);return rows.map((row,i)=>({row,rank:i+1,score:scoreOf(row,category)}));
}
// Ten farmers a page with Previous and Next, and past ten pages a jump by hundreds (onPage gets the page to show); a farmer in the top
// 1000 can jump to their own page.
// players: {total,online} from fetchPlayerCounts, above the board (and above an empty board): two small chips, a grey dot before the
// players, the green online dot before the online, in the words of the sign-in page's counts (src/player-counts.js countLines).
// 23 Oct 2026 (the owner: "Profile en Leaderboard verbeteren UX/UI, houd het clean"): compact rows, the top three by their trophies,
// your own row in gold with You beside the name; when your row is not on the page shown (another page, or outside the top 1000) it is
// pinned under the list as a row of its own, with Show to go to your page. The board's name stays the table's caption for a screen reader.
// The farmer in a row: the face with its frame and online dot, the name as typed (17 Oct 2026, in its own kept span: the badges after it
// are the game's and are translated), the VIP mark, the staff mark, the season badge and the family badge (public/family-badge.js), and You
// on your own row.
function farmerCell(row,{playerId,onPlayer,now}){
 const strong=document.createElement(onPlayer?'button':'strong'),small=document.createElement('small');
 const typed=document.createElement('span');typed.setAttribute('translate','no');typed.textContent=row.username;strong.append(typed);
 if(onPlayer){strong.type='button';strong.className='player-name-link';strong.setAttribute('aria-haspopup','dialog');strong.setAttribute('aria-label',ownText(`View ${row.username}'s profile`,[row.username]));strong.onclick=()=>onPlayer(row.player_id);}
 const dot=document.createElement('span');dot.className='online-dot';dot.dataset.onlinePlayer=row.player_id;dot.setAttribute('role','img');
 const vip=vipBadge(row.vip_expires_at,now);if(vip)strong.insertAdjacentHTML('beforeend',vip);const role=staffRole(row.player_id);if(role)strong.insertAdjacentHTML('beforeend',staffBadge(role));const seasonBadge=lookBadge(row.look);if(seasonBadge)strong.insertAdjacentHTML('beforeend',seasonBadge);const family=familyBadge(row.player_id);if(family)strong.insertAdjacentHTML('beforeend',family);
 small.className='leaderboard-you';small.textContent=row.player_id===playerId?'You':'';
 const identity=document.createElement('div');identity.className='leaderboard-farmer';identity.innerHTML=`<span class="leaderboard-portrait">${framed(row.look,avatarImage(row.avatar_id))}</span>`;identity.firstElementChild.append(dot);
 const copy=document.createElement('div');copy.className='leaderboard-name';copy.append(strong);if(small.textContent)copy.append(small);identity.append(copy);
 return identity;
}
export function renderLeaderboard(container,{rows,own,rank,category='level',onlinePlayers=[],presenceReady=false,now=Date.now(),page=0,players=null,more=false},playerId,onPlayer,onPage){
 const config=categoryFor(category);container.replaceChildren();
 if(players){
  const words=countLines({players:players.total,online:players.online}),line=document.createElement('p');line.className='leaderboard-players';
  // One quiet line of text (24 Oct 2026), the online dot before the online count; no chips.
  const online=document.createElement('span'),dot=document.createElement('i');dot.className='online-dot is-online';dot.setAttribute('aria-hidden','true');online.append(dot,words.online);
  const total=document.createElement('span'),comma=document.createElement('span');total.append(words.players);comma.append(', ');
  line.append(total,comma,online);container.append(line);
 }
 // The pages there are: the rows read so far, and while more can be read, as many as the farmers in the valley fill (up to the top
 // 1000). onPage reads what a page needs first (src/game-cloud.js).
 const read=Math.max(1,Math.ceil(rows.length/BOARD_PAGE)),pages=more?Math.max(read+1,Math.ceil(Math.min(BOARD_SIZE,Number(players?.total)||BOARD_SIZE)/BOARD_PAGE)):read,shown=Math.min(Math.max(0,page),read-1);
 // An empty board is a card with the board's own picture, not a lone sentence.
 if(!rows.length){const box=document.createElement('div');box.className='quest-empty leaderboard-empty';box.innerHTML=`${art(rankArtKey(category))}<h3>The valley is quiet</h3><p>Be the first farmer on this board.</p>`;container.append(box);return;}
 const table=document.createElement('table');table.className='leaderboard-table';
 const caption=document.createElement('caption');caption.className='leaderboard-caption';caption.textContent=config.label;table.append(caption);
 const head=document.createElement('thead'),header=document.createElement('tr');
 for(const title of ['Rank','Farmer',config.heading]){const th=document.createElement('th');th.scope='col';th.textContent=title;header.append(th);}head.append(header);table.append(head);
 const tbody=document.createElement('tbody');
 rankedRows(rows,category).slice(shown*BOARD_PAGE,(shown+1)*BOARD_PAGE).forEach(({row,rank:place,score:value})=>{
  const tr=document.createElement('tr');tr.classList.toggle('is-you',row.player_id===playerId);if(place<=3)tr.classList.add('is-podium',`is-rank-${place}`);
  // 24 Oct 2026 (the owner: "maak de leaderboards minder druk"): the top three as a small gold, silver or bronze number, not a trophy.
  const n=document.createElement('td');n.className='leaderboard-place';n.innerHTML=place<=3?`<span class="rank-number is-medal" role="img" aria-label="${['Gold','Silver','Bronze'][place-1]}, place ${place}">${place}</span>`:rankArt(place);
  const name=document.createElement('td');name.className='leaderboard-who';name.append(farmerCell(row,{playerId,onPlayer,now}));
  const score=document.createElement('td');score.className='leaderboard-score';score.textContent=value.toLocaleString('en-US');tr.append(n,name,score);tbody.append(tr);
 });table.append(tbody);container.append(table);
 if(pages>1){
  const pager=document.createElement('div');pager.className='leaderboard-pages';
  const step=(label,to,key)=>{const b=document.createElement('button');b.type='button';b.className='small-button';b.dataset.boardPage=key;b.textContent=label;b.disabled=to<0||to>=pages||!onPage;b.onclick=()=>onPage?.(to);return b;};
  const where=document.createElement('span');where.textContent=`Page ${shown+1} of ${pages}`;
  pager.append(step('‹ Previous',shown-1,'previous'),where,step('Next ›',shown+1,'next'));
  // Past ten pages, a jump by hundreds: #1-100, #101-200 …
  if(pages>BOARD_CHUNK/BOARD_PAGE&&onPage){
   const jump=document.createElement('select');jump.className='leaderboard-jump';jump.setAttribute('aria-label','Go to places');
   for(let h=0;h*BOARD_CHUNK<pages*BOARD_PAGE;h++){const o=document.createElement('option');o.value=String(h*BOARD_CHUNK/BOARD_PAGE);o.textContent=`#${(h*BOARD_CHUNK+1).toLocaleString('en-US')}–${Math.min((h+1)*BOARD_CHUNK,pages*BOARD_PAGE).toLocaleString('en-US')}`;o.selected=Math.floor(shown*BOARD_PAGE/BOARD_CHUNK)===h;jump.append(o);}
   jump.onchange=()=>onPage(Number(jump.value));pager.append(jump);
  }
  container.append(pager);
 }
 // Your own row, pinned under the list while it is not on this page: your place, you, your score, and Show for your page in the top 1000.
 const mine=own&&rank?Math.floor((rank-1)/BOARD_PAGE):-1;
 if(own&&rank&&!(rank<=rows.length&&mine===shown)){
  const line=document.createElement('div');line.className='your-rank';line.setAttribute('role','group');
  const label=document.createElement('strong');label.className='your-rank-place';label.textContent=`#${rank.toLocaleString('en-US')}`;line.setAttribute('aria-label',`Your rank: #${rank}`);
  const value=document.createElement('span');value.className='leaderboard-score';value.textContent=scoreOf(own,category).toLocaleString('en-US');
  line.append(label,farmerCell(own,{playerId,onPlayer,now}),value);
  if(onPage&&rank<=(more?BOARD_SIZE:rows.length)){const jump=document.createElement('button');jump.type='button';jump.className='small-button';jump.dataset.boardPage='you';jump.textContent='Show';jump.onclick=()=>onPage(mine);line.append(jump);}
  container.append(line);
 }
 updateOnlineIndicators(container,{onlinePlayers,presenceReady,now});
}

export function updateOnlineIndicators(container,{onlinePlayers=[],presenceReady=false,now=Date.now()}){
 refreshVipBadges(container,now);
 const online=new Set(onlinePlayers);
 container.querySelectorAll('[data-online-player]').forEach(dot=>{const active=presenceReady&&online.has(dot.dataset.onlinePlayer);dot.classList.toggle('is-online',active);dot.title=active?'Online · active within the last 30 minutes':presenceReady?'Offline · no action in the last 30 minutes':'Online status unavailable';dot.setAttribute('aria-label',dot.title);});
}
