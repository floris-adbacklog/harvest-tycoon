// A link to one spot in the farm wiki (Oct 2026): the same address in How to play's "Copy link", on the website and in the chat.
//   https://www.harvesttycoon.com/wiki/<topic>#<section>
// <topic> is a topic id (wiki-content.js WIKI_TOPICS; a test keeps WIKI_TOPIC_IDS equal to it) and <section> the id of a spot on that
// page: a section (sec-planting), a building row (building-farmhouse), a crop in Every crop (crop-wheat) or a level in What opens when
// (level-30). The website serves that page (scripts/build-wiki.mjs; /wiki/<topic> is /wiki/<topic>.html) and How to play opens the same
// spot: renderWiki(state, topic, section) in public/wiki-ui.js scrolls to it and lights it up for a moment.
// No imports, so the page around the game (src/, the chat) can use it without loading the wiki.
export const WIKI_SITE='https://www.harvesttycoon.com';
export const WIKI_TOPIC_IDS=Object.freeze(['getting-started','crops','buildings','market','quests','daily','family','events','helpers','village','estate','diamonds','chat','account']);
const TOPIC=new Set(WIKI_TOPIC_IDS),SECTION=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// The canonical link of a topic, or of a spot on it.
export const wikiLink=(topic,section='')=>`${WIKI_SITE}/wiki/${topic}${section?`#${section}`:''}`;
// {topic, section} for a link to a wiki topic ('' when it names no spot), else null. Only our own site (with or without www, https; a
// link typed without https:// counts too), a known topic and a plain section id; a query (?fbclid=…) is left out. The wiki's home
// (/wiki) is no topic: null.
export function parseWikiLink(url){
 const text=String(url??'').trim();if(!text||text.length>300||/\s/.test(text))return null;
 let link;try{link=new URL(/^[a-z][a-z0-9+.-]*:/i.test(text)?text:`https://${text}`);}catch{return null;}
 if(link.protocol!=='https:'||!/^(www\.)?harvesttycoon\.com$/.test(link.hostname)||link.port||link.username||link.password)return null;
 const [,topic]=link.pathname.match(/^\/wiki\/([a-z-]+)\/?$/)??[];if(!TOPIC.has(topic))return null;
 const section=link.hash.slice(1);if(section&&!SECTION.test(section))return null;
 return {topic,section};
}
// Every wiki link in a text (a chat message), in order: {url, topic, section, index}. What counts is what parseWikiLink takes.
// A link starts a word (Oct 2026 review): never the tail of another address, so notharvesttycoon.com/wiki/crops or
// evil.com/?r=harvesttycoon.com/wiki/crops is no wiki link. A group, not a lookbehind: older iPhones cannot read a lookbehind, and
// this file is loaded with the wiki.
export function wikiLinksIn(text){
 const found=[];
 for(const m of String(text??'').matchAll(/(^|[^\p{L}\p{N}_.@/:%?#=&+~-])((?:https?:\/\/)?(?:www\.)?harvesttycoon\.com\/wiki\/[^\s<>"']*)/giu)){const url=m[2].replace(/[.,!?;:)]+$/,''),hit=parseWikiLink(url);if(hit)found.push({url,...hit,index:m.index+m[1].length});}
 return found;
}
// The small link picture beside every heading (How to play and the website): two chain links, in the text colour.
export const WIKI_COPY_ICON='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
