import {createConnection,connectionMessage,reasonOf,refused,WAKE_GRACE} from './connection.js';
// An open farm on a page around the game (Oct 2026): the game page (farm.html) in a frame, the farm from the server, the bridge the
// game talks through, and the connection that keeps it open through short problems. It is the website's own way of opening the farm
// (src/main.js openFarm, the bridge, checkSession and probeFarm), line for line, for the pages that open a farm without the sign-in
// card: public/crazygames.html (src/crazygames.js). tests/crazygames.test.mjs keeps the bridge the same as the website's, so a
// change to one shows up in the other. Everything that talks to the server comes in (deps), so this file runs in tests as it is.
// What differs per page comes in as hooks: what the loading screen says (phase), what happens when the sign-in has ended
// (signedOut) or the farm cannot be reached (unavailable), what the first load carries (firstLoad) and what the bridge gets on top
// (extend: the portal on CrazyGames).
export function createFarmSession({
 supabase,verifiedUser,farmRequest,fetchLeaderboard,createFarmPresence,createChatClient,createNotifications=null,paymentRequest=null,
 host,phase=()=>{},signedOut=()=>{},unavailable:showPause=()=>{},firstLoad=()=>null,opened=()=>{},extend=()=>{},
 track={},cloudError=error=>error?.message||'We could not connect. Please try again.',farmUrl='/farm.html',
 doc=globalThis.document,win=globalThis.window,nav=globalThis.navigator,timers=globalThis
}){
 const client=()=>typeof supabase==='function'?supabase():supabase;
 let presence=null,notifications=null,chat=null,generation=0,playerId=null,frame=null,checking=false,reopen=false;
 const watchers=new Set();
 // Short connection problems (a laptop waking up, a wifi hand-over, one slow answer) must not close the farm: see connection.js.
 const connection=createConnection({
  isOnline:()=>nav.onLine,isHidden:()=>doc.hidden,track:(event,params)=>track.game?.(event,params),probe:probeFarm,timers,
  onStatus:(next,{reason})=>{for(const watch of watchers)watch(next);if(next==='paused')unavailable(connectionMessage(reason,nav.onLine),{retrying:true});},
  onRecovered:from=>{if(from==='paused')openFarm();else void frame?.contentWindow?.harvestRefresh?.();}
 });
 function dispose(){presence?.dispose();presence=null;chat?.dispose();chat=null;watchers.clear();generation++;frame?.remove();frame=null;playerId=null;delete win.harvestBridge;host().replaceChildren();}
 function unavailable(message='Your farm is safe. Reconnect to continue.',{retrying=false}={}){dispose();showPause(message,{retrying});}
 async function openFarm(){
  if(checking){reopen=true;return;}checking=true;connection.stop();dispose();const ticket=generation;phase('checking','Checking your account…');
  try{
   if(!client())throw new Error('Account access is temporarily unavailable. Please try again later.');
   if(!nav.onLine)throw new Error('Connect to the internet to open your farm.');
   const user=await verifiedUser();if(ticket!==generation)return;
   if(!user){signedOut();return;}playerId=user.id;phase('checking','Opening your farm…');
   // The game page starts loading now, while the farm is on its way from the server (as on the website, 1 Oct 2026).
   let release,cancel;const ready=new Promise((resolve,reject)=>{release=resolve;cancel=reject;});ready.catch(()=>{});
   win.harvestBridge={pending:true,ready};const page=doc.createElement('iframe');page.title='Harvest Tycoon farm';page.src=farmUrl;host().append(page);
   const giveUp=error=>{cancel(error);page.remove();if(win.harvestBridge?.ready===ready)delete win.harvestBridge;};
   let initial;try{const extra=firstLoad();initial=await farmRequest({operation:'load',...(extra??{})});}catch(error){if(ticket!==generation)return;giveUp(error);throw error;}
   if(ticket!==generation)return;if(initial.profile?.player_id!==user.id){giveUp();reopen=true;return;}
   presence=createFarmPresence(client(),user.id);
   presence.setClock?.(initial.serverNow);
   const bridge={playerId,presence,serverNow:initial.serverNow,takeInitial(){const data=initial;initial=null;return data;},signOut:()=>signedOut(),async leaderboard(category='level'){if(ticket!==generation)throw new Error('Your session has ended.');const result=await fetchLeaderboard(client(),user.id,category);if(ticket!==generation)throw new Error('Your session has ended.');presence?.setRows?.(result.rows);return {...result,...presence?.snapshot()};},async request(body){
    if(ticket!==generation||!nav.onLine)throw new Error('Your session is paused. Reconnect to continue.');
    try{const data=await farmRequest(body);if(ticket!==generation||data.profile?.player_id!==user.id)throw new Error('Your session has ended.');connection.ok();return data;}
    catch(error){
     if(ticket===generation&&error.code!=='ACTION_REJECTED'&&error.status!==400){
      if(error.status===401)signedOut('Your session has ended.');
      else if(error.status===409)unavailable(error.message);
      // A failed request never closes the farm by itself: the connection shows "Reconnecting…", checks again and only after a minute pauses.
      // A refusal (4xx) is an answer, not a connection problem: the screen shows its reason. 408 and 425 do mean "try again".
      else if(!refused(error.status)&&!['player_search','player_profile','avatar'].includes(body.operation))connection.problem(reasonOf(error,nav.onLine));
     }
     throw error;
    }
   },watchConnection(watch){watchers.add(watch);return()=>watchers.delete(watch);}};
   // The chat window and the notifications (src/chat-client.js): straight to the database, live through Realtime.
   chat?.dispose();chat=bridge.chat=createChatClient(client(),{playerId:user.id,alive:()=>ticket===generation});
   notifications=bridge.notifications=createNotifications?createNotifications(client()):null;
   void notifications?.ready?.then?.(()=>notifications?.push?.sync?.());
   bridge.trackCommerce=(event,params)=>{if(ticket===generation)track.commerce?.(event,params);};
   bridge.trackGame=(event,params)=>{if(ticket===generation)track.game?.(event,params);};
   bridge.trackInvite=event=>{if(ticket===generation)track.invite?.(event);};
   bridge.trackShare=(event,params)=>{if(ticket===generation)track.share?.(event,params);};
   // The admin view's topbar (3 Oct 2026, src/admin-view.js): how many farmers were active in the last 30 minutes, one count straight from
   // the database (the leaderboard's own table and rule), no Edge Function. On the server's clock (the load's serverNow), as the dashboard's
   // Online now counts.
   const skew=Number.isFinite(bridge.serverNow)?bridge.serverNow-Date.now():0;
   bridge.onlineCount=async()=>{if(ticket!==generation)throw new Error('Your session has ended.');const at=Date.now()+skew,{count,error}=await client().from('player_stats').select('player_id',{count:'exact',head:true}).gte('last_active_at',new Date(at-30*60000).toISOString()).lte('last_active_at',new Date(at+60000).toISOString());if(error)throw error;return Number.isSafeInteger(count)?count:NaN;};
   // Payments only where the page has them (the website); elsewhere the shop never offers them, and asking says so.
   const noPayments=()=>{throw new Error('Purchases are not available here.');};
   bridge.payments=async body=>{if(ticket!==generation)throw new Error('Your session has ended.');if(!paymentRequest)noPayments();const data=await paymentRequest(body);if(ticket!==generation)throw new Error('Your session has ended.');return data;};
   bridge.checkout=async(pack,requestId,offerId)=>{if(!paymentRequest)noPayments();bridge.trackCommerce('diamond_pack_started',{pack});const data=await bridge.payments({operation:'create',pack,requestId,...(offerId?{offerId}:{})});const url=new URL(data.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw new Error('Invalid checkout destination.');win.location.assign(url.href);};
   bridge.paymentReturn=()=>{const params=new URLSearchParams(win.location.search);return {id:params.get('purchase'),cancelled:params.get('checkout')==='cancelled'};};
   bridge.clearPaymentReturn=()=>{const url=new URL(win.location.href);url.searchParams.delete('purchase');url.searchParams.delete('checkout');win.history.replaceState(null,'',url.pathname+url.search+url.hash);};
   // World II: travelling between the farm and the village loads the game frame again, through its loading screen, with the farm as it is now.
   bridge.travel=async to=>{if(ticket!==generation)return;const data=await farmRequest({operation:'load'});if(ticket!==generation)return;initial=data;frame.src=to==='village'?`${farmUrl}?world=village`:farmUrl;};
   extend(bridge,{alive:()=>ticket===generation,user});
   win.harvestBridge=bridge;frame=page;release(bridge);phase('authenticated');
   opened(bridge,user);
  }catch(error){if(ticket===generation){
   if(error.status===401){signedOut('Your session has ended.');}
   // The farm could not be reached (a request that was already repeated a few times, or no network at all): the pause screen, which keeps trying by itself.
   else if(error.transient||nav.onLine===false)connection.pause(reasonOf(error,nav.onLine));
   else unavailable(cloudError(error));
  }}
  finally{checking=false;if(reopen){reopen=false;queueMicrotask(openFarm);}}
 }
 // Asking the server for the farm is the check: it verifies the sign-in itself (a 401 ends the session in bridge.request).
 async function checkSession(){
  if(!frame||checking||doc.hidden||connection.status!=='ok')return;
  const ticket=generation;
  try{if(frame.contentWindow.harvestRefresh)await frame.contentWindow.harvestRefresh();else await win.harvestBridge.request({operation:'load'});}
  catch{if(ticket!==generation)return;}
 }
 // The connection behind a paused or reconnecting farm: ask the server, without opening or refreshing anything yet.
 async function probeFarm(){
  if(!frame){
   const user=await verifiedUser();
   if(!user){signedOut('Please sign in to continue.');throw Object.assign(new Error('Signed out'),{fatal:true});}
  }
  await farmRequest({operation:'load'},{retry:false});
 }
 // "offline" flickers (a wifi hand-over, a laptop waking up): only a farm that stays unreachable pauses, see connection.js.
 // reopen: what opens the farm again after the pause screen (the page's own start when it has more to do than open the farm).
 function listen({reopen=openFarm}={}){
  win.addEventListener('offline',()=>{if(frame)connection.offline();});
  win.addEventListener('online',()=>{connection.online();if(doc.body.dataset.phase==='error'&&connection.status==='ok')timers.setTimeout(reopen,WAKE_GRACE);});
  // Waking up (a laptop lid, a phone) or switching back to the tab: the network needs a moment, so the check waits a little.
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden)return;if(connection.status==='ok')timers.setTimeout(checkSession,WAKE_GRACE);else connection.wake();});timers.setInterval(checkSession,60000);
 }
 return {open:openFarm,dispose:()=>{connection.stop();dispose();},unavailable,checkSession,probe:probeFarm,listen,connection,get frame(){return frame;},get playerId(){return playerId;},get checking(){return checking;}};
}
