// The game page's side of Discord's Embedded App SDK (Oct 2026). Discord shows the game as an Activity: a frame on
// https://<client id>.discordsays.com/, Discord's own proxy, whose root (URL Mappings: / -> www.harvesttycoon.com) is our website. A
// visit to / that carries Discord's frame_id is sent on to /discord.html by vercel.json (a redirect, so Discord stays this page's
// referrer: the SDK answers Discord through document.referrer, and a page moved by script would lose it). The SDK comes with the page's
// own bundle (src/discord.js, @discord/embedded-app-sdk from npm): Discord's frame runs no script from another address.
// Who plays is Discord's to say: authorize gives a one-time code for the 'identify' scope, and only our server (the Edge Function
// discord-auth) trades it with Discord for the player's user id. The page never sees the id, the name or a Discord token.
import {PRIVACY_URL} from '../public/portal.js';
// The application's id is the first part of Discord's address for it (<client id>.discordsays.com): one page for every Discord app of
// ours (the live one, a test one), and no id built into the game.
const CLIENT_HOST=/^(\d{17,20})\.discordsays\.com$/;
export const clientIdOf=hostname=>CLIENT_HOST.exec(String(hostname??'').toLowerCase())?.[1]??null;
// Inside Discord: Discord's address and its frame_id in this page's address (never "in a frame", which our own pages are too).
export const inDiscord=({search='',hostname=''}={})=>Boolean(new URLSearchParams(search||'').get('frame_id'))&&Boolean(clientIdOf(hostname));
// The one thing asked of Discord: who the player is. No guilds, no email, no voice.
export const SCOPE=Object.freeze(['identify']);
// A farm the player already has on harvesttycoon.com (Oct 2026): Discord's rules allow no log-in of ours inside the Activity, so the
// player logs in on the website, on this page (vercel.json sends it on to the game, which asks there "Play this farm on Discord?").
// The ticket in its address is our server's (discord-auth): 32 random bytes in base64url, good once and for 10 minutes. Anything that
// is not one never goes into an address.
export const LINK_PAGE='https://www.harvesttycoon.com/discord-link';
export const validTicket=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{32,128}$/.test(value)?value:null;
export const linkPageUrl=ticket=>`${LINK_PAGE}?t=${encodeURIComponent(ticket)}`;

// The link from this page. Nothing is made outside Discord (the SDK needs Discord's frame_id). authorize() answers {code} when the
// player allowed it, or {code:null, reason}: 'declined' when Discord's window was closed or refused, 'unready' when Discord did not
// answer within `wait` ms. The player is the same for the whole launch, so nothing is watched for a change of player.
export function createDiscordLink({win=globalThis.window,SDK,wait=15000,timers=globalThis}={}){
 const clientId=clientIdOf(win?.location?.hostname);
 let sdk=null,ready=false,readying=null,first=null;
 function connect(){
  if(!sdk){
   if(!SDK||!inDiscord(win?.location??{}))return Promise.resolve(false);
   // Game logs stay in the game: by default the SDK sends every console line to Discord.
   try{sdk=new SDK(clientId,{disableConsoleLogOverride:true});}catch{sdk=null;return Promise.resolve(false);}
   readying=Promise.resolve().then(()=>sdk.ready()).then(()=>{ready=true;},()=>{});
  }
  if(ready)return Promise.resolve(true);
  return new Promise(resolve=>{const timer=timers.setTimeout(()=>resolve(false),wait);readying.then(()=>{timers.clearTimeout(timer);resolve(ready);});});
 }
 async function authorize(){
  if(!await connect())return {code:null,reason:'unready'};
  try{
   const answer=await sdk.commands.authorize({client_id:clientId,response_type:'code',state:'',prompt:'none',scope:[...SCOPE]});
   return typeof answer?.code==='string'&&answer.code?{code:answer.code}:{code:null,reason:'declined'};
  }catch{return {code:null,reason:'declined'};}
 }
 return {
  // The first answer, once per page load; every start after it asks again with authorize() (a code is good for one sign-in).
  hello:()=>first??=authorize(),
  // Again: for a new start (the player said yes before, so Discord opens no window), or from the player's tap after a no.
  authorize,
  get ready(){return ready;},
  // The privacy policy, the one link out, in Discord's own window (Discord asks the player before it opens a site). false: not
  // handed over (another address, or no Discord here): the page's own link does what a link does.
  openLink(url){
   if(url!==PRIVACY_URL||!sdk)return false;
   void connect().then(on=>on?sdk.commands.openExternalLink({url}):null).catch(()=>{});
   return true;
  },
  // The website's link page with this ticket (and nothing else), in Discord's own window. {opened:true} when Discord opened it (an
  // older Discord says nothing: opened too), {opened:false, reason}: 'declined' when the player said no in Discord's window,
  // 'unready' when Discord is not there or could not open it.
  async openLinkPage(ticket){
   const valid=validTicket(ticket);
   if(!valid||!await connect())return {opened:false,reason:'unready'};
   try{const answer=await sdk.commands.openExternalLink({url:linkPageUrl(valid)});return answer?.opened===false?{opened:false,reason:'declined'}:{opened:true};}
   catch{return {opened:false,reason:'unready'};}
  }
 };
}
// A stand-in when this page is opened on a computer of our own (http://localhost:…/discord.html), to look at the page: the Authorize
// card, or with ?discord_code=… a start with that code (our server refuses a made-up one: the pause card). Links open as links, the
// website's link page in a new tab.
export function localStandIn({search=globalThis.location?.search??'',win=globalThis.window}={}){
 const code=new URLSearchParams(search||'').get('discord_code');
 const answer=async()=>code?{code}:{code:null,reason:'declined'};
 return {hello:answer,authorize:answer,ready:false,openLink:()=>false,
  async openLinkPage(ticket){const valid=validTicket(ticket);if(!valid)return {opened:false,reason:'unready'};win?.open?.(linkPageUrl(valid),'_blank','noopener');return {opened:true};}};
}
