// News and offers by email (13 Oct 2026): what the admin may send, checked the same way in the Admin dashboard (src/admin-news-mail.js),
// in this function (send.js) and again in the database (supabase/news-mail.sql: news_mail_texts, news_mail_filters, news_mail_start).
// The texts per game language as the News form keeps them ({en:{subject,body,buttonLabel},nl:{…}}): English is needed (subject and
// text), every other language only has what was written for it. One button at most, and only to a page of our own website.
export const MAIL_LANGUAGES=Object.freeze(['en','cs','de','es','fr','id','hu','nl','pt','tr','ru','uk','hi','ja','ar','zh']);
// Characters (code points, as the database counts them): a subject that fits an inbox line, a text, the button.
export const MAIL_LIMITS=Object.freeze({subject:100,body:5000,buttonLabel:30});
export const MAIL_CAP=5000;            // farmers per email at most (news_mail_start refuses more)
export const ACTIVE_DAYS=Object.freeze([7,14,30,90]);
export const GAME_URL='https://www.harvesttycoon.com/';
// Our own pages only: harvesttycoon.com or www, https, no port, no sign-in part, plain URL characters. The same pattern is in news_mail_start.
export const OWN_PAGE=/^https:\/\/(www\.)?harvesttycoon\.com(\/[A-Za-z0-9._~:/?#@!$&()*+,;=%-]*)?$/;
export const MESSAGES=Object.freeze({
 english:'Write a subject and a text in English first.',
 subject:`Keep every subject to ${MAIL_LIMITS.subject} characters.`,
 body:`Keep every text to ${MAIL_LIMITS.body} characters.`,
 buttonLabel:`Keep every button text to ${MAIL_LIMITS.buttonLabel} characters.`,
 noLink:'Add the web address the button opens.',
 ownPage:'The button can only open a page on harvesttycoon.com.',
 level:'Choose a level from 1 to 200.',
 days:'Choose from 1 to 365 days.'
});

const size=text=>[...text].length;
const line=value=>String(value??'').replace(/\s+/g,' ').trim();
const block=value=>String(value??'').replace(/\r/g,'').replace(/[ \t]+\n/g,'\n').trim();

// The texts as they are sent: unknown languages left out, a subject and a button on one line, empty parts dropped.
export function cleanTexts(texts){
 const out={};
 for(const [code,value] of Object.entries(texts&&typeof texts==='object'?texts:{})){
  if(!MAIL_LANGUAGES.includes(code)||!value||typeof value!=='object')continue;
  const t={subject:line(value.subject),body:block(value.body),buttonLabel:line(value.buttonLabel)};
  for(const key of ['subject','body','buttonLabel'])if(size(t[key])>MAIL_LIMITS[key])throw new Error(MESSAGES[key]);
  const kept=Object.fromEntries(Object.entries(t).filter(([,v])=>v));
  if(Object.keys(kept).length)out[code]=kept;
 }
 if(!out.en?.subject||!out.en?.body)throw new Error(MESSAGES.english);
 return out;
}

// The button's address, written the way a browser writes it; null for none; an error for anything but our own pages.
export function ownPage(value){
 const raw=String(value??'').trim();if(!raw)return null;
 let href;try{href=new URL(raw).href;}catch{throw new Error(MESSAGES.ownPage);}
 if(!OWN_PAGE.test(href))throw new Error(MESSAGES.ownPage);
 return href;
}

// From level (1 is everyone) and played in the last N days (none: any time). Only what narrows it down is kept.
export function cleanFilters(filters){
 const f=filters&&typeof filters==='object'?filters:{},out={};
 if(f.minLevel!=null&&f.minLevel!==''){const n=Number(f.minLevel);if(!Number.isInteger(n)||n<1||n>200)throw new Error(MESSAGES.level);if(n>1)out.minLevel=n;}
 if(f.activeDays!=null&&f.activeDays!==''){const n=Number(f.activeDays);if(!Number.isInteger(n)||n<1||n>365)throw new Error(MESSAGES.days);out.activeDays=n;}
 return out;
}

// One email as the admin wrote it. The button shows when the English button text is there; it then needs our own address.
export function cleanMail({texts,buttonUrl=null,filters={}}={}){
 const t=cleanTexts(texts);let href=null;
 if(t.en.buttonLabel){href=ownPage(buttonUrl);if(!href)throw new Error(MESSAGES.noLink);}
 return {texts:t,buttonUrl:href,filters:cleanFilters(filters)};
}
