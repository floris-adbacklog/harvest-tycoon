import {confirmAction} from './confirm-dialog.js';
import {art} from './visual-icons.js';
import {discordTicket} from './app-links.js';
// A farm from harvesttycoon.com in the Discord Activity (Oct 2026). Discord's rules allow no log-in of ours inside the Activity, so a
// player who taps "I already have a farm" there logs in on the website instead, through a link with a one-time ticket
// (www.harvesttycoon.com/discord-link?t=…: vercel.json and public/app-links.js bring it to the farm, src/main.js keeps it through the
// sign-in). Two parts of the farm page, both here:
// - On the website and in our apps, never on a portal: "Play this farm on Discord?" (createDiscordLinkDialog). It asks our server
//   (discord-auth, through src/main.js bridge.discordLink with this farmer's own session) who wants to play ({op:'peek'}: their Discord
//   name, only for this question). Link first gets a state from our server ({op:'begin'}, kept there with this farmer's account) and
//   goes to Discord with it (src/main.js bridge.discordVerify); Discord says who tapped it and comes back to this question with its
//   code and that state, in this tab or in a new one (Discord's app on a phone), which needs nothing else. Our server links the farm
//   only for the account that tapped Link and a code of the ticket's own Discord account ({op:'confirm'}), so a ticket's link sent to
//   someone else links nothing. The Activity's waiting card then opens the farm.
// - On the website and in our apps, for a farm Discord plays: "Played on Discord" in Settings › Privacy (createDiscordUnlink), the
//   farmer's way to see that link and end it ({op:'status'}, {op:'unlink'}).
// - In the Activity, for a farm made on Discord only: "Play your harvesttycoon.com farm here" in Settings, Your account
//   (createDiscordSwitch), where a portal guest's log-in button sits too: it is about which account plays. After a clear warning
//   it hands over to the page around the game (portal.linkExisting, src/discord-page.js), which opens the website the same way. Our
//   server deletes this Discord farm only once the farmer taps Link on the website, never before.

// The question on the website and its answers.
export const LINK_TEXT=Object.freeze({
 title:'Play this farm on Discord?',
 checking:'Checking the link…',
 // Link goes to Discord first (with prompt none: a player who allowed the game before may see Discord's page only for a moment).
 note:'Link takes you to Discord to confirm it is you. Only link your own Discord account.',
 // A ticket from Settings on a farm made on Discord: Link deletes that farm (discord-auth confirm), so the website says so too.
 relink:'Linking deletes the farm this Discord account plays now. This cannot be undone.',
 linking:'Linking…',
 done:'Done. Go back to Discord: your farm opens there.',
 gone:'This link has expired or was already used. Open it again from Discord.',
 // Back from Discord without a state our server gave (an address cut short or made up).
 unchecked:'This link could not be checked. Open it again from Discord.',
 // Back from Discord, signed in with another account on this browser than the one that tapped Link (discord-auth LINK_OTHER_ACCOUNT).
 // The dialog's Sign out keeps Discord's answer in this tab for that sign-in (src/main.js bridge.discordSignOut).
 otherAccount:'This link was started on another account. Sign in with that account, or open the link again from Discord.',
 // Discord said no (Cancel on its page), or its code could not be used: nothing was linked, and Link goes to Discord again.
 cancelled:'Discord did not confirm it is you, so nothing was linked. Tap Link to try again.',
 // Discord says another Discord account than the ticket's tapped Link (discord-auth DISCORD_MISMATCH). Link stays: Discord then shows
 // which account it uses, for a farmer signed in to discord.com with another account in this browser.
 mismatch:'This link belongs to another Discord account. Only link your own Discord account.',
 email:'Confirm your email address first (Settings, Email address), then open the link again.',
 portal:'Only a farm made on harvesttycoon.com can be played on Discord.',
 staff:'Staff accounts cannot be played on Discord.',
 farmTaken:'Another Discord account already plays this farm.',
 discordTaken:'This Discord account already plays another harvesttycoon.com farm.',
 session:'Your session has ended. Please sign in again.',
 away:'We could not connect. Please try again.',
 failed:'The link could not be made. Please try again.'
});
// Who asks, in the question: their Discord username (unique on Discord, so nobody can pose as another account; the page puts the @
// before it), or no name when the server has none.
export const linkQuestion=(who,farmer)=>who?`Discord user ${who} wants to play your farm ${farmer} in Discord.`:`Someone on Discord wants to play your farm ${farmer} in Discord.`;
// What discord-auth's refusal means for the farmer: its code first (LINK_ERRORS in supabase/functions/discord-auth/discord.js), then its
// status. retry: the same tap can still work (no connection, a busy server); the others stay as they are until something changes (a
// new link from Discord, a confirmed address).
export function linkProblem(error){
 const code=error?.code,status=Number(error?.status)||0;
 if(code==='TICKET_GONE'||status===410||status===404)return {text:LINK_TEXT.gone,retry:false};
 if(code==='EMAIL_UNCONFIRMED')return {text:LINK_TEXT.email,retry:false};
 if(code==='PORTAL_ACCOUNT')return {text:LINK_TEXT.portal,retry:false};
 if(code==='STAFF_ACCOUNT')return {text:LINK_TEXT.staff,retry:false};
 // Link again: maybe this browser is signed in to discord.com with another account (the dialog then lets Discord show which one).
 if(code==='DISCORD_MISMATCH')return {text:LINK_TEXT.mismatch,retry:true};
 if(code==='LINK_OTHER_ACCOUNT')return {text:LINK_TEXT.otherAccount,retry:false};
 if(code==='ALREADY_LINKED')return {text:LINK_TEXT.farmTaken,retry:false};
 if(code==='DISCORD_LINKED')return {text:LINK_TEXT.discordTaken,retry:false};
 if(code==='SIGN_IN'||status===401)return {text:LINK_TEXT.session,retry:false};
 if(error?.transient||status===429||status>=500)return {text:LINK_TEXT.away,retry:true};
 // The page around the game said no itself ("Your session is paused. Reconnect to continue."): its own words.
 if(!status&&typeof error?.message==='string'&&error.message)return {text:error.message,retry:true};
 return {text:LINK_TEXT.failed,retry:true};
}

// "Play this farm on Discord?" for one link at a time: the dialog of the other confirmations (confirm-dialog.js), which stays open
// from the question to its answer. request(op, {ticket, state, code}) is the page's way to discord-auth; verify(state, {again}) sends
// the page to Discord for Link with the state our server gave it ({op:'begin'}; again: Discord answered for another account before,
// so its page shows which account it uses this time); signOut({code, state, error}) signs this account out and keeps Discord's
// answer for the next sign-in in this tab; farmer() is the farmer name on this farm. open(ticket) asks about Discord's link;
// open(ticket, {code, state, error}) is the same question back from Discord (the link's intent, public/app-links.js), which goes by
// Discord's state alone: our server knows its ticket and the account that tapped Link, so any tab or browser will do.
// Resolves to {linked} once the dialog is closed.
export function createDiscordLinkDialog({request,verify,signOut,farmer=()=>'',doc=globalThis.document}){
 if(typeof request!=='function')return null;
 let current=null;
 function open(ticket,{code=null,state=null,error=null}={}){
  if(current)return current;
  current=new Promise(resolve=>{
   const back=Boolean(code||state||error),given=discordTicket(back?state:ticket),box=doc.createElement('dialog');
   // What names this link to our server: the ticket from Discord's link, or back from Discord its state (a state has a ticket's form).
   let named=given?(back?{state:given}:{ticket:given}):null;
   box.className='diamond-confirm sale-confirm discord-link-dialog';box.setAttribute('aria-labelledby','discord-link-title');box.setAttribute('aria-describedby','discord-link-copy');
   box.innerHTML=`<div class="diamond-confirm-art">${art('farm')}</div><h2 id="discord-link-title"></h2><p id="discord-link-copy"></p><p class="diamond-confirm-note" data-warning hidden></p><p class="diamond-confirm-note" data-note hidden></p><p class="discord-link-status" data-status role="status"></p><div class="diamond-confirm-actions"><button type="button" class="small-button" data-cancel autofocus></button><button type="button" class="primary-button confirm-spend" data-link hidden></button></div>`;
   const part=selector=>box.querySelector(selector),copy=part('#discord-link-copy'),warning=part('[data-warning]'),note=part('[data-note]'),status=part('[data-status]'),cancel=part('[data-cancel]'),link=part('[data-link]');
   part('h2').textContent=LINK_TEXT.title;warning.textContent=LINK_TEXT.relink;note.textContent=LINK_TEXT.note;cancel.textContent='Cancel';
   let step='peek',busy=false,linked=false,answer=back?{code}:null,away=false,again=false;
   const say=(text,kind='')=>{status.textContent=text;status.className=`discord-link-status${kind?` ${kind}`:''}`;};
   // Nothing left to do here: only Close.
   const closeOnly=()=>{warning.hidden=true;note.hidden=true;link.hidden=true;cancel.textContent='Close';};
   // Back from Discord to a link that is done (its state used, or past its time), or Link on one (another tab linked it from
   // Discord's answer, or this one did and the answer was lost on the way): this farm linked already (the browser's Back after Done
   // showed Discord's page again, which sent the farmer here once more) is Done, not an error. true when it was said here.
   async function settled(error,asked=back){
    if(!asked||linkProblem(error).text!==LINK_TEXT.gone)return false;
    closeOnly();copy.textContent=LINK_TEXT.checking;say('');
    let done=false;try{done=(await request('status'))?.linked===true;}catch{}
    linked||=done;copy.textContent=done?LINK_TEXT.done:LINK_TEXT.gone;
    return true;
   }
   // The question; true once it is on screen.
   async function peek(){
    step='peek';busy=true;link.hidden=true;copy.textContent=LINK_TEXT.checking;say('');
    try{const data=await request('peek',named),name=typeof data?.display_name==='string'?data.display_name.trim():'';ask(name?`@${name}`:'',data?.relink===true);return true;}
    catch(error){
     if(await settled(error))return false;
     const problem=linkProblem(error);copy.textContent=problem.text;if(problem.retry){link.textContent='Try again';link.hidden=false;link.disabled=false;}else{closeOnly();otherAccount(error);}return false;
    }
    finally{busy=false;}
   }
   // Signed in with another account than the one that tapped Link (LINK_OTHER_ACCOUNT, only ever by a state): Sign out, and the
   // sign-in in this tab brings the question back with Discord's answer, for the account that tapped Link.
   function otherAccount(error){
    if(error?.code!=='LINK_OTHER_ACCOUNT'||typeof signOut!=='function'||!named?.state)return;
    step='signout';link.textContent='Sign out';link.hidden=false;link.disabled=false;
   }
   function leave(){
    const kept={...(code?{code}:{}),state:named.state,...(error?{error}:{})};
    box.close();void Promise.resolve().then(()=>signOut(kept)).catch(()=>{});
   }
   // Back from Discord, once the question is on screen: its code links at once (the farmer tapped Link already); a no from Discord
   // says so and leaves Link to go again.
   async function start(){
    if(!await peek()||!answer)return;
    const given=answer.code;answer=null;
    if(given)await linkFarm(given);else say(LINK_TEXT.cancelled,'is-error');
   }
   function ask(who,relink){
    step='confirm';copy.textContent=linkQuestion(who,String(farmer()??'').trim());warning.hidden=!relink;note.hidden=false;
    link.textContent='Link';link.hidden=false;link.disabled=false;
   }
   // Link: our server gives it a state ({op:'begin'}), then the page leaves for Discord's own page, and Discord comes back with its
   // answer to this question, or to a new tab (Discord's app on a phone), which needs nothing from this one.
   async function toDiscord(){
    busy=true;link.disabled=true;cancel.disabled=true;say(LINK_TEXT.linking);
    try{
     if(typeof verify!=='function')throw new Error(LINK_TEXT.failed);
     const next=discordTicket((await request('begin',named))?.state);
     if(!next)throw new Error(LINK_TEXT.failed);
     // Begun from a state, the old one is done: a Link after this one goes with the new state.
     if(named.state)named={state:next};
     await verify(next,{again});away=true;
    }
    catch(error){
     // A link done already (another tab linked it from Discord's answer): whether this farm is linked decides, as back from Discord.
     if(await settled(error,true))return;
     const problem=linkProblem(error);say(problem.text,'is-error');if(problem.retry)link.disabled=false;else{closeOnly();otherAccount(error);}
    }
    finally{busy=false;cancel.disabled=false;}
   }
   async function linkFarm(discordCode){
    busy=true;link.disabled=true;cancel.disabled=true;say(LINK_TEXT.linking);
    try{await request('confirm',{...named,code:discordCode});linked=true;say(LINK_TEXT.done,'is-done');closeOnly();}
    catch(error){
     if(await settled(error))return;
     // A code Discord refused (used, or too old): as a no from Discord, and Link goes there again for a new one.
     const problem=Number(error?.status)===401&&!error?.code?{text:LINK_TEXT.cancelled,retry:true}:linkProblem(error);
     // Discord answered for another account than the ticket's: Link goes again, and Discord then shows which account it uses, with
     // its own way to switch (prompt consent), for a farmer signed in to discord.com with another account in this browser.
     if(error?.code==='DISCORD_MISMATCH')again=true;
     say(problem.text,'is-error');if(problem.retry)link.disabled=false;else{closeOnly();otherAccount(error);}
    }
    finally{busy=false;cancel.disabled=false;}
   }
   link.addEventListener('click',()=>{if(busy||link.disabled)return;if(step==='peek')void start();else if(step==='signout')leave();else void toDiscord();});
   // This page again after Link, still "Linking…": the browser's Back on Discord's page (the page as it was, from the back-forward
   // cache: heard on the page around the game too, the one that went to Discord), or Discord's app opened instead of its page and
   // the farmer came back to this tab. Link works again.
   const windows=[...new Set([doc.defaultView,doc.defaultView?.parent].filter(Boolean))];
   const returned=event=>{if(!away||busy||(event?.type==='pageshow'?!event.persisted:doc.visibilityState!=='visible'))return;away=false;link.disabled=false;say('');};
   for(const win of windows)try{win.addEventListener('pageshow',returned);}catch{}
   doc.addEventListener?.('visibilitychange',returned);
   cancel.addEventListener('click',()=>{if(!busy)box.close();});
   // Escape or a tap beside the dialog closes it too, but never while the server is still answering.
   box.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
   box.addEventListener('click',event=>{if(busy||event.target!==box)return;const r=box.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)box.close();});
   box.addEventListener('close',()=>{for(const win of windows)try{win.removeEventListener('pageshow',returned);}catch{}doc.removeEventListener?.('visibilitychange',returned);box.remove();current=null;resolve({linked});},{once:true});
   doc.body.append(box);box.showModal();
   // A link cut short or made up: the answer at once, nothing asked.
   if(named)void start();else{copy.textContent=back?LINK_TEXT.unchecked:LINK_TEXT.gone;closeOnly();}
  });
  return current;
 }
 return {open};
}

// Settings › Privacy on the website and in our apps (never on a portal: src/game-cloud.js): a farm that a Discord account plays says
// so here, with Unlink Discord, so a link made by mistake (or for someone who should not have it) never needs the farm deleted.
// request(op) is the page's way to discord-auth (src/main.js bridge.discordLink). Asked once a visit, when the farmer first opens
// Privacy (one call, not one per farm load); show() after a Link in this visit.
export const UNLINK_TEXT=Object.freeze({
 title:'Played on Discord',
 copy:'A Discord account plays this farm too.',
 button:'Unlink Discord',
 ask:'Unlink this farm from Discord?',
 warning:'Discord no longer opens this farm, and it is signed out on your other devices. You can link it again from Discord.',
 confirm:'Unlink',
 keep:'Keep it linked',
 done:'Discord no longer opens this farm.'
});
export function createDiscordUnlink({request,doc=globalThis.document,ask=confirmAction,Observer=globalThis.MutationObserver}){
 if(typeof request!=='function')return null;
 const section=doc.getElementById('privacy-settings');
 if(!section||doc.getElementById('discord-unlink'))return null;
 const row=doc.createElement('div');row.id='discord-unlink';row.className='discord-switch discord-unlink';row.hidden=true;
 row.innerHTML='<span><strong data-unlink-title></strong><small data-unlink-copy></small></span><button type="button" class="small-button" data-unlink></button><p class="cloud-form-error" role="alert" data-unlink-message></p>';
 const button=row.querySelector('[data-unlink]'),copy=row.querySelector('[data-unlink-copy]'),message=row.querySelector('[data-unlink-message]');
 row.querySelector('[data-unlink-title]').textContent=UNLINK_TEXT.title;copy.textContent=UNLINK_TEXT.copy;button.textContent=UNLINK_TEXT.button;
 const danger=doc.getElementById('delete-account-row');if(danger)danger.before(row);else section.append(row);
 function show(){copy.textContent=UNLINK_TEXT.copy;message.textContent='';button.hidden=false;row.hidden=false;}
 // No answer (no connection): asked again the next time Privacy opens.
 let asked=null;
 function check(){asked??=Promise.resolve().then(()=>request('status')).then(data=>{if(data?.linked===true)show();},()=>{asked=null;});return asked;}
 if(typeof Observer==='function')new Observer(()=>{if(section.classList.contains('is-open'))void check();}).observe(section,{attributes:true,attributeFilter:['class']});
 async function start(){
  if(button.disabled)return false;message.textContent='';
  if(!await ask({title:UNLINK_TEXT.ask,description:UNLINK_TEXT.warning,confirmLabel:UNLINK_TEXT.confirm,cancelLabel:UNLINK_TEXT.keep,picture:'farm',tone:'danger'}))return false;
  button.disabled=true;
  try{await request('unlink');copy.textContent=UNLINK_TEXT.done;button.hidden=true;return true;}
  catch(error){message.textContent=linkProblem(error).text;return false;}
  finally{button.disabled=false;}
 }
 button.addEventListener('click',()=>void start());
 return {row,check,show,start};
}

// The Activity's way to the farmer's harvesttycoon.com farm, for a farm made on Discord only.
export const SWITCH_TEXT=Object.freeze({
 title:'Play your harvesttycoon.com farm here',
 copy:'Already have a farm on harvesttycoon.com? Play that farm in Discord instead of this one.',
 button:'Link my farm',
 ask:'Play your harvesttycoon.com farm here?',
 failed:'We could not connect. Please try again.'
});
export const switchWarning=(farmer,level)=>`Your Discord farm ${farmer} (level ${level}) will be deleted and Discord opens your harvesttycoon.com farm instead. This cannot be undone.`;
// The farm's level as the top bar shows it now.
const shownLevel=doc=>{const n=Number.parseInt(String(doc.getElementById('level')?.textContent??'').replace(/\D/g,''),10);return Number.isSafeInteger(n)&&n>0?n:null;};
// Only in the Activity (portal 'discord') and only for an account made there (portal.discordOnly, src/discord-page.js, which also offers
// portal.linkExisting only then): a website farm played in Discord, the other portals and the website never get it. level() is the
// level to fall back on. linkExisting() answers {opened:true} once the website is open in Discord's window (the page then shows its
// waiting card), {opened:false} when the farmer said no there, and throws in the farmer's words when it could not start.
export function createDiscordSwitch({portal,farmer=()=>'',level=()=>null,doc=globalThis.document,ask=confirmAction}){
 if(portal?.name!=='discord'||portal.discordOnly!==true||typeof portal.linkExisting!=='function')return null;
 const account=doc.querySelector('.settings-account');
 if(!account||doc.getElementById('discord-switch'))return null;
 const row=doc.createElement('div');row.id='discord-switch';row.className='discord-switch';
 row.innerHTML='<span><strong data-switch-title></strong><small data-switch-copy></small></span><button type="button" class="small-button" data-switch></button><p class="cloud-form-error" role="alert" data-switch-message></p>';
 const button=row.querySelector('[data-switch]'),message=row.querySelector('[data-switch-message]');
 row.querySelector('[data-switch-title]').textContent=SWITCH_TEXT.title;row.querySelector('[data-switch-copy]').textContent=SWITCH_TEXT.copy;button.textContent=SWITCH_TEXT.button;
 account.append(row);
 async function start(){
  if(button.disabled)return false;message.textContent='';
  const name=String(farmer()??'').trim(),n=shownLevel(doc)??(Number(level())||1);
  if(!await ask({title:SWITCH_TEXT.ask,description:switchWarning(name,n),confirmLabel:'Continue',cancelLabel:'Keep this farm',picture:'farm',tone:'danger'}))return false;
  // Read again at the tap: the page around the game offers it only while this Discord farm is the one open.
  const linkExisting=portal.linkExisting;
  if(typeof linkExisting!=='function'){message.textContent=SWITCH_TEXT.failed;return false;}
  button.disabled=true;
  try{
   // {opened:false}: the farmer said no in Discord's own window, and the farm stays as it is.
   if((await linkExisting())?.opened===false)return false;
   // The page around the game takes over (its waiting card): Settings closes, so the farm is as it was if the farmer comes back.
   doc.getElementById('sound-dialog')?.close?.();
   return true;
  }
  catch(error){message.textContent=error?.message||SWITCH_TEXT.failed;return false;}
  finally{button.disabled=false;}
 }
 button.addEventListener('click',()=>void start());
 return {start,row};
}
