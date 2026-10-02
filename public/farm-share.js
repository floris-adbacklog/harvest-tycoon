// Share my farm (Oct 2026): a picture of the farmer's own 3D farm with their invite link, from the level-up card and their own profile.
// Two taps inside that card, never a pop-up of its own: the first makes the picture and shows it, the second hands the finished file to
// the share sheet straight from the tap (Safari only opens the sheet from a tap, and making the picture takes too long for that).
// Where a browser cannot share a file (desktop Firefox, the in-app browsers of Facebook and Instagram): Save picture, Copy link, and on
// a phone press and hold the picture. The picture is made on the device and never sent to us (privacy.html).
// The words on the picture and in the share go through t() (the page's translation never sees them); the farmer's name and the
// family's name are drawn as they are.
import {t} from './i18n.js';
import {INVITE_REWARD,INVITE_LEVEL,levelOf} from './farm-state.js';
import {portalOff} from './portal.js';
import {androidApp,shareInApp} from './android.js';

export const SHARE_SIZE=Object.freeze({width:1080,height:1350});   // 4:5: chats, the Instagram and Facebook feed, centred in Stories
export const PHOTO=Object.freeze({x:40,y:220,width:1000,height:860});   // where the farm sits on it (game.js renders it at this size)
// The shared link is the invite link with ?src=farm-photo, so sign-ups that came from a picture can be counted apart.
export const SHARE_SOURCE='farm-photo';
export const SHARE_FILE='harvest-tycoon-farm.jpg';
const SITE='https://www.harvesttycoon.com/',LOGO='/assets/harvest-tycoon-logo.webp';
// Outfit and DM Sans only have Latin letters: Arabic, Hindi, Japanese, Chinese, Russian and Ukrainian fall back to the device's font.
const TITLE_FONT="Outfit,'DM Sans',system-ui,sans-serif",TEXT_FONT="'DM Sans',system-ui,sans-serif";
const font=(weight,size,family=TEXT_FONT)=>`${weight} ${size}px ${family}`;

// The photo's frame: the largest part of what the farmer sees in the picture's shape, centred on the farm (without the room the side
// tools take on a computer). view is the play camera's frustum.
export function photoFrame(view,aspect){
 const w=Math.min(view.right-view.left,(view.top-view.bottom)*aspect),h=w/aspect;
 return {left:-w/2,right:w/2,top:h/2,bottom:-h/2};
}
export function shareLink(link){
 let url;try{url=new URL(link||SITE);}catch{url=new URL(SITE);}
 url.searchParams.set('src',SHARE_SOURCE);return url.href;
}
// The link as it reads on the picture: harvesttycoon.com/?invite=AB12 (no https, no www, no src).
export function displayLink(link){
 try{const url=new URL(link);url.searchParams.delete('src');return `${url.hostname.replace(/^www\./,'')}${url.search?`${url.pathname}${url.search}`:url.pathname.replace(/^\/$/,'')}`;}
 catch{return 'harvesttycoon.com';}
}
// Every word on the picture and in the share. invited: the link carries the farmer's invite code (not when it could not be loaded).
export function shareCopy({name,level,family,link,invited},tr=t){
 return {
  title:name?tr('{0}’s farm',name):tr('My farm'),
  levelText:tr('Level {0}',level),
  familyText:family?.name??'',
  cta:tr('Play free at {0}','harvesttycoon.com'),
  linkText:displayLink(link),
  rule:invited?tr('Start with my link and we both get {0} diamonds at level {1}.',INVITE_REWARD,INVITE_LEVEL):'',
  // The link inside the text: several apps drop a separate url once a file comes along.
  shareText:tr('Come and see my farm in Harvest Tycoon! Play free with my link: {0}',link),
  fileName:SHARE_FILE
 };
}
// 'files' when this browser can hand a picture to the share sheet, else 'fallback' (Save picture, Copy link). In our Android app (Oct 2026,
// public/android.js) 'app': its WebView has no navigator.share, and the app's own share sheet takes the text with the link (no picture).
export function shareRoute(host,file){
 if(androidApp(host))return 'app';
 try{return typeof host?.navigator?.share==='function'&&host.navigator.canShare?.({files:[file]})?'files':'fallback';}catch{return 'fallback';}
}
// Where everything goes on the 1080×1350 picture; right to left (Arabic) mirrors it.
export function shareLayout({width=SHARE_SIZE.width,rtl=false}={}){
 const box=(x,y,w,h)=>({x:rtl?width-x-w:x,y,width:w,height:h}),start=x=>rtl?width-x:x;
 return {
  logo:box(48,40,150,150),
  title:{x:start(220),y:96,maxWidth:width-268,size:64,min:40},
  level:{x:start(220),y:140,height:56,size:36,maxWidth:width-268},
  photo:box(PHOTO.x,PHOTO.y,PHOTO.width,PHOTO.height),
  flag:box(760,244,256,160),
  cta:{x:width/2,y:1136,size:50,min:34,maxWidth:width-80},
  link:{x:width/2,y:1180,height:72,size:38,min:26,maxWidth:width-80},
  rule:{x:width/2,y:1298,size:28,min:20,maxWidth:width-80}
 };
}

const images=new Map();
function picture(doc,src){
 if(!images.has(src))images.set(src,new Promise(resolve=>{const img=doc.createElement('img');img.decoding='async';img.onload=()=>resolve(img);img.onerror=()=>{images.delete(src);resolve(null);};img.src=src;}));
 return images.get(src);
}
async function fontsReady(doc){
 const fonts=doc?.fonts;if(!fonts?.load)return;
 await Promise.all([font(700,64,TITLE_FONT),font(700,32),font(400,28)].map(f=>fonts.load(f).catch(()=>null)));
}
async function familyCloth(doc,family,drawCloth){
 if(!family||!drawCloth)return null;
 const canvas=doc.createElement('canvas');canvas.width=256;canvas.height=160;
 try{await drawCloth(canvas,family);return canvas;}catch{return null;}
}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
// The biggest size from `size` down to `min` at which the text fits, else the smallest with an ellipsis. Leaves ctx.font set.
function fit(ctx,text,{size,min=size,maxWidth,weight=700,family=TEXT_FONT}){
 for(let s=size;s>=min;s-=2){ctx.font=font(weight,s,family);if(ctx.measureText(text).width<=maxWidth)return text;}
 ctx.font=font(weight,min,family);const chars=[...text];
 while(chars.length>1&&ctx.measureText(`${chars.join('')}…`).width>maxWidth)chars.pop();
 return `${chars.join('')}…`;
}

// Draws the picture and returns it as a JPEG (runtime pictures may be JPEG: it is what WhatsApp, Instagram and Safari all take).
export async function composeFarmPicture({photo,copy,family=null,rtl=false,doc=globalThis.document,drawCloth=null}){
 await fontsReady(doc);
 const [logo,cloth]=await Promise.all([picture(doc,LOGO),familyCloth(doc,family,drawCloth)]);
 const {width,height}=SHARE_SIZE,L=shareLayout({width,rtl}),canvas=doc.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d');
 try{
  ctx.direction=rtl?'rtl':'ltr';ctx.textBaseline='middle';
  // The level-up card's colours: warm yellow at the top to cream.
  const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#fff0bb');sky.addColorStop(1,'#fffdf4');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  if(logo)ctx.drawImage(logo,L.logo.x,L.logo.y,L.logo.width,L.logo.height);
  ctx.textAlign='start';ctx.fillStyle='#34432d';
  const title=fit(ctx,copy.title,{...L.title,family:TITLE_FONT});ctx.fillText(title,L.title.x,L.title.y);
  // The level in a gold pill, the family's name after it.
  ctx.font=font(700,L.level.size,TITLE_FONT);const levelWidth=ctx.measureText(copy.levelText).width+44,mid=L.level.y+L.level.height/2;
  const pillX=rtl?L.level.x-levelWidth:L.level.x;
  rounded(ctx,pillX,L.level.y,levelWidth,L.level.height,L.level.height/2);ctx.fillStyle='#f0c24f';ctx.fill();
  ctx.textAlign='center';ctx.fillStyle='#4a2d08';ctx.fillText(copy.levelText,pillX+levelWidth/2,mid+1);
  if(copy.familyText){
   const room=L.level.maxWidth-levelWidth-18,x=rtl?pillX-18:pillX+levelWidth+18;
   ctx.textAlign='start';ctx.fillStyle='#6c604a';ctx.fillText(fit(ctx,copy.familyText,{size:32,min:24,maxWidth:room}),x,mid+1);
  }
  // The farm, in a gold frame like the family flag's, lifted off the page by a soft shadow.
  const P=L.photo;
  ctx.save();ctx.shadowColor='rgba(55,47,30,.25)';ctx.shadowBlur=30;ctx.shadowOffsetY=12;rounded(ctx,P.x,P.y,P.width,P.height,40);ctx.fillStyle='#e9bd4c';ctx.fill();ctx.restore();
  ctx.save();rounded(ctx,P.x,P.y,P.width,P.height,40);ctx.clip();ctx.drawImage(photo,P.x,P.y,P.width,P.height);ctx.restore();
  ctx.lineWidth=10;ctx.strokeStyle='#e9bd4c';rounded(ctx,P.x+5,P.y+5,P.width-10,P.height-10,35);ctx.stroke();
  ctx.lineWidth=2;ctx.strokeStyle='#9c6d1c';rounded(ctx,P.x+11,P.y+11,P.width-22,P.height-22,29);ctx.stroke();
  if(cloth){
   const F=L.flag;ctx.save();ctx.translate(F.x+F.width/2,F.y+F.height/2);ctx.rotate((rtl?4:-4)*Math.PI/180);
   ctx.shadowColor='rgba(55,47,30,.3)';ctx.shadowBlur=18;ctx.shadowOffsetY=8;ctx.drawImage(cloth,-F.width/2,-F.height/2,F.width,F.height);ctx.restore();
   cloth.width=cloth.height=0;
  }
  // Under the farm: where to play, the link in a green pill and what the link brings. Without a code only the site.
  ctx.textAlign='center';ctx.fillStyle='#214d36';
  const cta=fit(ctx,copy.cta,{...L.cta,family:TITLE_FONT});ctx.fillText(cta,L.cta.x,copy.rule?L.cta.y:(PHOTO.y+PHOTO.height+SHARE_SIZE.height)/2);
  if(copy.rule){
   ctx.direction='ltr';const link=fit(ctx,copy.linkText,{...L.link,maxWidth:L.link.maxWidth-72}),linkWidth=Math.min(L.link.maxWidth,ctx.measureText(link).width+72);
   rounded(ctx,L.link.x-linkWidth/2,L.link.y,linkWidth,L.link.height,L.link.height/2);ctx.fillStyle='#214d36';ctx.fill();
   ctx.fillStyle='#fffdf5';ctx.fillText(link,L.link.x,L.link.y+L.link.height/2+1);ctx.direction=rtl?'rtl':'ltr';
   ctx.fillStyle='#80776b';ctx.fillText(fit(ctx,copy.rule,{...L.rule,weight:400}),L.rule.x,L.rule.y);
  }
  return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('toBlob')),'image/jpeg',.9));
 }finally{canvas.width=canvas.height=0;photo.width=photo.height=0;}   // iOS keeps canvas memory until it is shrunk
}

// Hands the picture to the share sheet: called straight from the tap, with nothing awaited before it. 'sent', 'cancelled' (the
// farmer closed the sheet) or 'failed' (the link is copied instead).
export function sharePicture(host,{file,copy}){
 let sharing;
 try{sharing=Promise.resolve(host.navigator.share({files:[file],title:'Harvest Tycoon',text:copy.shareText}));}catch(error){sharing=Promise.reject(error);}
 return sharing.then(()=>'sent',error=>error?.name==='AbortError'?'cancelled':'failed');
}
// Copies through the page around the game (same site), where the browser allows the clipboard, as Invite a friend does.
export async function copyLink(host,link,doc=globalThis.document,into=null){
 try{await host.navigator.clipboard.writeText(link);return true;}catch{}
 const field=doc?.createElement?.('textarea');if(!field||!into)return false;
 field.value=link;field.setAttribute('readonly','');field.className='farm-share-copy-field';into.append(field);
 let copied=false;try{field.select();copied=Boolean(doc.execCommand('copy'));}catch{}
 field.remove();return copied;
}

// capture(width,height): the farm photo as a canvas, made at once (game.js shootFarmPhoto), or null. canCapture: the 3D farm is
// there (not in the village, not after the 3D view was lost). invite(): the Invite a friend answer (invite-ui.js info, asked once).
// host: the page around the game, which shares and copies. track(event,{source}): analytics in that page, after cookie consent.
export function createFarmShare({capture,canCapture=()=>true,state,invite=null,host=globalThis.window,track=()=>{},drawCloth=null,playerName=()=>'',doc=globalThis.document,compose=composeFarmPicture}){
 const sessions=new WeakMap(),runs=new WeakMap(),urls=()=>doc?.defaultView?.URL??globalThis.URL;
 // Not on CrazyGames (Oct 2026, public/portal.js): the picture carries a link to our website, which they do not allow.
 const available=()=>Boolean(capture)&&!portalOff('share')&&Boolean(canCapture());
 const say=(box,text)=>{const status=box.querySelector('.farm-share-status');if(status)status.textContent=text;};
 // The box closes with its card: the picture is let go of, the button comes back.
 function reset(box){
  if(!box)return;runs.set(box,(runs.get(box)??0)+1);
  const s=sessions.get(box);sessions.delete(box);if(s?.url)urls().revokeObjectURL(s.url);
  if(s?.button)s.button.hidden=false;
  box.innerHTML='';box.hidden=true;
 }
 function failed(box,s){
  box.hidden=false;box.innerHTML='<p class="farm-share-error">Your farm picture could not be made. Try again.</p><button type="button" class="secondary-button farm-share-retry">Try again</button>';
  box.querySelector('.farm-share-retry').onclick=()=>open({source:s.source,box,button:s.button});
 }
 function show(box,s){
  const coarse=Boolean(doc?.defaultView?.matchMedia?.('(pointer:coarse)').matches),files=s.route==='files',app=s.route==='app';
  box.innerHTML=`<img class="farm-share-preview" src="${s.url}" alt="Your farm picture" width="${SHARE_SIZE.width}" height="${SHARE_SIZE.height}"><div class="farm-share-actions">${files||app?'<button type="button" class="secondary-button farm-share-send">Share</button>':''}<a class="secondary-button farm-share-save" href="${s.url}" download="${SHARE_FILE}">Save picture</a>${s.invited?'<button type="button" class="secondary-button farm-share-copy">Copy link</button>':''}</div>${!files&&!app&&coarse?'<p class="farm-share-hint">Press and hold the picture to save it.</p>':''}<p class="farm-share-status" role="status"></p>`;
  const send=box.querySelector('.farm-share-send'),save=box.querySelector('.farm-share-save'),copy=box.querySelector('.farm-share-copy');
  if(send&&app)send.onclick=async()=>{if(shareInApp({text:s.copy.shareText,url:s.link},host))track('farm_share_sent',{source:s.source});else await copied(box,s);};
  else if(send)send.onclick=()=>sharePicture(host,s).then(result=>{if(sessions.get(box)!==s)return;if(result==='sent')track('farm_share_sent',{source:s.source});else if(result==='failed')return copied(box,s);});
  if(save)save.onclick=()=>{track('farm_share_saved',{source:s.source});};
  if(copy)copy.onclick=()=>copied(box,s);
  (send??save)?.focus?.({preventScroll:true});box.scrollIntoView?.({block:'nearest',behavior:'smooth'});
 }
 async function copied(box,s){
  const done=await copyLink(host,s.link,doc,box);if(sessions.get(box)!==s)return;
  if(done){say(box,'Link copied. Send it to a friend!');track('farm_share_copied',{source:s.source});}
  else say(box,s.link);   // nothing could copy it: the link to copy by hand
 }
 // Tap 1: the photo is taken at once, then the invite link, the fonts and the picture follow; a newer tap or a closed card wins.
 async function open({source,box,button=null}){
  if(!box)return;reset(box);const run=runs.get(box),s={source,button};sessions.set(box,s);
  if(button)button.hidden=true;
  box.hidden=false;box.innerHTML='<p class="farm-share-making"><span class="farm-share-spinner" aria-hidden="true"></span>Making your picture…</p>';
  let photo=null;try{photo=available()?capture(PHOTO.width,PHOTO.height):null;}catch{photo=null;}
  if(!photo){failed(box,s);return;}
  try{
   const info=await Promise.resolve().then(()=>invite?.()).catch(()=>null),invited=Boolean(info?.link);
   const family=state?.family?.familyId&&state.family.name?state.family:null,link=shareLink(invited?info.link:null);
   const copy=shareCopy({name:String(playerName?.()||info?.profile?.username||'').trim(),level:levelOf(state),family,link,invited});
   const blob=await compose({photo,copy,family,rtl:doc?.documentElement?.dir==='rtl',doc,drawCloth});
   if(runs.get(box)!==run)return;
   const file=new (host?.File??globalThis.File)([blob],copy.fileName,{type:'image/jpeg'});
   Object.assign(s,{copy,link,invited,file,route:shareRoute(host,file),url:urls().createObjectURL(blob)});
   show(box,s);track('farm_share_open',{source});
  }catch(error){if(runs.get(box)===run){console.warn('Share my farm: the picture could not be made.',error);failed(box,s);}}
 }
 return {available,open,reset};
}
