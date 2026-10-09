// Accounts made for a game portal (Oct 2026): a CrazyGames player, guest or logged in to CrazyGames, plays on an ordinary account
// made by the crazygames-auth Edge Function, marked app_metadata.portal='crazygames' (and app_metadata.guest=true for a guest); a
// player signed in to Kongregate on one made by kongregate-auth, marked app_metadata.portal='kongregate' (no guests there).
// Its address on players.harvesttycoon.com is made up: no mailbox, never mailed, never changed (supabase/crazygames.sql,
// supabase/kongregate.sql).
export const PORTALS=Object.freeze({crazygames:'CrazyGames',kongregate:'Kongregate'});
export const PORTAL_MAIL=/@players\.harvesttycoon\.com$/i;
export function portalOf(user){
 const id=user?.app_metadata?.portal;
 return typeof id==='string'&&Object.hasOwn(PORTALS,id)?{id,name:PORTALS[id],guest:user.app_metadata.guest===true}:null;
}
