export async function fetchLeaderboard(client,playerId){
 const {data,error}=await client.from('player_stats').select('player_id,username,currency,level').order('currency',{ascending:false}).order('player_id',{ascending:true}).limit(20);
 if(error)throw error;
 let own=data?.find(row=>row.player_id===playerId)??null;
 if(!own&&playerId){const response=await client.from('player_stats').select('player_id,username,currency,level').eq('player_id',playerId).maybeSingle();if(response.error)throw response.error;own=response.data;}
 let rank=null;
 if(own){const result=await client.from('player_stats').select('player_id',{count:'exact',head:true}).gt('currency',own.currency);if(result.error)throw result.error;rank=(result.count??0)+1;}
 return {rows:data??[],own,rank};
}
export function renderLeaderboard(container,{rows,own,rank},playerId){
 container.replaceChildren();
 if(!rows.length){const p=document.createElement('p');p.className='leaderboard-empty';p.textContent='The valley is quiet. Pick a name and be the first farmer on the board.';container.append(p);return;}
 const table=document.createElement('table');table.className='leaderboard-table';table.innerHTML='<thead><tr><th scope="col">Rank</th><th scope="col">Farmer</th><th scope="col">Coins</th></tr></thead>';
 const tbody=document.createElement('tbody');let place=0,lastScore=null;
 rows.forEach((row,i)=>{
  if(lastScore!==row.currency)place=i+1;lastScore=row.currency;
  const tr=document.createElement('tr');tr.classList.toggle('is-you',row.player_id===playerId);
  const n=document.createElement('td');n.textContent=String(place);
  const name=document.createElement('td'),strong=document.createElement('strong'),small=document.createElement('small');strong.textContent=row.username;small.textContent=`Level ${row.level}${row.player_id===playerId?' · You':''}`;name.append(strong,small);
  const score=document.createElement('td');score.textContent=row.currency.toLocaleString('en-US');tr.append(n,name,score);tbody.append(tr);
 });table.append(tbody);container.append(table);
 if(own&&rank){const line=document.createElement('div');line.className='your-rank';const label=document.createElement('strong'),value=document.createElement('span');label.textContent=`Your rank: #${rank}`;value.textContent=`${own.currency.toLocaleString('en-US')} coins · ${own.username}`;line.append(label,value);container.append(line);}
}
