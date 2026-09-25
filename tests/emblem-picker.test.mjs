import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {FAMILY_EMBLEMS} from '../game/farm-state.js';
import {emblemPickerMarkup,bindEmblemPickers,pageStep} from '../public/emblem-picker.js';
import {renderPlayerProfile} from '../src/player-profiles.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const emblems=Array.from({length:21},(_,i)=>({id:String(i),icon:`icon${i}`}));
const names=e=>e.id==='3'?'<b>Apples</b>':`Emblem ${e.id}`;
const markup=(checkedId='1')=>emblemPickerMarkup({emblems,checkedId,legend:'Choose an emblem',nameOf:names,tile:id=>`<span class="family-emblem">${id}</span>`,esc});

test('the picker is one radio group with the chosen emblem checked and a button on each side',()=>{
 const html=markup('1');
 assert.equal((html.match(/type="radio" name="emblem"/g)??[]).length,21);
 assert.equal((html.match(/ checked /g)??[]).length,1);assert.match(html,/value="1" checked /);
 assert.equal((html.match(/<button type="button" class="emblem-arrow"/g)??[]).length,2,'arrows never submit the form');
 assert.match(html,/data-emblem-step="-1" aria-label="Show earlier emblems"/);assert.match(html,/data-emblem-step="1" aria-label="Show more emblems"/);
 assert.match(html,/<legend>Choose an emblem<\/legend>/);
 assert.match(html,/<p class="emblem-picked" aria-live="polite"><strong>Emblem 1<\/strong><span>2 of 21<\/span><\/p>/,'the name and place of the chosen emblem');
});
test('an unknown emblem falls back to the first one, and names are escaped',()=>{
 assert.match(markup('nope'),/value="0" checked /);
 const html=markup('3');assert(!html.includes('<b>Apples</b>'));assert.match(html,/&lt;b&gt;Apples&lt;\/b&gt;/);
});
test('the arrows page through a row at a time and keep one tile of context',()=>{
 assert.equal(pageStep(600,58,1),542);assert.equal(pageStep(600,58,-1),-542);
 assert.equal(pageStep(200,180,1),120,'never less than 60% of the row');
});

// A minimal page: just what bindEmblemPickers touches.
function fakePicker({checked=1,rowWidth=600,tile=58,gap=8,count=21}={}){
 const events={},arrows={},labels=Array.from({length:count},(_,i)=>({offsetLeft:3+i*(tile+gap),offsetWidth:tile}));
 const radios=labels.map((label,i)=>({checked:i===checked,dataset:{name:`Emblem ${i}`},parentElement:label}));
 let left=0;
 const row={clientWidth:rowWidth,scrollWidth:6+count*(tile+gap)-gap,isConnected:true,scrolledTo:[],
  // like a browser: the scroll position stays inside the row
  get scrollLeft(){return left;},set scrollLeft(value){left=Math.min(Math.max(value,0),this.scrollWidth-this.clientWidth);},
  addEventListener:(name,fn)=>{events[name]=fn;},scrollTo(options){this.scrolledTo.push(options);}};
 const name={textContent:''},place={textContent:''};
 arrows['-1']={disabled:false};arrows['1']={disabled:false};
 const picker={
  querySelector:selector=>({'.family-emblems':row,'.emblem-picked strong':name,'.emblem-picked span':place,'[data-emblem-step="-1"]':arrows['-1'],'[data-emblem-step="1"]':arrows['1']})[selector],
  querySelectorAll:()=>radios,addEventListener:(type,fn)=>{events[type]=fn;}};
 const root={querySelectorAll:selector=>selector==='[data-emblem-picker]'?[picker]:[]};
 return {root,row,radios,arrows,name,place,events};
}
test('the chosen emblem starts in the middle of the row and the arrows know where the row ends',()=>{
 const page=fakePicker({checked:10});bindEmblemPickers(page.root,{});
 assert.equal(page.row.scrollLeft,3+10*66-(600-58)/2);
 assert.equal(page.arrows['-1'].disabled,false);assert.equal(page.arrows['1'].disabled,false);
 assert.equal(page.name.textContent,'Emblem 10');assert.equal(page.place.textContent,'11 of 21');
 const first=fakePicker({checked:0});bindEmblemPickers(first.root,{});
 assert.equal(first.row.scrollLeft,0,'the first emblem cannot be centred: the row simply starts at the beginning');
 assert.equal(first.arrows['-1'].disabled,true);
});
test('the arrows scroll to an absolute position inside the row',()=>{
 const page=fakePicker({checked:0});bindEmblemPickers(page.root,{});
 page.row.scrollLeft=0;page.events.scroll();
 assert.equal(page.arrows['-1'].disabled,true,'nothing earlier');assert.equal(page.arrows['1'].disabled,false);
 page.arrows['1'].onclick();assert.deepEqual(page.row.scrolledTo.at(-1),{left:542,behavior:'smooth'});
 page.row.scrollLeft=page.row.scrollWidth-page.row.clientWidth-10;page.arrows['1'].onclick();
 assert.equal(page.row.scrolledTo.at(-1).left,page.row.scrollWidth-page.row.clientWidth,'never past the end');
 page.row.scrollLeft=page.row.scrollWidth-page.row.clientWidth;page.events.scroll();
 assert.equal(page.arrows['1'].disabled,true,'nothing more');assert.equal(page.arrows['-1'].disabled,false);
 page.row.scrollLeft=100;page.arrows['-1'].onclick();assert.equal(page.row.scrolledTo.at(-1).left,0,'never before the start');
});
test('picking an emblem updates its name and place',()=>{
 const page=fakePicker({checked:1});bindEmblemPickers(page.root,{});
 page.radios[1].checked=false;page.radios[20].checked=true;page.events.change();
 assert.equal(page.name.textContent,'Emblem 20');assert.equal(page.place.textContent,'21 of 21');
});
test('the arrows follow the width of the row and stop watching once the dialog re-renders',()=>{
 const page=fakePicker({checked:0});let callback,disconnected=false;
 class Observer{constructor(fn){callback=fn;}observe(){}disconnect(){disconnected=true;}}
 bindEmblemPickers(page.root,{ResizeObserver:Observer});
 page.row.clientWidth=2000;callback();assert.equal(page.arrows['1'].disabled,true,'everything fits: no arrows needed');
 page.row.isConnected=false;callback();assert.equal(disconnected,true);
});

test('both emblem forms use the picker, and the dialog is not re-rendered under a farmer who is using the arrows',()=>{
 const ui=read('public/family-ui.js');
 assert.match(ui,/emblemPickerMarkup\(\{emblems:FAMILY_EMBLEMS,checkedId:FAMILY_EMBLEMS\[0\]\.id,legend:'Choose your emblem'/);
 assert.match(ui,/emblemPickerMarkup\(\{emblems:FAMILY_EMBLEMS,checkedId:f\.emblem,legend:'Choose an emblem'/);
 assert(!/<div class="family-emblems">/.test(ui),'no second, hand-written grid');
 assert.match(ui,/inviteSearch\.mount\(content\);bindEmblemPickers\(content\);/);
 assert.match(ui,/closest\('\[data-emblem-picker\]'\)/);
});
test('the emblem row is compact, scrolls sideways and keeps big tap targets',()=>{
 const css=read('public/family.css');
 assert(!/\.family-emblems\{[^}]*grid-template-columns/.test(css),'the wall of big squares is gone');
 assert.match(css,/\.family-emblems\{[^}]*display:flex[^}]*overflow-x:auto[^}]*scroll-snap-type:x proximity/);
 assert.match(css,/\.family-emblems::-webkit-scrollbar\{display:none\}/);
 assert.match(css,/\.emblem-arrow\{[^}]*width:44px;height:44px/);
 assert.match(css,/\.family-emblems \.family-emblem\{width:58px;height:58px/);
 assert.match(css,/\.family-emblems \.family-emblem\{width:52px;height:52px\}/,'phones');
});

test('every farmer profile shows the farmer, not a stalk of wheat',()=>{
 const html=renderPlayerProfile({username:'Floris',level:41,online:true,stats:{},badges:[],family:null});
 const avatar=html.slice(html.indexOf('class="farmer-avatar"'),html.indexOf('</div>',html.indexOf('class="farmer-avatar"')));
 assert.match(avatar,/<img class="farmer-avatar-img" src="\/assets\/farmer-avatar\.webp" alt="" width="384" height="384"/);
 assert(!avatar.includes('data-art="wheat"'));assert.doesNotMatch(avatar,/<span>/,'no letter on the picture: every farmer has their own avatar now');
 assert.match(read('public/player-profiles.css'),/\.farmer-avatar\{[^}]*flex:0 0 100px;height:100px;/,'a square tile, like the square avatars, so no empty strip above the head');
 const file=readFileSync(new URL('../public/assets/farmer-avatar.webp',import.meta.url));
 assert.equal(file.subarray(0,4).toString(),'RIFF');assert.equal(file.subarray(8,12).toString(),'WEBP');
 assert(statSync(new URL('../public/assets/farmer-avatar.webp',import.meta.url)).size<80000,'a light picture');
 assert.match(read('public/player-profiles.css'),/\.farmer-avatar-img\{[^}]*object-fit:contain/);
});
test('the Install app button centres its icon and its text',()=>{
 assert.match(read('public/settings.css'),/#install-app\{display:flex;align-items:center;justify-content:center;gap:9px;width:100%/);
});

test('a picker inside a closed dialog centres the chosen tile as soon as it gets a size',()=>{
 const page=fakePicker({checked:10});let callback;page.row.clientWidth=0;
 class Observer{constructor(fn){callback=fn;}observe(){}disconnect(){}}
 bindEmblemPickers(page.root,{ResizeObserver:Observer});
 assert.equal(page.row.scrollLeft,0,'nothing to measure while the dialog is closed');
 page.row.clientWidth=600;callback();
 assert.equal(page.row.scrollLeft,3+10*66-(600-58)/2);
 page.row.scrollLeft=0;callback();assert.equal(page.row.scrollLeft,0,'only the first time: later resizes never pull the row back');
});
test('the avatar picker is the same row, with the faces as tiles',()=>{
 const html=emblemPickerMarkup({emblems:[{id:'a'},{id:'b'}],checkedId:'b',legend:'Choose your farmer avatar',nameOf:e=>`Face ${e.id}`,tile:()=>'<span class="avatar-tile"></span>',esc,field:'avatar',noun:'avatar',extraClass:'avatar-picker'});
 assert.match(html,/<fieldset class="emblem-picker avatar-picker" data-emblem-picker>/);
 assert.match(html,/type="radio" name="avatar" value="b" checked aria-label="Face b avatar"/);
 assert.match(html,/aria-label="Show earlier avatars"/);assert.match(html,/aria-label="Show more avatars"/);
 const css=read('public/player-avatars.css');
 assert.match(css,/\.avatar-picker \.avatar-tile\{[^}]*width:62px;height:66px/);assert.match(css,/\.avatar-picker \.family-emblems input:checked\+\.avatar-tile/);
 assert(!/avatar-grid|avatar-choice/.test(css),'the wall of squares is gone');
});
test('all 25 family emblems have a picture that ships and a name',()=>{
 assert.equal(FAMILY_EMBLEMS.length,25);
 const icons=read('public/visual-icons.js'),ui=read('public/family-ui.js');
 for(const icon of ['family-fox','family-owl','family-windmill','family-horseshoe']){
  assert.ok(FAMILY_EMBLEMS.some(e=>e.icon===icon),`${icon} is an emblem`);
  assert.ok(icons.includes(`'${icon}'`),`${icon} is registered as a picture`);assert.ok(ui.includes(`'${icon}':`),`${icon} has a name`);
  const file=new URL(`../public/assets/icons/${icon}.png`,import.meta.url);assert.ok(existsSync(file));
  const bytes=readFileSync(file);assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.ok(bytes.length<150000,'a light picture');
 }
});
