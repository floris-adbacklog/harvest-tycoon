import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Village Helper and Harbour Captain (3 Nov 2026, the owner): hidden below level 100 and 200, every other kind shows for everyone.
test('a world tournament is hidden below its level, only Village Helper and Harbour Captain',async()=>{
 const ui=read('public/tournament-ui.js');
 assert.match(ui,/const WORLD_KINDS=\['village','harbour'\];/);
 assert.match(ui,/const show=Boolean\(t\(\)&&!early\)\|\|owed,alert=owed\|\|\(live\(\)&&!early&&seen\(\)!==String\(t\(\)\.id\)\);/,'a prize to collect still shows');
 const {TOURNAMENT_KINDS}=await import('../game/tournament.js');
 const tooEarly=(kind,level)=>['village','harbour'].includes(kind)&&level<TOURNAMENT_KINDS[kind].from;
 assert.deepEqual([tooEarly('village',99),tooEarly('village',100),tooEarly('harbour',199),tooEarly('harbour',200),tooEarly('autumn',1)],[true,false,true,false,false]);
 assert.match(read('public/game.js'),/createTournamentUI\(\{notify:toast,refreshFarm:\(\)=>client\.refresh\(\),level:\(\)=>levelProgress\(state\)\.level,/);
});
