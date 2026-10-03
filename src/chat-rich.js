// What a chat message holds besides plain words (3 Oct 2026). Links to our own wiki, the only links the chat lets through (at most 2 in
// one message, the same rule as supabase/chat-wiki-links.sql): a chip with the book and the section's title, which opens How to play
// there. Mentions: "@Full Name" of a farmer picked from the list under the box, kept with the farmer's id (supabase/chat-mentions.sql),
// so the chip opens the right profile also after a rename. Pure, so the tests can run it: src/chat-ui.js draws the parts.
import {parseWikiLink,wikiArticle} from '../public/wiki-content.js';

export const MAX_WIKI_LINKS=2,MAX_MENTIONS=3;
// The address the database lets through, standing on its own (the start, a space or a bracket before it; the end, a space, a bracket or
// a stop after it), with or without https:// and www.: the wiki's first page, a topic, a section.
export const WIKI_LINK=/(^|[\s(])((?:https?:\/\/)?(?:www\.)?harvesttycoon\.com\/wiki(?:\/[a-z-]+)?\/?(?:#[a-z0-9-]+)?)(?=$|[\s).,!?;:])/gi;

// The message as parts, in order: {text}, {wiki:{topic,anchor,url}} and {mention:{id,name}}. A mention counts where its "@Full Name" is
// still in the words (a moderator's edit may have taken it out); the longest name first, so "@Ann Lee" is never read as "@Ann".
export function chatParts(body,mentions=[]){
 const text=String(body??''),marks=[],free=(at,end)=>!marks.some(x=>at<x.end&&end>x.at);
 for(const m of text.matchAll(WIKI_LINK)){const link=parseWikiLink(m[2]);if(link)marks.push({at:m.index+m[1].length,end:m.index+m[0].length,wiki:{...link,url:m[2]}});}
 const named=(Array.isArray(mentions)?mentions:[]).filter(x=>x?.id&&typeof x.name==='string'&&x.name).sort((a,b)=>b.name.length-a.name.length);
 for(const who of named){const tag=`@${who.name}`;for(let at=text.indexOf(tag);at>=0;at=text.indexOf(tag,at+tag.length))if(free(at,at+tag.length))marks.push({at,end:at+tag.length,mention:{id:String(who.id),name:who.name}});}
 marks.sort((a,b)=>a.at-b.at);
 const parts=[];let from=0;
 for(const x of marks){if(x.at>from)parts.push({text:text.slice(from,x.at)});parts.push(x.wiki?{wiki:x.wiki}:{mention:x.mention});from=x.end;}
 if(from<text.length||!parts.length)parts.push({text:text.slice(from)});
 return parts;
}
// Does this message mention me? (Never my own message.)
export const mentionsOf=m=>Array.isArray(m?.meta?.mentions)?m.meta.mentions.filter(x=>x?.id):[];
export const mentionsMe=(m,me)=>Boolean(me)&&m?.sender!==me&&mentionsOf(m).some(x=>String(x.id)===String(me));

// The chip's words: the section's own title (the same English text as its heading in How to play, so the page's translation shows it in
// the reader's language), else the topic's title, else How to play for the wiki's first page. Worked out once per section.
const titles=new Map();
export function wikiLinkTitle({topic=null,anchor=''}={}){
 if(!topic)return 'How to play';
 const key=`${topic}#${anchor}`;if(titles.has(key))return titles.get(key);
 const article=wikiArticle(topic);let title=article?.title??'How to play';
 const m=anchor&&article&&new RegExp(`id="${anchor.replace(/[^a-z0-9-]/g,'')}">(?:<summary>)?<h3>(.*?)</h3>`).exec(article.html);
 if(m)title=m[1].replace(/<[^>]*>/g,'').trim()||title;
 titles.set(key,title);return title;
}

// The "@" being typed right before the cursor (at the start or after a space) and what follows it so far, at most 20 characters like a
// farmer's name (names have spaces: "Gentle Farm 6170"). null when the cursor is not in one.
export function mentionAt(text,caret=String(text??'').length){
 const before=String(text??'').slice(0,caret),m=/(^|\s)@([^@\n]{0,20})$/.exec(before);
 return m?{start:before.length-m[2].length-1,query:m[2]}:null;
}
// The farmer picked from the list goes in as "@Full Name " in place of the "@" and what was typed after it.
export function insertMention(text,caret,start,name){
 const value=String(text??''),tag=`@${name} `,next=value.slice(0,start)+tag+value.slice(caret).replace(/^ /,'');
 return {text:next,caret:start+tag.length};
}
// The farmers a message mentions: the picked ones (id → name) whose "@Full Name" is still in it, never yourself, at most 3.
export function mentionIds(text,picked,me=null){
 const ids=[];for(const [id,name] of picked??[])if(id!==me&&!ids.includes(id)&&String(text??'').includes(`@${name}`))ids.push(id);
 return ids.slice(0,MAX_MENTIONS);
}
// The list under the box: farmers whose name holds what was typed (any case), you and blocked farmers left out, at most 6.
export function mentionMatches(people,query,{me=null,blocked=new Set()}={}){
 const q=String(query??'').trim().toLowerCase(),seen=new Set();
 return (people??[]).filter(p=>{const id=p?.playerId;if(!id||id===me||blocked.has(id)||seen.has(id)||!p.username)return false;seen.add(id);return !q||p.username.toLowerCase().includes(q);}).slice(0,6);
}
