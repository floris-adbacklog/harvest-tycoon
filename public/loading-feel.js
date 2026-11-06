// The farm's loading screen feels quicker (6 Nov 2026, the owner: "doe alle", the game should feel faster without looking worse).
// A plain script that farm.html runs before the game's own code (public/game.js, about 1 MB) has arrived, so both work from the first
// moment:
// 1. Your own farm behind the loading screen: the last look at your farm (kept on this device by game.js, keepFarmLook) shows at once,
//    softly blurred, behind the logo and the bar, and leaves with the loading screen when the 3D farm is ready. A new farmer, another
//    farmer on this device, the village or harbour and a look older than LOOK_DAYS show the painting as before.
// 2. A bar that never stands still: it runs quickly to about 70% and then keeps creeping, never past 99% until the farm is really
//    ready, and while one step lasts a few seconds the line under it changes between short farm texts (FEEL_TEXTS). What the bar
//    shows is only the look: the real progress stays in #load-progress (public/loading-screen.js createLoadingScreen), where the
//    watchdogs (watchLoading, farmHandOver) and the stall notes (load_stalls) read it as before.
// Nothing here may ever stop the farm from loading: every step is in a try, and without IndexedDB or with an error there is simply no look.
(function(){
 var doc=document,win=window,root=doc.documentElement;
 var DB='harvest-tycoon-look',STORE='looks',KEY='farm',LOOK_DAYS=14;
 // Short and light, one at a time: they say the farm is getting ready, not what step it is on (the real step shows first).
 var FEEL_TEXTS=['Watering the crops…','Feeding the animals…','Waking up the farmer…','Oiling the windmill…','Collecting the eggs…','Sweeping the barn…'];
 var STEP_MS=2800,FEEL_MS=2600;
 function openDb(){
  return new Promise(function(resolve,reject){
   try{var asked=win.indexedDB.open(DB,1);asked.onupgradeneeded=function(){asked.result.createObjectStore(STORE);};asked.onsuccess=function(){resolve(asked.result);};asked.onerror=function(){reject(asked.error);};asked.onblocked=function(){reject(new Error('blocked'));};}
   catch(error){reject(error);}
  });
 }
 function withStore(mode,work){
  return openDb().then(function(db){return new Promise(function(resolve,reject){
   try{var tx=db.transaction(STORE,mode),result=work(tx.objectStore(STORE));tx.oncomplete=function(){db.close();resolve(result&&'result' in result?result.result:undefined);};tx.onerror=tx.onabort=function(){db.close();reject(tx.error);};}
   catch(error){db.close();reject(error);}
  });});
 }
 // Whose farm this page opens: the page around it names the farmer before the farm arrives (src/main.js, src/farm-session.js).
 function farmer(){try{var id=win.parent&&win.parent!==win&&win.parent.harvestBridge&&win.parent.harvestBridge.playerId;return typeof id==='string'&&id?id:null;}catch(error){return null;}}
 var homeFarm=function(){try{return !new URLSearchParams(win.location.search).get('world');}catch(error){return false;}};
 // Kept by game.js (keepFarmLook) now and then and when the page goes out of view: a small picture of the farm as it is on screen.
 win.harvestFarmLook={
  keep:function(blob,player){
   if(!blob||!player||!homeFarm())return Promise.resolve(false);
   return withStore('readwrite',function(store){return store.put({player:player,at:Date.now(),blob:blob},KEY);}).then(function(){return true;},function(){return false;});
  },
  forget:function(){return withStore('readwrite',function(store){return store.delete(KEY);}).then(function(){return true;},function(){return false;});}
 };
 function showLook(loading){
  var player=farmer();if(!player||!homeFarm()||root.hasAttribute('data-admin-view')||!win.indexedDB||!win.URL||!URL.createObjectURL)return;
  withStore('readonly',function(store){return store.get(KEY);}).then(function(look){
   if(!look||look.player!==player||!(look.blob instanceof Blob)||!(Date.now()-look.at<LOOK_DAYS*86400000))return;
   if(loading.classList.contains('fade')||loading.hidden)return;
   var url=URL.createObjectURL(look.blob),picture=new Image();
   picture.onload=function(){
    if(loading.classList.contains('fade'))return URL.revokeObjectURL(url);
    var layer=doc.createElement('div');layer.className='farm-loading-look';layer.setAttribute('aria-hidden','true');layer.style.backgroundImage='url("'+url+'")';
    loading.insertBefore(layer,loading.firstChild);loading.classList.add('has-look');
    win.requestAnimationFrame(function(){layer.classList.add('is-in');});
   };
   picture.onerror=function(){URL.revokeObjectURL(url);};
   picture.src=url;
  },function(){});
 }
 // The farm texts in the farmer's language: the translations public/i18n-boot.js started loading (nothing for English).
 var dict=null;
 try{if(win.harvestI18n&&win.harvestI18n.load)win.harvestI18n.load.then(function(d){dict=d&&typeof d==='object'?d:null;},function(){});}catch(error){}
 var said=function(text){var out=dict&&dict[text];return typeof out==='string'&&out?out:text;};
 // 12% to 70% in the first 2.4 seconds (slowing as it goes), then on towards 94% ever more slowly: always moving a little.
 function creep(ms){var s=Math.max(0,ms)/1000;if(s<2.4){var k=s/2.4;return 12+58*(1-Math.pow(1-k,3));}return 70+24*(1-Math.exp(-(s-2.4)/25));}
 function startBar(loading){
  var real=doc.getElementById('load-progress'),percent=doc.getElementById('load-percent'),line=doc.getElementById('load-text');
  if(!real||!percent||!line)return;
  var bar=doc.createElement('span');bar.className='farm-loading-bar';bar.setAttribute('aria-hidden','true');var fill=doc.createElement('i');bar.appendChild(fill);
  real.parentNode.insertBefore(bar,real.nextSibling);
  // From here on public/loading-screen.js leaves the percent and the line to this script (it still writes the real value and step).
  root.setAttribute('data-load-creep','');
  var first=line.textContent,shown=0,step=null,stepAt=0,feel=Math.floor(Math.random()*FEEL_TEXTS.length),feelAt=0,timer=0;
  function tick(){
   timer=0;
   var now=win.performance&&performance.now?performance.now():Date.now(),value=Number(real.value)||0,done=value>=100;
   shown=done?100:Math.max(shown,Math.min(99,Math.max(value,creep(now))));
   fill.style.width=shown.toFixed(1)+'%';percent.textContent=Math.floor(shown)+'%';
   var current=line.getAttribute('data-step')||first;
   if(current!==step){step=current;stepAt=now;feelAt=0;line.textContent=said(step);}
   else if(!done&&now-stepAt>=STEP_MS&&now-feelAt>=FEEL_MS){feelAt=now;feel=(feel+1)%FEEL_TEXTS.length;line.textContent=said(FEEL_TEXTS[feel]);}
   if(done||loading.classList.contains('fade'))return;
   timer=win.setTimeout(tick,120);
  }
  tick();
 }
 function start(){
  var loading=doc.getElementById('loading');if(!loading||!loading.classList.contains('farm-loading'))return;
  try{startBar(loading);}catch(error){}
  try{showLook(loading);}catch(error){}
 }
 if(doc.getElementById('loading'))start();else doc.addEventListener('DOMContentLoaded',start,{once:true});
})();
