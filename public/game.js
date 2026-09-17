import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CROPS, ITEMS, BUILDINGS, RECIPES, QUESTS, MAX_PLOTS, createFarm, progress, farmSummary, seedCost, levelProgress, formatDuration, harvestYield } from './farm-state.js';
import { createEconomyUI } from './economy-ui.js';
import { createFarmClient, farmNow } from './farm-client.js';
import { createRetentionUI } from './retention-ui.js';
import { createGrowthUI } from './growth-ui.js';

const $ = id => document.getElementById(id);
const state = createFarm();
let selectedTool='plant', selectedCrop='wheat', ready=false, sound=false, audioContext;
let renderer,scene,camera,zoom=1,pan=0,hovered=-1,lastTick=0,lastFrame=0;
const models=new Map(), plots=[], animals=[], particles=[], buildingViews=new Map();
let economy,retention,growth;
const utilityViews=new Map();
const utilityInfo={stall:{name:'Farm stall',icon:'store',hint:'Collect your passive income'},chores:{name:'Farm chores',icon:'shovel',hint:'Little jobs, extra coins'},tractor:{name:'Tractor',icon:'tractor',hint:'Work all your fields'},silo:{name:'Silo research',icon:'warehouse',hint:'Better seeds & faster growth'},cart:{name:'Delivery cart',icon:'truck',hint:'Fresh orders every day'}};
const client=createFarmClient(state,{onChange:()=>{if(ready)expandVisuals();updateUI();},onError:toast,onStatus:status=>{const el=$('save-status');el.textContent=status==='saved'?'Saved on this device':status==='saving'?'Saving your farm…':'Retry save';el.disabled=status!=='error';el.classList.toggle('save-error',status==='error');}});
const runAction=action=>client.runAction(action);
function openUtility(key){if(key==='stall'||key==='chores')growth.open(key);else retention.openUtility(key);}
const clock=new THREE.Clock(), raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
const world=$('world'),labels=$('plot-labels');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const modelNames=['plant_001','plant_002','plant_003','plant_004','plant_005','plant_006','plant_007','plant_010','plant_011','garden_bed_001','bag_001','bag_002','bucket_001','apiary_001','cart_004','chair_001','firewood_003','hay_002','table_001','grass_004','bush_003','hangar_003','house_027','house_030','tower_005','house_010','hangar_004','tower_002','tractor_001','tree_001','tree_004','tree_006','fence_001','cow_001','chicken_001','sheep_001','hay_001','bush_001','grass_001','barrel_001','cart_001','box_004','coop_001','water_001','landscape_001','ground_004','road_001'];
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200);}
function icons(){window.lucide?.createIcons();}
function playTone(kind){
 if(!sound)return;
 try{
  audioContext??=new(window.AudioContext||window.webkitAudioContext)();audioContext.resume();
  const notes=kind==='harvest'?[523,659,784]:kind==='sell'?[659,784,1047]:kind==='water'?[440,660]:[392,523];
  notes.forEach((f,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type='sine';o.frequency.value=f;const t=audioContext.currentTime+i*.065;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.07,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.connect(g);g.connect(audioContext.destination);o.start(t);o.stop(t+.22);});
 }catch{sound=false;}
}

function cloneModel(name,x,z,{width,height,depth,scale=1,rotation=0,y=0}={}){
 const entry=models.get(name);if(!entry)throw new Error(`Missing model: ${name}`);
 const obj=entry.object.clone(true),d=entry.size;
 if(width!=null&&depth!=null)obj.scale.set(width/d.x,(height??d.y)/d.y,depth/d.z);
 else {const s=height!=null?height/d.y:width!=null?width/Math.max(d.x,d.z):scale;obj.scale.setScalar(s);}
 obj.position.set(x,y,z);obj.rotation.y=rotation;scene.add(obj);return obj;
}
function patch(x,z,width,depth,color,y=.005){
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshStandardMaterial({color,roughness:1}));
 mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
function fenceLine(x,z,n,axis='x',size=2.2){
 for(let i=0;i<n;i++)cloneModel('fence_001',x+(axis==='x'?i*size:0),z+(axis==='z'?i*size:0),{width:size,rotation:axis==='z'?Math.PI/2:0});
}
function decorate(){
 const ground=patch(0,0,200,200,0xa8c777,0);ground.name='Farm ground';
 // The crossing paths keep the four parts of the farm easy to read from the fixed camera.
 cloneModel('road_001',-1,-4,{width:48,depth:2.9,height:.13,y:-.045});
 cloneModel('road_001',-6,3,{width:2.9,depth:40,height:.13,y:-.035});
 cloneModel('road_001',6.2,14.3,{width:27,depth:2.4,height:.12,y:-.035});
 patch(2.1,5.6,12,14.4,0x91b768,.004);
 patch(11,-7.7,10,8.4,0x95b86b,.007);
 patch(-12.5,5.3,8.7,13,0x9bbc70,.004);
 // Buildings, vehicles and all plants below come from the supplied GLB pack.
 addBuilding('dairy',-1,-12,{width:8.2,rotation:Math.PI/2});
 addUtility('silo','tower_002',5.1,-12.7,{height:8});
 addBuilding('farmhouse',-13.3,-8.4,{width:7.4,rotation:Math.PI/2});
 addBuilding('mill',-13,2.9,{width:5.4,rotation:Math.PI/2});
 cloneModel('tower_005',-17,1.2,{height:5.4});
 addBuilding('bakery',-10.3,10.3,{width:6.0,rotation:Math.PI/2});
 addBuilding('packing',12,-17,{width:4.9,rotation:-Math.PI/2});
 addUtility('tractor','tractor_001',-5.2,-.2,{width:3.1,rotation:-Math.PI/2});
 addUtility('cart','cart_001',-5.5,3.3,{width:2.2,rotation:Math.PI/2});
 cloneModel('bag_001',-4.6,5.2,{height:.75,rotation:-.25});
 cloneModel('bag_002',-5.3,5.05,{height:.72,rotation:.35});
 cloneModel('bucket_001',-4.8,4.45,{height:.62,rotation:.2});
 cloneModel('cart_004',-14.8,12.4,{width:2.2,rotation:.35});
 cloneModel('table_001',-12.7,13.4,{width:1.8,rotation:-.2});
 cloneModel('chair_001',-11.4,13.7,{height:1.05,rotation:-2.4});
 cloneModel('apiary_001',6.8,9.8,{height:1.35,rotation:.15});
 cloneModel('apiary_001',7.9,10.2,{height:1.25,rotation:-.2});
 cloneModel('firewood_003',-15.4,-5.8,{width:1.7,rotation:Math.PI/2});
 cloneModel('hay_001',4.6,-7.8,{width:1.9});
 cloneModel('hay_001',6.2,-8.1,{width:1.7,rotation:.4});
 cloneModel('hay_001',5.35,-7.9,{width:1.5,y:1.2});
 cloneModel('hay_002',3.7,-8.4,{width:1.45,rotation:.2});
 addUtility('chores','barrel_001',-5.8,-10.7,{height:1.1});
 cloneModel('barrel_001',-6.7,-10.3,{height:1.05});
 addUtility('stall','box_004',-9.2,-5.5,{width:1.05});
 addBuilding('coop',13,-9.5,{width:3.4,rotation:-Math.PI/2});
 fenceLine(8,-12.5,5);fenceLine(7,-11.4,4,'z');fenceLine(16.6,-11.4,4,'z');fenceLine(9.2,-3.6,4);
 fenceLine(-16.6,-13.2,4);fenceLine(-20,-9,8,'z');fenceLine(-18.8,10.8,5);
 fenceLine(-3,12.7,5);fenceLine(8.6,2.4,5,'z');
 const cow=cloneModel('cow_001',11,-6.6,{width:2.4,rotation:-.6});cow.userData.building='dairy';animals.push({obj:cow,x:11,z:-6.6,seed:.5});
 const cow2=cloneModel('cow_001',14.5,-5.5,{width:1.85,rotation:2});cow2.userData.building='dairy';animals.push({obj:cow2,x:14.5,z:-5.5,seed:3});
 const sheep=cloneModel('sheep_001',9.1,-9.5,{width:1.6,rotation:.6});sheep.userData.building='dairy';animals.push({obj:sheep,x:9.1,z:-9.5,seed:1.5});
 for(const [x,z,r] of [[-9.1,-1.2,.2],[-11.3,-.9,2.1],[-10.2,1.2,3.1]]){const o=cloneModel('chicken_001',x,z,{height:.72,rotation:r});o.userData.building='coop';animals.push({obj:o,x,z,seed:r});}
 const trees=[[-17,-14,6],[-20,-10,5],[-19,1,4.5],[-18.8,6,4.7],[-17.4,8.5,4],[-18,12,6.2],[-17,17,5.5],[-5,19,5.8],[7,17,6],[14,15,5.4],[19,8,6],[21,1,5.7],[20,-10,6],[19,-19,6.1],[8,-18,5.4],[-10,-19,6.5],[-2,-22,7],[-23,7,6.5],[24,15,6.4],[-25,-1,6.4],[25,-17,7]];
 trees.forEach(([x,z,height],i)=>cloneModel(['tree_001','tree_004','tree_006'][i%3],x,z,{height,rotation:i*1.8}));
 for(const [x,z] of [[-17,-6],[-16.5,-4],[-18.5,9],[-15,12],[19,-5],[18,2],[21,9],[10,15],[2,16],[-21,-15],[-9,-17],[11,-16]])cloneModel('bush_001',x,z,{width:2.2,rotation:x});
 for(const [x,z,r] of [[4.8,11.1,.2],[9.1,9.2,1.1],[-13.7,15.2,2.2],[16,5.2,.6]])cloneModel('bush_003',x,z,{width:1.45,rotation:r});
 // Small tufts from the pack add texture while leaving the fields unobstructed.
 for(let i=0;i<54;i++){
  const a=i*2.3999,r=18+(i%7)*1.15,x=Math.cos(a)*r,z=Math.sin(a)*r;
  cloneModel('grass_001',x,z,{height:.25+(i%3)*.1,rotation:a});
 }
 for(const [x,z,r] of [[5.6,10.8,.3],[8.9,11.1,1.8],[-11.2,14.5,.7],[-14.7,14.8,2.1],[15.5,4.5,.4],[17.1,4.9,2.4]])cloneModel('grass_004',x,z,{height:.38,rotation:r});
}
function createPlots(){
 while(plots.length>state.plots.length){
  const v=plots.pop();v.label.remove();
  for(const object of [v.soil,v.hit,v.ring,v.cropGroup])scene.remove(object);
  for(const object of [v.hit,v.ring]){object.geometry.dispose();object.material.dispose();}
 }
 for(let i=plots.length;i<state.plots.length;i++){
  const x=-2.15+(i%4)*2.65,z=.25+Math.floor(i/4)*2.7;
  const soil=cloneModel('garden_bed_001',x,z,{width:2.38,depth:2.38,height:.20,y:.02});
  soil.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.color.setHex(0xc4b39a);n.userData.plot=i;}});
  const hit=new THREE.Mesh(new THREE.BoxGeometry(2.4,.25,2.4),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));hit.position.set(x,.23,z);hit.userData.plot=i;scene.add(hit);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.5,.56,4,1,Math.PI/4),new THREE.MeshBasicMaterial({color:0xffe081,transparent:true,opacity:.8,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.scale.set(3.2,3.2,1);ring.position.set(x,.247,z);ring.visible=false;scene.add(ring);
  const label=document.createElement('button');label.className='plot-label';label.setAttribute('aria-label',`Field ${i+1}, empty. Plant ${CROPS[selectedCrop].name}.`);label.addEventListener('click',()=>interact(i));label.addEventListener('focus',()=>highlight(i));label.addEventListener('blur',()=>highlight(-1));labels.append(label);
  const cropGroup=new THREE.Group();cropGroup.userData.plot=i;scene.add(cropGroup);
  plots.push({x,z,soil,hit,ring,label,cropGroup,visualCrop:undefined,lastReady:false});
 }
}
function drawCrop(i){
 const p=state.plots[i],v=plots[i];
 if(v.visualCrop!==p.crop){
  v.cropGroup.clear();v.visualCrop=p.crop;
  if(p.crop){
   const c=CROPS[p.crop];
   if(p.crop==='pumpkin'){
    const o=cloneModel(c.model,0,0,{width:2.05,rotation:Math.PI/2});scene.remove(o);v.cropGroup.add(o);o.position.set(0,0,0);
   }else{
    const offsets=['wheat','barley'].includes(p.crop)?[-.65,0,.65].flatMap(x=>[-.65,0,.65].map(z=>[x,z])):[[-.55,-.55],[.55,-.55],[-.55,.55],[.55,.55]];
    for(const [dx,dz] of offsets){
     const o=cloneModel(c.model,0,0,{height:c.height,rotation:p.crop==='sunflower'?-.55:.5+i*.22});scene.remove(o);v.cropGroup.add(o);o.position.set(dx,0,dz);if(c.tint)o.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.color.setHex(c.tint);}});
    }
   }
  }
 }
 v.cropGroup.position.set(v.x,.25,v.z);
 const pg=progress(p,farmNow()),scale=p.crop ? .12+.88*Math.pow(pg,.6) : 1;
 v.cropGroup.scale.setScalar(scale);
 const ripe=p.crop&&farmNow()>=p.readyAt;
 v.soil.traverse(n=>{if(n.isMesh)n.material.color.setHex(p.watered?0x8b8a82:0xc4b39a)});
 if(!p.crop){v.label.innerHTML='';v.label.className='plot-label';v.label.setAttribute('aria-label',`Field ${i+1}, empty. Plant ${CROPS[selectedCrop].name}.`);}
 else if(ripe){
  if(!v.lastReady||!v.label.querySelector('svg'))v.label.innerHTML='<i data-lucide="shopping-basket"></i>';
  v.label.className='plot-label ready';v.label.setAttribute('aria-label',`Harvest ${CROPS[p.crop].name} from field ${i+1}`);
 }else{
  v.label.textContent=`${p.tended?'✦ ':p.watered?'↟ ':''}${formatDuration(p.readyAt-farmNow())}`;v.label.className=`plot-label${p.watered?' watered':''}${!p.tended&&farmNow()>=p.careAt?' care-ready':''}`;v.label.setAttribute('aria-label',`${CROPS[p.crop].name}, field ${i+1}, ${formatDuration(p.readyAt-farmNow())} remaining${p.watered?', watered':''}`);
 }
 v.lastReady=ripe;
}
function highlight(id){hovered=id;plots.forEach((v,i)=>v.ring.visible=i===id);for(const [key,v] of buildingViews)v.outline.visible=key===id;world.style.cursor=id!==-1?'pointer':'default';}
function particleBurst(id,water=false){
 if(reducedMotion)return;
 const v=plots[id];
 for(let i=0;i<13;i++){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(water?.045:.055,4,3),new THREE.MeshBasicMaterial({color:water?0x88d0e0:[0xffdb69,0xfff2bb,0xf6bf42][i%3],transparent:true}));
  mesh.position.set(v.x,.9,v.z);scene.add(mesh);particles.push({mesh,velocity:new THREE.Vector3((Math.random()-.5)*2,1.5+Math.random()*1.5,(Math.random()-.5)*2),life:1});
 }
}
function floatReward(id,text){const v=plots[id],p=new THREE.Vector3(v.x,2.4,v.z).project(camera),e=document.createElement('div');e.className='floating-reward';e.textContent=text;e.style.left=`${(p.x*.5+.5)*world.clientWidth}px`;e.style.top=`${(-p.y*.5+.5)*world.clientHeight}px`;$('game').append(e);setTimeout(()=>e.remove(),1400);}
function interact(id,forcedAction){
 if(!ready)return;
 const plot=state.plots[id];
 const action=forcedAction??(plot.crop&&farmNow()>=plot.readyAt?'harvest':selectedTool);
 try{
  const result=runAction({type:'field',id,action,crop:selectedCrop});
  if(action==='harvest'){particleBurst(id);floatReward(id,`+${result.quantity} ${CROPS[result.crop].name} · +${result.xp} XP`);}
  if(action==='water'){particleBurst(id,true);floatReward(id,'+1 crop · 20% less waiting');}
  if(action==='tend'){particleBurst(id);floatReward(id,'Extra care · +1 crop');}
  if(action==='plant')floatReward(id,`−${result.cost} coins`);
  drawCrop(id);renderer.shadowMap.needsUpdate=true;updateUI();icons();playTone(action);return result;
 }catch(e){toast(e.message);return {error:e.message};}
}
function setTool(tool){selectedTool=tool;document.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===tool);b.setAttribute('aria-pressed',String(b.dataset.tool===tool));});updateHint();}
function setCrop(crop){selectedCrop=crop;setTool('plant');if(ready)plots.forEach((_,i)=>drawCrop(i));updateHint();}
function updateHint(){
 let text=selectedTool==='tend'?'Give growing crops extra care when the green marker appears. Earn +1 crop.':selectedTool==='water'?'Water growing crops for +1 crop and 20% less waiting.':selectedTool==='harvest'?'Click or drag across ready crops to collect your harvest.':`Click or drag across empty fields to plant ${CROPS[selectedCrop].name.toLowerCase()}.`;
 if(!state.stats.harvested&&state.plots.some(p=>p.crop&&farmNow()>=p.readyAt))text='Your first crops are ready. Click or drag across them to harvest!';
 if(selectedTool==='plant'&&state.stats.harvested>=3&&state.stats.produced===0)text='Your farm can do more. Click a building to start producing!';
 $('hint-text').textContent=text;
}
function updateUI(){
 $('coins').textContent=state.coins.toLocaleString('en-US');$('recover-farm').hidden=!state.legacyRecoveryPending;
 const lp=levelProgress(state),lvl=lp.level;$('level').textContent=lvl;$('xp-text').textContent=`${lp.current} / ${lp.target} XP`;$('xp-bar').max=lp.target;$('xp-bar').value=lp.current;
 $('level-name').textContent=['Rookie farmer','Green thumb','Market regular','Harvest hero','Farm tycoon'][Math.min(lvl-1,4)];
 const count=Object.values(state.inventory).reduce((a,b)=>a+b,0);$('stock-count').hidden=count===0;$('stock-count').textContent=count;
 const qi=QUESTS.findIndex((_,i)=>!state.claimed.includes(i));
 if(qi<0){$('quest-title').textContent='A growing success!';$('quest-description').textContent='All quests complete. Keep growing your farm.';$('quest-progress').max=1;$('quest-progress').value=1;$('quest-count').textContent=`${QUESTS.length} / ${QUESTS.length}`;$('claim-reward').disabled=true;$('claim-reward').textContent='Complete';$('quest-reward').textContent=QUESTS.reduce((n,q)=>n+q.reward,0);$('task-dot').hidden=true;}
 else{
  const q=QUESTS[qi],n=Math.min(q.target,state.stats[q.stat]);$('quest-number').textContent=qi+1;$('quest-title').textContent=q.title;$('quest-description').textContent=q.description;$('quest-progress').max=q.target;$('quest-progress').value=n;$('quest-count').textContent=`${n} / ${q.target}`;$('quest-reward').textContent=q.reward;$('claim-reward').disabled=n<q.target;$('claim-reward').innerHTML='Claim<i data-lucide="arrow-right"></i>';
  $('task-dot').hidden=!QUESTS.some((q,i)=>!state.claimed.includes(i)&&state.stats[q.stat]>=q.target);
 }
 $('quest-total').textContent=QUESTS.length;updateHint();economy?.refresh();retention?.refresh();growth?.refresh();if($('tasks-dialog').open)renderTasks();
}
function renderMarket(){economy.renderMarket();}
function sell(item='category'){return economy.sell(item);}
function renderTasks(){
 $('task-list').innerHTML=QUESTS.map((q,i)=>`<div class="task-row ${state.claimed.includes(i)?'completed':''}"><h3>${state.claimed.includes(i)?'<i data-lucide="circle-check"></i>':''}${q.title}</h3><p>${q.description}</p><div class="task-bottom"><span>${Math.min(state.stats[q.stat],q.target)} / ${q.target} · <b>${q.reward} coins</b></span><button class="small-button" data-claim="${i}" ${state.claimed.includes(i)||state.stats[q.stat]<q.target?'disabled':''}>${state.claimed.includes(i)?'Completed':'Claim reward'}</button></div></div>`).join('');
 $('task-list').querySelectorAll('[data-claim]').forEach(b=>b.addEventListener('click',()=>claim(Number(b.dataset.claim))));icons();
}
function claim(id){try{const r=runAction({type:'quest',id});updateUI();playTone('sell');toast(`Quest complete! +${r.coins} coins and +15 XP.`);return r;}catch(e){toast(e.message);return {error:e.message};}}
function openDialog(id){document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(id==='market-dialog')renderMarket();if(id==='tasks-dialog')renderTasks();$(id).showModal();}
function resize(){
 if(!renderer||!camera)return;
 const width=world.clientWidth,height=world.clientHeight,aspect=width/height;
 renderer.setSize(width,height);renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
 const mobile=width<721,span=(mobile?Math.max(33,21/aspect):37)/zoom;
 camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;
 const focus=mobile?new THREE.Vector3(2+pan,0,3.5-pan):new THREE.Vector3(0,0,1.8);
 camera.position.copy(focus).add(new THREE.Vector3(36,40,36));camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 $('zoom-in').disabled=zoom>=1.5;$('zoom-out').disabled=zoom<=.75;
 positionLabels();positionBuildingLabels();
}
function positionLabels(){
 if(!camera)return;
 for(let i=0;i<plots.length;i++){
  const v=plots[i],p=state.plots[i],y=p.crop?Math.max(.7,(CROPS[p.crop].height+.55)*progress(p,farmNow())):0.4;
  const point=new THREE.Vector3(v.x,y,v.z).project(camera);
  v.label.style.left=`${(point.x*.5+.5)*world.clientWidth}px`;v.label.style.top=`${(-point.y*.5+.5)*world.clientHeight}px`;
  v.label.hidden=point.z>1||point.z< -1||Math.abs(point.x)>1||Math.abs(point.y)>1;
 }
}
function pointerTarget(event){
 for(let i=0;i<plots.length;i++){const v=plots[i];if(!state.plots[i].crop||v.label.hidden)continue;const box=v.label.getBoundingClientRect();if(event.clientX>=box.left&&event.clientX<=box.right&&event.clientY>=box.top&&event.clientY<=box.bottom)return {type:'plot',id:i};}
 const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
 const targets=[...plots.flatMap(v=>[v.hit,v.cropGroup]),...Array.from(buildingViews.values()).map(v=>v.object),...Array.from(utilityViews.values()).map(v=>v.object),...animals.map(v=>v.obj)];
 for(const hit of raycaster.intersectObjects(targets,true)){let obj=hit.object;while(obj){if(obj.userData.utility)return {type:'utility',id:obj.userData.utility};if(obj.userData.building)return {type:'building',id:obj.userData.building};if(Number.isInteger(obj.userData.plot))return {type:'plot',id:obj.userData.plot};obj=obj.parent;}}
 return null;
}
function addUtility(key,model,x,z,options){
 const object=cloneModel(model,x,z,options);object.userData.utility=key;
 const height=new THREE.Box3().setFromObject(object).max.y,info=utilityInfo[key];
 const label=document.createElement('button');label.className='utility-label';label.title=`${info.name} · ${info.hint}`;label.setAttribute('aria-label',`Open ${info.name}`);label.innerHTML=`<i data-lucide="${info.icon}"></i>`;label.onclick=()=>openUtility(key);$('building-labels').append(label);
 utilityViews.set(key,{object,label,x,z,height});
}
function addBuilding(key,x,z,options){
 const object=cloneModel(BUILDINGS[key].model,x,z,options);object.userData.building=key;
 const bounds=new THREE.Box3().setFromObject(object),height=bounds.max.y;
 const outline=new THREE.BoxHelper(object,0xffdc76);outline.material.transparent=true;outline.material.opacity=.75;outline.visible=false;scene.add(outline);
 const label=document.createElement('button');label.className='building-label';label.setAttribute('aria-label',`Open ${BUILDINGS[key].name}`);
 label.innerHTML=`<span class="building-pin"><i data-lucide="${BUILDINGS[key].icon}"></i></span><span><strong>${BUILDINGS[key].name}</strong><small class="building-status" data-building-status="${key}">${key==='farmhouse'?'Expand your fields':'Ready to work'}</small></span>`;
 label.addEventListener('click',()=>economy.openBuilding(key));label.addEventListener('mouseenter',()=>highlight(key));label.addEventListener('mouseleave',()=>highlight(-1));label.addEventListener('focus',()=>highlight(key));label.addEventListener('blur',()=>highlight(-1));$('building-labels').append(label);
 buildingViews.set(key,{object,outline,label,x,z,height});
}
function positionBuildingLabels(){
 for(const v of utilityViews.values()){const p=new THREE.Vector3(v.x,v.height+.3,v.z).project(camera);v.label.style.left=`${(p.x*.5+.5)*world.clientWidth}px`;v.label.style.top=`${(-p.y*.5+.5)*world.clientHeight}px`;v.label.hidden=Math.abs(p.x)>.94||Math.abs(p.y)>.82;}
 for(const [key,v]of buildingViews){const p=new THREE.Vector3(v.x,v.height+.45,v.z).project(camera);v.label.style.left=`${(p.x*.5+.5)*world.clientWidth}px`;v.label.style.top=`${(-p.y*.5+.5)*world.clientHeight}px`;v.label.hidden=Math.abs(p.x)>.92||Math.abs(p.y)>.82;v.label.classList.toggle('ready',economy.status(key).kind==='ready');}
}
function expandVisuals(){if(!ready)return;createPlots();plots.forEach((_,i)=>drawCrop(i));renderer.shadowMap.needsUpdate=true;resize();icons();}
function bindUI(){
 document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
 document.querySelectorAll('[data-crop]').forEach(b=>b.addEventListener('click',()=>setCrop(b.dataset.crop)));
 $('market-button').addEventListener('click',()=>openDialog('market-dialog'));
 $('tasks-button').addEventListener('click',()=>openDialog('tasks-dialog'));
 $('all-quests-mobile').addEventListener('click',()=>openDialog('tasks-dialog'));
 $('help-button').addEventListener('click',()=>openDialog('help-dialog'));
 $('farm-button').addEventListener('click',()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());zoom=1;pan=0;resize();toast('Welcome back to your farm.');});
 document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
 document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
 $('sell-all').addEventListener('click',()=>sell());
 $('claim-reward').addEventListener('click',()=>claim(QUESTS.findIndex((_,i)=>!state.claimed.includes(i))));
 const toggleQuest=()=>{const hidden=!$('quest-body').hidden;$('quest-body').hidden=hidden;$('quest-collapse').setAttribute('aria-expanded',String(!hidden));$('quest-collapse').setAttribute('aria-label',hidden?'Expand quest':'Collapse quest');$('quest-collapse').innerHTML=`<i data-lucide="${hidden?'clipboard-check':'chevron-up'}"></i>`;icons();};
 $('quest-collapse').addEventListener('click',toggleQuest);
 document.querySelector('.quest-heading')?.addEventListener('click',event=>{if(event.target.closest('#quest-collapse'))return;if(innerWidth<721)toggleQuest();});
 if(innerWidth<721){$('quest-body').hidden=true;$('quest-collapse').setAttribute('aria-expanded','false');$('quest-collapse').setAttribute('aria-label','Expand quest');$('quest-collapse').innerHTML='<i data-lucide="clipboard-check"></i>';}
 $('sound-button').addEventListener('click',()=>{sound=!sound;$('sound-button').setAttribute('aria-pressed',String(sound));$('sound-button').setAttribute('aria-label',sound?'Mute sound':'Enable sound');$('sound-button').title=sound?'Mute sound':'Enable sound';$('sound-button').innerHTML=`<i data-lucide="${sound?'volume-2':'volume-x'}"></i>`;icons();if(sound)playTone('plant');});
 const panFarm=delta=>{pan=Math.max(-12,Math.min(12,pan+delta));resize();};
 $('pan-left').addEventListener('click',()=>panFarm(-3.5));$('pan-right').addEventListener('click',()=>panFarm(3.5));
 $('zoom-in').addEventListener('click',()=>{zoom=Math.min(1.5,zoom+.15);resize();});$('zoom-out').addEventListener('click',()=>{zoom=Math.max(.75,zoom-.15);resize();});$('zoom-reset').addEventListener('click',()=>{zoom=1;pan=0;resize();});
 window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.altKey)return;const t={1:'plant',2:'water',3:'harvest',4:'tend'}[e.key];if(t){e.preventDefault();setTool(t);}});
 economy=createEconomyUI({state,onChange:updateUI,onCrop:setCrop,onExpand:expandVisuals,notify:toast,sound:playTone,runAction,onEstate:section=>growth.open(section)});
 retention=createRetentionUI({state,runAction,onChange:()=>{expandVisuals();updateUI();},notify:toast,getCrop:()=>selectedCrop,itemList:economy.itemList});
 growth=createGrowthUI({state,runAction,onChange:()=>{expandVisuals();updateUI();},notify:toast,itemList:economy.itemList,onPlant:key=>economy.chooseCrop(key)});
 $('save-status').onclick=()=>client.retry();
 $('recover-farm').onclick=async()=>{try{await client.recoverLegacy();$('recovery-feedback').textContent='Your earlier farm has been recovered and saved on this device.';}catch(error){$('recovery-feedback').textContent=error.message;}};
 new ResizeObserver(resize).observe(world);icons();
}
function frame(now){
 requestAnimationFrame(frame);if(!ready||document.hidden)return;
 if(now-lastFrame<32)return;const dt=Math.min((now-lastFrame)/1000,.1);lastFrame=now;
 if(now-lastTick>500){plots.forEach((_,i)=>drawCrop(i));positionLabels();positionBuildingLabels();economy.tick();retention.tick();growth.tick();icons();renderer.shadowMap.needsUpdate=true;lastTick=now;}
 if(!reducedMotion){
  const t=clock.getElapsedTime();animals.forEach(a=>{a.obj.position.x=a.x+Math.sin(t*.22+a.seed)*.16;a.obj.position.z=a.z+Math.cos(t*.18+a.seed)*.12;a.obj.rotation.z=Math.sin(t*2+a.seed)*.007;});
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.velocity.y-=dt*3;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.material.opacity=Math.max(0,p.life);if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);}}
 }
 renderer.render(scene,camera);
}
function registerAgentTools(){
 if(!document.modelContext?.registerTool)return;
 const lifecycle=new AbortController();
 const specs=[
  {name:'get_farm_state',title:'Inspect the farm',description:'Read coins, inventory, field IDs, growth and quests in your saved Harvest Tycoon farm.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>farmSummary(state)},
  {name:'work_farm_fields',title:'Plant, water or harvest fields',description:'Apply one farming action to the given fields. Planting spends coins; harvesting adds produce to inventory. Returns per-field results.',inputSchema:{type:'object',properties:{fieldIds:{type:'array',items:{type:'integer',minimum:0,maximum:MAX_PLOTS-1},minItems:1,maxItems:MAX_PLOTS,uniqueItems:true},action:{type:'string',enum:['plant','water','harvest','tend']},crop:{type:'string',enum:Object.keys(CROPS)}},required:['fieldIds','action'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{
   if(!ready)throw new Error('The farm is still loading.');
   if(!input||!Array.isArray(input.fieldIds)||input.fieldIds.length<1||input.fieldIds.length>state.plots.length||new Set(input.fieldIds).size!==input.fieldIds.length||input.fieldIds.some(i=>!Number.isInteger(i)||i<0||i>=state.plots.length)||!['plant','water','harvest','tend'].includes(input.action)||input.crop!==undefined&&!Object.hasOwn(CROPS,input.crop))throw new Error('Invalid field IDs, action or crop.');
   if(input.crop)economy.chooseCrop(input.crop);setTool(input.action);
   return {results:input.fieldIds.map(id=>({id,...interact(id,input.action)})),farm:farmSummary(state)};
  }},
  {name:'sell_farm_harvest',title:'Sell harvested crops',description:'Sell all stored crops and goods, or all of one item, for coins at the market.',inputSchema:{type:'object',properties:{crop:{type:'string',enum:['all',...Object.keys(ITEMS)]}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{const crop=input?.crop??'all';if(!['all',...Object.keys(ITEMS)].includes(crop))throw new Error('Invalid crop.');const result=sell(crop);return {...result,farm:farmSummary(state)};}},
  {name:'start_farm_production',title:'Start a production batch',description:'Consume the ingredients and start a timed recipe in its farm building. Does not collect the finished goods.',inputSchema:{type:'object',properties:{recipe:{type:'string',enum:Object.keys(RECIPES)}},required:['recipe'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!ready)throw new Error('The farm is loading.');const result=runAction({type:'produce',recipe:input?.recipe});updateUI();economy.openBuilding(result.building);return {...result,farm:farmSummary(state)};}},
  {name:'collect_farm_production',title:'Collect a finished batch',description:'Collect finished goods from a building into inventory. Fails when the batch is not ready.',inputSchema:{type:'object',properties:{building:{type:'string',enum:Object.keys(BUILDINGS).filter(k=>k!=='farmhouse')}},required:['building'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!ready)throw new Error('The farm is loading.');const result=runAction({type:'collect',building:input?.building});updateUI();economy.openBuilding(result.building);return {...result,farm:farmSummary(state)};}},
  {name:'upgrade_farm_building',title:'Upgrade a farm building',description:'Spend coins to increase production speed, or expand the fields when building is farmhouse.',inputSchema:{type:'object',properties:{building:{type:'string',enum:Object.keys(BUILDINGS)}},required:['building'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!ready)throw new Error('The farm is loading.');const result=runAction(input?.building==='farmhouse'?{type:'expand'}:{type:'upgrade',building:input?.building});expandVisuals();updateUI();economy.openBuilding(input.building);return {...result,farm:farmSummary(state)};}}
 ];
 for(const tool of specs){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
async function init(){
 bindUI();updateUI();
 try{
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setClearColor(0xa8c777);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  world.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive farm. Use Tab to move between fields, and Enter to work a field.');
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;$('error-message').textContent='The 3D view was interrupted. Reload to return to your saved farm.';$('error').hidden=false;});
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-25,25,17,-17,.1,180);
  const hemi=new THREE.HemisphereLight(0xfff9df,0x6d8153,2.35);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff2d7,3.1);sun.position.set(-20,35,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;sun.shadow.camera.near=1;sun.shadow.camera.far=95;sun.shadow.normalBias=.035;sun.shadow.bias=-.00012;sun.shadow.radius=3;scene.add(sun);scene.add(sun.target);
  const loader=new GLTFLoader();let loaded=0;
  await Promise.all([client.load(),...modelNames.map(async name=>{
   const gltf=await loader.loadAsync(`/assets/models/${name}.glb`),object=gltf.scene;
   const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
   object.position.sub(new THREE.Vector3(center.x,box.min.y,center.z));const group=new THREE.Group();group.add(object);
   object.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;n.material.roughness=1;n.material.metalness=0;}});
   models.set(name,{object:group,size});loaded++;$('load-progress').value=Math.round(loaded/modelNames.length*100);$('load-text').textContent=`${loaded} / ${modelNames.length} little pieces of your farm`;
  })]);
  decorate();createPlots();plots.forEach((v,i)=>v.cropGroup.userData.plot=i);plots.forEach((_,i)=>drawCrop(i));resize();icons();
  renderer.domElement.addEventListener('pointermove',e=>{
   const target=pointerTarget(e);highlight(target?.id??-1);const tooltip=$('tooltip');
   if(!target||e.pointerType==='touch'){tooltip.hidden=true;return;}
   tooltip.hidden=false;
   if(target.type==='utility'){const u=utilityInfo[target.id];tooltip.innerHTML=`<strong>${u.name}</strong><span>${u.hint} · click to open</span>`;}
   else if(target.type==='building'){const b=BUILDINGS[target.id];tooltip.innerHTML=`<strong>${b.name}</strong><span>${economy.status(target.id).text} · click to open</span>`;}
   else{const p=state.plots[target.id];tooltip.innerHTML=`<strong>${p.crop?CROPS[p.crop].name:'Empty field'}</strong><span>${!p.crop?`Plant ${CROPS[selectedCrop].name.toLowerCase()} · ${seedCost(state,selectedCrop)} coins`:farmNow()>=p.readyAt?'Ready to harvest!':`${formatDuration(p.readyAt-farmNow())} · ${harvestYield(p)} crop${harvestYield(p)>1?'s':''}${!p.tended&&farmNow()>=p.careAt?' · extra care ready':p.tended?' · fully cared for':' · water & care for more'}`}</span>`;}
   const r=world.getBoundingClientRect();tooltip.style.left=`${Math.min(r.width-130,Math.max(130,e.clientX-r.left))}px`;tooltip.style.top=`${e.clientY-r.top-16}px`;
  });
  renderer.domElement.addEventListener('pointerleave',()=>{highlight(-1);$('tooltip').hidden=true;});
  let gesture=null;
  const canvas=renderer.domElement;
  function workGesture(target){
   if(target?.type!=='plot'||gesture.visited.has(target.id))return;
   gesture.visited.add(target.id);const p=state.plots[target.id],mode=gesture.mode;
   const eligible=mode==='plant'?!p.crop:mode==='water'?p.crop&&!p.watered&&p.readyAt>farmNow():mode==='tend'?p.crop&&!p.tended&&p.readyAt>farmNow()&&farmNow()>=p.careAt:p.crop&&p.readyAt<=farmNow();
   if(eligible)interact(target.id,mode);
  }
  canvas.addEventListener('pointerdown',e=>{
   if(e.button!==0||!ready)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);
   const target=pointerTarget(e),p=target?.type==='plot'?state.plots[target.id]:null;
   gesture={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,target,mode:p?.crop&&p.readyAt<=farmNow()?'harvest':selectedTool,visited:new Set(),moved:false,panAllowed:e.pointerType==='touch'&&target?.type!=='plot',panning:false};
   if(target?.type==='plot'){gesture.visited.add(target.id);interact(target.id,gesture.mode);}
  });
  canvas.addEventListener('pointermove',e=>{
   if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();$('tooltip').hidden=true;
   const dx=e.clientX-gesture.lastX,dy=e.clientY-gesture.lastY;
   if(Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>7)gesture.moved=true;
   if(gesture.panAllowed){
    if(gesture.panning||Math.abs(e.clientX-gesture.x)>10&&Math.abs(e.clientX-gesture.x)>Math.abs(e.clientY-gesture.y)){gesture.panning=true;panFarm(-dx*.045/zoom);}
    gesture.lastX=e.clientX;gesture.lastY=e.clientY;return;
   }
   if(gesture.target?.type==='plot'||!gesture.target){
    const steps=Math.min(12,Math.max(1,Math.ceil(Math.hypot(e.clientX-gesture.lastX,e.clientY-gesture.lastY)/15)));
    for(let i=1;i<=steps;i++)workGesture(pointerTarget({clientX:gesture.lastX+(e.clientX-gesture.lastX)*i/steps,clientY:gesture.lastY+(e.clientY-gesture.lastY)*i/steps}));
   }
   gesture.lastX=e.clientX;gesture.lastY=e.clientY;
  });
  canvas.addEventListener('pointerup',e=>{
   if(!gesture||gesture.id!==e.pointerId)return;
   const target=pointerTarget(e);
   if(!gesture.moved&&!gesture.panning&&target?.id===gesture.target?.id){if(target?.type==='building')economy.openBuilding(target.id);if(target?.type==='utility')openUtility(target.id);}
   gesture=null;if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointercancel',()=>{gesture=null;});
  canvas.addEventListener('lostpointercapture',()=>{gesture=null;});
  ready=true;updateUI();const ripe=state.plots.filter(p=>p.crop&&p.readyAt<=farmNow()).length;if(state.stats.harvested>0)toast(`Welcome back! ${ripe?`${ripe} crops are ready to harvest.`:'Your farm is right where you left it.'}`);renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);$('loading').classList.add('fade');setTimeout(()=>$('loading').hidden=true,450);registerAgentTools();requestAnimationFrame(frame);
 }catch(error){console.error('Farm initialization failed',error);if(renderer)$('error-message').textContent=error.message||'Your saved farm could not load. Please try again.';$('loading').hidden=true;$('error').hidden=false;if(!renderer)$('error-message').textContent='This game needs WebGL 2. Try a current browser with hardware acceleration enabled.';}
}
init();
