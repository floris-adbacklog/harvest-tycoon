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
 function measure(){
  var landscape=window.innerWidth>window.innerHeight,screenLong=Math.max(screen.width,screen.height),screenShort=Math.min(screen.width,screen.height);
  var gap=Math.round((landscape?screenShort:screenLong)-window.innerHeight),bar=statusBar();
  // Only a gap that is exactly the status bar counts: a split-screen window or a page below an opaque status bar is not this quirk.
  html.style.setProperty('--viewport-shortfall',(bar>0&&gap>0&&Math.abs(gap-bar)<=2?gap:0)+'px');
 }
 measure();
 document.addEventListener('DOMContentLoaded',measure);
 window.addEventListener('pageshow',measure);
 window.addEventListener('resize',measure);
 window.addEventListener('orientationchange',measure);
})();
