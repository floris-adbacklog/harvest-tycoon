// A new version of the game. An installed app often stays open for days, so after a deploy it would keep running the old files. When the
// game comes back on screen after a minute or more away, this checks /version.json (written by scripts/build-static.mjs on every deploy)
// and reloads when the version differs. It never reloads while someone is playing, only on the way back in; the farm is on the server,
// so nothing is lost.
export const UPDATE_AFTER_HIDDEN=60*1000,UPDATE_POLL=30*60*1000;
export function startUpdateCheck({doc=globalThis.document,win=globalThis.window,fetchImpl=globalThis.fetch,now=()=>Date.now()}={}){
 const current=doc?.querySelector?.('meta[name="harvest-version"]')?.content;
 if(!current||current==='dev')return null;
 let hiddenAt=0,newer=false;
 async function check(){
  try{const response=await fetchImpl('/version.json',{cache:'no-store'});if(!response.ok)return false;const {version}=await response.json();newer=typeof version==='string'&&version!==current;}
  catch{}
  return newer;
 }
 // While playing, only note that a newer version exists; the reload waits for the next return.
 const timer=win.setInterval(()=>{if(!doc.hidden)void check();},UPDATE_POLL);
 doc.addEventListener('visibilitychange',async()=>{
  if(doc.hidden){hiddenAt=now();return;}
  const away=hiddenAt?now()-hiddenAt:0;hiddenAt=0;
  if(away<UPDATE_AFTER_HIDDEN)return;
  if(newer||await check())win.location.reload();
 });
 return {check,stop:()=>win.clearInterval(timer)};
}
