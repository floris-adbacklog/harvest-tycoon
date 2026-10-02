// Where a new farmer came from (2 Oct 2026, supabase/player-attribution.sql): read once from the address they landed on, kept in
// memory only (nothing on the device, so it needs no cookie choice), and sent with the sign-up and the first farm load. The server
// records it once, for a brand-new farm (supabase/functions/farm-api/source-service.js checks it all again). The address bar keeps
// every parameter: Google Tag Manager may load later (after Accept) and reads utm_* and the ad click ids there itself.
// Our own tag is ?src= (lower case): ?source= is taken by the app's own start (?source=pwa) and is ignored.
export const SOURCE_TAG=/^[a-z0-9][a-z0-9_.-]{0,47}$/,SOURCE_UTM=/^[\p{L}\p{N} _.+\-/|:]{1,100}$/u,SOURCE_HOST=/^[a-z0-9.-]{1,100}$/,SOURCE_PATH=/^\/[A-Za-z0-9/_.-]{0,63}$/;
export const SOURCE_APPS=Object.freeze(['facebook','instagram','threads','tiktok']),SOURCE_UTMS=Object.freeze(['utm_source','utm_medium','utm_campaign','utm_content']);
// What a sign-in with Google or Facebook (and an email link) takes along to /play.html and back: these parameters exactly as they
// are (the real click ids too, so Meta and TikTok still see their ad after Accept; our database only ever gets yes or no).
export const SOURCE_CARRY=Object.freeze(['src',...SOURCE_UTMS,'fbclid','ttclid','gclid']);
// The website that linked, as a domain only ("reddit.com"): www., m., l. and lm. go (l.facebook.com is Facebook's link shim); our
// own site and the sign-in service (supabase.co) are not a source.
export function sourceHost(value,own=''){
 const text=String(value??'').trim();if(!text)return null;
 let host;try{host=new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text)?text:`https://${text}`).hostname.toLowerCase().replace(/^(www|m|l|lm)\./,'');}catch{return null;}
 const mine=String(own??'').toLowerCase().replace(/^www\./,''),under=base=>base&&(host===base||host.endsWith(`.${base}`));
 if(!SOURCE_HOST.test(host)||under(mine)||under('harvesttycoon.com')||under('supabase.co'))return null;
 return host;
}
// {src, utm_source, utm_medium, utm_campaign, utm_content, fb, tt, g, ref, via, lp}, each only when there is one; null without an
// address. After a sign-in (authReturn) the browser's referrer is Google, Facebook or the sign-in service, so it is not read then;
// rd= (which every carried address has, 'none' when there was no website) always wins over it.
export function readSource({href,pathname,referrer,authReturn=false}={}){
 let url;try{url=new URL(href);}catch{return null;}
 const get=key=>(url.searchParams.get(key)??'').trim(),source={},tag=get('src').toLowerCase();
 if(SOURCE_TAG.test(tag))source.src=tag;
 for(const key of SOURCE_UTMS)if(SOURCE_UTM.test(get(key)))source[key]=get(key);
 if(get('fbclid'))source.fb=true;if(get('ttclid'))source.tt=true;if(get('gclid'))source.g=true;
 const rd=url.searchParams.get('rd'),ref=rd!==null?(rd==='none'?null:sourceHost(rd,url.hostname)):authReturn?null:sourceHost(referrer,url.hostname);
 if(ref)source.ref=ref;
 if(SOURCE_APPS.includes(get('via')))source.via=get('via');
 const lp=[get('lp'),pathname??url.pathname].find(path=>SOURCE_PATH.test(path));if(lp)source.lp=lp;
 return source;
}
// The parameters for the address a sign-in or email link comes back to: the ones above from this address, rd (the website, or
// 'none'), the page they landed on when it was not the home page, and the app they came from.
export function sourceQuery(href,source){
 let url;try{url=new URL(href);}catch{return [];}
 const carried=SOURCE_CARRY.map(key=>[key,url.searchParams.get(key)]).filter(([,value])=>value&&value.length<=500);
 carried.push(['rd',source?.ref||'none']);
 if(source?.lp&&!['/','/play.html'].includes(source.lp))carried.push(['lp',source.lp]);
 if(source?.via)carried.push(['via',source.via]);
 return carried;
}
