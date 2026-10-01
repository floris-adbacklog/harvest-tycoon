import {avatarImage} from '../public/player-avatars.js';
import {vipBadge,refreshVipBadges} from '../public/vip-ui.js';
import {staffRole,staffBadge} from './staff-badge.js';
import {rankArt} from '../public/rank-art.js';
import {art} from '../public/visual-icons.js';
import {rankArtKey} from '../public/rank-picker.js';
import {CROPS,CROP_LEVELS,MASTERY_TIERS,ITEMS,RECIPES,BUILDING_LEVELS,QUESTS,worldTwoItem} from '../public/farm-state.js';
const CROP_BOARDS=Object.keys(CROPS).sort((a,b)=>(CROP_LEVELS[a]??1)-(CROP_LEVELS[b]??1));
// The level at which a good can first be made: its earliest recipe outside the Factory (the building's level or the recipe's own).
const goodLevel=key=>Math.min(...Object.values(RECIPES).filter(r=>r.building!=='factory'&&r.output[key]).map(r=>Math.max(BUILDING_LEVELS[r.building]??1,r.minLevel??1)),Infinity);
const byLevel=(a,b)=>goodLevel(a)-goodLevel(b)||ITEMS[a].name.localeCompare(ITEMS[b].name);
// World II's goods (30 Sep 2026) are boards of their own, under Village, which only a farmer from level 100 sees (src/ui.js).
const GOOD_BOARDS=Object.keys(ITEMS).filter(key=>!CROPS[key]&&!ITEMS[key].heirloom&&!worldTwoItem(key)).sort(byLevel);
const VILLAGE_BOARDS=Object.keys(ITEMS).filter(key=>!CROPS[key]&&worldTwoItem(key)).sort(byLevel);
export const LEADERBOARD_CATEGORIES=Object.freeze({
 level:{label:'Highest level',heading:'Level',unit:'level',description:'Your farmer level, earned through farming experience.'},
 currency:{label:'Most coins',heading:'Coins',unit:'coins',description:'Current coin balance. Spending coins can change your position.'},

 harvested_crops:{label:'Most crops harvested',heading:'Crops',unit:'crops harvested',description:'Lifetime harvest of all crop varieties, including extra yield from water and care.'},
 goods_produced:{label:'Most goods produced',heading:'Goods made',unit:'goods produced',description:'Lifetime production goods collected from every building, from honey to berry tart.'},
 building_upgrades:{label:'Most building upgrades',heading:'Upgrades',unit:'upgrades',description:'Every building upgrade counts the same: level 1 to 2 as much as level 9 to 10.'},
 items_sold:{label:'Most items sold',heading:'Items sold',unit:'items sold',description:'Lifetime crops and goods sold at the market. Counts from when this board launched.'},
 badges:{label:'Most badges',heading:'Badges',unit:'badges',description:`Crop mastery medals you have claimed. Up to ${Object.keys(CROPS).length*MASTERY_TIERS.length} badges to earn.`},
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
 ...Object.fromEntries(VILLAGE_BOARDS.map(key=>[`made_${key}`,{label:`${ITEMS[key].name} made`,heading:ITEMS[key].name,unit:`${ITEMS[key].name.toLowerCase()} made`,group:'village',good:key,description:`Lifetime ${ITEMS[key].name.toLowerCase()} made for and in the village.`}]))
});
function categoryFor(key){if(!Object.hasOwn(LEADERBOARD_CATEGORIES,key))throw new Error('Choose a valid leaderboard category.');return LEADERBOARD_CATEGORIES[key];}
// A good's board reads one key of goods_made ("goods_made->bread" to the database); every other board is its own column.
const columnOf=category=>{const config=categoryFor(category);return config.good?`goods_made->${config.good}`:category;};
export const scoreOf=(row,category)=>{const config=categoryFor(category);return Number((config.good?row?.goods_made?.[config.good]:row?.[category])??0);};
// The top 100 in one read, shown ten a page (30 Sep 2026); only what the board shows, so a hundred rows stay light: who, their
// picture and VIP mark, the level, when they last played (the online dot) and the board's own score.
const BOARD_FIELDS=['player_id','username','level','last_active_at','vip_expires_at','avatar_id'];
export const BOARD_SIZE=100,BOARD_PAGE=10;
export async function fetchLeaderboard(client,playerId,category='level'){
 const config=categoryFor(category),column=columnOf(category),fields=[...BOARD_FIELDS,...(config.good?['goods_made']:BOARD_FIELDS.includes(category)?[]:[category])].join(',');
 const {data,error}=await client.from('player_stats').select(fields).order(column,{ascending:false,nullsFirst:false}).order('player_id',{ascending:true}).limit(BOARD_SIZE);
 if(error)throw error;
 let own=data?.find(row=>row.player_id===playerId)??null;
 if(!own&&playerId){const response=await client.from('player_stats').select(fields).eq('player_id',playerId).maybeSingle();if(response.error)throw response.error;own=response.data;}
 let rank=null;
 if(own){const listed=data?.findIndex(row=>row.player_id===playerId)??-1;if(listed>=0)rank=listed+1;else{const result=await client.from('player_stats').select('player_id',{count:'exact',head:true}).gt(column,scoreOf(own,category));if(result.error)throw result.error;const ties=await client.from('player_stats').select('player_id',{count:'exact',head:true}).eq(column,scoreOf(own,category)).lt('player_id',own.player_id);if(ties.error)throw ties.error;rank=(result.count??0)+(ties.count??0)+1;}}
 return {rows:data??[],own,rank,category};
}
export function rankedRows(rows,category='level'){
 categoryFor(category);return rows.map((row,i)=>({row,rank:i+1,score:scoreOf(row,category)}));
}
// Ten farmers a page with Previous and Next (onPage gets the page to show); a farmer in the top 100 can jump to their own page.
export function renderLeaderboard(container,{rows,own,rank,category='level',onlinePlayers=[],presenceReady=false,now=Date.now(),page=0},playerId,onPlayer,onPage){
 const config=categoryFor(category);container.replaceChildren();
 const pages=Math.max(1,Math.ceil(rows.length/BOARD_PAGE)),shown=Math.min(Math.max(0,page),pages-1);
 // An empty board is a card with the board's own picture, not a lone sentence.
 if(!rows.length){const box=document.createElement('div');box.className='quest-empty leaderboard-empty';box.innerHTML=`${art(rankArtKey(category))}<h3>The valley is quiet</h3><p>Be the first farmer on this board.</p>`;container.append(box);return;}
 const table=document.createElement('table');table.className='leaderboard-table';
 const caption=document.createElement('caption');caption.className='leaderboard-caption';caption.textContent=`${config.label} · Top ${Math.min(rows.length,BOARD_SIZE)}`;table.append(caption);
 const head=document.createElement('thead'),header=document.createElement('tr');
 for(const title of ['Rank','Farmer',config.heading]){const th=document.createElement('th');th.scope='col';th.textContent=title;header.append(th);}head.append(header);table.append(head);
 const tbody=document.createElement('tbody');
 rankedRows(rows,category).slice(shown*BOARD_PAGE,(shown+1)*BOARD_PAGE).forEach(({row,rank:place,score:value})=>{
  const tr=document.createElement('tr');tr.classList.toggle('is-you',row.player_id===playerId);if(place<=3)tr.classList.add('is-podium',`is-rank-${place}`);
  const n=document.createElement('td');n.className='leaderboard-place';n.innerHTML=rankArt(place);
  const name=document.createElement('td'),strong=document.createElement(onPlayer?'button':'strong'),small=document.createElement('small');strong.textContent=row.username;if(onPlayer){strong.type='button';strong.className='player-name-link';strong.setAttribute('aria-haspopup','dialog');strong.setAttribute('aria-label',`View ${row.username}'s profile`);strong.onclick=()=>onPlayer(row.player_id);}const dot=document.createElement('span');dot.className='online-dot';dot.dataset.onlinePlayer=row.player_id;dot.setAttribute('role','img');const vip=vipBadge(row.vip_expires_at,now);if(vip)strong.insertAdjacentHTML('beforeend',vip);const role=staffRole(row.player_id);if(role)strong.insertAdjacentHTML('beforeend',staffBadge(role));small.textContent=row.player_id===playerId?'You':'';const identity=document.createElement('div');identity.className='leaderboard-farmer';identity.innerHTML=`<span class="leaderboard-portrait">${avatarImage(row.avatar_id)}</span>`;identity.firstElementChild.append(dot);const copy=document.createElement('div');copy.append(strong);if(small.textContent)copy.append(small);identity.append(copy);name.append(identity);
  const score=document.createElement('td');score.textContent=value.toLocaleString('en-US');tr.append(n,name,score);tbody.append(tr);
 });table.append(tbody);container.append(table);updateOnlineIndicators(container,{onlinePlayers,presenceReady,now});
 if(pages>1){
  const pager=document.createElement('div');pager.className='leaderboard-pages';
  const step=(label,to,key)=>{const b=document.createElement('button');b.type='button';b.className='small-button';b.dataset.boardPage=key;b.textContent=label;b.disabled=to<0||to>=pages||!onPage;b.onclick=()=>onPage?.(to);return b;};
  const where=document.createElement('span');where.textContent=`Page ${shown+1} of ${pages}`;
  pager.append(step('‹ Previous',shown-1,'previous'),where,step('Next ›',shown+1,'next'));container.append(pager);
 }
 if(own&&rank){const line=document.createElement('div');line.className='your-rank';const label=document.createElement('strong'),value=document.createElement('span');label.textContent=`Your rank: #${rank}`;const score=scoreOf(own,category).toLocaleString('en-US');value.textContent=category==='level'?`Level ${score} · ${own.username}`:`${score} ${config.unit} · ${own.username}`;line.append(label,value);
  const mine=Math.floor((rank-1)/BOARD_PAGE);if(onPage&&rank<=rows.length&&mine!==shown){const jump=document.createElement('button');jump.type='button';jump.className='small-button';jump.dataset.boardPage='you';jump.textContent='Show';jump.onclick=()=>onPage(mine);line.append(jump);}
  container.append(line);}
}

export function updateOnlineIndicators(container,{onlinePlayers=[],presenceReady=false,now=Date.now()}){
 refreshVipBadges(container,now);
 const online=new Set(onlinePlayers);
 container.querySelectorAll('[data-online-player]').forEach(dot=>{const active=presenceReady&&online.has(dot.dataset.onlinePlayer);dot.classList.toggle('is-online',active);dot.title=active?'Online · active within the last 30 minutes':presenceReady?'Offline · no action in the last 30 minutes':'Online status unavailable';dot.setAttribute('aria-label',dot.title);});
}
