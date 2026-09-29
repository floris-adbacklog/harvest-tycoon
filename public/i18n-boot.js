// Before anything is drawn (play.html and farm.html load this first): a farmer who plays in a translated language gets the page
// hidden until public/i18n.js has translated it, and the translation file starts loading now. Long words (German!) break with a
// hyphen by the rules of the language (public/i18n.js sets the page's lang). English farmers: nothing happens.
// READY lists the languages that are translated, like public/languages.js (a test keeps them the same).
(function(){
 var READY=' de es nl hi ';
 try{
  var root=document.documentElement,saved=localStorage.getItem('harvest-tycoon:language'),code=saved||'';
  if(!saved){var tags=navigator.languages||[navigator.language];for(var i=0;i<tags.length;i++){var c=String(tags[i]||'').slice(0,2).toLowerCase();if(c==='en'||READY.indexOf(' '+c+' ')>=0){code=c;break;}}}
  if(!code||code==='en'||READY.indexOf(' '+code+' ')<0)return;
  var style=document.createElement('style');style.textContent='.i18n-wait body{visibility:hidden}body{-webkit-hyphens:auto;hyphens:auto}';document.head.appendChild(style);
  root.classList.add('i18n-wait');
  window.harvestI18n={code:code,load:fetch('/i18n/'+code+'.json').then(function(r){if(!r.ok)throw new Error(String(r.status));return r.json();})};
  // Never keep the page hidden for long, also when something goes wrong.
  setTimeout(function(){root.classList.remove('i18n-wait');},3000);
 }catch(error){}
})();
