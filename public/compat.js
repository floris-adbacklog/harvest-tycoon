// Older browsers (23 Oct 2026, the loading reports: Android app players on an Android System WebView of Chrome 90 to 101 stayed at
// level 1 or 2, and a farm page whose own code never ran left no word of why). The first script on every game page, before any module.
// 1. What the game uses that such a browser lacks, added only where it is missing (a current browser keeps its own): Array and String
//    .at (Chrome 92), Object.hasOwn (93), crypto.randomUUID (92) and structuredClone (98; here for the plain data the game copies).
// 2. The first thing that breaks on the page, before the game's own watch is there (src/game-cloud.js harvestStartup): a file that did
//    not load, an error, a refused promise; with the browser and its version. The stall note takes it when the game's own start left
//    none (public/loading-screen.js startupOf), so a farm page that never ran says why.
// 3. A browser without import maps (Firefox before 108, Chrome before 89) cannot load the game's modules: the farm page's own card says
//    so, in the farmer's language, instead of a farm that opens again and again (src/game-cloud.js stops there).
(function(w,d){
 var def=function(o,k,v){if(o&&!(k in o))try{Object.defineProperty(o,k,{value:v,writable:true,configurable:true});}catch(e){}};
 var at=function(i){var n=this.length;i=Math.trunc(Number(i))||0;if(i<0)i+=n;return i<0||i>=n?undefined:this[i];};
 def(Array.prototype,'at',at);def(String.prototype,'at',at);
 def(Object,'hasOwn',function(o,k){return Object.prototype.hasOwnProperty.call(Object(o),k);});
 if(w.crypto&&typeof w.crypto.getRandomValues==='function')def(w.crypto,'randomUUID',function(){
  var b=w.crypto.getRandomValues(new Uint8Array(16)),h=[];b[6]=b[6]&15|64;b[8]=b[8]&63|128;
  for(var i=0;i<16;i++)h.push((b[i]+256).toString(16).slice(1));
  return h.slice(0,4).join('')+'-'+h.slice(4,6).join('')+'-'+h.slice(6,8).join('')+'-'+h.slice(8,10).join('')+'-'+h.slice(10).join('');
 });
 var copy=function(v,seen){
  if(v===null||typeof v!=='object')return v;
  if(seen.has(v))return seen.get(v);
  var out,k;
  if(v instanceof Date)out=new Date(v.getTime());
  else if(v instanceof RegExp)out=new RegExp(v.source,v.flags);
  else if(typeof DataView!=='undefined'&&v instanceof DataView)out=new DataView(v.buffer.slice(v.byteOffset,v.byteOffset+v.byteLength));
  else if(ArrayBuffer.isView(v))out=v.slice();
  else if(v instanceof ArrayBuffer)out=v.slice(0);
  if(out){seen.set(v,out);return out;}
  if(Array.isArray(v)){out=[];seen.set(v,out);for(k=0;k<v.length;k++)out[k]=copy(v[k],seen);return out;}
  if(v instanceof Map){out=new Map();seen.set(v,out);v.forEach(function(x,key){out.set(copy(key,seen),copy(x,seen));});return out;}
  if(v instanceof Set){out=new Set();seen.set(v,out);v.forEach(function(x){out.add(copy(x,seen));});return out;}
  out={};seen.set(v,out);for(k in v)if(Object.prototype.hasOwnProperty.call(v,k))out[k]=copy(v[k],seen);return out;
 };
 def(w,'structuredClone',function(v){return copy(v,new Map());});

 var agent=String(w.navigator&&w.navigator.userAgent||''),found=/(Edg|OPR|SamsungBrowser|Firefox|FxiOS|CriOS|Chrome)\/(\d+)/.exec(agent),safari=/Version\/(\d+)[^)]*Safari/.exec(agent);
 var names={Edg:'Edge',OPR:'Opera',SamsungBrowser:'Samsung Internet',FxiOS:'Firefox',CriOS:'Chrome'};
 var boot=w.harvestBoot={error:null,browser:found?(names[found[1]]||found[1])+' '+found[2]:safari?'Safari '+safari[1]:'',tooOld:false};
 var plain=function(url){return String(url||'').replace(/^https?:\/\/[^/]+/,'').split(/[?#]/)[0];};
 var first=function(line){if(!boot.error&&line)boot.error=String(line).replace(/\s+/g,' ').trim().slice(0,120);};
 // In the capture phase: a script or stylesheet that did not load says so only on its own element, it never reaches the window.
 w.addEventListener('error',function(e){
  var t=e&&e.target;
  // A picture or a sound that did not load is no broken start: only scripts and stylesheets count.
  if(t&&t!==w&&t.tagName){if(t.tagName==='SCRIPT'||t.tagName==='LINK'&&/stylesheet|modulepreload/.test(t.rel||''))first('load failed '+plain(t.src||t.href));return;}
  first((e&&e.message||'Error')+(e&&e.filename?' @ '+plain(e.filename)+':'+(e.lineno||0):''));
 },true);
 w.addEventListener('unhandledrejection',function(e){var r=e&&e.reason;first(r&&r.message?(r.name?r.name+': ':'')+r.message:String(r));});

 var maps=typeof HTMLScriptElement!=='undefined'&&typeof HTMLScriptElement.supports==='function'&&HTMLScriptElement.supports('importmap');
 if(maps)return;
 boot.tooOld=true;first('no import maps');
 var OLD='This browser is too old for Harvest Tycoon. Update it, or play in a current Chrome, Edge, Firefox or Safari.';
 var APP='This phone could not start the 3D farm. Update Android System WebView and Chrome in the Play Store, or play in your browser at harvesttycoon.com.';
 var HEADING='Your farm could not load';
 // The farm page's own card (its farm loading screen and #error), shown once the page is read; on any other page nothing shows here.
 boot.show=function(){
  var card=d.getElementById('error'),line=d.getElementById('error-message');
  if(!card||!line||!d.getElementById('load-progress'))return;
  var html=d.documentElement,app=html.getAttribute('data-app')==='android'&&html.getAttribute('data-app-os')!=='ios';
  try{var top=w.parent&&w.parent!==w&&w.parent.document.documentElement;if(top&&top.getAttribute('data-app')==='android'&&top.getAttribute('data-app-os')!=='ios')app=true;}catch(e){}
  var english=app?APP:OLD,heading=card.querySelector('h2'),again=card.querySelector('button'),loading=d.getElementById('loading');
  line.textContent=english;if(again)again.hidden=true;if(loading)loading.hidden=true;card.hidden=false;d.body.hidden=false;
  try{var lang=w.harvestI18n;if(lang&&lang.load)lang.load.then(function(dict){
   if(dict&&typeof dict[english]==='string')line.textContent=dict[english];
   if(heading&&dict&&typeof dict[HEADING]==='string')heading.textContent=dict[HEADING];
  },function(){});}catch(e){}
 };
 if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',boot.show);else boot.show();
})(window,document);
