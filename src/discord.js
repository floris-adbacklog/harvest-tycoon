import {DiscordSDK} from '@discord/embedded-app-sdk';
import {supabase,portalClient,useClient,supabaseKey,functionsUrl,isConfigured,verifiedUser,farmRequest,cloudError} from './supabase.js';
import {createFarmSession} from './farm-session.js';
import {createFarmPresence} from './presence.js';
import {fetchLeaderboard} from './leaderboard.js';
import {createChatClient} from './chat-client.js';
import {createDiscordLink,localStandIn,inDiscord} from './discord-link.js';
import {runDiscordPage} from './discord-page.js';
import {isLocalHost} from './crazygames-link.js';
import {stopPageZoom} from './page-zoom.js';
import {startUpdateCheck} from './app-update.js';
import {startTranslation,chooseLanguage,chosenLanguage} from '../public/i18n.js';
import {startLoadingTips,farmHandOver} from '../public/loading-screen.js';
// Harvest Tycoon on Discord (Oct 2026): public/discord.html, shown by Discord as an Activity on <client id>.discordsays.com, with
// Discord's Embedded App SDK in this bundle (src/discord-link.js). What the page does is src/discord-page.js; this file hands it the real
// things it talks to: Discord's SDK, our Supabase project (through Discord's proxy: scripts/build-cloud.mjs), the farm session, the
// translation and the loading screen.
const discord=inDiscord(location),local=isLocalHost(location.hostname);
// Opened on its own on our own address: this page is for Discord only, so the visitor goes to the website. Never inside Discord, where
// the page must stay where Discord put it.
if(!discord&&!local)location.replace('/');
else void runDiscordPage({
 link:discord?createDiscordLink({win:window,SDK:DiscordSDK}):localStandIn({search:location.search}),
 portalClient,setClient:useClient,functionsUrl,supabaseKey,isConfigured,createFarmSession,cloudError,
 sessionDeps:{supabase:()=>supabase,verifiedUser,farmRequest,fetchLeaderboard,createFarmPresence,createChatClient},
 startTranslation,chooseLanguage,chosenLanguage,startUpdateCheck,startLoadingTips,farmHandOver,stopPageZoom
});
