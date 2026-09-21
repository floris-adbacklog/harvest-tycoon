import {avatarImage} from '../public/player-avatars.js';
import {vipBadge,refreshVipBadges} from '../public/vip-ui.js';
import {rankArt} from '../public/rank-art.js';
export const LEADERBOARD_CATEGORIES=Object.freeze({
 level:{label:'Highest level',heading:'Level',unit:'level',description:'Your farmer level, earned through farming experience.'},
 currency:{label:'Most coins',heading:'Coins',unit:'coins',description:'Current coin balance. Spending coins can change your position.'},

 harvested_crops:{label:'Most crops harvested',heading:'Crops',unit:'crops harvested',description:'Lifetime harvest of all crop varieties, including extra yield from water and care.'},
 goods_produced:{label:'Most goods produced',heading:'Goods produced',unit:'goods produced',description:'Lifetime production goods collected from every building, from honey to berry tart.'},
 items_sold:{label:'Most items sold',heading:'Items sold',unit:'items sold',description:'Lifetime crops and goods sold at the market. Counts from when this board launched.'},
 badges:{label:'Most badges',heading:'Badges',unit:'badges',description:'Crop mastery medals you have claimed. Up to 48 badges to earn.'},
 deliveries:{label:'Most deliveries',heading:'Deliveries',unit:'deliveries',description:'Total delivery orders completed for your neighbours.'},
 harvested_wheat:{label:'Wheat harvested',heading:'Wheat',unit:'wheat harvested',group:'crops',description:'Lifetime wheat harvested, including extra yield from water and care.'},
 harvested_corn:{label:'Corn harvested',heading:'Corn',unit:'corn harvested',group:'crops',description:'Lifetime corn harvested, including extra yield from water and care.'},
 harvested_barley:{label:'Barley harvested',heading:'Barley',unit:'barley harvested',group:'crops',description:'Lifetime barley harvested, including extra yield from water and care.'},
 harvested_lettuce:{label:'Lettuce harvested',heading:'Lettuce',unit:'lettuce harvested',group:'crops',description:'Lifetime lettuce harvested, including extra yield from water and care.'},
 harvested_cabbage:{label:'Cabbage harvested',heading:'Cabbage',unit:'cabbage harvested',group:'crops',description:'Lifetime cabbage harvested, including extra yield from water and care.'},
 harvested_cauliflower:{label:'Cauliflower harvested',heading:'Cauliflower',unit:'cauliflower harvested',group:'crops',description:'Lifetime cauliflower harvested, including extra yield from water and care.'},
 harvested_pumpkin:{label:'Pumpkin harvested',heading:'Pumpkin',unit:'pumpkin harvested',group:'crops',description:'Lifetime pumpkin harvested, including extra yield from water and care.'},
 harvested_redcabbage:{label:'Red cabbage harvested',heading:'Red cabbage',unit:'red cabbage harvested',group:'crops',description:'Lifetime red cabbage harvested, including extra yield from water and care.'},
 harvested_sunflower:{label:'Sunflower harvested',heading:'Sunflower',unit:'sunflower harvested',group:'crops',description:'Lifetime sunflower harvested, including extra yield from water and care.'},
 harvested_greenbeans:{label:'Green beans harvested',heading:'Green beans',unit:'green beans harvested',group:'crops',description:'Lifetime green beans harvested, including water and care bonuses.'},
 harvested_apples:{label:'Apples harvested',heading:'Apples',unit:'apples harvested',group:'crops',description:'Lifetime apples harvested, including water and care bonuses.'},
 harvested_berries:{label:'Berries harvested',heading:'Berries',unit:'berries harvested',group:'crops',description:'Lifetime berries harvested, including water and care bonuses.'}
});
function categoryFor(key){if(!Object.hasOwn(LEADERBOARD_CATEGORIES,key))throw new Error('Choose a valid leaderboard category.');return LEADERBOARD_CATEGORIES[key];}
const PUBLIC_FIELDS='player_id,username,currency,level,harvested_wheat,harvested_corn,harvested_barley,harvested_lettuce,harvested_cabbage,harvested_cauliflower,harvested_pumpkin,harvested_redcabbage,harvested_sunflower,harvested_greenbeans,harvested_apples,harvested_berries,harvested_crops,badges,deliveries,goods_produced,items_sold,last_active_at,vip_expires_at,avatar_id';
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
  const tr=document.createElement('tr');tr.classList.toggle('is-you',row.player_id===playerId);
  const n=document.createElement('td');n.className='leaderboard-place';n.innerHTML=rankArt(place);
  const name=document.createElement('td'),strong=document.createElement(onPlayer?'button':'strong'),small=document.createElement('small');strong.textContent=row.username;if(onPlayer){strong.type='button';strong.className='player-name-link';strong.setAttribute('aria-haspopup','dialog');strong.setAttribute('aria-label',`View ${row.username}'s profile`);strong.onclick=()=>onPlayer(row.player_id);}const dot=document.createElement('span');dot.className='online-dot';dot.dataset.onlinePlayer=row.player_id;dot.setAttribute('role','img');strong.prepend(dot);const vip=vipBadge(row.vip_expires_at,now);if(vip)strong.insertAdjacentHTML('beforeend',vip);small.textContent=`Level ${row.level}${row.player_id===playerId?' · You':''}`;const identity=document.createElement('div');identity.className='leaderboard-farmer';identity.innerHTML=avatarImage(row.avatar_id);const copy=document.createElement('div');copy.append(strong,small);identity.append(copy);name.append(identity);
  const score=document.createElement('td');score.textContent=value.toLocaleString('en-US');tr.append(n,name,score);tbody.append(tr);
 });table.append(tbody);container.append(table);updateOnlineIndicators(container,{onlinePlayers,presenceReady,now});
 if(own&&rank){const line=document.createElement('div');line.className='your-rank';const label=document.createElement('strong'),value=document.createElement('span');label.textContent=`Your rank: #${rank}`;const score=Number(own[category]??0).toLocaleString('en-US');value.textContent=category==='level'?`Level ${score} · ${own.username}`:`${score} ${config.unit} · ${own.username}`;line.append(label,value);container.append(line);}
}

export function updateOnlineIndicators(container,{onlinePlayers=[],presenceReady=false,now=Date.now()}){
 refreshVipBadges(container,now);
 const online=new Set(onlinePlayers);
 container.querySelectorAll('[data-online-player]').forEach(dot=>{const active=presenceReady&&online.has(dot.dataset.onlinePlayer);dot.classList.toggle('is-online',active);dot.title=active?'Online · active within the last 30 minutes':presenceReady?'Offline · no action in the last 30 minutes':'Online status unavailable';dot.setAttribute('aria-label',dot.title);});
}
