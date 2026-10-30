import {customEmblemPath,FAMILY_EMBLEMS} from './farm-state.js';

// A family's own emblem (30 Oct 2026, the owner, 100 diamonds; farm-state.js family_emblem_custom): the picture is checked and stored
// here, in the public bucket family-emblems (supabase/family-emblem-upload.sql), before the family action makes it the emblem. Only a
// square PNG or WebP of 128 to 512 pixels and at most 100 KB; the file's own bytes say what it is, never its name or the browser.
export const EMBLEM_BUCKET='family-emblems';
export const EMBLEM_MAX_BYTES=102400,EMBLEM_MIN_SIDE=128,EMBLEM_MAX_SIDE=512;
// The whole request with such a picture: its base64 (4/3 of the bytes) and the rest of the action, well under 150 KB.
export const EMBLEM_BODY_MAX=Math.ceil(EMBLEM_MAX_BYTES*4/3)+4096;
const fail=message=>{throw Object.assign(new Error(message),{code:'EMBLEM_REJECTED'});};
const u32be=(b,i)=>((b[i]<<24)>>>0)+(b[i+1]<<16)+(b[i+2]<<8)+b[i+3];
const ascii=(b,i,n)=>String.fromCharCode(...b.slice(i,i+n));
// The picture's kind and size from its first bytes (PNG's IHDR; WebP's VP8, VP8L or VP8X header), or null.
export function imageInfo(b){
 if(b.length>=24&&b[0]===0x89&&ascii(b,1,3)==='PNG'&&ascii(b,12,4)==='IHDR')return {type:'image/png',ext:'png',width:u32be(b,16),height:u32be(b,20)};
 if(b.length>=30&&ascii(b,0,4)==='RIFF'&&ascii(b,8,4)==='WEBP'){
  const chunk=ascii(b,12,4);
  if(chunk==='VP8 ')return {type:'image/webp',ext:'webp',width:(b[26]|b[27]<<8)&0x3fff,height:(b[28]|b[29]<<8)&0x3fff};
  if(chunk==='VP8L'&&b[20]===0x2f){const bits=(b[21]|b[22]<<8|b[23]<<16|b[24]<<24)>>>0;return {type:'image/webp',ext:'webp',width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1};}
  if(chunk==='VP8X')return {type:'image/webp',ext:'webp',width:1+(b[24]|b[25]<<8|b[26]<<16),height:1+(b[27]|b[28]<<8|b[29]<<16)};
 }
 return null;
}
// The upload's bytes from its base64 text, checked: kind, size on disk and on screen.
export function emblemImage(base64){
 const text=String(base64??'').replace(/^data:image\/[a-z]+;base64,/,'');
 if(!text||text.length>Math.ceil(EMBLEM_MAX_BYTES*4/3)+8||!/^[A-Za-z0-9+/]+={0,2}$/.test(text))fail('Choose a PNG or WebP picture of at most 100 KB.');
 const bytes=Uint8Array.from(atob(text),c=>c.charCodeAt(0));
 if(bytes.length>EMBLEM_MAX_BYTES)fail('Choose a PNG or WebP picture of at most 100 KB.');
 const info=imageInfo(bytes);if(!info)fail('Choose a PNG or WebP picture.');
 if(info.width!==info.height)fail('The picture must be square.');
 if(info.width<EMBLEM_MIN_SIDE||info.width>EMBLEM_MAX_SIDE)fail(`The picture must be ${EMBLEM_MIN_SIDE} to ${EMBLEM_MAX_SIDE} pixels wide.`);
 return {...info,bytes};
}
export async function storeEmblem(admin,familyId,picture){
 const path=`${familyId}/${crypto.randomUUID()}.${picture.ext}`;
 const saved=await admin.storage.from(EMBLEM_BUCKET).upload(path,picture.bytes,{contentType:picture.type,upsert:false,cacheControl:'31536000'});
 if(saved.error)fail('The emblem could not be saved. Please try again.');
 return path;
}
export async function dropEmblemFile(admin,emblem){const path=customEmblemPath(emblem);if(path)try{await admin.storage.from(EMBLEM_BUCKET).remove([path]);}catch{}}
// After an upload or a change of emblem: every file of the two that the family does not wear now goes (the old one once replaced, the
// new one when the action was refused). Read again first, so a replayed request never takes away the emblem the family wears.
export async function settleEmblemFiles(admin,player,{path=null,previous=null}){
 let wearing=null;try{wearing=(await familyOf(admin,player))?.emblem??null;}catch{return;}
 for(const emblem of [previous,path?`custom:${path}`:null])if(emblem&&emblem!==wearing)await dropEmblemFile(admin,emblem);
}
// The farmer's current family (a member now, and the family not deleted), with its emblem.
export async function familyOf(admin,player){
 const found=await admin.from('family_members').select('family_id,families!inner(id,emblem,deleted_at)').eq('player_id',player).is('left_at',null).maybeSingle();
 if(found.error)throw found.error;const f=found.data?.families;return f&&!f.deleted_at?{id:f.id,emblem:f.emblem}:null;
}
// Report a family's own emblem (anyone signed in, once per emblem). Staff see the count in Admin › Chat.
export async function handleEmblemReport({admin,body,player}){
 const familyId=String(body?.familyId??'');if(!/^[0-9a-f-]{36}$/i.test(familyId))return {status:400,data:{error:'Choose a family.'}};
 const found=await admin.from('families').select('id,emblem').eq('id',familyId).is('deleted_at',null).maybeSingle();if(found.error)throw found.error;
 if(!customEmblemPath(found.data?.emblem))return {status:200,data:{reported:false}};
 const saved=await admin.from('family_emblem_reports').upsert({family_id:familyId,emblem:found.data.emblem,reporter:player},{onConflict:'family_id,emblem,reporter',ignoreDuplicates:true});
 if(saved.error)throw saved.error;
 return {status:200,data:{reported:true}};
}
// The staff's list of own emblems (newest first, with how often each is reported) and removing one: the family gets the first
// emblem back, the file and its reports go. No refund: what breaks the rules goes.
export async function handleEmblemAdmin({admin,body}){
 if(body?.command==='remove'){
  const familyId=String(body.familyId??'');if(!/^[0-9a-f-]{36}$/i.test(familyId))return {status:400,data:{error:'Choose a family.'}};
  const found=await admin.from('families').select('emblem').eq('id',familyId).maybeSingle();if(found.error)throw found.error;
  if(!customEmblemPath(found.data?.emblem))return {status:200,data:{removed:false}};
  const updated=await admin.from('families').update({emblem:FAMILY_EMBLEMS[0].id}).eq('id',familyId).eq('emblem',found.data.emblem);if(updated.error)throw updated.error;
  await dropEmblemFile(admin,found.data.emblem);
  await admin.from('family_emblem_reports').delete().eq('family_id',familyId);
  return {status:200,data:{removed:true}};
 }
 const [families,reports]=await Promise.all([
  admin.from('families').select('id,name,emblem').like('emblem','custom:%').is('deleted_at',null).limit(200),
  admin.from('family_emblem_reports').select('family_id,emblem')
 ]);
 if(families.error)throw families.error;if(reports.error)throw reports.error;
 const counts=new Map();for(const r of reports.data??[])counts.set(`${r.family_id} ${r.emblem}`,(counts.get(`${r.family_id} ${r.emblem}`)??0)+1);
 const list=(families.data??[]).map(f=>({id:f.id,name:f.name,emblem:f.emblem,reports:counts.get(`${f.id} ${f.emblem}`)??0}))
  .sort((a,b)=>b.reports-a.reports||a.name.localeCompare(b.name));
 return {status:200,data:{emblems:list}};
}
