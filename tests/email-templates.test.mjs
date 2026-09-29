import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LANGUAGES} from '../public/languages.js';
import {TEMPLATES,templateHtml,subjectLine} from '../scripts/email-templates.mjs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// A stand-in for the part of Go templates the files use: variables (:= and =), printf "%v", eq, if / else if / else / end,
// output of a variable or a field, and {{- -}} trimming. Anything else throws, so the files cannot drift into other syntax.
function render(source,data){
 const tokens=[];let at=0;
 for(const m of source.matchAll(/\{\{(-?)\s*([\s\S]*?)\s*(-?)\}\}/g)){
  let text=source.slice(at,m.index);
  if(m[1])text=text.replace(/\s+$/,'');
  if(tokens.length&&tokens.at(-1).trimAfter)text=text.replace(/^\s+/,'');
  tokens.push({text},{action:m[2],trimAfter:Boolean(m[3])});at=m.index+m[0].length;
 }
 let tail=source.slice(at);if(tokens.length&&tokens.at(-1).trimAfter)tail=tail.replace(/^\s+/,'');tokens.push({text:tail});
 const vars={},value=expr=>{
  let m;
  if((m=expr.match(/^"([^"]*)"$/)))return m[1];
  if((m=expr.match(/^printf "%v" \.Data\.(\w+)$/)))return data.Data?.[m[1]]==null?'<nil>':String(data.Data[m[1]]);
  if((m=expr.match(/^\$(\w+)$/))){if(!(m[1] in vars))throw Error(`undefined variable ${expr}`);return vars[m[1]];}
  if((m=expr.match(/^\.(\w+)$/)))return data[m[1]];
  throw Error(`unsupported expression: ${expr}`);
 };
 const test=cond=>{const m=cond.match(/^eq (\S+) (\S+)$/);if(!m)throw Error(`unsupported condition: ${cond}`);return value(m[1])===value(m[2]);};
 let out='';const stack=[];const active=()=>stack.every(s=>s.on);
 for(const t of tokens){
  if('text' in t){if(active())out+=t.text;continue;}
  const a=t.action;let m;
  if((m=a.match(/^if (.+)$/))){const on=active()&&test(m[1]);stack.push({on,done:on});}
  else if((m=a.match(/^else if (.+)$/))){const s=stack.at(-1);if(!s)throw Error('else without if');stack.pop();const on=!s.done&&active()&&test(m[1]);stack.push({on,done:s.done||on});}
  else if(a==='else'){const s=stack.at(-1);if(!s)throw Error('else without if');s.on=!s.done;s.done=true;}
  else if(a==='end'){if(!stack.pop())throw Error('end without if');}
  else if((m=a.match(/^\$(\w+) (:=|=) (.+)$/))){if(active()){if(m[2]==='='&&!(m[1] in vars))throw Error(`assigning undeclared ${m[1]}`);vars[m[1]]=value(m[3]);}else if(m[2]===':=')vars[m[1]]??=undefined;}
  else if(active())out+=value(a);
 }
 if(stack.length)throw Error('unclosed if');
 return out;
}

test('the Auth email templates are the generated ones, with every game language',()=>{
 for(const [name,texts] of Object.entries(TEMPLATES)){
  assert.equal(read(`supabase/email-templates/${name}.html`),templateHtml(texts),`${name}: run node scripts/email-templates.mjs`);
  assert.deepEqual(Object.keys(texts).sort(),LANGUAGES.map(l=>l.code).sort(),name);
  for(const [code,t] of Object.entries(texts))for(const field of ['subject','title','pre','intro','button','foot'])assert.ok(t[field],`${name} ${code} ${field}`);
 }
 assert.ok(read('supabase/email-templates/subjects.txt').includes(subjectLine(TEMPLATES['reset-password'])));
});

test('each template renders in the account\'s language, and in English when it is missing or unknown',()=>{
 const url='https://example.com/auth/v1/verify?token=abc&type=recovery';
 for(const [name,texts] of Object.entries(TEMPLATES)){
  const html=read(`supabase/email-templates/${name}.html`);
  for(const code of Object.keys(texts)){
   const out=render(html,{ConfirmationURL:url,Data:{language:code}});
   assert.ok(out.startsWith('<!doctype html>'),`${name} ${code}: nothing before the doctype`);
   assert.ok(out.includes(`<html lang="${code}">`),`${name} ${code}`);
   assert.ok(out.includes(`>${texts[code].title}</h1>`),`${name} ${code}`);
   assert.ok(out.includes(`>${texts[code].button}</a>`),`${name} ${code}`);
   assert.equal(out.split(url).length-1,3,'the link is in the button and twice in the copy line');
   assert.ok(!out.includes('{{'),`${name} ${code}`);
   assert.equal(render(subjectLine(texts),{Data:{language:code}}),texts[code].subject);
  }
  for(const data of [{},{language:null},{language:'xx'}]){
   assert.ok(render(html,{ConfirmationURL:url,Data:data}).includes(`>${texts.en.title}</h1>`),`${name}: English fallback`);
   assert.equal(render(subjectLine(texts),{Data:data}),texts.en.subject);
  }
 }
});

test('the game language is saved on the account for these emails: at sign-up and when the game loads',()=>{
 assert.match(read('src/main.js'),/signUp\(\{email,password,options:\{data:\{username:name,language:chosenLanguage\(\)/);
 assert.match(read('supabase/functions/farm-api/index.ts'),/user\.user_metadata\?\.language!==body\.language\)\{\s*const saved=admin\.auth\.admin\.updateUserById\(user\.id,\{user_metadata:\{language:body\.language\}\}\)/);
});
