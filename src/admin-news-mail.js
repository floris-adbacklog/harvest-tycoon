// News and offers by email (13 Oct 2026), a card of its own at the end of the Admin dashboard's Settings, for the admin only. The admin
// writes the subject, the text and an optional button per game language with the same editor as News and pop-ups (each language keeps
// what was typed for it, the English shows in the empty fields as what to translate), chooses from which level and, if wanted, played
// in the last N days, sees how many farmers it reaches per language, sends a test of the chosen language to their own address and then
// sends it. It goes through the news-mail function (supabase/functions/news-mail) to the farmers who said yes to news and offers by
// email and have a confirmed address (supabase/news-mail.sql), each in their game language with an unsubscribe link of its own. Below it
// the last emails, with Continue for one that still has farmers waiting (a send that stopped goes on where it stopped; nobody gets it
// twice). The database checks every step again (the admin, signed in with Google). Staff screens stay English.
import {art} from '../public/visual-icons.js';
import {confirmAction} from '../public/confirm-dialog.js';
import {LANGUAGES} from '../public/languages.js';
import {dateTime} from './admin-players.js';
import {MAIL_LIMITS,MAIL_CAP,ACTIVE_DAYS,GAME_URL,cleanMail,cleanFilters} from '../supabase/functions/news-mail/rules.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n??0).toLocaleString('en-US');
// The staff see what the database really said (as in src/admin-dashboard.js).
const why=error=>error?.raw??error?.message;
const nameOf=code=>LANGUAGES.find(l=>l.code===code)?.name??code;
const farmers=n=>`${number(n)} farmer${Number(n)===1?'':'s'}`;

// "Goes to 28 farmers: English 9, Español 4, …" (most first), or why nobody or too many.
export function countLine(c){
 const total=Number(c?.total??0),cap=Number(c?.cap??MAIL_CAP);
 if(total>cap)return `${farmers(total)} match, more than ${number(cap)}: choose a higher level or fewer days.`;
 if(!total)return 'No farmer matches: nobody would get it.';
 const parts=Object.entries(c?.languages??{}).sort((a,b)=>b[1]-a[1]||nameOf(a[0]).localeCompare(nameOf(b[0]))).map(([code,n])=>`${nameOf(code)} ${number(n)}`);
 return `Goes to ${farmers(total)}: ${parts.join(', ')}.`;
}
// Who an email went to, in words.
export function filtersText(f={}){
 const parts=[f?.minLevel>1&&`from level ${f.minLevel}`,f?.activeDays&&`played in the last ${f.activeDays} days`].filter(Boolean);
 return parts.length?`Farmers who said yes, ${parts.join(', ')}`:'Every farmer who said yes';
}
// Where a send stands: while it goes, and when it ends (done, or how many wait and why).
export const sendingLine=r=>`Sending… ${number(r?.sent)} of ${farmers(r?.recipients)} so far.`;
export function sendLine(r){
 const extra=[r.failed&&`${number(r.failed)} failed`,r.skipped&&`${number(r.skipped)} no longer said yes`].filter(Boolean).join(', ');
 const done=`Sent to ${number(r.sent)} of ${farmers(r.recipients)}${extra?` (${extra})`:''}.`;
 if(!r.waiting)return `${done} Done.`;
 const reason=r.stopped==='refused'?' The mail service refused it: check RESEND_API_KEY and MAIL_FROM, then Continue.':r.stopped==='later'?' The mail service asked to wait: Continue in a minute.'
  :r.busy?' Another send of this email is running.':' The send stopped halfway: Continue in 10 minutes.';
 return `${done} ${number(r.waiting)} waiting.${reason} Nobody gets it twice.`;
}
export function logRow(m){
 const waiting=(m.pending??0)+(m.sending??0),languages=(m.languages??[]).map(nameOf).join(', ');
 return `<li><span class="admin-recent-copy"><strong>“${esc(m.subject)}”</strong><small>${esc(filtersText(m.filters))}${languages?`, in ${esc(languages)}`:''}</small>`
  +`<small>${number(m.sent)} sent, ${number(m.failed)} failed, ${number(m.skipped)} skipped${waiting?`, ${number(waiting)} waiting`:''}, of ${farmers(m.recipients)}${m.by?`, by ${esc(m.by)}`:''}, ${esc(dateTime(m.createdAt))}</small></span>`
  +`${waiting?`<button type="button" class="small-button" data-mail-continue="${esc(m.id)}">Continue</button>`:''}</li>`;
}

export function createNewsMail({dialog,bridge,ask=confirmAction,pause=ms=>new Promise(resolve=>setTimeout(resolve,ms))}){
 const settings=dialog.querySelector('[data-admin-panel="settings"]');if(!settings)return {show(){}};
 const section=document.createElement('section');section.className='admin-card';section.id='admin-news-mail';section.hidden=true;
 section.innerHTML='<h3>'+art('letter')+'News and offers by email</h3><form id="admin-mail-form" class="admin-news admin-mail">'
  +'<label class="admin-news-hours">Language<select id="admin-mail-language">'+LANGUAGES.map(l=>`<option value="${l.code}">${esc(l.name)}</option>`).join('')+'</select></label><p class="admin-popup-note" id="admin-mail-language-note"></p>'
  +`<div class="admin-popup-fields"><label>Subject<input id="admin-mail-subject" maxlength="${MAIL_LIMITS.subject}" placeholder="A special offer, this weekend only"></label></div>`
  +`<textarea id="admin-mail-text" maxlength="${MAIL_LIMITS.body}" rows="7" placeholder="What is new, or what the offer is. An empty line starts a new paragraph."></textarea>`
  +`<div class="admin-popup-fields"><label>Button<input id="admin-mail-label" maxlength="${MAIL_LIMITS.buttonLabel}" placeholder="Open my farm (leave empty for no button)"></label>`
  +`<label>The button opens<input id="admin-mail-link" type="url" maxlength="300" value="${GAME_URL}" placeholder="${GAME_URL}"></label></div>`
  +'<div class="admin-popup-fields"><div class="admin-dm-filters"><label>From level<input id="admin-mail-level" type="number" min="1" max="200" step="1" value="1" inputmode="numeric"></label>'
  +'<label>Played<select id="admin-mail-days"><option value="">Any time</option>'+ACTIVE_DAYS.map(d=>`<option value="${d}">In the last ${d} days</option>`).join('')+'</select></label></div>'
  +'<p class="admin-popup-note" id="admin-mail-count">Counting farmers…</p></div>'
  +'<p class="admin-popup-note">Only farmers who said yes to news and offers by email and have a confirmed address (Google, Facebook or Apple, or the 6-digit code) get it; never CrazyGames, Kongregate or Discord accounts. Each gets the text of their game language, or the English one. Under it, in their own language, it says why they get it, with a link that stops news and offers only (the daily summary stays). The button needs the English button text and opens a page of harvesttycoon.com only. The test goes to your own address, in the language chosen above. Once sent, an email cannot be called back.</p>'
  +'<div class="admin-offer-actions"><button type="button" class="secondary-button" id="admin-mail-test">Send a test to me</button><button type="submit" class="primary-button" id="admin-mail-send">Send</button></div>'
  +'<p class="admin-hint" id="admin-mail-status" role="status"></p></form>'
  +'<h4 class="admin-subhead" id="admin-mail-log-head" hidden>Last emails</h4><ul class="admin-recent-list" id="admin-mail-log" hidden></ul>';
 settings.append(section);
 const $=id=>section.querySelector(`#admin-mail-${id}`);
 const status=text=>{$('status').textContent=text;};

 // Per language, as News and pop-ups: what was typed stays with its language until the email goes.
 let texts={},language='en';
 const fields=()=>({subject:$('subject'),body:$('text'),buttonLabel:$('label')});
 // The list marks which languages have a text of their own.
 function marks(){for(const option of $('language').options){const has=Object.values(texts[option.value]??{}).some(Boolean);option.textContent=option.value==='en'?`${nameOf('en')} (everyone else)`:`${nameOf(option.value)}${has?' ✓':' (English for now)'}`;}}
 function keep(){texts[language]=Object.fromEntries(Object.entries(fields()).map(([key,field])=>[key,field.value.trim()]));marks();}
 function showLanguage(){
  const en=texts.en??{},own=texts[language]??{};
  for(const [key,field] of Object.entries(fields())){field.dataset.placeholder??=field.placeholder;field.value=own[key]??'';field.placeholder=language==='en'?field.dataset.placeholder:en[key]||field.dataset.placeholder;}
  marks();
  $('language-note').textContent=language==='en'?'Farmers whose game language has no text of its own get the English one.':`Farmers who play in ${nameOf(language)} get this text. A part left empty stays English.`;
 }
 $('language').addEventListener('change',event=>{keep();language=event.target.value;showLanguage();});
 showLanguage();

 // How many it reaches now; only the latest count shows (typing a level asks again for every digit).
 let asking=0;
 const filters=()=>({minLevel:$('level').value.trim(),activeDays:$('days').value});
 async function count(){
  const note=$('count'),mine=++asking;note.textContent='Counting farmers…';delete note.dataset.count;
  try{const c=await bridge.chat.newsMailCount(cleanFilters(filters()));if(mine!==asking)return;note.textContent=countLine(c);note.dataset.count=String(c?.total??0);}
  catch(error){if(mine===asking)note.textContent=why(error);}
 }
 $('level').addEventListener('input',()=>void count());$('days').addEventListener('change',()=>void count());

 async function showLog(){
  const list=$('log'),head=$('log-head');let rows=[];
  try{rows=await bridge.chat.newsMailList();}catch{rows=[];}
  if(!Array.isArray(rows))rows=[];list.hidden=head.hidden=!rows.length;list.innerHTML=rows.map(logRow).join('');
 }

 // A call sends for up to 45 seconds; the rest goes in the next call. It stops when nothing is left, or when the server says why not.
 let sending=false;
 const busy=on=>{sending=on;$('send').disabled=$('test').disabled=on;};
 async function keepSending(r){
  for(let rounds=0;r&&r.waiting>0&&rounds<30;rounds++){
   if(['refused','unknown','database'].includes(r.stopped))break;
   if(r.busy||r.stopped==='later')await pause(5000);
   else if(!r.progress)break;
   status(sendingLine(r));
   r=await bridge.chat.newsMail({operation:'send',mailing:r.id});
  }
  return r;
 }
 $('form').addEventListener('submit',async event=>{
  event.preventDefault();if(sending)return;keep();
  let mail;try{mail=cleanMail({texts,buttonUrl:$('link').value,filters:filters()});}catch(error){status(why(error));return;}
  const n=$('count').dataset.count,written=Object.keys(mail.texts).length;
  if(!await ask({title:n==null?'Send this email?':`Email ${farmers(n)}?`,description:`“${mail.texts.en.subject}” goes to: ${filtersText(mail.filters).toLowerCase()}, ${written>1?`in ${written} languages (English for the others)`:'in English'}. It cannot be called back.`,confirmLabel:'Send',cancelLabel:'Cancel',picture:'letter'}))return;
  busy(true);status('Sending…');
  try{
   const r=await keepSending(await bridge.chat.newsMail({operation:'start',...mail}));
   status(sendLine(r));texts={};language='en';$('language').value='en';showLanguage();
  }catch(error){status(why(error));}
  finally{busy(false);void showLog();void count();}
 });
 $('test').addEventListener('click',async()=>{
  if(sending)return;keep();
  let mail;try{mail=cleanMail({texts,buttonUrl:$('link').value});}catch(error){status(why(error));return;}
  busy(true);status(`Sending a test in ${nameOf(language)}…`);
  try{const r=await bridge.chat.newsMail({operation:'test',texts:mail.texts,buttonUrl:mail.buttonUrl,language});status(`Test sent to ${r.to}, in ${nameOf(r.language)}. Check it, then Send.`);}
  catch(error){status(why(error));}
  finally{busy(false);}
 });
 $('log').addEventListener('click',async event=>{
  const go=event.target.closest('[data-mail-continue]');if(!go||sending)return;
  busy(true);go.disabled=true;status('Sending…');
  try{status(sendLine(await keepSending(await bridge.chat.newsMail({operation:'send',mailing:go.dataset.mailContinue}))));}
  catch(error){status(why(error));}
  finally{busy(false);void showLog();}
 });

 // The card opens with the dashboard (the admin only); the count once, the list on every refresh.
 let counted=false;
 return {show(){if(!bridge.chat?.newsMailCount)return;section.hidden=false;if(!counted){counted=true;void count();}void showLog();}};
}
