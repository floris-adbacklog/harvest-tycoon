import {avatarImage} from '../public/player-avatars.js';
import {vipBadge,refreshVipBadges} from '../public/vip-ui.js';
import {rankArt} from '../public/rank-art.js';
import {CROPS,CROP_LEVELS,MASTERY_TIERS} from '../public/farm-state.js';
const CROP_BOARDS=Object.keys(CROPS).sort((a,b)=>(CROP_LEVELS[a]??1)-(CROP_LEVELS[b]??1));
export const LEADERBOARD_CATEGORIES=Object.freeze({
 level:{label:'Highest level',heading:'Level',unit:'level',description:'Your farmer level, earned through farming experience.'},
 currency:{label:'Most coins',heading:'Coins',unit:'coins',description:'Current coin balance. Spending coins can change your position.'},

 harvested_crops:{label:'Most crops harvested',heading:'Crops',unit:'crops harvested',description:'Lifetime harvest of all crop varieties, including extra yield from water and care.'},
 goods_produced:{label:'Most goods produced',heading:'Goods made',unit:'goods produced',description:'Lifetime production goods collected from every building, from honey to berry tart.'},
 items_sold:{label:'Most items sold',heading:'Items sold',unit:'items sold',description:'Lifetime crops and goods sold at the market. Counts from when this board launched.'},
 badges:{label:'Most badges',heading:'Badges',unit:'badges',description:`Crop mastery medals you have claimed. Up to ${Object.keys(CROPS).length*MASTERY_TIERS.length} badges to earn.`},
 deliveries:{label:'Most deliveries',heading:'Deliveries',unit:'deliveries',description:'Total delivery orders completed for your neighbours.'},
 events_finished:{label:'Most events finished',heading:'Events',unit:'events finished',description:'Farm events you completed and qualified for.'},
 best_streak:{label:'Longest daily streak',heading:'Streak',unit:'days in a row',description:'The most days in a row you came back to collect your daily gift.'},
 farm_fields:{label:'Biggest farm',heading:'Farm size',unit:'fields',description:'Fields on your farm, up to 40.'},
 chores_done:{label:'Most chores',heading:'Chores',unit:'chores done',description:'Farm chores completed.'},
 helping_rounds:{label:'Most helping-hand rounds',heading:'Helping hands',unit:'rounds',description:'Rounds of all four helping-hand jobs finished.'},
 estate_projects:{label:'Most estate projects',heading:'Estate',unit:'projects',description:'Estate chapters and commissions completed.'},
 // One board per crop, straight from the game's crop list (in the order they unlock), so a new crop gets its board. Each reads the
 // crop's own column in player_stats, which the crop's migration adds (supabase/midgame-crop-columns.sql for the midgame crops).
 ...Object.fromEntries(CROP_BOARDS.map(key=>[`harvested_${key}`,{label:`${CROPS[key].name} harvested`,heading:CROPS[key].name,unit:`${CROPS[key].name.toLowerCase()} harvested`,group:'crops',description:`Lifetime ${CROPS[key].name.toLowerCase()} harvested, including extra yield from water and care.`}]))
});
function categoryFor(key){if(!Object.hasOwn(LEADERBOARD_CATEGORIES,key))throw new Error('Choose a valid leaderboard category.');return LEADERBOARD_CATEGORIES[key];}
const PUBLIC_FIELDS=['player_id','username','currency','level',...CROP_BOARDS.map(key=>`harvested_${key}`),'harvested_crops','badges','deliveries','goods_produced','items_sold','events_finished','best_streak','farm_fields','chores_done','helping_rounds','estate_projects','last_active_at','vip_expires_at','avatar_id'].join(',');
export async function fetchLeaderboard(client,playerId,category='level'){
 categoryFor(category);
 const {data,error}=await client.from('player_stats').select(PUBLIC_FIELDS).order(category,{ascending:false}).order('player_id',{ascending:true}).limit(10);
 if(error)throw error;
 let own=data?.find(row=>row.player_id===playerId)??null;
 if(!own&&playerId){const response=await client.from('player_stats').select(PUBLIC_FIELDS).eq('player_id',playerId).maybeSingle();if(response.error)throw response.error;own=response.data;}
 let rank=null;
 if(own){const listed=data?.findIndex(row=>row.player_id===playerId)??-1;if(listed>=0)rank=listed+1;else{const result=await client.from('player_stats').select('player_id',{count:'exact',head:true}).gt(category,own[category]);if(result.error)throw result.error;const ties=await client.from('player_stats').select('player_id',{count:'exact',head:true}).eq(category,own[category]).lt('player_id',own.player_id);if(ties.error)throw ties.error;rank=(result.count??0)+(ties.count??0)+1;}}
 return {rows:data??[],own,rank,category};
}
export function rankedRows(rows,category='level'){
 categoryFor(category);return rows.map((row,i)=>({row,rank:i+1,score:Number(row[category]??0)}));
}
export function renderLeaderboard(container,{rows,own,rank,category='level',onlinePlayers=[],presenceReady=false,now=Date.now()},playerId,onPlayer){
 const config=categoryFor(category);container.replaceChildren();
 if(!rows.length){const p=document.createElement('p');p.className='leaderboard-empty';p.textContent='The valley is quiet. Be the first farmer on this board.';container.append(p);return;}
 const table=document.createElement('table');table.className='leaderboard-table';
 const caption=document.createElement('caption');caption.className='leaderboard-caption';caption.textContent=`${config.label} · Top 10`;table.append(caption);
 const head=document.createElement('thead'),header=document.createElement('tr');
 for(const title of ['Rank','Farmer',config.heading]){const th=document.createElement('th');th.scope='col';th.textContent=title;header.append(th);}head.append(header);table.append(head);
 const tbody=document.createElement('tbody');
 rankedRows(rows,category).forEach(({row,rank:place,score:value})=>{
  const tr=document.createElement('tr');tr.classList.toggle('is-you',row.player_id===playerId);if(place<=3)tr.classList.add('is-podium',`is-rank-${place}`);
  const n=document.createElement('td');n.className='leaderboard-place';n.innerHTML=rankArt(place);
  const name=document.createElement('td'),strong=document.createElement(onPlayer?'button':'strong'),small=document.createElement('small');strong.textContent=row.username;if(onPlayer){strong.type='button';strong.className='player-name-link';strong.setAttribute('aria-haspopup','dialog');strong.setAttribute('aria-label',`View ${row.username}'s profile`);strong.onclick=()=>onPlayer(row.player_id);}const dot=document.createElement('span');dot.className='online-dot';dot.dataset.onlinePlayer=row.player_id;dot.setAttribute('role','img');const vip=vipBadge(row.vip_expires_at,now);if(vip)strong.insertAdjacentHTML('beforeend',vip);small.textContent=`Level ${row.level}${row.player_id===playerId?' · You':''}`;const identity=document.createElement('div');identity.className='leaderboard-farmer';identity.innerHTML=`<span class="leaderboard-portrait">${avatarImage(row.avatar_id)}</span>`;identity.firstElementChild.append(dot);const copy=document.createElement('div');copy.append(strong,small);identity.append(copy);name.append(identity);
  const score=document.createElement('td');score.textContent=value.toLocaleString('en-US');tr.append(n,name,score);tbody.append(tr);
 });table.append(tbody);container.append(table);updateOnlineIndicators(container,{onlinePlayers,presenceReady,now});
 if(own&&rank){const line=document.createElement('div');line.className='your-rank';const label=document.createElement('strong'),value=document.createElement('span');label.textContent=`Your rank: #${rank}`;const score=Number(own[category]??0).toLocaleString('en-US');value.textContent=category==='level'?`Level ${score} · ${own.username}`:`${score} ${config.unit} · ${own.username}`;line.append(label,value);container.append(line);}
}

export function updateOnlineIndicators(container,{onlinePlayers=[],presenceReady=false,now=Date.now()}){
 refreshVipBadges(container,now);
 const online=new Set(onlinePlayers);
 container.querySelectorAll('[data-online-player]').forEach(dot=>{const active=presenceReady&&online.has(dot.dataset.onlinePlayer);dot.classList.toggle('is-online',active);dot.title=active?'Online · active within the last 30 minutes':presenceReady?'Offline · no action in the last 30 minutes':'Online status unavailable';dot.setAttribute('aria-label',dot.title);});
}
