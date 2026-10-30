import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAMILY_EMBLEM_UPLOAD_COST,FAMILY_MIN_LEVEL,customEmblemPath,emptyFamilyContext,familyMutate,createFarm,normalizeFarm,xpForLevel} from '../game/farm-state.js';
import {imageInfo,emblemImage,settleEmblemFiles,EMBLEM_BUCKET} from '../supabase/functions/farm-api/emblem-upload.js';
import {emblemMarkup,emblemColor,ownEmblemUrl,EMBLEM_IMAGES} from '../public/family-emblem-art.js';
import {familyLog} from '../supabase/functions/farm-api/player-log.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// A family's own emblem (30 Oct 2026, the owner): a square PNG or WebP, 128-512 px and at most 100 KB, for 100 diamonds paid by the
// uploader; visible at once, reported by other farmers, removed by the staff. Only families, never profile avatars; not on a portal.
const now=Date.parse('2026-10-30T12:00:00Z');
const farm=(diamonds=500)=>{const s=createFarm(now);s.xp=xpForLevel(FAMILY_MIN_LEVEL);s.diamonds=diamonds;return normalizeFarm(s,now);};
const family=()=>familyMutate(emptyFamilyContext(),farm(),'alice',{type:'family_create',name:'Meadow Friends',emblem:'0'},now).context;
const uuid='3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b';

test('an own emblem is custom:<family>/<uuid>.png or .webp, nothing else',()=>{
 const f='707c9d10-78be-4f9a-8d3b-a25f25477278';
 assert.equal(customEmblemPath(`custom:${f}/${uuid}.png`),`${f}/${uuid}.png`);
 assert.equal(customEmblemPath(`custom:${f}/${uuid}.webp`),`${f}/${uuid}.webp`);
 for(const bad of ['0','60',null,undefined,`custom:${f}/${uuid}.gif`,`custom:${f}/../${uuid}.png`,`custom:${f}/${uuid}.png?x=1`,`custom:https://evil.example/${uuid}.png`,` custom:${f}/${uuid}.png`])assert.equal(customEmblemPath(bad),null,String(bad));
 assert.equal(ownEmblemUrl(`custom:${f}/${uuid}.png`),`${EMBLEM_IMAGES}${f}/${uuid}.png`);
 assert.equal(ownEmblemUrl('5'),null);
 assert.match(EMBLEM_IMAGES,/\/storage\/v1\/object\/public\/family-emblems\/$/);assert.equal(EMBLEM_BUCKET,'family-emblems');
});

test('the uploader pays 100 diamonds and the picture is the emblem at once; only a leader or co-leader, only in its own folder',()=>{
 assert.equal(FAMILY_EMBLEM_UPLOAD_COST,100);
 const c=family(),id=c.families[0].id,state=farm(150);
 const r=familyMutate(c,state,'alice',{type:'family_emblem_custom',path:`${id}/${uuid}.webp`},now);
 assert.equal(r.failed,false);assert.equal(r.context.families[0].emblem,`custom:${id}/${uuid}.webp`);
 assert.equal(state.diamonds,50);assert.equal(state.stats.diamonds_spent,100);
 assert.throws(()=>familyMutate(c,farm(99),'alice',{type:'family_emblem_custom',path:`${id}/${uuid}.webp`},now),/You need 100 diamonds/);
 assert.throws(()=>familyMutate(c,farm(),'alice',{type:'family_emblem_custom',path:`707c9d10-78be-4f9a-8d3b-a25f25477278/${uuid}.png`},now),/Upload the picture again/,'another family\'s folder');
 assert.throws(()=>familyMutate(c,farm(),'alice',{type:'family_emblem_custom',path:`${id}/${uuid}.gif`},now),/Upload the picture again/);
 // Back to a built-in emblem is free, as always.
 const back=familyMutate(r.context,farm(),'alice',{type:'family_emblem',emblem:'7'},now);assert.equal(back.failed,false);assert.equal(back.context.families[0].emblem,'7');
});

const png=(w,h)=>{const b=new Uint8Array(33);b.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,13,0x49,0x48,0x44,0x52]);new DataView(b.buffer).setUint32(16,w);new DataView(b.buffer).setUint32(20,h);return b;};
const webpL=(w,h)=>{const b=new Uint8Array(30);b.set([...'RIFF'].map(c=>c.charCodeAt(0)),0);b.set([...'WEBPVP8L'].map(c=>c.charCodeAt(0)),8);b[20]=0x2f;const bits=(w-1)|((h-1)<<14);b[21]=bits&255;b[22]=bits>>8&255;b[23]=bits>>16&255;b[24]=bits>>>24&255;return b;};
const base64=b=>Buffer.from(b).toString('base64');
test('farm-api reads the kind and size from the file\'s own bytes and refuses what does not fit',()=>{
 assert.deepEqual(imageInfo(png(256,256)),{type:'image/png',ext:'png',width:256,height:256});
 assert.deepEqual(imageInfo(webpL(300,300)),{type:'image/webp',ext:'webp',width:300,height:300});
 assert.equal(imageInfo(new TextEncoder().encode('GIF89a not a picture we take here')),null);
 assert.equal(emblemImage(base64(png(512,512))).ext,'png');
 assert.equal(emblemImage(`data:image/webp;base64,${base64(webpL(128,128))}`).ext,'webp');
 assert.throws(()=>emblemImage(base64(png(256,200))),/must be square/);
 assert.throws(()=>emblemImage(base64(png(64,64))),/128 to 512 pixels/);
 assert.throws(()=>emblemImage(base64(png(1024,1024))),/128 to 512 pixels/);
 assert.throws(()=>emblemImage(base64(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))),/PNG or WebP/,'never an SVG');
 assert.throws(()=>emblemImage('A'.repeat(140000)),/at most 100 KB/);
 assert.throws(()=>emblemImage(''),/at most 100 KB/);
});

test('a file goes only when the family does not wear it, so a replayed request never takes the live emblem away',async()=>{
 const f='707c9d10-78be-4f9a-8d3b-a25f25477278',old=`custom:${f}/${uuid}.png`,fresh=`${f}/0e1d2c3b-4a59-4687-9786-a5b4c3d2e1f0.webp`;
 const run=async(wearing,uploaded)=>{const removed=[];const admin={from:()=>({select:()=>({eq:()=>({is:()=>({maybeSingle:async()=>({data:{families:{id:f,emblem:wearing,deleted_at:null}}})})})})}),storage:{from:()=>({remove:async paths=>{removed.push(...paths);return {};}})}};await settleEmblemFiles(admin,'alice',uploaded);return removed;};
 assert.deepEqual(await run(`custom:${fresh}`,{path:fresh,previous:old}),[`${f}/${uuid}.png`],'the new one is in: the old file goes');
 assert.deepEqual(await run(old,{path:fresh,previous:old}),[fresh],'refused or replayed: only the new file goes');
 assert.deepEqual(await run('7',{path:null,previous:old}),[`${f}/${uuid}.png`],'back to a built-in emblem');
 assert.deepEqual(await run(old,{path:null,previous:old}),[],'a refused change keeps it');
});

test('every emblem draws through one helper: an own picture fills the tile on a cream ground',()=>{
 const own=`custom:707c9d10-78be-4f9a-8d3b-a25f25477278/${uuid}.png`;
 assert.match(emblemMarkup(own),/^<span class="family-emblem is-own" style="--family-color:#efe5d2"><img class="family-emblem-own" src="https:\/\/jnmdirvidffzxukbdmij\.supabase\.co\/storage\/v1\/object\/public\/family-emblems\/[^"]+\.png" alt=""/);
 assert.equal(emblemColor(own),'#efe5d2');
 assert.match(emblemMarkup('0'),/^<span class="family-emblem" style="--family-color:#[0-9a-f]{6}">/i);
 for(const path of ['public/family-ui.js','public/family-badge.js','public/welcome-ui.js','src/chat-ui.js'])assert.match(read(path),/emblemMarkup\(/,path);
 assert.match(read('src/chat-ui.js'),/data-family-view="\$\{esc\(f\.id\)\}"[^\n]*emblemMarkup\(f\.emblem\)/,'the chat badge draws the sender\'s family');
 assert.match(read('public/family.css'),/\.family-emblem-own\{[^}]*object-fit:cover/);
});

test('the upload is a fold low in Family settings, shut, never where a family is started, and not on a portal',()=>{
 const ui=read('public/family-ui.js');
 const card=ui.match(/const ownEmblemCard=\(\)=>`([\s\S]*?)`;/)[1];
 assert.match(card,/^<details class="family-own-emblem" data-own-emblem data-fold="own-emblem"><summary>/);assert.doesNotMatch(card.slice(0,120),/ open/,'shut until a leader opens it');
 assert.match(card,/The copyright stays with me/,'the copyright stays with the farmer');
 assert.match(card,/Upload for \$\{FAMILY_EMBLEM_UPLOAD_COST\} diamonds/);
 assert.equal(ui.match(/ownEmblemCard\(\)/g).length,1,'shown in one place only');
 const settings=ui.slice(ui.indexOf(' function settings(){'),ui.indexOf(' function render(){'));
 assert.match(settings,/\$\{portal\(\)\?'':ownEmblemCard\(\)\}\n {2}\$\{leave\}`;/,'right above Leave this family');
 const landing=ui.slice(ui.indexOf(' function landing(){'),ui.indexOf(' function browse('));assert.doesNotMatch(landing,/ownEmblemCard|data-own-emblem/);
 assert.match(read('supabase/functions/farm-api/index.ts'),/if\(portalOf\(user\)\)return reply\(\{error:'Own emblems are not available here\./);
});

test('other farmers can report it; the staff see the list in Admin › Chat and remove one without a refund',()=>{
 const profile=read('public/family-profile.js');
 assert.match(profile,/customEmblemPath\(p\.emblem\)&&!p\.viewer\?\.member\?`<button type="button" class="link-button family-emblem-report" data-family-emblem-report>Report this emblem<\/button>`/);
 assert.match(profile,/operation:'family_emblem_report'/);
 const admin=read('src/admin-dashboard.js');
 assert.match(admin,/id="admin-emblems" hidden>/);assert.match(admin,/operation:'admin_family_emblems',command:'remove'/);
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/body\.operation==='admin_family_emblems'\)\{if\(!\(await isStaff\(admin,user\)\)\)return reply\(\{error:'Not authorized\.'/);
 const sql=read('supabase/family-emblem-upload.sql');
 assert.match(sql,/'family-emblems'/);assert.match(sql,/102400/);assert.match(sql,/image\/png/);assert.match(sql,/image\/webp/);assert.doesNotMatch(sql,/image\/svg/);
 assert.match(sql,/enable row level security/i);
 assert.equal(familyLog({type:'family_emblem_custom'},null,null)[0]?.text,'Uploaded an own family emblem');
});

test('the new texts are in all 15 languages',()=>{
 for(const code of ['cs','de','es','fr','id','hu','nl','pt','tr','ru','uk','hi','ja','ar','zh']){
  const t=JSON.parse(read(`public/i18n/${code}.json`));
  for(const text of ['Your own emblem','Report this emblem','Upload for {0} diamonds','The picture must be square.','Uploaded an own family emblem'])assert.ok(t[text],`${code}: ${text}`);
 }
});

// 30 Oct 2026: the first live upload (106 KB of JSON) came back 413, as farm-api took 4 KB for every request; the toast sat behind the
// window, so the leader saw nothing. Now only this action may be bigger, the card says what went wrong, and the own picture is the
// first (picked) tile of the emblem row.
test('a full 100 KB picture fits the request limit; every other request keeps 4 KB',async()=>{
 const {EMBLEM_BODY_MAX,EMBLEM_MAX_BYTES}=await import('../supabase/functions/farm-api/emblem-upload.js');
 const body=JSON.stringify({operation:'action',requestId:'3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b',revision:123456,action:{type:'family_emblem_upload',image:'A'.repeat(Math.ceil(EMBLEM_MAX_BYTES/3)*4)}});
 assert.ok(body.length<=EMBLEM_BODY_MAX,`${body.length} fits ${EMBLEM_BODY_MAX}`);assert.ok(EMBLEM_BODY_MAX<150000);
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,new RegExp(`const EMBLEM_BODY_MAX=${EMBLEM_BODY_MAX};`),'the same limit in index.ts');
 assert.match(api,/let body:any,parsed=false;if\(raw\.length<=EMBLEM_BODY_MAX\)\{try\{body=JSON\.parse\(raw\);parsed=true;\}catch\{\}\}/);
 assert.match(api,/const bodyMax=parsed&&body\?\.operation==='action'&&body\?\.action\?\.type==='family_emblem_upload'\?EMBLEM_BODY_MAX:4096;/);
 assert.match(api,/if\(raw\.length>bodyMax\)return reply\(\{error:'Request is too large\.'\},413\);/);
});
test('the emblem row starts with the own picture while it is the emblem, and leaving it asks first',()=>{
 const ui=read('public/family-ui.js');
 assert.match(ui,/const lookChoices=f=>\[\.\.\.\(customEmblemPath\(f\.emblem\)\?\[\{id:f\.emblem,own:true\}\]:\[\]\),\.\.\.familyEmblemChoices\(view\.seasonEmblems\?\?\[\]\)\];/);
 assert.match(ui,/emblemPickerMarkup\(\{emblems:lookChoices\(f\),checkedId:f\.emblem,legend:'Choose an emblem',nameOf:e=>e\.own\?'Your own emblem':emblemName\(e\)/);
 assert.match(ui,/customEmblemPath\(f\.emblem\)&&!await confirmAction\(\{title:'Replace your own emblem\?'/);
 assert.match(ui,/if\(!await act\(\{type:'family_emblem_upload',image:picked\.data\}\)\)\{[^\n]*n\.textContent=error\|\|'That did not work\. Please try again\.'/);
});
