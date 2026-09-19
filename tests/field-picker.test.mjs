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
