import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createChatClient} from '../src/chat-client.js';
import {feedbackProblem,FEEDBACK_MAX} from '../public/feedback-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 30 Sep 2026: Feedback & bugs. A farmer writes with the mailbox button; the admin and the moderators read it in the dashboard.
test('the database: any farmer sends at most 5 an hour; only the staff read and mark them done; the table is closed',()=>{
 const sql=read('supabase/feedback.sql');
 assert.match(sql,/create table if not exists public\.feedback_reports\(/);
 assert.match(sql,/kind text not null check \(kind in \('feedback','bug'\)\)/);assert.match(sql,/check \(char_length\(body\) between 3 and 1000\)/);
 assert.match(sql,/alter table public\.feedback_reports enable row level security;\nrevoke all on public\.feedback_reports from anon, authenticated;/);
 assert.match(sql,/interval '1 hour'\)>=5 then\n  raise exception '[^']+' using errcode='54000'/);
 for(const fn of ['feedback_list','feedback_handle'])assert.match(sql,new RegExp(`function public\\.${fn}\\([^]*?if public\\.chat_staff_role\\([^\\n]*\\) is null then raise exception 'Not authorized\\.'`),fn);
 for(const signature of ['feedback_send(text,text,integer,text,text)','feedback_list(boolean)','feedback_handle(uuid,boolean)']){
  assert.ok(sql.includes(`revoke all on function public.${signature} from public, anon;`),signature);assert.ok(sql.includes(`grant execute on function public.${signature} to authenticated;`),signature);
 }
 assert.match(sql,/ps\.username as name/,'the farmer\'s name comes with every message');assert.match(sql,/r\.created_at as "createdAt"/);
 assert.equal(FEEDBACK_MAX,1000);
 assert.match(sql,/delete from public\.feedback_reports where created_at<now\(\)-interval '1 year';/);
 const privacy=read('public/privacy.html');assert.match(privacy,/Feedback, bug reports and feature requests you send with the Feedback button/);assert.match(privacy,/<strong>Feedback, bug reports and feature requests<\/strong>: one year, then they are deleted automatically\./);
});

test('sending keeps the limit\'s code, so the game can say it in the farmer\'s language',async()=>{
 const calls=[];let answer={error:null};
 const supabase={rpc:async(name,args)=>{calls.push([name,args]);return answer;}};
 const chat=createChatClient(supabase,{playerId:'A'});
 await chat.sendFeedback({kind:'bug',body:'The mill froze',level:7,device:'iPhone',language:'nl'});
 assert.deepEqual(calls[0],['feedback_send',{p_kind:'bug',p_body:'The mill froze',p_level:7,p_device:'iPhone',p_language:'nl'}]);
 answer={error:{message:'Thanks, we have your messages. Try again later.',code:'54000'}};
 await assert.rejects(()=>chat.sendFeedback({kind:'feedback',body:'Nice game'}),error=>error.code==='54000');
 assert.equal(feedbackProblem({code:'54000'}),'Thanks, we have your messages. Try again in a little while.');
 assert.equal(feedbackProblem(new Error('No connection right now. Try again in a moment.')),'No connection right now. Try again in a moment.');
 assert.equal(feedbackProblem(new Error('permission denied')),'That did not send. Please try again.','a database text never reaches the farmer');
 answer={data:[],error:null};await chat.feedbackList(true);await chat.feedbackHandle('f1',false);
 assert.deepEqual(calls.slice(-2),[['feedback_list',{p_done:true}],['feedback_handle',{p_id:'f1',p_done:false}]]);
});

test('the mailbox: beside How to play on a computer, in the More menu on a phone, and hidden where Settings is hidden',()=>{
 const farm=read('public/farm.html');
 assert.match(farm,/id="sound-button"[^]*?<\/button><button class="icon-button" id="feedback-button" aria-label="Feedback" aria-haspopup="dialog" title="Feedback"><i data-game-art="feedback"><\/i><\/button><button class="icon-button" id="help-button"/);
 assert.match(farm,/<button data-menu-action="feedback-button"><i data-game-art="feedback"><\/i><span><strong>Feedback<\/strong><small>Ideas, problems, anything<\/small><\/span><\/button>/);
 assert.match(read('public/mobile.css'),/\.resources \.icon-button\{display:none\}/,'phones hide the topbar icons and use the More menu');
 assert.match(read('public/styles.css'),/\.resources #sound-button,\.resources #feedback-button\{display:none\}/);
 assert.match(read('public/game.js'),/const feedback=createFeedback\(\{level:\(\)=>levelProgress\(state\)\.level\}\);\n \$\('feedback-button'\)\.addEventListener\('click',/);
 assert.ok(existsSync(new URL('../public/assets/icons/feedback.webp',import.meta.url)),'the mailbox is a WebP');
 const icons=read('public/visual-icons.js');assert.match(icons,/pictures\.feedback='feedback';\nexport const ART_KEYS=/);assert.match(icons,/webpPictures\.add\('feedback'\);/);
});

test('the form says what comes with a message, and sends the level, device and game language',()=>{
 const ui=read('public/feedback-ui.js');
 assert.match(ui,/With your message we send your farmer name, level, device and language\./);
 assert.match(ui,/data-feedback-kind="\$\{key\}"/);assert.match(ui,/\[\['feedback','Feedback'\],\['bug','Report a bug'\],\['feature','Request a feature'\]\]/);
 assert.match(ui,/api\.sendFeedback\(\{kind,body,level:level\(\),device:String\(agent\(\)\)\.slice\(0,300\),language:language\(\)\}\)/);
 assert.match(ui,/if\(body\.length<3\)\{message='Write a few words first\.'/);
});

test('the staff dashboard: a Feedback tab for the admin and the moderators, with the name, time, level, device, language and Translate',()=>{
 const admin=read('src/admin-dashboard.js');
 assert.match(admin,/data-admin-tab="feedback" aria-label="Feedback" aria-selected="false">'\+art\('feedback'\)\+'<span class="admin-tab-name">Feedback<\/span><b class="admin-tab-count" id="admin-feedback-count" hidden>0<\/b>/);
 assert.doesNotMatch(admin,/\[data-admin-tab="feedback"\]'\)\.hidden=role!=='admin'/,'moderators see it too');
 assert.match(admin,/void loadChat\(\);void loadFeedback\(\);/);
 assert.match(admin,/data-profile="\$\{esc\(f\.playerId\)\}">\$\{esc\(f\.name\?\?'A farmer'\)\}<\/button>/);assert.match(admin,/esc\(fmtDate\(f\.createdAt\)\)/);
 assert.match(admin,/\[f\.level\?`Level \$\{number\(f\.level\)\}`:null,deviceName\(f\.device\),languageName\(f\.language\)\]/);
 assert.match(admin,/href="\$\{esc\(translateLink\(f\.body,chosenLanguage\(\)\)\)\}" target="_blank" rel="noopener noreferrer">Translate<\/a>/);
 assert.match(admin,/bridge\.chat\.feedbackHandle\(mark\.dataset\.feedbackId,mark\.dataset\.feedbackDone==='1'\)/);
});

test('a third kind: Request a feature, with its own hint; the button is just Feedback; the database takes it (2 Oct 2026)',()=>{
 const sql=read('supabase/feedback-feature.sql'),ui=read('public/feedback-ui.js');
 assert.match(sql,/add constraint feedback_reports_kind_check check \(kind in \('feedback','bug','feature'\)\);/);
 assert.match(sql,/p_kind not in \('feedback','bug','feature'\) then raise exception 'Choose feedback, a bug or a feature request\.'/);
 assert.match(ui,/feature:'What would you like to see in the game\?'/);assert.match(ui,/<h2 id="feedback-title">Feedback<\/h2>/);
 assert.match(read('src/admin-dashboard.js'),/const FEEDBACK_KINDS=\{feedback:'Feedback',bug:'Bug',feature:'Feature request'\};/);
 assert.doesNotMatch(read('public/farm.html')+read('public/wiki-content.js'),/Feedback (&amp;|&|and) bugs/,'one name everywhere');
});
