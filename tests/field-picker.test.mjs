import test from 'node:test';
import assert from 'node:assert/strict';
import {bindFieldPicker} from '../public/field-picker.js';
function element(extra={}){return {listeners:{},dataset:{},attrs:{},textContent:'',innerHTML:'',addEventListener(type,fn){this.listeners[type]=fn;},fire(type,event={}){this.listeners[type]?.(event);},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},focus(){globalThis.document.activeElement=this;},...extra};}
function fixture(multiple=false,available=2){
 const nodes=Object.fromEntries(['summary','[data-picker-title]','.field-picker-copy small','.field-picker-art','[data-picker-all]','[data-picker-clear]','[data-picker-done]'].map(s=>[s,element()]));
 const choices=[0,1,2].map(i=>{
  const copy={querySelector:s=>({textContent:s==='strong'?`Field ${i+1} · Corn`:'6m remaining'})};
  return element({dataset:{fieldChoice:String(i)},checked:false,querySelector:s=>s==='.field-choice-copy'?copy:{innerHTML:'corn art'}});
 });
 const root=element({open:true,querySelector:s=>nodes[s],querySelectorAll:()=>choices});
 let selected=null;globalThis.document={activeElement:null};
 const getSelection=bindFieldPicker(root,{multiple,available,onChange:ids=>{selected=ids;}});
 return {root,nodes,choices,getSelection,get selected(){return selected;}};
}
test('selecting one crop closes its disclosure, updates copy, and returns focus without spending',()=>{
 const f=fixture();f.choices[1].fire('click');
 assert.deepEqual(f.selected,[1]);assert.equal(f.root.open,false);assert.equal(document.activeElement,f.nodes.summary);
 assert.equal(f.nodes['[data-picker-title]'].textContent,'Field 2 · Corn');assert.equal(f.nodes['.field-picker-copy small'].textContent,'6m remaining');
 f.choices[2].fire('click');assert.deepEqual(f.getSelection(),[2]);
});
test('fertilizer quick selection respects available stock, and Clear empties the selection',()=>{
 const f=fixture(true,2);f.nodes['[data-picker-all]'].fire('click');assert.deepEqual(f.selected,[0,1]);assert.equal(f.nodes['[data-picker-title]'].textContent,'2 fields selected');
 f.nodes['[data-picker-clear]'].fire('click');assert.deepEqual(f.selected,[]);assert.equal(f.nodes['[data-picker-title]'].textContent,'0 fields selected');
 f.choices[2].checked=true;f.choices[2].fire('change');assert.deepEqual(f.selected,[2]);assert.equal(f.nodes['[data-picker-title]'].textContent,'1 field selected');
 f.nodes['[data-picker-done]'].fire('click');assert.equal(f.root.open,false);
});
test('keyboard arrows navigate crop choices; Escape closes the list without closing its dialog',()=>{
 const f=fixture();let prevented=0,stopped=0;const event=key=>({key,preventDefault(){prevented++;},stopPropagation(){stopped++;}});
 f.root.fire('keydown',event('ArrowDown'));assert.equal(document.activeElement,f.choices[0]);
 f.root.fire('keydown',event('End'));assert.equal(document.activeElement,f.choices[2]);
 f.root.fire('keydown',event('Home'));assert.equal(document.activeElement,f.choices[0]);
 f.root.fire('keydown',event('ArrowUp'));assert.equal(document.activeElement,f.choices[2]);
 f.root.fire('keydown',event('Escape'));assert.equal(f.root.open,false);assert.equal(document.activeElement,f.nodes.summary);assert.equal(prevented,5);assert.equal(stopped,1);
});
test('disabled selectors cannot be opened by click or keyboard',()=>{
 const f=fixture();f.root.open=false;f.root.dataset.disabled='true';let prevented=false;
 f.nodes.summary.fire('click',{preventDefault(){prevented=true;}});f.root.fire('keydown',{key:'ArrowDown'});
 assert.equal(prevented,true);assert.equal(f.root.open,false);assert.equal(f.selected,null);
});
import {readFileSync} from 'node:fs';
import {batchPicker} from '../public/field-picker.js';
test('batches can be picked several at a time, with the price per batch and a quick select limited by diamonds',()=>{
 const job=(id,recipe)=>({id,recipe,startedAt:0,readyAt:600000});
 const batches=[{building:'coop',job:job('a','eggs'),key:'coop/a'},{building:'dairy',job:job('b','milk'),key:'dairy/b'}];
 const html=batchPicker({id:'x',batches,selectedKeys:['dairy/b'],multiple:true,available:1,now:0,perItem:'10 diamonds per batch'});
 assert.match(html,/1 batch selected/);assert.equal((html.match(/type="checkbox"/g)??[]).length,2);
 assert.match(html,/data-picker-all >Select 1</);assert.match(html,/10 diamonds per batch/);
});
test('finishing several crops or batches is one normal action each, and the button shows the total',()=>{
 const ui=readFileSync(new URL('../public/boosts-ui.js',import.meta.url),'utf8');
 assert.match(ui,/type:'finish_crop',id:Number\(item\),expectedCost:SINGLE_CROP_COST/);
 assert.match(ui,/type:'finish_batch',building:chosen\.building,jobId:chosen\.job\.id,expectedCost:SINGLE_BATCH_COST/);
 assert.match(ui,/<b>\$\{f\.cost\*Math\.max\(1,n\)\}<\/b>/,'10 per crop or batch, times how many are picked');
 assert.match(ui,/if\(cost>=150&&!await confirmDiamondSpend/,'a big total asks first, like the big boosts');
});
