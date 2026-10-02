import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readSource,sourceQuery,sourceHost,SOURCE_CARRY} from '../src/source-link.js';
import {escapeTarget,appKey} from '../src/browser-tip.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const SITE='https://www.harvesttycoon.com';

// 2 Oct 2026: where a new farmer came from, read once from the address they landed on and kept in memory only (nothing on the device).
test('our ?src= tag, the ad\'s utm_* and the click ids (only yes or no) are read from the address',()=>{
 const s=readSource({href:`${SITE}/?src=Reddit-CozyGames&utm_source=facebook&utm_medium=paid&utm_campaign=EU%20autumn%20%7C%20cozy&utm_content=video_2&fbclid=IwAR123&ttclid=E.C.P&gclid=Cj0K`,pathname:'/'});
 assert.deepEqual(s,{src:'reddit-cozygames',utm_source:'facebook',utm_medium:'paid',utm_campaign:'EU autumn | cozy',utm_content:'video_2',fb:true,tt:true,g:true,lp:'/'});
 assert.ok(!JSON.stringify(s).includes('IwAR123'),'never the click id itself');
 assert.deepEqual(readSource({href:`${SITE}/play.html`,pathname:'/play.html'}),{lp:'/play.html'},'nothing to tell: Direct, from the page they landed on');
 assert.equal(readSource({href:undefined}),null);assert.equal(readSource(),null);
});
test('junk is left out: markup, values that are too long, empty click ids, and ?source=pwa (the app\'s own start)',()=>{
 const s=readSource({href:`${SITE}/?src=%3Cscript%3E&utm_source=%3Cb%3Ex%3C%2Fb%3E&utm_campaign=${'a'.repeat(101)}&utm_medium=%7B%7Bcampaign.name%7D%7D&fbclid=&source=pwa&via=snapchat&lp=/../x%3F`,pathname:'/'});
 assert.deepEqual(s,{lp:'/'});
 assert.equal(readSource({href:`${SITE}/?src=${'a'.repeat(49)}`,pathname:'/'}).src,undefined,'a tag is at most 48 characters');
 assert.equal(readSource({href:`${SITE}/?src=${'a'.repeat(48)}`,pathname:'/'}).src,'a'.repeat(48));
 assert.equal(readSource({href:`${SITE}/?src=-x`,pathname:'/'}).src,undefined,'a tag starts with a letter or a digit');
});
test('the website that linked is only its domain; never our own site, the sign-in service, or a page coming back from a sign-in',()=>{
 const from=(referrer,extra={})=>readSource({href:`${SITE}/`,pathname:'/',referrer,...extra}).ref;
 assert.equal(from('https://www.reddit.com/r/CozyGamers/comments/abc/'),'reddit.com');
 assert.equal(from('https://l.facebook.com/l.php?u=x'),'facebook.com');assert.equal(from('http://m.facebook.com/'),'facebook.com');assert.equal(from('https://lm.facebook.com/'),'facebook.com');
 assert.equal(from('https://old.reddit.com/'),'old.reddit.com');
 for(const own of [`${SITE}/wiki`,'https://harvesttycoon.com/partners','https://jnmdirvidffzxukbdmij.supabase.co/auth/v1/callback',''])assert.equal(from(own),undefined,own);
 assert.equal(from('https://accounts.google.com/',{authReturn:true}),undefined,'after a sign-in the referrer is Google or Facebook');
 // rd= (carried through the sign-in) always wins over the browser's referrer.
 assert.equal(readSource({href:`${SITE}/play.html?rd=reddit.com`,pathname:'/play.html',referrer:'https://accounts.google.com/'}).ref,'reddit.com');
 assert.equal(readSource({href:`${SITE}/play.html?rd=none`,pathname:'/play.html',referrer:'https://www.facebook.com/'}).ref,undefined);
 assert.equal(readSource({href:`${SITE}/play.html?rd=${encodeURIComponent('<x>')}`,pathname:'/play.html'}).ref,undefined);
 assert.equal(sourceHost('https://www.harvesttycoon.com/',''),null);assert.equal(sourceHost('http://localhost:3000/','localhost'),null);assert.equal(sourceHost('not a url'),null);
});
test('the app and the landing page come along through a sign-in: via and lp',()=>{
 const s=readSource({href:`${SITE}/play.html?via=instagram&lp=/es/&rd=instagram.com`,pathname:'/play.html'});
 assert.deepEqual(s,{ref:'instagram.com',via:'instagram',lp:'/es/'});
 for(const [ua,key] of [['… [FB_IAB/FB4A;FBAV/484.0]','facebook'],['… Instagram 400.0','instagram'],['… Barcelona 350.0','threads'],['… musical_ly_41.2.0','tiktok'],['Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1',null],['… Snapchat/12',null]])assert.equal(appKey(ua),key,ua);
});
test('a sign-in or email link takes only these parameters along, exactly as they are, and always says where the farmer came from (rd)',()=>{
 const href=`${SITE}/?src=reddit-cozygames&utm_source=tiktok&utm_campaign=eu&fbclid=IwAR123&invite=FARM2026&code=abc&access_token=t&x=1&source=pwa`;
 const carried=sourceQuery(href,readSource({href,pathname:'/',referrer:'https://www.reddit.com/'}));
 assert.deepEqual(carried,[['src','reddit-cozygames'],['utm_source','tiktok'],['utm_campaign','eu'],['fbclid','IwAR123'],['rd','reddit.com']],'the real click id, for Meta after Accept; nothing else');
 assert.deepEqual(sourceQuery(`${SITE}/es/`,{lp:'/es/',via:'facebook'}),[['rd','none'],['lp','/es/'],['via','facebook']]);
 assert.deepEqual(sourceQuery(`${SITE}/play.html`,null),[['rd','none']]);
 assert.deepEqual(sourceQuery(undefined,{}),[],'no address, nothing to carry');
 assert.deepEqual([...SOURCE_CARRY],['src','utm_source','utm_medium','utm_campaign','utm_content','fbclid','ttclid','gclid']);
 assert.equal(sourceQuery(`${SITE}/?gclid=${'x'.repeat(501)}`,{}).length,1,'an address that is far too long is not copied');
});
test('the phone\'s browser gets the website and the app too; the old call without them is unchanged',()=>{
 const page={origin:SITE,pathname:'/play.html',search:'?code=abc&error=x&utm_campaign=eu'};
 assert.equal(escapeTarget(page,'FARM2026'),`${SITE}/play.html?utm_campaign=eu&invite=FARM2026`);
 assert.equal(escapeTarget(page,null,null),`${SITE}/play.html?utm_campaign=eu`);
 assert.equal(escapeTarget(page,null,'GREENA123',{rd:'facebook.com',via:'facebook'}),`${SITE}/play.html?utm_campaign=eu&ref=GREENA123&rd=facebook.com&via=facebook`);
 assert.equal(escapeTarget({...page,search:'?rd=reddit.com&via=tiktok'},null,null,{rd:'facebook.com',via:'facebook'}),`${SITE}/play.html?rd=reddit.com&via=tiktok`,'what the address already says stays');
 assert.equal(escapeTarget(page,null,null,{}),`${SITE}/play.html?utm_campaign=eu`);
});
test('main.js: read at the start, never stored on the device, along with Google, Facebook and the email links, the sign-up and the first load',()=>{
 const main=read('src/main.js');
 assert.match(main,/let pendingSource=readSource\(\{href:location\.href,pathname:location\.pathname,referrer:document\.referrer,authReturn:Boolean\(tabStore\.get\(OAUTH_KEY\)\|\|linkKind\(\)\|\|/);
 assert.ok(main.indexOf('let pendingSource=readSource(')<main.indexOf('oauthProvider=tabStore.get(OAUTH_KEY);tabStore.remove(OAUTH_KEY)'),'read before the sign-in marker is removed');
 assert.match(main,/signInWithOAuth\(\{provider,options:\{redirectTo:redirectUrl\(true\)\}\}\)/);
 assert.match(main,/\.\.\.\(pendingSource\?\{source:pendingSource\}:\{\}\)\},emailRedirectTo:redirectUrl\(true\)\}\}\);/,'the sign-up keeps it on the account and its link brings it back');
 assert.match(main,/supabase\.auth\.resend\(\{type:'signup',email:pendingEmail,options:\{emailRedirectTo:redirectUrl\(true\)\}\}\)/);
 assert.equal((main.match(/resetPasswordForEmail\([^)]*\{redirectTo:redirectUrl\(\)\}\)/g)??[]).length,2,'a password reset needs none of it');
 assert.match(main,/\.\.\.\(pendingSource\?\{source:pendingSource\}:\{\}\)\}\);clearInvite\(localStore\);clearRef\(localStore\);pendingSource=null;/);
 assert.match(main,/escapeTarget\(location,pendingInvite\(localStore\),pendingRef\(localStore\),\{rd:pendingSource\?\.ref,via:appKey\(ua\)\}\)/);
 const link=read('src/source-link.js');assert.doesNotMatch(link,/localStorage|sessionStorage|replaceState|document\.cookie/,'nothing on the device, and the address bar stays as it is (GTM reads it after Accept)');
 // The page's first script must not mistake the carried parameters for a sign-in answer.
 const pre=/!\/(access_token=\|refresh_token=\|\[\?&#\]code=\|type=\|error)\/\.test\(q\)/.exec(read('public/play.html'));assert.ok(pre,'the inline check is still there');
 assert.ok(!new RegExp(pre[1]).test(`&${sourceQuery(`${SITE}/?src=reddit-cozygames&utm_source=x`,{lp:'/es/',via:'tiktok'}).map(([k,v])=>`${k}=${v}`).join('&')}`));
});
test('the privacy policy says what is recorded and lists the partner link\'s storage',()=>{
 const privacy=read('public/privacy.html');
 assert.match(privacy,/<h3>How you found us<\/h3>/);assert.match(privacy,/never the click ID itself/);assert.match(privacy,/If you sign up with an email address, it is also saved with your account right away/,'the sign-up keeps it on the account (user_metadata.source)');assert.match(privacy,/Nothing for this is stored on your device/);
 assert.match(privacy,/<strong>To learn which links, websites and ads bring new farmers<\/strong>[^<]*<a href="#what-we-collect">section 2<\/a>; no cookies, nothing stored on your device\)\. Legal basis: our legitimate interest/);
 assert.match(privacy,/<li><strong>How you found us<\/strong>: for as long as your account exists\.<\/li>/);
 assert.match(privacy,/<code>harvest-tycoon:partner-ref<\/code>/);
});
