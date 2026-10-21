// How heavy the farm's 3D view may be (21 Oct 2026, public/graphics-mode.js): a Pixel 10 Pro Fold lost its 3D view and in the end the app
// closed at every start; the owner picked four steps. 1 the graphics chip and the mode go with every note (load_stalls gpu, gfx; new kinds
// 'lost' and 'crash'), 2 no shadows on a PowerVR or Imagination GPU, 3 simple graphics after any trouble with a switch in Settings,
// 4 a touch screen never gets the computer's heavy settings and stays under 2.2 megapixels.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gpuName,shadowTrouble,graphicsChoice,chooseGraphics,graphicsTrouble,markRun,endRun,lastRunCrashed,rendererOptions,shadowSize,graphicsMode,pixelRatioFor,CRASHES_FOR_SIMPLE,OLD_GRAPHICS_KEY,
 GRAPHICS_KEY,RUN_KEY,HEALTHY_MS,RUN_MAX_AGE,GFX_MODES} from '../public/graphics-mode.js';
import {noteOnDevice,LOAD_FAILED_KEY} from '../public/loading-screen.js';
import {stallRow,STALL_KINDS,STALL_GFX} from '../supabase/functions/farm-api/load-stall-service.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const store=(entries={})=>{const m=new Map(Object.entries(entries));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),map:m};};

test('the graphics chip: the unmasked name when the browser gives it, else RENDERER, one line of at most 100 characters',()=>{
 const gl=(unmasked,plain)=>({RENDERER:7937,getExtension:name=>name==='WEBGL_debug_renderer_info'&&unmasked!==undefined?{UNMASKED_RENDERER_WEBGL:37446}:null,getParameter:p=>p===37446?unmasked:p===7937?plain:null});
 assert.equal(gpuName(gl('PowerVR D-Series DXT-48-1536','WebKit WebGL')),'PowerVR D-Series DXT-48-1536');
 assert.equal(gpuName(gl(undefined,'ANGLE (ARM, Mali-G715, OpenGL ES 3.2)')),'ANGLE (ARM, Mali-G715, OpenGL ES 3.2)');
 assert.equal(gpuName(gl('  Adreno\n(TM)   740 ')),'Adreno (TM) 740');
 assert.equal(gpuName(gl('x'.repeat(300))).length,100);
 assert.equal(gpuName(gl(undefined,undefined)),null);assert.equal(gpuName(null),null);
 assert.equal(gpuName({getExtension(){throw new Error('lost');}}),null,'never throws');
 for(const name of ['PowerVR D-Series DXT-48-1536','Imagination Technologies','ANGLE (Imagination Technologies, PowerVR B-Series BXM-8-256)'])assert.ok(shadowTrouble(name),name);
 for(const name of ['Mali-G715','Adreno (TM) 740','Apple GPU',null,''])assert.ok(!shadowTrouble(name),String(name));
});

test('the mode: simple when chosen or after trouble, no shadows on PowerVR, else full; a link wins over the device',()=>{
 assert.equal(graphicsMode({simple:false,gpu:'Mali-G715'}),'full');
 assert.equal(graphicsMode({simple:false,gpu:'PowerVR D-Series DXT-48-1536'}),'noshadow');
 assert.equal(graphicsMode({simple:true,gpu:'PowerVR D-Series DXT-48-1536'}),'simple');
 assert.deepEqual([...GFX_MODES],['full','noshadow','simple']);
 const s=store();assert.deepEqual(graphicsChoice({storage:s}),{simple:false,from:null});
 graphicsTrouble(s);assert.equal(s.getItem(GRAPHICS_KEY),'simple');assert.equal(graphicsChoice({storage:s}).simple,true);
 chooseGraphics(s,false);assert.equal(s.getItem(GRAPHICS_KEY),'full');assert.equal(graphicsChoice({storage:s}).simple,false);
 graphicsTrouble(s);assert.equal(graphicsChoice({storage:s}).simple,true,'trouble switches it on again after the player switched it off');
 assert.deepEqual(graphicsChoice({storage:s,search:'?gfx=full'}),{simple:false,from:'link'});
 assert.deepEqual(graphicsChoice({storage:store(),search:'?src=android-app&gfx=simple'}),{simple:true,from:'link'});
 const refusing={getItem(){throw new Error('denied');},setItem(){throw new Error('denied');},removeItem(){throw new Error('denied');}};
 assert.equal(graphicsChoice({storage:refusing}).simple,false,'storage that refuses: the full graphics');graphicsTrouble(refusing);chooseGraphics(refusing,true);
});

test('a start that ended under the player is found once at the next start; one that went away, rested or is old is not',()=>{
 const s=store(),t0=Date.UTC(2026,9,21,12);
 markRun(s,{stage:'farm',step:'code',percent:12,gfx:'full'},t0);markRun(s,{gpu:'PowerVR D-Series DXT-48-1536',step:'models'},t0+5000);markRun(s,{percent:94},t0+9000);
 const run=lastRunCrashed(s,t0+60000);assert.equal(run.at,t0,'the start keeps its own time');assert.equal(run.percent,94);assert.equal(run.gpu,'PowerVR D-Series DXT-48-1536');assert.equal(run.step,'models');
 markRun(s,{away:true},t0+10000);assert.equal(lastRunCrashed(s,t0+60000),null,'out of sight: the phone may end an app in the background');
 markRun(s,{away:false},t0+11000);assert.ok(lastRunCrashed(s,t0+60000),'back in sight');
 assert.equal(lastRunCrashed(s,t0+RUN_MAX_AGE+1),null,'older than a day: not the last start');
 endRun(s);assert.equal(lastRunCrashed(s,t0+60000),null,'a minute of play or the page going takes the mark away');
 const twice=store();markRun(twice,{stage:'farm',step:'code',crashes:1},t0);markRun(twice,{percent:50},t0+3000);assert.equal(lastRunCrashed(twice,t0+60000).crashes,1,'the count of starts that ended early stays on the mark');
 assert.equal(lastRunCrashed(store({[RUN_KEY]:'{oops'}),t0),null);assert.equal(lastRunCrashed(store({[RUN_KEY]:'[1]'}),t0),null);
 assert.equal(HEALTHY_MS,60000);
});

test('a touch screen never gets the computer\'s heavy settings, and its picture stays under 2.2 megapixels',()=>{
 assert.deepEqual(rendererOptions({handheld:false,simple:false}),{antialias:true,alpha:false,powerPreference:'high-performance'});
 assert.deepEqual(rendererOptions({handheld:true,simple:false}),{antialias:false,alpha:false,powerPreference:'low-power'});
 assert.deepEqual(rendererOptions({handheld:false,simple:true}),{antialias:false,alpha:false,powerPreference:'low-power'});
 assert.equal(shadowSize({handheld:false,simple:false}),2048);assert.equal(shadowSize({handheld:true,simple:false}),1024);assert.equal(shadowSize({handheld:false,simple:true}),1024);
 assert.equal(pixelRatioFor({devicePixelRatio:2,width:1920,height:1080}),1.75,'a computer as before');
 assert.equal(pixelRatioFor({devicePixelRatio:3,width:412,height:915,handheld:true}),1.5,'a phone as before');
 // An unfolded foldable wider than 900 css px: no longer 1.75, and the whole picture at most 2.2 megapixels.
 const fold=pixelRatioFor({devicePixelRatio:2.6,width:1040,height:1100,handheld:true});assert.ok(fold<1.5&&fold*fold*1040*1100<=2.2e6+5e3,String(fold));
 assert.equal(pixelRatioFor({devicePixelRatio:3,width:412,height:915,simple:true}),1.25,'simple graphics');
 assert.equal(pixelRatioFor({devicePixelRatio:1,width:4000,height:3000,handheld:true}),1,'never under 1 on a 1x screen');
 assert.equal(pixelRatioFor({devicePixelRatio:.75,width:400,height:300}),.75,'never above the screen\'s own');
});

test('public/game.js: the mode before anything is drawn, shadows only in full, the trouble that switches simple on, Settings › Graphics',()=>{
 const game=read('public/game.js'),init=game.slice(game.indexOf('async function init(){'),game.indexOf('export const farmReady=init();'));
 assert.match(game,/const gpuHandheld=handheld\|\|mobileLayout\.matches\|\|matchMedia\('\(pointer: coarse\)'\)\.matches;/,'touch screens, even wide ones');
 // The last start's crash is read before this start marks its own, and before anything else of the start.
 const crash=init.indexOf('const crashed=lastRunCrashed(gfxStore),'),mark=init.indexOf("markRun(gfxStore,{stage:'farm'"),ui=init.indexOf('bindUI();updateUI();');
 assert.ok(crash>0&&crash<mark&&mark<ui,'crash check, then the mark, then the UI');
 // One start that ended early is only a note; the second in a row switches simple on (owner, 21 Oct 2026: off unless real trouble).
 assert.match(init,/const crashed=lastRunCrashed\(gfxStore\),crashes=crashed\?\(Number\(crashed\.crashes\)\|\|0\)\+1:0;\n  if\(crashed\)\{if\(crashes>=CRASHES_FOR_SIMPLE\)graphicsTrouble\(gfxStore\);noteOnDevice\(\{kind:'crash',/);
 assert.equal(CRASHES_FOR_SIMPLE,2);assert.match(init,/,crashes,away:document\.hidden\}\);/,'the count rides on the new mark');
 assert.ok(init.indexOf('gfxStore?.removeItem(OLD_GRAPHICS_KEY)')>=0&&init.indexOf('gfxStore?.removeItem(OLD_GRAPHICS_KEY)')<init.indexOf('graphicsChoice({storage:gfxStore'),'the first afternoon\'s choice is gone before it could be read');
 assert.notEqual(GRAPHICS_KEY,OLD_GRAPHICS_KEY);
 assert.match(init,/const gpu=gpuName\(renderer\.getContext\(\)\);gfxMode=graphicsMode\(\{simple:graphicsSimple,gpu\}\);/);
 assert.match(init,/renderer\.shadowMap\.enabled=gfxMode==='full';/);assert.match(init,/sun\.castShadow=gfxMode==='full';/);
 assert.ok(init.indexOf("renderer.shadowMap.enabled=gfxMode==='full';")<init.indexOf('renderer.render('),'set before the first picture');
 assert.match(init,/window\.harvestStartup\.gpu=gpu;window\.harvestStartup\.gfx=gfxMode;/,'with every note about this start');
 // The start is good after a minute of play from the first picture (review, 21 Oct 2026: not before it is drawn).
 const drawn=init.indexOf("loadingUI.complete();\n  // The farm is on screen"),healthy=init.indexOf('setTimeout(()=>{runHealthy=true;endRun(gfxStore);},HEALTHY_MS);');
 assert.ok(drawn>0&&healthy>drawn,'a minute of play from the first picture makes it a good start');
 assert.match(init,/markRun\(gfxStore,\{stage:'farm',step:'code',percent:[^}]*,away:document\.hidden\}\);/,'a start that begins out of sight is not a crash');
 assert.match(game,/addEventListener\('pagehide',\(\)=>endRun\(gfxStore\)\);/);
 // A lost view: simple from the next start only when it was lost in sight and did not come back, or was lost twice; always a note.
 assert.match(game,/const playing=ready,away=document\.hidden\|\|Date\.now\(\)-lastShown<CONTEXT_RESTORE_MS;/);
 assert.match(game,/if\(!away\|\|losses>1\)graphicsTrouble\(gfxStore\);\n  noteOnDevice\(\{kind:'lost',[^\n]*hidden:away,/);
 assert.match(game,/restoreTimer=setTimeout\(\(\)=>\{if\(!document\.hidden\)graphicsTrouble\(gfxStore\);/,'a view that does not come back in sight');
 assert.match(game,/if\(losses===1&&Date\.now\(\)-lostAt<=CONTEXT_RESTORE_MS\)\{if\(before==='simple'\|\|before==='full'\)chooseGraphics\(gfxStore,before==='simple'\);else try\{gfxStore\?\.removeItem\(GRAPHICS_KEY\);\}catch\{\}\}/,'back at once: as it was');
 assert.match(game,/const ratio=pixelRatioFor\(\{devicePixelRatio,width,height,handheld:gpuHandheld,simple:graphicsSimple\}\);/);
 assert.match(game,/async function addPets\(\)\{\n try\{\n  if\(graphicsSimple\)return;/);
 assert.doesNotMatch(game,/mobileLayout\.matches\?1\.5:1\.75|antialias:!mobileLayout\.matches/,'no GPU setting by width alone');
 assert.match(game,/function bindUI\(\)\{\n bindGraphicsSetting\(\);/);
 const html=read('public/farm.html');
 assert.match(html,/<section id="graphics-settings" class="settings-section"[^>]*><h3 class="settings-heading" id="graphics-settings-title"><i data-game-art="graphics"><\/i>Graphics<\/h3>.*<input id="graphics-simple" type="checkbox" role="switch">.*<p id="graphics-status"/s,'a painted picture, as every other part has');
 assert.match(html,/It switches on by itself after the 3D view of your farm stopped\./,'the rule on the screen that shows it');
 assert.ok(html.indexOf('id="sound-settings"')<html.indexOf('id="graphics-settings"')&&html.indexOf('id="graphics-settings"')<html.indexOf('id="chat-settings"'));
});

test('a note the farm writes itself: kind lost or crash, with the chip and the mode, kept on the device for the next load',()=>{
 const device=store(),win={navigator:{onLine:true},performance:{getEntriesByType:()=>[]},harvestStartup:{stage:'ready',error:null,gpu:'PowerVR D-Series DXT-48-1536',gfx:'noshadow'}};
 const note=noteOnDevice({kind:'lost',step:'scene',percent:100,error:'[lost] The 3D view was lost during play.',win,device,now:1000});
 assert.equal(note.kind,'lost');assert.equal(note.gpu,'PowerVR D-Series DXT-48-1536');assert.equal(note.gfx,'noshadow');assert.equal(note.stage,'ready');assert.equal(note.at,1000);
 assert.deepEqual(JSON.parse(device.getItem(LOAD_FAILED_KEY)),note);
 assert.equal(noteOnDevice({kind:'crash',step:'models',win,device}),null,'a note still waiting stays');
 const other=store(),crash=noteOnDevice({kind:'crash',step:'models',percent:94,stage:'farm',gpu:'Mali-G715',gfx:'full',error:'[crash] x',win,device:other,now:2000});
 assert.equal(crash.gpu,'Mali-G715','the last start\'s chip, not this one\'s');assert.equal(crash.gfx,'full');assert.equal(crash.stage,'farm');assert.equal(crash.percent,94);
 assert.equal(noteOnDevice({kind:'lost',step:'scene',win,device:null}),null,'no storage: nothing');
 assert.equal(noteOnDevice({kind:'lost',step:'scene',hidden:true,win,device:store()}).hidden,true,'lost out of sight says so');
 // A start's own card does not take the place of a note waiting on the device (the last start's crash, with its chip).
 assert.match(read('public/loading-screen.js'),/if\(written\)try\{if\(!device\?\.getItem\(LOAD_FAILED_KEY\)\)device\?\.setItem\(LOAD_FAILED_KEY,JSON\.stringify\(written\)\);\}catch\{\}/);
 // farm-api keeps both kinds, the chip (one line, no e-mail address, 100 characters) and the mode.
 assert.ok(STALL_KINDS.includes('lost')&&STALL_KINDS.includes('crash'));assert.deepEqual([...STALL_GFX],[...GFX_MODES]);
 const now=Date.UTC(2026,9,21,12),row=stallRow({...crash,at:now-1000,gpu:'PowerVR for jan@example.com\n'+'x'.repeat(200)},{now});
 assert.equal(row.kind,'crash');assert.equal(row.gfx,'full');assert.ok(row.gpu.startsWith('PowerVR for [email] x'));assert.ok(Array.from(row.gpu).length<=100);
 assert.equal(stallRow({...crash,at:now-1000,gfx:'ultra'},{now}).gfx,null);
});

test('supabase/load-stalls-gpu.sql: the two columns and the kinds, run before farm-api',()=>{
 const sql=read('supabase/load-stalls-gpu.sql');
 assert.match(sql,/add column if not exists gpu text check \(char_length\(gpu\) <= 100\);/);
 assert.match(sql,/add column if not exists gfx text check \(gfx in \('full','noshadow','simple'\)\);/);
 assert.match(sql,/drop constraint if exists load_stalls_kind_check;\nalter table public\.load_stalls add constraint load_stalls_kind_check check \(kind in \('auto','card','reload_hung','left','refresh','part','lost','crash'\)\);/);
 assert.match(sql,/Release: this file first, then farm-api/);
});
