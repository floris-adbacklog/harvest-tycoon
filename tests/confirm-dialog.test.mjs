import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {confirmAction} from '../public/confirm-dialog.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

function fakeDocument(){
 const made=[],state={focused:0};
 const element=()=>({textContent:'',onclick:null});
 const document={
  activeElement:{isConnected:true,focus(){state.focused++;}},
  body:{append(dialog){dialog.appended=true;}},
  createElement(tag){
   const dialog={tag,className:'',attrs:{},parts:{h2:element(),p:element(),'[data-cancel]':element(),'[data-confirm]':element(),'[data-type]':{...element(),value:''},'[data-type-label]':element()},listeners:{},shown:false,removed:false,
    setAttribute(key,value){this.attrs[key]=value;},set innerHTML(value){this.html=value;},querySelector(selector){return this.parts[selector];},
    addEventListener(name,fn){this.listeners[name]=fn;},remove(){this.removed=true;},showModal(){this.shown=true;},close(){this.shown=false;this.listeners.close?.();}};
   made.push(dialog);return dialog;
  }
 };
 return {document,made,state};
}
async function run(act){
 const f=fakeDocument();globalThis.document=f.document;
 const promise=confirmAction({title:'Sell all your crops?',description:'Are you sure you want to sell all your crops for 1,240 coins?',confirmLabel:'Sell for 1,240 coins',cancelLabel:'Keep them'});
 const dialog=f.made[0];act(dialog);const result=await promise;delete globalThis.document;return {result,dialog,state:f.state};
}
test('the confirmation shows the question and the amount, and only Confirm says yes',async()=>{
 const {result,dialog,state}=await run(d=>{assert(d.shown);assert.equal(d.parts.h2.textContent,'Sell all your crops?');assert.match(d.parts.p.textContent,/sell all your crops for 1,240 coins/);assert.equal(d.parts['[data-confirm]'].textContent,'Sell for 1,240 coins');assert.equal(d.parts['[data-cancel]'].textContent,'Keep them');d.parts['[data-confirm]'].onclick();});
 assert.equal(result,true);assert(dialog.removed,'the dialog cleans up after itself');assert.equal(state.focused,1,'focus goes back to the button that was used');
 assert.match(dialog.className,/diamond-confirm/);assert.equal(dialog.attrs['aria-labelledby'],'sale-confirm-title');
});
test('Cancel, Escape and closing the dialog all mean no',async()=>{
 assert.equal((await run(d=>d.parts['[data-cancel]'].onclick())).result,false);
 assert.equal((await run(d=>d.close())).result,false,'Escape closes a dialog without confirming');
});
test('type to confirm: Confirm stays off until the name is typed exactly; then the button or Enter says yes',async()=>{
 const f=fakeDocument();globalThis.document=f.document;
 const promise=confirmAction({title:'Make Tony a moderator?',description:'…',confirmLabel:'Make moderator',typeToConfirm:'Tony'});
 const d=f.made[0],input=d.parts['[data-type]'],button=d.parts['[data-confirm]'];
 assert.match(d.html,/<input type="text" data-type[^>]*autofocus>/);assert.match(d.html,/data-cancel><\/button>/,'the field takes the focus, not Cancel');
 assert.equal(d.parts['[data-type-label]'].textContent,'Type “Tony” to confirm');assert.equal(button.disabled,true);
 button.onclick();assert.equal(d.shown,true,'a click on the switched-off button does nothing');
 input.value='tony';input.oninput();assert.equal(button.disabled,true,'the name exactly, capitals too');
 input.onkeydown({key:'Enter'});assert.equal(d.shown,true,'Enter does nothing before it matches');
 input.value=' Tony ';input.oninput();assert.equal(button.disabled,false);
 input.onkeydown({key:'Enter'});assert.equal(await promise,true);delete globalThis.document;
});
test('making a moderator asks for the farmer\'s name; removing one is a plain confirmation',()=>{
 const chat=read('src/chat-ui.js');
 assert.match(chat,/confirmLabel:key==='mod'\?'Make moderator':'Remove',picture:'admin',\.\.\.\(key==='mod'\?\{typeToConfirm:name\}:\{\}\)\}/);
 assert.match(read('public/vip.css'),/\.confirm-type input\{/);
});
test('selling a whole market tab asks first, with the total; selling one item does not',()=>{
 const source=read('public/economy-ui.js');
 assert.match(source,/import \{confirmAction\} from '\.\/confirm-dialog\.js'/);
 const sell=source.slice(source.indexOf(' async function sell('),source.indexOf(' async function sell(')+1600);
 assert(sell.indexOf("key==='category'")<sell.indexOf('confirmAction('),'only the category sale is confirmed');
 assert.match(sell,/Are you sure you want to sell all your \$\{label\} for \$\{number\(total\)\} coins\?/);
 assert(sell.indexOf('confirmAction(')<sell.indexOf('marketSelling=true'),'nothing is sold before the answer');
 assert.match(sell,/if\(!sure\)return;/);assert.match(sell,/confirmingSale/,'a second tap while the question is open is ignored');
 assert.match(source,/function categoryTotal\(/);assert.match(source,/Sell all \$\{marketTab==='crops'\?'crops':'goods'\}/);
 assert.match(read('public/game.js'),/\$\('sell-all'\)\.addEventListener\('click',\(\)=>sell\(\)\)/);
});
