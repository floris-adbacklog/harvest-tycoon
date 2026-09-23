import {createClient} from '@supabase/supabase-js';
import {describeFailure,connectionMessage,safeToRepeat,withRetry} from './connection.js';
import {enabledProviders} from './social-login.js';
const url=import.meta.env.VITE_SUPABASE_URL?.trim();
const key=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const isConfigured=Boolean(url&&key);
export const functionsUrl=url?`${url.replace(/\/$/,'')}/functions/v1`:null;
export const supabase=isConfigured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'harvest-tycoon:auth'}}):null;
// Which of Google / Facebook sign-in are switched on in Supabase (an empty list until they are).
export const socialProviders=()=>isConfigured?enabledProviders({url,key}):Promise.resolve([]);
export const validUsername=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$/.test(value.trim());
export function cloudError(error){
 if(error?.code==='invalid_credentials')return 'The email address or password is incorrect.';
 if(error?.code==='email_not_confirmed')return 'Please confirm your email address using the link in your inbox.';
 return error?.message||'We could not connect. Please try again.';
}
export async function verifiedUser(){
 const {data:{session},error}=await supabase.auth.getSession();if(error)throw error;
 if(!session||session.user.is_anonymous)return null;
 const checked=await supabase.auth.getUser();
 if(checked.error){if(checked.error.status===401||checked.error.status===403)return null;const {kind,transient}=describeFailure(checked.error);throw Object.assign(checked.error,{kind,transient});}
 return checked.data.user?.is_anonymous?null:checked.data.user;
}
// One call to the farm. A failure says what kind it was (kind, transient) so the caller knows whether trying again can help.
async function farmRequestOnce(body){
 const {data,error}=await supabase.functions.invoke('farm-api',{body,timeout:20000});
 if(error){let detail;try{detail=await error.context?.json();}catch{}
  const {kind,transient,status,code}=describeFailure(error,detail);
  const failure=new Error(detail?.error||connectionMessage(kind,globalThis.navigator?.onLine));
  Object.assign(failure,{status,code,kind,transient});throw failure;
 }
 return data;
}
// A request that cannot go wrong twice (see safeToRepeat) is repeated a few times when the connection fails, with the same
// body, so with the same request ID. {retry:false} is for checks that are repeated by the caller anyway.
export function farmRequest(body,{retry=true}={}){return withRetry(()=>farmRequestOnce(body),{repeatable:retry&&safeToRepeat(body)});}
export async function paymentRequest(body){
 const {data,error}=await supabase.functions.invoke('diamond-checkout',{body,timeout:20000});
 if(error){let detail;try{detail=await error.context?.json();}catch{}throw new Error(detail?.error||'Could not connect to checkout. Please try again.');}
 return data;
}
