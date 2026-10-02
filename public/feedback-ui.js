import {art,refreshArt} from './visual-icons.js';
import {chosenLanguage} from './i18n.js';

// Feedback (30 Sep 2026; called Feedback & bugs until 2 Oct): the mailbox button (on a computer beside How to play, on a phone in the
// More menu) opens a short form: feedback, a bug or a feature request (2 Oct 2026), a few words, Send. It goes to the staff dashboard's Feedback tab (src/admin-dashboard.js) with the
// farmer's name, level, device and game language, which the form says (supabase/feedback.sql keeps at most 5 an hour).
export const FEEDBACK_MAX=1000;
const HINTS={feedback:'What do you like, and what could be better?',bug:'What happened, and what did you do just before?',feature:'What would you like to see in the game?'};
// What went wrong, in words the translation layer knows: a full hour (the database's 54000), no connection, or anything else.
export const feedbackProblem=error=>error?.code==='54000'?'Thanks, we have your messages. Try again in a little while.':/^No connection/.test(error?.message??'')?'No connection right now. Try again in a moment.':'That did not send. Please try again.';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

export function createFeedback({doc=globalThis.document,chat=()=>{try{return globalThis.window?.parent?.harvestBridge?.chat??null;}catch{return null;}},level=()=>null,agent=()=>globalThis.navigator?.userAgent??'',language=chosenLanguage}={}){
 const dialog=doc.createElement('dialog');dialog.id='feedback-dialog';dialog.className='game-dialog feedback-dialog';dialog.setAttribute('aria-labelledby','feedback-title');doc.body.append(dialog);
 let kind='feedback',busy=false,sent=false,message='',draft='';
 const close='<button type="button" class="icon-button close-dialog feedback-close" data-feedback-close aria-label="Close"><i data-lucide="x"></i></button>';
 function render(){
  if(sent){
   dialog.innerHTML=`${close}${art('feedback')}<p class="eyebrow">WE READ EVERY MESSAGE</p><h2 id="feedback-title">Thank you!</h2><p>Your message is with the Harvest Tycoon team.</p><button type="button" class="primary-button" data-feedback-done>Close</button>`;
  }else{
   dialog.innerHTML=`${close}${art('feedback')}<p class="eyebrow">WE READ EVERY MESSAGE</p><h2 id="feedback-title">Feedback</h2>`
    +`<div class="feedback-kinds" role="group" aria-label="What is it about?">${[['feedback','Feedback'],['bug','Report a bug'],['feature','Request a feature']].map(([key,label])=>`<button type="button" data-feedback-kind="${key}" aria-pressed="${kind===key}">${label}</button>`).join('')}</div>`
    +`<form class="feedback-form" data-feedback-form><textarea data-feedback-text maxlength="${FEEDBACK_MAX}" rows="5" placeholder="${HINTS[kind]}" aria-label="Your message"></textarea>`
    +`<p class="feedback-note">With your message we send your farmer name, level, device and language.</p><button type="submit" class="primary-button" ${busy?'disabled':''}>Send</button></form>`
    +`<p class="feedback-status" role="status">${esc(message)}</p>`;
   const text=dialog.querySelector('[data-feedback-text]');text.value=draft;text.addEventListener('input',()=>{draft=text.value;});
   dialog.querySelectorAll('[data-feedback-kind]').forEach(button=>button.addEventListener('click',()=>{kind=button.dataset.feedbackKind;message='';render();dialog.querySelector('[data-feedback-text]')?.focus();}));
   dialog.querySelector('[data-feedback-form]').addEventListener('submit',event=>{event.preventDefault();void send();});
  }
  dialog.querySelector('[data-feedback-close]').onclick=()=>dialog.close();
  dialog.querySelector('[data-feedback-done]')?.addEventListener('click',()=>dialog.close());
  refreshArt();
  try{globalThis.window?.lucide?.createIcons?.();}catch{}
 }
 async function send(){
  if(busy)return;
  const body=draft.trim();
  if(body.length<3){message='Write a few words first.';render();dialog.querySelector('[data-feedback-text]')?.focus();return;}
  const api=chat();if(!api?.sendFeedback){message='That did not send. Please try again.';render();return;}
  busy=true;message='';render();
  try{await api.sendFeedback({kind,body,level:level(),device:String(agent()).slice(0,300),language:language()});sent=true;draft='';kind='feedback';}
  catch(error){message=feedbackProblem(error);}
  busy=false;render();
  if(!sent)dialog.querySelector('[data-feedback-text]')?.focus();
 }
 function open(){
  sent=false;message='';render();
  if(!dialog.open)dialog.showModal();
  dialog.querySelector('[data-feedback-text]')?.focus();
 }
 return {open,dialog};
}
