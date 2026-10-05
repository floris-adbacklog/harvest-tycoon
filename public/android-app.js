// The Android app (Oct 2026): the same game on Google Play, in a WebView wrapper (WebViewGold). The app keeps the WebView's own user
// agent and adds " HarvestTycoonApp/1.0" to it, and starts at /?src=android-app. ?app=android in the address is the fallback: once is
// enough, this device remembers it (the app's WebView keeps storage of its own, so a phone's browser never gets it; ?app=web forgets it
// again, for testing in a browser). The page is then marked <html data-app="android"> before anything is drawn, here and in the game
// frame, and the code asks public/android.js. What a Play app may not have or cannot do steps aside there (public/android.css): our own
// purchases (Google Play's rules), installing the web app and full screen, Google and Facebook sign-in (both refuse a WebView) and the tip
// to open the game in Chrome. Notifications are the app's own instead of the browser's (src/app-push.js). Never inside CrazyGames' page (html[data-portal]), and in a browser nothing happens.
(function(){
 var KEY='harvest-tycoon:app',html=document.documentElement;
 // The rule, on its own for the tests: ua is the user agent, search the address's ?…, saved what this device remembers. app: this is
 // the Android app; remember: 'android' to remember, 'web' to forget, null to leave as it is.
 function androidApp(ua,search,saved){
  var asked=/[?&]app=(android|web)(&|$)/.exec(search||''),want=asked?asked[1]:null;
  return {app:/HarvestTycoonApp\//.test(ua||'')||want==='android'||(want!=='web'&&saved==='android'),remember:want};
 }
 window.harvestAndroidApp=androidApp;
 // Our iPhone app (Oct 2026, WebViewGold for iOS): the same " HarvestTycoonApp/1.0" on an iPhone's own user agent, so it is the app as
 // above (no purchases of our own, from 1.1 the App Store's, below; no install, its own notifications), and the page is also marked
 // <html data-app-os="ios">: there it has no Tag Manager and no cookie banner at all (the owner's choice for the App Store, 3 Oct 2026;
 // the app blocks the trackers too).
 function iosApp(ua){return /HarvestTycoonApp\//.test(ua||'')&&/iPhone|iPad|iPod|Macintosh/.test(ua||'');}
 window.harvestIosApp=iosApp;
 function playApp(ua){return /HarvestTycoonApp\//.test(ua||'')&&/ PlayBilling\/\d/.test(ua||'')&&!iosApp(ua);}
 window.harvestPlayApp=playApp;
 // The iPhone app 1.1 (Oct 2026) sells through the App Store: " AppStoreBilling/1" after its own token (ios-app HarvestApp.swift
 // userAgentToken; public/android.js appStoreBilling). Never the Android app, never a browser.
 function appStoreApp(ua){return iosApp(ua)&&/ AppStoreBilling\/\d/.test(ua||'');}
 window.harvestAppStoreApp=appStoreApp;
 var parent=null;try{if(window.parent!==window)parent=window.parent.document.documentElement;}catch(e){}
 if(html.hasAttribute('data-portal')||(parent&&parent.hasAttribute('data-portal')))return;
 var saved=null;try{saved=localStorage.getItem(KEY);}catch(e){}
 var found=androidApp(navigator.userAgent,location.search,saved);
 try{if(found.remember==='android')localStorage.setItem(KEY,'android');else if(found.remember==='web')localStorage.removeItem(KEY);}catch(e){}
 // The game frame follows the page around it (its own address never carries ?app=).
 if(found.app||(parent&&parent.getAttribute('data-app')==='android'))html.setAttribute('data-app','android');
 if(iosApp(navigator.userAgent)||(parent&&parent.getAttribute('data-app-os')==='ios'))html.setAttribute('data-app-os','ios');
 // The Android app 1.1 (Oct 2026) sells through Google Play: " PlayBilling/1" in its user agent (public/android.js playBilling). Never
 // the iPhone app, never a browser with ?app=android only.
 if(html.getAttribute('data-app')==='android'&&html.getAttribute('data-app-os')!=='ios'&&(playApp(navigator.userAgent)||(parent&&parent.hasAttribute('data-play-billing'))))html.setAttribute('data-play-billing','');
 // The iPhone app 1.1 the same way through the App Store (<html data-app-store-billing>), the game frame following the page around it.
 if(html.getAttribute('data-app')==='android'&&html.getAttribute('data-app-os')==='ios'&&(appStoreApp(navigator.userAgent)||(parent&&parent.hasAttribute('data-app-store-billing'))))html.setAttribute('data-app-store-billing','');
 // Either store: <html data-app-billing>, the one mark the shop's hide rules ask (public/android.css).
 if(html.hasAttribute('data-play-billing')||html.hasAttribute('data-app-store-billing'))html.setAttribute('data-app-billing','');
})();
