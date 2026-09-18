import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL?.trim();
const key=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const isConfigured=Boolean(url&&key);
export const supabase=isConfigured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'harvest-tycoon:auth'}}):null;
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
 if(checked.error){if(checked.error.status===401||checked.error.status===403)return null;throw checked.error;}
 return checked.data.user?.is_anonymous?null:checked.data.user;
}
export async function farmRequest(body){
 const {data,error}=await supabase.functions.invoke('farm-api',{body,timeout:20000});
 if(error){let detail;try{detail=await error.context?.json();}catch{}
  const failure=new Error(detail?.error||'Your farm could not be reached. Check your connection and try again.');
  failure.status=error.context?.status;failure.code=detail?.code;throw failure;
 }
 return data;
}
export async function paymentRequest(body){
 const {data,error}=await supabase.functions.invoke('diamond-checkout',{body,timeout:20000});
 if(error){let detail;try{detail=await error.context?.json();}catch{}throw new Error(detail?.error||'Could not connect to checkout. Please try again.');}
 return data;
}
