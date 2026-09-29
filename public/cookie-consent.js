// The cookie choice. The banner names the purposes; the privacy policy it links to names the tools. Google Tag Manager (which runs Google Analytics and the Meta Pixel) only loads after "Accept": the
// loader at the top of play.html reads the same choice. The choice is kept for 12 months in local storage and can be
// changed at any time: "Cookie settings" at the bottom of the home page, in the game's Settings, or /?cookie-settings.
// Accept is the filled button; Decline sits next to it at the same size and stays clearly readable (outlined), so declining
// is as easy as accepting, as the Dutch Data Protection Authority requires.
(function(){
 var KEY='harvest-tycoon:cookies',KEEP=365*864e5;
 var TRACKING=/^(_ga|_ga_.+|_gid|_gat.*|_gcl_.+|_fbp|_fbc)$/;
 function choice(){
  try{var saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved&&(saved.choice==='accepted'||saved.choice==='declined')&&Date.now()-saved.at<KEEP)return saved.choice;}catch(e){}
  return null;
 }
 function save(value){try{localStorage.setItem(KEY,JSON.stringify({choice:value,at:Date.now()}));}catch(e){}}
 // Removes the Google Analytics and Meta cookies from this site (they are set on the site's own domain).
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
  var before=choice();save(value);close();
  if(value==='accepted'){if(window.harvestLoadGtm)window.harvestLoadGtm();return;}
  clearTrackingCookies();
  // Tools that already run on this page keep running until it is left, so a withdrawn "yes" reloads the page.
  if(before==='accepted'||window.harvestGtmLoaded)location.reload();
 }
 function open(){
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
  var params=new URLSearchParams(location.search);
  if(params.has('cookie-settings')){params.delete('cookie-settings');var rest=params.toString();history.replaceState(history.state,'',location.pathname+(rest?'?'+rest:'')+location.hash);open();return;}
  if(!choice())open();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
