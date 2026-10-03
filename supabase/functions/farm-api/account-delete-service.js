import {isAdminAccount} from './admin-service.js';
// Delete account (3 Oct 2026): Settings › Privacy in the game, on the website and in both apps (the App Store asks for it inside the app).
// Only ever the signed-in farmer (user.id from the verified token, never an id from the request), only with their farmer name typed
// exactly, never an admin account. Everything personal goes in one database function (supabase/delete-account.sql), then the Supabase
// Auth user itself; purchases stay for the bookkeeping, unlinked. At once, no grace period. The database checks the name and the admin
// again, so a rename or a second tab in between changes nothing.
export const DELETE_ADMIN='This is an admin account and cannot be deleted here.';
export const DELETE_WRONG_NAME='Type your farmer name exactly to delete your account.';
export const DELETE_PAYOUT_OPEN='Your partner payout is still open. Please contact support before you delete your account.';
export const DELETE_FAILED='Your account could not be deleted. Please try again.';
// The database's own refusals, said to the farmer as they are (the same texts).
const REFUSALS=[DELETE_ADMIN,DELETE_WRONG_NAME,DELETE_PAYOUT_OPEN];
// OneSignal (the apps' push notifications) keeps a user under the player id as external_id: removed too, once the account is gone, for a
// farmer who ever linked a phone. Best effort: without the key (ONESIGNAL_REST_API_KEY) or when OneSignal fails, nothing else changes.
export const ONESIGNAL_APP_ID='1d8ca7c0-fca0-48a9-b55e-e87b85802fad';
export async function forgetOneSignal(player,{apiKey,fetchImpl=globalThis.fetch}={}){
 if(!apiKey||!fetchImpl)return false;
 try{const response=await fetchImpl(`https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/users/by/external_id/${encodeURIComponent(player)}`,{method:'DELETE',headers:{Authorization:`Key ${apiKey}`,Accept:'application/json'}});return response.ok||response.status===404;}
 catch{return false;}
}
export async function handleDeleteAccount({admin,body,user,oneSignalKey='',fetchImpl}){
 if(!user?.id)return {status:401,data:{error:'Please sign in.'}};
 if(isAdminAccount(user))return {status:403,data:{error:DELETE_ADMIN,code:'ACTION_REJECTED'}};
 const typed=typeof body?.username==='string'?body.username.trim():'';
 if(!typed||typed.length>40)return {status:422,data:{error:DELETE_WRONG_NAME,code:'ACTION_REJECTED'}};
 const found=await admin.from('player_stats').select('username').eq('player_id',user.id).maybeSingle();
 if(found.error)throw found.error;
 // No stats left: a deletion whose last step (the Auth user) failed before, tried again; the database finds nothing more to delete.
 if(found.data&&found.data.username!==typed)return {status:422,data:{error:DELETE_WRONG_NAME,code:'ACTION_REJECTED'}};
 const deleted=await admin.rpc('harvest_delete_account',{p_player:user.id,p_name:typed});
 if(deleted.error){
  const refused=REFUSALS.find(text=>String(deleted.error.message??'').includes(text));
  if(refused)return {status:refused===DELETE_ADMIN?403:422,data:{error:refused,code:'ACTION_REJECTED'}};
  throw deleted.error;
 }
 const gone=await admin.auth.admin.deleteUser(user.id);
 if(gone.error){console.error('Account delete: the Auth user stayed',gone.error?.status??'',String(gone.error?.message??'').slice(0,120));return {status:503,data:{error:DELETE_FAILED,code:'SERVER_UNAVAILABLE'}};}
 if(Number(deleted.data?.app_push)>0)await forgetOneSignal(user.id,{apiKey:oneSignalKey,fetchImpl});
 return {status:200,data:{deleted:user.id}};
}
