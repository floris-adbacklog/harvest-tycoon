// Pure helpers for the sign-in / sign-up card on play.html. No DOM and no network, so tests can run them.
export const MIN_PASSWORD=6;
export const NAME_HINT='Use 3–20 letters, numbers, spaces, underscores or hyphens.';

// What every mode of the card shows. `fields` lists the visible inputs in display order.
export const MODES=Object.freeze({
 signin:{eyebrow:'GOOD TO SEE YOU, FARMER',title:'Welcome home.',copy:'Sign in to pick up where you left off.',submit:'Sign in & play',fields:['email','password'],tabs:true,switch:{text:'New here?',label:'Create account',to:'register'}},
 register:{eyebrow:'NEW FARMERS WELCOME',title:'Start your farm.',copy:'Your first harvest is just around the corner.',submit:'Start my farm',fields:['email','password'],tabs:true,switch:{text:'Already have an account?',label:'Sign in',to:'signin'}},
 name:{eyebrow:'ALMOST THERE',title:'Meet your farmer.',copy:'Choose the name other farmers will see.',submit:'Open my farm',fields:['name'],tabs:false,switch:null},
 forgot:{eyebrow:'NO WORRIES',title:'Forgot your password?',copy:'Enter your email and we’ll send you a link to choose a new one.',submit:'Send reset link',fields:['email'],tabs:false,switch:{text:'',label:'← Back to sign in',to:'signin'}},
 recovery:{eyebrow:'ALMOST BACK IN',title:'Choose a new password.',copy:'Then we’ll open your farm.',submit:'Save & play',fields:['password'],tabs:false,switch:null},
 confirm:{eyebrow:'ONE LAST STEP',title:'Check your inbox.',copy:'',submit:'',fields:[],tabs:false,switch:null}
});

const ADJECTIVES=['Sunny','Happy','Golden','Cozy','Merry','Breezy','Lucky','Bright','Gentle','Rustic'];
const NOUNS=['Acres','Meadow','Orchard','Barn','Fields','Hollow','Valley','Harvest','Creek','Farm'];
// A friendly default player name that always passes the server rule, e.g. "Sunny Acres 4821".
export function randomPlayerName(random=Math.random){
 const pick=list=>list[Math.floor(random()*list.length)%list.length];
 return `${pick(ADJECTIVES)} ${pick(NOUNS)} ${1000+Math.floor(random()*9000)}`;
}

export const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value??'').trim());

// One message per field, so the form can point at exactly what needs fixing. `validName` is passed in
// because the player-name rule lives next to the Supabase client.
export function formErrors({mode,name='',email='',password=''},validName){
 const errors={},nameShown=mode==='name'||(mode==='register'&&name.trim()!=='');
 if(nameShown&&!validName(name))errors.name=NAME_HINT;
 if(['signin','register','forgot'].includes(mode)&&!validEmail(email))errors.email='Enter a valid email address, like you@example.com.';
 if(mode==='signin'&&!password)errors.password='Enter your password.';
 if((mode==='register'||mode==='recovery')&&password.length<MIN_PASSWORD)errors.password=`Use at least ${MIN_PASSWORD} characters.`;
 return errors;
}

// Turns a Supabase auth error into text for the player, the field it belongs to, and a stable reason
// (safe to send to analytics: never the raw message, which can contain an email address).
export function describeAuthError(error,fallback=e=>e?.message){
 const code=error?.code,status=error?.status,text=String(error?.message??'');
 if(code==='weak_password')return {field:'password',reason:'weak_password',message:`Choose a stronger password: at least ${MIN_PASSWORD} characters and not a common one.`};
 if(code==='user_already_exists'||code==='email_exists')return {field:'email',reason:'email_exists',message:'This email already has an account. Try signing in instead.'};
 if(code==='email_address_invalid'||code==='validation_failed')return {field:'email',reason:'invalid_email',message:'That email address does not look right. Please check it.'};
 if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit'||status===429)return {reason:'rate_limited',message:'Too many attempts. Please wait a few minutes and try again.'};
 if(code==='invalid_credentials')return {reason:'invalid_credentials',message:'The email address or password is incorrect.'};
 if(code==='email_not_confirmed')return {reason:'email_not_confirmed',resend:true,message:'Please confirm your email first. Use the link in your inbox, or send it again.'};
 if(code==='same_password')return {field:'password',reason:'same_password',message:'Choose a password you have not used before.'};
 if(/failed to fetch|networkerror|load failed|network request failed/i.test(text))return {reason:'network',message:'We could not reach the server. Check your connection and try again.'};
 return {reason:'other',message:fallback(error)||'Something went wrong. Please try again.'};
}
