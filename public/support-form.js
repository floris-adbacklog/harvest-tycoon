// The support form's draft (3 Oct 2026, public/support.html): what a farmer types is kept in this tab (sessionStorage) and put back when
// the support Edge Function sends them back with #error-…, so a refused or failed message is never typed twice; #sent forgets it. Only
// what this tab already had, never sent anywhere. The page works without it (no storage, no script: the form is simply empty).
(function(){
 var KEY='harvest-tycoon:support-draft',FIELDS=['email','name','topic','message'],form=document.querySelector('.support-form'),store=null;
 try{store=window.sessionStorage;}catch(e){}
 if(!form||!store)return;
 if(location.hash==='#sent'){try{store.removeItem(KEY);}catch(e){}return;}
 var draft=null;try{draft=JSON.parse(store.getItem(KEY)||'null');}catch(e){}
 // A field the browser already filled in (its own Back) is left as it is; the topic always follows the draft.
 if(draft&&typeof draft==='object')FIELDS.forEach(function(name){
  var field=form.elements[name],value=draft[name];
  if(!field||typeof value!=='string'||!value)return;
  if(field.tagName==='SELECT'?[].some.call(field.options,function(option){return option.value===value;}):!field.value)field.value=value;
 });
 function save(){
  var next={};FIELDS.forEach(function(name){var field=form.elements[name];if(field)next[name]=String(field.value||'').slice(0,4000);});
  try{store.setItem(KEY,JSON.stringify(next));}catch(e){}
 }
 form.addEventListener('input',save);form.addEventListener('change',save);form.addEventListener('submit',save);
})();
