// Collects every English text a player can see (29 Sep 2026) into i18n/catalog.json: the list the translations
// (public/i18n/<code>.json) are checked against. Run it after changing texts: node scripts/i18n-extract.mjs
//
// A text is what ends up in one text node (or one title / aria-label / placeholder / alt) on screen, so the translation layer
// (public/i18n.js) can look it up there. Parts that change (a number, a name) are {0}, {1}, ...: "Harvested {0} {1}".
// Markup (tags, pictures from art(), lists) splits a text, like it splits the text nodes in the page. A choice between two short
// texts inside a text (`${n===1?'':'s'}`) gives both versions: "{0} coin" and "{0} coins".
import {parse} from './vendor/acorn.mjs';
import {readFileSync,readdirSync,writeFileSync,existsSync} from 'node:fs';

const ROOT=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,ROOT),'utf8');
const list=(dir,test)=>readdirSync(new URL(dir,ROOT)).filter(test).sort().map(file=>`${dir}${file}`);
// Admin screens stay English (only staff see them), and so does the partner programme's page (src/partners.js, like the privacy
// policy); the other skipped files hold no text for players.
const SKIP=/(^|\/)(admin-[^/]*|lucide-icons|analytics|sound-worker|sw|sound-kit|model-atlas|render-resources|languages|i18n|i18n-boot|partners)\.js$/;
export const SOURCES=[
 ...list('public/',f=>f.endsWith('.js')),
 ...list('src/',f=>f.endsWith('.js')),
 // mail-text.js holds the code email already written in every language: it is not translated through the catalog.
 ...list('supabase/functions/farm-api/',f=>f.endsWith('.js')&&f!=='farm-state.js'&&f!=='mail-text.js')
].filter(file=>!SKIP.test(file));
export const PAGES=['public/farm.html','public/play.html'];
const SQL_DIRS=['supabase/','supabase/migrations/'];

// data-note becomes a line of text in a dropdown (pretty-select.js), so it is collected too.
const ATTRS=['title','aria-label','placeholder','alt','data-note'];
const ENTITIES={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',middot:'·',rarr:'→',larr:'←',hellip:'…',mdash:'—',ndash:'–',times:'×',copy:'©',bull:'•',rsquo:'’',lsquo:'‘',ldquo:'“',rdquo:'”',euro:'€',check:'✓'};
const decode=text=>text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(all,code)=>code[0]==='#'?String.fromCodePoint(code[1]==='x'||code[1]==='X'?parseInt(code.slice(2),16):Number(code.slice(1))):ENTITIES[code.toLowerCase()]??all);
export const normalize=text=>text.replace(/\s+/g,' ').trim();

// Placeholders while a text is being cut up: \u0001<n>\u0001 is a changing part, \u0002 is markup (a cut).
const HOLE=n=>`\u0001${n}\u0001`,CUT='\u0002';let cutHole=0;
const TAG=/<\/?[a-zA-Z][^<>]*>|<!--[\s\S]*?-->|<![^<>]*>/g;

function looksLikeText(text,inMarkup){
 const bare=text.replace(/\{\d+\}/g,'').trim();
 if(!/\p{L}\p{L}/u.test(bare))return false;
 if(/=>|\$\{|\bvar\(--|rgba?\(|:\/\/|\.(webp|png|svg|jpe?g|js|css|glb|json|mp3|wav|flac)\b|\[data-|:not\(|[{}]|;\S|[a-z-]+:[^\s;]+;|\\u|^\w+\(|\bfunction\b|&&|\|\||===/.test(bare))return false;
 if(/^[.#@\[/-]/.test(text))return false;                                 // selectors, paths
 // A word with a capital and a hyphen is a word ("Co-leader"), and a capital word with a colon is a label ("Goal: {0}", "Now:").
 if(/^[a-z0-9]+([_:./-][a-z0-9]+)+$/i.test(bare)&&!/^\p{Lu}\p{Ll}+(-\p{Ll}+)+$/u.test(bare))return false; // keys, ids, paths
 if(!/\s/.test(bare)&&/^[a-z][\w-]*(:[\w-]*)+$/.test(bare))return false;   // storage keys: "field:{0}"
 if(/="|=\S|\w=|\b[a-z]+_[a-z_]+\b|',|^'/.test(bare))return false;            // attributes, database names, font lists
 if(/^[A-Z][a-z]+[A-Z][a-z]+$/.test(bare))return false;                     // ArrowUp, TikTok
 if(/^[a-z0-9]+-[a-z0-9-]+(\s[a-z0-9-]+)*$/.test(bare))return false;         // a class list: "plot-label plot-timer tended"
 if(bare.split(/\s+/).every(w=>/^[a-z0-9]+(-[a-z0-9]+)+$/.test(w)||/^[a-z]+$/.test(w))&&/-/.test(bare)&&(/(^|\s)is-[a-z]+/.test(bare)||!/\s[a-z]+\s/.test(` ${bare} `.replace(/\S*-\S*/g,''))))return false; // class lists
 if(/^\d*(px|em|rem|ms|s|vh|vw|%|deg)$/.test(bare))return false;
 if(/\b(px|rem)\b.*\b(px|rem)\b/.test(bare))return false;                // CSS values
 if(inMarkup)return true;
 if(/\{\d+\}/.test(text)&&/\s/.test(text))return true;                  // a text with a changing part
 if(/^[a-z][a-z0-9]*([A-Z][a-z0-9]*)+$/.test(bare))return false;         // camelCase
 if(/^[A-Z0-9_]+$/.test(bare))return false;                              // CONSTANTS
 if(/^[a-z][a-z0-9-]*$/.test(bare))return false;                         // one lower-case word: an identifier
 return /\s/.test(bare)||/^\p{Lu}\p{Ll}/u.test(bare)||/[.!?…:]$/.test(bare);
}

// Cut a text with holes and cuts into the pieces that show up as text nodes, plus the attribute texts in its tags.
function pieces(text,html,choices=[]){
 const found=[];
 // Attributes written without their tag (`${locked?' title="Locked"':''}`): their texts count like a tag's.
 if(!html&&new RegExp(`(^|\\s)(${ATTRS.join('|')})="`).test(text)){text=`<x ${text}>`;html=true;}
 if(html){
  text=text.replace(TAG,tag=>{
   for(const name of ATTRS){const m=tag.match(new RegExp(`\\s${name}="([^"]*)"`));if(m)found.push({text:m[1].replace(/\u0002/g,()=>HOLE(`c${cutHole++}`)),markup:true});}
   return CUT;
  });
 }
 for(const part of text.split(CUT))found.push({text:part,markup:html});
 const out=[];
 for(const {text:raw,markup} of found){
  // A choice between short texts gives every version, only within its own piece of text.
  let variants=[raw];
  for(const m of raw.matchAll(/\u0003(\d+)\u0003/g)){
   const options=choices[Number(m[1])]??[''];
   variants=variants.flatMap(v=>options.map(o=>v.replace(m[0],o))).slice(0,32);
  }
  for(const piece of variants){
   let n=0;const map=new Map();
   const key=normalize(decode(piece).replace(/\u0001(c?\d+)\u0001/g,(all,id)=>{if(!map.has(id))map.set(id,n++);return `{${map.get(id)}}`;}));
   if(key&&looksLikeText(key,markup))out.push(key);
  }
 }
 return out;
}

// Functions and constants that give markup: a call to one of them (or the constant) in a text is a cut, not a changing part.
// Per file, plus what a file imports from another file under that name (a helper called num() can be plain in one file).
const isMarkup=n=>(n.type==='Literal'&&typeof n.value==='string'&&/<[a-z/!]/i.test(n.value))||(n.type==='TemplateLiteral'&&n.quasis.some(q=>/<[a-z/!]/i.test(q.value.cooked??'')));
const hasMarkup=node=>{let yes=false;walk(node,n=>{if(!yes&&isMarkup(n))yes=true;});return yes;};
function localMarkup(ast){
 const names=new Set();
 walk(ast,node=>{
  if(node.type==='FunctionDeclaration'&&node.id&&hasMarkup(node.body))names.add(node.id.name);
  if(node.type==='VariableDeclarator'&&node.id.type==='Identifier'&&node.init){
   const init=node.init;
   if(/Function|Arrow/.test(init.type)?hasMarkup(init.body):init.type==='ObjectExpression'?init.properties.some(p=>p.value&&isMarkup(p.value)):isMarkup(init))names.add(node.id.name);
  }
  if(node.type==='Property'&&node.key.type==='Identifier'&&/Function|Arrow/.test(node.value?.type??'')&&hasMarkup(node.value.body))names.add(node.key.name);
  if(node.type==='MethodDefinition'&&node.key.type==='Identifier'&&hasMarkup(node.value.body))names.add(node.key.name);
 });
 return names;
}
function markupNames(sources,asts){
 const local=new Map(sources.map(({file},i)=>[file,localMarkup(asts[i])]));
 const resolve=(from,spec)=>{const parts=from.split('/').slice(0,-1);for(const bit of spec.split('/')){if(bit==='..')parts.pop();else if(bit!=='.')parts.push(bit);}return parts.join('/');};
 return new Map(sources.map(({file},i)=>{
  const names=new Set(['art','icon','svg','html',...local.get(file)]);
  for(const node of asts[i].body)if(node.type==='ImportDeclaration'&&node.source.value.startsWith('.')){
   const theirs=local.get(resolve(file,node.source.value));if(!theirs)continue;
   for(const spec of node.specifiers)if(spec.type==='ImportSpecifier'&&theirs.has(spec.imported.name))names.add(spec.local.name);
  }
  return [file,names];
 }));
}

function walk(node,visit,parent=null){
 if(!node||typeof node.type!=='string')return;
 visit(node,parent);
 for(const key of Object.keys(node)){
  if(key==='parent')continue;
  const value=node[key];
  if(Array.isArray(value))for(const child of value)walk(child,visit,node);
  else if(value&&typeof value.type==='string')walk(value,visit,node);
 }
}

// Calls whose string arguments are never shown to a player.
const QUIET_CALLS=/^(querySelector(All)?|closest|matches|getElementById|getElementsByClassName|add|remove|toggle|contains|replace|addEventListener|removeEventListener|setAttribute|getAttribute|hasAttribute|removeAttribute|toggleAttribute|createElement|createElementNS|getItem|setItem|removeItem|log|warn|error|info|debug|trackGame|trackCommerce|track|fetch|RegExp|Event|CustomEvent|rpc|from|select|eq|neq|in|order|channel|on|invoke|postMessage|getPropertyValue|setProperty|matchMedia|split|join|startsWith|endsWith|includes|indexOf|padStart|toLocaleString|toLocaleDateString|toLocaleTimeString|DateTimeFormat|NumberFormat|getContext|decodeURIComponent|encodeURIComponent|define|sendBeacon|keyTag|push|has|get|set|delete|test|exec|match|search|accountLog|logEvent|dispatch)$/;
function quiet(node,parent){
 if(!parent)return false;
 if(parent.type==='ImportDeclaration'||parent.type==='ExportNamedDeclaration'||parent.type==='ExportAllDeclaration'||parent.type==='ImportExpression')return true;
 if(parent.type==='Property'&&parent.key===node)return true;
 if(parent.type==='MemberExpression'&&parent.property===node)return true;
 if((parent.type==='BinaryExpression'&&/^(===|!==|==|!=|in|instanceof)$/.test(parent.operator)))return true;
 if(parent.type==='SwitchCase'&&parent.test===node)return true;
 if(parent.type==='CallExpression'||parent.type==='NewExpression'){
  const callee=parent.callee,name=callee.type==='Identifier'?callee.name:callee.type==='MemberExpression'&&!callee.computed?callee.property.name:'';
  // The first argument is a name, a selector or a key; a later one can be a text (setAttribute('aria-label','Close')).
  if(QUIET_CALLS.test(name)&&parent.arguments?.[0]===node)return true;
 }
 return false;
}

function fromScript(code,file,out,htmlNames){
 let ast;
 try{ast=parse(code,{ecmaVersion:'latest',sourceType:'module',allowHashBang:true,allowAwaitOutsideFunction:true,allowReturnOutsideFunction:true});}
 catch(error){throw new Error(`${file}: ${error.message}`);}
 return ast;
}

// A changing part: is it markup (a cut), a choice between short texts (both versions), or a value (a hole)?
function classify(expr,code,htmlNames){
 if(expr.type==='ConditionalExpression'){
  // A choice between two short texts: both versions. A branch may be a text with changing parts of its own.
  const branch=b=>b.type==='Literal'&&typeof b.value==='string'?b.value:b.type==='TemplateLiteral'&&!hasMarkup(b)&&b.expressions.every(e=>classify(e,code,htmlNames).hole)?b:null;
  const a=branch(expr.consequent),b=branch(expr.alternate);
  if(a!==null&&b!==null){
   const flat=[a,b].map(x=>typeof x==='string'?x:x.quasis.map(q=>q.value.cooked??'').join(''));
   return /<[a-z/!]/i.test(flat.join(''))?{cut:true}:{choice:[a,b]};
  }
 }
 const call=expr.type==='CallExpression'&&expr.callee.type==='MemberExpression'&&['map','join','flatMap'].includes(expr.callee.property.name);
 let cut=false;
 walk(expr,(n,parent)=>{
  if(cut)return;
  if(isMarkup(n))cut=true;
  else if(n.type==='CallExpression'){const c=n.callee,name=c.type==='Identifier'?c.name:c.type==='MemberExpression'&&!c.computed?c.property.name:'';if(htmlNames.has(name))cut=true;}
  else if(n.type==='Identifier'&&htmlNames.has(n.name)&&!(parent?.type==='MemberExpression'&&parent.property===n&&!parent.computed)&&!(parent?.type==='Property'&&parent.key===n))cut=true;
 });
 // A list joined together is a cut when its items carry markup; a list of numbers or words is a changing part.
 return cut?{cut:true}:call&&false?{cut:true}:{hole:true};
}

// Every version of a text made of fixed parts and changing parts (at most 16 versions).
function versions(parts,code,htmlNames){
 let text='',hole=0;const choices=[];
 for(const part of parts){
  if(typeof part==='string'){text+=part;continue;}
  const kind=classify(part,code,htmlNames);
  if(kind.cut)text+=CUT;
  else if(kind.choice){
   const options=kind.choice.map(o=>typeof o==='string'?o:o.quasis.map((q,i)=>(q.value.cooked??'')+(i<o.expressions.length?HOLE(hole++):'')).join(''));
   text+=`\u0003${choices.length}\u0003`;choices.push(options);
  }
  else text+=HOLE(hole++);
 }
 return {text,choices};
}

// The parts of a text joined with +. Only the strings of the chain itself are used up (never ones deeper inside a part).
function flattenPlus(node,parts,used){
 if(node.type==='BinaryExpression'&&node.operator==='+'){flattenPlus(node.left,parts,used);flattenPlus(node.right,parts,used);}
 else if(node.type==='Literal'&&typeof node.value==='string'){parts.push(node.value);used.add(node);}
 else if(node.type==='TemplateLiteral'){used.add(node);node.quasis.forEach((q,i)=>{parts.push(q.value.cooked??'');if(i<node.expressions.length)parts.push(node.expressions[i]);});}
 else parts.push(node);
}

function collectScript(code,file,catalog,htmlNames,ast){
 const done=new WeakSet();
 walk(ast,(node,parent)=>{
  if(done.has(node))return;
  let parts=null;
  if(node.type==='BinaryExpression'&&node.operator==='+'&&!(parent?.type==='BinaryExpression'&&parent.operator==='+')){
   const flat=[],used=new Set();flattenPlus(node,flat,used);
   if(flat.some(p=>typeof p==='string'&&/\p{L}/u.test(p))){parts=flat;for(const n of used)done.add(n);}
  }
  else if(node.type==='TemplateLiteral'&&parent?.type!=='TaggedTemplateExpression'){
   parts=[];node.quasis.forEach((q,i)=>{parts.push(q.value.cooked??'');if(i<node.expressions.length)parts.push(node.expressions[i]);});
  }
  else if(node.type==='Literal'&&typeof node.value==='string'&&!quiet(node,parent))parts=[node.value];
  if(!parts)return;
  const fixed=parts.filter(p=>typeof p==='string').join('');
  const html=/<\/?[a-z][^<>]*>/i.test(fixed)||/^\s*</.test(fixed);
  const {text,choices}=versions(parts,code,htmlNames);
  for(const key of pieces(text,html,choices))add(catalog,key,file);
 });
}

function add(catalog,key,file){if(!catalog.has(key))catalog.set(key,file);}

// The search and share texts in the sign-in page's head (Oct 2026): its page per language (/es/, scripts/build-languages.mjs) has
// them translated. The twitter ones are the same texts. The farm frame's head is never shown or searched, so it is left out.
const SEO_PAGE='public/play.html',SEO_META=/<meta (?:name|property)="(?:description|og:title|og:description|og:image:alt|twitter:title|twitter:description)" content="([^"]*)">/g;
function collectPage(file,catalog,htmlNames,scripts){
 let html=read(file);
 if(file===SEO_PAGE)for(const m of html.matchAll(SEO_META)){const key=normalize(decode(m[1]));if(key)add(catalog,key,file);}
 html=html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,(all,attrs,code)=>{if(code.trim()&&!/type="(?!module|text\/javascript)/.test(attrs))scripts.push({file,code});return CUT;}).replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,CUT).replace(/<head\b[^>]*>[\s\S]*?<\/head>/i,m=>m.replace(/<title>([\s\S]*?)<\/title>/i,'<title>$1</title>').replace(/<meta[^>]*>/gi,CUT));
 for(const key of pieces(html,true))add(catalog,key,file);
}

// Texts a database function hands back as its message (not an error), which the scan for "raise exception" does not see: what a
// Help, gift or event claim did (29 Sep 2026). Keep in step with the live functions (harvest_social, harvest_event_claim).
const SERVER_MESSAGES=['You helped with {0} coins. Thank you!','Your gift has arrived!','Request fulfilled. Your family thanks you!','Already completed.','Your family request is ready.','This reward was already collected.','Event rewards collected!'];
// One word in lower case the code shows on its own, which the scan takes for a name in the code: the reward cell under "1" in a
// family order (public/family-order-rewards.js, 1 Oct 2026).
const WORDS=['diamond'];
function collectSql(catalog){
 for(const key of SERVER_MESSAGES)add(catalog,key,'supabase/ (database messages)');
 for(const key of WORDS)add(catalog,key,'public/family-order-rewards.js');
 for(const dir of SQL_DIRS){
  if(!existsSync(new URL(dir,ROOT)))continue;
  for(const file of list(dir,f=>f.endsWith('.sql'))){
   for(const m of read(file).matchAll(/raise exception\s+'((?:[^']|'')*)'/gi)){
    let n=0;const key=normalize(m[1].replace(/''/g,"'").replace(/%/g,()=>`{${n++}}`));
    if(looksLikeText(key,false))add(catalog,key,file);
   }
  }
 }
}

export function extract(){
 const catalog=new Map(),scripts=[];
 for(const file of PAGES)collectPage(file,catalog,null,scripts);
 const sources=[...SOURCES.map(file=>({file,code:read(file)})),...scripts];
 const asts=sources.map(({file,code})=>fromScript(code,file));
 const names=markupNames(sources,asts);
 sources.forEach(({file,code},i)=>collectScript(code,file,catalog,names.get(file),asts[i]));
 collectSql(catalog);
 // Texts from the game that are never shown on their own (a crop's model name, ...) stay out of the catalog: see IGNORE.
 const ignore=new Set(JSON.parse(read('i18n/ignore.json')));
 return Object.fromEntries([...catalog].filter(([key])=>!ignore.has(key)).sort(([a],[b])=>a<b?-1:a>b?1:0));
}

if(import.meta.url===`file://${process.argv[1]}`){
 const catalog=extract();
 writeFileSync(new URL('i18n/catalog.json',ROOT),JSON.stringify(catalog,null,0).replace(/","/g,'",\n"').replace(/^\{/,'{\n')+'\n');
 console.log(`${Object.keys(catalog).length} texts in i18n/catalog.json`);
}
