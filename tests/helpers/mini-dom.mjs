// A small page for the translation tests (17 Oct 2026): markup from the game's own templates read into elements and text nodes, enough
// for public/i18n.js translateDocument to walk it as the page's would (createTreeWalker, closest, matches, the four attributes). No
// library: the templates are the game's, well formed, and only their text and attributes matter here.
const VOID=new Set(['area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr']);
const ENTITIES={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '};
const decode=text=>text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(all,code)=>code[0]==='#'?String.fromCodePoint(code[1]==='x'||code[1]==='X'?parseInt(code.slice(2),16):Number(code.slice(1))):ENTITIES[code.toLowerCase()]??all);

class Text{
 constructor(data,parent){this.nodeType=3;this.data=data;this.parentElement=parent;}
 get textContent(){return this.data;}
}
class Element{
 constructor(tag,attrs,parent){this.nodeType=1;this.tagName=tag.toUpperCase();this.localName=tag;this.attrs=attrs;this.parentElement=parent;this.childNodes=[];}
 getAttribute(name){return this.attrs.has(name)?this.attrs.get(name):null;}
 hasAttribute(name){return this.attrs.has(name);}
 setAttribute(name,value){this.attrs.set(name,String(value));}
 get classList(){
  const names=()=>new Set((this.getAttribute('class')??'').split(/\s+/).filter(Boolean)),put=set=>this.setAttribute('class',[...set].join(' '));
  return {has:name=>names().has(name),contains:name=>names().has(name),add:name=>put(names().add(name)),remove:name=>{const set=names();set.delete(name);put(set);}};
 }
 matches(selectors){return selectors.split(',').some(one=>matchOne(this,one.trim()));}
 closest(selectors){for(let el=this;el;el=el.parentElement)if(el.matches(selectors))return el;return null;}
 get textContent(){return this.childNodes.map(node=>node.textContent).join('');}
 // Every element in the tree, this one first.
 *all(){yield this;for(const node of this.childNodes)if(node.nodeType===1)yield* node.all();}
 querySelectorAll(selectors){return [...this.all()].slice(1).filter(el=>el.matches(selectors));}
}
// The selectors public/i18n.js keeps (KEEP): a tag, a class, an attribute with a value.
function matchOne(el,selector){
 for(const part of selector.match(/\[[^\]]+\]|\.[\w-]+|[\w-]+/g)??[]){
  if(part[0]==='.'){if(!el.classList.has(part.slice(1)))return false;}
  else if(part[0]==='['){const [,name,value]=part.match(/^\[([\w-]+)(?:="([^"]*)")?\]$/);if(value===undefined?!el.hasAttribute(name):el.getAttribute(name)!==value)return false;}
  else if(el.localName!==part.toLowerCase())return false;
 }
 return true;
}

export function parse(html){
 const root=new Element('html',new Map(),null),stack=[root];
 const re=/<!--[\s\S]*?-->|<\/([\w-]+)\s*>|<([\w-]+)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+|<)/g;
 for(const m of html.matchAll(re)){
  const top=stack[stack.length-1];
  if(m[1]){const i=stack.map(el=>el.localName).lastIndexOf(m[1].toLowerCase());if(i>0)stack.length=i;}
  else if(m[2]){
   const attrs=new Map();
   for(const a of (m[3]??'').matchAll(/([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))attrs.set(a[1].toLowerCase(),decode(a[2]??a[3]??a[4]??''));
   const el=new Element(m[2].toLowerCase(),attrs,top);top.childNodes.push(el);
   if(!m[4]&&!VOID.has(el.localName))stack.push(el);
  }
  else if(m[5])top.childNodes.push(new Text(decode(m[5]),top));
 }
 return root;
}

// A document around the markup, with what translateDocument asks of one.
export function miniDocument(html){
 const documentElement=parse(html);
 return {documentElement,createTreeWalker(root,show,{acceptNode}){
  // Document order; a rejected element (2) is passed over with everything in it.
  const order=[];
  const walk=node=>{for(const child of node.childNodes){
   if(child.nodeType===3){if(show&4)order.push(child);continue;}
   if(acceptNode(child)===2)continue;
   if(show&1)order.push(child);walk(child);
  }};
  walk(root);let i=0;
  return {nextNode:()=>order[i++]??null};
 }};
}
// translateDocument watches the page for later changes; here the page is read once.
export class NoMutations{observe(){}disconnect(){}}
// What the page shows: each text node's words, and the attributes a translation touches, after the translation ran.
export const shownText=doc=>doc.documentElement.textContent.replace(/\s+/g,' ').trim();
export const shownAttrs=doc=>[...doc.documentElement.all()].flatMap(el=>['title','aria-label','alt','placeholder'].filter(n=>el.hasAttribute(n)).map(n=>el.getAttribute(n)));
