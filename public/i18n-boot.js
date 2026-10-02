// Before anything is drawn (play.html and farm.html load this first): a farmer who plays in a translated language gets the page
// hidden until public/i18n.js has translated it, and the translation file starts loading now. Long words (German!) break with a
// hyphen by the rules of the language (public/i18n.js sets the page's lang). English farmers: nothing happens.
// READY lists the languages that are translated, like public/languages.js (a test keeps them the same).
(function(){
 var READY=' cs de es fr id hu nl pt tr ru uk hi ja ar zh ';
 var RTL=' ar ';
 var root=document.documentElement,page=root.getAttribute('data-page-lang')||'',code='';
 // A language page (/es/, scripts/build-languages.mjs, Oct 2026) is in its language already, and opening it makes that this
 // device's language, as picking it in the menu does: the farm, the sign-in return (/play.html) and the installed app follow.
 if(page&&READY.indexOf(' '+page+' ')>=0){code=page;try{localStorage.setItem('harvest-tycoon:language',page);}catch(error){}}
 else{
  // Blocked storage (a private window, some in-app browsers) still gets the device's language.
  var saved=null;try{saved=localStorage.getItem('harvest-tycoon:language');}catch(error){}
  code=saved||'';
  if(!saved){var tags=navigator.languages||[navigator.language];for(var i=0;i<tags.length;i++){var c=String(tags[i]||'').slice(0,2).toLowerCase();if(c==='en'||READY.indexOf(' '+c+' ')>=0){code=c;break;}}}
 }
 if(!code||code==='en'||READY.indexOf(' '+code+' ')<0)return;
 try{
  // Arabic reads from right to left: the whole page turns before it is drawn (public/languages.js RTL_LANGUAGES).
  root.lang=code;if(RTL.indexOf(' '+code+' ')>=0)root.dir='rtl';
  // A language page shows at once; only what the code writes in English before the translations are here waits (the sign-up card,
  // the cookie question, the loading texts, the player count).
  var wait=page?'.i18n-wait .account-card,.i18n-wait .cookie-banner,.i18n-wait .farm-loading-status,.i18n-wait .farm-loading-tip,.i18n-wait .player-counts{visibility:hidden}':'.i18n-wait body{visibility:hidden}';
  var style=document.createElement('style');style.textContent=wait+'body{-webkit-hyphens:auto;hyphens:auto}';document.head.appendChild(style);
  root.classList.add('i18n-wait');
  window.harvestI18n={code:code,load:fetch('/i18n/'+code+'.json').then(function(r){if(!r.ok)throw new Error(String(r.status));return r.json();})};
  // Never keep the page hidden for long, also when something goes wrong.
  setTimeout(function(){root.classList.remove('i18n-wait');},3000);
 }catch(error){}
})();
