// A chat message as a push (3 Oct 2026): a private message, the Crew, or a mention in Global or Family (supabase/chat-mentions.sql: a
// mention reaches a farmer like a private message, through the same switch). The title is in each farmer's own game language ("Bram
// mentioned you", "Bericht van Bram"; it was always the English "Message from Bram"), so the farmers one message reaches are grouped
// by language; the text is the writer's own words, as written. Tapping it opens that chat (public/app-links.js). Pure, so the tests can
// run it.
import {textsFor} from './texts.js';

// claim: what chat_push_claim handed out ({kind, senderName, body, channel, subscriptions}); players: the farmers it was handed to;
// languages: player id → game language (player_seen). One push per language: its words, the browsers to send it to (each subscription
// names its farmer since 3 Oct 2026; an older answer without that goes to its one farmer, else in English) and the farmers for the app.
export function messagePushes(claim,players=[],languages=new Map()){
 const mention=claim?.kind==='mention',name=String(claim?.senderName??''),channel=String(claim?.channel??''),ids=[...new Set((players??[]).map(String))];
 const groups=new Map();
 const group=language=>{
  const t=textsFor(language);
  if(!groups.has(t.language))groups.set(t.language,{language:t.language,title:mention?t.pushMention(name):t.pushMessage(name),body:String(claim?.body??''),tag:`chat-${channel}`,url:`/?open=chat&channel=${encodeURIComponent(channel)}`,players:[],subscriptions:[]});
  return groups.get(t.language);
 };
 for(const id of ids)group(languages.get(id)).players.push(id);
 for(const sub of claim?.subscriptions??[]){const who=sub?.player?String(sub.player):ids.length===1?ids[0]:null;group(who?languages.get(who):null).subscriptions.push({endpoint:sub.endpoint,p256dh:sub.p256dh,auth:sub.auth});}
 return [...groups.values()];
}
