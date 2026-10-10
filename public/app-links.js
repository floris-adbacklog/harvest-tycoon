// Links that open one screen of the game: a notification (sw.js), a shortcut on the app icon (manifest.webmanifest) or ?open= in the
// address. Only these screens, and a chat only by a channel the chat itself knows (global, a family, a private chat, or the
// Notifications tab: an in-game purchase for the admin; the staff's Crew, supabase/chat-crew-push.sql). Settings (4 Oct 2026) at one
// part only by a slug of public/game-links.js (/settings/<part> on the website comes here as ?open=settings&part=<part>, vercel.json).
import {settingsPart} from './game-links.js';
// The Feedback window (6 Oct 2026, /feedback on the website: vercel.json). Discord (Oct 2026): /discord-link?t=<ticket> on the
// website comes here as ?open=discord-link&t=<ticket> (vercel.json): a Discord player asks to play this farm in the Discord Activity,
// and the farm asks its farmer (public/discord-link-ui.js). After Link, Discord's own page sends the farmer back to
// /discord-link/callback?code=…&state=… (or ?error=…), which comes here as ?open=discord-link&code=…&state=…: the same question,
// now with Discord's answer.
export const OPEN_SCREENS=Object.freeze(['chat','today','leaderboard','farm','settings','feedback','discord-link']);
const CHANNEL=/^(global|notices|crew|family:[0-9a-f-]{36}|dm:[0-9a-f-]{36}:[0-9a-f-]{36})$/;
// The Discord link's ticket as the server makes it (supabase/functions/discord-auth): 32 random bytes in base64url. The same rule as
// the Activity's (src/discord-link.js validTicket), so a ticket one side sends the other side takes.
export const discordTicket=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{32,128}$/.test(value)?value:null;
// Link on the website first asks Discord who taps it (Oct 2026): Discord's own page for our Discord app (the Activity's; its id is
// public, it is in every Activity's address), the identify scope only, prompt none (a player who allowed the game before is not asked
// again), back to /discord-link/callback (registered for the app under OAuth2, Redirects; discord-auth swaps the code with exactly
// this address). state: the one our server gave this Link (discord-auth begin, bound to the farmer's account), never the ticket.
// again: Link after Discord answered for another account than the ticket's (prompt consent), so Discord shows which account it uses
// and lets the player switch.
export const DISCORD_CLIENT_ID='1558371264882540605';
export const DISCORD_CALLBACK='https://www.harvesttycoon.com/discord-link/callback';
export const discordAuthorizeUrl=(state,again=false)=>`https://discord.com/oauth2/authorize?${new URLSearchParams({client_id:DISCORD_CLIENT_ID,response_type:'code',scope:'identify',prompt:again===true?'consent':'none',redirect_uri:DISCORD_CALLBACK,state})}`;
// Discord's answer as it comes back: its code (visible characters, as discord-auth takes it), the state our server gave Link (a
// ticket's form), or its error (access_denied: the farmer said no). Anything else is left out. Never a ticket: code and state are all
// the farm needs, in this tab or in the new one Discord's app may open.
const DISCORD_BACK=[['code',/^[\x21-\x7e]{1,256}$/],['state',/^[A-Za-z0-9_-]{32,128}$/],['error',/^[a-z_]{1,40}$/]];
export function discordBack(params){
 const back={};
 for(const [key,rule] of DISCORD_BACK){const value=params?.get?.(key);if(typeof value==='string'&&rule.test(value))back[key]=value;}
 return back;
}
export function openIntent(search){
 let params;try{params=new URLSearchParams(search??'');}catch{return null;}
 const open=params.get('open');if(!OPEN_SCREENS.includes(open))return null;
 const channel=params.get('channel');
 if(open==='settings'){const part=params.get('part');return settingsPart(part)?{open,part}:{open};}
 // A link without a ticket that can be one (cut short when it was copied) still opens: the farm says the link no longer works.
 // Discord's answer after Link: only that (a t beside it is not the farmer's ticket).
 if(open==='discord-link')return discordIntent(params);
 return open==='chat'&&channel&&CHANNEL.test(channel)?{open,channel}:{open};
}
function discordIntent(params){
 const back=discordBack(params);if(Object.keys(back).length)return {open:'discord-link',...back};
 const t=discordTicket(params.get('t'));return t?{open:'discord-link',t}:{open:'discord-link'};
}
// A link the installed app catches in a window that is open already (manifest launch_handler focus-existing: launchQueue's targetURL;
// sw.js's message): the address as it was tapped, before vercel.json's redirects made it ?open=…, so /feedback, /settings/<part>,
// /discord-link?t=… and /discord-link/callback?code=… are read here as the same intents.
const SETTINGS_PATH=/^\/settings(?:\/([a-z-]+))?\/?$/;
export function openIntentOfUrl(href,base){
 let url;try{url=new URL(href,base);}catch{return null;}
 const path=url.pathname,settings=SETTINGS_PATH.exec(path);
 if(path==='/feedback'||path==='/feedback/')return {open:'feedback'};
 if(/^\/discord-link(\/callback)?\/?$/.test(path))return discordIntent(url.searchParams);
 if(settings)return settings[1]===undefined?{open:'settings'}:settingsPart(settings[1])?{open:'settings',part:settings[1]}:null;
 return openIntent(url.search);
}
// The address without the link's own part, so a reload does not open the screen again. The Discord link's ticket and Discord's
// answer go too, so they are never shared along with the address by accident.
const DISCORD_PARTS=['t','code','state','error','error_description'];
export function withoutOpen(href){const url=new URL(href);if(url.searchParams.get('open')==='discord-link')for(const key of DISCORD_PARTS)url.searchParams.delete(key);url.searchParams.delete('open');url.searchParams.delete('channel');url.searchParams.delete('part');return url.pathname+url.search+url.hash;}
