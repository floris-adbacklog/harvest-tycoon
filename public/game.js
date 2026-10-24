import './dialog-shell.js';
import './pill-menu.js';
import './event-rail.js';
import {createLiveEventsUI} from './live-events-ui.js';
import {createToast} from './toast-ui.js';
import {haptic} from './haptics.js';
import {showWelcomeBack} from './welcome-ui.js';
import {createEmailCheck} from './email-check-ui.js';
import {createFeedback} from './feedback-ui.js';
import {createFamilyUI} from './family-ui.js';
import {createPassUI} from './pass-ui.js';
import {createSeasonUI} from './season-ui.js';
import {createLookSettings} from './look-settings.js';
import {renderWiki} from './wiki-ui.js';
import {createProgressionUI,progressionSnapshot,progressionChange,nextUnlock} from './progression-ui.js';
import {buildingEligible,buildingCost,featureUnlocked,featureUnlockHint,ENDGAME_PLACES,endgameInSight,worldTwoOpen,villageGood,villageBrief,villageSquareReady,recipeUnlocked,VILLAGE_LANDMARKS,villageLandmark,landmarkDone,WORLD_TWO_LEVEL,WORLD_TWO_TEASER,passPhase,marketQuote,marketPay} from './farm-state.js';
import {createLoadingScreen,startLoadingTips,VILLAGE_LOADING_TIPS,LOADING_TIPS,PASS_LOADING_TIP,startFailure,noteOnDevice} from './loading-screen.js';
import {createFarmRenderer,startErrorText,androidPhoneApp} from './farm-start.js';
import {gpuName,graphicsChoice,chooseGraphics,graphicsTrouble,markRun,endRun,lastRunCrashed,rendererOptions,shadowSize,graphicsMode,pixelRatioFor,HEALTHY_MS,RUN_KEY,GRAPHICS_KEY,OLD_GRAPHICS_KEY,CRASHES_FOR_SIMPLE} from './graphics-mode.js';
import {clearCropVisual,loadInBatches} from './render-resources.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CROPS, ITEMS, BUILDINGS, RECIPES, MAX_PLOTS, progress, farmSummary, seedCost, levelProgress, levelTitle, formatDuration, harvestQuantity, harvestYield, productionJobs, unlockEntries, fieldTapAction, canWater, waterUntil, normalizeFarm } from './farm-state.js';
import { createReminderNudge,harvestAction } from './reminder-nudge.js';
import { zone, place, wide, currentZone, currentYard, SPREAD, ANCHORS, anchorAt, placeIn, ROADS, roadSize, roadRects, fenceSegments, pondBounds, asBeforeLayout } from './farm-layout.js';
import { createMinimap } from './minimap.js';
import { scatterProps, seeded } from './farm-props.js';
import { createEconomyUI,marketWorth } from './economy-ui.js?v=familyhall-model-2';
import { createFarmClient, farmNow } from './farm-client.js';
import { createRetentionUI } from './retention-ui.js';
import { createGrowthUI } from './growth-ui.js';
import { createValleyUI } from './valley-ui.js';
import { createVillageSquareUI } from './village-square-ui.js';
import { createBoatUI } from './boat-ui.js';
import { createEstateUI } from './estate-ui.js';
import { createBoostsUI } from './boosts-ui.js';
import { createRookieUI } from './rookie-ui.js';
import { art,refreshArt } from './visual-icons.js';
import { createFamilyFlag,drawFamilyCloth } from './family-flag.js';
import { bindFarmInput,cameraDragDelta } from './farm-input.js';
import { createQuestsUI,villageQuestReady,questGroups,villageQuestGroups,readyDailies } from './quests-ui.js';
import { createBeginnerUI, calmStep } from './beginner-ui.js';
import { LAYOUT_YARDS, LAYOUT_GRID, LAND, DECOR, landAt, landOpen, inWater, obstacleKind, OLD_ROADS, PATH_GRID, roadPieces } from './farm-map.js';
import { createLayoutEditor } from './layout-edit.js';
import { createSpotlight } from './spotlight.js';
import { createMobileUI,mobileLayout } from './mobile-ui.js';
import { createFarmLife,LIFE_MODELS } from './farm-life.js';
import { createScenePolish, hideClippedScenery } from './scene-polish.js';
import { shareAtlas,sharePalette,download,repaint } from './model-atlas.js';
import { createAtmosphere } from './farm-atmosphere.js';
import { buildRows, createCropMotion, isRowCrop } from './crop-rows.js';
import { flyHarvest, bump } from './harvest-fly.js';
import { toolCursor,createSweepTool,createSweepGhost } from './sweep-tools.js';
import { createSweepTip } from './sweep-tip.js';
import { createActivitiesUI } from './activities-ui.js';
import { createWarehouseUI,isWarehouseFull,warehouseTone,fillText } from './warehouse-ui.js';
import { ACTIVE_STATIONS,CHORES,choreStatus,cropUnlocked,stallStatus,stallNotice,beginnerProgress,medalsWaiting } from './farm-state.js';
import { newMedals,withMedals,createMedalNotice } from './medal-notice.js';
import { createFarmAudio,withActionSounds,createProductionCueTracker,soundForAction } from './farm-audio.js';
import { createSoundSettings } from './sound-settings.js';
import { renderLanguageSettings } from './language-settings.js';
import { startTranslation, setOwnText, ownWords, translateText } from './i18n.js';
import { watchSelects } from './pretty-select.js';
import { createInviteUI } from './invite-ui.js';
import { createFarmShare,photoFrame } from './farm-share.js';
import { fitText } from './fit-text.js';
import { createCoach } from './coach.js';
import { guideSteps } from './guide-steps.js';
import { guardWheel } from './wheel-guard.js';
import { nextGoal, readyAllAt } from './next-goal.js';
import { createWaitTip } from './wait-tip.js';
import { createFertilizerTip } from './fertilizer-tip.js';
import { computerWindow,timerKey,timerGroups,createFullScreenOffer } from './small-window.js';
import { portal,portalOff } from './portal.js';
// The Fishing pond (11 Oct 2026, part C): its screen and 3D pieces load on the farm only once the switch is on (pond-ui.js).
import { POND_OPEN } from './farm-state.js';
import { seasonLook, seasonCrop } from './farm-state.js';
import { POND_LOADING_TIP } from './loading-screen.js';
// The village lake (12 Oct 2026, plan D): the same screen at the rowboat in the village, once its own switch is on.
import { LAKE_OPEN } from './farm-state.js';
import { petRest,petRestText } from './farm-state.js';
import { warehouseFull,storedCount,warehouseCapacity } from './farm-state.js';
import { giftPass,giftMessageText } from './farm-state.js';
// Your own farmer (21 Oct 2026): what they wear (state.farmer, or the default farmer) and the hats and costumes this farm has earned.
import { farmerOf,farmerOwned,validFarmerConfig,cleanFarmer,FAMILY_SHIRT } from './farmer-parts.js';
import { LAKE_LOADING_TIP } from './loading-screen.js';
// The apps' Back button and the farm's rest under a window on phones, tablets and the apps (13 Oct 2026, public/windows.js).
import { createBack,modalOpen,handheldDevice,farmRests } from './windows.js';

// Another language than English: translate the farm's texts as they appear (public/i18n.js).
startTranslation();
const $ = id => document.getElementById(id);
const state = structuredClone(window.harvestInitialFarm.state);
// A server that has not learnt about a new building yet must not break the buildings list (farm-client.js does the same on every reload).
state.buildings??={};for(const key of Object.keys(BUILDINGS))state.buildings[key]??={level:1,job:null};
// World II (30 Sep 2026): with ?world=village the game shows the village instead of the farm, for a farm at level 100 or higher
// (src/main.js travels there and back through the loading screen). The farm-only parts (fields, the farm's buildings and scenery,
// the minimap, the welcome back) are skipped; the village's places are building labels like the farm's (public/village-scene.js).
const villageWorld=new URLSearchParams(location.search).get('world')==='village'&&worldTwoOpen(state);
if(villageWorld)document.documentElement.dataset.world='village';else document.documentElement.removeAttribute('data-trip');   // app-mode.js marks the trip
// In the village the camera buttons speak of the village: centre it, or show all of it.
if(villageWorld)for(const [id,label] of [['zoom-reset','Center the village'],['zoom-fit','Show the whole village']]){$(id).setAttribute('aria-label',label);$(id).title=label;}
// The sound goes along (13 Oct 2026, farm-audio.js travel): the next page takes over this page's running context. A trip whose load
// fails stays here, and is no trip for the sound either. Without a page around it the trip takes this page's place in the history
// too (13 Oct 2026, Android app 1.3, src/main.js travel).
const travel=to=>{if(window.parent?.harvestBridge?.travel){farmAudio.travel();void Promise.resolve(window.parent.harvestBridge.travel(to)).catch(error=>{farmAudio.travel(false);throw error;});}else location.replace(location.pathname+(to==='village'?'?world=village':''));};
window.harvestTravel=travel;
// The apps' Back button (13 Oct 2026, Android app 1.3): closes the top-most window as Escape does, true when one was open (public/windows.js).
window.harvestBack=createBack();
const initialChapterReward=window.harvestInitialFarm.chapterReward;
const initialLevelReward=window.harvestInitialFarm.levelReward;
const initialGift=window.harvestInitialFarm.gift;
const initialInvite=window.harvestInitialFarm.invite;
const visitInfo=window.harvestInitialFarm.visit??null;   // whose farm this is, on a visit (showVisitBar)
const initialWelcome=window.harvestInitialFarm.welcome;
const initialEmailCheck=window.harvestInitialFarm.emailCheck;
// The admin view (3 Oct 2026, src/admin-view.js): an admin account's showcase farm, marked on the page by src/game-cloud.js before the
// game starts. Nothing is played or counted there: no actions (farm-client.js), no sweeps, no pacing events, no Welcome back.
// What the farmer wears (the Season Pass's looks, Oct 2026) and their face, for the pass window and Settings › Your look (season-ui.js).
window.harvestLook=window.harvestInitialFarm.profile?.look&&typeof window.harvestInitialFarm.profile.look==='object'?window.harvestInitialFarm.profile.look:{};
window.harvestAvatarId=window.harvestInitialFarm.profile?.avatar_id??'default';
// Your name, for the name over your farmer (farmerTag): the profile's, until the page around the farm knows a newer one (a rename).
const initialUsername=typeof window.harvestInitialFarm.profile?.username==='string'?window.harvestInitialFarm.profile.username:'';
const adminView=document.documentElement.hasAttribute('data-admin-view');
window.harvestInitialFarm = null;
// A farm you visit (24 Oct 2026, harvestVisit below): marked as an admin view too (nothing to play), and only to look at.
const visitView=document.documentElement.hasAttribute('data-visit-view');
let selectedTool='plant', selectedCrop='wheat', ready=false;
// The tractor and the night shift plant with coins, never with a season crop's seed packets: they keep the last ordinary crop chosen.
let tractorCrop='wheat';
// Whether the farmer chose the tool themselves (the tool bar, a key, Show me) or it only lit up for what the last tap did (showTool).
let toolPicked=false;
let emailAccount={needed:false,email:''},emailCheckUI=null;
// No email on CrazyGames (Oct 2026, public/portal.js): nothing to confirm or change there.
function setEmailCheck(check){if(check)emailAccount=portalOff('email')?{...check,needed:false,canChange:false}:check;const hide=!emailAccount.needed;$('email-button').hidden=hide;$('email-menu-entry').hidden=hide;
 // Settings, Email address (28 Sep 2026): email sign-ups see their address, can change it, and are reminded to confirm it.
 $('email-settings').hidden=!emailAccount.canChange;$('email-settings-address').textContent=emailAccount.email;$('email-settings-note').hidden=!emailAccount.needed;}
let renderer,scene,camera,zoom=1,pan=0,panDepth=0,hovered=-1,lastTick=0,lastFrame=0,lastDraw=0;
const handheld=handheldDevice();   // phones, tablets and the apps: the farm rests under a window (frame, public/windows.js)
// The graphics (21 Oct 2026, public/graphics-mode.js). A phone, a tablet, the apps or an unfolded foldable (a touch screen, even one wider
// than 900 px) never get the computer's heavy settings; simple graphics after any trouble; no shadows on a PowerVR or Imagination GPU.
// gfxMode is what the farm runs with ('full', 'noshadow' or 'simple'), read with the renderer.
const gpuHandheld=handheld||mobileLayout.matches||matchMedia('(pointer: coarse)').matches;
const gfxStore=(()=>{try{return window.localStorage;}catch{return null;}})();
let graphicsSimple=false,gfxMode='full',runHealthy=false,lastShown=Date.now();
addEventListener('pagehide',()=>endRun(gfxStore));
document.addEventListener('visibilitychange',()=>{lastShown=Date.now();if(!runHealthy&&gfxStore?.getItem?.(RUN_KEY))markRun(gfxStore,{away:document.hidden});});
const swept=new Set();   // the fields of a swipe in progress keep their ring until the swipe is saved
// On a phone a new farmer starts on their fields, where the Beginner guide's steps happen; the whole farm after the guide. On a
// computer too until the first harvest (6 Oct 2026: from the whole valley the ripe corn was some 25 px, and 37% of new farmers on a
// computer never touched anything, against none on a phone).
// A calm start (24 Oct 2026, the owner: "Doe alle 4"; beginner-ui.js) opens on the fields until the guide's first four steps are done, on
// every device, and the farm opens out for step 5, when the buildings come (beginner onStep below). It was the fields on a phone until
// the guide was done, and on a computer until the first harvest.
const startView=()=>villageWorld?'home':(calmStep(state)??10)<4||!(state.stats.harvested>0)?'fields':'home';
let viewportWidth=0,viewportHeight=0,viewportRatio=0,viewMode=startView();
// The farm's one zoom axis (18 Oct 2026, the owner: "het moet gewoon een stand zijn in de views"): zoomAt is where its camera is on it,
// 0 the fields (Focus on your crop fields), 1 the heart of the farm (Center the farm) and 2 the whole farm (Show the whole farm), down to
// -1 for the closest (the fields 2.2 times as close); resize draws every place in between, and viewMode names the stop it is nearest to.
// farmAxis: its measures at the last resize; glide: a button's glide in progress (glideFarm). The village keeps viewMode and zoom.
const FARM_STOPS=['fields','home','overview'];
// The far end of the farm's axis is the heart of the farm (18 Oct 2026, the owner: the whole farm "is helemaal niet speelbaar", "dus niet zo
// ver"; on a wide screen it showed the mountains round the valley): zooming out stops there, Show the whole farm is not on the farm (the
// village keeps its own), and the far buildings are a drag away. The axis keeps its whole-farm part, unused, for the measures.
// 22 Oct 2026 (the owner: "maak iets meer uitzoomen mogelijk, klein stukje maar"): about a seventh of the way on towards the whole farm.
const FARM_FAR=1.15;
let zoomAt=FARM_STOPS.indexOf(viewMode),farmAxis=null,glide=null;
let overviewBounds=null;
let familyFlag=null;
const familyDecor=[],factoryDecor=[],yardDecor={dairy:[],pigfarm:[],beeyard:[],sheepbarn:[],glasshouse:[],weaving:[],goatshed:[],craftshop:[],ranch:[],valleymarket:[],estateworkshop:[],tradedepot:[],grandfair:[]},models=new Map(), plots=[], animals=[], particles=[], buildingViews=new Map();
// The pointer for Show me (public/coach.js): one at a time, gone after the last tap.
const coach=createCoach();
// The first steps' spotlight (public/spotlight.js): during a calm start's first four steps the farm dims except the place to tap. Made
// once the farm is on screen (bindUI); spotTarget says where, every frame (frame).
let spot=null;
function spotTarget(){
 const step=calmStep(state,{village:villageWorld});
 if(step===null||step>3||!ready||document.querySelector('dialog[open]'))return null;
 const current=beginnerProgress(state).find(q=>q.current);if(!current)return null;
 if(current.id==='sell')return {all:true};
 const now=farmNow(),watering=current.id==='water'&&state.plots.some(p=>canWater(p,now));
 const pick=current.id==='harvest'?p=>p.crop&&p.readyAt<=now:watering?p=>canWater(p,now):current.id==='plant'||current.id==='water'?p=>!p.crop:null;
 if(!pick)return null;
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
 state.plots.forEach((p,i)=>{if(!pick(p)||!plots[i])return;for(const [dx,dz] of [[-1.2,-1.2],[1.2,-1.2],[-1.2,1.2],[1.2,1.2]]){const s=toScreen(plots[i].x+dx,.1,plots[i].z+dz);left=Math.min(left,s.x);top=Math.min(top,s.y);right=Math.max(right,s.x);bottom=Math.max(bottom,s.y);}});
 return left<right?{rect:{left,top,right,bottom}}:null;
}
// The wheel never scrolls the page around the game (11 Oct 2026, Part A A7, wheel-guard.js).
guardWheel();
let warehouse=null,liveEvents,familyUI,passUI,seasonUI,lookSettings,progression,economy,retention,growth,valley,villageSquare,boat,estatePlaces,boosts,rookie,quests,beginner,mobileUI,windmillRotor,windmillSpeed=0,atmosphere,cropMotion,farmLife,activities,soundUI,scenePolish;
const utilityViews=new Map();
let pond=null;   // the Fishing pond (pond-ui.js), on the farm from POND_OPEN; in the village its village lake, from LAKE_OPEN
let pets=null;   // the farm's dog and cat, or the village's deer (farm-pets.js, 20 Oct 2026), once they have come
let herd=null;   // the farm's moving animals (farm-animals.js, 20 Oct 2026), once they have come
// The farm as it stood until 22 Oct 2026 (asBefore): the pieces that moved since, as [piece, x, z, how it stood] (how: its turn, size and
// height where those changed too: the Feed Mill turned, the Sheep Barn's other model); the pieces that stood then and are gone now, each
// with the piece before it in the scene (gone); and the pieces that are new (fresh). The Dairy Barn's yard went back on 22 Oct 2026, the
// Warehouse came the same day where the Feed Mill stood (the owner's plan), with the Feed Mill across the road, the silo a little back,
// the Animal paddock by the pond, the chickens' pen a segment narrower and the Sheep Barn in the Goat Shed's barn.
const movedBefore=[],gone=[],fresh=[],dairyYard=[],dairyEntries=new Set(),outlineBefore=new Map();
// The Warehouse's barn is longer than the Feed Mill was: three of the old yard's pieces stand beside it now, and the bucket by the lane
// made way for a family member's walk (where they stood: asBefore).
const WAREHOUSE_PROPS_BEFORE=Object.freeze({barrel_002:[-15.7,6.5],bag_001:[-10.2,6.4],bag_002:[-10.8,6.7],bucket_001:[-7.7,1]});
let walker=null;   // your own farmer walking on the farm or in the village (farm-farmer.js, 20 Oct 2026), once they have come
// A tap on your own farmer (the owner, 20 Oct 2026: "als je op jezelf klikt dat je dan naar je profiel gaat"): it hops, then your
// profile opens (the same as the profile button; window.harvestProfiles is the cloud script's, the player id the page's bridge).
// My farmer (21 Oct 2026, the owner: "Doe alle 3"): put your own farmer together (public/farmer-creator.js, loaded when it opens). Save is
// the farm action farmer_wear; the farmer on the farm or in the village changes at once. Opened from Settings › Profile, your own profile
// (window.harvestMyFarmer) and the harness (?open=farmer). Not in the admin view: nothing is saved there.
const GESTURE_BEAT=300;
// wear: a part to put on as it opens (the Season Pass's Wear button, public/season-ui.js): the farmer saves it with Save.
async function openMyFarmer({wear=null}={}){
 if(adminView)return null;
 try{
  const [{openFarmerCreator},{familyShirt}]=await Promise.all([import('./farmer-creator.js'),import('./family-shirt.js')]);
  // The family shirt (item 6): its cut and emblem, kept from the last Family read (or read once now).
  const family=state.family?.familyId?await familyShirt(state.family.familyId):null;
  // The last gesture tried in the window, the farmer on the farm does once when it closes (item 4).
  return await openFarmerCreator({config:farmerOf(state,farmerFarm()),owned:farmerOwned(state,farmerFarm()),state,farm:farmerFarm(),family,tryOn:wear,reducedMotion,onClose:gesture=>{if(gesture)setTimeout(()=>walker?.gesture?.(gesture),GESTURE_BEAT);},onSave:async config=>{
   await runAction({type:'farmer_wear',farmer:config});
   void walker?.farmer.dress(farmerOf(state,farmerFarm()),family);
  }});
 }catch(error){console.warn('My farmer could not open.',error);toast('My farmer could not open. Please try again.');return null;}
}
if(!adminView)window.harvestMyFarmer={open:openMyFarmer};
// A goal of My farmer reached (a hat or a costume to wear now): one short toast after the action that reached it, as a new medal gets one.
// What My farmer's goals read besides the farm itself: its level (farmer-parts.js farmerOwned; the server uses levelOf, the same).
function farmerFarm(){return {level:levelProgress(state).level};}
// Not the family shirt (QA, 21 Oct 2026): joining a family said "Something new to wear" even when it had no shirt to show.
const earnedToWear=()=>farmerOwned(state,farmerFarm()).filter(id=>id!==FAMILY_SHIRT);
let farmerKnown=new Set(earnedToWear());
function farmerNews(){
 const now=earnedToWear(),known=farmerKnown;farmerKnown=new Set(now);
 // Not in a calm start (24 Oct 2026, the owner: no pop-ups before the guide is done): what was earned meanwhile is said after it.
 if(calmStep(state)!==null){farmerKnown=known;return;}
 if(known&&!adminView&&now.some(id=>!known.has(id)))toast('Something new to wear in My farmer.');
}
// The profile opens once the hop is over (the owner, 21 Oct 2026: "wacht met profiel open als die klaar is met springen"): the farmer back
// on the ground (farm-farmer.js react, at once when they are not on the screen), then a short beat.
const LANDED_BEAT=150;
// Your farmer joins in (21 Oct 2026, the owner: "Doe alles behalve 9", item 1; farm-farmer.js visit): after a harvest, a collect at a
// building or a chore, they walk over and stand by it a while. Visual only; on the farm on a computer (addFarmer's trips).
let farmerTrip=null;
function farmerJoins(action){
 if(!walker||!farmerTrip||villageWorld||!action)return;
 let place=null,look=null;
 if(action.type==='field'&&action.action==='harvest'&&plots[action.id]){look=[plots[action.id].x,plots[action.id].z];place=farmerTrip('fields',look);}
 else if((action.type==='collect'||action.type==='collect_all')&&Object.hasOwn(BUILDINGS,action.building)&&ANCHORS[action.building]){look=anchorAt(action.building);place=farmerTrip(action.building);}
 else if(action.type==='chore'){look=anchorAt('chores');place=farmerTrip('chores');}
 if(place)walker.visit(place,look);
}
function tapOwnFarmer(){const me=window.parent?.harvestBridge?.playerId,landed=walker?.react()??Promise.resolve();if(me&&window.harvestProfiles)void Promise.resolve(landed).then(()=>new Promise(beat=>setTimeout(beat,LANDED_BEAT))).then(()=>window.harvestProfiles.open(me,{back:null}));}
const utilityInfo={villageroad:{name:'The Village',icon:'mountain',hint:'Travel to the village'},stall:{name:'Farm stall',icon:'store',hint:'Collect your passive income'},chores:{name:'Farm chores',icon:'shovel',hint:'Little jobs, extra coins'},tractor:{name:'Tractor',icon:'tractor',hint:'Work all your fields'},warehouse:{name:'Warehouse',icon:'warehouse',hint:'All your crops and goods'},silo:{name:'Silo research',icon:'warehouse',hint:'Better seeds & faster growth'},cart:{name:'Delivery orders',icon:'truck',hint:'Fresh orders every day'},valleymarket:{name:'Valley Market',icon:'store',hint:'Baskets at a premium price'},ranch:{name:'The Ranch',icon:'house',hint:'One herd works faster'},estateworkshop:{name:'Estate Workshop',icon:'hammer',hint:'Improvements that last'},tradedepot:{name:'Trade Depot',icon:'truck',hint:'Fill an export trailer'},grandfair:{name:'Grand Valley Fair',icon:'trophy',hint:'Ribbons every week'},seedlab:{name:'Seed Lab',icon:'sprout',hint:'Cross crops into heirlooms'},visitors:{name:'Valley visitors',icon:'user',hint:'Rush orders from the road'},valleyprojects:{name:'Valley projects',icon:'landmark',hint:'Works that last'}};
// The Village market's pin opens the market square (Oct 2026): villagers' requests and the golden brief; the Market button sells.
Object.assign(utilityInfo,{villagemarket:{name:'Market square',icon:'store',hint:'Villagers’ requests and golden briefs'},farmroad:{name:'Road to your farm',icon:'house',hint:'Travel back to your farm'}});
const client=createFarmClient(state,{onChapterReward:reward=>toast(`Completed chapters: +${reward.diamonds} diamonds added!`),onLevelReward:reward=>progression?.announce({...progressionChange(progressionSnapshot(state),state,reward),catchUp:true}),onGift:giftPopup,onEmailCheck:c=>setEmailCheck(c),onChange:()=>{if(ready)expandVisuals();updateUI();},onError:toast,onStatus:status=>{const el=$('save-status'),shown=status==='error'||status==='reconnecting';el.hidden=!shown;el.textContent=status==='error'?'Connection interrupted · Retry':status==='reconnecting'?'Reconnecting…':'';el.disabled=status!=='error';el.classList.toggle('save-error',shown);}});
// home (13 Oct 2026): the page around the farm keeps the sound's context, so a trip to the village and back keeps the sound going.
const farmAudio=createFarmAudio({home:window.parent,onChange:()=>soundUI?.refresh()});
// CrazyGames' sound switch (Oct 2026, public/portal.js): while it is off there, the farm is silent.
const soundPortal=portal();if(soundPortal){farmAudio.muteFromOutside(soundPortal.settings?.muteAudio);const stop=soundPortal.onSettings?.(next=>farmAudio.muteFromOutside(next?.muteAudio));window.addEventListener('pagehide',()=>stop?.(),{once:true});}
// For the parts of the game outside the farm's own actions (src/chat-ui.js: a private message; src/payment-ui.js: diamonds bought).
window.harvestSound=kind=>farmAudio.play(kind);
const productionSounds=createProductionCueTracker(state.buildings,Date.now());
// Pacing measurements go to the page around the game (see src/analytics.js); they carry numbers only.
const track=(event,params={})=>{if(adminView)return;try{window.parent.harvestBridge?.trackGame?.(event,params);}catch{}};
// The farm's running totals for a game portal's high scores (Kongregate, 15 Oct 2026, src/kongregate-page.js): the level, the crops
// harvested and the goods made, when they change, at most once in 20 seconds (the last change still goes, after the wait). The
// website's analytics and CrazyGames ignore the event.
let totalsSent='',totalsAt=0,totalsTimer=0;
function trackTotals(level){
 const wait=totalsAt+20000-Date.now();if(wait>0){if(!totalsTimer)totalsTimer=setTimeout(()=>{totalsTimer=0;trackTotals(levelProgress(state).level);},wait);return;}
 const totals={level,harvested:state.stats?.harvested??0,made:state.stats?.produced??0},key=JSON.stringify(totals);
 if(key===totalsSent)return;totalsSent=key;totalsAt=Date.now();track('farm_totals',totals);
}
// A step of a new farm's load chain (11 Oct 2026, Part A A1; farm-state.js FIRST_LOOK_CHAIN), on the clock of the page around the farm,
// where src/crazygames.js and src/game-cloud.js keep theirs: the 3D models in (models) and the first picture (render). Sent with the first look.
const markChain=key=>{try{const chain=window.parent.harvestChain??={};chain[key]??=Math.round(window.parent.performance.now());}catch{}};
let sessionTracked=false;
// The reminder question's steps go to the farmer's log too (13 Oct 2026, farm-client.js note). It comes after a harvest, or right after
// the farm's first daily gift (13 Oct 2026, item 4; runAction's checkin, from Today or Welcome back). Never while the guide's pointer
// stands (review fix: step 7's "Tap Buildings." came with it, under the card), and the guide's own pointer waits for the card (beginner-ui.js quiet).
const nudge=createReminderNudge({state,level:()=>levelProgress(state).level,notify:message=>toast(message),track,log:client.note,emailUnconfirmed:()=>emailAccount.needed,confirmEmail:()=>emailCheckUI?.open(),canShow:()=>ready&&$('loading').hidden&&!document.querySelector('dialog[open]')&&!coach.active&&calmStep(state)===null});
// A crop medal the action earned (a tap harvest, the tractor) gets its toast at the bottom (medal-notice.js, Oct 2026).
const runAction=withActionSounds(async action=>{const before=progressionSnapshot(state),medalsBefore=medalsWaiting(state);const result=await client.runAction(action);if(result?.inviteReward)inviteRewardPopup(result.inviteReward);beginner?.afterAction(result);if(harvestAction(action))nudge?.harvested();else if(action.type==='checkin')nudge?.gifted();const change=progressionChange(before,state,result.levelReward);progression?.announce(change);if(change.leveled)track('level_up',{level:change.level});if(change.leveled)farmerCheers();farmerNews();farmerJoins(action);medalToast(newMedals(medalsBefore,state));return result;},()=>levelProgress(state).level,kind=>{farmAudio.play(kind);haptic(kind);});
// retention.openUtility only ever knew 'tractor' and 'silo' (anything else fell through to Silo research); "A helping hand" now opens
// its own hub, a clean 2x2 of all four stops (tapping a station's own 3D pin still goes straight to that stop, unchanged).
function openUtility(key){if(key==='warehouse'){warehouse?.open();return;}if(key==='farmroad'){travel('farm');return;}if(key==='villagelake'){pond?.open();return;}if(key==='villageroad'){if(worldTwoOpen(state))travel('village');else toast(`Reach level ${WORLD_TWO_LEVEL} to travel to the village.`);return;}if(key==='villagemarket'){villageSquare?.open();return;}if(!featureUnlocked(state,key)){toast(featureUnlockHint(key));return;}if(key==='valleymarket'||key==='ranch')valley.open(key);else if(['estateworkshop','tradedepot','grandfair','seedlab','visitors','valleyprojects','giantpumpkin'].includes(key))estatePlaces.open(key);else if(key==='master')growth.open('master');else if(key==='stall'||key==='chores'||key==='mastery')growth.open(key);else if(key==='activities')activities.openHub();else retention.openUtility(key);}
const clock=new THREE.Clock(), raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
const world=$('world'),labels=$('plot-labels');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const modelNames=['plant_001','plant_002','plant_003','plant_004','plant_005','plant_006','plant_007','plant_010','plant_011','garden_bed_001','bag_001','bag_002','bag_003','bucket_001','apiary_001','cart_004','chair_001','firewood_003','firewood_008','hay_002','hay_003','table_001','grass_004','bush_003','hangar_003','house_027','house_030','tower_005','house_010','hangar_004','tower_002','tractor_001','tree_001','tree_004','tree_006','fence_001','cow_001','chicken_001','sheep_001','hay_001','bush_001','grass_001','barrel_001','barrel_009','cart_001','case_002','case_003','coop_001','landscape_001','ground_004','road_001'];
modelNames.push('tower_001','tower_020','village_stall_001','greenhouse_003','prop_023','barrel_002','bucket_003','goat_001');
modelNames.push('fence_008','fence_015','ground_002','ground_006','ground_007','stall_001','case_001','dray_002','dray_004','prop_029','hangar_007','hangar_022','tower_010');
modelNames.push('tree_009','hangar_005','hangar_002','house_011',...LIFE_MODELS);
modelNames.push('coop_002','mountain_001','mountain_007');
// The market stalls in front of the Grand Valley Fair (Village pack, 27 Sep 2026).
modelNames.push('village_stall_002','village_stall_003','village_stall_004','village_melons_001','village_barrels_001');
modelNames.push('house_008','pointer_002','table_002','garden_bed_002','firewood_001');
// The Pig Farm: its barn and three pigs.
modelNames.push('house_019','pig_002','pig_003','pig_005');
// The Dairy Barn's grazing brown and white cow, in its pasture (15 Oct 2026; before, scenery.js loaded it later for the paddock).
modelNames.push('cow_003');
// The midgame expansion: two crops and the four new yards.
modelNames.push('plant_009','tree_010','apiary_002','apiary_003','sheep_002','sheep_003','hangar_006','greenhouse_004','house_018');
// Wave 2: the cherry tree, the Goat Shed, the Craft Workshop, the Ranch with its horses and the Valley Market's canopy.
modelNames.push('tree_011','hangar_015','hangar_019','hangar_001','hangar_009','goat_002','horse_003','horse_004','horse_005');
// Wave 3: the manor of the Estate Workshop, the Trade Depot's warehouse, trailer, truck and crates, and the fair's long hall and cart.
modelNames.push('house_005','hangar_008','trailer_003','truck_005','prop_020','prop_021','house_023','dray_003');
const beanPodGeometry=new THREE.SphereGeometry(1,5,5),beanPodMaterial=new THREE.MeshStandardMaterial({color:0x70a936,roughness:1});

let showToast;
function toast(message,options){showToast??=createToast($('toast'));showToast(message,options);}
// The sweep tip (16 Oct 2026, the owner; public/sweep-tip.js): the third field in a row done by a tap says a sweep does them all at once.
// Quiet while the Beginner guide still has steps (it says itself what to tap), in the admin view and in the village.
const sweepTip=createSweepTip({storage:(()=>{try{return localStorage;}catch{return null;}})(),show:text=>toast(text),quiet:()=>villageWorld||adminView||!beginnerProgress(state).every(q=>q.done)});
// Why Water did nothing during the guide, and what to do (7 Oct 2026): the toast after such a tap, and Show me when nothing can be watered.
const WATER_FIRST_MINUTE="Water works in a crop's first minute: plant wheat, then water it.";
// After planting long crops up to level 8 (16 Oct 2026, the owner): when the fields are ready and what is open meanwhile, once a day
// (public/wait-tip.js).
const waitTip=createWaitTip({state,now:farmNow,show:toast,quiet:()=>adminView||villageWorld});
// The first natural fertilizer (21 Oct 2026, the owner: players kept asking how to fertilize): one toast, once on this device, how to use
// it (the Windmill, and the tractor's Fertilize job once the tractor is open). public/fertilizer-tip.js; checked in updateUI. The toast
// sits under a modal window, so it waits while one is open (the Windmill's own, where the fertilizer is collected) and comes when it closes.
const fertilizerTip=createFertilizerTip({state,show:toast,quiet:()=>adminView||villageWorld||!beginnerProgress(state).every(q=>q.done)||Boolean(document.querySelector('dialog[open]'))});
document.addEventListener('close',e=>{if(e.target instanceof HTMLDialogElement)fertilizerTip.check();},true);
// The one short toast at the bottom for new crop medals (farm.html #medal-toast): the toast at the top stays free for the action's own.
let medalNotice;
// The guide's step now (11 Oct 2026, Part A A11): from the first harvest to the first sale only one line speaks, so a medal earned while
// step 2 waits (the first basket's, or one for the rest of the corn) is held until a moment after the sale (heldMedals; updateUI lets it
// go), and at most 20 seconds for a farmer who does not sell yet.
const guideAt=id=>!villageWorld&&beginnerProgress(state).find(q=>q.current)?.id===id;
const MEDAL_HOLD_MS=20000;
let heldMedals=[],heldTimer=0;
function showMedals(medals){medalNotice??=createMedalNotice($('medal-toast'),{state});medalNotice.earned(medals);}
function medalToast(medals){if(!medals.length||!$('medal-toast'))return;if(guideAt('sell')){heldMedals.push(...medals);heldTimer||=setTimeout(()=>{heldTimer=0;const held=heldMedals;heldMedals=[];if(held.length)showMedals(held);},MEDAL_HOLD_MS);return;}showMedals(medals);}
// A gift from the admin (public/player-profiles.js, floris@millstone.nl only) picked up on this farm's next
// load and cleared server-side (farm-api index.ts). The message, if any, is set with textContent — never HTML —
// so there is nothing here that needs escaping.
// The end of the Beginner guide sends the farmer off with a reason to come back: when the farm will be ready, and (until
// the second day's gift is collected) the double harvest that comes with tomorrow's gift (farm-state.js checkIn).
// 7 Oct 2026: it leads with the next goal, a building to build (the Feed Mill, then the Dairy Barn), so a farmer who finishes the guide
// in a few minutes has something to do now instead of only a reason to leave. One sentence each way, so it is translated whole.
// lead: false (11 Oct 2026, Part A A8) when the card's green button already leads to another goal (the quests that wait): one goal at a time.
// The time is next-goal.js readyAllAt, the same moment the phone's goal line says while the farm grows (Plan F, 13 Oct 2026).
function comeBackNote(now=farmNow(),{lead=true}={}){
 const goal=lead&&['mill','dairy'].find(key=>!state.buildings[key]?.built&&buildingEligible(state,key)&&buildingCost(state,key)>0);
 const name=goal?BUILDINGS[goal].name:'',cost=goal?buildingCost(state,goal).toLocaleString('en-US'):'',back=(state.login?.visits??0)<2;
 const last=readyAllAt(state,now),clock=t=>new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
 const when=last?`Your farm keeps growing while you are away: everything is ready ${new Date(last).toDateString()===new Date(now).toDateString()?'at':'tomorrow at'} ${clock(last)}.`:'Plant something before you go: your farm keeps growing while you are away.';
 if(goal)return back?`Next goal: build the ${name} for ${cost} coins in Buildings. ${when} Come back tomorrow for your next daily gift and 30 minutes of double harvest.`:`Next goal: build the ${name} for ${cost} coins in Buildings. ${when}`;
 return back?`${when} Come back tomorrow for your next daily gift and 30 minutes of double harvest.`:when;
}
// action {label,run} (11 Oct 2026, Part A A8): the card leads somewhere, the guide's end to the next goal. Its green button does that and
// Thank you stands beside it as the quiet choice; still one green button.
// names: farmers' names in the title or the line, shown as typed (public/i18n.js setOwnText); the staff's own words too.
function giftPopup(gift,{eyebrow='A GIFT FOR YOU',title='Donation!',icon='gift',text='',action=null,names=[]}={}){
 if(!gift)return;
 // While fishing the gift waits until the farmer is back on the farm (pond-ui.js).
 if(pond?.hold(()=>giftPopup(gift,{eyebrow,title,icon,text,action,names})))return;
 const actions=document.querySelector('#gift-dialog .gift-actions'),go=document.querySelector('#gift-dialog .gift-action');
 if(actions&&go){actions.hidden=!action;document.querySelector('#gift-dialog .gift-done').hidden=Boolean(action);go.textContent=action?.label??'';go.onclick=action?()=>{$('gift-dialog').close();action.run();}:null;}
 $('gift-icon').innerHTML=art(icon);const kicker=document.querySelector('#gift-dialog .eyebrow');if(kicker)kicker.textContent=eyebrow;setOwnText($('gift-title'),title,names);
 const rewards=[];
 // A pass from the admin (22 Oct 2026, game/farm-state.js GIFT_PASSES): its ticket and name first.
 if(gift.pass&&giftPass(gift.pass))rewards.push(`<strong class="reward-item">${art(giftPass(gift.pass).art)}${giftPass(gift.pass).name}</strong>`);
 if(gift.coins)rewards.push(`<strong class="reward-coins">${art('coins')}+${gift.coins.toLocaleString('en-US')} coins</strong>`);
 if(gift.xp)rewards.push(`<strong class="reward-xp">${art('xp')}+${gift.xp.toLocaleString('en-US')} XP</strong>`);
 if(gift.diamonds)rewards.push(`<strong class="reward-diamonds">${art('diamonds')}+${gift.diamonds.toLocaleString('en-US')} diamonds</strong>`);
 if(gift.item&&gift.itemCount&&ITEMS[gift.item])rewards.push(`<strong class="reward-item">${art(gift.item)}+${gift.itemCount.toLocaleString('en-US')} ${ITEMS[gift.item].name}</strong>`);
 $('gift-rewards').innerHTML=rewards.join('');
 const note=$('gift-message');
 if(gift.message){const said=giftMessageText(gift.message,translateText);setOwnText(note,`“${said}”`,[said]);note.hidden=false;}else{setOwnText(note,text,names);note.hidden=!text;}
 refreshArt();$('gift-dialog').showModal();
}
// Invite a friend (public/invite-ui.js): the reward popups. A level-up celebration goes first; this one waits for it.
function afterCelebration(show){setTimeout(()=>{const levelUp=document.getElementById('level-up-dialog');if(levelUp?.open)levelUp.addEventListener('close',()=>setTimeout(show,300),{once:true});else show();},450);}
function inviteRewardPopup(reward){afterCelebration(()=>giftPopup({diamonds:reward.diamonds,message:''},{eyebrow:'INVITE A FRIEND',title:`Thanks to ${reward.from}!`,icon:'invite-friends',names:[reward.from]}));}
// On load: your own reward (reached level 10 through a family reward) and friends you invited who reached level 10.
function inviteLoadPopup(invite){
 if(invite.reward)inviteRewardPopup(invite.reward);
 const friends=invite.friends??[];if(!friends.length)return;
 const diamonds=friends.reduce((n,f)=>n+f.diamonds,0),family=friends.filter(f=>f.invitedToFamily).map(f=>f.name);
 const title=friends.length===1?`${friends[0].name} reached level 10!`:`${friends.length} friends reached level 10!`;
 const note=family.length?`We sent ${family.join(', ')} an invitation to your family.`:'';
 const names=friends.map(f=>f.name);
 afterCelebration(()=>{giftPopup({diamonds,message:''},{eyebrow:'INVITE A FRIEND',title,icon:'invite-friends',names});const m=$('gift-message');if(note){setOwnText(m,note,names);m.hidden=false;}});
}
function icons(){refreshArt();}

// One model from the pack, centred on its footprint and standing on the ground, kept once and cloned where it is used.
let gltfLoader=null;
// A model that cannot be fetched (a deploy still going live, or a "not found" the browser remembers: vercel.json caches /assets/ for
// a day, 404s included) is asked for once more past that cache. If it still fails, an invisible stand-in of 1x1x1 takes its place,
// so the farm opens without that one model instead of not at all (27 Sep 2026).
// 11 Oct 2026: the file comes through model-atlas.js download, which asks again beside a request that sends nothing (it used to hold the
// bar for good), and is then read as GLTFLoader.loadAsync read it. missingModels counts the stand-ins for init below.
let missingModels=0;
const openModel=url=>download(url).then(data=>gltfLoader.parseAsync(data,'/assets/models/'));
async function fetchModel(name){
 try{return await openModel(`/assets/models/${name}.glb`);}
 catch{
  try{return await openModel(`/assets/models/${name}.glb?fresh=${Date.now()}`);}
  catch(error){console.warn(`The model ${name} could not load; the farm opens without it.`,error);return null;}
 }
}
async function loadModel(name){
 // Every model's palette comes from one palette.png, fetched once for all of them (model-atlas.js sharePalette, 6 Oct 2026).
 gltfLoader??=sharePalette(new GLTFLoader());
 const gltf=await fetchModel(name);
 if(!gltf){missingModels++;const group=new THREE.Group(),stand=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({visible:false}));stand.position.y=.5;group.add(stand);models.set(name,{object:group,size:new THREE.Vector3(1,1,1)});return;}
 const object=gltf.scene;
 const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 object.position.sub(new THREE.Vector3(center.x,box.min.y,center.z));const group=new THREE.Group();group.add(object);
 object.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;n.material.roughness=1;n.material.metalness=0;}});
 shareAtlas(object,name);
 models.set(name,{object:group,size});
}
// The forest belt, hills, sunflowers, pigsty and the other extras (public/scenery.js) come after the farm is on screen, so the
// first load is not slower; if any of it fails the farm simply stays as it is.
async function addScenery(){
 try{
  // Your farmer's evening chair stands before the scenery is planted, and the scenery leaves the farmer's loop, chair and trip spots
  // free (21 Oct 2026, QA): the scenery reckons with what stands on the farm when it is planted, and the chair came at a different
  // moment on every visit, so the bushes moved between visits and some stood on the farmer's loop. Only where the farmer comes.
  const walking=farmerComes()?import('./farm-farmer.js').catch(()=>null):null;
  const {SCENERY_MODELS,buildScenery}=await import('./scenery.js');
  const [farmerSpots]=await Promise.all([walking,loadInBatches(SCENERY_MODELS.filter(name=>!models.has(name)),loadModel,4)]);
  if(farmerSpots)placeBench(farmerSpots.FARM_BENCH);
  const keepOff=keptOff();asBefore(()=>buildScenery({scene,models,mobile:mobileLayout.matches,clear:farmerSpots?.inFarmerWay??null,keepOff}));clearPropsFromMountains();obstacleMap=null;hideUnderLayout();renderer.shadowMap.needsUpdate=true;shootMinimap();
 }catch(error){console.warn('The extra scenery was skipped.',error);}
 void addAnimals();
}
// The farm's animals move (20 Oct 2026, public/farm-animals.js): after the extra scenery (its white hen moves too) and a quiet moment,
// each kind's animated twin takes the place of its still models; until then, and for good if it cannot load, the still ones stand as
// before. Not with reduced motion (the farm does not move then) or when the browser asks to save data. Site only: no rules or save.
async function addAnimals(){
 try{
  const connection=navigator.connection;if(reducedMotion||graphicsSimple||connection?.saveData||/2g/.test(connection?.effectiveType??''))return;
  await new Promise(done=>'requestIdleCallback' in window?requestIdleCallback(done,{timeout:5000}):setTimeout(done,2000));
  const {createHerd,ANIMATED}=await import('./farm-animals.js');
  // The still animals: the pens' (animalAt), the Ranch's horses, the Animal paddock's horse (a stop with a pin: it stays on its spot)
  // and the scenery's white hen by the coop (stays on its spot too).
  // A penned one keeps inside its pen's fences and clear of what stands in it (the barn, the coop, a bucket, hay; 22 Oct 2026,
  // farm-animals.js): the box round its pen's fences and the boxes of everything at least 0.3 tall standing in it.
  const pens=penBoxes(),box=new THREE.Box3(),size=new THREE.Vector3(),standing=[];
  for(const o of scene.children){
   if(o.isLight||o.isCamera||o.userData.pen||ANIMAL.test(o.userData.model??o.userData.scenery??''))continue;
   box.setFromObject(o);if(box.isEmpty())continue;box.getSize(size);if(size.y<.3||size.x>12||size.z>12)continue;
   standing.push([box.min.x,box.max.x,box.min.z,box.max.z]);
  }
  const penOf=o=>{const p=pens.get(o.userData.pen);return p?{box:p,keepOut:standing.filter(([a,b,c,d])=>b>p[0]&&a<p[1]&&d>p[2]&&c<p[3])}:null;};
  const list=[];scene.traverse(o=>{const name=o.userData.model??o.userData.scenery;if(name&&ANIMATED[name]&&!o.userData.animal){o.userData.animal=true;list.push({obj:o,still:Boolean(o.userData.activity||o.userData.scenery),pen:penOf(o)});}});
  herd=createHerd({list,relock:o=>{if(o.userData.locked){o.userData.locked=false;setLocked(o,true);}},lite:handheld||mobileLayout.matches,onKind:()=>{renderer.shadowMap.needsUpdate=true;}});
  await herd.ready;
 }catch(error){console.warn('The animals were left standing.',error);}
}
// The farm's dog and cat by the Farmhouse, or the deer in the village (20 Oct 2026, public/farm-pets.js): once the farm or the village is on
// screen and the page has a quiet moment (the extra scenery and the village's extras start first), so the first picture never waits for
// them (about 100 KB each); if they fail, the farm simply has no pets.
async function addPets(){
 try{
  if(graphicsSimple)return;   // simple graphics: no pets (each is a moving, skinned model)
  await new Promise(done=>'requestIdleCallback' in window?requestIdleCallback(done,{timeout:4000}):setTimeout(done,1500));
  const {createPets,FARM_PETS,VILLAGE_DEER}=await import('./farm-pets.js');
  // On the farm the grass is the ground; the lane's top is .085 over it (ROADS, farm-layout.js), and a pet steps up onto it over 0.3.
  const lanes=roadRects();let ground=(x,z)=>{let y=0;for(const r of lanes){const inside=Math.min(x-r.minX,r.maxX-x,z-r.minZ,r.maxZ-z);if(inside>0)y=Math.max(y,.085*Math.min(1,inside/.3));}return y;};
  if(villageWorld){
   // The deer walks on the village's hills: their height under its spots (village-scene.js, as the Village Fields stand on them).
   const {groundUnder}=await import('./village-scene.js'),xs=VILLAGE_DEER.spots.map(s=>s[0]),zs=VILLAGE_DEER.spots.map(s=>s[1]);
   ground=groundUnder(villageGroup,{x:Math.min(...xs),z:Math.min(...zs),width:Math.max(...xs)-Math.min(...xs),depth:Math.max(...zs)-Math.min(...zs)});
  }
  pets=await createPets({scene,kinds:villageWorld?{deer:VILLAGE_DEER}:FARM_PETS,ground,labels:$('building-labels'),reducedMotion});
  positionBuildingLabels();
 }catch(error){console.warn('The pets were skipped.',error);}
}
// Your own farmer (20 Oct 2026, public/farm-farmer.js; phase 1: everyone's is the default farmer): calm loops round the Farmhouse yard,
// or in the village round the farm road, after the farm or the village is on screen and the pets have started. The same rules as the
// farm's animals: not with reduced motion, Save-Data or a 2g line, and if it fails the farm simply has no farmer.
// chair_001's seat faces its own -x: turned this much more, it faces the way FARM_BENCH says.
const CHAIR_FACING=0;
function farmerComes(){const connection=navigator.connection;return !(reducedMotion||graphicsSimple||adminView||connection?.saveData||/2g/.test(connection?.effectiveType??''));}
// The evening bench (item 3): the farm's chair at the edge of the loop, placed before the scenery (addScenery) on a farm the farmer comes to.
let farmBench=null;
function placeBench(spot){if(villageWorld||farmBench||!models.has('chair_001'))return;const before=currentZone();zone('fields');cloneModel('chair_001',spot.x,spot.z,{height:spot.height,rotation:spot.turn+CHAIR_FACING});zone(before);farmBench=spot;}
let sceneryDone=Promise.resolve();
async function addFarmer(){
 try{
  if(!farmerComes())return;
  await new Promise(done=>'requestIdleCallback' in window?requestIdleCallback(done,{timeout:6000}):setTimeout(done,2500));
  const {createFarmWalker,FARM_WALK,VILLAGE_WALK,VILLAGE_FAMILY_WALKS,FARM_FAMILY_WALKS,FARM_FAMILY_LITE,familyStage,tripFor}=await import('./farm-farmer.js');
  // On the farm the farmer comes after the scenery is planted, so it never stands where the scenery looks for room.
  if(!villageWorld)await sceneryDone;
  // On the farm the grass is the ground and a lane's top .085 over it, as for the pets (addPets).
  const walk=villageWorld?VILLAGE_WALK:FARM_WALK,lanes=roadRects();let ground=(x,z)=>{let y=0;for(const r of lanes){const inside=Math.min(x-r.minX,r.maxX-x,z-r.minZ,r.maxZ-z);if(inside>0)y=Math.max(y,.085*Math.min(1,inside/.3));}return y;};
  if(villageWorld){
   const {groundUnder}=await import('./village-scene.js'),xs=walk.spots.map(s=>s[0]),zs=walk.spots.map(s=>s[1]);
   ground=groundUnder(villageGroup,{x:Math.min(...xs),z:Math.min(...zs),width:Math.max(...xs)-Math.min(...xs),depth:Math.max(...zs)-Math.min(...zs)});
  }
  const bench=villageWorld?null:farmBench;
  // The family shirt (item 6) is drawn in the family's cut, colour and emblem: kept from the last Family read, or read once.
  const config=farmerOf(state,farmerFarm()),family=config.top==='family_shirt'?await (await import('./family-shirt.js')).familyShirt(state.family?.familyId):null;
  walker=await createFarmWalker({scene,walk,ground,lite:handheld||mobileLayout.matches,config,trips:!villageWorld&&!handheld&&!mobileLayout.matches,bench,family,tag:farmerTag(ownName()),blockers:tagBlockers});farmerTrip=tripFor;
  // Your Farm Family's members online now, on the farm and in the village alike (on a phone's farm at most FARM_FAMILY_LITE).
  const walks=villageWorld?VILLAGE_FAMILY_WALKS:FARM_FAMILY_WALKS,cap=villageWorld||!(handheld||mobileLayout.matches)?walks.length:FARM_FAMILY_LITE;
  void addFamilyFarmers(createFarmWalker,familyStage,walks,cap,villageWorld?null:ground);
 }catch(error){console.warn('Your farmer was skipped.',error);}
}
// Your Farm Family's farmers (21 Oct 2026, the owner: "Doe alles behalve 9", item 5, then "toon alle online players in de fam in farm en
// village, dus geen 'bezoekjes' meer"): every other member online now walks on your farm and in the village, all at once and for as
// long as they are online; members not online are not shown. Each in their own look (their saved farmer, or the default one), each
// round a small loop of their own (farm-farmer.js FARM_FAMILY_WALKS on the farm, VILLAGE_FAMILY_WALKS in the village: six each; more
// online than that: the six seen most lately; a phone's farm three, FARM_FAMILY_LITE). A tap: a hop, then that member's profile. Who:
// the Family read with farmers (farm-api family-service.js familyFarmers), kept a minute (sessionStorage, for travelling back and
// forth) and read again every two minutes: who went offline fades out, who came online fades in. One farmer at a time, each after a
// quiet moment, as your own; only moved while in the picture, a phone at every other frame. Not with reduced motion, Save-Data, a 2g
// line or in the admin view (addFarmer: farmerComes). In the evening they keep walking: they are online (only your own farmer rests).
const familyWalkers=[];
// Only the members online now (the owner, 21 Oct 2026: "Zet players in village en farm gewoon alleen andere family members die online
// zijn, toon ze anders niet"): kept a minute and read again every two, so who is shown follows who is online.
const FAMILY_FARMERS_KEY='harvest-tycoon:family-farmers',FAMILY_FARMERS_KEEP=60000,FAMILY_FARMERS_SYNC=2*60000;
async function familyFarmers(keep=FAMILY_FARMERS_KEEP){
 const familyId=state.family?.familyId,bridge=window.parent?.harvestBridge;if(!familyId||!bridge?.request)return [];
 try{const kept=JSON.parse(sessionStorage.getItem(FAMILY_FARMERS_KEY)??'null');if(kept?.familyId===familyId&&Date.now()-kept.at<keep&&Array.isArray(kept.list)&&kept.list.every(m=>'online' in m))return kept.list.filter(m=>m.online===true);}catch{}
 const data=await bridge.request({operation:'family',farmers:true});(await import('./family-shirt.js')).keepFamilyShirt(data?.family);
 const list=(data?.family?.members??[]).filter(m=>!m.isSelf&&typeof m.playerId==='string'&&m.online===true).sort((a,b)=>(a.daysAway??0)-(b.daysAway??0))
  .slice(0,6).map(m=>({playerId:m.playerId,username:typeof m.username==='string'?m.username:'',online:m.online===true,daysAway:Number.isFinite(m.daysAway)?m.daysAway:null,farmer:m.farmer&&validFarmerConfig(m.farmer).ok?cleanFarmer(m.farmer):null}));
 try{sessionStorage.setItem(FAMILY_FARMERS_KEY,JSON.stringify({familyId,at:Date.now(),list}));}catch{}
 return list;
}
// walks: the six loops; cap: how many of them to fill; ground: the farm's (the village's is the hills' under each loop).
async function addFamilyFarmers(createFarmWalker,familyStage,walks,cap,ground){
 // Each member on a walk of their own (shown: playerId -> walk); every two minutes the ones gone offline leave and the ones come
 // online join, each fading in where they walk (or out where they stand).
 const shown=new Map(),walkers=new Map();let busy=false;
 async function sync(){
  if(busy)return;busy=true;
  try{
   const list=await familyFarmers(),{leave,join}=familyStage(shown,list,cap);
   const groundUnder=villageWorld?(await import('./village-scene.js')).groundUnder:null;
   await Promise.all(leave.map(async id=>{
    const other=walkers.get(id);walkers.delete(id);
    try{await other?.leave();}finally{shown.delete(id);const i=familyWalkers.indexOf(other);if(i>=0)familyWalkers.splice(i,1);other?.root.removeFromParent();other?.dispose();}
   }));
   for(const {member,slot} of join){
    await new Promise(done=>'requestIdleCallback' in window?requestIdleCallback(done,{timeout:4000}):setTimeout(done,1200));
    const walk=walks[slot],xs=walk.spots.map(s=>s[0]),zs=walk.spots.map(s=>s[1]);
    const under=groundUnder?groundUnder(villageGroup,{x:Math.min(...xs),z:Math.min(...zs),width:Math.max(...xs)-Math.min(...xs),depth:Math.max(...zs)-Math.min(...zs)}):ground;
    const family=member.farmer?.top==='family_shirt'?await (await import('./family-shirt.js')).familyShirt(state.family?.familyId):null;
    const other=await createFarmWalker({scene,walk,ground:under,lite:handheld||mobileLayout.matches,config:member.farmer??undefined,name:'family-farmer',family,appear:true,tag:farmerTag(member.username),blockers:tagBlockers});
    other.playerId=member.playerId;other.username=member.username;familyWalkers.push(other);walkers.set(member.playerId,other);shown.set(member.playerId,slot);
   }
  }catch(error){console.warn('The family\'s farmers were skipped.',error);}
  finally{busy=false;}
 }
 await sync();setInterval(()=>{if(!document.hidden)void sync();},FAMILY_FARMERS_SYNC);
}
// Every farmer's name (21 Oct 2026, the owner: "Zet ook de naam van de user in village en farm boven het poppetje", then "Toon alleen
// naamlabel bij hover" and "Op mobiel altijd"): with a mouse the name is the hover tooltip over the farmer (pointermove); on a touch
// screen (no hover) a small cream pill over their head all the time (farm-farmer.js placeTag: only while on the screen, at the
// farmer's own frames, giving way to a pin or a name it touches; never tapped: pointer-events none). Players' own words: translate="no".
const namesAlways=handheld||matchMedia('(hover: none)').matches;
const ownName=()=>$('player-name')?.dataset.username||initialUsername;
function farmerTag(name){
 if(!namesAlways||typeof name!=='string'||!name.trim())return null;
 const tag=document.createElement('span');tag.className='farmer-name';tag.setAttribute('aria-hidden','true');tag.innerHTML=ownWords(name.trim());tag.hidden=true;
 $('building-labels').prepend(tag);return tag;
}
const tagBlockers=()=>[...$('building-labels').children,...$('plot-labels').children].filter(l=>!l.classList.contains('farmer-name')&&!l.hidden);
const farmerTooltip=name=>name?`<strong>${ownWords(name)}</strong>`:'';
function tapFamilyFarmer(id){const other=familyWalkers.find(w=>w.playerId===id),landed=other?.react()??Promise.resolve();if(window.harvestProfiles)void Promise.resolve(landed).then(()=>new Promise(beat=>setTimeout(beat,LANDED_BEAT))).then(()=>window.harvestProfiles.open(id,{back:null}));}
// The roads (6 Oct 2026, softer on 7 Oct): a warmer, sandier pink, towards the paths of the loading screen's painted valley; one
// tinted copy of the material for every road, so the pink pigs and flowers keep the palette as it is.
// The Sheep Barn's roof: the palette's brown swatch [column 8, row 5] becomes the slate blue-grey one [10, 5] (93,126,142), on its copy only.
const SHEEP_BARN_ROOF=Object.freeze([[[8,5],[10,5]]]);
const roadMaterials=new Map();
function roadMaterial(material){
 let road=roadMaterials.get(material);
 if(!road){road=material.clone();road.color.setRGB(.94,.87,.79);roadMaterials.set(material,road);}
 return road;
}
function cloneModel(name,x,z,{width,height,depth,scale=1,rotation=0,y=0,paint}={}){
 const entry=models.get(name);if(!entry)throw new Error(`Missing model: ${name}`);
 const obj=entry.object.clone(true),d=entry.size;
 if(paint)repaint(obj,paint);   // this copy in other palette swatches (model-atlas.js repaint)
 if(name==='road_001')obj.traverse(n=>{if(n.isMesh)n.material=Array.isArray(n.material)?n.material.map(roadMaterial):roadMaterial(n.material);});
 if(width!=null&&depth!=null)obj.scale.set(width/d.x,(height??d.y)/d.y,depth/d.z);
 else {const s=height!=null?height/d.y:width!=null?width/Math.max(d.x,d.z):scale;obj.scale.setScalar(s);}
 const [px,pz]=place(x,z);obj.position.set(px,y,pz);obj.rotation.y=rotation;obj.userData.model=name;scene.add(obj);
 // The yard it belongs to moves it with the rest of that yard (your own farm layout, applyLayout).
 const yard=currentYard();if(yard)obj.userData.yard=yard;
 return obj;
}
// Buildings and helpers that are still to come are shown from the first minute: greyed out, with a lock on their label, so a farmer
// sees what there is to grow towards. Each material gets one desaturated twin; a locked object swaps to it and back when it unlocks.
const greyedMaterials=new Map();
function greyed(material){
 let grey=greyedMaterials.get(material);
 if(!grey){
  grey=material.clone();
  // Lighter and flatter since 24 Oct 2026 (the owner: "Maak locked building nog meer onopvallend"): a pale grey that sinks into the farm.
  grey.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,vec3(dot(diffuseColor.rgb,vec3(.299,.587,.114))),.95)*.55+.36;');};
  grey.customProgramCacheKey=()=>'greyed';greyedMaterials.set(material,grey);
 }
 return grey;
}
function setLocked(object,locked){
 if(object.userData.locked===locked)return;object.userData.locked=locked;
 object.traverse(mesh=>{if(!mesh.isMesh)return;mesh.userData.original??=mesh.material;const original=mesh.userData.original;mesh.material=locked?(Array.isArray(original)?original.map(greyed):greyed(original)):original;});
}
function patch(x,z,width,depth,color,y=.005){
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshStandardMaterial({color,roughness:1}));
 mesh.rotation.x=-Math.PI/2;{const [px,pz]=place(x,z);mesh.position.set(px,y,pz);}mesh.receiveShadow=true;scene.add(mesh);{const yard=currentYard();if(yard)mesh.userData.yard=yard;}return mesh;
}
function fenceLine(x,z,n,axis='x',size=2.2,style='fence_001',tintColor){
 const before=currentZone(),spots=fenceSegments(x,z,n,axis,size),pieces=[];
 zone('fields',{keep:true});
 for(const [cx,cz] of spots){
  const seg=cloneModel(style,cx,cz,{width:size,rotation:axis==='z'?Math.PI/2:0});
  if(tintColor)tint(seg,tintColor);
  pieces.push(seg);
 }
 zone(before,{keep:true});
 return pieces;
}
function groundPatch(name,x,z,width,depth,color){
 const p=cloneModel(name,x,z,{width,depth,height:.16,y:.006});
 p.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.color.setHex(color);}});
 return p;
}
// The tractor's paint (the Season Pass's Pumpkin paint, Oct 2026: state.lookFarm.tractor), only on the farmer's own farm: the model's own
// material with a tint, no new model. Put back as it was with none. setLocked keeps the greyed look of a locked tractor working.
// A model's palette colours made another colour: its green and blue texels take the colour at their own lightness, the rest (wood,
// yellow, the darkest parts) stays as it was. A multiply tint (tint() below) can only darken a texture, so a blue tractor or a green
// bush would turn nearly black. Used by the Season Pass's tractor paint and its season crop (cranberries: the berry bush in red).
function recolored(material,hex,key){
 const m=material.clone(),c=new THREE.Color(hex);
 m.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  {vec3 c=diffuseColor.rgb;float hi=max(c.r,max(c.g,c.b)),lo=min(c.r,min(c.g,c.b));
   if(hi-lo>.08&&max(c.g,c.b)>c.r+.04){float l=dot(c,vec3(.299,.587,.114));diffuseColor.rgb=vec3(${c.r.toFixed(3)},${c.g.toFixed(3)},${c.b.toFixed(3)})*clamp(.45+l*1.4,.35,1.15);}}`);};
 m.customProgramCacheKey=()=>`recolor-${key}-${hex}`;return m;
}
let tractorPaint=null;
function paintTractor(){
 const v=utilityViews.get('tractor'),id=adminView?null:state.lookFarm?.tractor??null;if(!v||id===tractorPaint)return;tractorPaint=id;
 const look=seasonLook(id),locked=v.object.userData.locked===true;setLocked(v.object,false);
 v.object.traverse(mesh=>{
  if(!mesh.isMesh)return;mesh.userData.plain??=mesh.userData.original??mesh.material;
  const plain=mesh.userData.plain,painted=look?.kind==='tractor'?recolored(plain,look.tint,'tractor'):plain;
  if(mesh.material!==plain&&mesh.material?.userData?.seasonPaint)mesh.material.dispose?.();
  if(painted!==plain)painted.userData.seasonPaint=true;mesh.material=painted;mesh.userData.original=painted;
 });
 v.object.userData.locked=undefined;setLocked(v.object,locked);
}
// Multiplicative tint: only ever makes a texture darker/warmer, never lighter than its source pixels.
function tint(obj,color){obj.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.color.setHex(color);}});return obj;}
// Additive glow: the only way to make an already-dark, texture-mapped prop read lighter.
function lighten(obj,color,intensity=.3){obj.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.emissive=new THREE.Color(color);n.material.emissiveIntensity=intensity;}});return obj;}
function decorate(){
 // Everything a yard adds to the farm, groups too (the Windmill's turning sails), belongs to that yard (your own farm layout, applyLayout).
 scene.add=function(...objects){const yard=currentYard();if(yard)for(const o of objects)if(o.type!=='BoxHelper')o.userData.yard??=yard;return THREE.Scene.prototype.add.apply(this,objects);};
 try{decorateFarm();}finally{delete scene.add;}
}
function decorateFarm(){
 // Layout zones (public/farm-layout.js): each yard moves as one piece, the fields stay where they are.
 zone('fields');
 // Fresh grass green, wide enough that its edge is never in view: it runs on into the haze however far you pan or zoom out.
 // Set for the light of 7 Oct 2026: the fresh green of before, a touch lighter (scene-polish.js adds 7% and the mottling).
 const ground=patch(0,0,600,600,0x8cbc58,0);ground.name='Farm ground';
 // The crossing paths keep the four parts of the farm easy to read from the fixed camera.
 zone('exact');
 for(const road of ROADS.slice(0,3))cloneModel('road_001',road.x,road.z,{...roadSize(road),height:road.height,y:road.y});
 zone('fields');patch(2.575,14.4,12.8,31.7,0xa3be65,.004).name='Crop meadow';
 zone('coop');patch(14.1,-9.5,13.6,11.6,0xa4b472,.007);
 zone('warehouse');patch(-12.5,5.3,8.7,13,0xa8b676,.004);
 // Buildings, vehicles and all plants below come from the supplied GLB pack.
 // The Dairy Barn faces its cows' pasture, its doors opening into it like the Goat Shed's (15 Oct 2026, the owner); the pasture is
 // further down in this file, after the chickens (animalAt). It stands one rail segment further back since 22 Oct 2026 (the owner:
 // "geef dieren desnoods wat meer ruimte in hun veld, zoals Koeien door de Koeienstal meer naar achteren plaatsen").
 zone('dairy');addBuilding('dairy',-.3,-16.1,{width:6.8});
 // The silo stands behind the Feed Mill since 22 Oct 2026 (farm-layout.js HOMES), so the Feed Mill fits in front of it.
 zone('silo');addUtility('silo','tower_002',5.6,-11.8,{height:6.6});movedBefore.push([utilityViews.get('silo').object,...asBeforeLayout(()=>place(5.6,-11.8))]);
 zone('farmhouse');addBuilding('farmhouse',-13.8,-10.2,{width:6.5,rotation:Math.PI/2});
 // The Feed Mill (22 Oct 2026, the owner's Warehouse plan, M1): across the main road between the cows and the chickens, right above the
 // first fields, its long side along the road's way (north-south) and its doors towards the road and the fields; the Warehouse has its
 // old spot. It stood turned across, where the Warehouse is now (asBefore), with a little pump tower beside it (gone).
 zone('mill');addBuilding('mill',-12.5,4,{width:6.2});
 {const mill=buildingViews.get('mill'),[ox,oz]=asBeforeLayout(()=>place(-12.5,4)),dx=ox-mill.object.position.x,dz=oz-mill.object.position.z;
  movedBefore.push([mill.object,ox,oz,{ry:Math.PI/2}],[mill.hit,mill.hit.position.x+dx,mill.hit.position.z+dz,{ry:Math.PI/2}]);
  const [tx,tz]=asBeforeLayout(()=>place(-17,3));zone('fields');goneNow(cloneModel('tower_005',tx,tz,{height:4.5}));zone('mill');}
 // The Warehouse (22 Oct 2026): the Sheep Barn's old red barn at its own proportions, where the Feed Mill stood and a little to the right
 // (it is longer), its doors towards the lane and the fields, with crates by them. Every crop and good of the farm goes in here.
 zone('warehouse');addUtility('warehouse','hangar_006',-11.5,4.6,{width:8.5,rotation:Math.PI/2});fresh.push(utilityViews.get('warehouse').object);
 // The crates by its doors stand apart and on each other (22 Oct 2026, the owner: "achterste krat gaat voor de middelste"): the vegetable
 // crate stood 17 cm into the fish crate beside it and now has 4 cm between them, and the top crate floated 39 cm above the one under it
 // (a crate is 0.43 high at this size, not 0.82) and now rests on it, turned a little less so all its corners stand on it.
 fresh.push(cloneModel('case_002',-6.5,5.7,{width:.95,rotation:.2}),cloneModel('case_003',-6.6,6.82,{width:.8,rotation:-.35}),cloneModel('case_002',-6.5,5.7,{width:.8,y:.433,rotation:.3}));
 zone('bakery');addBuilding('bakery',-10.8,12,{width:6.8,rotation:Math.PI/2});
 zone('packing');addBuilding('packing',11.5,-17.2,{width:5.1,rotation:Math.PI/2});   // its front with the windows towards the camera (26 Sep 2026)
 zone('windmill');
 const windmillPosition={x:12.8,z:-1.5};
 addBuilding('windmill',windmillPosition.x,windmillPosition.z,{height:6.6});
 // The Juice Press and the Preserves Workshop keep their models' own shape, as on their pictures (15 Oct 2026: a separate width,
 // height and depth had made them 1.75 times as wide as high and long, squashed); the Juice Press stands beside the Family Hall.
 zone('juicepress');addBuilding('juicepress',-1,-20.1,{width:6.2,rotation:Math.PI/2});
 zone('preserves');addBuilding('preserves',-15.2,-18.6,{width:6.4,rotation:Math.PI/2});
 zone('kitchen');addBuilding('kitchen',-12.4,18.2,{width:5.5,height:3.9,depth:4.8,rotation:Math.PI/2});
 // The Factory: a long white production hall with a chimney unit at one end and a hopper at the other, south of the pond.
 zone('factory');addBuilding('factory',16.2,21.9,{width:6.4,height:3.6,depth:13,rotation:Math.PI/2});
 // The chimney and the hopper are greyed out with the hall until level 50, like every building that is still to come.
 factoryDecor.push(cloneModel('hangar_022',8.6,21.4,{height:3.6,rotation:Math.PI/2}),cloneModel('tower_010',24.2,22.2,{height:5}));
 // North-west square, clear of crop expansions and the north-south path at x=-6.
 zone('familyhall');addBuilding('familyhall',-9.3,-20.5,{width:5.7,rotation:Math.PI/2});
 {
  // Independent decor is excluded from the raycast target lists.
  for(const [name,x,z,options] of [
   ['pointer_002',-5.9,-17.5,{height:1.3}],
   ['table_002',-9.6,-16.9,{width:1.5}],
   ['firewood_001',-13.2,-20.6,{width:1.1}]
  ]){const decor=cloneModel(name,x,z,options);familyDecor.push(decor);}
  // The family's own flag by the hall (public/family-flag.js), for a farmer in a Farm Family.
  {const [fx,fz]=place(-6.9,-23.7);familyFlag=createFamilyFlag(scene,fx,fz,{height:4.4,turn:Math.PI/4});}
 }

 zone('juicepress');patch(-1,-20.1,6.9,6.4,0xb6bd88,.008);
 zone('preserves');patch(-15.2,-18.6,7.1,6.6,0xb6bd88,.008);
 zone('kitchen');patch(-12.4,18.2,5.1,4.8,0xb6bd88,.008);
 zone('factory');patch(16.2,22.3,16.5,6.6,0xb9af8a,.008);
 // Both the mill body and its moving sails are original parts from the supplied pack.
 zone('windmill');
 const sail=cloneModel('tower_020',0,0,{height:5.8});scene.remove(sail);
 sail.position.set(0,-2.9,0);windmillRotor=new THREE.Group();{const [rx,rz]=place(windmillPosition.x,windmillPosition.z+1.8);windmillRotor.position.set(rx,4.55,rz);}windmillRotor.add(sail);windmillRotor.userData.building='windmill';scene.add(windmillRotor);
 cloneModel('bag_001',windmillPosition.x-2,windmillPosition.z+1.8,{height:.95,rotation:.4});
 cloneModel('bag_002',windmillPosition.x-1.3,windmillPosition.z+2.2,{height:.85,rotation:-.3});
 cloneModel('prop_023',windmillPosition.x+2.2,windmillPosition.z+1.8,{width:1.1,rotation:.2});
 zone('greenhouse');const glasshouse=cloneModel('greenhouse_003',5.6,-19,{width:3.7,rotation:Math.PI/2});
 zone('packing');
 cloneModel('barrel_002',14.5,-14.6,{height:1.2});
 cloneModel('bucket_003',12.7,-13.9,{height:.65});
 zone('tractor');addUtility('tractor','tractor_001',-5.2,-.2,{width:3.1,rotation:-Math.PI/2});
 zone('cart');addUtility('cart','cart_001',-6.3,3.8,{width:2.2,rotation:Math.PI/2});
 cloneModel('bag_001',-4.6,5.2,{height:.75,rotation:-.25});
 cloneModel('bag_002',-5.3,5.05,{height:.72,rotation:.35});
 cloneModel('bucket_001',-4.8,4.45,{height:.62,rotation:.2});
 zone('bakery');
 cloneModel('cart_004',-14.8,12.4,{width:2.2,rotation:.35});
 cloneModel('table_001',-12.7,13.4,{width:1.8,rotation:-.2});
 zone('apiary');
 const hive=cloneModel('apiary_001',10.1,13.8,{height:1.35,rotation:.15});
 cloneModel('apiary_001',11.4,14.2,{height:1.25,rotation:-.2});
 zone('farmhouse');
 // The Animal paddock's hay beside its horse (farm-life.js), on the green east of the fields by the pond since 22 Oct 2026; it stood in
 // front of the silo by the road (15 Oct 2026), where the Feed Mill is now.
 zone('paddock');
 for(const [[x,z,options],[wx,wz]] of [[[19.12,-7.86,{model:'hay_001',width:1.9}],[3.32,-4.86]],[[20.72,-8.16,{model:'hay_001',width:1.7,rotation:.4}],[4.92,-5.16]],[[19.92,-7.96,{model:'hay_001',width:1.5,y:1.2}],[4.12,-4.96]],[[21.92,-7.46,{model:'hay_002',width:1.45,rotation:.2}],[6.12,-4.46]]])
  movedBefore.push([cloneModel(options.model,x,z,options),...asBeforeLayout(()=>placeIn('silo',wx,wz))]);
 zone('chores');
 // By the farmhouse, in front on its east side by the crossroads, where they are seen at once (farm-layout.js HOMES, 15 Oct 2026).
 addUtility('chores','barrel_001',-3.4,-10.7,{height:1.1});
 cloneModel('barrel_001',-2.6,-10.2,{height:1.05});
 zone('stall');
 addUtility('stall','village_stall_001',-11.3,-2.6,{width:2.9,rotation:.15});
 cloneModel('prop_023',-9.2,-2.7,{width:.8});
 zone('coop');
 addBuilding('coop',13,-9.5,{width:4.25,rotation:-Math.PI/2});
 {const pen=buildingViews.get('coop').object,house=cloneModel('coop_002',13,-9.5,{width:1.8});pen.attach(house);}
 // The pen is roomy, with the coop in the middle: 15.4 wide and 11 deep around it.
 // A pen's fences carry its yard's name (pen), so its animals keep inside them (farm-animals.js) and loose props keep out of a pasture.
 const penned=(id,pieces)=>{for(const piece of pieces)piece.userData.pen=id;return pieces;};
 // Since 22 Oct 2026 one rail segment narrower on its west side, so the Feed Mill beside it has room (the owner: "maak de chicken coop ruimte
 // iets kleiner zodat er meer ruimte is voor de feed mill"): the first segment of the back (and front) rail is gone and the west rail
 // stands a segment further east (asBefore).
 {const back=fenceLine(6.4,-15,7),front=fenceLine(6.4,-4,7),side=fenceLine(5.3,-13.9,5,'z'),cut=placeIn('coop',7.5,0)[0];
  for(const o of side){movedBefore.push([o,o.position.x,o.position.z]);o.position.x+=2.2;}
  for(const o of [...back,...front].filter(o=>o.position.x<cut))goneNow(o);
  penned('coop',[...back,...front,...side,...fenceLine(20.7,-13.9,5,'z')].filter(o=>o.parent));}
 // The farmhouse dooryard gets a white picket fence; the rest stay practical rail fencing.
 zone('farmhouse');fenceLine(-16.6,-13.2,4,'x',2.2,'fence_015',0xf2e2bd);
 zone(null);fenceLine(-19,-9,8,'z');   // (the short rail by the Bakery is gone: it fenced nothing)
 // White rail fences run along the two sides of the crops, the same distance from the outer fields; the ends stay open.
 zone('fields');
 fenceLine(-4.4,-.3,15,'z',2.2,'fence_008',0xf2e2bd);fenceLine(9.55,-.3,15,'z',2.2,'fence_008',0xf2e2bd);
 zone('coop');
 const animalAt=(model,x,z,options,building,seed)=>{const o=cloneModel(model,x,z,options);o.userData.building=building;o.userData.pen=building;const [ax,az]=place(x,z);animals.push({obj:o,x:ax,z:az,seed});return o;};
 // The animals stand sideways to the camera (which looks from +x,+z): at about -0.8 they face left, at 2.4 right. Seen head-on or
 // from behind, a low-poly animal looks twisted from up here. The cow only faces right: its head is turned a little, and seen from
 // its left side it seems to stare at the sky.
 // Every animal stands by the building a tap on it opens (15 Oct 2026: two cows, a sheep and a goat stood in the chickens' pen and a
 // tap on one opened the Dairy Barn, which a player found confusing). The pen round the coop is the chickens' own.
 // None at the pen's front left, under the Windmill's tall tap box or its pin, none under the coop's own pin (where a tap collects)
 // and none at the back right behind the trees (checked by tapping on a phone and a computer at zoom 1).
 // The hen at the back left moved in with the pen's west side (22 Oct 2026; it stood at 6.7, -14.05).
 for(const [x,z,r] of [[11.9,-5.75,.2],[15.9,-8.15,2.1],[14.6,-6.4,-.7],[17.2,-6.4,2.3],[8.4,-13.9,2.4],[17.4,-11.8,-.9]]){const hen=animalAt('chicken_001',x,z,{height:.72,rotation:r},'coop',r);if(x===8.4)movedBefore.push([hen,...place(6.7,-14.05)]);}
 // The Dairy Barn's three cows (two black and white, one brown and white, grazing) graze in their own pasture in front of its doors:
 // four rail segments wide and, since 22 Oct 2026, four deep (it was three, as the Goat Shed's: the owner, "geef dieren desnoods wat
 // meer ruimte in hun veld", a cow is two units long), the barn's front between the two short pieces at the back. To make room the
 // chores barrels moved to the farmhouse and the Animal paddock east of it, in front of the silo (farm-layout.js HOMES, farm-life.js).
 zone('dairy');
 // Like the Goat Shed's flock, the cows and the fence are greyed with the barn until it opens (yardDecor).
 const cows=[animalAt('cow_001',-2.4,-8.9,{width:2.4,rotation:2.1},'dairy',.5),animalAt('cow_001',2.3,-9.6,{width:1.85,rotation:2.4},'dairy',3),animalAt('cow_003',-.3,-5.6,{height:1.25,rotation:2.4},'dairy',1.7)];
 const west=fenceLine(-4.7,-11.6,4,'z'),east=fenceLine(4.1,-11.6,4,'z'),back=[...fenceLine(-3.6,-12.7,1),...fenceLine(3,-12.7,1)];
 yardDecor.dairy.push(...cows,...penned('dairy',[...fenceLine(-3.6,-3.9,4),...west,...east,...back]));
 // How it stood until 22 Oct 2026 (asBefore): the barn, its tap box and the back fence one segment nearer, the sides one segment
 // shorter (their new first pieces out of the way), the cows on their old spots. The bucket by the doors follows below.
 {const barn=buildingViews.get('dairy'),was=(o,x,z)=>{const [wx,wz]=place(x,z);movedBefore.push([o,wx,wz]);};
  for(const o of [barn.object,barn.hit,...back])movedBefore.push([o,o.position.x,o.position.z+2.2]);
  for(const o of [west[0],east[0]])movedBefore.push([o,o.position.x+1e4,o.position.z]);
  dairyYard.push(barn.object,barn.hit,...back,west[0],east[0]);
  [[-2.6,-8.2],[2.2,-8],[-.3,-5.4]].forEach(([x,z],i)=>was(cows[i],x,z));for(const cow of cows)dairyEntries.add(cow);}
 // The midgame yards, on the new ground east of the coop and the Family Hall. Like every building that is still to come they
 // stand there from the start, greyed out, with everything that belongs to them (yardDecor).
 // The Bee Yard: a cluster of hives among sunflowers, tapped and greyed as one piece.
 zone('beeyard');
 addBuilding('beeyard',22.7,1.9,{height:1.5,rotation:.2,parts:[['apiary_003',21.4,2.8,{height:1.4,rotation:-.35}],['apiary_002',24,2.9,{height:1.35,rotation:.55}],['apiary_003',22.8,4,{height:1.3,rotation:.1}],['apiary_002',21.3,.8,{height:1.3,rotation:-.15}]]});
 patch(22.7,2.4,6.2,5.6,0xb6bd88,.008);
 for(const [x,z,h] of [[24.6,.4,1.45],[25.4,1.6,1.3],[19.8,2.2,1.4],[20.3,4.1,1.25],[24.9,4.4,1.35]])yardDecor.beeyard.push(cloneModel('plant_007',x,z,{height:h,rotation:-.55+x*.1}));
 // The Sheep Barn faces its pasture, which runs down to the trunk road; the flock grazes in front of the doors.
 zone('sheepbarn');
 // In the Goat Shed's barn since 22 Oct 2026, at the Goat Shed's size (its own red barn became the Warehouse). The two stand at the
 // valley's two ends, never in one picture. Until then (asBefore) the old barn's size: 5.4 wide, 4.4 high and 9 deep.
 // Its roof is slate blue-grey (22 Oct 2026, the owner: "kunnen we dit dak een iets andere kleur geven om het te onderscheiden"): the
 // Goat Shed keeps the barn's brown roof and the Warehouse its green one; the walls stay red.
 addBuilding('sheepbarn',23.8,-15.4,{width:5,height:4.6,depth:8,paint:SHEEP_BARN_ROOF});
 // The old barn itself stands in for it then, every part of it, so what is placed round it by chance does not change.
 {const {object:barn,hit}=buildingViews.get('sheepbarn'),was=cloneModel('hangar_006',23.8,-15.4,{width:5.4,height:4.4,depth:9});was.userData.building='sheepbarn';
  scene.remove(was);gone.push([was,scene.children[scene.children.indexOf(barn)-1]]);fresh.push(barn);outlineBefore.set('sheepbarn',was);
  movedBefore.push([hit,hit.position.x,hit.position.z,{scale:[5.8/5.4,4.7/4.9,9.4/8.4],y:2.2}]);}
 yardDecor.sheepbarn.push(...penned('sheepbarn',[...fenceLine(20.5,-3.6,4),...fenceLine(19.4,-9.1,3,'z'),...fenceLine(28.2,-9.1,3,'z'),...fenceLine(20.5,-10.2,1),...fenceLine(27.1,-10.2,1)]));
 for(const [model,x,z,r] of [['sheep_002',21.6,-7.9,2.2],['sheep_003',24.4,-5.3,2.4],['sheep_002',26.5,-8.3,-1],['sheep_003',22.4,-5,2],['sheep_001',25.6,-6.9,-.6]])yardDecor.sheepbarn.push(animalAt(model,x,z,{width:1.5,rotation:r},'sheepbarn',r));
 yardDecor.sheepbarn.push(cloneModel('hay_001',27,-4.7,{width:1.3,rotation:.3}));
 // The Glasshouse lies along the road, with raised beds and fertilizer beside it.
 zone('glasshouse');
 addBuilding('glasshouse',28.8,1.2,{width:6.5,height:3.25,depth:10.1,rotation:Math.PI/2});
 yardDecor.glasshouse.push(cloneModel('garden_bed_001',25.4,5.6,{width:1.8}),cloneModel('garden_bed_001',27.5,5.6,{width:1.8}),cloneModel('bag_003',30.6,5.5,{height:.8,rotation:-.3}));
 // The Weaving Shed, south of the Glasshouse, with wool bales waiting at the door.
 zone('weaving');
 addBuilding('weaving',26.2,8.5,{width:4.4,height:3.8,depth:7.6});
 yardDecor.weaving.push(cloneModel('bag_001',23.4,6.4,{height:.8,rotation:.4}),cloneModel('bag_002',23.2,7.3,{height:.72,rotation:-.2}),cloneModel('cart_004',23.6,11,{width:1.8,rotation:Math.PI/2}),cloneModel('case_003',28.9,5.4,{width:.9,rotation:.3}));
 // Wave 2. The Goat Shed stands beside the Sheep Barn, its pen running down to the road like the sheep's pasture.
 zone('goatshed');
 addBuilding('goatshed',31.9,-14.6,{width:5,height:4.6,depth:8});
 yardDecor.goatshed.push(...penned('goatshed',[...fenceLine(28.6,-3.8,4),...fenceLine(27.5,-9.3,3,'z'),...fenceLine(36.3,-9.3,3,'z'),...fenceLine(28.6,-10.4,1),...fenceLine(35.2,-10.4,1)]));
 for(const [model,x,z,r] of [['goat_001',29.6,-8.4,2.6],['goat_002',32.2,-6.1,2.2],['goat_001',34.6,-8.7,-.9],['goat_002',30.4,-5.2,1.9],['goat_001',33.9,-4.9,-1]])yardDecor.goatshed.push(animalAt(model,x,z,{width:1.3,rotation:r},'goatshed',r));
 yardDecor.goatshed.push(cloneModel('hay_002',35.3,-5.1,{width:1.1,rotation:.4}));
 // The Pig Farm: the pink barn turned side-on, and in front of it a white-fenced pen, closed all round, where the pigs dig for
 // truffles.
 zone('pigfarm');
 addBuilding('pigfarm',-24.92,-9.08,{width:8.2,rotation:Math.PI/2});
 // In front of the barn's west end (towards the camera), so the barn never hides the fence.
 const [penX,penZ]=[-33.72,-3.38];
 for(const [dx,dz,rotation] of [[-2.2,-2.6,0],[0,-2.6,0],[2.2,-2.6,0],[-2.2,2.6,0],[0,2.6,0],[2.2,2.6,0],[-3.3,-1.3,Math.PI/2],[-3.3,1.3,Math.PI/2],[3.3,-1.3,Math.PI/2],[3.3,1.3,Math.PI/2]])yardDecor.pigfarm.push(...penned('pigfarm',[cloneModel('fence_008',penX+dx,penZ+dz,{width:2.2,rotation})]));
 for(const [model,dx,dz,height,r] of [['pig_003',-1.2,-.6,.9,2.5],['pig_002',1,.9,.85,2.6],['pig_005',.4,-1.3,.58,-.8]])yardDecor.pigfarm.push(animalAt(model,penX+dx,penZ+dz,{height,rotation:r},'pigfarm',r));
 yardDecor.pigfarm.push(cloneModel('hay_002',-26.4,-4.6,{width:1.2,rotation:.5}));
 // The Craft Workshop, a long low workshop east of the Weaving Shed, with wax and wool at the door.
 zone('craftshop');
 addBuilding('craftshop',33.1,9.6,{width:9.4,height:3.25,depth:3.9});
 yardDecor.craftshop.push(cloneModel('table_001',30.6,12.3,{width:1.5,rotation:.2}),cloneModel('barrel_009',35.6,12.1,{height:.8}),cloneModel('bag_002',36.5,11.4,{height:.7,rotation:.5}),cloneModel('case_003',31.9,12.6,{width:.85,rotation:-.3}));
 // The Ranch: a big stable with its horse paddock in front, on the green by the pond.
 zone('ranch');
 addUtility('ranch','hangar_001',31.5,15.2,{width:6.9,height:4.8,depth:11.1,rotation:Math.PI/2});   // about half its own size, like the other barns
 yardDecor.ranch.push(...penned('ranch',[...fenceLine(27.8,25.9,4),...fenceLine(26.7,20.4,3,'z'),...fenceLine(35.5,20.4,3,'z')]));
 for(const [model,x,z,r] of [['horse_003',29.2,22.4,2.2],['horse_004',32.6,24.3,2.3],['horse_005',34,21.2,-.8]]){const horse=cloneModel(model,x,z,{width:2.2,rotation:r});horse.userData.pen='ranch';yardDecor.ranch.push(horse);}
 yardDecor.ranch.push(cloneModel('hay_001',27.9,24.6,{width:1.2,rotation:.3}));
 // The Valley Market: a striped canopy over tables of goods, with market stalls beside it, on the top road out of the valley.
 zone('valleymarket');
 addUtility('valleymarket','hangar_009',0,-29.2,{width:10});
 yardDecor.valleymarket.push(cloneModel('table_001',-2.2,-29.6,{width:1.8,rotation:.1}),cloneModel('table_001',2,-28.9,{width:1.8,rotation:-.15}),cloneModel('case_002',-2.4,-29.8,{width:.8,y:.72}),cloneModel('bag_003',2.2,-29,{height:.55,y:.72}),
  // Two stalls face the road in front of the canopy, where the camera sees them; a cart and a sign at the sides.
  cloneModel('village_stall_001',-2.8,-24.2,{width:2.6}),cloneModel('stall_001',2.9,-24.3,{width:2.9}),cloneModel('case_002',2.2,-24.5,{width:.85,rotation:.2}),cloneModel('case_003',3.5,-24.2,{width:.8,rotation:-.3}),cloneModel('bag_003',3,-23.7,{height:.6,rotation:.4}),
  cloneModel('cart_004',7.6,-26.6,{width:1.9,rotation:.6}),cloneModel('pointer_002',-6.4,-23.8,{height:1.3,rotation:.2}),cloneModel('barrel_001',6.6,-30.2,{height:.95}),cloneModel('barrel_009',7.4,-30.9,{height:.8}),cloneModel('case_003',6.6,-31.2,{width:.9,rotation:.4}));
 // Wave 3, at the east end of the trunk road. The Trade Depot: a long warehouse where the road ends, the export trailer and a
 // truck at its doors, and crates waiting to be loaded.
 zone('tradedepot');
 addUtility('tradedepot','hangar_008',42.7,-11,{width:5.5,depth:11,height:3.4,rotation:Math.PI/2});
 yardDecor.tradedepot.push(cloneModel('trailer_003',39.6,-6.9,{width:5,rotation:Math.PI/2}),cloneModel('truck_005',45.6,-6.7,{width:4.6,rotation:-Math.PI/2}),
  cloneModel('prop_020',36.9,-7.4,{width:.95,rotation:.2}),cloneModel('prop_021',36.8,-8.4,{width:.95,rotation:-.15}),cloneModel('prop_020',36.85,-7.9,{width:.8,y:.9,rotation:.5}),
  cloneModel('prop_021',42.2,-7.1,{width:.9,rotation:.4}),cloneModel('pointer_002',36.2,-5.2,{height:1.3,rotation:-.3}));
 // The Estate Workshop: the manor house across the road, with a workbench, timber and tools in the yard.
 zone('estateworkshop');
 addUtility('estateworkshop','house_005',42.3,2.2,{width:10.2,rotation:Math.PI/2});   // porch and windows towards the camera; a fifth bigger since 27 Sep 2026
 yardDecor.estateworkshop.push(cloneModel('table_001',39.1,5.9,{width:1.6,rotation:.15}),cloneModel('firewood_003',45.6,5.6,{width:1.4,rotation:.4}),cloneModel('case_003',38.2,5.2,{width:.85,rotation:-.3}),
  cloneModel('bag_001',46.4,4.6,{height:.75,rotation:.3}),cloneModel('garden_bed_001',37,1.2,{width:1.8,rotation:Math.PI/2}));
 // The Grand Valley Fair, the final building: one great exhibition hall, close to its model's own size.
 zone('grandfair');
 addUtility('grandfair','house_023',44,12.6,{width:26.5,depth:9.1,height:5.3});
 // Market stalls in front of the hall (Village pack, 27 Sep 2026), greyed out with it until the Fair opens.
 yardDecor.grandfair.push(...[['village_stall_001',34.5],['village_stall_002',40.5],['village_stall_003',47],['village_stall_004',53.5]].map(([name,x])=>cloneModel(name,x,20.2,{width:3.6})),cloneModel('village_melons_001',37.6,19.6,{width:1.1}),cloneModel('village_barrels_001',50.2,19.8,{width:1.6}));
 // After level 90 (27 Sep 2026): the Seed Lab's two test beds beside the Glasshouse, a visitor's horse cart by the road at the Trade
 // Depot, and the signpost to the valley projects by the pond. Greyed out until they open, like every place.
 zone('glasshouse');addUtility('seedlab','garden_bed_002',22.2,5.4,{width:1.9,rotation:Math.PI/2+.1});yardDecor.seedlab=[cloneModel('garden_bed_002',22.3,7.6,{width:1.9,rotation:Math.PI/2-.08})];
 zone('tradedepot');addUtility('visitors','dray_003',49.4,-7.1,{width:3.2,rotation:Math.PI/2});
 zone('pond');addUtility('valleyprojects','pointer_002',12.6,6.8,{height:1.9,rotation:.4});
 // World II (30 Sep 2026): a signpost on the road out of the valley, past the Trade Depot, points to the village. From level 90
 // its pin is a closed bridge (the village opens at 100); below 90 it is not there.
 zone('tradedepot');addUtility('villageroad','pointer_002',53.5,-5.3,{height:2.4,rotation:-.5});
 // Small work yards and low props create breathing room around every building.
 // Organic ground pieces replace flat rectangles so each yard reads as trodden earth, not a shape.
 zone('warehouse');groundPatch('ground_002',-12.5,4,6.4,6.4,0xb8af8a);
 zone('bakery');groundPatch('ground_007',-10.8,12,7,6.9,0xbaaf8b);
 zone('packing');groundPatch('ground_006',11.5,-17.2,6.8,6.4,0xb9af8a);
 for(const [yard,list] of Object.entries({
  packing:[['case_002',9,-14.2,{width:1.1,rotation:.12}],['bag_003',10.25,-14.2,{height:.82,rotation:-.25}],['cart_004',14.7,-17.3,{width:1.7,rotation:Math.PI/2}],['prop_029',8.4,-13.6,{width:.55,rotation:.6}],['bush_003',8.9,-19.6,{width:1.2}]],
  warehouse:[['barrel_002',-16.85,6.3,{height:.95}],['bag_001',-6.75,7.4,{height:.8}],['bag_002',-7.35,7.75,{height:.7}],['bucket_001',-9.15,1.95,{height:.65}],['bush_003',-8.4,8,{width:1.1}],['grass_004',-8.2,8.9,{height:.3}]],
  bakery:[['firewood_003',-14.1,10.5,{width:1.3}],['case_003',-8.1,13.5,{width:.9,rotation:.35}]],
  farmhouse:[['table_001',-13.9,-5.9,{width:1.6}],['chair_001',-15,-6.3,{height:.85,rotation:1.7}],['garden_bed_001',-17.3,-8,{width:1.8,rotation:Math.PI/2}],['garden_bed_001',-17.3,-5.9,{width:1.8,rotation:Math.PI/2}],['firewood_008',-16.1,-4.4,{width:1.45,rotation:.25}]],
  dairy:[['bucket_003',-1.8,-11.3,{height:.65}]],
  apiary:[['barrel_001',10.3,7.1,{height:.9}],['barrel_009',11.6,7.7,{height:.82,rotation:.2}]],
  factory:[['case_002',12.6,24.9,{width:1.1,rotation:.15}],['bag_003',13.8,25.1,{height:.82,rotation:-.3}],['cart_004',20.4,25,{width:1.7,rotation:Math.PI/2}],['prop_029',18.6,25.2,{width:.55,rotation:.5}]]
})){zone(yard);for(const [name,x,z,options] of list){const piece=cloneModel(name,x,z,options),was=WAREHOUSE_PROPS_BEFORE[yard==='warehouse'?name:''];if(was)movedBefore.push([piece,...place(...was)]);if(yard==='factory')factoryDecor.push(piece);else if(yard==='dairy'){yardDecor.dairy.push(piece);movedBefore.push([piece,piece.position.x,piece.position.z+2.2]);dairyYard.push(piece);}}}
 // These sit clear of the roads (which run along x≈-6, z≈-4 and z≈20) and get a warm
 // glow since a plain color tint can only darken a texture, never lighten it.
 zone('packing');lighten(cloneModel('case_001',9.9,-15.1,{width:.95,rotation:-.4}),0x3a2a16,.28);
 zone('farmhouse');
 lighten(cloneModel('dray_004',-18.5,-6.5,{width:2,rotation:.4}),0x3a2a16,.28);
 lighten(cloneModel('dray_002',-18.6,-11.2,{width:1.9,rotation:.5}),0x3a2a16,.28);
 // (The Bakery's little stall stood half inside the building; it went, 27 Sep 2026.)
 // Trees, bushes and tufts are spread out with the farm and keep clear of every yard.
 zone(null);
 // The western boundary keeps tall foliage clear of the Family Hall roof, and no big tree stands between the camera and the hall.
 const trees=[[-19,-16,4],[-20,-10,5],[-19,1,4.5],[-18.8,6,4.7],[-17.4,8.5,4],[-18,12,6.2],[-18,18,4],[-5,19,5.8],[26,12,5.2],[14,15,5.4],[21,1,5.7],[22.5,-10,6],[19,-19,6.1],[4,-21,5.4],[-21,-16,4.8],[1,-24.5,4],[-23,7,6.5],[-25,-1,6.4],[25,-17,7]];
 trees.forEach(([x,z,height],i)=>cloneModel(['tree_001','tree_004','tree_006'][i%3],x,z,{height,rotation:i*1.8}));
 // More trees between the far ones fill the wider ring the spread-out farm needs.
 [[-27,-24,4.4],[-31,-12,5],[-27,17,5.4],[-9,27,5],[9,29,5.8],[27,3,5.6],[27,-12,5.8],[24,-25,6],[12,-31,5.2],[-6,-33,4.6],[-24,-32,5.2],[-10,-30,4.8]].forEach(([x,z,height],i)=>cloneModel(['tree_004','tree_006','tree_001'][i%3],x,z,{height,rotation:i*2.3+.7}));
 // The east end, around the wave-3 column and along the road out of the valley: big trees in loose groups, young ones between them
 // and pines towards the mountain, none of them the same size.
 [[51.5,-11.5,6.2],[60,-12.3,5],[56.5,-14.8,4.2],[50.8,1.5,5.6],[59.2,.8,6.8],[63.8,3.8,4.6],[53,11.5,5.2],[57,15.4,6.4],[50.8,22.3,4.8],[61.5,10,5.8]].forEach(([x,z,height],i)=>cloneModel(['tree_006','tree_001','tree_004'][i%3],x,z,{height,rotation:i*1.7+.4}));
 [[55.4,-8.2,3],[64.6,-9.2,2.6],[54.6,4.6,3.3],[58,21,2.8],[44.6,22.6,3.6],[66,12.5,3.1]].forEach(([x,z,height],i)=>cloneModel(['tree_008','tree_002','tree_005','tree_007'][i%4],x,z,{height,rotation:x*.3}));
 [[47.7,-18.5,4.4],[53.8,-17,3.4],[59,-17.5,5.2],[66,-15,3.8]].forEach(([x,z,height],i)=>cloneModel(['fir_tree_003','fir_tree_001','fir_tree_006'][i%3],x,z,{height,rotation:z*.2}));
 for(const [x,z] of [[-17,-6],[-16.5,-4],[-18.5,9],[-15,12],[21,-3],[18,2],[21,9],[10,15],[2,20],[-21,-15],[11,-16]])cloneModel('bush_001',x,z,{width:2.2,rotation:x});
 for(const [x,z,r] of [[9.4,12.2,.2],[9.8,9.2,1.1],[-13.7,15.2,2.2],[16,5.2,.6]])cloneModel('bush_003',x,z,{width:1.45,rotation:r});
 // Small tufts from the pack add texture while leaving the fields unobstructed.
 for(let i=0;i<54;i++){
  const a=i*2.3999,r=18+(i%7)*1.15,x=Math.cos(a)*r,z=Math.sin(a)*r;
  cloneModel('grass_001',x,z,{height:.25+(i%3)*.1,rotation:a});
 }
 for(const [x,z,r] of [[9.5,13.2,.3],[9.5,11.1,1.8],[-11.2,14.5,.7],[-14.7,14.8,2.1],[15.5,4.5,.4],[17.1,4.9,2.4]])cloneModel('grass_004',x,z,{height:.38,rotation:r});
 farmLife=createFarmLife({scene,cloneModel,patch,state,onOpen:id=>activities.open(id),reducedMotion,simple:graphicsSimple});
 // The Animal paddock's horse and its tap box stood in front of the silo until 22 Oct 2026 (asBefore), where the Feed Mill is now.
 {const horse=farmLife.views.get('paddock')?.object;if(horse){const [ox,oz]=asBeforeLayout(()=>placeIn('paddock',18.62,-9.92)),dx=ox-horse.position.x,dz=oz-horse.position.z;
  for(const o of scene.children.filter(o=>o.userData.activity==='paddock'))movedBefore.push([o,o.position.x+dx,o.position.z+dz]);}}
 zone('fields');
 farmLife.attach('greenhouse',glasshouse);farmLife.attach('apiary',hive);
 // The Feed Mill's smoke puffs came with it (asBefore: they rose from where it stood).
 {const from=scene.children.length;farmLife.watchProduction(buildingViews);const mill=buildingViews.get('mill').object,[ox,oz]=asBeforeLayout(()=>placeIn('mill',-12.5,4));
  for(const o of scene.children.slice(from).slice(3,6))movedBefore.push([o,p=>p.position.x||p.position.z?[p.position.x+ox-mill.position.x,p.position.z+oz-mill.position.z]:[0,0]]);}
 addExtraProps();
}
// Small props from the model pack fill the room between the yards. Spots are taken only where nothing stands: not on a
// building, road, fence, field or the pond, and with room around every animal, so nothing seems to sit on its back from up here.
const ANIMAL=/^(cow|horse|pig|sheep|goat|chicken)_/,FLAT_BLOCKS=/^(road|field)_/;
// The pens (22 Oct 2026): the box round each pen's fences (penned() in decorate), [minX, maxX, minZ, maxZ] in the world, by yard.
function penBoxes(){
 const pens=new Map(),box=new THREE.Box3();
 for(const o of scene.children){
  const id=o.userData.pen;if(!id||ANIMAL.test(o.userData.model??''))continue;
  box.setFromObject(o);const p=pens.get(id);
  pens.set(id,p?[Math.min(p[0],box.min.x),Math.max(p[1],box.max.x),Math.min(p[2],box.min.z),Math.max(p[3],box.max.z)]:[box.min.x,box.max.x,box.min.z,box.max.z]);
 }
 return pens;
}
// The pastures: every pen but the chickens' (whose props stand among them), where the cows, sheep, goats, pigs and horses walk all over.
const pastures=()=>[...penBoxes()].filter(([id])=>id!=='coop').map(([,p])=>p);
// The loose props (below) and the scenery's flowers, bushes and tufts (scenery.js) are placed by seeded chance, every spot depending on
// all the ones before it (and on the order of the farm's pieces): moving one yard would move them all over the farm. So they are placed
// as the farm stood until 22 Oct 2026, every piece where it stood then, in its place in the scene, and the yards where they were
// (farm-layout.js asBeforeLayout): the Dairy Barn's yard before the owner moved it back for the cows ("zoals Koeien door de Koeienstal meer
// naar achteren plaatsen"), the Feed Mill, the silo, the paddock, the chickens' pen and the Sheep Barn before the Warehouse came. What
// then stands on something that moved or is new, or in a pasture, is left out (keptOff); everything else stays where it always stood.
// A piece that is gone now (the pump tower by the old Feed Mill, two rails of the chickens' pen) is out of the scene, kept with the piece
// it came after.
function goneNow(o){gone.push([o,scene.children[scene.children.indexOf(o)-1]]);scene.remove(o);}
const atIndex=(o,i)=>{scene.add(o);scene.children.pop();scene.children.splice(i,0,o);};
// dairy:false: as the farm stood just before the Warehouse came, the Dairy Barn's yard where it is now (the grass, the flowers and the
// mountains of scene-polish.js were placed round that). A piece that a building only covers since then (clipNow) is shown meanwhile.
function asBefore(place,{dairy=true}={}){
 const pose=o=>[o,o.position.x,o.position.z,{ry:o.rotation.y,scale:o.scale.toArray(),y:o.position.y}],moved=dairy?movedBefore:movedBefore.filter(([o])=>!dairyEntries.has(o)&&!dairyYard.includes(o));
 for(const o of clippedNow)o.visible=true;
 const now=moved.map(([o])=>pose(o)),views=['dairy','mill','sheepbarn'].map(key=>[key,buildingViews.get(key)]).filter(([,v])=>v),outlines=views.map(([,v])=>v.outline);
 const frame=then=>{for(const [key,v] of views)v.outline.object=then?outlineBefore.get(key)??v.object:v.object;};
 const put=list=>{frame(list===moved);
  for(const [o,x,z,how] of list){[o.position.x,o.position.z]=typeof x==='function'?x(o):[x,z];if(how?.ry!==undefined)o.rotation.y=how.ry;if(how?.scale)o.scale.fromArray(how.scale);if(how?.y!==undefined)o.position.y=how.y;o.updateMatrixWorld(true);}
  for(const outline of outlines){outline.update();outline.geometry.computeBoundingBox();}
 };
 const out=fresh.map(o=>[o,scene.children.indexOf(o)]).filter(([,i])=>i>=0).sort((a,b)=>b[1]-a[1]);
 for(const [o] of out)scene.remove(o);
 for(const [o,after] of gone)atIndex(o,scene.children.indexOf(after)+1);
 put(moved);
 try{return asBeforeLayout(place);}finally{put(now);for(const [o] of gone)scene.remove(o);for(const [o,i] of out.reverse())atIndex(o,i);for(const o of clippedNow)o.visible=false;}
}
// What a building covers only since the Warehouse came (scene-polish.js hides what clips a building), hidden from then on.
const clippedNow=[];
function clipNow(){const shown=scene.children.filter(o=>o.visible);hideClippedScenery(scene);clippedNow.push(...shown.filter(o=>!o.visible));}
// What the props and the scenery keep off since then: the pastures, and the boxes of every piece that moved or is new, where it stands now
// (the animals keep their own room: the scenery and the props leave space round every animal). dairy: only what the Dairy Barn's yard
// kept off from 22 Oct 2026 until the Warehouse came the same day.
function keptOff(dairy=false){
 const box=new THREE.Box3(),rects=pastures();
 for(const o of dairy?dairyYard:[...movedBefore.map(([o])=>o),...fresh])if(!ANIMAL.test(o.userData.model??'')){box.setFromObject(o);rects.push([box.min.x,box.max.x,box.min.z,box.max.z]);}
 return rects;
}
function addExtraProps(){
 const props=asBefore(placeExtraProps),off=keptOff(),dairyOff=keptOff(true),clear=rects=>p=>rects.every(([a,b,c,d])=>p.x<a-1||p.x>b+1||p.z<c-1||p.z>d+1);
 // One the Warehouse's changes left out is still there while the scenery is placed (asBefore), where it stood then.
 for(const p of props.filter(clear(dairyOff))){const o=cloneModel(p.name,p.x,p.z,p.options);if(clear(off)(p))extraProps.push(o);else goneNow(o);}
}
function placeExtraProps(){
 scene.updateMatrixWorld(true);
 const blocked=[];
 for(const object of scene.children){
  if(object.isLight||object.isCamera||object===scene.getObjectByName('Farm ground'))continue;
  const box=new THREE.Box3().setFromObject(object),model=object.userData.model??'';if(box.isEmpty()||box.getSize(new THREE.Vector3()).y<.03&&!FLAT_BLOCKS.test(model))continue;
  // A helper or station (the delivery cart, the chores barrels) keeps 1.6 clear round it, so no bale hides it (15 Oct 2026).
  blocked.push(ANIMAL.test(model)?box.expandByScalar(1.2):object.userData.utility||object.userData.activity?box.expandByScalar(1.6):box);
 }
 const pond=pondBounds(),fields=[-5.6,-3,10.4,33.6];
 const free=(x,z,r)=>!blocked.some(b=>x>b.min.x-r&&x<b.max.x+r&&z>b.min.z-r&&z<b.max.z+r)
  &&!(x>fields[0]&&x<fields[2]&&z>fields[1]&&z<fields[3])&&!(x>pond[0]-1&&x<pond[2]+1&&z>pond[1]-1&&z<pond[3]+1);
 const anchors=Object.fromEntries(Object.keys(ANCHORS).map(id=>[id,anchorAt(id)]));
 // The roadside props follow the roads of the layout, along their length.
 const roads=roadRects().slice(0,3).map(r=>r.horizontal?[r.minX+3,(r.minZ+r.maxZ)/2,r.maxX-3,(r.minZ+r.maxZ)/2]:[(r.minX+r.maxX)/2,r.minZ+3,(r.minX+r.maxX)/2,r.maxZ-3]);
 return scatterProps({anchors,roads,free,rand:seeded(20260921)});
}
// The mountains around the valley come after the props (scene-polish.js, scenery.js): a prop that ended up where a peak now stands
// is taken away again.
const extraProps=[];
function clearPropsFromMountains(){
 const rock=[];scene.traverse(n=>{if(/^mountain_/.test(n.userData?.model??n.userData?.scenery??''))n.traverse(m=>{if(m.isMesh)rock.push(m);});});
 if(!rock.length)return;
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),from=new THREE.Vector3();
 for(let i=extraProps.length-1;i>=0;i--){const {x,z}=extraProps[i].position;ray.set(from.set(x,80,z),down);
  if((ray.intersectObjects(rock,false)[0]?.point.y??0)>.25){extraProps[i].removeFromParent();extraProps.splice(i,1);}}
}
function createPlots(){
 while(plots.length>state.plots.length){
  const v=plots.pop();v.label.remove();clearCropVisual(v.cropGroup);
  for(const object of [v.soil,v.hit,v.ring,v.cropGroup])scene.remove(object);
  for(const object of [v.hit,v.ring]){object.geometry.dispose();object.material.dispose();}
 }
 for(let i=plots.length;i<state.plots.length;i++){
  const [x,z]=fieldSpot(i);
  const soil=cloneModel('ground_004',x,z,{width:2.38,depth:2.38,height:.20,y:.02});
  soil.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.color.setHex(0xc4b39a);n.userData.plot=i;}});
  const hit=new THREE.Mesh(new THREE.BoxGeometry(2.4,.25,2.4),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));hit.position.set(x,.23,z);hit.userData.plot=i;scene.add(hit);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.5,.56,4,1,Math.PI/4),new THREE.MeshBasicMaterial({color:0xffe081,transparent:true,opacity:.8,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.scale.set(3.2,3.2,1);ring.position.set(x,.247,z);ring.visible=false;scene.add(ring);
  const label=document.createElement('button');label.className='plot-label';label.setAttribute('aria-label',`Field ${i+1}, empty. Plant ${CROPS[selectedCrop].name}.`);label.addEventListener('click',()=>interact(i));label.addEventListener('focus',()=>highlight(i));label.addEventListener('blur',()=>highlight(-1));labels.append(label);
  const cropGroup=new THREE.Group();cropGroup.userData.plot=i;scene.add(cropGroup);
  plots.push({x,z,soil,hit,ring,label,cropGroup,visualCrop:undefined,lastReady:false});
 }
}
// ---- Your own farm layout (24 Oct 2026, the owner: "Doe optie 2"; the rules in game/farm-map.js) ----
// The farm is built as it stands by default (decorate, the scenery: untouched), then every yard and field that was moved goes to its
// spot: a yard's pieces (userData.yard, from the zone they were made in) move together, with their tap boxes, pins, pens and animals.
// Loose scenery under something that moved is hidden (a tuft or a flower one by one).
const yardShift=new Map(),yardTurn=new Map();let layoutKey='{}';
const fieldHome=i=>[-2.15+(i%4)*3.15,.25+Math.floor(i/4)*3.2];
const fieldSpot=i=>state.layout?.at?.[`field:${i}`]??fieldHome(i);
// A yard's pieces that move: the ones on the farm itself (or in a top group: the scenery's, the polish's dirt yards), not a piece inside
// another (a building's parts, the sails in their rotor), which goes with it.
function yardRoots(id){
 const out=[];
 scene.traverse(o=>{if(o.userData.yard!==id)return;const p=o.parent;if(p===scene||p?.parent===scene&&!p.userData.yard)out.push(o);});
 return out;
}
const yardSpot=id=>{const [x,z]=anchorAt(id),[dx,dz]=yardShift.get(id)??[0,0];return [x+dx,z+dz];};
function shiftYard(id,dx,dz){
 if(!dx&&!dz)return;
 for(const o of yardRoots(id)){o.position.x+=dx;o.position.z+=dz;o.updateMatrixWorld(true);}
 for(const views of [buildingViews,utilityViews,farmLife?.views])for(const v of views?.values?.()??[])if(v.object?.userData.yard===id){v.x+=dx;v.z+=dz;v.outline?.update();}
 herd?.shift?.(o=>o.userData.yard===id,dx,dz);
 const [sx,sz]=yardShift.get(id)??[0,0];yardShift.set(id,[sx+dx,sz+dz]);
}
// A quarter turn (24 Oct 2026, the owner: "Rotate building maybe?"): the yard turns round its anchor, every piece, pin and animal with it.
const UP=new THREE.Vector3(0,1,0),QUARTER=-Math.PI/2;
function turnYard(id,quarters){
 quarters=((quarters%4)+4)%4;if(!quarters)return;
 const [px,pz]=yardSpot(id),angle=quarters*QUARTER,c=Math.cos(angle),sn=Math.sin(angle),at=(x,z)=>[px+(x-px)*c+(z-pz)*sn,pz-(x-px)*sn+(z-pz)*c];
 for(const o of yardRoots(id)){[o.position.x,o.position.z]=at(o.position.x,o.position.z);o.rotateOnWorldAxis(UP,angle);o.updateMatrixWorld(true);}
 for(const views of [buildingViews,utilityViews,farmLife?.views])for(const v of views?.values?.()??[])if(v.object?.userData.yard===id){[v.x,v.z]=at(v.x,v.z);v.outline?.update();}
 herd?.turn?.(o=>o.userData.yard===id,[px,pz],angle);
 yardTurn.set(id,((yardTurn.get(id)??0)+quarters)%4);
}
function placeYard(id,[x,z,turn=0]){turnYard(id,turn-(yardTurn.get(id)??0));const [cx,cz]=yardSpot(id);shiftYard(id,x-cx,z-cz);}
function placeField(i,[x,z]){
 const v=plots[i];if(!v)return;const dx=x-v.x,dz=z-v.z;if(!dx&&!dz)return;
 v.x=x;v.z=z;for(const o of [v.soil,v.hit,v.ring,v.cropGroup]){o.position.x+=dx;o.position.z+=dz;o.updateMatrixWorld(true);}
 scenePolish?.sync?.();
}
// The box a yard or a field covers on the ground, [minX, maxX, minZ, maxZ].
function footprint(id){
 const placed=decorViews.get(id)??layoutGhosts.get(id);if(placed)return decorBox(placed.kind,placed.obj.position.x,placed.obj.position.z);
 const field=/^field:(\d+)$/.exec(id);
 if(field){const v=plots[Number(field[1])];return v?[v.x-1.2,v.x+1.2,v.z-1.2,v.z+1.2]:null;}
 const box=new THREE.Box3(),part=new THREE.Box3();
 for(const o of yardRoots(id)){if(o.isBoxHelper||o.type==='BoxHelper')continue;part.setFromObject(o);if(!part.isEmpty())box.union(part);}
 return box.isEmpty()?null:[box.min.x,box.max.x,box.min.z,box.max.z];
}
// ---- Obstacles (milestone 2): the loose trees, bushes and rocks standing on the land (game/farm-map.js LAND), each by its id
// o:<model>:<x×10>:<z×10> (an instanced copy by its own spot). They are in the way of what you move or place; you clear one for coins
// (layout_clear) and it is gone for good. Small things (tufts, flowers, a crate) are no obstacle: they vanish under what you place.
let obstacleMap=null;
const obstacleRef=new WeakMap(),ZERO=new THREE.Matrix4().makeScale(0,0,0);
const obstacleId=(model,x,z)=>`o:${model}:${Math.round(x*10)}:${Math.round(z*10)}`;
function obstacles(){
 if(obstacleMap)return obstacleMap;
 obstacleMap=new Map();
 const add=(model,x,z,ref)=>{
  if(!obstacleKind(model??'')||!landAt(x,z)||inWater(x,z))return null;
  const id=obstacleId(model,x,z);let o=obstacleMap.get(id);if(!o)obstacleMap.set(id,o={id,kind:obstacleKind(model),model,x,z,refs:[]});o.refs.push(ref);return id;
 };
 const visit=o=>{
  if(o.userData.yard||o.userData.plot!==undefined||o.userData.decor)return;
  if(o.isInstancedMesh){if(o.userData.spots)o.userData.spots.forEach(([x,z],i)=>add(o.userData.scenery,x,z,{im:o,i}));return;}
  const model=o.userData.model??o.userData.scenery;
  // One the scenery hides (it clipped a building) is no obstacle; one you cleared is hidden too, and stays known.
  if(!o.visible&&!clearedIds().has(obstacleId(model,o.position.x,o.position.z)))return;
  const id=add(model,o.position.x,o.position.z,{obj:o});if(id)obstacleRef.set(o,id);
 };
 for(const o of scene.children){if(o.isGroup&&(o.name==='Scenery'||o.userData.polish))o.children.forEach(visit);else visit(o);}
 return obstacleMap;
}
const clearedIds=()=>new Set(state.layout?.cleared??[]);
function hideCleared(){
 const gone=clearedIds();if(!gone.size)return;
 for(const [id,o] of obstacles())if(gone.has(id))for(const r of o.refs){if(r.obj)r.obj.visible=false;else{r.im.setMatrixAt(r.i,ZERO);r.im.instanceMatrix.needsUpdate=true;}}
}
// The obstacle a ray hit (an instanced copy by its spot), or null.
function obstacleOf(hit){
 const o=hit.object;
 if(o.isInstancedMesh){if(!o.userData.spots||hit.instanceId==null)return null;const [x,z]=o.userData.spots[hit.instanceId];const id=obstacleId(o.userData.scenery,x,z);return obstacles().has(id)?id:null;}
 for(let p=o;p&&p!==scene;p=p.parent){const id=obstacleRef.get(p);if(id)return id;}
 return null;
}
const standingObstacles=()=>{const gone=clearedIds();return [...obstacles().values()].filter(o=>!gone.has(o.id)).map(({id,kind,x,z})=>({id,kind,x,z}));};

// ---- Paths (24 Oct 2026, the owner: "kan je draggen om een road te tekenen", then "1+2"): flat tiles in the road's own colour (the
// road model's own material, every corner on the one spot of its texture at the middle of the road's top), so tiles side by side make
// one path; the road model as a 2 by 2 tile was a cushion with gaps. An old road is drawn as its pieces once one of them is taken away.
let tileKit=null;
function tileKitOf(){
 if(tileKit)return tileKit;
 let mesh=null;models.get('road_001')?.object.traverse(n=>{if(!mesh&&n.isMesh)mesh=n;});if(!mesh)return null;
 const pos=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv;let top=-Infinity;for(let i=0;i<pos.count;i++)top=Math.max(top,pos.getY(i));
 mesh.geometry.computeBoundingBox();const mid=mesh.geometry.boundingBox.getCenter(new THREE.Vector3());let best=0,dist=Infinity;
 for(let i=0;i<pos.count;i++){if(pos.getY(i)<top-1e-4)continue;const d=Math.hypot(pos.getX(i)-mid.x,pos.getZ(i)-mid.z);if(d<dist){dist=d;best=i;}}
 const geometry=new THREE.BoxGeometry(1,1,1),u=uv?uv.getX(best):0,v=uv?uv.getY(best):0,corners=geometry.attributes.uv;for(let i=0;i<corners.count;i++)corners.setXY(i,u,v);
 return tileKit={geometry,material:roadMaterial(Array.isArray(mesh.material)?mesh.material[0]:mesh.material)};
}
function makeTile(x,z,width,depth,height=.13,y=-.035){
 const kit=tileKitOf(),m=new THREE.Mesh(kit.geometry,kit.material);m.scale.set(width,height,depth);m.position.set(x,y+height/2,z);m.receiveShadow=true;scene.add(m);return m;
}
// The valley's old roads (game/farm-map.js OLD_ROADS) as decorate and farm-life.js drew them, found by where they stand.
let roadViews=null;const roadsAway=new Set();
function oldRoads(){
 if(roadViews)return roadViews;
 roadViews=OLD_ROADS.map((box,i)=>{
  const cx=(box[0]+box[1])/2,cz=(box[2]+box[3])/2;let obj=null;
  scene.traverse(o=>{if(!obj&&(o.userData.model??o.userData.scenery)==='road_001'&&!o.userData.decor&&Math.abs(o.position.x-cx)<.6&&Math.abs(o.position.z-cz)<.6)obj=o;});
  return {i,obj,pieces:[]};
 });
 return roadViews;
}
// What is taken away: saved (state.layout.roads) and, while you erase, not saved yet (roadsAway).
function syncRoads(){
 const gone=new Set([...(state.layout?.roads??[]),...roadsAway]),pieces=roadPieces();
 for(const v of oldRoads()){
  for(const m of v.pieces)scene.remove(m);v.pieces=[];
  const mine=pieces.filter(p=>p.road===v.i),cut=mine.some(p=>gone.has(p.id));
  if(v.obj)v.obj.visible=!cut;if(!cut)continue;
  const {height,y}=ROADS[v.i];
  for(const p of mine)if(!gone.has(p.id)){const [a,b,c,d]=p.box,m=makeTile(p.x,p.z,b-a,d-c,height,y);m.userData.roadPiece=p.id;v.pieces.push(m);}
 }
}
// The roads' boxes for what fits: an old road whole, or the pieces left of it; the road out of the valley as it is.
function roadBoxes(){
 const gone=new Set([...(state.layout?.roads??[]),...roadsAway]),pieces=roadPieces(),boxes=[];
 OLD_ROADS.forEach((box,i)=>{const mine=pieces.filter(p=>p.road===i);if(mine.some(p=>gone.has(p.id)))boxes.push(...mine.filter(p=>!gone.has(p.id)).map(p=>p.box));else boxes.push(box);});
 return boxes.concat(roadRects().slice(OLD_ROADS.length).map(r=>[r.minX,r.maxX,r.minZ,r.maxZ]));
}
// ---- Trees and path tiles you placed (milestone 3: layout_buy, layout_place, layout_store), drawn from state.layout.added.
const DECOR_LOOK=Object.freeze({
 path:{model:'road_001',width:2,depth:2,height:.13,y:-.035,half:1},
 oak:{model:'tree_004',height:5.2,half:.8},pine:{model:'fir_tree_001',height:4.8,half:.8},
 birch:{model:'tree_008',height:3.4,half:.7},shrub:{model:'bush_001',width:2.2,half:.9},
 // 24 Oct 2026 (the owner: "Doe 1,2,3"): a fence along its cell, flowers and tall grass in clumps (drawn), and more to place.
 fence:{model:'fence_001',width:2,half:1},flowers:{model:'plant_008',height:.75,half:1,clump:9},grass:{model:'grass_001',height:.7,half:1,clump:10},
 bench:{model:'chair_001',height:1.1,half:.8},flowerbed:{model:'garden_bed_001',width:2,half:1},haybale:{model:'hay_001',width:1.4,half:.7},
 barrels:{model:'barrel_001',height:1.1,half:.6},cart:{model:'cart_003',width:2,half:1},firewood:{model:'firewood_005',width:1.6,half:.8}
});
// A model the farm has not loaded yet (the bench, the flower bed…) is loaded when it is first needed; what waited for it is drawn then.
const decorLoading=new Map();
function decorReady(kind){
 const name=DECOR_LOOK[kind]?.model;if(!name||kind==='path'||models.has(name))return true;
 if(!decorLoading.has(name))decorLoading.set(name,loadModel(name).catch(()=>{}).then(()=>{applyLayout();}));
 return false;
}
const decorViews=new Map();
function makeDecor(kind,x,z,id,turn=0){
 if(kind==='path'){const tile=makeTile(x,z,2,2);tile.userData.decor=id;tile.userData.decorKind=kind;return tile;}
 if(!decorReady(kind))return null;
 const look=DECOR_LOOK[kind],before=currentZone();zone('fields',{keep:true});let o;
 if(look.clump){
  // A clump: a few small plants round the cell's middle, each its own size and turn (fixed by the spot, so it looks the same each visit).
  o=new THREE.Group();o.position.set(x,0,z);scene.add(o);
  for(let i=0;i<look.clump;i++){const a=i*2.4+x*.37+z*.21,r=.15+(i%4)*.22,p=cloneModel(look.model,0,0,{height:look.height*(.8+(i%3)*.15),rotation:a});scene.remove(p);p.position.set(Math.cos(a)*r,0,Math.sin(a)*r);o.add(p);}
 }else o=cloneModel(look.model,x,z,{width:look.width,depth:look.depth,height:look.height,y:look.y??0,rotation:kind==='fence'?(turn?Math.PI/2:0):(x*.7+z*.3)%6.28});
 zone(before,{keep:true});o.userData.decor=id;o.userData.decorKind=kind;return o;
}
const decorBox=(kind,x,z)=>{const r=DECOR_LOOK[kind].half;return [x-r,x+r,z-r,z+r];};
function syncDecor(){
 const want=new Map((state.layout?.added??[]).map(d=>[d.id,d]));
 for(const [id,v] of decorViews)if(want.get(id)?.kind!==v.kind||(want.get(id).turn??0)!==v.turn){scene.remove(v.obj);decorViews.delete(id);}
 for(const [id,d] of want){
  let v=decorViews.get(id);
  if(!v){const obj=makeDecor(d.kind,d.x,d.z,id,d.turn??0);if(!obj)continue;v={obj,kind:d.kind,turn:d.turn??0};decorViews.set(id,v);}
  v.obj.position.set(d.x,v.obj.position.y,d.z);v.obj.updateMatrixWorld(true);
 }
}

// Loose scenery under something that moved or that you placed is hidden (an obstacle never: it is in the way instead), and what you
// cleared stays gone.
const layoutHidden=new Set(),instancesHidden=new Map();
function hideUnderLayout(extra=[]){
 for(const o of layoutHidden)o.visible=true;layoutHidden.clear();
 for(const [im,list] of instancesHidden){for(const [i,m] of list)im.setMatrixAt(i,m);im.instanceMatrix.needsUpdate=true;}instancesHidden.clear();
 const covered=[...new Set([...Object.keys(state.layout?.at??{}),...extra])].map(footprint).filter(Boolean)
  .concat([...decorViews.values()].map(v=>decorBox(v.kind,v.obj.position.x,v.obj.position.z)));
 if(covered.length){
  const under=(x,z,m=0)=>covered.some(([a,b,c,d])=>x>a-m&&x<b+m&&z>c-m&&z<d+m);
  const box=new THREE.Box3(),c=new THREE.Vector3(),m=new THREE.Matrix4(),p=new THREE.Vector3();
  const loose=o=>!o.userData.yard&&!o.userData.decor&&o.userData.plot===undefined&&!o.isLight&&!o.isCamera&&o.name!=='Farm ground'&&o.name!=='Crop meadow'&&!/^(road|ground)_/.test(o.userData.model??o.userData.scenery??'')&&o.userData.roadPiece===undefined;
  const check=o=>{
   if(o.isInstancedMesh){
    if(obstacleKind(o.userData.scenery??''))return;
    const list=[];for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);p.setFromMatrixPosition(m);if(under(p.x,p.z)){list.push([i,m.clone()]);o.setMatrixAt(i,ZERO);}}
    if(list.length){o.instanceMatrix.needsUpdate=true;instancesHidden.set(o,list);}return;
   }
   if(!o.visible||obstacleRef.has(o))return;box.setFromObject(o);if(box.isEmpty())return;box.getCenter(c);
   if(under(c.x,c.z,.3)){o.visible=false;layoutHidden.add(o);}
  };
  obstacles();
  for(const o of scene.children){if(!loose(o))continue;if(o.isGroup&&(o.name==='Scenery'||o.userData.polish))o.children.forEach(k=>{if(!k.userData.yard&&!k.userData.decor)check(k);});else check(o);}
 }
 hideCleared();
}
function applyLayout(){
 if(villageWorld||!ready&&!plots.length)return;
 for(const id of LAYOUT_YARDS)placeYard(id,state.layout?.at?.[id]??anchorAt(id));
 state.plots.forEach((_,i)=>placeField(i,fieldSpot(i)));
 syncDecor();syncRoads();hideUnderLayout();
 if(renderer){renderer.shadowMap.needsUpdate=true;measureFarm();}
}
// The land that is not open yet, while you move things (milestone 2): greyed, with the level it opens at.
let landViews=null;
function showLand(on){
 if(!landViews){
  if(!on)return;
  landViews=LAND.map(piece=>{
   const [a,b,c,d]=piece.box,mesh=new THREE.Mesh(new THREE.PlaneGeometry(b-a,d-c),new THREE.MeshBasicMaterial({color:0x7d7769,transparent:true,opacity:.3,depthWrite:false}));
   mesh.rotation.x=-Math.PI/2;mesh.position.set((a+b)/2,.09,(c+d)/2);mesh.renderOrder=2;mesh.visible=false;scene.add(mesh);
   const label=document.createElement('span');label.className='land-label';label.hidden=true;$('building-labels').append(label);
   return {piece,mesh,label};
  });
 }
 const level=levelProgress(state).level;
 for(const v of landViews){const locked=on&&level<v.piece.level;v.mesh.visible=locked;v.label.hidden=!locked;if(locked&&v.shown!==v.piece.level){v.shown=v.piece.level;v.label.innerHTML=`${art('land-locked')}<span></span>`;v.label.querySelector('span').textContent=`Opens at level ${v.piece.level}`;}v.locked=locked;}
}
function positionLandLabels(width,height){
 if(!landViews||!layoutEditor?.active())return;
 for(const v of landViews){
  if(!v.locked)continue;const [a,b,c,d]=v.piece.box,p=new THREE.Vector3((a+b)/2,.5,(c+d)/2).project(camera),x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height;
  v.label.style.left=`${x}px`;v.label.style.top=`${y}px`;v.label.hidden=Math.abs(p.x)>.94||Math.abs(p.y)>.9;
 }
}
// The Move button (layout-edit.js): what is under the pointer, the ground under it, and the spot on the ground, green or red.
let layoutEditor=null,layoutMarker=null,layoutBase=null;
function aimAt(event){const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);}
const layoutGhosts=new Map();
function layoutPick(event){
 aimAt(event);
 // A tree or tile you placed comes first when the tap is inside its box (a thin trunk is easy to miss, and a field lies under it).
 const ground=raycaster.ray.intersectPlane(groundPlane,new THREE.Vector3());
 if(ground)for(const [id,v] of [...layoutGhosts,...decorViews]){const [a,b,c,d]=decorBox(v.kind,v.obj.position.x,v.obj.position.z);if(ground.x>a&&ground.x<b&&ground.z>c&&ground.z<d)return id;}
 for(const hit of raycaster.intersectObjects(scene.children,true)){
  if(!hit.object.visible)continue;
  const obstacle=obstacleOf(hit);if(obstacle)return obstacle;
  for(let o=hit.object;o&&o!==scene;o=o.parent){if(o.userData.decor)return o.userData.decor;if(o.userData.yard)return o.userData.yard;if(o.userData.plot!==undefined)return `field:${o.userData.plot}`;}
 }
 // A tap on the soil between a field's plants takes the field.
 const field=ground?plots.findIndex(v=>Math.abs(ground.x-v.x)<1.2&&Math.abs(ground.z-v.z)<1.2):-1;
 return field>=0?`field:${field}`:null;
}
const groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
function layoutGround(event){aimAt(event);const at=raycaster.ray.intersectPlane(groundPlane,new THREE.Vector3());return at?[at.x,at.z]:null;}
const layoutSpot=id=>{const placed=decorViews.get(id)??layoutGhosts.get(id);if(placed)return [placed.obj.position.x,placed.obj.position.z];const field=/^field:(\d+)$/.exec(id);if(field){const v=plots[Number(field[1])];return [v.x,v.z];}return [...yardSpot(id),yardTurn.get(id)??0];};
function layoutPreview(id,at){const placed=decorViews.get(id)??layoutGhosts.get(id),field=/^field:(\d+)$/.exec(id);if(placed){placed.obj.position.x=at[0];placed.obj.position.z=at[1];placed.obj.updateMatrixWorld(true);}else if(field)placeField(Number(field[1]),at);else placeYard(id,at);hideUnderLayout([id]);renderer.shadowMap.needsUpdate=true;}
// The held thing's box follows it from where it was picked up; everything else is measured once, when something is picked up.
function layoutFootprint(id){
 if(layoutBase?.id!==id){
  const others=[...LAYOUT_YARDS,'farmhouse',...plots.map((_,i)=>`field:${i}`),...decorViews.keys()].filter(k=>k!==id).map(footprint).filter(Boolean);
  layoutBase={id,box:footprint(id),spot:layoutSpot(id),others};
 }
 const [x,z]=layoutSpot(id),dx=x-layoutBase.spot[0],dz=z-layoutBase.spot[1],b=layoutBase.box;
 return b&&[b[0]+dx,b[1]+dx,b[2]+dz,b[3]+dz];
}
function layoutMark(box,ok){
 if(!layoutMarker){layoutMarker=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({transparent:true,opacity:.34,depthWrite:false,depthTest:false}));layoutMarker.rotation.x=-Math.PI/2;layoutMarker.renderOrder=10;scene.add(layoutMarker);}
 layoutMarker.visible=Boolean(box);if(!box)return;
 layoutMarker.scale.set(box[1]-box[0],box[3]-box[2],1);layoutMarker.position.set((box[0]+box[1])/2,.06,(box[2]+box[3])/2);
 layoutMarker.material.color.setHex(ok?0x58b865:0xe0624c);
}
// Rotate: a quarter turn that keeps the yard's middle where it was (snapped to the grid), so it turns in place.
function layoutRotate(id,[x,z,turn=0]){
 const mid=b=>[(b[0]+b[1])/2,(b[2]+b[3])/2],[x0,z0]=mid(footprint(id));
 const next=(turn+1)%4;placeYard(id,[x,z,next]);
 const [x1,z1]=mid(footprint(id)),at=[Math.round((x+x0-x1)/LAYOUT_GRID)*LAYOUT_GRID,Math.round((z+z0-z1)/LAYOUT_GRID)*LAYOUT_GRID,next];
 placeYard(id,at);layoutBase=null;hideUnderLayout([id]);renderer.shadowMap.needsUpdate=true;
 return at;
}
// Drawing a path (layout-edit.js brush): what stands in the way (everything but the tiles this drag takes away), the tile or old road
// piece under a spot ({id, kind}: an old road piece comes back as a path tile), and the drag on the screen: its new tiles, and what it takes away hidden until it is saved.
function pathOthers(skip=new Set()){
 return [...LAYOUT_YARDS,'farmhouse',...plots.map((_,i)=>`field:${i}`),...[...decorViews.keys()].filter(id=>!skip.has(id))].map(footprint).filter(Boolean);
}
function layoutPathAt([x,z]){
 for(const [id,v] of decorViews)if(DECOR[v.kind]?.draw&&v.obj.visible&&Math.abs(v.obj.position.x-x)<1&&Math.abs(v.obj.position.z-z)<1)return {id,kind:v.kind};
 const gone=new Set([...(state.layout?.roads??[]),...roadsAway]),piece=roadPieces().find(p=>!gone.has(p.id)&&x>p.box[0]&&x<p.box[1]&&z>p.box[2]&&z<p.box[3]);
 return piece?{id:piece.id,kind:'path'}:null;
}
let brushTiles=[],brushHidden=[];
function layoutBrush({kind='path',add,remove}){
 for(const m of brushTiles)scene.remove(m);brushTiles=add.map(([x,z,turn])=>makeDecor(kind,x,z,`new:${kind}`,turn)).filter(Boolean);
 for(const o of brushHidden)o.visible=true;brushHidden=[];roadsAway.clear();
 for(const id of remove){const d=decorViews.get(id);if(d){d.obj.visible=false;brushHidden.push(d.obj);}else roadsAway.add(id);}
 syncRoads();renderer.shadowMap.needsUpdate=true;
}
// Build: a new tree or tile where the middle of the view meets the ground, picked up as new:<kind> until it is bought or placed.
function layoutSpawn(kind){
 const rect=renderer.domElement.getBoundingClientRect(),at=layoutGround({clientX:rect.left+rect.width/2,clientY:rect.top+rect.height*.45});if(!at)return null;
 const id=`new:${kind}`,spot=at.map(v=>Math.round(v/LAYOUT_GRID)*LAYOUT_GRID);
 layoutDiscard(id);const obj=makeDecor(kind,spot[0],spot[1],id);if(!obj){toast('One moment…');return null;}layoutGhosts.set(id,{obj,kind});
 return {id,at:spot};
}
function layoutDiscard(id){const ghost=layoutGhosts.get(id);if(!ghost)return;scene.remove(ghost.obj);layoutGhosts.delete(id);hideUnderLayout();}
function layoutSave(id,[x,z,turn],{fresh,kind}={}){
 const action=fresh?{type:(state.layout?.stored?.[kind]??0)>0?'layout_place':'layout_buy',kind,x,z}:{type:'layout_move',id,x,z,...(turn?{turn}:{})};
 return runAction(action).finally(()=>{layoutBase=null;});
}
// ---- Visiting a farm (24 Oct 2026, the owner: "Zorg ook dat je andermans boerderij kan visiten"). Visit farm on a farmer's profile
// (src/player-profiles.js) asks farm-api for their farm as it stands (farm_visit: never their coins, diamonds or stock) and opens this same
// page over your own, with a bridge of its own: it loads their farm, refuses every action and lends the chat and the boards from yours.
// Your farm stops drawing meanwhile; Back to my farm takes the visit away. Not from the village, an admin's view or a visit.
let visitLayer=null;
async function openVisit(playerId){
 if(visitLayer||villageWorld||adminView)return;
 const real=window.parent.harvestBridge;let data;
 try{data=await real.request({operation:'farm_visit',playerId});}catch(error){toast(error?.message||'That farm could not be opened.');return;}
 if(!data?.state)return;
 const profile={player_id:playerId,username:data.visit.username,avatar_id:data.visit.avatarId,level:data.visit.level,currency:0};
 const initial={state:data.state,profile,serverNow:data.serverNow,visit:data.visit,welcome:null,emailCheck:{needed:false,email:'',canChange:false}};
 const locked=()=>Promise.reject(Object.assign(new Error('You are visiting this farm. Go back to your own farm to play.'),{code:'ACTION_REJECTED'}));
 window.harvestBridge=Object.assign(Object.create(real),{
  playerId:real.playerId,serverNow:data.serverNow,serverAt:Date.now(),pending:false,presence:null,notifications:null,signIn:null,
  takeInitial:()=>structuredClone(initial),trackGame(){},trackCommerce(){},trackShare(){},
  request:body=>body?.operation==='action'?locked():body?.operation==='load'?Promise.resolve({state:structuredClone(data.state),profile,serverNow:Date.now()}):real.request(body)
 });
 visitLayer=document.createElement('div');visitLayer.id='visit-layer';
 const frame=document.createElement('iframe');frame.title=`${data.visit.username}'s farm`;frame.src=`${location.pathname}?visit=1`;visitLayer.append(frame);
 document.body.append(visitLayer);document.documentElement.classList.add('visiting');
}
function closeVisit(){if(!visitLayer)return;visitLayer.remove();visitLayer=null;delete window.harvestBridge;document.documentElement.classList.remove('visiting');renderer.shadowMap.needsUpdate=true;}
if(!villageWorld&&!adminView){window.harvestVisit=playerId=>void openVisit(playerId);window.harvestCloseVisit=closeVisit;}
// On the farm you visit: whose farm it is, its level, and the way back.
function showVisitBar(){
 const visit=visitInfo;if(!visitView||!visit)return;
 const bar=document.createElement('div');bar.className='visit-bar';bar.setAttribute('role','group');
 bar.innerHTML=`<p><strong></strong><span class="visit-level"></span></p><button type="button" class="primary-button">Back to my farm</button>`;
 bar.querySelector('strong').textContent=`${visit.username}'s farm`;bar.querySelector('.visit-level').textContent=`Level ${visit.level}`;
 bar.querySelector('button').onclick=()=>{try{window.parent.harvestCloseVisit?.();}catch{}};
 $('game').append(bar);
}
// Moving things is on unless this device switched it off (Settings › Graphics, bindGraphicsSetting).
const MOVE_KEY='harvest-tycoon:move-things';
function movingOn(){try{return localStorage.getItem(MOVE_KEY)!=='off';}catch{return true;}}
function showMoving(){const on=Boolean(layoutEditor)&&movingOn();for(const id of ['layout-button','layout-menu-entry'])$(id).hidden=!on;if(!on)layoutEditor?.stop();}
function createLayoutTools(){
 layoutEditor=createLayoutEditor({bar:$('layout-bar'),level:()=>levelProgress(state).level,coins:()=>state.coins,stored:()=>state.layout?.stored??{},
  pick:layoutPick,groundAt:layoutGround,spotOf:layoutSpot,preview:layoutPreview,
  footprint:layoutFootprint,others:(id,skip)=>{if(skip)return pathOthers(skip);layoutFootprint(id);return layoutBase.others;},roads:roadBoxes,
  pathAt:layoutPathAt,brush:layoutBrush,savePaths:edit=>runAction({type:'layout_draw',...edit}).finally(()=>{layoutBase=null;}),
  blockers:standingObstacles,mark:layoutMark,rotate:layoutRotate,spawn:layoutSpawn,discard:layoutDiscard,save:layoutSave,
  store:id=>runAction({type:'layout_store',id}).finally(()=>{layoutBase=null;}),clear:id=>runAction({type:'layout_clear',id}).finally(()=>{layoutBase=null;}),
  notify:toast,refresh:icons,
  onToggle:on=>{$('layout-button').setAttribute('aria-pressed',String(on));$('tooltip').hidden=true;layoutBase=null;showLand(on);if(on){obstacles();for(const kind of Object.keys(DECOR_LOOK))decorReady(kind);}else{shootMinimap();renderer.shadowMap.needsUpdate=true;}}});
 $('layout-button').addEventListener('click',()=>layoutEditor.active()?layoutEditor.stop():layoutEditor.start());
 showMoving();
}
// A building is busy while one of its batches is still being made (the Windmill's sails turn).
const buildingBusy=key=>productionJobs(state.buildings[key]).some(j=>j.readyAt>farmNow());
// cut (Oct 2026): a sweep's harvest also tips the plants over as they go, the way the sickle went (cropMotion.pick).
function drawCrop(i,cut=0){
 const p=state.plots[i],v=plots[i];
 if(v.visualCrop!==p.crop){
  // A ripe crop that leaves its field was harvested: its plants are picked, going down into the soil (cropMotion tidies them up).
  const picked=v.visualCrop&&v.lastReady&&cropMotion.pick(v.cropGroup,cut),fresh=v.visualCrop!==undefined;
  if(!picked)v.rows?.dispose();
  v.rows=null;clearCropVisual(v.cropGroup);v.visualCrop=p.crop;
  if(p.crop){
   const c=CROPS[p.crop];
   if(p.crop==='polebeans'){
    // Four bean poles, each hung with long green pods.
    for(const [dx,dz] of [[-.5,-.5],[.5,-.5],[-.5,.5],[.5,.5]]){
     const o=cloneModel(c.model,0,0,{height:1.45,rotation:.5+dx});scene.remove(o);v.cropGroup.add(o);o.position.set(dx,0,dz);
     for(let j=0;j<3;j++){const pod=new THREE.Mesh(beanPodGeometry,beanPodMaterial);pod.scale.set(.07,.26,.07);pod.position.set(dx+Math.cos(j*2.1)*.15,.5+j*.26,dz+Math.sin(j*2.1)*.15);pod.rotation.z=.2-j*.15;v.cropGroup.add(pod);}
    }
   }else if(c.perennial){
    const o=cloneModel(c.model,0,0,{height:c.height,width:['apples','ciderapples','cherries'].includes(p.crop)?1.9:1.7,depth:['apples','ciderapples','cherries'].includes(p.crop)?1.9:1.7,rotation:.5});scene.remove(o);v.cropGroup.add(o);o.position.set(0,0,0);
   }else if(['pumpkin','squash'].includes(p.crop)){
    // One sprawling vine fills the field; four would spill over onto the next one.
    const o=cloneModel(c.model,0,0,{width:p.crop==='squash'?2.1:2.05,rotation:Math.PI/2});scene.remove(o);v.cropGroup.add(o);o.position.set(0,0,0);
   }else if(isRowCrop(p.crop)){
    // Rows of plants, one instanced mesh per field (crop-rows.js): grain as a dense field of stalks, the rest 3 by 3.
    v.rows=buildRows({crop:p.crop,entry:models.get(c.model),height:c.height,tint:c.tint,seed:i+1,pods:p.crop==='greenbeans'?{geometry:beanPodGeometry,material:beanPodMaterial}:null,fresh,motion:cropMotion});
    v.cropGroup.add(v.rows.mesh);if(v.rows.podMesh)v.cropGroup.add(v.rows.podMesh);
   }else{
    const offsets=['wheat','barley'].includes(p.crop)?[-.65,0,.65].flatMap(x=>[-.65,0,.65].map(z=>[x,z])):[[-.55,-.55],[.55,-.55],[-.55,.55],[.55,.55]];
    for(const [dx,dz] of offsets){
     const o=cloneModel(c.model,0,0,{height:c.height,rotation:p.crop==='sunflower'?-.55:.5+i*.22});scene.remove(o);v.cropGroup.add(o);o.position.set(dx,0,dz);if(p.crop==='greenbeans'){for(let j=0;j<3;j++){const pod=new THREE.Mesh(beanPodGeometry,beanPodMaterial);pod.scale.set(.065,.23,.065);pod.position.set(dx+Math.cos(j*2)*.16,.45+j*.19,dz+Math.sin(j*2)*.16);pod.rotation.z=.25-j*.2;v.cropGroup.add(pod);}}if(c.tint&&c.season)o.traverse(n=>{if(n.isMesh){n.material=recolored(n.material,c.tint,`crop-${p.crop}`);n.material.userData.farmCropOwned=true;}});else if(c.tint)o.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.userData.farmCropOwned=true;n.material.color.setHex(c.tint);}});
    }
   }
  }
 }
 v.cropGroup.position.set(v.x,.25,v.z);
 const pg=progress(p,farmNow()),ripe=p.crop&&farmNow()>=p.readyAt;
 if(v.rows){v.cropGroup.scale.setScalar(1);v.rows.update(pg,ripe);}
 else{
  // Trees, vines and bean poles grow as one, and wiggle once when they are ready (the rows do the same in crop-rows.js).
  v.groupScale=p.crop?(CROPS[p.crop].perennial&&p.harvestCycles>0?.85+.15*pg:.12+.88*Math.pow(pg,.6)):1;
  if(p.crop&&ripe&&v.lastReady===false&&v.seen)cropMotion.hopGroup(v,'ripe');
  if(!cropMotion.isHopping(v))v.cropGroup.scale.setScalar(v.groupScale);
 }
 v.seen=true;
 v.soil.traverse(n=>{if(n.isMesh)n.material.color.setHex(p.watered?0x8b8a82:0xc4b39a)});
 if(!p.crop){v.label.innerHTML='';v.label.dataset.crop='';v.label.className='plot-label';v.label.setAttribute('aria-label',`Field ${i+1}, empty. Plant ${CROPS[selectedCrop].name}.`);}
 else if(ripe){
  // Each ripe crop shows its own picture (18 Oct 2026, the owner: more like a game); the crate only for a crop without one.
  if(!v.lastReady||!v.label.querySelector('.game-art'))v.label.innerHTML=art(p.crop)||art('vegetables');
  v.label.className='plot-label ready';v.label.setAttribute('aria-label',`Harvest ${CROPS[p.crop].name} from field ${i+1}`);
 }else{
  const remaining=p.readyAt-farmNow(),time=mobileLayout.matches?(remaining>=3600000?(m=>`${Math.floor(m/60)}h${m%60?String(m%60).padStart(2,'0'):''}`)(Math.ceil(remaining/60000)):remaining>=60000?`${Math.ceil(remaining/60000)}m`:`${Math.ceil(Math.max(0,remaining)/1000)}s`):formatDuration(remaining);
  // A ring that fills as the crop grows, with the crop's picture and the time left: small, so it covers little of the field.
  // When extra care opens, the ring pulses. Built once per planting; each tick only the time and the fill change.
  if(v.label.dataset.crop!==p.crop||!v.label.querySelector('.plot-timer-ring')){v.label.innerHTML=`<span class="plot-timer-ring">${art(p.crop)}</span><b class="plot-timer-time"></b>`;v.label.dataset.crop=p.crop;}
  const grown=Math.min(1,Math.max(0,(farmNow()-p.plantedAt)/Math.max(1,p.readyAt-p.plantedAt))),careReady=!p.tended&&farmNow()>=p.careAt;
  v.label.style.setProperty('--grow',(grown*100).toFixed(1));v.label.querySelector('.plot-timer-time').textContent=time;
  v.label.className=`plot-label plot-timer${p.watered?' watered':''}${careReady?' care-ready':''}${p.tended?' tended':''}${v.grouped?' is-grouped':''}`;v.label.setAttribute('aria-label',`${CROPS[p.crop].name}, field ${i+1}, ${formatDuration(p.readyAt-farmNow())} remaining${p.watered?', watered':''}`);
 }
 v.lastReady=ripe;
}
function highlight(id){hovered=id;plots.forEach((v,i)=>v.ring.visible=i===id||swept.has(i));for(const [key,v] of buildingViews)v.outline.visible=key===id;world.style.cursor=id!==-1?'pointer':'grab';}
// count: a sweep's field gets a small burst of its own (Oct 2026: 13 a field ran into the cap of 100 after seven or eight fields).
function particleBurst(id,water=false,count=13){
 if(reducedMotion)return;
 const v=plots[id];
 for(let i=0;i<count&&particles.length<100;i++){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(water?.045:.055,4,3),new THREE.MeshBasicMaterial({color:water?0x88d0e0:[0xffdb69,0xfff2bb,0xf6bf42][i%3],transparent:true}));
  mesh.position.set(v.x,.9,v.z);scene.add(mesh);particles.push({mesh,velocity:new THREE.Vector3((Math.random()-.5)*2,1.5+Math.random()*1.5,(Math.random()-.5)*2),life:1});
 }
}
// A little confetti (21 Oct 2026, item 2: your farmer celebrates a level-up or an event won): the harvest's particles, flat, thrown up
// from a spot, in the game's colours made bright (buttons.css's green, gold, red and diamond blue, and the harvest's light gold; not
// toned down by the farm's light, or a speck of it is lost on the grass). Never with reduced motion.
const CONFETTI=[0x58b865,0xf2b544,0xe0624c,0x7fc3ea,0xffe58a];
function confettiAt(x,y,z,count=22){
 if(reducedMotion)return;
 for(let i=0;i<count&&particles.length<100;i++){
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.3,.18),new THREE.MeshBasicMaterial({color:CONFETTI[i%CONFETTI.length],transparent:true,side:THREE.DoubleSide,toneMapped:false}));
  mesh.position.set(x,y,z);mesh.rotation.set(Math.random()*Math.PI,Math.random()*Math.PI,0);scene.add(mesh);
  particles.push({mesh,velocity:new THREE.Vector3((Math.random()-.5)*1.8,1.8+Math.random()*1.4,(Math.random()-.5)*1.8),life:1.3});
 }
}
// Your farmer celebrates (21 Oct 2026, the owner: "Doe alles behalve 9", item 2): a level-up or an event's reward collected. Two happy
// hops and the confetti, only when they are in the picture. The level-up card comes up a moment after the action (CHEER_BEAT); a window
// in front first closes, so it is seen: until then they wait (a minute at most).
const CHEER_BEAT=900,CHEER_WAIT=60000;
function farmerCheers(){
 if(!walker?.celebrate)return;
 const asked=performance.now(),now=()=>{if(modalOpen()&&performance.now()-asked<CHEER_WAIT){setTimeout(now,400);return;}const at=walker.celebrate();if(at)confettiAt(...at);};
 setTimeout(now,CHEER_BEAT);
}
// Confetti over a building as it opens for you (23 Oct 2026, the owner: "Doe confetti als je een nieuw gebouw opent en koopt"): when a level
// makes it yours to build, over it on the farm, once the window in front (the level-up card) has closed, as the farmer's cheer waits.
// Buying one throws its confetti in the window, from the button (economy-ui.js, public/confetti.js). The first look at a farm only notes
// what is open; a building of the other world has no place here.
let buildingsOpen=null;
function cheerNewBuildings(){
 const open=new Set(Object.keys(BUILDINGS).filter(key=>buildingEligible(state,key)));
 const fresh=buildingsOpen?[...open].filter(key=>!buildingsOpen.has(key)):[];buildingsOpen=open;
 for(const key of fresh){
  const view=buildingViews.get(key);if(!view?.object)continue;
  const asked=performance.now(),now=()=>{if(modalOpen()&&performance.now()-asked<CHEER_WAIT){setTimeout(now,400);return;}const box=new THREE.Box3().setFromObject(view.object);confettiAt((box.min.x+box.max.x)/2,box.max.y+.4,(box.min.z+box.max.z)/2,40);};
  setTimeout(now,CHEER_BEAT);
 }
}
// Where a spot on the farm is on the screen (in page pixels).
function toScreen(x,y,z){const p=new THREE.Vector3(x,y,z).project(camera),r=world.getBoundingClientRect();return {x:r.left+(p.x*.5+.5)*r.width,y:r.top+(-p.y*.5+.5)*r.height};}
// The harvest flies from the field to the Market button (harvest-fly.js), where it goes into your stock.
function harvestFlight(id,crop,count,delay=0){if(crop)flyToMarket(plots[id].x,1,plots[id].z,art(crop),count,delay);}
function flyToMarket(x,y,z,html,count,delay=0){
 if(reducedMotion)return;
 const market=[...document.querySelectorAll('#market-button')].find(b=>b.offsetParent);if(!market)return;
 const m=market.getBoundingClientRect(),from=toScreen(x,y,z),to={x:m.left+m.width/2,y:m.top+m.height/2};
 // The harvest landing at the Market is when step 2's pointer comes (11 Oct 2026, Part A A11, beginner-ui.js landed).
 setTimeout(()=>flyHarvest({from,to,html,count,onArrive:()=>{bump(market);beginner?.landed?.();}}),delay);
}
// Tapping a building's name while batches are ready collects them all right on the farm (as Collect all in its window does), and
// the goods fly to the Market button. With nothing ready, or a tap on the building itself, its window opens.
let collecting=false;
async function tapBuilding(key){
 if(!ready||collecting)return;
 // The Pier has no batches to collect (Oct 2026): its name opens the town boat, or its golden brief while it is not built.
 if(BUILDINGS[key].type==='pier'||economy.status(key).kind!=='ready'){economy.openBuilding(key);return;}
 collecting=true;
 try{
  const result=await runAction({type:'collect_all',building:key}),v=buildingViews.get(key),goods=Object.keys(result.items);
  flyToMarket(v.x,v.height,v.z,goods.map(item=>art(item,'product-art')),Math.min(3,Math.max(result.count,goods.length)));
  floatAt(v.x,v.height+.8,v.z,Object.entries(result.items).map(([item,n])=>floatChip(item,`+${n}`)).join('')+floatChip('xp',`+${result.xp} XP`,'is-xp'));
  updateUI();icons();
 }catch(e){toast(e.message);}
 finally{collecting=false;}
}
// A tap on a pet (20 Oct 2026): it hops and a heart pops over it at once. Once an hour it also has a small find (farm-state.js patPet), which
// floats up over it like a harvest's, once the heart has had its moment (PET_FIND_AFTER: a quick answer would put the two on top of each
// other); until then the line at the top says how long to wait, and nothing is sent. The admin view only pets.
const patting=new Set(),PET_FIND_AFTER=550;
async function patPet(id){
 if(!pets?.react(id)||adminView||patting.has(id))return;
 const rest=petRest(state,id,farmNow());if(rest>0){toast(petRestText(id,rest));return;}
 patting.add(id);const tapped=performance.now();
 try{
  const r=await runAction({type:'pet_pat',pet:id});
  const find=r.coins?floatChip('coins',`+${r.coins.toLocaleString('en-US')}`):r.item?floatChip(r.item,`+${r.count}`):'';
  setTimeout(()=>{const at=pets.top(id);if(at)floatAt(at.x,at.y,at.z,find+floatChip('xp',`+${r.xp} XP`,'is-xp'));},Math.max(0,PET_FIND_AFTER-(performance.now()-tapped)));
  updateUI();icons();
 }catch(e){toast(e.message);}
 finally{patting.delete(id);}
}
// What an action gave, floating up from the field as small chips with their own picture (markup built here, never from input).
const floatChip=(key,text,cls='')=>`<span class="float-chip ${cls}">${art(key)}${text}</span>`;
// What a harvest is worth at today's prices (11 Oct 2026, Part A A11, a player's idea on Reddit): one coin chip beside what it brought in,
// on the field itself, never a pop-up; the coins come when it is sold (doubled before the first sale, marketPay). Not in the village, whose
// crops sell at its own market.
function worthChip(crops){
 if(villageWorld)return '';const now=farmNow();
 const base=Object.entries(crops).reduce((sum,[item,n])=>sum+(Object.hasOwn(ITEMS,item)?n*marketQuote(item,now).price:0),0),worth=base>0?marketPay(state,base,now):0;
 return worth>0?floatChip('coins',`worth ${worth.toLocaleString('en-US')}`,'is-worth'):'';
}
function floatReward(id,html){const v=plots[id];floatAt(v.x,2.4,v.z,html);}
function floatAt(x,y,z,html){const p=new THREE.Vector3(x,y,z).project(camera),e=document.createElement('div');e.className='floating-reward';e.innerHTML=html;e.style.left=`${world.offsetLeft+(p.x*.5+.5)*world.clientWidth}px`;e.style.top=`${world.offsetTop+(-p.y*.5+.5)*world.clientHeight}px`;$('game').append(e);floatClear(e);setTimeout(()=>e.remove(),2700);}
// A float stays in sight (11 Oct 2026, Part A A11: at 918x516 the first basket's float, with what it is worth, rose from the top row of
// fields under the level card and the level-2 line, and its start lay under the side tools). It starts low enough to stay below the bars
// at the top and the toast's place all the way up (the float rises 75 px, styles.css @keyframes reward); the toast's place counts also
// while it is empty, as a level-up's line follows the harvest a moment later (progression-ui.js). Sideways it moves into the free part
// between the side tools and the guide card (or the next-goal card), or is centred there when it is a little wider.
const FLOAT_RISE=75,FLOAT_OVER=['#journal-button','.resources','#beginner-mobile','#next-goal-mobile'];
function floatClear(e){
 const f=e.getBoundingClientRect();if(!f.width)return;
 const box=sel=>{const el=document.querySelector(sel);return el&&!el.hidden&&el.getClientRects().length?el.getBoundingClientRect():null;};
 const over=FLOAT_OVER.map(box),t=$('toast'),g=$('game').getBoundingClientRect();
 // The toast's place counts where it is at the top of the farm (computers); on a phone it sits just above the tool dock since 18 Oct 2026
 // (hud.css), under every float, and a float that started near it would only be pushed further down.
 if(t&&t.offsetTop<g.height/2){const w=Math.max(t.offsetWidth,360),c=g.left+g.width/2,top=g.top+t.offsetTop;over.push({left:c-w/2,right:c+w/2,top,bottom:top+Math.max(t.offsetHeight,46),width:w});}
 const tools=box('.side-tools'),side=tools&&tools.top<innerHeight*.6&&tools.left<innerWidth*.3?tools.right:g.left;
 const card=[box('.beginner-card'),box('#next-goal-card')].find(Boolean),end=card&&card.left>innerWidth*.6?card.left:g.right;
 let shift=0;if(end-side>200)shift=f.width<=end-side-12?(f.left<side+6?side+6-f.left:f.right>end-6?end-6-f.right:0):(side+end)/2-(f.left+f.right)/2;
 const need=Math.max(0,...over.filter(r=>r?.width&&r.right>f.left+shift&&r.left<f.right+shift&&r.top<f.bottom).map(r=>r.bottom))+FLOAT_RISE+6;
 if(shift)e.style.left=`${parseFloat(e.style.left)+shift}px`;
 if(f.top<need)e.style.top=`${parseFloat(e.style.top)+need-f.top}px`;
}
async function interact(id,forcedAction){
 if(!ready)return;
 const plot=state.plots[id];
 // A tap does what the field can use now (fieldTapAction): care once it is ready, water, harvest or plant.
 const action=forcedAction??fieldTapAction(plot,farmNow(),selectedTool,toolPicked);
 // Water chosen on a crop past its watering time (7 Oct 2026): nothing happens, and the toast says why, in the guide with what to do.
 // A crop that already had its care gets the usual line below (when it is ready), not advice to give care.
 if(!action&&selectedTool==='water'&&toolPicked){const why=plot.watered?'Already watered. Your crop is growing nicely.':beginnerProgress(state).some(q=>q.id==='water'&&!q.done)?WATER_FIRST_MINUTE:plot.tended?'':'Water right after planting. This crop is past that; give it extra care instead.';if(why){toast(why);return {error:'too late to water'};}}
 // Nothing to do yet: say plainly what comes next and when (toasts drop "·", so two short sentences).
 if(!action){const now=farmNow(),name=CROPS[plot.crop].name;toast(`${name}: ${plot.tended?'fully cared for':`extra care opens in ${formatDuration(plot.careAt-now)}`}. Ready to harvest in ${formatDuration(plot.readyAt-now)}.`);return {error:'nothing to do yet'};}
 // One picture flies to the Market for each crop the harvest gives (one since 22 Oct 2026; 1-3 for a crop planted before).
 const flightCount=harvestYield(plot);
 try{
  const medalsBefore=medalsWaiting(state);
  // The burst comes with the tap itself, also when the answer has to come from the server (a harvest that levels you up).
  if(action==='harvest')particleBurst(id);
  const result=await runAction({type:'field',id,action,crop:selectedCrop});
  // The golden first harvest shows on the field itself, so the toast stays free for the guide step it completes. A medal it earned
  // gets a chip of its own above it (Oct 2026).
  if(action==='harvest'){harvestFlight(id,result.crop,flightCount);if(result.firstHarvest)particleBurst(id,true);floatReward(id,withMedals(newMedals(medalsBefore,state),(result.firstHarvest?floatChip('harvest',`Golden first harvest ×${result.firstHarvest}`,'is-golden'):'')+floatChip(result.crop,`+${result.quantity}`)+worthChip({[result.crop]:result.quantity})+floatChip('xp',`+${result.xp} XP`,'is-xp')));}
  // Water and care make the crop ripen sooner (one crop a harvest, 22 Oct 2026): the chip says how much sooner.
  if(action==='water'){particleBurst(id,true);floatReward(id,floatChip('water',sooner(result?.saved)));}
  if(action==='tend'){particleBurst(id);floatReward(id,floatChip('care',sooner(result?.saved)));}
  if(action==='plant')floatReward(id,floatChip(state.plots[id].crop??selectedCrop,'Planted')+floatChip('coins',`−${result.cost}`,'is-cost'));
  // One tip at a time (16 Oct 2026): the wait note, once a day, goes before the sweep tip, which skips that tap.
  const waited=action==='plant'&&waitTip.planted(state.plots[id].crop);
  // The tool that matches what the tap just did lights up, with a short pop, so it is clear it watered or gave care. With Water chosen,
  // planting keeps it in the hand, so the next tap waters the new crop (7 Oct 2026, "plant wheat, then water it").
  if(!forcedAction&&!(action==='plant'&&selectedTool==='water'&&toolPicked))showTool(action);
  if(!forcedAction&&!waited)sweepTip.tapped(action,{touch:lastPointer?.type!=='mouse'});
  drawCrop(id);renderer.shadowMap.needsUpdate=true;updateUI();icons();return result;
 }catch(e){toast(e.message);return {error:e.message};}
}
// A sweep (farm-input.js; Oct 2026, the CrazyGames review: "harvesting should feel physical"): every field is cut, planted, watered or
// cared for the moment the pointer passes it, with the server's own rules on top of what is shown (farm-client.js sweep), and the
// whole sweep is still saved in ONE request, on release. Per field only that field is drawn: the plants tip over and go, a small burst,
// one picture to the Market (at most 8 in the air), a snip a little higher every field, a tick on a phone, and the coins, stock and XP
// in the header move. The rest of the screen, the guide, a level-up, the closing chime and the sum of what it brought in follow on
// release (no updateUI per field). A field the rules refuse (out of coins, not ripe) is not lit; if the server refuses the sweep, its
// fields come back and the toast says why. With reduced motion the rings and sounds stay, without flights, bursts or swings.
let sweepRun=null,lastPointer=null,pointerDx=0;
const sweepTool=createSweepTool({reducedMotion}),sweepGhost=createSweepGhost({reducedMotion});
// Step 1's see-through sickle over the ripe starter corn, until the first harvest (Show me, and by itself on a brand-new farm).
const firstBasketGhost=()=>sweepGhost.start(()=>{if(state.stats.harvested>0)return null;const ids=state.plots.map((p,i)=>p.crop&&farmNow()>=p.readyAt?i:-1).filter(i=>i>=0).slice(0,3);return ids.length?ids.map(i=>toScreen(plots[i].x,.7,plots[i].z)):null;});
// What a drag from this field does (plant, harvest, water or care), or nothing: then the drag moves the farm.
function sweepAction(target){if(adminView)return null;const p=state.plots[target.id],a=p?fieldTapAction(p,farmNow(),selectedTool,toolPicked):null;return a==='plant'||a==='harvest'||a==='water'||a==='tend'?a:null;}
function startSweep(action){
 const run={action,handle:client.sweep(action,selectedCrop),before:progressionSnapshot(state),medals:medalsWaiting(state),level:levelProgress(state).level,count:0,tilt:Math.abs(pointerDx)>1.5?(pointerDx<0?.55:-.55):0,flights:[]};
 // With a mouse the tool is in the hand from the first field on (the cursor itself hides meanwhile).
 if(lastPointer?.type==='mouse'){sweepTool.show(action);if(sweepTool.move(lastPointer.x,lastPointer.y))world.style.cursor='none';}
 return run;
}
function sweepField(id,action){
 if(!ready||!plots[id])return false;
 const run=sweepRun??=startSweep(action);if(run.action!==action)return false;
 const result=run.handle.add(id);if(!result)return false;
 const f=result.fields[0],v=plots[id],n=run.count++;
 swept.add(id);v.ring.visible=true;
 if(action==='harvest'){
  // A tree or a bush keeps its plants: it gives a shake instead.
  drawCrop(id,run.tilt);if(state.plots[id].crop&&!v.rows)cropMotion.hopGroup(v,'stage');
  particleBurst(id,false,5);if(f.firstHarvest)particleBurst(id,true,5);
  // A picture flies for 0.76 s: one a field, never more than 8 on their way at once (a quick sweep passes several fields a frame).
  const now=performance.now();run.flights=run.flights.filter(t=>now-t<900);if(run.flights.length<8){run.flights.push(now);harvestFlight(id,f.crop,1);}
 }else{drawCrop(id);particleBurst(id,action==='water',action==='plant'?0:4);}
 farmAudio.snip(n);haptic('sweep');sweepTool.cut();hudNumbers();renderer.shadowMap.needsUpdate=true;
 return true;
}
function endSweep(){
 // No ring is left on the field the mouse was over when the sweep began (the pointer is elsewhere now; the next move lights its own).
 const run=sweepRun;sweepRun=null;sweepTool.hide();swept.clear();highlight(-1);
 if(!run)return;
 const result=run.handle.end(),action=run.action;
 if(!result){if(run.handle.reason)toast(run.handle.reason);return;}
 sweepTip.swept(action,run.count);
 // A harvest sweep that stopped because the Warehouse is full (22 Oct 2026): the note says how many fields it harvested.
 if(run.handle.full&&warehouse)warehouse.note(run.handle.full,{count:result.count});
 // As after a tap (runAction): the guide, the reminder, a level-up.
 beginner?.afterAction(result);if(action==='harvest'){nudge?.harvested();farmerJoins({type:'field',action:'harvest',id:result.fields.at(-1).id});}
 const change=progressionChange(run.before,state,result.levelReward);progression?.announce(change);if(change.leveled)track('level_up',{level:change.level});if(change.leveled)farmerCheers();
 // The chime that closes the sweep (its snips played on the way), or the level-up's own.
 try{const cue=soundForAction({type:'fields',action},result,run.level,levelProgress(state).level);if(cue){farmAudio.play(cue);if(cue==='levelup')haptic('levelup');}}catch{}
 const crops={},last=result.fields.at(-1).id;let xp=0,golden=0;
 if(action==='harvest')for(const f of result.fields){crops[f.crop]=(crops[f.crop]??0)+f.quantity;xp+=f.xp;if(f.firstHarvest)golden=f.firstHarvest;}
 // The medals a sweep earned: their chips over its sum and ONE toast for all of them (Oct 2026).
 const medals=action==='harvest'?newMedals(run.medals,state):[];
 if(action==='harvest'){floatReward(last,withMedals(medals,(golden?floatChip('harvest',`Golden first harvest ×${golden}`,'is-golden'):'')+Object.entries(crops).map(([crop,n])=>floatChip(crop,`+${n}`)).join('')+worthChip(crops)+floatChip('xp',`+${xp} XP`,'is-xp')));medalToast(medals);}
 if(action==='water')floatReward(last,floatChip('water',result.count>1?`${result.count} fields · sooner`:sooner(result.fields[0]?.saved)));
 if(action==='tend')floatReward(last,floatChip('care',result.count>1?`${result.count} fields · sooner`:sooner(result.fields[0]?.saved)));
 if(action==='plant'){floatReward(last,floatChip(result.crop,result.count>1?`${result.count} planted`:'Planted')+floatChip('coins',`−${result.cost}`,'is-cost'));if(result.short)toast('Out of coins for more seeds. Sell some produce at the market.');}
 if(action==='plant'&&!result.short)waitTip.planted(result.crop);
 renderer.shadowMap.needsUpdate=true;icons();
}
// Before a new farm's first harvest (11 Oct 2026, Part A A15) a harvest sweep may start anywhere, and the fields never stay out of sight:
// after a release that left most of them off the screen, the view eases back to them. Only while a ripe crop waits for it (the starter corn),
// so the rule and the line at the bottom always go together.
const firstBasketWaits=()=>!adminView&&!villageWorld&&!(state.stats.harvested>0)&&state.plots.some(p=>p.crop&&farmNow()>=p.readyAt);
// It glides along the farm's zoom axis to the fields' stop (glideFarm), in 450 ms as it always did.
function easeToFields(){
 if(!plots.length||!camera)return;const r=world.getBoundingClientRect();
 const seen=plots.filter(v=>{const p=toScreen(v.x,.5,v.z);return p.x>r.left&&p.x<r.right&&p.y>r.top&&p.y<r.bottom;}).length;
 if(seen*2>=plots.length)return;
 glideFarm(0,{ms:450,stop:'fields'});
}
// What water or care took off a crop's time, for its chip ("4m sooner"); just "Sooner" when the answer has no time.
const sooner=ms=>ms>=1000?`${formatDuration(ms)} sooner`:'Sooner';
function showTool(tool){if(tool!==selectedTool)setTool(tool,false);const button=document.querySelector(`[data-tool="${tool}"]`);if(!button)return;button.classList.remove('just-used');void button.offsetWidth;button.classList.add('just-used');}
function setTool(tool,picked=true){selectedTool=tool;toolPicked=picked;document.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===tool);b.setAttribute('aria-pressed',String(b.dataset.tool===tool));});updateHint();}
// The seed you chose last is still chosen after a reload on this device (privacy.html lists the key).
const CROP_KEY='harvest-tycoon:seed';
function setCrop(crop){selectedCrop=crop;try{localStorage.setItem(CROP_KEY,crop);}catch{}if(!seasonCrop(crop))tractorCrop=crop;setTool('plant');if(ready)plots.forEach((_,i)=>drawCrop(i));updateHint();}
function updateHint(){
 // A drag from a ripe crop or an empty field sweeps (Oct 2026): the computer hints say so, and that the grass moves the view.
 let text=selectedTool==='tend'?'Give growing crops extra care when the green marker appears. They ripen sooner.':selectedTool==='water'?'Water a crop soon after planting: it ripens much sooner.':selectedTool==='harvest'?'Click a ripe crop, or hold the mouse button and sweep over your crops to harvest them all. Drag the grass to move the view.':`Click an empty field to plant ${CROPS[selectedCrop].name.toLowerCase()}, or a growing crop to water it and give extra care when it is ready. Hold the mouse button and sweep over empty fields to plant them all. Drag the grass to move the view.`;
 if(!state.stats.harvested&&state.plots.some(p=>p.crop&&farmNow()>=p.readyAt))text='Your first crops are ready. Click one, or hold the mouse button anywhere and sweep across them to harvest them all!';
 if(selectedTool==='plant'&&state.stats.harvested>=3&&state.stats.produced===0)text='Your farm can do more. Click a building to start producing!';
 if(mobileLayout.matches)text=selectedTool==='plant'?`Tap an empty field to plant ${CROPS[selectedCrop].name.toLowerCase()}, or a growing crop to water and care for it. Drag to move the view.`:`Tap a field to ${selectedTool==='tend'?'give extra care':selectedTool}. Drag to move the view.`;
 $('hint-text').textContent=text;
 // The line at the bottom says the same rule (11 Oct 2026, Part A A15): before the first harvest a sweep starts anywhere, and the grass does
 // not move the farm yet. Only when the English line changes (the page translates it in place).
 const note=$('bottom-note-copy'),line=firstBasketWaits()?'Sweep across your ripe crops from anywhere. Drag with the right mouse button to explore.':'Click to work · Sweep across crops · Drag the grass to explore';
 if(note&&note.dataset.line!==line){note.dataset.line=line;note.textContent=line;}
}
// The numbers in the header that a sweep moves field by field (Oct 2026): coins, level and XP, and what the Market button counts.
// updateUI shows them too, with everything else.
// Coins that come in count up (23 Oct 2026, the owner: "Het geld moet bij binnenkomen dynamisch stijgen"): from what the pill shows to the
// new amount in 1.2 s (0.7 s at first; the owner the same day: "doe de animatie iets langzamer van coins"), slowing down at the end. Spending, the first draw and reduced motion show the new amount at once. The pill is sized
// for the new amount first (fitText), so its size never jumps while the number runs; a second gain on the way runs on from where it is.
const COIN_COUNT_MS=1200,XP_FILL_MS=700;
let coinGoal=null,coinNow=null,coinRun=0;
const coinText=n=>n.toLocaleString('en-US',mobileLayout.matches?{notation:'compact',maximumFractionDigits:1}:{});
function showCoins(goal){
 const el=$('coins');
 // What comes in while the Market is open waits on the pill (23 Oct 2026, the owner: "tel de coins pas op als je Market sluit"): the
 // window covers it, so the coins count up once it closes, from where they stood, and the farmer sees the sale come in.
 if($('market-dialog')?.open&&coinNow!=null&&goal>coinNow)return;
 if(goal===coinGoal){if(!coinRun&&el.textContent!==coinText(goal)){el.textContent=coinText(goal);fitText(el);}return;}
 const from=coinNow;coinGoal=goal;cancelAnimationFrame(coinRun);coinRun=0;el.style.minWidth='';
 el.textContent=coinText(goal);fitText(el);
 if(from==null||goal<=from||reducedMotion){coinNow=goal;return;}
 // The number keeps the new amount's width while it runs (23 Oct 2026, the owner: "waarom shaked heel het coins scherm"): the coins' digits
 // are all as wide (#coins, tabular-nums in hud.css), and a shorter number on the way (9,999 before 10,000) never narrows the pill, so
 // nothing in the top bar moves.
 el.style.minWidth=`${el.getBoundingClientRect().width}px`;
 // Its own animation frame: the pill's text only, nothing of the 3D view (frame() draws that, and the camera's glides run in it).
 const start=performance.now();
 // A frame's time can be a moment before start (it is when the frame began): never below 0, so the number never dips under where it was.
 const countCoins=at=>{const k=Math.max(0,Math.min(1,(at-start)/COIN_COUNT_MS));coinNow=k<1?Math.round(from+(goal-from)*(1-(1-k)**3)):goal;el.textContent=coinText(coinNow);coinRun=k<1?requestAnimationFrame(countCoins):0;if(!coinRun)el.style.minWidth='';};
 el.textContent=coinText(from);coinRun=requestAnimationFrame(countCoins);
}
// XP that comes in fills the bar (23 Oct 2026, the owner: "Animeer wel de XP balk als je XP farmed"): the bar, its number and the phone's
// ring run from what they show to the new amount in 0.7 s. A new level, the first draw and reduced motion show it at once.
// The number keeps the new amount's width while it runs (tabular-nums on #xp-text), so the level card never moves.
let xpShown=null,xpRun=0;
function drawXp(current,target){$('xp-text').textContent=`${current} / ${target} XP`;$('xp-bar').max=target;$('xp-bar').value=current;$('journal-button').style.setProperty('--xp',String(Math.min(100,Math.round(current/Math.max(1,target)*100))));}
function showXp(level,current,target){
 const same=xpShown&&xpShown.level===level&&xpShown.target===target;
 if(same&&xpShown.goal===current)return;
 const from=same?xpShown.now:null,text=$('xp-text');cancelAnimationFrame(xpRun);xpRun=0;text.style.minWidth='';
 xpShown={level,target,goal:current,now:current};drawXp(current,target);
 if(from==null||current<=from||reducedMotion)return;
 text.style.minWidth=`${text.getBoundingClientRect().width}px`;xpShown.now=from;
 const start=performance.now();
 const fillXp=at=>{const k=Math.max(0,Math.min(1,(at-start)/XP_FILL_MS));xpShown.now=k<1?Math.round(from+(current-from)*(1-(1-k)**3)):current;drawXp(xpShown.now,target);xpRun=k<1?requestAnimationFrame(fillXp):0;if(!xpRun)text.style.minWidth='';};
 drawXp(from,target);xpRun=requestAnimationFrame(fillXp);
}
function hudNumbers(){
 showCoins(state.coins);$('coins').parentElement.title=`${state.coins.toLocaleString('en-US')} coins`;
 const lp=levelProgress(state),lvl=lp.level;
 $('level').textContent=lvl;showXp(lvl,lp.current,lp.target);
 // What the Market button counts: the goods its market buys (village goods in the village, the rest on the farm).
 const count=Object.entries(state.inventory).reduce((a,[k,n])=>a+(villageGood(k)===villageWorld?n:0),0);
 // From the first harvest to the first sale it shows what the basket is worth today instead (11 Oct 2026, Part A A11: the count was about
 // 37, mostly starter stock that cannot be sold yet): the same number as "This basket is worth" on the Crops tab that Market then opens on
 // (the corn and the starter wheat). Its name says it too.
 const worth=guideAt('sell')?marketWorth(state,'crops',farmNow()):0,badge=$('stock-count'),market=$('market-button');
 // Otherwise no badge (18 Oct 2026, the owner, the window shell): a red badge means something waits for you, and the count of goods in the
 // barn is no task; the Market's heading says it ("N in your barn").
 // The Warehouse (22 Oct 2026): from 90% full the badge shows how full it is (amber), and Full (red) once bringing in waits; the Market is
 // the way out, so the Market button is where it shows on every screen (phone, computer and the small window).
 const tone=worth?'ok':warehouseTone(state),filled=tone!=='ok';badge.classList.toggle('is-near',tone==='near');badge.classList.toggle('is-full',tone==='full');
 if(filled){badge.hidden=false;badge.classList.remove('is-worth');delete badge.dataset.worth;const text=tone==='full'?'Full':`${Math.min(99,Math.floor(storedCount(state)/warehouseCapacity(state)*100))}%`;if(badge.textContent!==text)badge.textContent=text;market.setAttribute('aria-label',`Market: Warehouse ${tone==='full'?'full ':''}${fillText(state)}`);return;}
 badge.hidden=!worth;badge.classList.toggle('is-worth',worth>0);
 if(worth){const text=worth.toLocaleString('en-US');if(badge.dataset.worth!==text){badge.dataset.worth=text;badge.innerHTML=`${art('coins')}${text}`;}market.setAttribute('aria-label',`Market: your basket is worth ${text} coins`);}
 else{if(badge.dataset.worth){delete badge.dataset.worth;}badge.textContent='';market.removeAttribute('aria-label');}
}
function updateUI(){
 hudNumbers();warehouse?.refresh();
 const lp=levelProgress(state),lvl=lp.level;
 // World II (30 Sep 2026): the way to the village from level 100, in the side tools and in the More menu. Its count: the places with a
 // batch ready, and the market square when the golden brief or a landmark can be built (Oct 2026; no pop-up). Not a villager you could
 // help (10 Oct 2026, a player's feedback): who doesn't want to trade saw a number for good and missed a batch that was ready. In the
 // village the square's own pin still lights for a villager, the Village tool is the one lit and My farm travels back.
 // 12 Oct 2026 (a player's feedback): the More menu offers the other world in both, The Village on the farm and My farm in the village.
 const worldTwo=worldTwoOpen(state),villageReady=worldTwo&&economy?Object.keys(BUILDINGS).filter(k=>BUILDINGS[k].world===2&&economy.status(k).kind==='ready').length+(villageBrief(state)?.ready||villageLandmark(state)?.ready?1:0):0;
 // My farm only beside the Village (23 Oct 2026, the owner: "haal my farm button weg tenzij je het dorp hebt"): it is the way back from it.
 $('farm-button').hidden=!worldTwo;$('village-button').hidden=!worldTwo;$('village-button').classList.toggle('active',villageWorld);$('farm-button').classList.toggle('active',!villageWorld);
 $('village-count').hidden=villageWorld||!villageReady;$('village-count').textContent=villageReady;$('village-menu-entry').hidden=villageWorld||!worldTwo;$('farm-menu-entry').hidden=!villageWorld;
 if(!sessionTracked){sessionTracked=true;track('game_session',{level:lvl,returning:(state.stats?.harvested??0)>=5});}
 trackTotals(lvl);
 {const next=unlockEntries(state).filter(e=>!e.unlocked&&e.level===lvl+1).map(e=>e.name);$('journal-button').title=next.length?`Level ${lvl+1} unlocks: ${next.slice(0,3).join(', ')}${next.length>3?'…':''}`:'Farm journal & level rewards';}
 nudge?.check();fertilizerTip.check();
 $('level-name').textContent=levelTitle(lvl);
 // What the next level brings, on the level card (computer screens): there is always something just ahead.
 const next=nextUnlock(state);$('level-next').hidden=!next;$('level-next').textContent=next?`Next at level ${next.level}: ${next.name}`:'';
 // How many quests wait to be claimed, one tap each in Quests (11 Oct 2026, Part A A13; it was "!"), and the daily challenges that are
 // ready in Today (Plan F, 13 Oct 2026; the line at the top of Quests opens Today).
 {const waiting=questGroups(state).ready.length+(villageQuestReady(state)?villageQuestGroups(state).ready.length:0)+readyDailies(state,farmNow()).length;$('task-dot').hidden=!waiting;$('task-dot').textContent=waiting>99?'99+':String(waiting);}
 // The medals of the first basket, a moment after the first sale (A11).
 if(heldMedals.length&&!guideAt('sell')){const medals=heldMedals;heldMedals=[];clearTimeout(heldTimer);heldTimer=0;setTimeout(()=>medalToast(medals),2600);}
 if(ready)cheerNewBuildings();
 familyUI?.refresh();passUI?.refresh();seasonUI?.refresh();lookSettings?.refresh();beginner?.refresh();updateHint();economy?.refresh();retention?.refresh();growth?.refresh();valley?.refresh();villageSquare?.refresh();boat?.refresh();estatePlaces?.refresh();boosts?.refresh();rookie?.refresh();quests?.refresh();mobileUI?.refresh();activities?.refresh();progression?.refresh();liveEvents?.refresh();
}
function renderMarket(){economy.renderMarket();}
function sell(item='category'){return economy.sell(item);}
// World II's own quests (public/quests-ui.js, from level 100).
async function claimVillage(id){try{const r=await runAction({type:'village_quest',id});updateUI();toast(`Village quest complete! +${r.coins.toLocaleString('en-US')} coins${r.xp?` and +${r.xp} XP`:''}.`);return r;}catch(e){toast(e.message);return {error:e.message};}}
async function claim(id,{quiet=false}={}){try{const r=await runAction({type:'quest',id});updateUI();if(!quiet)toast(`Quest complete! +${r.coins} coins${r.xp?` and +${r.xp} XP`:''}.`);return r;}catch(e){toast(e.message);return {error:e.message};}}
// While step 2 waits, Market opens on Crops with Sell all corn in view: two taps instead of three (11 Oct 2026, Part A A11). Every time, the
// pointer shows Sell all corn there and brings it into view (a short frame has it below the fold), also when the pointer to Market went
// with an earlier tap (a farmer who taps the corn one by one). Step 7 the same once its eggs are in: Farm goods and Sell all eggs.
function guidedMarket(){return guideAt('sell')?'market':guideAt('sell_egg')&&(state.inventory.eggs??0)>0?'eggs':null;}
function openDialog(id){
 if(id==='tasks-dialog'){quests.open();return;}
 const way=id==='market-dialog'?guidedMarket():null;
 if(way){economy.openMarket(way==='market'?'crops':'goods');$(id).scrollTop=0;const steps=coach.active?null:guideSteps(way,{state,now:farmNow()});if(steps)coach.start(steps.slice(1),{auto:true});return;}
 document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(id==='market-dialog')economy.renderMarket({opening:true});$(id).showModal();$(id).scrollTop=0;
}
// On a computer the side tools float over the map: a building name that would sit behind them is hidden until the map
// moves (desktop-hud.css keeps the tools see-through). Measured when the window or the tools change, not every frame.
// The home and fields views centre the farm between the side tools and, while it is open, the Beginner guide on the right
// (hudShift, in pixels).
let toolsBox=null,hudShift=0,fieldRoom=null;
// The free height for the fields (11 Oct 2026, Part A A14): between the bars at the top (the level card and coins, the guide's one-line
// banner) and the tool dock, in the farm view's own pixels. A short frame fits the fields into it (resize).
function measureFieldRoom(){
 const w=world.getBoundingClientRect();if(!w.height){fieldRoom=null;return;}
 const box=sel=>{const el=document.querySelector(sel);if(!el||el.hidden||!el.getClientRects().length)return null;return el.getBoundingClientRect();};
 const tops=['#journal-button','.resources','#beginner-mobile','#next-goal-mobile'].map(box).filter(r=>r&&r.width&&r.bottom>w.top&&r.top<w.top+w.height/2);
 const dock=box('.bottom-hud .tool-dock')??box('.bottom-hud');
 const top=Math.max(0,...tops.map(r=>r.bottom-w.top)),bottom=Math.min(w.height,dock&&dock.top>w.top+w.height/2?dock.top-w.top:w.height);
 fieldRoom=bottom-top>w.height*.35?{top,bottom}:null;
}
function measureTools(){
 measureFieldRoom();
 const tools=document.querySelector('.side-tools');if(!tools||mobileLayout.matches){toolsBox=null;hudShift=0;return;}
 const t=tools.getBoundingClientRect(),w=world.getBoundingClientRect();if(!t.width){toolsBox=null;hudShift=0;return;}   // not on screen
 toolsBox={left:t.left-w.left,right:t.right-w.left,top:t.top-w.top,bottom:t.bottom-w.top};
 // The next-goal card in the guide's place after it (11 Oct 2026, Part A A13) counts the same way.
 const guide=document.querySelector('.beginner-card'),goal=$('next-goal-card'),g=guide&&!guide.hidden&&$('quest-collapse')?.getAttribute('aria-expanded')!=='false'?guide.getBoundingClientRect():goal&&!goal.hidden&&!$('next-goal-body')?.hidden?goal.getBoundingClientRect():null;
 hudShift=(toolsBox.right-(g?.width?w.right-g.left:0))/2;
}
const behindTools=(x,y,half)=>Boolean(toolsBox)&&x+half>toolsBox.left&&x-half<toolsBox.right&&y>toolsBox.top&&y-50<toolsBox.bottom;
// In the village (11 Oct 2026, the owner's review) a place's name that the farm's guess of 80 px each side puts behind the side tools is
// measured, and one that reaches them slides clear of them, its point still on its place (world-two.css --tail); only a name whose point
// is at the tools hides. The Linen Loft's was hidden in the whole-village view of a 1280 x 800 screen, and it is half as long again in
// Spanish or Czech. Only a name near the tools is measured, so the page is laid out again for one or two names at most.
function nameBehindTools(v,x,y){
 v.label.hidden=false;const half=v.label.offsetWidth/2,right=x>(toolsBox.left+toolsBox.right)/2;
 const slide=right?Math.max(0,toolsBox.right+8-(x-half)):Math.min(0,toolsBox.left-8-(x+half));
 if(!slide)return false;if(right?x-22<toolsBox.right+8:x+22>toolsBox.left-8)return true;
 v.slid=true;v.label.style.left=`${x+slide}px`;v.label.style.setProperty('--tail',`${-slide}px`);return false;
}
function resize(){
 if(!renderer||!camera)return;
 measureTools();
 const width=world.clientWidth,height=world.clientHeight;if(width<=0||height<=0)return;const aspect=width/height;
 const ratio=pixelRatioFor({devicePixelRatio,width,height,handheld:gpuHandheld,simple:graphicsSimple});
 if(ratio!==viewportRatio){renderer.setPixelRatio(ratio);viewportRatio=ratio;}
 if(width!==viewportWidth||height!==viewportHeight){renderer.setSize(width,height);viewportWidth=width;viewportHeight=height;lastDraw=0;}   // a new size clears the picture: drawn again at once, under a window too
 const mobile=mobileLayout.matches;
 // Fit the actual useful farm, not its decorative trees. Desktop HUD areas are
 // reserved so the main buildings are not hidden behind the guide or tool dock.
 const padding=mobile?{left:28,right:28,top:48,bottom:25}:{left:105,right:285,top:125,bottom:155};
 const bounds=overviewBounds??{minX:-27,maxX:27,minY:-18,maxY:18};
 const usableWidth=Math.max(width*.5,width-padding.left-padding.right),usableHeight=Math.max(height*.5,height-padding.top-padding.bottom);
 const overviewSpan=Math.max((bounds.maxY-bounds.minY+3)*height/usableHeight,(bounds.maxX-bounds.minX+3)*height/usableWidth);
 // The fields view shows every row: the block is 12 wide and 3.2 per row deep, seen diagonally (about .44 of its width plus depth
 // up and down, 1.4 across), with room for the buttons above and below it.
 const rows=Math.ceil(state.plots.length/4);
 // A frame under 650 px tall (11 Oct 2026, Part A A14: on CrazyGames 29% of the computers show the game under 450 px, and only 58% of those
 // farmers harvested): the fields fill the free height between the top bars and the dock (measureFieldRoom), about 4 units of field and
 // its crops a row with a little room around, instead of the fixed 21 units; at 840x430 the corn is about one and a half times as big.
 // Taller frames keep the view they had. The block is centred with the ready and timer markers over its back row (lift below): at 1000x450
 // the top corn's marker lay under the guide's one-line banner.
 const fitRoom=height<650&&fieldRoom&&!villageWorld?fieldRoom:null,fieldFit=fitRoom?(6.1+rows*2.06)*height/(fitRoom.bottom-fitRoom.top):0;
 const fieldSpan=fitRoom?Math.max(24/aspect,(10+2.26*rows)/aspect,fieldFit):Math.max(21,24/aspect,(10+2.26*rows)/aspect,10.6+rows*2.06);
 const homeSpan=Math.min(overviewSpan,Math.max(fieldSpan,mobile?32/aspect:38));
 // Each stop's own picture at a width: the spot on the ground in its middle, and how the frame sits round it.
 const stopView=(mode,span)=>{
  // On a computer the side tools (and an open Beginner guide) cover the edges of the map: the home and fields views centre
  // the farm in the free part between them (the overview already keeps its own margins).
  const shift=!mobile&&mode!=='overview'?hudShift*span/height:0;
  // The fitted fields sit in the middle of that free height with their markers, which stand 2.5 units over the back row (+1.25: 1000x450).
  const lift=mode==='fields'&&fitRoom?((fitRoom.top+fitRoom.bottom)/2-height/2)*span/height+1.25:0;
  if(mode==='fields')return {focus:new THREE.Vector3(2.575,0,.25+(rows-1)*3.2/2),shift,lift};
  if(mode==='home')return {focus:new THREE.Vector3(1.4,0,1.5),shift,lift};
  const side=(bounds.minX+bounds.maxX)/2+(padding.right-padding.left)*span/(2*height);
  const up=(bounds.minY+bounds.maxY)/2+(padding.top-padding.bottom)*span/(2*height);
  // Looking down (36,40,36), each ground axis projects vertically by -40/sqrt(8384).
  const depth=-up*Math.sqrt(8384)/80;return {focus:new THREE.Vector3(side/Math.SQRT2+depth,0,-side/Math.SQRT2+depth),shift,lift};
 };
 // The farm's zoom axis (18 Oct 2026, the owner: "het moet gewoon een stand zijn in de views", zoomAt): the widths at its marks, -1 the
 // closest, then the fields, the heart of the farm and the whole farm (never wider: 18 Oct 2026, the owner, further out "biedt weinig
 // toegevoegde waarde"). Between two marks the width grows by the same factor at every step, and the picture's middle (with the side
 // tools' shift and the fields' lift) slides from one stop's to the next in step with the width, so the farm grows and shrinks round one
 // fixed spot and never jumps sideways. Closer than the fields it is the fields' own view, nearer. The player's pan rides on top.
 const spans=[fieldSpan/2.2,fieldSpan,Math.max(fieldSpan,homeSpan),Math.max(fieldSpan,homeSpan,overviewSpan)];
 const along=Math.max(-1,Math.min(FARM_FAR,zoomAt)),part=Math.min(2,Math.floor(along+1)),low=spans[part],high=spans[part+1];
 const span=low*(high/low)**(along+1-part),k=high-low>1e-6?(span-low)/(high-low):along+1-part;
 const from=part?stopView(FARM_STOPS[part-1],low):stopView('fields',span),to=part?stopView(FARM_STOPS[part],high):from;
 const shift=from.shift+(to.shift-from.shift)*k,lift=from.lift+(to.lift-from.lift)*k;
 camera.left=-span*aspect/2-shift;camera.right=span*aspect/2-shift;camera.top=span/2+lift;camera.bottom=-span/2+lift;
 // Each part's length (zoomFarm, glideFarm): one per e-fold of the width, or where two stops are nearly as wide, as long as it takes for
 // the middle to slide at most half a picture per unit (else a pinch there would swing the farm sideways).
 const middle=v=>[(v.focus.x-v.focus.z)/Math.SQRT2-v.shift,-(v.focus.x+v.focus.z)*40/Math.sqrt(8384)+v.lift];
 const length=i=>{if(!i)return Math.log(2.2);const a=middle(stopView(FARM_STOPS[i-1],spans[i])),b=middle(stopView(FARM_STOPS[i],spans[i+1]));
  return Math.max(Math.log(spans[i+1]/spans[i]),2*Math.hypot((b[0]-a[0])/aspect,b[1]-a[1])/spans[i],.05);};
 farmAxis={lengths:[0,1,2].map(length),spans,span,base:from.focus.clone().lerp(to.focus,k)};
 let focus;
 if(villageWorld){
  // The village: the lake, the houses and the places, from the farm's angle. A computer sees all the places from the Lumber Camp to
  // the Smithy. A phone held upright (7 Oct 2026) sees the valley from top to bottom, 28 across as the farm's 32 (at 50 across the
  // valley was a thin band between grey rock), round the places on the village's side of the lake (villageFrame.phone): the Lumber
  // Camp across the lake is a swipe away, and a pinch brings a house close.
  // The whole-village view (the scan button) frames all of it, as measured when it loaded (villageFrame). The fog moves out with
  // the view, so zooming out never hides the far side.
  // Never past the mountains (7 Oct 2026): every view stays inside villageFrame.view (VILLAGE_VIEW, an ellipse on the screen), so the
  // empty sky round the village never shows. room(s) is the tallest view that fits with its middle s (a share of the half-width)
  // to one side: zooming out stops at room(0), the whole-village view takes all of it (an upright phone as much as fits round the
  // places' middle), and panning stops at the edge.
  const whole=viewMode==='overview'&&villageFrame,upright=mobile&&aspect<1,view=villageFrame?.view;
  const at=villageFrame?(upright&&!whole?villageFrame.phone:villageFrame.focus):new THREE.Vector3(4,0,-9),ax=(at.x-at.z)/Math.SQRT2,ay=-(at.x+at.z)*40/Math.sqrt(8384);   // the middle, and its spot on the screen
  const across=upright?28:mobile?50:62*(width>2*hudShift?width/(width-2*hudShift):1);   // the places' width, and on a computer the side tools' share and room for their names
  const u=view?aspect/2/view.rx:0,w=view?.5/view.ry:0,room=s=>(Math.sqrt(u*u+w*w*(1-s*s))-s*u)/(u*u+w*w),fit=view?room(0):Infinity;
  const base=whole?Math.min(Math.max(villageFrame.height,villageFrame.width/aspect),room(upright?Math.min(1,Math.abs(ax-view.x)/view.rx):0)):Math.min(fit,Math.max(44,across/aspect));
  villageMinZoom=view?base/fit:.5;zoom=Math.max(zoom,villageMinZoom);
  const villageSpan=base/zoom,villageShift=!mobile?hudShift*villageSpan/height:0,hw=villageSpan*aspect/2,hh=villageSpan/2;camera.left=-hw-villageShift;camera.right=hw-villageShift;camera.top=hh;camera.bottom=-hh;
  if(view){
   // The view's middle from the ellipse's (x, y): to the side first (as far as it goes level with the ellipse's middle, as room
   // counts), then up and down as far as is left there.
   const k=80/Math.sqrt(8384),x=ax+pan*Math.SQRT2-villageShift-view.x,y=ay-panDepth*k-view.y;
   const nx=Math.max(0,view.rx*Math.sqrt(Math.max(0,1-(hh/view.ry)**2))-hw),cx=Math.max(-nx,Math.min(nx,x));
   const ny=Math.max(0,view.ry*Math.sqrt(Math.max(0,1-((Math.abs(cx)+hw)/view.rx)**2))-hh),cy=Math.max(-ny,Math.min(ny,y));
   pan+=(cx-x)/Math.SQRT2;panDepth-=(cy-y)/k;
  }
  focus=at.clone().add(new THREE.Vector3(pan+panDepth,0,-pan+panDepth));
  if(scene.fog){scene.fog.near=65+villageSpan*.9;scene.fog.far=65+villageSpan*2.6;}
 }else focus=farmAxis.base.clone().add(new THREE.Vector3(pan+panDepth,0,-pan+panDepth));
 // The Fishing pond (pond-ui.js): the camera glides to the pier and back; the farm's own view stays as it was.
 if(pond?.viewing())focus=pond.frame(camera,focus,aspect);
 camera.position.copy(focus).add(new THREE.Vector3(36,40,36));camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 // On a phone the names shrink to their pins as the whole farm comes (wider than 1/1.4 of it, as the overview's own zoom 1.4 was).
 $('game').classList.toggle('farm-overview',mobile&&(villageWorld?viewMode==='overview'&&zoom<1.4:span>spans[3]/1.4));
 // The farm's buttons: the stop a glide goes to, else the one nearest; - and + grey out only at the axis's two ends.
 if(!villageWorld)viewMode=glide?.stop??FARM_STOPS[Math.round(Math.max(0,along))];
 $('fields-view').setAttribute('aria-pressed',String(viewMode==='fields'));$('zoom-reset').setAttribute('aria-pressed',String(viewMode==='home'));$('zoom-fit').setAttribute('aria-pressed',String(viewMode==='overview'));
 $('zoom-in').disabled=villageWorld?zoom>=maxZoom():along<=-1;$('zoom-out').disabled=villageWorld?zoom<=minZoom():along>=FARM_FAR;$('zoom-fit').hidden=!villageWorld;
 positionLabels();positionBuildingLabels();
}
// The village is three times as wide as the farm and its houses are smaller on screen: further out to zoom and to move (as far as
// its mountains allow, resize), and much further in, so a house comes as close as a farm building does. (The farm has its zoom axis.)
const minZoom=()=>villageMinZoom,maxZoom=()=>6;
function panFarm(delta,depth=0){stopGlide();movePan(delta,depth);}
function movePan(delta,depth){const limit=villageWorld?60:Math.round(24*SPREAD);pan=Math.max(-limit,Math.min(limit,pan+delta));panDepth=Math.max(-limit,Math.min(limit,panDepth+depth));resize();}
// Zooming by a ratio (over 1 comes closer): a pinch, and the wheel and + and - in the village. It returns how much narrower the picture
// got, for zooming towards the pointer in the village. The village zooms within its own limits; the farm moves along its one axis (18 Oct
// 2026, the owner: "soepeler", no more jumping to the next view), by the same share of its width at every step, whichever stops it passes.
function zoomFarm(ratio){
 if(villageWorld){const before=zoom;zoom=Math.max(minZoom(),Math.min(maxZoom(),zoom*ratio));resize();return zoom/before;}
 if(!farmAxis)return 1;stopGlide();const before=farmAxis.span;placeFarm(atAxis(axisOf(zoomAt)-Math.log(ratio)));return before/farmAxis.span;
}
// A place on the axis as its distance from the closest end (farmAxis.lengths), and back.
function axisOf(at){const [a,b,c]=farmAxis.lengths;at=Math.max(-1,Math.min(FARM_FAR,at));return Math.min(1,at+1)*a+Math.max(0,Math.min(1,at))*b+Math.max(0,at-1)*c;}
function atAxis(d){let at=-1;for(const l of farmAxis.lengths){at+=Math.max(0,Math.min(l,d))/l;d-=l;}return Math.min(FARM_FAR,at);}
// The picture's width at a place on the axis (as resize draws it), and the place with a given width: going out the first place that wide,
// coming in the last, so a part where two stops are as wide is passed in one go. + and - and the wheel aim at a width, so they always
// zoom (18 Oct 2026: on a phone with 40 fields the fields are as wide as the heart of the farm, and two presses of - only slid the farm).
function spanOn(at){const s=farmAxis.spans;at=Math.max(-1,Math.min(FARM_FAR,at));const part=Math.min(2,Math.floor(at+1));return s[part]*(s[part+1]/s[part])**(at+1-part);}
function atWidth(span,out){
 const s=farmAxis.spans,grows=i=>s[i+1]>s[i]*(1+1e-9),at=i=>i-1+Math.log(span/s[i])/Math.log(s[i+1]/s[i]);
 if(span>=spanOn(FARM_FAR)*(1-1e-9))return FARM_FAR;if(span<=s[0]*(1+1e-9))return -1;   // the two ends exactly (- and + grey out there)
 if(out){for(let i=0;i<=Math.ceil(FARM_FAR);i++)if(grows(i)&&span<=s[i+1])return Math.min(FARM_FAR,Math.max(i-1,at(i)));return FARM_FAR;}
 for(let i=Math.ceil(FARM_FAR);i>=0;i--)if(grows(i)&&span>=s[i])return Math.min(FARM_FAR,i,at(i));return -1;
}
// The spot of ground under a point of the screen (client px), and keeping it there by hold of the way (the pan moves it back).
function groundUnder(x,y){
 const r=world.getBoundingClientRect(),dir=new THREE.Vector3(),p=new THREE.Vector3((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2,-1).unproject(camera);
 camera.getWorldDirection(dir);const t=-p.y/dir.y;return {x:p.x+dir.x*t,z:p.z+dir.z*t};
}
// Out past the heart of the farm it lets go of the spot as the whole farm comes (hold 0 there), which ends centred; coming closer holds it.
function keepSpot({g,x,y},out){
 const hold=out?Math.max(0,Math.min(1,2-zoomAt)):1;if(!hold)return;const s=toScreen(g.x,0,g.z);
 const d=cameraDragDelta((x-s.x)*hold,(y-s.y)*hold,camera.right-camera.left,camera.top-camera.bottom,world.clientWidth,world.clientHeight);movePan(d.side,d.depth);
}
// The wheel and a trackpad on the farm (18 Oct 2026): the real spot of ground under the pointer stays under it, wherever the picture's
// middle slides between two stops (a correction for a zoom round the middle alone let it slide 92 px a notch between the fields and the
// heart of the farm). Each notch adds its ratio to the width aimed at (atWidth), and the camera follows it smoothly, a fifth of the way
// left at every frame (70 ms to e), so a notch takes about 200 ms and a trackpad's stream of small steps runs on without a jump: also
// the pan fading out near the whole farm comes over several frames (one notch there took 76% of a drag away in one frame). At once with
// reduced motion. A drag, a pinch or a camera button takes over at once (stopGlide).
function wheelFarm(ratio,x,y){
 if(!farmAxis||ratio===1)return;
 const s=farmAxis.spans,spot={g:groundUnder(x,y),x,y},out=ratio<1,from=glide&&!glide.stop?glide.end:axisOf(zoomAt);
 const want=Math.max(Math.log(s[0]),Math.min(Math.log(spanOn(FARM_FAR)),Math.log(spanOn(atAxis(from))/ratio))),end=axisOf(atWidth(Math.exp(want),out)),since=performance.now();
 if(reducedMotion){stopGlide();placeFarm(atAxis(end));keepSpot(spot,out);return;}
 if(glide?.spot){Object.assign(glide,{want,end,spot,since});return;}   // onto the wheel's glide still running
 stopGlide();let last=null;
 glide={stop:null,want,end,spot,since,step(now){
  const cur=Math.log(spanOn(zoomAt)),out=this.want>cur,k=1-Math.exp(-(last==null?1000/60:Math.max(0,Math.min(100,now-last)))/70);last=now;
  const done=Math.abs(this.want-cur)<1e-3||now-this.since>800;if(done)glide=null;
  placeFarm(done?atAxis(this.end):atWidth(Math.exp(cur+(this.want-cur)*k),out));keepSpot(this.spot,out);
 }};
}
// Moves the farm's camera along its axis. Out past the heart of the farm the player's own pan fades by the share of the way still left,
// so the whole farm ends centred, as Show the whole farm shows it; coming closer keeps it.
function placeFarm(at,fade=true){
 at=Math.max(-1,Math.min(FARM_FAR,at));const a=Math.max(1,zoomAt),b=Math.max(1,at);
 if(fade&&b>a&&a<2){const keep=(2-b)/(2-a);pan*=keep;panDepth*=keep;}
 zoomAt=at;resize();
}
// The camera buttons glide to their stop in 400 ms and + and - a step in 250 ms, easing out (18 Oct 2026, the owner: "soepeler"); at once
// with reduced motion. The glide runs along the axis, so it passes the stops at an even pace, and eases out gently (a sine: from the whole
// farm to the fields a cubic began with a fifth of the width per frame, the sine with about a tenth). stop: the button shown pressed meanwhile;
// centre: the player's pan glides back to none, as these buttons always did. A drag, the wheel or a pinch takes over at once (stopGlide).
// Its steps run in frame(), which draws the farm at every display frame while a glide (or the wheel's) runs, so the names over the farm move
// with the picture (18 Oct 2026: a glide of its own moved them up to 108 px ahead of a farm drawn every 32 ms). A button at its own stop
// with no pan only shows itself pressed.
function glideFarm(to,{ms=reducedMotion?0:400,stop=null,centre=true}={}){
 stopGlide();
 if(!farmAxis){zoomAt=to;if(centre){pan=0;panDepth=0;}resize();return;}
 const from=axisOf(zoomAt),end=axisOf(to),pan0=pan,depth0=panDepth;let start=null;
 if(Math.abs(end-from)<1e-9&&(!centre||!pan&&!panDepth)){resize();return;}
 glide={stop,end,step(now){
  if(start==null)start=now-1000/60;   // its first drawn frame is a frame into the glide
  const t=ms>0?Math.max(0,Math.min(1,(now-start)/ms)):1,e=Math.sin(t*Math.PI/2);
  if(centre){pan=pan0*(1-e);panDepth=depth0*(1-e);}
  if(t>=1)glide=null;   // the last frame lands exactly on the place asked
  placeFarm(t>=1?to:atAxis(from+(end-from)*e),!centre);
 }};
 if(!(ms>0&&ready)){ms=0;glide.step(0);}
}
function stopGlide(){glide=null;}
// + and - on the farm: a step of 1.25 times as wide or narrow (as in the village), on from where a step still gliding goes; through a part
// where two stops are as wide it glides on to the next width within the same 250 ms (atWidth).
function stepFarm(direction){if(!farmAxis)return;const from=glide&&!glide.stop?glide.end:axisOf(zoomAt);glideFarm(atWidth(spanOn(atAxis(from))/1.25**direction,direction<0),{ms:reducedMotion?0:250,centre:false});}
function resetView(){viewMode=startView();if(villageWorld){zoom=1;pan=0;panDepth=0;resize();}else glideFarm(FARM_STOPS.indexOf(viewMode),{stop:viewMode});if(ready)updateUI();}
function showOverview(){if(villageWorld){viewMode='overview';zoom=1;pan=0;panDepth=0;resize();}else glideFarm(FARM_FAR,{stop:FARM_STOPS[Math.round(FARM_FAR)]});}
function focusFields(){if(villageWorld){viewMode='fields';zoom=1;pan=0;panDepth=0;resize();}else glideFarm(0,{stop:'fields'});}
function measureFarm(){
 // Use each actual building and field box, retaining the useful heights.
 const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
 for(const object of [...Array.from(buildingViews.values(),v=>v.object),...Array.from(utilityViews.values(),v=>v.object),...plots.map(v=>v.soil),...Array.from(farmLife?.views.values()??[],v=>v.object),...Array.from(decorViews.values(),v=>v.obj)]){
  const box=new THREE.Box3().setFromObject(object);
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y+1])for(const z of [box.min.z,box.max.z]){
   const sx=(x-z)/Math.SQRT2,sy=-(x+z)*40/Math.sqrt(8384)+y*72/Math.sqrt(8384);
   bounds.minX=Math.min(bounds.minX,sx);bounds.maxX=Math.max(bounds.maxX,sx);bounds.minY=Math.min(bounds.minY,sy);bounds.maxY=Math.max(bounds.maxY,sy);
  }
 }
 overviewBounds=bounds;
}
function positionLabels(){
 if(!camera)return;
 // Read the view size once: reading it after moving a label would make the browser lay the page out again for every label.
 const width=world.clientWidth,height=world.clientHeight;
 for(let i=0;i<plots.length;i++){
  const v=plots[i],p=state.plots[i],y=p.crop?Math.max(.7,(CROPS[p.crop].height+.55)*(CROPS[p.crop].perennial&&p.harvestCycles>0?1:progress(p,farmNow()))):0.4;
  const point=new THREE.Vector3(v.x,y,v.z).project(camera);
  v.label.style.left=`${(point.x*.5+.5)*width}px`;v.label.style.top=`${(-point.y*.5+.5)*height}px`;
  v.label.hidden=point.z>1||point.z< -1||Math.abs(point.x)>1||Math.abs(point.y)>1;
 }
 // Small windows (16 Oct 2026, the owner: 16 red cabbages at "7h 33m" piled up over the fields; public/small-window.js), and since 18 Oct
 // 2026 every computer window (the owner: cleaner): fields on screen
 // that stand together with the same crop, ready within a minute, show one label with how many ("16 × 7h 33m") over the group's middle
 // field; the others step aside (a tap on the field still works it, and the keyboard still reaches them). A field that asks for a tap
 // (ready, extra care) keeps its own label. Nothing is measured here.
 const t=farmNow(),groups=computerWindow.matches?timerGroups(plots.map((v,i)=>v.label.hidden?null:timerKey(state.plots[i],t)),state.plots.map(p=>p.readyAt)):null;
 for(let i=0;i<plots.length;i++){
  const v=plots[i],n=groups?.lead[i]===i?groups.count[i]:1;if(!groups&&!v.grouped&&!v.counted)continue;
  v.grouped=Boolean(groups)&&groups.lead[i]!==i;v.label.classList.toggle('is-grouped',v.grouped);v.counted=n>1;
  let count=v.label.querySelector('.plot-timer-count');
  if(n>1){const text=`${n} ×`;if(!count){count=document.createElement('i');count.className='plot-timer-count';v.label.querySelector('.plot-timer-time')?.before(count);}if(count.textContent!==text)count.textContent=text;}else count?.remove();
 }
 if(mobileLayout.matches){
  // Keep each label attached to its own plot and never hide a timer: one that would cover another shrinks to just its ring (the
  // crop and how far it has grown; a tap still works its field). Harvest markers come first. All sizes are read before any label
  // changes, so the page is laid out once per pass.
  const occupied=[],changes=[],COMPACT=30;
  const overlaps=r=>occupied.some(o=>r.left<o.right+2&&r.right>o.left-2&&r.top<o.bottom+2&&r.bottom>o.top-2);
  const candidates=plots.map((v,i)=>({v,i})).filter(({v,i})=>state.plots[i].crop&&!v.label.hidden).sort((a,b)=>Number(b.v.lastReady)-Number(a.v.lastReady)||a.i-b.i);
  for(const {v} of candidates){
   const now=v.label.getBoundingClientRect(),cx=(now.left+now.right)/2,compact=v.label.classList.contains('is-compact');
   if(!compact){v.fullWidth=now.width;v.fullHeight=now.height;}
   const w=v.fullWidth??now.width,h=v.fullHeight??now.height,full={left:cx-w/2,right:cx+w/2,top:now.bottom-h,bottom:now.bottom};
   const shrink=v.label.classList.contains('plot-timer')&&overlaps(full);
   occupied.push(shrink?{left:cx-COMPACT/2,right:cx+COMPACT/2,top:now.bottom-COMPACT,bottom:now.bottom}:full);
   if(shrink!==compact)changes.push([v.label,shrink]);
  }
  for(const [label,shrink] of changes)label.classList.toggle('is-compact',shrink);
 }
}
function pointerTarget(event){
 for(const [id,v] of farmLife?.views??[]){if(v.label.hidden)continue;const b=v.label.getBoundingClientRect(),pad=6;if(event.clientX>=b.left-pad&&event.clientX<=b.right+pad&&event.clientY>=b.top-pad&&event.clientY<=b.bottom+pad)return {type:'activity',id};}
 for(let i=0;i<plots.length;i++){const v=plots[i];if(!state.plots[i].crop||v.label.hidden||v.grouped)continue;const box=v.label.getBoundingClientRect();if(event.clientX>=box.left&&event.clientX<=box.right&&event.clientY>=box.top&&event.clientY<=box.bottom)return {type:'plot',id:i};}
 for(const [type,views] of [['building',buildingViews],['utility',utilityViews],['landmark',landmarkViews],['activity',farmLife?.views??new Map()]])for(const [id,v] of views){
  if(v.label.hidden)continue;const box=v.label.getBoundingClientRect();
  if(event.clientX>=box.left&&event.clientX<=box.right&&event.clientY>=box.top&&event.clientY<=box.bottom)return {type,id,label:true};
 }
 const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
 // Hands-on stations have dedicated solid hit volumes: glass, open roofs and
 // small props must not lose taps to scenery or nearby utility models.
 const stationHit=raycaster.intersectObjects(farmLife?.targets()??[],true)[0];
 if(stationHit){let node=stationHit.object;while(node){if(node.userData.activity)return {type:'activity',id:node.userData.activity};node=node.parent;}}
 const targets=[...plots.flatMap(v=>[v.hit,v.cropGroup]),...Array.from(buildingViews.values()).filter(v=>v.object.visible).flatMap(v=>[v.object,v.hit]),...Array.from(utilityViews.values()).filter(v=>v.object.visible).map(v=>v.object),...animals.map(v=>v.obj),...(windmillRotor?.visible?[windmillRotor]:[]),...(farmLife?.targets()??[])];
 for(const hit of raycaster.intersectObjects(targets,true)){let obj=hit.object;while(obj){if(obj.userData.activity)return {type:'activity',id:obj.userData.activity};if(obj.userData.utility)return {type:'utility',id:obj.userData.utility};if(obj.userData.building)return {type:'building',id:obj.userData.building};if(Number.isInteger(obj.userData.plot))return {type:'plot',id:obj.userData.plot};obj=obj.parent;}}
 // A pet (20 Oct 2026) only when nothing else is there: one standing in front of a building, a field or a pin never takes its tap.
 const pet=pets?.pick(raycaster);if(pet)return {type:'pet',id:pet};
 // Your farmer (20 Oct 2026) last of all: a hop, then your own profile (tapOwnFarmer).
 if(walker?.pick(raycaster))return {type:'farmer'};
 // Then your family's farmers on the farm and in the village (item 5): their profile.
 for(const other of familyWalkers)if(other.pick(raycaster))return {type:'familyFarmer',id:other.playerId};
 return null;
}
function addUtility(key,model,x,z,options){
 const object=cloneModel(model,x,z,options);object.userData.utility=key;
 const height=new THREE.Box3().setFromObject(object).max.y,info=utilityInfo[key];
 const label=document.createElement('button');label.className='utility-label';label.dataset.utility=key;label.title=`${info.name} · ${info.hint}`;label.setAttribute('aria-label',`Open ${info.name}`);label.innerHTML=art(key);label.onclick=()=>openUtility(key);$('building-labels').append(label);
 utilityViews.set(key,{object,label,info,x:object.position.x,z:object.position.z,height,locked:false});
}
function addBuilding(key,x,z,options){
 const object=cloneModel(BUILDINGS[key].model,x,z,options);object.userData.building=key;
 // A yard of several pieces (the Bee Yard's hives) is one building: tapped, outlined and greyed out as one.
 for(const [name,px,pz,partOptions] of options.parts??[])object.attach(cloneModel(name,px,pz,partOptions));
 const bounds=new THREE.Box3().setFromObject(object),height=bounds.max.y;
 const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const hit=new THREE.Mesh(new THREE.BoxGeometry(size.x+.4,size.y+.3,size.z+.4),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));
 hit.position.copy(center);hit.userData.building=key;if(object.userData.yard)hit.userData.yard=object.userData.yard;scene.add(hit);hit.updateMatrixWorld(true);
 const outline=new THREE.BoxHelper(object,0xffdc76);outline.material.transparent=true;outline.material.opacity=.75;outline.visible=false;scene.add(outline);
 const label=document.createElement('button');label.className='building-label';label.dataset.building=key;label.setAttribute('aria-label',`Open ${BUILDINGS[key].name}`);
 label.innerHTML=`<span class="building-pin">${art(key==='familyhall'?'familyhall-model':key)}</span><span><strong>${BUILDINGS[key].name}</strong><small class="building-status" data-building-status="${key}">${key==='farmhouse'?'Expand your fields':'Ready to work'}</small></span>`;
 label.addEventListener('click',()=>tapBuilding(key));label.addEventListener('mouseenter',()=>highlight(key));label.addEventListener('mouseleave',()=>highlight(-1));label.addEventListener('focus',()=>highlight(key));label.addEventListener('blur',()=>highlight(-1));$('building-labels').append(label);
 buildingViews.set(key,{object,hit,outline,label,pin:label.querySelector('.building-pin'),pinArt:key==='familyhall'?'familyhall-model':key,x:object.position.x,z:object.position.z,height,locked:false});
}
// World II: how big the village valley looks from the game's angle (its places and a margin around them, so the lake and the houses
// are in and the ring of mountains is not), and the spot on the ground in its middle, for the whole-village view.
let villageFrame=null,villageMinZoom=.5;
function measureVillage(spots,margin=26){
 const view=new THREE.OrthographicCamera();view.position.set(36,40,36);view.lookAt(0,0,0);view.updateMatrixWorld();
 let [minX,maxX,minY,maxY]=[Infinity,-Infinity,Infinity,-Infinity];
 for(const spot of spots)for(const dx of [-margin,margin])for(const dz of [-margin,margin])for(const y of [0,spot.y+4]){const [x,z]=[spot.x+dx,spot.z+dz];const v=new THREE.Vector3(x,y,z).applyMatrix4(view.matrixWorldInverse);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);}
 const right=new THREE.Vector3(1,0,0).applyQuaternion(view.quaternion),up=new THREE.Vector3(0,1,0).applyQuaternion(view.quaternion),dir=view.getWorldDirection(new THREE.Vector3());
 const middle=view.position.clone().add(right.multiplyScalar((minX+maxX)/2)).add(up.multiplyScalar((minY+maxY)/2));
 return {width:maxX-minX,height:maxY-minY,focus:middle.add(dir.multiplyScalar(-middle.y/dir.y))};
}
// World II's props, landmarks and the Village Fields (Oct 2026, village-scene.js) arrive after the village is on screen, like the farm's
// extra scenery: the trip is not slower, and if any of it fails the village simply shows without it.
let villageGroup=null,villageExtras=null;
async function addVillageExtras(){
 try{
  const {loadVillageExtras,createVillageFields}=await import('./village-scene.js');
  villageExtras=await loadVillageExtras(villageGroup);scene.add(villageExtras.group);
  // The Fields' lid (11 Oct 2026, the owner's review: only a tap by their name, at the plot's south-west corner, opened them) takes the
  // place of their block on their place: a tap anywhere on the plot finds the place as a tap on the block did, and it shows, greys and
  // hides with it. The block (4 x 3 x 4 round the name's foot) also caught taps on the tree and the grass outside that corner.
  try{
   villageExtras.fields=await createVillageFields(villageGroup);scene.add(villageExtras.fields.group);
   const v=buildingViews.get('villagefields');if(v){v.object.remove(v.hit);v.object.attach(villageExtras.fields.tap);v.hit=villageExtras.fields.tap;}
  }catch(error){console.warn('The Village Fields were skipped.',error);}
  syncVillageExtras();renderer.shadowMap.needsUpdate=true;
 }catch(error){console.warn('The village extras were skipped.',error);}
}
// A place's props show once it is built, and the Fields a strip for every crop they can sow; the landmarks are placeLandmarks's.
function syncVillageExtras(){
 if(!villageExtras)return;
 for(const [key,mesh] of villageExtras.places)mesh.visible=state.buildings[key]?.built===true;
 const fields=state.buildings.villagefields?.built===true;
 villageExtras.fields?.show(crop=>fields&&recipeUnlocked(state,`sow${crop}`));
}
// "Show me" on the golden brief (Oct 2026): the village's normal view, moved so the place is in the middle (as far as the mountains let
// it: resize keeps every view inside them), and its name lights up for a moment. On an upright phone the Lumber Camp across the lake
// is a swipe away otherwise. The camera looks at at+(pan+panDepth,0,panDepth-pan) (resize), so a spot is in the middle at this pan.
// 11 Oct 2026 (the owner's review: the Wind pump stayed high in the rocks): the camera looks at the ground, so a place's spot (y, its roof
// or a landmark's top) goes in the middle as the ground spot behind it does, .9 of its height towards the mountains (from 36, 40, 36).
function villagePan(spot,at){const h=spot.y??0,dx=spot.x-.9*h-at.x,dz=spot.z-.9*h-at.z;return {pan:(dx-dz)/2,panDepth:(dx+dz)/2};}
function showVillagePlace(key){
 const v=buildingViews.get(key)??utilityViews.get(key)??landmarkViews.get(key);if(!villageWorld||!v||!villageFrame)return;
 document.querySelectorAll('dialog[open]').forEach(d=>d.close());
 const upright=mobileLayout.matches&&world.clientWidth<world.clientHeight;
 viewMode=startView();zoom=1;({pan,panDepth}=villagePan(v,upright?villageFrame.phone:villageFrame.focus));resize();updateUI();
 v.label.classList.remove('is-pointed');void v.label.offsetWidth;v.label.classList.add('is-pointed');setTimeout(()=>v.label.classList.remove('is-pointed'),2400);
}
// The arrival toast points to the market square while the first two places wait for their brief (the start of the village).
const briefWaits=()=>{const b=villageBrief(state);return Boolean(b?.open)&&['mine','lumbercamp'].includes(b.place);};
// World II: a village place has no model of its own (it is part of the village scene), only an invisible block to measure and
// grey out, with the same label as a farm building (or a place pin for the market and the road back).
function villageMarker(x,y,z){
 const object=new THREE.Group(),block=new THREE.Mesh(new THREE.BoxGeometry(4,3,4),new THREE.MeshBasicMaterial({visible:false}));
 block.position.y=1.5;object.add(block);object.position.set(x,y,z);scene.add(object);object.updateMatrixWorld(true);return object;
}
function addVillagePlace(key,{x,y,z}){
 const object=villageMarker(x,y,z);object.userData.building=key;
 const label=document.createElement('button');label.className='building-label';label.dataset.building=key;label.setAttribute('aria-label',`Open ${BUILDINGS[key].name}`);
 label.innerHTML=`<span class="building-pin">${art(key)}</span><span><strong>${BUILDINGS[key].name}</strong><small class="building-status" data-building-status="${key}">Ready to work</small></span>`;
 label.addEventListener('click',()=>tapBuilding(key));$('building-labels').append(label);
 buildingViews.set(key,{object,hit:object.children[0],outline:new THREE.Object3D(),label,pin:label.querySelector('.building-pin'),pinArt:key,x,y,z,height:y+3,locked:false});
}
function addVillageUtility(key,{x,y,z}){
 const object=villageMarker(x,y,z);object.userData.utility=key;const info=utilityInfo[key];
 const label=document.createElement('button');label.className='utility-label';label.dataset.utility=key;label.title=`${info.name} · ${info.hint}`;label.setAttribute('aria-label',`Open ${info.name}`);label.innerHTML=art(key);label.onclick=()=>openUtility(key);
 $('building-labels').append(label);utilityViews.set(key,{object,label,info,x,y,z,height:y+3,locked:false});
}
// The village's landmarks (levels 165-200, Oct 2026): a pin over each finished one and over the next one the golden brief builds, from its
// level on, with its model greyed until it is finished (the owner's choice of 10 Oct); before its level nothing of it shows. A finished one
// says its bonus; the next one opens the market square, where its card is.
const landmarkViews=new Map();
function addVillageLandmark(key,{x,y,z}){
 const l=VILLAGE_LANDMARKS[key],label=document.createElement('button');label.className='utility-label landmark-label';label.dataset.landmark=key;label.hidden=true;
 label.innerHTML=art(l.art);label.setAttribute('aria-label',`Open ${l.name}`);label.onclick=()=>openLandmark(key);$('building-labels').append(label);
 landmarkViews.set(key,{label,model:null,x,y,z,height:y+3,look:''});
}
// The bonus is the toast (its name is on the pin that was tapped); one sentence, so it is translated as a whole.
function openLandmark(key){if(landmarkDone(state,key))toast(VILLAGE_LANDMARKS[key].effect);else villageSquare?.open();}
// What a landmark's pin says: its bonus once it is finished, else what the market square asks next. Once every good is handed in only the
// coins are left (10 Oct 2026, review fix: the pin still said to bring the goods).
const landmarkNote=(key,done)=>{if(done)return VILLAGE_LANDMARKS[key].effect;const next=villageLandmark(state);return next?.id===key&&!Object.keys(next.missing).length?'Pay the coins at the market square to finish it.':'Bring the goods to the market square.';};
function placeLandmarks(width,height){
 if(!landmarkViews.size)return;
 const next=villageLandmark(state);
 for(const [key,v] of landmarkViews){
  const l=VILLAGE_LANDMARKS[key],done=landmarkDone(state,key),shown=done||next?.id===key&&next.open;
  v.model??=villageExtras?.landmarks.get(key)??null;   // the extras file arrives after the pins (and one that fails leaves only the pins)
  if(v.model&&v.look!==`${shown}:${done}`){v.look=`${shown}:${done}`;villageExtras.showLandmark(key,shown);setLocked(v.model,!done);renderer.shadowMap.needsUpdate=true;}
  if(!shown){v.label.hidden=true;continue;}
  const title=`${l.name} · ${landmarkNote(key,done)}`;if(v.label.title!==title)v.label.title=title;
  v.label.classList.toggle('ready',!done&&next.ready);
  const p=new THREE.Vector3(v.x,v.height+.3,v.z).project(camera),x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height;v.label.style.left=`${x}px`;v.label.style.top=`${y}px`;v.label.hidden=Math.abs(p.x)>.94||Math.abs(p.y)>.82||behindTools(x,y,22);
 }
}
// A villager's arrival (Oct 2026): in the village, a board that fell due is filled once a minute, as the market square does when it is
// drawn, so the square's pin lights without opening it. With the Great Hall finished each arrival (state.village.serial grows: from a load,
// a server answer or this fill) rings the Hall bell. No toast and no pop-up.
let hallSerial=null,lastArrivalCheck=0;
function villageArrivals(now){
 if(!villageWorld)return;
 if(now-lastArrivalCheck>60000){lastArrivalCheck=now;const t=farmNow(),before=state.village?.serial;if((state.village?.boards??[]).some(b=>!b.request&&t>=b.readyAt)){normalizeFarm(state,t);if(state.village.serial!==before)updateUI();}}
 const serial=state.village?.serial??0;if(hallSerial!==null&&serial>hallSerial&&landmarkDone(state,'greathall'))farmAudio.play('bell');hallSerial=serial;
}
// On the map yellow means ready, as on a building whose batch is done: the Farm stall from a quarter full (red once it is
// full and stops earning), the Farm chores when every chore that is open to the farmer can be done again (none of them is
// resting; after one chore it stays white until all are back), and a valley place with something waiting (the status the
// Buildings list sorts by).
function pinLight(key){
 if(key==='stall'){const now=farmNow(),s=stallStatus(state,now);return s.balance>=s.capacity?'full':stallNotice(state,now)?'ready':'';}
 if(key==='chores'){const now=farmNow(),open=Object.keys(CHORES).map(id=>choreStatus(state,id,now)).filter(s=>!s.locked);return open.length&&open.every(s=>!s.remaining)?'ready':'';}
 // The village's market square: a villager you can help or a golden brief you can build.
 // The Warehouse (22 Oct 2026): red while it is full and bringing in waits.
 if(key==='warehouse')return warehouseFull(state)?'full':'';
 if(key==='villagemarket')return villageSquareReady(state)?'ready':'';
 return economy.placeReady(key)?'ready':'';
}
// The live map in the top-left corner on a computer (public/minimap.js): a small render of the farm from high above, with what is
// ready and the part of the farm on screen, which moves when the map is clicked or dragged. Phones do not show it (and skip it).
let minimap=null,mapCamera=null,mapBuffer=null,lastMapShot=0;
const mapShown=()=>!!minimap&&getComputedStyle($('minimap')).display!=='none';
function setupMinimap(){
 const root=$('minimap');if(!root)return;
 const canvas=root.querySelector('canvas');
 mapBuffer=document.createElement('canvas');mapBuffer.width=canvas.width;mapBuffer.height=canvas.height;
 mapCamera=new THREE.OrthographicCamera(-1,1,1,-1,.1,500);
 const nameOf=(key,kind)=>kind==='building'?BUILDINGS[key].name:utilityInfo[key]?.name??key;
 minimap=createMinimap({root,background:mapBuffer,project:mapProject,unproject:mapUnproject,view:viewCorners,onJump:lookAt,
  points:()=>[...[...buildingViews].map(([key,v])=>({x:v.x,z:v.z,locked:v.locked,ready:v.label.classList.contains('ready'),name:nameOf(key,'building')})),
   ...[...utilityViews].map(([key,v])=>({x:v.x,z:v.z,locked:v.locked,ready:v.label.classList.contains('ready'),name:nameOf(key,'place')}))]});
 shootMinimap();
}
// Frame every building, place and field, seen from a steeper angle than the play camera (the same direction, so right on the
// map is right on screen).
function frameMapCamera(){
 const spots=[...buildingViews.values(),...utilityViews.values(),...plots].map(v=>new THREE.Vector3(v.x,0,v.z));
 const box=new THREE.Box3().setFromPoints(spots),centre=box.getCenter(new THREE.Vector3());
 mapCamera.position.copy(centre).add(new THREE.Vector3(36,95,36));mapCamera.up.set(0,1,0);mapCamera.lookAt(centre);mapCamera.updateMatrixWorld();
 let [minX,maxX,minY,maxY]=[Infinity,-Infinity,Infinity,-Infinity];
 for(const p of spots){const v=p.clone().applyMatrix4(mapCamera.matrixWorldInverse);minX=Math.min(minX,v.x);maxX=Math.max(maxX,v.x);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);}
 const pad=5,aspect=mapBuffer.width/mapBuffer.height,cx=(minX+maxX)/2,cy=(minY+maxY)/2;
 let w=maxX-minX+pad*2,h=maxY-minY+pad*2;if(w/h>aspect)h=w/aspect;else w=h*aspect;
 Object.assign(mapCamera,{left:cx-w/2,right:cx+w/2,top:cy+h/2,bottom:cy-h/2});mapCamera.updateProjectionMatrix();
}
// Render the map picture into the corner of the screen buffer, copy it, and draw the farm again, all in one go.
function shootMinimap(){
 if(!mapShown()||!renderer)return;
 frameMapCamera();
 const ratio=renderer.getPixelRatio(),w=mapBuffer.width,h=mapBuffer.height,fog=scene.fog;
 renderer.setScissorTest(true);renderer.setViewport(0,0,w/ratio,h/ratio);renderer.setScissor(0,0,w/ratio,h/ratio);
 scene.fog=null;atmosphere?.hide(true);renderer.render(scene,mapCamera);atmosphere?.hide(false);scene.fog=fog;
 // Grass first, and the render taken from just inside its edge: rounding can leave the outer pixel row unrendered.
 const out=mapBuffer.getContext('2d');out.fillStyle='#b7cd86';out.fillRect(0,0,w,h);out.drawImage(renderer.domElement,2,renderer.domElement.height-h+2,w-4,h-4,0,0,w,h);
 renderer.setScissorTest(false);renderer.setViewport(0,0,viewportWidth,viewportHeight);renderer.render(scene,camera);
 lastMapShot=performance.now();minimap.draw();
}
// Share my farm (Oct 2026, public/farm-share.js): the whole farm (24 Oct 2026, the owner: "share your farm toont heel je farm"): every
// building, field and tree you placed, wherever you moved them (measureFarm), with a little room round it, in the picture's shape. Rendered at the picture's size into the screen buffer and copied out in the same go (the buffer is not
// kept after a frame, and a render target would skip the tone mapping and colours), then the screen size and the farm are back before
// the browser paints. A bit larger than needed and scaled down, so the edges are smooth on phones too (they draw without antialias).
// Not in the village, and not once the 3D view was lost.
// The frustum round the whole farm, from the camera where it stands (overviewBounds are in the fixed view's own right and up axes).
function wholeFarmFrame(aspect){
 const b=overviewBounds;if(!b||!Number.isFinite(b.minX))return null;
 const p=camera.position,cx=(p.x-p.z)/Math.SQRT2,cy=-(p.x+p.z)*40/Math.sqrt(8384)+p.y*72/Math.sqrt(8384);
 const mx=(b.minX+b.maxX)/2-cx,my=(b.minY+b.maxY)/2-cy;
 let w=(b.maxX-b.minX)*1.06,h=(b.maxY-b.minY)*1.06;if(w/h>aspect)h=w/aspect;else w=h*aspect;
 return {left:mx-w/2,right:mx+w/2,top:my+h/2,bottom:my-h/2};
}
function shootFarmPhoto(width,height){
 if(!ready||!renderer||!camera||villageWorld||renderer.getContext().isContextLost())return null;
 const max=renderer.capabilities.maxTextureSize,scale=Math.min(mobileLayout.matches?1.5:1.25,max/width,max/height);
 const whole=wholeFarmFrame(width/height),photo=camera.clone();Object.assign(photo,whole??photoFrame(camera,width/height));
 // The front of the whole farm comes nearer the camera than the play view ever does: nothing there is cut off.
 if(whole)photo.near=Math.min(photo.near,-400);photo.updateProjectionMatrix();
 const was=hovered;highlight(-1);
 // Your farmer stands in it, facing you (21 Oct 2026, the owner: "Doe alles behalve 9", item 7; farm-farmer.js photo), on a spot the
 // photo shows; everything goes back as it was right after.
 const inPhoto=([x,z])=>{const v=new THREE.Vector3(x,1,z).project(photo);return Math.abs(v.x)<.85&&Math.abs(v.y)<.8;};
 let farmerBack=null;try{farmerBack=walker?.photo?.(inPhoto)??null;}catch{}
 const out=document.createElement('canvas');out.width=width;out.height=height;const ctx=out.getContext('2d');ctx.imageSmoothingQuality='high';
 try{renderer.setDrawingBufferSize(width,height,scale);renderer.render(scene,photo);ctx.drawImage(renderer.domElement,0,0,width,height);}
 finally{farmerBack?.();renderer.setDrawingBufferSize(viewportWidth,viewportHeight,viewportRatio);renderer.render(scene,camera);highlight(was);}
 return out;
}
const mapProject=(x,z)=>{const v=new THREE.Vector3(x,0,z).project(mapCamera);return [(v.x+1)/2*mapBuffer.width,(1-v.y)/2*mapBuffer.height];};
function mapUnproject(cx,cy){
 const p=new THREE.Vector3(cx/mapBuffer.width*2-1,1-cy/mapBuffer.height*2,-1).unproject(mapCamera),dir=new THREE.Vector3();mapCamera.getWorldDirection(dir);
 const t=-p.y/dir.y;return [p.x+dir.x*t,p.z+dir.z*t];
}
// Where the four corners of the screen meet the ground.
function viewCorners(){
 if(!camera)return null;const dir=new THREE.Vector3();camera.getWorldDirection(dir);
 return [[-1,1],[1,1],[1,-1],[-1,-1]].map(([x,y])=>{const p=new THREE.Vector3(x,y,-1).unproject(camera),t=-p.y/dir.y;return [p.x+dir.x*t,p.z+dir.z*t];});
}
// Put a spot of the farm in the middle of the view, within the usual panning limits. Wider than the heart of the farm it comes in to
// there, as the overview became the normal view (18 Oct 2026: the middle is the axis's own at that place, farmAxis.base).
function lookAt(x,z){
 if(villageWorld)return;
 stopGlide();if(zoomAt>1){zoomAt=1;resize();}
 const {x:bx,z:bz}=farmAxis?.base??{x:1.4,z:1.5},limit=Math.round(24*SPREAD),clamp=v=>Math.max(-limit,Math.min(limit,v));
 pan=clamp(((x-bx)-(z-bz))/2);panDepth=clamp(((x-bx)+(z-bz))/2);resize();
}
// World II: the signpost to the village on the road out of the valley. Not there below level 90, a closed bridge on its pin until 100,
// then the village's badge; tapping it travels (openUtility).
function placeVillageRoad(v,width,height){
 const shown=levelProgress(state).level>=WORLD_TWO_TEASER;v.object.visible=shown;if(!shown){v.label.hidden=true;return;}
 const locked=!worldTwoOpen(state);setLocked(v.object,locked);
 if(v.label.dataset.open!==String(!locked)){v.label.dataset.open=String(!locked);v.locked=locked;v.label.classList.toggle('locked',locked);v.label.innerHTML=art(locked?'village-bridge':'village-badge');v.label.setAttribute('aria-label',locked?`The Village (opens at level ${WORLD_TWO_LEVEL})`:'Travel to the village');v.label.title=locked?`The Village · Reach level ${WORLD_TWO_LEVEL} to travel to the village.`:'The Village · Travel to the village';}
 const p=new THREE.Vector3(v.x,v.height+.3,v.z).project(camera),x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height;v.label.style.left=`${x}px`;v.label.style.top=`${y}px`;v.label.hidden=Math.abs(p.x)>.94||Math.abs(p.y)>.82||behindTools(x,y,22);
}
// The village's first four places keep their grey labels below their level; a later one (Oct 2026) shows once it is built or its golden
// brief is the open one, so the upright phone's first view is never crowded with places years away.
const VILLAGE_FIRST_PLACES=Object.freeze(['mine','lumbercamp','smithy','villagemill']);
function positionBuildingLabels(){
 if(mapShown()){if(performance.now()-lastMapShot>30000)shootMinimap();else minimap.draw();}
 for(const decor of familyDecor)setLocked(decor,!buildingEligible(state,'familyhall'));
 void familyFlag?.update(buildingEligible(state,'familyhall')?state.family:null);
 for(const decor of factoryDecor)setLocked(decor,!buildingEligible(state,'factory'));
 // A yard's pieces are greyed out with it: a building until its level, the Ranch and the Valley Market until theirs.
 for(const [key,list] of Object.entries(yardDecor)){const locked=BUILDINGS[key]?!buildingEligible(state,key):!featureUnlocked(state,key);for(const decor of list)setLocked(decor,locked);}
 if(windmillRotor)setLocked(windmillRotor,!buildingEligible(state,'windmill'));
 const width=world.clientWidth,height=world.clientHeight;
 farmLife?.position(camera,width,height,farmNow());pond?.position(camera,width,height);pets?.position(camera,width,height);
 positionLandLabels(width,height);
 paintTractor();
 for(const [key,v] of utilityViews){
  // The after-90 places (seed lab, visitors, valley projects) are hidden, models and pins, until the farm reaches level 90.
  if(ENDGAME_PLACES.includes(key)){const shown=endgameInSight(state);v.object.visible=shown;for(const d of yardDecor[key]??[])d.visible=shown;if(!shown){v.label.hidden=true;continue;}}
  if(key==='villageroad'){placeVillageRoad(v,width,height);continue;}
  const locked=!featureUnlocked(state,key);setLocked(v.object,locked);
  if(v.locked!==locked){v.locked=locked;v.label.classList.toggle('locked',locked);v.label.innerHTML=art(locked?'lock':key);v.label.setAttribute('aria-label',locked?`${v.info.name} (locked)`:`Open ${v.info.name}`);v.label.title=locked?`${v.info.name} · ${featureUnlockHint(key)}`:`${v.info.name} · ${v.info.hint}`;}
  const light=locked?'':pinLight(key);v.label.classList.toggle('ready',light==='ready');v.label.classList.toggle('full',light==='full');
  const p=new THREE.Vector3(v.x,v.height+.3,v.z).project(camera),x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height;v.label.style.left=`${x}px`;v.label.style.top=`${y}px`;v.label.hidden=Math.abs(p.x)>.94||Math.abs(p.y)>.82||behindTools(x,y,22);
 }
 const brief=villageWorld?villageBrief(state)?.place:null;
 for(const [key,v]of buildingViews){
  const waiting=villageWorld&&!VILLAGE_FIRST_PLACES.includes(key)&&state.buildings[key]?.built!==true&&brief!==key;
  v.object.visible=!waiting;if(waiting){v.label.hidden=true;continue;}
  const locked=!buildingEligible(state,key),status=economy.status(key);setLocked(v.object,locked);
  if(v.locked!==locked){v.locked=locked;v.label.classList.toggle('locked',locked);v.pin.innerHTML=art(locked?'lock':v.pinArt);v.label.setAttribute('aria-label',locked?`${BUILDINGS[key].name} (locked)`:`Open ${BUILDINGS[key].name}`);}
  const hint=locked?`${BUILDINGS[key].name} · ${status.text}`:'';if(v.hint!==hint){v.hint=hint;v.label.title=hint;}
  const p=new THREE.Vector3(v.x,v.height+.45,v.z).project(camera),x=(p.x*.5+.5)*width,y=(-p.y*.5+.5)*height;v.label.style.left=`${x}px`;v.label.style.top=`${y}px`;if(v.slid){v.slid=false;v.label.style.removeProperty('--tail');}v.label.hidden=Math.abs(p.x)>.92||Math.abs(p.y)>.82||behindTools(x,y,80)&&(!villageWorld||nameBehindTools(v,x,y));v.label.classList.toggle('ready',status.kind==='ready');
  // A small window shows only the picture (16 Oct 2026, desktop-hud.css): batches ready to collect keep their number on it.
  const ready=!locked&&status.kind==='ready'&&status.ready>0?String(status.ready):'';if((v.label.dataset.ready??'')!==ready)v.label.dataset.ready=ready;
  // The Pier has no batches to collect (Oct 2026): its name opens the town boat.
  if(!locked){const aria=`${status.kind==='ready'&&BUILDINGS[key].type!=='pier'?'Collect from':'Open'} ${BUILDINGS[key].name}`;if(v.label.getAttribute('aria-label')!==aria)v.label.setAttribute('aria-label',aria);}
 }
 placeLandmarks(width,height);
 clearRail();
}
// The phone's event rail (public/event-rail.js, hud.css; 18 Oct 2026: the Offer tile, Today, Events and the pass at the right-hand edge
// under the top bar): a place's pin that would sit under one of its buttons moves inward, clear of the rail, so a building ready to
// collect, a helping hand or a village place is never covered there and needs no pan. Read after every pin has its place; only pins
// near the rail are measured, and only while the rail shows something.
function clearRail(){
 if(!mobileLayout.matches)return;
 const rail=document.getElementById('event-rail');if(!rail)return;
 // The one button's open list (public/event-rail.js) is only there for a moment: the pins stay where they are under it.
 const blocks=[...rail.children].filter(b=>b.id!=='rail-panel').map(b=>b.getClientRects().length?b.getBoundingClientRect():null).filter(r=>r&&r.width>0);
 if(!blocks.length)return;
 // At the right-hand edge, or the left one in Arabic: a pin moves away from the edge the rail is at.
 const atRight=(blocks[0].left+blocks[0].right)/2>innerWidth/2;
 const box={left:Math.min(...blocks.map(r=>r.left))-8,right:Math.max(...blocks.map(r=>r.right))+8,top:Math.min(...blocks.map(r=>r.top))-6,bottom:Math.max(...blocks.map(r=>r.bottom))+6};
 const pins=[...utilityViews.values(),...buildingViews.values(),...landmarkViews.values(),...(farmLife?.views?.values()??[])].map(v=>v.label).filter(l=>l&&!l.hidden);
 const moves=[];
 for(const label of pins){
  const r=label.getBoundingClientRect();
  if(r.right>box.left&&r.left<box.right&&r.bottom>box.top&&r.top<box.bottom)moves.push([label,atRight?box.left-r.right:box.right-r.left]);
 }
 for(const [label,shift] of moves)label.style.left=`${parseFloat(label.style.left)+shift}px`;
}
// After every answer from the server (farm-client.js onChange). The village has no fields and never loads the farm's models: createPlots
// there threw "Missing model: ground_004", so each reply in the village (a request, a build, a batch) ended in that error.
// A move saved on this device or on another one goes to the screen too (your own farm layout, applyLayout).
function expandVisuals(){if(!ready)return;if(villageWorld){renderer.shadowMap.needsUpdate=true;resize();icons();return;}createPlots();if(layoutKey!==(layoutKey=JSON.stringify(state.layout??{})))applyLayout();scenePolish?.sync();measureFarm();plots.forEach((_,i)=>drawCrop(i));renderer.shadowMap.needsUpdate=true;resize();icons();shootMinimap();}
// Settings › Graphics (21 Oct 2026, public/graphics-mode.js): Simple graphics on or off, saved on this device, and the farm opens again
// with it as Try again does (on a portal its page opens the farm again). Its text says it also switches on by itself after trouble.
function bindGraphicsSetting(){
 // Left-handed fishing (23 Oct 2026, a player): the fish bar stands left of the reel button, or right of it when this is on (public/pond-ui.js).
 const hand=$('pond-bar-right');
 if(hand){try{hand.checked=localStorage.getItem('harvest-tycoon:pond-bar')==='right';}catch{}hand.onchange=()=>{try{localStorage.setItem('harvest-tycoon:pond-bar',hand.checked?'right':'left');}catch{}};}
 // Move things (24 Oct 2026, the owner: "Zet in Graphics verplaatsen aan/uit, standaard aan"): the Move button and its entry in More.
 const move=$('move-things');
 if(move){move.checked=movingOn();move.onchange=()=>{try{localStorage.setItem(MOVE_KEY,move.checked?'on':'off');}catch{}showMoving();};}
 const box=$('graphics-simple');if(!box)return;
 box.checked=graphicsSimple;
 box.onchange=()=>{chooseGraphics(gfxStore,box.checked);$('graphics-status').textContent='Opening your farm again…';
  const again=document.querySelector('#error .primary-button');setTimeout(()=>{if(typeof again?.onclick==='function')again.onclick();else try{window.parent.location.reload();}catch{location.reload();}},300);};
}
function bindUI(){
 bindGraphicsSetting();
 if(!villageWorld&&!adminView)spot=createSpotlight();
 document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
 document.querySelectorAll('[data-crop]').forEach(b=>b.addEventListener('click',()=>setCrop(b.dataset.crop)));
 $('market-button').addEventListener('click',()=>openDialog('market-dialog'));
 $('market-dialog').addEventListener('close',()=>showCoins(state.coins));
 // The coins open the Market, where coins are made (23 Oct 2026, the owner): their pill looked like a button and now is one.
 $('coin-button')?.addEventListener('click',()=>openDialog('market-dialog'));
 $('help-button').addEventListener('click',()=>{renderWiki(state);openDialog('help-dialog');});
 // Feedback & bugs: the mailbox (public/feedback-ui.js), beside How to play and in the More menu.
 const feedback=createFeedback({level:()=>levelProgress(state).level});
 $('feedback-button').addEventListener('click',()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());feedback.open();});
 // A topic of How to play, and a spot in it (a pop-up's button opens how to install the app: src/popup-ui.js). options (Oct 2026):
 // renderWiki's {from}, where it was opened from for its way back (the chat's wiki chip: "‹ Chat", src/chat-ui.js).
 window.harvestWiki=(id,anchor='',options={})=>{openDialog('help-dialog');renderWiki(state,id,anchor,options);};
 $('village-button').addEventListener('click',()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(!villageWorld)travel('village');});
 // My farm: back to the farm's own view. No toast (18 Oct 2026, the owner: the camera move shows it).
 $('farm-button').addEventListener('click',()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(villageWorld){travel('farm');return;}resetView();});
 document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
 // A click on the dimmed backdrop closes the open dialog. One delegated listener, so dialogs created later (farm events,
 // daily sharing, Welcome Back, the starter pack) behave exactly like the ones in farm.html.
 document.addEventListener('click',e=>{const d=e.target;if(!(d instanceof HTMLDialogElement)||!d.open||d.hasAttribute('data-keep-open'))return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});
 $('sell-all').addEventListener('click',()=>sell());
 const toggleQuest=()=>{if(mobileLayout.matches){beginner.open();return;}const hidden=!$('quest-body').hidden;$('quest-body').hidden=hidden;$('quest-collapse').setAttribute('aria-expanded',String(!hidden));$('quest-collapse').setAttribute('aria-label',hidden?'Expand quest':'Collapse quest');$('quest-collapse').innerHTML=`<i data-lucide="${hidden?'clipboard-check':'chevron-up'}"></i>`;icons();};
 $('quest-collapse').addEventListener('click',toggleQuest);
 document.querySelector('.quest-heading')?.addEventListener('click',event=>{if(event.target.closest('#quest-collapse'))return;if(mobileLayout.matches)beginner.open();});
 soundUI=createSoundSettings(farmAudio,{onEmailOn:()=>{if(!emailAccount.needed)return;toast('Confirm your email address and the daily email starts.');emailCheckUI?.open();}});
 // Settings at one part (4 Oct 2026): a link to /settings/<part> (src/game-cloud.js harvestOpen) and the chat's Settings chip.
 window.harvestSettings=part=>soundUI.open(part);
 // My farmer in Settings › Profile, under the avatar (21 Oct 2026): the avatar stays your picture, the farmer is who walks on your farm.
 {const block=$('farmer-settings');if(block){block.hidden=adminView;$('farmer-settings-open').onclick=()=>void openMyFarmer();}}
 renderLanguageSettings();
 // Every dropdown in the game gets the game look, also the ones that are drawn later (public/pretty-select.js).
 watchSelects();
 document.addEventListener('visibilitychange',()=>productionSounds.reset(state.buildings,farmNow()));
 $('zoom-in').addEventListener('click',()=>villageWorld?zoomFarm(1.25):stepFarm(1));$('zoom-out').addEventListener('click',()=>villageWorld?zoomFarm(1/1.25):stepFarm(-1));$('zoom-reset').addEventListener('click',resetView);$('fields-view').addEventListener('click',focusFields);$('zoom-fit').addEventListener('click',showOverview);
 window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.altKey)return;const t={1:'plant',2:'water',3:'tend',4:'harvest'}[e.key];if(t){e.preventDefault();setTool(t);}});
 liveEvents=createLiveEventsUI({state,notify:toast,refreshFarm:()=>client.refresh(),onClaimed:reward=>{if(reward?.coins>0||reward?.diamonds>0)farmerCheers();}});
 // Confirm your email for 10 diamonds: a button in the left sidebar (desktop) and a card in the More menu, only for an email sign-up
 // that has not been paid yet. After the code, a farm reload pays the diamonds (the gift pop-up) and both disappear.
 emailCheckUI=createEmailCheck({bridge:window.parent.harvestBridge,email:()=>emailAccount.email,canChange:()=>emailAccount.canChange===true,onDone:()=>client.refresh(),
  // The new address also goes to Settings, Your account's "You sign in with…" line (17 Oct 2026, src/account-sign-in-ui.js), masked again.
  onChanged:async next=>{setEmailCheck({...emailAccount,email:next});document.dispatchEvent(new CustomEvent('harvest-email-changed',{detail:next}));toast(`Your email address is now ${next}.`);await client.refresh();}});
 $('email-button').onclick=()=>emailCheckUI.open();
 $('email-settings-change').onclick=()=>emailCheckUI.open({change:true});$('email-settings-confirm').onclick=()=>emailCheckUI.open();
 setEmailCheck(initialEmailCheck);
 familyUI=createFamilyUI({state,runAction,notify:toast,isReady:()=>ready});
 // The Halloween Pass (Oct 2026, public/pass-ui.js): its button sits next to Farm family's; it opens only when tapped.
 passUI=createPassUI({state,runAction,notify:toast,onChange:updateUI});
 seasonUI=createSeasonUI({state,runAction,notify:toast,onChange:updateUI});
 lookSettings=createLookSettings(document.getElementById('look-settings'),{state,runAction,clock:farmNow});
 // The family chat's request cards (src/chat-ui.js) show how many of the asked-for good you have.
 window.harvestStock=key=>Number(state.inventory?.[key])||0;
 economy=createEconomyUI({state,onFamily:()=>familyUI.open(),onPlace:key=>openUtility(key),onBoat:()=>boat?.open(),onChange:updateUI,onCrop:setCrop,onExpand:expandVisuals,notify:toast,runAction,onEstate:section=>growth.open(section),onWarehouse:()=>warehouse?.open(),village:villageWorld});
 // The Warehouse's window and its full note (22 Oct 2026, public/warehouse-ui.js). A refusal because it is full is that note, with the Market
 // and Upgrade, over any open window (the toast sits under a modal window); every other message stays the toast.
 warehouse=createWarehouseUI({state,runAction,openMarket:tab=>economy.openMarket(tab),notify:toast,onChange:updateUI});
 {const plain=showToast??createToast($('toast'));showToast=(message,options)=>{if(isWarehouseFull(message))warehouse.note(message);else plain(message,options);};}
 let savedCrop=null;try{savedCrop=localStorage.getItem(CROP_KEY);}catch{}
 if(savedCrop&&CROPS[savedCrop]&&cropUnlocked(state,savedCrop))economy.chooseCrop(savedCrop);
 // Every seventh day of a streak (7, 14 ...) is celebrated with the gift popup, after a level-up if one is showing.
 const weekCelebration=r=>{const weeks=r.streak/7;afterCelebration(()=>{giftPopup({coins:r.coins,diamonds:r.diamonds},{eyebrow:'A FULL STREAK WEEK',title:`${r.streak}-day streak!`,icon:'streak',text:`${weeks===1?'Seven days':`${weeks} weeks`} in a row!${r.boost?` Plus ${r.boostMinutes>=60?`${r.boostMinutes/60} hour`:`${r.boostMinutes} minutes`} of double earnings.`:''} Every day your streak holds pays the day-7 gift.`});});};
 retention=createRetentionUI({state,runAction,onChange:()=>{expandVisuals();updateUI();},notify:toast,getCrop:()=>seasonCrop(selectedCrop)?tractorCrop:selectedCrop,itemList:economy.itemList,celebrate:weekCelebration});
 growth=createGrowthUI({state,runAction,onChange:()=>{expandVisuals();updateUI();},onNotice:()=>mobileUI?.refresh(),notify:toast,itemList:economy.itemList,onPlant:key=>economy.chooseCrop(key)});
 valley=createValleyUI({state,runAction,onChange:()=>{expandVisuals();updateUI();},notify:toast,itemList:economy.itemList});
 // World II's market square (Oct 2026): opened by the Village market's pin; Show me turns the village's camera to a place.
 villageSquare=createVillageSquareUI({state,runAction,onChange:updateUI,notify:toast,itemList:economy.itemList,onShow:showVillagePlace,onSell:()=>economy.openMarket('village'),refresh:()=>client.refresh()});
 // The town boat at the Pier (Oct 2026, from level 144): its own window, from the Pier's name and the village's Buildings list. A refusal
 // for a cargo the server no longer has loads the farm again, as the market square does.
 boat=createBoatUI({state,runAction,onChange:updateUI,notify:toast,refresh:()=>client.refresh()});
 estatePlaces=createEstateUI({state,runAction,onChange:()=>{expandVisuals();updateUI();},notify:toast,itemList:economy.itemList});
 boosts=createBoostsUI({state,runAction,onChange:()=>{expandVisuals();updateUI();},notify:toast,village:villageWorld});
 // The purchase pop-up after a cancelled or expired checkout (src/payment-ui.js) offers a way straight back to the shop.
 window.harvestShop={open:()=>boosts.open()};
 // A cancelled or expired checkout goes back to the packs, also in the village (where the shop itself opens on the Village tab).
 window.harvestShop.packs=()=>boosts.open('diamond-store');
 // A notification or a shortcut on the app icon can open Today (src/game-cloud.js harvestOpen).
 window.harvestToday=()=>retention.openToday();
 rookie=createRookieUI({state});
 quests=createQuestsUI({state,claim,claimVillage,icons,notify:toast,openToday:id=>retention.openToday('challenges',{at:id}),village:villageWorld});
 activities=createActivitiesUI({state,runAction,notify:toast,onResult:(action,result)=>{if(action.type==='activity_work'){farmLife?.celebrate(action.station);}}});
 // The guide (Part A, 11 Oct 2026): showWay shows the way to a step (Show me, and by itself once after each step: auto); the coach must be
 // free for that (idle). At the end the card leads to the next goal (A8, next-goal.js): one green button for it, Thank you beside it.
 // A calm start's step 5 (the buildings come): the farm opens out from the fields (startView).
 beginner=createBeginnerUI({state,runAction,icons,notify:toast,onChange:updateUI,onStep:(step,before)=>{if(before!==null&&before<4&&(step===null||step>=4)&&ready&&!villageWorld)resetView();},onFinished:result=>{const goal=nextGoal(state);giftPopup({xp:result.xp,diamonds:result.diamonds},{eyebrow:'BEGINNER GUIDE COMPLETE',title:'Well done, farmer!',icon:'diamonds',text:comeBackNote(farmNow(),{lead:goal.kind!=='quest'&&goal.kind!=='daily'}),action:goalAction(goal)});},guide:showWay,idle:()=>!coach.active,claimQuest:claim,openQuest:id=>quests.openAt(id),openToday:id=>retention.openToday('challenges',{at:id}),village:villageWorld});
 const inviteUI=createInviteUI({notify:toast});
 // Share my farm (Oct 2026): on the level-up card and on your own profile (src/player-profiles.js, through window.harvestShareFarm).
 // The village is another scene, so not there. It takes the invite link Invite a friend already asked for (one ask per visit).
 const farmShare=villageWorld?null:createFarmShare({capture:shootFarmPhoto,canCapture:()=>ready&&Boolean(renderer)&&!renderer.getContext().isContextLost(),state,invite:()=>inviteUI.info(),host:window.parent??window,track:(event,params)=>{try{window.parent.harvestBridge?.trackShare?.(event,params);}catch{}},drawCloth:drawFamilyCloth,playerName:()=>$('player-name')?.dataset.username});
 window.harvestShareFarm=farmShare;
 progression=createProgressionUI({state,isReady:()=>ready&&$('loading').hidden,share:farmShare,notify:toast});
 if(initialLevelReward?.levels.length)progression.announce({...progressionChange(progressionSnapshot(state),state,initialLevelReward),catchUp:true});
 if(initialGift)giftPopup(initialGift);
 if(initialInvite)inviteLoadPopup(initialInvite);
 mobileUI=createMobileUI({openUtility,resetView});
 $('save-status').onclick=()=>client.retry();
 new ResizeObserver(resize).observe(world);const sideTools=document.querySelector('.side-tools');if(sideTools)new ResizeObserver(resize).observe(sideTools);const guideCard=document.querySelector('.beginner-card');if(guideCard)new ResizeObserver(resize).observe(guideCard);const goalCard=$('next-goal-card');if(goalCard)new ResizeObserver(resize).observe(goalCard);icons();
}
function frame(now){
 requestAnimationFrame(frame);if(!ready||document.hidden||visitLayer)return;
 // A glide of the farm's camera (glideFarm, wheelFarm) takes its step here, just before the farm is drawn, and while one runs the farm is
 // drawn at every display frame (18 Oct 2026): the picture and the names over it move together.
 const gliding=Boolean(glide);if(gliding)glide.step(now);
 if(!gliding&&now-lastFrame<32)return;const dt=Math.min((now-lastFrame)/1000,.1);lastFrame=now;
 pond?.tick(now,dt);
 if(now-lastTick>500){if(productionSounds.check(state.buildings,farmNow()))farmAudio.play('ready');plots.forEach((_,i)=>drawCrop(i));positionLabels();positionBuildingLabels();economy.tick();retention.tick();growth.tick();boosts.tick();rookie.tick();activities.tick();beginner?.tick();atmosphere?.tick();syncVillageExtras();villageArrivals(now);icons();renderer.shadowMap.needsUpdate=true;lastTick=now;}
 // Phones, tablets and the apps (13 Oct 2026, Android vitals): under a window opened with showModal the farm is drawn once a second,
 // not 30 times (public/windows.js farmRests); the 500 ms tick above still runs, so the windows' own timers keep going.
 if(farmRests(handheld||mobileLayout.matches,now-lastDraw,modalOpen))return;lastDraw=now;
 if(!reducedMotion){familyFlag?.tick(now/1000);
  // The sails turn only while the Windmill is making something: they pick up speed and slow down again gently.
  if(windmillRotor){const busy=buildingBusy('windmill');windmillSpeed+=((busy?.28:0)-windmillSpeed)*Math.min(1,dt*.8);windmillRotor.rotation.z-=dt*windmillSpeed;}
  const t=clock.getElapsedTime();farmLife?.animate(t,dt,farmNow());pets?.animate(dt);herd?.animate(dt,camera);walker?.animate(dt,camera);for(const other of familyWalkers)other.animate(dt,camera);scenePolish?.animate(t);atmosphere?.animate(t,dt);if(cropMotion?.animate())renderer.shadowMap.needsUpdate=true;
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.velocity.y-=dt*3;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.material.opacity=Math.max(0,p.life);if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);}}
 }
 renderer.render(scene,camera);
 if(spot){const target=spotTarget();if(target)spot.show(target.rect??null,{all:Boolean(target.all)});else spot.hide();}
}
function registerAgentTools(){
 if(!document.modelContext?.registerTool)return;
 const lifecycle=new AbortController();
 const specs=[
  {name:'get_farm_state',title:'Inspect the farm',description:'Read coins, inventory, field IDs, growth and quests in your saved Harvest Tycoon farm.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>farmSummary(state)},
  {name:'work_farm_fields',title:'Plant, water or harvest fields',description:'Apply one farming action to the given fields. Planting spends coins; harvesting adds produce to inventory. Returns per-field results.',inputSchema:{type:'object',properties:{fieldIds:{type:'array',items:{type:'integer',minimum:0,maximum:MAX_PLOTS-1},minItems:1,maxItems:MAX_PLOTS,uniqueItems:true},action:{type:'string',enum:['plant','water','harvest','tend']},crop:{type:'string',enum:Object.keys(CROPS)}},required:['fieldIds','action'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{
   if(!ready)throw new Error('The farm is still loading.');
   if(!input||!Array.isArray(input.fieldIds)||input.fieldIds.length<1||input.fieldIds.length>state.plots.length||new Set(input.fieldIds).size!==input.fieldIds.length||input.fieldIds.some(i=>!Number.isInteger(i)||i<0||i>=state.plots.length)||!['plant','water','harvest','tend'].includes(input.action)||input.crop!==undefined&&!Object.hasOwn(CROPS,input.crop))throw new Error('Invalid field IDs, action or crop.');
   if(input.crop)economy.chooseCrop(input.crop);setTool(input.action);
   return {results:await input.fieldIds.reduce(async(previous,id)=>[...await previous,{id,...await interact(id,input.action)}],Promise.resolve([])),farm:farmSummary(state)};
  }},
  {name:'sell_farm_harvest',title:'Sell harvested crops',description:'Sell all stored crops and goods, or all of one item, for coins at the market.',inputSchema:{type:'object',properties:{crop:{type:'string',enum:['all',...Object.keys(ITEMS)]}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{const crop=input?.crop??'all';if(!['all',...Object.keys(ITEMS)].includes(crop))throw new Error('Invalid crop.');const result=await sell(crop);return {...result,farm:farmSummary(state)};}},
  {name:'start_farm_production',title:'Start a production batch',description:'Consume the ingredients and start a timed recipe in its farm building. Does not collect the finished goods.',inputSchema:{type:'object',properties:{recipe:{type:'string',enum:Object.keys(RECIPES)}},required:['recipe'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!ready)throw new Error('The farm is loading.');const result=await runAction({type:'produce',recipe:input?.recipe});updateUI();economy.openBuilding(result.building);return {...result,farm:farmSummary(state)};}},
  {name:'collect_farm_production',title:'Collect a finished batch',description:'Collect finished goods from a building into inventory. Fails when the batch is not ready.',inputSchema:{type:'object',properties:{building:{type:'string',enum:Object.keys(BUILDINGS).filter(k=>k!=='farmhouse')}},required:['building'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!ready)throw new Error('The farm is loading.');const result=await runAction({type:'collect',building:input?.building});updateUI();economy.openBuilding(result.building);return {...result,farm:farmSummary(state)};}},
  {name:'upgrade_farm_building',title:'Upgrade a farm building',description:'Spend coins to increase production speed, or expand the fields when building is farmhouse.',inputSchema:{type:'object',properties:{building:{type:'string',enum:Object.keys(BUILDINGS)}},required:['building'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!ready)throw new Error('The farm is loading.');const result=await runAction(input?.building==='farmhouse'?{type:'expand'}:{type:'upgrade',building:input?.building});expandVisuals();updateUI();economy.openBuilding(input.building);return {...result,farm:farmSummary(state)};}}
 ];
 for(const tool of specs){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
// Show me: the way to a step of the guide (and to a goal of the next-goal card). auto (11 Oct 2026, Part A A12): the guide shows it by itself
// once after each finished step; the pointer then ends on any tap that is not on it (coach.js). Right after planting, the Water tool lights
// and one line says when (A12, step 4); the camera stays where the farmer is planting. stay (13 Oct 2026): step 2's pointer to Market
// is not ended by taps on the farm (beginner-ui.js, coach.js).
function showWay(target,{auto=false,stay=false}={}){
 if(auto&&target==='water'&&state.plots.some(p=>canWater(p,farmNow()))){coach.stop();showTool('water');toast('Water it within a minute.');return;}
 // A building to build (A8, A13): through Buildings (or its name on the map) to its Build button.
 if(typeof target==='string'&&target.startsWith('build:')){const steps=guideSteps(target,{state,now:farmNow()});if(steps){coach.stop();coach.start(steps,{auto});}else economy.openBuilding(target.slice(6));return;}
 coach.stop();sweepGhost.stop();
 // Harvest (Oct 2026): sweeping is said first. A finger holds a field a moment before it sweeps (a quick swipe moves the farm).
 // Step 1's Show me also draws a see-through sickle sweeping over the ripe starter corn, again and again until the first harvest, on
 // the farm itself (no window, no bubble; every tap goes through).
 const touch=mobileLayout.matches||matchMedia('(pointer: coarse)').matches,firstBasket=target==='harvest'&&beginnerProgress(state).find(q=>q.current)?.id==='harvest';
 // Plan F (13 Oct 2026, proposal 5): the care step's Show me with nothing growing points to planting (or to harvesting when no field is
 // empty); it asked for a care marker that could not come.
 if(target==='tend'&&!state.plots.some(p=>p.crop&&p.readyAt>farmNow())){const empty=state.plots.some(p=>!p.crop);if(empty)setCrop('wheat');else setTool('harvest');focusFields();toast(empty?'Plant wheat first: its care marker comes while it grows.':'Harvest a ripe crop first, then plant one: care is for a crop that grows.');return;}
 if(['plant','water','harvest','tend'].includes(target)){if(target==='plant')setCrop('wheat');else setTool(target);focusFields();toast(target==='plant'?'Tap an empty field to plant wheat.':target==='tend'?'Tap a growing crop with a care marker.':target==='water'?(state.plots.some(p=>canWater(p,farmNow()))?'Tap a growing crop to water it.':WATER_FIRST_MINUTE):firstBasket?(touch?'Hold one ripe corn for a moment, then sweep across the others to harvest them, or tap one.':'Sweep across your ripe corn to harvest it, or tap one.'):touch?'Tap a ready crop, or hold one for a moment and sweep across the others.':'Click a ready crop, or sweep across your ready crops to harvest them all.');if(firstBasket&&!villageWorld)firstBasketGhost();}
 // Step 9, A helping hand (11 Oct 2026): the view moves to the Greenhouse first, so Show me points at its pin in the open farm (at
 // 918x516 it stood under the top bar, beside the guide card), on a phone too; the stops' window only when there is no farm to show,
 // and never by itself (auto).
 else if(target==='hand'){const v=farmLife?.views.get('greenhouse');if(v&&!villageWorld){lookAt(v.x,v.z);positionBuildingLabels();}const steps=guideSteps('hand',{state,now:farmNow()});if(steps)coach.start(steps,{auto});else if(!auto)activities.openHub();}
 // Show me points at the way in and lets the farmer tap it (1 Oct 2026: it used to open the window for them, so they never
 // learnt where Market was). Only where nothing can be pointed at does it still open the window itself.
 else if(guideSteps(target,{state,now:farmNow()}))coach.start(guideSteps(target,{state,now:farmNow()}),{auto,stay});
 // By itself the guide only points; it never opens a window (no extra pop-ups).
 else if(auto)return;
 else if(target==='eggs')economy.openMarket('goods');
 else if(target==='market')openDialog('market-dialog');
 else if(target==='produce')economy.openBuilding('coop');
 else if(target==='collect'){const key=Object.keys(state.buildings).find(k=>productionJobs(state.buildings[k]).some(j=>j.readyAt<=farmNow()))??Object.keys(state.buildings).find(k=>state.buildings[k].job)??'coop';economy.openBuilding(key);}
 else if(target==='today')retention.openToday();
 else if(target==='chores')growth.open('chores');
}
// The guide-complete card's green button (A8): the quest that waits (Quests at that quest, claimed there one by one: one quest, so the
// label never reads like a Claim all), build what opened, or plant.
function goalAction(goal){
 if(goal.kind==='quest')return {label:'Claim your next quest',run:()=>quests.openAt(goal.id)};
 if(goal.kind==='daily')return {label:'Open Today',run:()=>retention.openToday('challenges',{at:goal.id})};   // Plan F (13 Oct 2026)
 if(goal.kind==='build')return {label:`Build the ${goal.name}`,run:()=>showWay(`build:${goal.key}`)};
 if(goal.kind==='field')return {label:`Buy field ${goal.field}`,run:()=>showWay('field')};   // Plan F, proposal 3 (13 Oct 2026)
 return {label:'Plant your fields',run:()=>{setCrop('wheat');focusFields();}};
}
// A lost 3D view comes back by itself (11 Oct 2026, Part A A4; before, "The 3D view was interrupted. Reload..." was a dead end): a phone
// that switched apps or a graphics reset takes the view away. The farm pauses under a small cream card, "Getting your farm back…", and the
// bars stay. When the browser gives the view back (webglcontextrestored), three.js builds its own state again, the pictures drawn on a
// canvas (the family flag, the field rows) are sent again with the shadows, the farm is drawn and goes on, and the map is shot again.
// Only when nothing comes back within 5 seconds: the card with Try again, as before (it reloads the farm, or on a portal asks its page for
// it: public/loading-screen.js). A loss during a new farm's first visit counts in its load chain (A1, chain.lost).
const CONTEXT_RESTORE_MS=5000;
let restoreTimer=0;
function bindContextRestore(canvas){
 let wasReady=false,losses=0,before=null,lostAt=0;
 // Simple graphics after a lost view (21 Oct 2026, public/graphics-mode.js; review the same day): a phone that switched apps loses the view
 // and gets it back at once, so a loss counts only when the farm was in sight (not hidden, nor just shown again). It switches simple on
 // at once, in case the app closes right after it, and back to what it was when the view returns within the 5 seconds, unless it was the
 // second loss on this page; a view that does not come back while in sight switches it on too. Every loss is noted for farm-api, with
 // whether it happened out of sight.
 canvas.addEventListener('webglcontextlost',event=>{
  const playing=ready,away=document.hidden||Date.now()-lastShown<CONTEXT_RESTORE_MS;event.preventDefault();clearTimeout(restoreTimer);if(ready)wasReady=true;ready=false;$('restoring').hidden=false;
  losses++;lostAt=Date.now();if(losses===1)before=gfxStore?.getItem?.(GRAPHICS_KEY)??null;if(!away||losses>1)graphicsTrouble(gfxStore);
  noteOnDevice({kind:'lost',step:villageWorld?'village':'scene',percent:playing?100:Number($('load-progress')?.value)||0,hidden:away,error:`[lost] The 3D view was lost ${playing?'during play':'while loading'}${away?' out of sight':''}.`});
  if(firstVisit){client.look({chain:{lost:1}});client.sendLook();}
  restoreTimer=setTimeout(()=>{if(!document.hidden)graphicsTrouble(gfxStore);$('restoring').hidden=true;$('error-message').textContent='The 3D view was interrupted. Reload to return to your saved farm.';$('error').hidden=false;},CONTEXT_RESTORE_MS);
 });
 canvas.addEventListener('webglcontextrestored',()=>{
  clearTimeout(restoreTimer);$('restoring').hidden=true;$('error').hidden=true;
  if(losses===1&&Date.now()-lostAt<=CONTEXT_RESTORE_MS){if(before==='simple'||before==='full')chooseGraphics(gfxStore,before==='simple');else try{gfxStore?.removeItem(GRAPHICS_KEY);}catch{}}
  scene?.traverse(o=>{for(const m of [o.material].flat())if(m)for(const v of Object.values(m))if(v?.isCanvasTexture)v.needsUpdate=true;});
  // Lost while the farm was still loading: init goes on and starts the farm itself.
  if(!wasReady)return;
  wasReady=false;ready=true;resize();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);if(!villageWorld)shootMinimap();
 });
}
async function init(){
 const loadingUI=createLoadingScreen(document,villageWorld?100:modelNames.length,villageWorld?{loading:'Travelling to the village',village:true}:undefined),stopTips=startLoadingTips(document,{tips:villageWorld?[...(LAKE_OPEN?[LAKE_LOADING_TIP]:[]),...VILLAGE_LOADING_TIPS]:[...(POND_OPEN?[POND_LOADING_TIP]:[]),...(passPhase(Date.now())==='open'?[PASS_LOADING_TIP,...LOADING_TIPS]:LOADING_TIPS)],level:()=>levelProgress(state).level});   // the Fishing pond's tip once it is open   // the Halloween Pass's tip only while it is open   // the tips about later features from level 10 (13 Oct 2026)
 try{
  // Graphics (21 Oct 2026, public/graphics-mode.js): the last start that ended under the player (the app or the browser closed before a
  // minute of play) is a note for farm-api, and the second one in a row makes this start simple; then this start's own mark, which a
  // minute of play or the page going takes away again, with the count so far.
  try{gfxStore?.removeItem(OLD_GRAPHICS_KEY);}catch{}
  const crashed=lastRunCrashed(gfxStore),crashes=crashed?(Number(crashed.crashes)||0)+1:0;
  if(crashed){if(crashes>=CRASHES_FOR_SIMPLE)graphicsTrouble(gfxStore);noteOnDevice({kind:'crash',step:crashed.step??'code',percent:crashed.percent??0,stage:crashed.stage==='ready'?'ready':'farm',gpu:crashed.gpu??null,gfx:crashed.gfx??null,error:`[crash] The last start ended at ${crashed.percent??0}% without a minute of play.`});}
  endRun(gfxStore);graphicsSimple=graphicsChoice({storage:gfxStore,search:location.search}).simple;
  markRun(gfxStore,{stage:'farm',step:'code',percent:Number($('load-progress')?.value)||0,gfx:graphicsSimple?'simple':'full',crashes,away:document.hidden});
  // Until the renderer names the chip, notes about this start carry the last start's chip and this start's planned mode.
  try{if(window.harvestStartup){window.harvestStartup.gpu=crashed?.gpu??null;window.harvestStartup.gfx=graphicsSimple?'simple':'full';}}catch{}
  bindUI();updateUI();
  // The 3D view on its own (21 Oct 2026, public/farm-start.js): a second try with the safest options, and "needs WebGL 2" only when even
  // a plain WebGL 2 context cannot be made. A fault in bindUI or updateUI above is the farm that could not load, never WebGL. A start that
  // needed the second try is trouble too: simple graphics from the next start on.
  const made=createFarmRenderer(options=>new THREE.WebGLRenderer(options),rendererOptions({handheld:gpuHandheld,simple:graphicsSimple}));
  renderer=made.renderer;if(made.retried)graphicsTrouble(gfxStore);
  renderer.setClearColor(0xdeede6);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.32;
  // The graphics chip and the mode: no shadows in simple graphics or on a PowerVR or Imagination GPU (set before anything is drawn, so no
  // shader ever reads a shadow map there). Both go with every note about this start (src/game-cloud.js harvestStartup, loading-screen.js).
  const gpu=gpuName(renderer.getContext());gfxMode=graphicsMode({simple:graphicsSimple,gpu});
  try{if(window.harvestStartup){window.harvestStartup.gpu=gpu;window.harvestStartup.gfx=gfxMode;}}catch{}
  markRun(gfxStore,{gpu,gfx:gfxMode,step:'models'});
  renderer.shadowMap.enabled=gfxMode==='full';renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  world.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive farm. Use Tab to move between fields, and Enter to work a field.');
  bindContextRestore(renderer.domElement);
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-25,25,17,-17,.1,300);   // far enough for the mountains at the edge when zoomed out
  // Sunny, cheerful daylight (7 Oct 2026: the farm should look fun and cheerful; halfway between the fresh light of before and the
  // painted valley of the loading screen): a bright sky, a slightly warmer sun a little lower than before for longer, soft shadows
  // (the old warm-yellow sky, sun and haze made the whole valley beige, so the haze stays a light green-white). daylight.js moves it
  // through the day.
  const hemi=new THREE.HemisphereLight(0xdcebff,0x778b40,1.95);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffe3b7,3.45);sun.position.set(-26,20,14);sun.castShadow=gfxMode==='full';{const size=shadowSize({handheld:gpuHandheld,simple:graphicsSimple});sun.shadow.mapSize.set(size,size);}sun.shadow.camera.left=-52;sun.shadow.camera.right=52;sun.shadow.camera.top=52;sun.shadow.camera.bottom=-52;sun.shadow.camera.near=1;sun.shadow.camera.far=125;sun.shadow.normalBias=.035;sun.shadow.bias=-.00012;sun.shadow.radius=3;scene.add(sun);scene.add(sun.target);
  cropMotion=createCropMotion({scene,reducedMotion});
  scene.fog=new THREE.Fog(0xdeede6,60,150);
  let loaded=0;
  if(villageWorld){
   // The village is three times as wide as the farm: fog further out, and the sun's shadows over all of it.
   scene.fog=new THREE.Fog(0xdeede6,105,180);sun.position.multiplyScalar(3);sun.shadow.camera.left=sun.shadow.camera.bottom=-95;sun.shadow.camera.right=sun.shadow.camera.top=95;sun.shadow.camera.far=320;sun.shadow.camera.updateProjectionMatrix();
   // The same shadow map over almost twice the width makes each shadow texel twice as big (0.09 units, 0.19 on phones): the farm's
   // normal bias (.035) left stripes over the rocks, walls and roofs (shadow acne). 1.3 texels of it (Oct 2026): .12, .24 on phones.
   sun.shadow.normalBias=1.3*190/sun.shadow.mapSize.x;
   // The camera stands 65 units from the spot it looks at, and the mountains at the front of the ring rise past it: it draws from
   // 200 behind itself (7 Oct 2026), or a view further back cut them open (a hole in the rock at the bottom of a phone's view).
   camera.near=-200;
   // Only a farmer in the village loads its scene code (and its mesh decoder): the farm never downloads it.
   const {loadVillage,VILLAGE_PLACES,VILLAGE_UTILITIES,VILLAGE_FAR_SIDE,VILLAGE_FRAME,VILLAGE_LANDMARK_SPOTS,VILLAGE_CLOUD_HEIGHT,VILLAGE_VIEW}=await import('./village-scene.js');
   const [village]=await Promise.all([loadVillage({onProgress:share=>{loadingUI.modelsReady(Math.round(share*99));if(Math.round(share*99)%10===0)markRun(gfxStore,{percent:Number($('load-progress')?.value)||0});}}),client.load().then(()=>loadingUI.accountReady())]);
   loadingUI.modelsReady(100);scene.add(village);villageGroup=village;markRun(gfxStore,{step:'village',percent:Number($('load-progress')?.value)||0});
   // The whole village (measured round the places the owner approved on 30 Sep, VILLAGE_FRAME), the middle of the places on its side of
   // the lake (an upright phone's view: the far side is a swipe away) and how far the camera may look. Landmarks never move the frames.
   const spots={...VILLAGE_PLACES,...VILLAGE_UTILITIES},framed=VILLAGE_FRAME.map(k=>spots[k]);villageFrame={...measureVillage(framed),phone:measureVillage(Object.entries(spots).filter(([k])=>!VILLAGE_FAR_SIDE.includes(k)).map(([,spot])=>spot),0).focus,view:VILLAGE_VIEW};
   for(const [key,spot] of Object.entries(VILLAGE_PLACES))addVillagePlace(key,spot);
   for(const [key,spot] of Object.entries(VILLAGE_UTILITIES))addVillageUtility(key,spot);
   for(const [key,spot] of Object.entries(VILLAGE_LANDMARK_SPOTS))addVillageLandmark(key,spot);
   atmosphere=createAtmosphere({scene,renderer,sun,hemi,reducedMotion,mobile:mobileLayout.matches,cloudHeight:VILLAGE_CLOUD_HEIGHT});measureFarm();resize();icons();
  }else{
  await Promise.all([client.load().then(()=>loadingUI.accountReady()),loadInBatches(modelNames,async name=>{await loadModel(name);loaded++;loadingUI.modelsReady(loaded);if(loaded%8===0)markRun(gfxStore,{percent:Number($('load-progress')?.value)||0});},8).then(()=>markChain('models'))]);
  // A farm without its models (11 Oct 2026): a palette that was refused, or a moment offline just as they started, made every model an
  // invisible stand-in and the farm opened as an empty valley that nothing opened again (harness, 11 Oct). More than half of them missing
  // now fails the start (src/game-cloud.js): the page opens once more by itself, a second time it shows Try again.
  if(missingModels*2>modelNames.length)throw Object.assign(new Error('missing-models'),{reopen:true});
  markRun(gfxStore,{step:'scene',percent:Number($('load-progress')?.value)||0});
  decorate();createPlots();plots.forEach((v,i)=>v.cropGroup.userData.plot=i);plots.forEach((_,i)=>drawCrop(i));scenePolish=createScenePolish({scene,cloneModel,getPlots:()=>plots,reducedMotion,mobile:mobileLayout.matches,anisotropy:renderer.capabilities.getMaxAnisotropy(),asBefore:place=>asBefore(place,{dairy:false})});clipNow();applyLayout();layoutKey=JSON.stringify(state.layout??{});atmosphere=createAtmosphere({scene,renderer,sun,hemi,reducedMotion,mobile:mobileLayout.matches});clearPropsFromMountains();measureFarm();resize();icons();
  }
  // Every press starts its own way (Oct 2026): a finger that holds a field after the mouse was used gets no sickle at the old mouse
  // spot, and a held first field is not tipped over by an earlier drag.
  renderer.domElement.addEventListener('pointerdown',e=>{lastPointer={x:e.clientX,y:e.clientY,type:e.pointerType};pointerDx=0;});
  renderer.domElement.addEventListener('pointermove',e=>{
   // During a sweep (Oct 2026) the plants tip over the way the pointer goes, and with a mouse the tool in the hand follows it.
   const dx=lastPointer?e.clientX-lastPointer.x:0;lastPointer={x:e.clientX,y:e.clientY,type:e.pointerType};pointerDx=dx;
   if(sweepRun){if(Math.abs(dx)>1.5)sweepRun.tilt=dx<0?.55:-.55;if(e.pointerType==='mouse'&&sweepTool.move(e.clientX,e.clientY,dx))world.style.cursor='none';$('tooltip').hidden=true;return;}
   if(e.pointerType!=='mouse'||e.buttons){highlight(-1);$('tooltip').hidden=true;return;}
   const target=pointerTarget(e);highlight(target?.id??-1);const tooltip=$('tooltip');
   // Over a field the cursor is the tool its sweep would use: a sickle over a ripe crop, a watering can, a seed bag, gloves for care
   // (sweep-tools.js).
   if(target?.type==='plot')world.style.cursor=toolCursor(sweepAction(target))||'pointer';
   // A farmer: their name, nothing more (players' own words); a pet: nothing.
   const named=target?.type==='farmer'?farmerTooltip(ownName()):target?.type==='familyFarmer'?farmerTooltip(familyWalkers.find(w=>w.playerId===target.id)?.username):'';
   if(!target||e.pointerType==='touch'||target.type==='pet'||(target.type==='farmer'||target.type==='familyFarmer')&&!named){tooltip.hidden=true;return;}
   tooltip.hidden=false;
   if(named)tooltip.innerHTML=named;
   else if(target.type==='activity'){const a=ACTIVE_STATIONS[target.id];tooltip.innerHTML=`<strong>${a.name}</strong><span>Hands-on job · coins & XP</span>`;}
   else if(target.type==='utility'){const u=utilityInfo[target.id];tooltip.innerHTML=`<strong>${u.name}</strong><span>${u.hint} · click to open</span>`;}
   else if(target.type==='building'){const b=BUILDINGS[target.id];tooltip.innerHTML=`<strong>${b.name}</strong><span>${economy.status(target.id).text} · ${target.label&&economy.status(target.id).kind==='ready'&&b.type!=='pier'?'click to collect':'click to open'}</span>`;}
   else if(target.type==='landmark'){const l=VILLAGE_LANDMARKS[target.id];tooltip.innerHTML=`<strong>${l.name}</strong><span>${landmarkNote(target.id,landmarkDone(state,target.id))}</span>`;}
   else{const p=state.plots[target.id];tooltip.innerHTML=`<strong>${p.crop?CROPS[p.crop].name:'Empty field'}</strong><span>${!p.crop?`Plant ${CROPS[selectedCrop].name.toLowerCase()} · ${seedCost(state,selectedCrop)} coins`:farmNow()>=p.readyAt?'Ready to harvest!':`${formatDuration(p.readyAt-farmNow())} · ${harvestQuantity(state,p,farmNow())} crop${harvestQuantity(state,p,farmNow())>1?'s':''}${canWater(p,farmNow())?` · water now · ${formatDuration(waterUntil(p)-farmNow())} left`:p.tended?' · fully cared for':farmNow()>=p.careAt?' · extra care ready':` · extra care in ${formatDuration(p.careAt-farmNow())}`}`}</span>`;}
   const r=world.getBoundingClientRect();tooltip.style.left=`${Math.min(r.width-130,Math.max(130,e.clientX-r.left))}px`;tooltip.style.top=`${e.clientY-r.top-16}px`;
  });
  renderer.domElement.addEventListener('pointerleave',()=>{highlight(-1);$('tooltip').hidden=true;});
  const canvas=renderer.domElement;
  // Moving things is for your own farm (layout-edit.js), not the village or a farm an admin looks at.
  if(!villageWorld&&!adminView)createLayoutTools();else for(const id of ['layout-button','layout-menu-entry'])$(id).hidden=true;
  bindFarmInput({canvas,surface:$('game'),isReady:()=>ready&&!visitView,busy:()=>document.body.classList.contains('farm-waiting'),edit:{active:()=>Boolean(layoutEditor?.active()),grab:e=>layoutEditor.grab(e),drag:e=>layoutEditor.drag(e),drop:e=>layoutEditor.drop(e)},pick:pointerTarget,
   open:target=>{if(target.type==='plot')interact(target.id);else if(target.type==='building'){if(target.label)tapBuilding(target.id);else economy.openBuilding(target.id);}else if(target.type==='utility')openUtility(target.id);else if(target.type==='landmark')openLandmark(target.id);else if(target.type==='activity')activities.open(target.id);else if(target.type==='pet')patPet(target.id);else if(target.type==='farmer')tapOwnFarmer();else if(target.type==='familyFarmer')tapFamilyFarmer(target.id);},
   pan:(dx,dy)=>{
    const shift=cameraDragDelta(dx,dy,camera.right-camera.left,camera.top-camera.bottom,world.clientWidth,world.clientHeight);
    panFarm(shift.side,shift.depth);
   },
   // A swipe from a field with work to do (plant, water, care, harvest): each field is worked the moment it is passed, and all of
   // them are saved in one request on release (sweepField, endSweep).
   // early (11 Oct 2026, Part A A15): before the first harvest a mouse drag from the grass sweeps too; settle brings the fields back.
   sweep:{action:sweepAction,add:(target,action)=>sweepField(target.id,action??sweepAction(target)),end:()=>endSweep(),early:firstBasketWaits},
   settle:()=>{if(firstBasketWaits()&&viewMode==='fields')easeToFields();},
   zoom:(ratio,x,y)=>{
    // The farm (18 Oct 2026, the one zoom axis): the wheel and a trackpad towards the pointer (wheelFarm), a pinch round the middle.
    if(!villageWorld){if(x==null)zoomFarm(ratio);else wheelFarm(ratio,x,y);return;}
    // Scrolling zooms towards the pointer: the spot under the mouse stays under the mouse.
    const r=zoomFarm(ratio);if(x==null||r===1)return;
    const rect=world.getBoundingClientRect(),dx=x-(rect.left+rect.width/2),dy=y-(rect.top+rect.height/2);
    const shift=cameraDragDelta(dx*(1-r),dy*(1-r),camera.right-camera.left,camera.top-camera.bottom,world.clientWidth,world.clientHeight);
    panFarm(shift.side,shift.depth);
   }
  });
  markRun(gfxStore,{step:'frame',percent:99});
  showVisitBar();
  ready=true;if(!villageWorld)setupMinimap();positionBuildingLabels();updateUI();if(!villageWorld)sceneryDone=addScenery();if(villageWorld)void addVillageExtras();void addPets();void addFarmer();const ripe=state.plots.filter(p=>p.crop&&p.readyAt<=farmNow()).length;if(!adminView){if(villageWorld)toast('Welcome to the village! '+(briefWaits()?'A golden brief waits at the market square.':'Your farm keeps growing while you are here.'));else if(state.stats.harvested>0&&calmStep(state)===null&&(!initialWelcome||initialChapterReward?.diamonds))toast(`Welcome back! ${ripe?`${ripe} crops are ready to harvest.`:'Your farm is right where you left it.'}${initialChapterReward?.diamonds?` Completed chapters: +${initialChapterReward.diamonds} diamonds!`:''}`);}renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);markChain('render');loadingUI.complete();
  // The farm is on screen; a minute of play from here and this start was a good one (graphics-mode.js): its mark goes.
  markRun(gfxStore,{stage:'ready',step:villageWorld?'village':'scene',percent:100});setTimeout(()=>{runHealthy=true;endRun(gfxStore);},HEALTHY_MS);$('loading').classList.add('fade');registerAgentTools();requestAnimationFrame(frame);
  // Kongregate in a small window (16 Oct 2026, the owner): a Full screen button by the camera buttons where Kongregate's frame allows full
  // screen, else one tip on this device (public/small-window.js). Nothing of it on the website, in the apps or on another portal.
  createFullScreenOffer({button:$('fullscreen-button'),show:text=>toast(text),storage:(()=>{try{return localStorage;}catch{return null;}})(),quiet:()=>modalOpen()||calmStep(state)!==null});
  // The Fishing pond (11 Oct 2026): farm only (never in the village), never on the admin's showcase farm.
  if(POND_OPEN&&!villageWorld&&!adminView)void import('./pond-ui.js').then(({createPond})=>{pond=createPond({state,scene,game:$('game'),labels:$('building-labels'),runAction,now:farmNow,play:kind=>farmAudio.play(kind),haptic,toast,resize,reducedMotion,focusFarm:focusFields});positionBuildingLabels();}).catch(error=>console.error('Fishing pond failed',error?.message));
  // The village lake (12 Oct 2026, plan D): the pond's screen for the lake, at the rowboat (village-scene.js VILLAGE_FISHING_SPOT; that
  // module is already here), in the village only, never on the admin's showcase farm. Its chip turns the camera to a ready place.
  if(LAKE_OPEN&&villageWorld&&!adminView)void Promise.all([import('./pond-ui.js'),import('./village-scene.js')]).then(([{createPond},{VILLAGE_FISHING_SPOT}])=>{pond=createPond({water:'lake',place:VILLAGE_FISHING_SPOT,state,scene,game:$('game'),labels:$('building-labels'),runAction,now:farmNow,play:kind=>farmAudio.play(kind),haptic,toast,resize,reducedMotion,focusFarm:key=>key?showVillagePlace(key):resetView()});positionBuildingLabels();}).catch(error=>console.error('Village lake failed',error?.message));
  // The loading screen fades into the farm instead of disappearing at once.
  $('loading').classList.add('fade');
  if(!villageWorld&&!adminView&&!(state.stats.harvested>0))noteFirstLook();
  // The farm is on screen whatever the refresh does (11 Oct 2026): one that threw left farmReady waiting for good, and the page was opened
  // again 30 seconds later over a farm that could be played.
  await new Promise(resolve=>setTimeout(()=>{try{$('loading').hidden=true;stopTips();progression.refresh();}finally{resolve();}},450));
  farmInView?.();
  // A brand-new farm (6 Oct 2026): the sickle shows by itself where to sweep, as Show me does, until the first harvest. 11% of new farmers
  // tapped growing wheat or an empty field instead, got no harvest and left.
  if(!villageWorld&&!adminView&&!(state.stats.harvested>0)&&beginnerProgress(state).find(q=>q.current)?.id==='harvest')firstBasketGhost();
 // Oct 2026: the comeback chest is a row of its own above the gift; `current` is both as they are when the card really opens (it waits
 // for other dialogs), so one collected in Today meanwhile is not offered twice.
 // 17 Oct 2026: Join again, for a farmer who left their family for being away too long (the family action, as in the Family window).
 if(!villageWorld)showWelcomeBack(initialWelcome,{gift:{offer:retention.giftOffer(),chips:retention.giftChips,collect:retention.collectGift},chest:{offer:retention.chestOffer(),chips:retention.chestChips,collect:retention.collectChest},current:()=>({gift:retention.giftOffer(),chest:retention.chestOffer()}),fields:focusFields,production:()=>economy.openBuilding(Object.keys(state.buildings).find(k=>productionJobs(state.buildings[k]).some(j=>j.readyAt<=farmNow()))??'coop'),stall:()=>growth.open('stall'),today:()=>retention.openToday(),family:{rejoin:familyId=>runAction({type:'family_rejoin',familyId})}});
  return ready;
 }catch(error){
  if(error?.reopen)throw error;console.error('Farm initialization failed',error);
  // The card says what it was (public/farm-start.js startErrorText) and the failure is noted for the next farm load (farmFailure,
  // src/game-cloud.js hands it to the loading watch): '[webgl]' or '[init]' with the error's first line.
  farmFailure=startFailure(error);
  try{$('error-message').textContent=startErrorText(error,{androidApp:androidPhoneApp(window)});}catch{}
  $('loading').hidden=true;$('error').hidden=false;return false;
 }
}
// Why the farm did not open, when init showed its error card (21 Oct 2026): one line for the load-stall note (public/loading-screen.js
// startFailure). Read by src/game-cloud.js once farmReady is false.
export let farmFailure=null;
// A new farm's first look (7 Oct 2026, farm-state.js recordFirstLook): when it could be played and how long that took from the start of
// the page around it, with what src/game-cloud.js noted: that start, the frame's size and, once the page was drawn, shownAt and loadMs
// (a tab in the background has drawn nothing yet). Without its note the start and the frame's size come from here. Sent at once, so a
// farmer who leaves without a tap still counts as one who saw the farm. The first touch on the farm or its buttons goes along with the
// next request, or by itself 15 seconds later, with how long after readyAt it came when this visit sent readyAt. Times are this device's
// clock: farm-client.js stamps when the request leaves and the server moves them onto its own clock.
// 11 Oct 2026 (Part A, A1): with the load chain (chain), the steps the pages noted on the way (markChain); firstVisit tells the lost 3D
// view (A4) to count itself too.
// 13 Oct 2026 (the measurement package): and when the farm was first in view, touched or not (farmInView, viewAt and viewMs): the loading
// screen gone (450 ms after readyAt) and the page in view. A page in view at readyAt holds readyAt back for those 450 ms and sends both
// in one request; a tab in the background sends readyAt at once, as before, and viewAt by itself when it comes into view.
let firstVisit=false,farmInView=null;
const pageInView=()=>document.visibilityState==='visible';
function noteFirstLook(){
 const look=window.harvestFirstLook??{},at=Date.now(),step=n=>Math.round((n||0)/10)*10,fresh=!state.onboarding?.firstLook;
 let started=look.started;if(!started)try{started=window.parent.performance.timeOrigin;}catch{started=performance.timeOrigin;}
 let chain=null;try{chain=window.parent.harvestChain?{...window.parent.harvestChain}:null;}catch{}
 if(fresh){firstVisit=true;client.look({...(look.shownAt?{shownAt:look.shownAt,loadMs:look.loadMs}:{}),readyAt:at,...(started?{readyMs:Math.round(at-started)}:{}),frame:look.frame??`${step(innerWidth)}x${step(innerHeight)}`,...(chain?{chain}:{})});if(!pageInView())client.sendLook();
  farmInView=()=>{farmInView=null;const seen=()=>{if(!pageInView())return false;const t=Date.now();client.look({viewAt:t,viewMs:t-at});client.sendLook();return true;};
   if(!seen()){client.sendLook();const later=()=>{if(seen())document.removeEventListener('visibilitychange',later);};document.addEventListener('visibilitychange',later);}};}
 if(state.onboarding?.firstLook?.firstInputAt)return;
 const game=$('game'),touched=()=>{game.removeEventListener('pointerdown',touched,true);const t=Date.now();client.look({firstInputAt:t,...(fresh?{firstInputMs:t-at}:{})});setTimeout(()=>client.sendLook(),15000);};
 game.addEventListener('pointerdown',touched,true);
}
export const farmReady=init();
