import {describeAuthError} from './account-form.js';
// How you sign in (17 Oct 2026, the owner's pick "Doe alleen 1"): Settings, Your account says how this account signs in, so a farmer
// does not lose it. 1,242 reset mails went out in 30 days, many to farmers unsure how they sign in: a Google or Facebook farmer in our
// apps, which sign in with an email address and password only (every Android app, the iPhone app before 1.3), looks for a password
// they never had.
// One line ("You sign in with Google."), the account's address masked ("f…s@gmail.com", Show reveals it: farmers stream the game live),
// and for an account without a password one button, "Set a password": Supabase's own reset mail to that address, whose link opens the
// sign-in page's "Choose a new password." (src/main.js recovery), after which the email address and password work too, also in the apps.
// Only the signed-in farmer's own account (src/main.js bridge.signIn, from the user Supabase gave at the farm's start: no extra call,
// nothing from farm-api). Never on a portal (CrazyGames, Kongregate, Discord: the portal made that account) or in the admin view
// (src/game-cloud.js); the same in the Android and iPhone apps as on the website. What Settings draws is src/account-sign-in-ui.js; this file
// has no pictures, so the sign-in page (src/main.js, which builds the bridge from it) loads nothing more for it.

// The ways in, in the order they are named. 'email' is Supabase's email identity: the account has a password (a sign-up with email and
// password; Supabase adds Google or Facebook to it when that address signs in with them). A Google account that set a password through
// the reset mail keeps only its Google identity (Supabase adds no email identity then, unless its experimental
// CreateEmailIdentityOnPasswordSetEnabled is on). So the session says it too (17 Oct 2026, the review): one opened with that password
// (its amr says 'password': every Google farmer in the Android app, which signs in with email and password only), or the farm that
// opens straight after "Choose a new password." (src/main.js passwordSet; that session's amr is 'otp'), counts as email and password
// as well. A Google session of an account that has a password still cannot tell: it keeps the button, which then sets a new one.
export const SIGN_IN_METHODS=Object.freeze(['google','facebook','apple','discord','email']);
// Their names, as on the sign-in card's buttons (src/social-login.js SOCIAL_PROVIDERS; a test keeps them the same).
export const PROVIDER_NAMES=Object.freeze({google:'Google',facebook:'Facebook',apple:'Apple',discord:'Discord'});
// Apple's private relay ("Hide My Email"): said in words rather than shown as a jumble of letters, and never mailed (it drops mail from
// senders Apple does not know, supabase/functions/diamond-checkout/checkout-session.js), so no Set a password there.
export const APPLE_RELAY=/@privaterelay\.appleid\.com$/i;
// A portal's made-up address (crazygames-auth, kongregate-auth, discord-auth: no mailbox): such an account never shows the line.
export const PORTAL_MAIL=/@players\.harvesttycoon\.com$/i;
export const RELAY_TEXT='Apple’s private address (Hide My Email)';
export const SET_PASSWORD='Set a password';
// What happens next, said honestly (17 Oct 2026, the review): the mail is Supabase's reset mail, so its title is named ("Choose a new
// password", auth-email texts.js, in each language its own); its link opens in the browser, never in our apps (no app links); and a
// password once set signs the account out everywhere else (Supabase's password change keeps only the session that set it), the app
// the farmer tapped in too. No promise of Google: the Android app signs in with email and password only.
export const PASSWORD_SENT='We sent you an email, “Choose a new password”. Tap its button to choose your password in your browser. Then sign in again with your email address and password wherever else you play, for example in our apps.';
// Whole sentences, so every language can say them its own way; a mix of ways (a few accounts) names the providers.
export const ONE_WAY=Object.freeze({google:'You sign in with Google.',facebook:'You sign in with Facebook.',apple:'You sign in with Apple.',discord:'You sign in with Discord.',email:'You sign in with your email address and password.'});

export const usableAddress=value=>{const text=typeof value==='string'?value.trim():'';const at=text.lastIndexOf('@');return at>0&&at<text.length-1&&!/\s/.test(text)?text:'';};
// A session opened with a password: its amr (the access token's, as supabase-js getAuthenticatorAssuranceLevel reads it without a call;
// farm-api index.ts reads the same claim) names 'password'. Entries are {method,timestamp}; anything else counts as no.
export const passwordSession=amr=>Array.isArray(amr)&&amr.some(entry=>(entry&&typeof entry==='object'?entry.method:entry)==='password');
// What the page needs from Supabase's user (getUser): the address and the ways in, from its identities and app_metadata.providers (both,
// as discord-auth hasOAuth reads them), else app_metadata.provider; password: this session shows the account has one (passwordSession,
// or the password was just set), so email and password is a way in too. null: nothing to say (no user, a portal account, no known way).
export function signInOf(user,{password=false}={}){
 if(!user||typeof user!=='object'||user.is_anonymous||user.app_metadata?.portal)return null;
 const email=usableAddress(user.email);if(PORTAL_MAIL.test(email))return null;
 const found=new Set();
 for(const identity of Array.isArray(user.identities)?user.identities:[])found.add(identity?.provider);
 for(const provider of Array.isArray(user.app_metadata?.providers)?user.app_metadata.providers:[])found.add(provider);
 if(!found.size)found.add(user.app_metadata?.provider);
 if(password===true)found.add('email');
 const methods=SIGN_IN_METHODS.filter(method=>found.has(method));
 return methods.length?{email,methods}:null;
}
// Set a password: an account with an address it can be mailed at and no email identity (no password the page knows of).
export const canSetPassword=info=>Boolean(info?.email)&&Array.isArray(info.methods)&&info.methods.length>0&&!info.methods.includes('email')&&!APPLE_RELAY.test(info.email);
// "f…s@gmail.com": the first and last character of the part before the @ (letters as the eye sees them: é, 😀), the whole domain. Two
// characters keep only the first ("a…@x.com") and one none ("…@x.com"), so that part is never shown whole. '' for no usable address.
const graphemes=text=>{try{return [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].map(part=>part.segment);}catch{return Array.from(text);}};
export function maskEmail(value){
 const email=usableAddress(value);if(!email)return '';
 const at=email.lastIndexOf('@'),local=graphemes(email.slice(0,at));
 return `${local.length>1?local[0]:''}…${local.length>2?local.at(-1):''}@${email.slice(at+1)}`;
}
export function signInSentence(methods){
 const ways=SIGN_IN_METHODS.filter(method=>Array.isArray(methods)&&methods.includes(method));
 if(ways.length===1)return ONE_WAY[ways[0]];
 const brands=ways.filter(method=>method!=='email').map(method=>PROVIDER_NAMES[method]);
 if(!brands.length)return '';
 if(ways.includes('email'))return `You sign in with ${brands.join(', ')} or with your email address and password.`;
 return `You sign in with ${brands.slice(0,-1).join(', ')} or ${brands.at(-1)}.`;
}
// The bridge's Set a password (src/main.js): Supabase's reset mail to the account's own address, with the same return address as the
// sign-in card's "Forgot your password?" (play.html, whose recovery mode asks for the new password). A refusal in the farmer's words
// (describeAuthError: too many attempts, no connection), never Supabase's own English.
export function passwordMail({auth,email,redirectTo,online=()=>true,track=()=>{}}){
 return async()=>{
  if(!usableAddress(email))throw new Error('Something went wrong. Please try again.');
  if(!online())throw new Error('We could not reach the server. Check your connection and try again.');
  let failure=null;
  try{const {error}=await auth.resetPasswordForEmail(email,{redirectTo});failure=error??null;}catch(error){failure=error;}
  if(failure){const problem=describeAuthError(failure,()=>null);track('error',{mode:'set_password',reason:problem.reason});throw new Error(problem.message);}
  track('set_password_sent');
 };
}
