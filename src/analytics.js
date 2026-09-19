// Events for Google Tag Manager (dataLayer). Only anonymous facts are ever pushed:
// never an email address, player name or account id.
export function pushEvent(name,params={},win=globalThis.window){
 if(!win)return;
 (win.dataLayer=win.dataLayer||[]).push({event:name,...params});
}

// Supabase answers an address that is already registered with a user that has no identities (and no
// error), so that sign-up forms cannot be used to find out who has an account. That is not a new
// registration and must not be counted as one.
export function isNewRegistration(data){
 const identities=data?.user?.identities;
 return !Array.isArray(identities)||identities.length>0;
}

// "sign_up" is the recommended GA4 event name for a new account. With email confirmation switched
// on, the account exists but the player still has to confirm it, which the flag tells apart.
export function trackSignUp({confirmationRequired=false}={},win){
 pushEvent('sign_up',{method:'email',email_confirmation_required:!!confirmationRequired},win);
}
