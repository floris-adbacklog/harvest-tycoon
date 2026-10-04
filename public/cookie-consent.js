// The cookie choice. The banner names the purposes; the privacy policy it links to names the tools. Google Tag Manager (which runs Google Analytics, the Meta Pixel and the TikTok Pixel) only loads after "Accept": the
// loader at the top of play.html reads the same choice. The choice is kept for 12 months in local storage and can be
// changed at any time: "Cookie settings" at the bottom of the home page, in the game's Settings, or /?cookie-settings.
// Accept is the filled button; Decline sits next to it at the same size and stays clearly readable (outlined), so declining
// is as easy as accepting, as the Dutch Data Protection Authority requires.
(function(){
 var KEY='harvest-tycoon:cookies',KEEP=365*864e5;
 // Our iPhone app (3 Oct 2026, public/android-app.js marks it): no Tag Manager there at all, so no banner and nothing to choose.
 var root=document.documentElement,iosApp=!!(root&&root.getAttribute&&root.getAttribute('data-app-os')==='ios');
 var TRACKING=/^(_ga|_ga_.+|_gid|_gat.*|_gcl_.+|_fbp|_fbc|_ttp|_tt_enable_cookie|ttcsid.*)$/;
 // The saved choice while it is younger than 12 months, else null. v:2 (4 Oct 2026): made with the privacy policy that names the
 // Meta SDK of our Android app.
 function saved(){
  try{var s=JSON.parse(localStorage.getItem(KEY)||'null');if(s&&(s.choice==='accepted'||s.choice==='declined')&&Date.now()-s.at<KEEP)return s;}catch(e){}
  return null;
 }
 function choice(){var s=saved();return s?s.choice:null;}
 function save(value){var at=Date.now();try{localStorage.setItem(KEY,JSON.stringify({choice:value,at:at,v:2}));}catch(e){}return at;}
 // Our Android app from 1.2 (4 Oct 2026) has the Meta SDK (android-app MetaEvents): it hears the choice, and when it was made (so a
 // yes ends there after 12 months too), through window.HarvestMeta, and sends Meta nothing without a yes, as Tag Manager here.
 // No valid choice (none yet, or asked again) is told too: the app is then as before a choice.
 function app(){return window.HarvestMeta||null;}
 function tellApp(value,at){try{if(app()&&app().consent)app().consent(value==='accepted',at);}catch(e){}}
 function forgetApp(){try{if(app()&&app().forget)app().forget();}catch(e){}}
 // Removes the Google Analytics, Meta and TikTok cookies from this site (they are set on the site's own domain).
 function clearTrackingCookies(){
  var host=location.hostname,parts=host.split('.'),domains=['',host,'.'+host];
  if(parts.length>2)domains.push('.'+parts.slice(-2).join('.'));
  document.cookie.split(';').forEach(function(pair){
   var name=pair.split('=')[0].trim();if(!TRACKING.test(name))return;
   domains.forEach(function(domain){document.cookie=name+'=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'+(domain?'; domain='+domain:'');});
  });
 }
 var banner;
 function close(){if(banner){banner.remove();banner=null;}}
 function decide(value){
  var before=choice(),at=save(value);close();tellApp(value,at);
  if(value==='accepted'){if(window.harvestLoadGtm)window.harvestLoadGtm();return;}
  clearTrackingCookies();
  // Tools that already run on this page keep running until it is left, so a withdrawn "yes" reloads the page.
  if(before==='accepted'||window.harvestGtmLoaded)location.reload();
 }
 function open(){
  if(iosApp)return;
  close();
  banner=document.createElement('section');
  banner.className='cookie-banner';banner.setAttribute('role','dialog');banner.setAttribute('aria-modal','false');banner.setAttribute('aria-labelledby','cookie-title');
  banner.innerHTML='<span class="wart cookie-art" aria-hidden="true"></span>'
   +'<div class="cookie-copy"><h2 id="cookie-title">Help a new farm game grow</h2>'
   +'<p>We use cookies to see what farmers enjoy and to measure our ads. <a href="/privacy#cookies">Privacy Policy</a></p>'
   +'<div class="cookie-actions"><button type="button" class="cookie-button is-decline" data-cookie="declined">Decline</button><button type="button" class="cookie-button is-accept" data-cookie="accepted">Accept</button></div></div>';
  banner.querySelectorAll('[data-cookie]').forEach(function(button){button.onclick=function(){decide(button.getAttribute('data-cookie'));};});
  document.body.appendChild(banner);
 }
 window.harvestConsent={open:open,choice:choice};
 function start(){
  if(iosApp)return;
  var params=new URLSearchParams(location.search);
  if(params.has('cookie-settings')){params.delete('cookie-settings');var rest=params.toString();history.replaceState(history.state,'',location.pathname+(rest?'?'+rest:'')+location.hash);open();return;}
  var s=saved();
  // In the app, a yes from before its Meta SDK (no v:2) was given for less: the question is asked again there.
  if(s&&app()&&s.choice==='accepted'&&s.v!==2)s=null;
  if(s)tellApp(s.choice,s.at);else{forgetApp();open();}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
