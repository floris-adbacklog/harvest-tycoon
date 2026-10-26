import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// The final CrazyGames Basic Launch (26 Oct 2026): inside CrazyGames no News and only the CrazyGames pop-up group (both often point
// elsewhere: a live stream, a review in the App Store, a pass for sale), no avatar earned with invites, and the Season Pass's buy parts
// hidden by portal.css too.
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('News stays away inside CrazyGames, and the unread count leaves it out',async()=>{
 const {newsShown,unreadWithoutNews}=await import('../src/chat-ui.js');
 assert.equal(newsShown({name:'crazygames'}),false);
 for(const found of [null,{name:'kongregate'},{name:'discord'}])assert.equal(newsShown(found),true,JSON.stringify(found));
 const rows=[{kind:'news'},{kind:'gift'},{kind:'news'},{kind:'family'},{kind:'gift'}];
 assert.equal(unreadWithoutNews(rows,3),1,'of the 3 newest only the gift');
 assert.equal(unreadWithoutNews(rows,5),3);assert.equal(unreadWithoutNews(rows,0),0);assert.equal(unreadWithoutNews(null,4),0);
 const ui=read('src/chat-ui.js');
 assert.match(ui,/notices=rows\.filter\(n=>\(n\.player_id\|\|Date\.parse\(n\.created_at\)>joined\)&&\(n\.kind!=='news'\|\|newsShown\(\)\)\);/,'the list');
 assert.match(ui,/if\(event\.type==='notice'\)\{\n   if\(event\.notice\?\.kind==='news'&&!newsShown\(\)\)return;/,'a live one: no count, no row');
 assert.match(ui,/if\(!newsShown\(\)&&next\?\.unread\?\.notices>0\)\{const rows=await chat\.notices\(\)/,'the count from the server, counted again');
});

test('pop-ups inside CrazyGames: only its own group',async()=>{
 const {fitsDevice}=await import('../src/popup-ui.js');
 const cg={installed:false,phone:false,web:false,crazygames:true};
 assert.deepEqual(['all','browser','desktop','phone','crazygames'].map(a=>fitsDevice(a,cg)),[false,false,false,false,true]);
 assert.equal(fitsDevice('all',{installed:false,phone:false,web:false}),true,'Kongregate and Discord as before');
});

test('the avatar earned with invited friends is not offered where invites are off, unless it is yours',async()=>{
 const before=globalThis.window;
 globalThis.window={parent:{harvestPortal:{name:'crazygames',features:{invite:false,payments:false}}},navigator:{userAgent:'Chrome'},document:{documentElement:{dataset:{}}}};
 try{
  const {avatarSettingsMarkup}=await import('../public/avatar-settings.js');
  const html=avatarSettingsMarkup('farmer-01',10);
  assert.doesNotMatch(html,/invited friends/i,'not inside CrazyGames');
  globalThis.window={parent:{harvestPortal:{name:'kongregate',features:{invite:true,payments:false}}},navigator:{userAgent:'Chrome'},document:{documentElement:{dataset:{}}}};
  assert.match(avatarSettingsMarkup('farmer-01',10),/invited friends/i,'where invites are on');
 }finally{globalThis.window=before;}
});

test('portal.css hides the Season Pass banner, buy box and buy button on a portal that sells nothing',()=>{
 assert.match(read('public/portal.css'),/html\[data-portal\]:not\(\[data-portal-shop\]\) #shop-season,html\[data-portal\]:not\(\[data-portal-shop\]\) \.season-paid-box,html\[data-portal\]:not\(\[data-portal-shop\]\) \.season-buy\{display:none!important\}/);
});
