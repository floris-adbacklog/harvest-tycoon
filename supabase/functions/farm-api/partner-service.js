// The partner programme (supabase/partners.sql, 1 Oct 2026), apart from Invite a friend: a brand-new farm that started with a
// partner's link (?ref=CODE, src/partner-link.js) belongs to that partner for good. A partner's own account, an unknown code or a
// farm that already exists is never linked; the first link stays.
// Since 24 Oct 2026 (supabase/partner-signup-bonus.sql) a link may also use the partner's alias (their name in the link), and a
// partner may give new farmers diamonds to start with (signup_diamonds) under the name they see (label). The referral keeps the
// partner's own code. The answer says what the new farm gets: {code, diamonds, label}, diamonds only when this load made the link.
const CODE=/^[A-Z0-9]{4,20}$/;
export const cleanPartnerCode=code=>typeof code==='string'&&CODE.test(code.trim().toUpperCase())?code.trim().toUpperCase():null;
export async function findPartner(admin,code){
 const clean=cleanPartnerCode(code);if(!clean)return null;
 const found=await admin.from('partners').select('user_id,code,label,signup_diamonds').or(`code.eq.${clean},alias.eq.${clean}`).limit(1);
 if(found.error)throw found.error;return found.data?.[0]??null;
}
export async function linkPartner({admin,player,code,now=Date.now()}){
 const owner=await findPartner(admin,code);if(!owner||owner.user_id===player)return null;
 const saved=await admin.from('partner_referrals').upsert({player_id:player,partner_id:owner.user_id,code:owner.code,created_at:new Date(now).toISOString()},{onConflict:'player_id',ignoreDuplicates:true}).select('player_id');
 if(saved.error)throw saved.error;
 const made=(saved.data?.length??0)>0,diamonds=Number.isInteger(owner.signup_diamonds)?Math.max(0,Math.min(1000,owner.signup_diamonds)):0;
 return {code:owner.code,diamonds:made?diamonds:0,label:typeof owner.label==='string'&&owner.label?owner.label:null};
}
// The note in Notifications for a farm that got a partner's diamonds.
export const partnerWelcomeNotice=({diamonds,label})=>`Welcome to the valley! You joined with ${label??'a partner'}'s link, so you start with ${diamonds} extra diamonds.`;
