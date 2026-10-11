// The reel of the Fishing pond (11 Oct 2026, part C), on its own so the tests can play it. One button: hold it and the green zone goes
// up, let go and it sinks; keep the fish inside it. While the fish is in the green the catch fills (each fish its own pace, FISH in
// farm-state.js), outside it the catch drains; full lands the fish, empty lets it slip off. Everything is in bar units (the bar is
// 100 high) and seconds, never pixels or frames, so a small phone and a big screen play the same fish the same way.
// A fish that slipped off is still in the pond: each new try on it gives a little more green and a quicker fill (it is getting tired),
// up to four tries' worth. The very first fish of a farm (n 0) hardly moves and drains slowly, so a new farmer lands it.
import {FISH} from './farm-state.js';
export const REEL=Object.freeze({start:30,lift:260,fall:220,top:120,bounce:.3,tireZone:2,tireFill:2,tireMax:4,firstDrain:5,firstSpeed:.6,edge:4});
// How each kind fights: how often it picks a new spot (seconds), how far it goes (bar units) and how much quicker it moves meanwhile.
// steady swims up and down evenly; stopgo rests between its moves; Old Whiskers fights in three phases as the catch fills.
export const FIGHTS=Object.freeze({
 drift:{every:[1.5,3],reach:20,fast:1},hops:{every:[.8,1.6],reach:25,fast:1},steady:{wave:5.5,reach:24,fast:1},pulls:{every:[2.8,4.2],reach:100,fast:1,ends:true},
 stopgo:{every:[.6,1.2],reach:45,fast:1.6,rests:true},darts:{every:[.7,1.3],reach:60,fast:1.25},erratic:{every:[.6,1.1],reach:55,fast:1}
});
export const fightOf=(species,progress)=>FISH[species].fight==='phases'?(progress<45?'pulls':progress<75?'darts':'erratic'):FISH[species].fight;
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
export function createReel(species,{tries=0,first=false,random=Math.random}={}){
 const f=FISH[species],tired=clamp(Math.floor(tries),0,REEL.tireMax),size=f.zone+REEL.tireZone*tired,fill=f.fill+REEL.tireFill*tired,drain=first?REEL.firstDrain:f.drain;
 const between=([a,b])=>a+(b-a)*random();
 const r={species,size,fill,drain,zone:clamp(50-size/2,0,100-size),v:0,fish:50,target:50,progress:REEL.start,inside:true,perfect:true,done:null,t:0,next:.6,rest:0,boost:1};
 function pick(kind){
  const fight=FIGHTS[kind];r.next=r.t+between(fight.every);r.boost=fight.fast;
  if(fight.rests&&r.rest<r.t&&r.target!==null&&Math.abs(r.fish-r.target)<1&&random()<.5){r.rest=r.t+between(fight.every);r.next=r.rest;return;}
  r.target=fight.ends?(r.fish<=50?68+24*random():14+18*random()):r.fish+(random()*2-1)*fight.reach;
  r.target=clamp(r.target,REEL.edge,100-REEL.edge);
 }
 r.step=(dt,holding)=>{
  if(r.done||!(dt>0))return r;
  r.t+=dt;
  // The green zone: lifted while the button is held, sinking when it is not, softly bouncing at the ends.
  r.v=clamp(r.v+(holding?REEL.lift:-REEL.fall)*dt,-REEL.top,REEL.top);r.zone+=r.v*dt;
  if(r.zone<0){r.zone=0;if(r.v<0)r.v=-r.v*REEL.bounce;}
  if(r.zone>100-r.size){r.zone=100-r.size;if(r.v>0)r.v=-r.v*REEL.bounce;}
  // The fish.
  const kind=fightOf(species,r.progress),fight=FIGHTS[kind];
  if(fight.wave){r.target=clamp(50+fight.reach*Math.sin(r.t*2*Math.PI/fight.wave),REEL.edge,100-REEL.edge);r.boost=1;}
  else if(r.t>=r.next)pick(kind);
  if(r.t>=r.rest){const speed=f.speed*(first?REEL.firstSpeed:1)*r.boost*dt,gap=r.target-r.fish;r.fish+=Math.abs(gap)<=speed?gap:Math.sign(gap)*speed;}
  // The catch.
  r.inside=r.fish>=r.zone&&r.fish<=r.zone+r.size;if(!r.inside)r.perfect=false;
  r.progress=clamp(r.progress+(r.inside?r.fill:-r.drain)*dt,0,100);
  if(r.progress>=100)r.done='landed';else if(r.progress<=0)r.done='escaped';
  return r;
 };
 // A whole stretch of time in small even steps (a slow frame plays the same as quick ones).
 r.run=(seconds,holding)=>{let left=Math.min(seconds,.25);while(left>1e-9&&!r.done){const dt=Math.min(left,1/120);r.step(dt,holding);left-=dt;}return r;};
 return r;
}
