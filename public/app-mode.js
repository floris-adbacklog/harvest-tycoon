// Marks the page when it runs as the installed app (home-screen icon), in the page and in the game frame, so the
// layout rules for the installed app (pwa-layout.css) never reach the ordinary browser.
// It also measures a quirk of some iOS versions in that mode: the layout height falls short of the screen by the
// height of the status bar, while the page is still drawn from the very top. The bottom strip of the screen is then
// outside the layout viewport, and nothing that has to be tapped may sit in it. --viewport-shortfall holds that
// height (0px when the page fills the screen, which is the normal case).
(function(){
 var html=document.documentElement;
 function standalone(win){try{return Boolean((win.matchMedia&&win.matchMedia('(display-mode: standalone)').matches)||win.navigator.standalone);}catch(e){return false;}}
 var installed=standalone(window);
 try{if(!installed&&window.parent!==window)installed=standalone(window.parent);}catch(e){}
 if(!installed)return;
 html.setAttribute('data-app-mode','standalone');

 function statusBar(){
  var probe=document.createElement('div');
  probe.style.cssText='position:absolute;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px)';
  html.appendChild(probe);
  var px=parseFloat(getComputedStyle(probe).paddingTop)||0;
  html.removeChild(probe);
  return px;
 }
 // The height a full-screen fixed element really gets. On some iPhones window.innerHeight reports the full screen while that box
 // (and so the game) still ends a status bar short (26 Sep 2026), so the shorter of the two counts.
 function fixedHeight(){
  var probe=document.createElement('div');
  probe.style.cssText='position:fixed;top:0;bottom:0;left:0;width:1px;visibility:hidden;pointer-events:none';
  html.appendChild(probe);
  var px=probe.getBoundingClientRect?probe.getBoundingClientRect().height:0;
  html.removeChild(probe);
  return px||window.innerHeight;
 }
 function measure(){
  var landscape=window.innerWidth>window.innerHeight,screenLong=Math.max(screen.width,screen.height),screenShort=Math.min(screen.width,screen.height);
  var fixed=Math.round(fixedHeight()),height=Math.min(window.innerHeight,fixed);
  var gap=Math.round((landscape?screenShort:screenLong)-height),bar=statusBar();
  // Only a gap that is exactly the status bar counts: a split-screen window or a page below an opaque status bar is not this quirk.
  var own=bar>0&&gap>0&&Math.abs(gap-bar)<=2?gap:0;
  html.style.setProperty('--viewport-shortfall',own+'px');
  // The game frame (26 Sep 2026): the page stretches it over that strip (welcome.css), so the farm reaches the bottom of the screen.
  // The frame then measures no gap of its own, but the strip may still not take taps: --frame-strip keeps the buttons above it.
  var strip=0;
  try{if(window.parent!==window&&own===0)strip=parseFloat(window.parent.getComputedStyle(window.parent.document.documentElement).getPropertyValue('--viewport-shortfall'))||0;}catch(e){}
  html.style.setProperty('--frame-strip',strip+'px');
  // What this device reports, for the admin dashboard (Settings, This device), to check the installed app on a real phone.
  window.harvestViewport={screen:screen.width+'×'+screen.height,window:window.innerWidth+'×'+window.innerHeight,fixed:fixed,statusBar:Math.round(bar),shortfall:own,strip:strip};
 }
 measure();
 document.addEventListener('DOMContentLoaded',measure);
 window.addEventListener('pageshow',measure);
 window.addEventListener('resize',function(){measure();setTimeout(measure,120);});
 window.addEventListener('orientationchange',measure);
})();
