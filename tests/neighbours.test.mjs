import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,applyFarmAction as act,xpForLevel,levelOf,FEATURE_LEVELS,NEIGHBOURS,NEIGHBOUR_HEARTS,neighbourLevel,neighbourStatus,neighbourHearts} from '../game/farm-state.js';
import {LETTERS,NEIGHBOUR_ORDER} from '../public/neighbours.js';

// The neighbours (24 Oct 2026, the owner: "Doe 1&2", "zorg dat je met 2 ook storytelling meeneemt", "Deze opzet is goed"): four people,
// a favourite once a UTC day, five hearts at 1/3/6/10/15 gifts, each heart a letter and a reward, the last a decoration.
const now=Date.UTC(2026,9,24,15),DAY=86400000;
const farm=(level=20)=>{const s=createFarm(now-30*DAY);s.xp=xpForLevel(level)+10;s.rookieUntil=0;s.onboarding={...s.onboarding,completed:10,rewardClaimed:true};Object.assign(s.inventory,{wheat:2000,corn:500,lettuce:500,sunflower:20});return normalizeFarm(s,now);};

test('they move in at level 8, Hank when sunflowers grow; each has five letters with a title and a story',()=>{
 assert.equal(FEATURE_LEVELS.neighbours,8);assert.deepEqual(NEIGHBOUR_ORDER.map(neighbourLevel),[8,8,8,17]);
 assert.throws(()=>act(farm(7),{type:'neighbour_gift',neighbour:'rosie',item:'wheat'},now),/Reach level 8 to unlock Neighbours\./);
 assert.throws(()=>act(farm(10),{type:'neighbour_gift',neighbour:'hank',item:'sunflower'},now),/Reach level 17 to meet Hank\./);
 for(const key of NEIGHBOUR_ORDER){assert.equal(LETTERS[key].length,NEIGHBOUR_HEARTS.length,key);for(const [title,body] of LETTERS[key]){assert.ok(title.length<40&&body.length>80&&body.length<400,title);assert.doesNotMatch(body,/·/);}}
});

test('a favourite once a UTC day; five hearts with their rewards, the last a decoration in Your things',()=>{
 const s=farm(20),coins=s.coins,diamonds=s.diamonds;let t=now;const got=[];
 assert.throws(()=>act(s,{type:'neighbour_gift',neighbour:'rosie',item:'corn'},t),/Rosie would love something else\./);
 for(let gift=1;gift<=15;gift++){const r=act(s,{type:'neighbour_gift',neighbour:'rosie',item:'wheat'},t);if(r.heart)got.push([gift,r.heart,r.coins,r.diamonds,r.decor??null]);
  if(gift===1)assert.throws(()=>act(s,{type:'neighbour_gift',neighbour:'rosie',item:'wheat'},t),/Rosie has had a gift today\. Come back tomorrow\./);t+=DAY;}
 const L=levelOf(s);
 assert.deepEqual(got,[[1,1,20*L,0,null],[3,2,40*L,3,null],[6,3,60*L,0,null],[10,4,80*L,5,null],[15,5,0,10,'cart']]);
 assert.equal(s.inventory.wheat,2000-15*NEIGHBOURS.rosie.likes.wheat);assert.equal(s.diamonds,diamonds+18);assert.equal(s.coins,coins+200*L);
 assert.equal(s.layout.stored.cart,1);assert.equal(neighbourHearts(s,'rosie'),5);assert.equal(neighbourStatus(s,'rosie',t).done,true);
 assert.throws(()=>act(s,{type:'neighbour_gift',neighbour:'rosie',item:'wheat'},t),/best of friends already/);
 assert.equal(s.stats.neighbour_gifts,15);
});

test('the window: More › Neighbours, the faces in WebP, the ⓘ-free calm rows',()=>{
 const html=readFileSync(new URL('../public/farm.html',import.meta.url),'utf8');
 assert.match(html,/<button data-menu-utility="neighbours"><i data-game-art="friendship-heart"><\/i>/);assert.match(html,/<dialog id="neighbours-dialog"/);
 for(const key of NEIGHBOUR_ORDER)assert.ok(readFileSync(new URL(`../public/assets/neighbours/${key}.webp`,import.meta.url)).length>1000,key);
});
