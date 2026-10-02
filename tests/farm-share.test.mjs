import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {photoFrame,shareLink,displayLink,shareCopy,shareRoute,shareLayout,sharePicture,composeFarmPicture,createFarmShare,SHARE_SIZE,PHOTO,SHARE_FILE} from '../public/farm-share.js';
import {codeTranslator} from '../public/i18n.js';
import {createFarm,INVITE_REWARD,INVITE_LEVEL} from '../game/farm-state.js';
import {renderPlayerProfile} from '../src/player-profiles.js';
import {trackShare} from '../src/analytics.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,2,12);
const LINK='https://www.harvesttycoon.com/?invite=TONYAA';
const plain=(english,...values)=>english.replace(/\{(\d+)\}/g,(all,i)=>String(values[i]));

// Share my farm (Oct 2026): a picture of your own farm with your invite link, from the level-up card and your own profile.
test('the photo is the largest part of the view in the picture\'s shape, centred on the farm without the side tools\' shift',()=>{
 const aspect=PHOTO.width/PHOTO.height,close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} ≠ ${b}`);
 // A computer (16:9) with the side tools shifting the view: limited by the height.
 const desk=photoFrame({left:-33.78-2,right:33.78-2,top:19,bottom:-19},aspect);
 close(desk.top-desk.bottom,38);close((desk.right-desk.left)/(desk.top-desk.bottom),aspect);close(desk.left,-desk.right);close(desk.top,-desk.bottom);
 // A phone held upright (9:19.5): limited by the width.
 const phone=photoFrame({left:-16,right:16,top:34.67,bottom:-34.67},aspect);
 close(phone.right-phone.left,32);close((phone.right-phone.left)/(phone.top-phone.bottom),aspect);close(phone.left,-phone.right);
});

test('the shared link is the invite link marked as a farm photo; the picture shows it short',()=>{
 assert.equal(shareLink(LINK),`${LINK}&src=farm-photo`);
 assert.equal(shareLink(null),'https://www.harvesttycoon.com/?src=farm-photo','without a code: the site');
 assert.equal(displayLink(shareLink(LINK)),'harvesttycoon.com/?invite=TONYAA');
 assert.equal(displayLink(shareLink(null)),'harvesttycoon.com');
});

test('the words on the picture: names as they are, the link inside the share text, the invite reward from the rules',()=>{
 // A translator that would turn a farmer called "Wheat" into "Trigo": names only ever go in as a part.
 const tr=codeTranslator({'Wheat':'Trigo','{0}’s farm':'La granja de {0}','Level {0}':'Nivel {0}'},'es');
 const copy=shareCopy({name:'Wheat',level:12,family:{name:'Wheat'},link:shareLink(LINK),invited:true},tr);
 assert.equal(copy.title,'La granja de Wheat');assert.equal(copy.familyText,'Wheat');assert.equal(copy.levelText,'Nivel 12');
 assert.equal(copy.rule,`Start with my link and we both get ${INVITE_REWARD} diamonds at level ${INVITE_LEVEL}.`);
 assert.equal(copy.shareText,`Come and see my farm in Harvest Tycoon! Play free with my link: ${LINK}&src=farm-photo`);
 assert.equal(copy.cta,'Play free at harvesttycoon.com');assert.equal(copy.linkText,'harvesttycoon.com/?invite=TONYAA');assert.equal(copy.fileName,SHARE_FILE);
 const offline=shareCopy({name:'',level:3,family:null,link:shareLink(null),invited:false},plain);
 assert.equal(offline.title,'My farm');assert.equal(offline.rule,'','no reward line without a code');assert.equal(offline.familyText,'');
 const src=read('public/farm-share.js');
 assert.doesNotMatch(src,/tr\((name|family\.name|copy\.title|copy\.familyText)\b/,'a name is never the text that is looked up');
 assert.match(src,/shareText:tr\('Come and see my farm in Harvest Tycoon! Play free with my link: \{0\}',link\)/);
 assert.match(src,/host\.navigator\.share\(\{files:\[file\],title:'Harvest Tycoon',text:copy\.shareText\}\)/,'no url next to the file: several apps drop it');
});

test('a file goes to the share sheet only where the browser says it can take one',()=>{
 const file=new File(['x'],SHARE_FILE,{type:'image/jpeg'});
 assert.equal(shareRoute({navigator:{}},file),'fallback');
 assert.equal(shareRoute({navigator:{share(){}}},file),'fallback','share without canShare: text only');
 assert.equal(shareRoute({navigator:{share(){},canShare:()=>false}},file),'fallback');
 assert.equal(shareRoute({navigator:{share(){},canShare(){throw new Error('no');}}},file),'fallback');
 assert.equal(shareRoute({navigator:{share(){},canShare:({files})=>files.length===1}},file),'files');
});

test('right to left mirrors the picture; the photo fills its frame',()=>{
 const ltr=shareLayout(),rtl=shareLayout({rtl:true});
 assert.deepEqual([ltr.logo.x,rtl.logo.x],[48,SHARE_SIZE.width-48-150]);
 assert.deepEqual([ltr.flag.x,rtl.flag.x],[760,SHARE_SIZE.width-760-256]);
 assert.deepEqual([ltr.title.x,rtl.title.x],[220,SHARE_SIZE.width-220]);
 assert.deepEqual(ltr.photo,{x:PHOTO.x,y:PHOTO.y,width:PHOTO.width,height:PHOTO.height});assert.deepEqual(rtl.photo,ltr.photo,'centred, so the same');
 assert.ok(ltr.rule.y+ltr.rule.size/2<SHARE_SIZE.height,'everything on the picture');
});

// A drawing context that writes down what is drawn, so the picture can be checked without a browser.
function fakeDoc({dir='ltr',coarse=false}={}){
 const drawn=[],loads=[];let made=0;const revoked=[];
 const context=()=>{const ctx={font:'',direction:'',textAlign:'',fillStyle:'',drawn};
  return new Proxy(ctx,{get(target,key){if(key in target)return target[key];if(key==='measureText')return text=>({width:[...text].length*(parseInt(target.font.split(' ')[1])||10)*.55});if(key==='createLinearGradient')return()=>({addColorStop(){}});return(...args)=>{if(key==='fillText')drawn.push({text:args[0],x:args[1],font:target.font,direction:target.direction,align:target.textAlign});if(key==='drawImage')drawn.push({image:args[0]});};},set(target,key,value){target[key]=value;return true;}});};
 const element=tag=>{
  if(tag==='canvas')return {tag,width:0,height:0,getContext:context,toBlob(cb,type,quality){cb(new Blob(['jpeg'],{type}));this.quality=quality;}};
  if(tag==='img'){const img={tag};Object.defineProperty(img,'src',{set(v){img.url=v;setTimeout(()=>img.onload());}});return img;}
  return new Box(tag);
 };
 return {drawn,loads,revoked,documentElement:{dir},fonts:{load:f=>{loads.push(f);return Promise.resolve([]);}},createElement:element,execCommand:()=>false,
  defaultView:{matchMedia:()=>({matches:coarse}),URL:{createObjectURL:()=>`blob:farm/${++made}`,revokeObjectURL:url=>revoked.push(url)}}};
}
// Just enough of an element: what innerHTML holds, and the buttons it names.
class Box{
 constructor(tag='div'){this.tag=tag;this.hidden=false;this.html='';this.found=new Map();this.added=[];}
 set innerHTML(html){this.html=html;this.found=new Map();}
 get innerHTML(){return this.html;}
 querySelector(selector){const name=selector.replace(/^\./,'');if(!new RegExp(`class="[^"]*\\b${name}\\b[^-]`).test(this.html))return null;if(!this.found.has(name))this.found.set(name,new Box());return this.found.get(name);}
 append(el){this.added.push(el);}setAttribute(){}select(){}remove(){}focus(){this.focused=true;}
}

test('the picture: logo, name as written, level, family flag, the farm, the site, the link and the reward; right to left for Arabic',async()=>{
 const doc=fakeDoc(),photo={width:PHOTO.width,height:PHOTO.height},clothes=[];
 const copy=shareCopy({name:'Wheat',level:12,family:{name:'Sunny Acres'},link:shareLink(LINK),invited:true},plain);
 const blob=await composeFarmPicture({photo,copy,family:{familyId:'f',name:'Sunny Acres',emblem:'sun',level:3},doc,drawCloth:async(canvas,family)=>{clothes.push([canvas.width,canvas.height,family.name]);}});
 assert.equal(blob.type,'image/jpeg');assert.deepEqual(clothes,[[256,160,'Sunny Acres']],'the family flag cloth, as by the Family Hall');
 const texts=doc.drawn.filter(d=>d.text).map(d=>d.text);
 assert.deepEqual(texts,['Wheat’s farm','Level 12','Sunny Acres','Play free at harvesttycoon.com','harvesttycoon.com/?invite=TONYAA',copy.rule]);
 assert.equal(doc.drawn.filter(d=>d.image===photo).length,1,'the farm photo');assert.equal(photo.width,0,'and its memory is let go of');
 assert.ok(doc.loads.some(f=>/^700 64px Outfit,'DM Sans',system-ui/.test(f))&&doc.loads.some(f=>/^400 28px 'DM Sans',system-ui/.test(f)),'the fonts are there before drawing, with the device font for other scripts');
 assert.ok(doc.drawn.filter(d=>d.text).every(d=>d.direction==='ltr'));
 const arabic=fakeDoc({dir:'rtl'});
 await composeFarmPicture({photo:{width:1,height:1},copy,doc:arabic,rtl:true});
 const title=arabic.drawn.find(d=>d.text==='Wheat’s farm'),link=arabic.drawn.find(d=>d.text==='harvesttycoon.com/?invite=TONYAA');
 assert.equal(title.direction,'rtl');assert.equal(title.x,SHARE_SIZE.width-220,'the title starts on the right');assert.equal(link.direction,'ltr','a link reads left to right');
 const offline=fakeDoc();
 await composeFarmPicture({photo:{width:1,height:1},copy:shareCopy({name:'Tony',level:2,family:null,link:shareLink(null),invited:false},plain),doc:offline});
 assert.deepEqual(offline.drawn.filter(d=>d.text).map(d=>d.text),['Tony’s farm','Level 2','Play free at harvesttycoon.com'],'without a code: no link pill and no reward line');
});

// app: the page around the game is our Android app (Oct 2026, public/android.js): marked, with an address the app's share sheet is opened from.
function setup({route='files',invite=async()=>({link:LINK,profile:{username:'Tony'}}),capture=()=>({width:PHOTO.width,height:PHOTO.height}),compose,coarse=false,share,clipboard,app=false}={}){
 const events=[],copied=[],composed=[],shares=[];
 const doc=fakeDoc({coarse});
 const host={File,navigator:{share:share??(async data=>{shares.push(data);}),canShare:()=>route==='files',clipboard:{writeText:clipboard??(async text=>{copied.push(text);})}},
  ...(app?{document:{documentElement:{getAttribute:name=>name==='data-app'?'android':null}},location:{href:'https://www.harvesttycoon.com/?src=android-app'}}:{})};
 const farm=createFarm(now);farm.family={familyId:'f1',name:'Wheat',emblem:'sun',level:2};
 const ui=createFarmShare({capture,state:farm,invite,host,doc,track:(event,params)=>events.push([event,params]),playerName:()=>'Wheat',
  compose:compose??(async({copy})=>{composed.push(copy);return new Blob(['jpeg'],{type:'image/jpeg'});})});
 return {ui,events,copied,composed,shares,doc,host};
}

test('tap 1 makes the picture inside the card; tap 2 hands the file to the share sheet straight from the tap',async()=>{
 const h=setup(),box=new Box(),button=new Box();
 await h.ui.open({source:'level_up',box,button});
 assert.equal(button.hidden,true,'the box takes over from the button');assert.equal(box.hidden,false);
 assert.match(box.html,/<img class="farm-share-preview" src="blob:farm\/1" alt="Your farm picture"/);
 assert.match(box.html,/class="secondary-button farm-share-send">Share</);assert.match(box.html,/download="harvest-tycoon-farm\.jpg">Save picture</);assert.match(box.html,/farm-share-copy">Copy link</);
 assert.doesNotMatch(box.html,/primary-button/,'one green button per window: the card keeps Keep growing');
 assert.deepEqual(h.events,[['farm_share_open',{source:'level_up'}]]);
 assert.equal(h.composed[0].title,'Wheat’s farm');assert.equal(h.composed[0].familyText,'Wheat');
 const sending=box.querySelector('.farm-share-send').onclick();
 assert.equal(h.shares.length,1,'share is called in the tap itself, before anything is awaited');
 assert.equal(h.shares[0].files[0].name,SHARE_FILE);assert.equal(h.shares[0].files[0].type,'image/jpeg');assert.equal(h.shares[0].url,undefined);
 assert.match(h.shares[0].text,/\?invite=TONYAA&src=farm-photo$/);
 await sending;assert.deepEqual(h.events.at(-1),['farm_share_sent',{source:'level_up'}]);
 box.querySelector('.farm-share-save').onclick();assert.deepEqual(h.events.at(-1),['farm_share_saved',{source:'level_up'}]);
 h.ui.reset(box);assert.deepEqual(h.doc.revoked,['blob:farm/1'],'closing the card lets the picture go');assert.equal(button.hidden,false);assert.equal(box.hidden,true);
});

test('a closed share sheet does nothing; a refused one copies the link instead',async()=>{
 const cancelled=setup({share:async()=>{throw Object.assign(new Error('closed'),{name:'AbortError'});}}),box=new Box();
 await cancelled.ui.open({source:'profile',box});await box.querySelector('.farm-share-send').onclick();
 assert.deepEqual(cancelled.copied,[]);assert.deepEqual(cancelled.events.map(e=>e[0]),['farm_share_open']);
 const refused=setup({share:()=>{throw Object.assign(new Error('not now'),{name:'NotAllowedError'});}}),other=new Box();
 await refused.ui.open({source:'profile',box:other});await other.querySelector('.farm-share-send').onclick();
 assert.deepEqual(refused.copied,[`${LINK}&src=farm-photo`]);assert.deepEqual(refused.events.at(-1),['farm_share_copied',{source:'profile'}]);
 assert.equal(other.querySelector('.farm-share-status').textContent,'Link copied. Send it to a friend!');
 // Nothing can copy (no clipboard, no execCommand): the link shows, to copy by hand.
 const stuck=setup({route:'fallback',clipboard:async()=>{throw new Error('denied');}}),third=new Box();
 await stuck.ui.open({source:'profile',box:third});await third.querySelector('.farm-share-copy').onclick();
 assert.equal(third.querySelector('.farm-share-status').textContent,`${LINK}&src=farm-photo`);assert.ok(!stuck.events.some(e=>e[0]==='farm_share_copied'));
});

test('where a file cannot be shared: Save picture and Copy link, and on a phone press and hold; offline: no Copy link',async()=>{
 const phone=setup({route:'fallback',coarse:true}),box=new Box();
 await phone.ui.open({source:'level_up',box});
 assert.doesNotMatch(box.html,/farm-share-send/);assert.match(box.html,/Save picture/);assert.match(box.html,/Copy link/);assert.match(box.html,/Press and hold the picture to save it\./);
 await box.querySelector('.farm-share-copy').onclick();assert.deepEqual(phone.copied,[`${LINK}&src=farm-photo`]);
 const desk=setup({route:'fallback'}),other=new Box();await desk.ui.open({source:'level_up',box:other});assert.doesNotMatch(other.html,/Press and hold/);
 const offline=setup({invite:async()=>{throw new Error('offline');}}),third=new Box();
 await offline.ui.open({source:'level_up',box:third});
 assert.doesNotMatch(third.html,/Copy link/);assert.equal(offline.composed[0].rule,'');assert.match(offline.composed[0].shareText,/https:\/\/www\.harvesttycoon\.com\/\?src=farm-photo$/);
});

test('in our Android app: Share opens the app\'s own share sheet with the text and the link (no picture there); Save picture and Copy link stay',async()=>{
 const h=setup({app:true,coarse:true}),box=new Box();
 await h.ui.open({source:'level_up',box});
 assert.equal(shareRoute(h.host,new File(['x'],SHARE_FILE)),'app');
 assert.match(box.html,/class="secondary-button farm-share-send">Share</);assert.match(box.html,/Save picture/);assert.match(box.html,/farm-share-copy">Copy link</);
 assert.doesNotMatch(box.html,/Press and hold/,'a WebView offers no saving by holding');
 await box.querySelector('.farm-share-send').onclick();
 assert.deepEqual(h.shares,[],'the WebView has no navigator.share');
 assert.equal(h.host.location.href,`shareapp://shareapp?${encodeURIComponent('Come and see my farm in Harvest Tycoon! Play free with my link:')}&url=${encodeURIComponent(`${LINK}&src=farm-photo`)}`,'the link once');
 assert.deepEqual(h.events.at(-1),['farm_share_sent',{source:'level_up'}]);
 // Everywhere else exactly as before: the file to the share sheet.
 const web=setup(),other=new Box();await web.ui.open({source:'level_up',box:other});await other.querySelector('.farm-share-send').onclick();assert.equal(web.shares[0].files.length,1);assert.equal(web.host.location,undefined);
});

test('no 3D farm (lost, or the village): Try again; a closed card stops a picture still being made',async()=>{
 let shot=null;const h=setup({capture:()=>shot}),box=new Box(),button=new Box();
 await h.ui.open({source:'level_up',box,button});
 assert.match(box.html,/Your farm picture could not be made\. Try again\./);assert.match(box.html,/farm-share-retry">Try again</);assert.deepEqual(h.events,[]);
 shot={width:PHOTO.width,height:PHOTO.height};await box.querySelector('.farm-share-retry').onclick();
 assert.match(box.html,/farm-share-preview/);assert.equal(button.hidden,true);
 assert.equal(createFarmShare({capture:()=>null,canCapture:()=>false}).available(),false);
 let finish;const slow=setup({compose:()=>new Promise(resolve=>{finish=()=>resolve(new Blob(['x'],{type:'image/jpeg'}));})}),late=new Box();
 const making=slow.ui.open({source:'profile',box:late});assert.match(late.html,/Making your picture…/);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(typeof finish,'function','the invite link is in, the picture is being drawn');
 slow.ui.reset(late);finish();await making;
 assert.equal(late.html,'');assert.equal(late.hidden,true);assert.deepEqual(slow.events,[],'nothing shown after the card closed');
});

test('the level-up card, your own profile and the game are wired as agreed',()=>{
 const ui=read('public/progression-ui.js');
 const shareRow=ui.match(/\$\{sharing\?'([^']*)'/)[1];
 assert.match(shareRow,/<button type="button" class="secondary-button level-up-share">Share my farm<\/button><button class="primary-button level-up-done">Keep growing<\/button>/);
 assert.equal(shareRow.match(/primary-button/g).length,1,'one green button: Keep growing');
 assert.match(ui,/sharing=Boolean\(\(p\.leveled\|\|p\.catchUp\)&&share\?\.available\(\)\)/,'on every level-up and catch-up card, while the farm is there');
 assert.match(ui,/dialog\.addEventListener\('close',\(\)=>share\?\.reset\(dialog\.querySelector\('\.farm-share-box'\)\)\);/,'closing the card lets the picture go');
 const player={username:'Tony',level:12,badges:[],stats:{}};
 assert.ok(renderPlayerProfile(player,now,{self:true}).includes('<div class="farmer-share" data-farmer-share hidden></div>'));
 assert.ok(!renderPlayerProfile(player,now).includes('data-farmer-share'),'only on your own profile');
 const profiles=read('src/player-profiles.js');
 assert.match(profiles,/if\(id!==bridge\.playerId\|\|!share\?\.available\?\.\(\)\)return;/);assert.match(profiles,/open\(\{source:'profile',box,button\}\)/);
 const game=read('public/game.js'),shoot=game.match(/\nfunction shootFarmPhoto\(width,height\)\{\n([\s\S]*?)\n\}\n/)[1];
 assert.match(shoot,/if\(!ready\|\|!renderer\|\|!camera\|\|villageWorld\|\|renderer\.getContext\(\)\.isContextLost\(\)\)return null;/);
 assert.match(shoot,/try\{renderer\.setDrawingBufferSize\(width,height,scale\);renderer\.render\(scene,photo\);ctx\.drawImage\(renderer\.domElement,0,0,width,height\);\}/);
 assert.match(shoot,/finally\{renderer\.setDrawingBufferSize\(viewportWidth,viewportHeight,viewportRatio\);renderer\.render\(scene,camera\);highlight\(was\);\}/);
 assert.doesNotMatch(shoot,/await|setTimeout|requestAnimationFrame/,'render and copy in one go: the buffer is gone after a frame');
 assert.doesNotMatch(game,/preserveDrawingBuffer/,'never kept for every frame');
 assert.match(game,/const farmShare=villageWorld\?null:createFarmShare\(\{capture:shootFarmPhoto,/);assert.match(game,/window\.harvestShareFarm=farmShare;/);
 assert.match(game,/createProgressionUI\(\{state,isReady:\(\)=>ready&&\$\('loading'\)\.hidden,share:farmShare\}\)/);
 const share=read('public/farm-share.js');assert.match(share,/new \(host\?\.File\?\?globalThis\.File\)\(\[blob\]/);assert.match(share,/host\.navigator\.clipboard\.writeText\(link\)/);
});

test('one invite answer for the visit, the invite share text in the farmer\'s language',()=>{
 const ui=read('public/invite-ui.js');
 assert.match(ui,/window\.harvestInvite=\{open,info\};/);assert.match(ui,/try\{data=await info\(\{fresh:true\}\);\}/,'the window still asks afresh');
 assert.match(ui,/ask\.catch\(\(\)=>\{if\(asked===ask\)asked=null;\}\)/,'a failed ask is forgotten');
 assert.match(ui,/const text=t\('Come farm with me in Harvest Tycoon! Reach level \{0\} and we both get \{1\} diamonds\.',data\.rules\.level,data\.rules\.reward\);/);
});

test('analytics: only the four share events with where they came from, never a name or link; consent stays with the page',()=>{
 const win={innerWidth:400};
 trackShare('farm_share_open',{source:'level_up',name:'Tony',link:LINK},win);trackShare('farm_share_sent',{source:'profile'},win);
 trackShare('farm_share_copied',{source:'somewhere'},win);trackShare('farm_share_hacked',{source:'profile'},win);
 assert.deepEqual(win.dataLayer,[{event:'farm_share_open',device:'mobile',source:'level_up'},{event:'farm_share_sent',device:'mobile',source:'profile'},{event:'farm_share_copied',device:'mobile'}]);
 assert.match(read('src/main.js'),/bridge\.trackShare=\(event,params\)=>\{if\(ticket===generation\)trackShare\(event,params\);\};/);
});

test('the privacy policy, the wiki and a loading tip say what Share my farm does',()=>{
 assert.match(read('public/privacy.html'),/<strong>Share my farm\.<\/strong> The picture is made on your device from your farm view\. It shows your player name, level, family name and flag, and your invite link\. It is not sent to us; you choose where to share it\./);
 assert.match(read('public/wiki-content.js'),/<p>Or tap Share my farm on the level-up card or your own profile: a picture of your farm with your invite link\.<\/p>/);
 assert.match(read('public/loading-screen.js'),/\['invite-friends','Share my farm: send a picture of your farm with your invite link when you level up\.'\]/);
});
