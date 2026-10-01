// The partner programme (supabase/partners.sql, 1 Oct 2026), apart from Invite a friend: a brand-new farm that started with a
// partner's link (?ref=CODE, src/partner-link.js) belongs to that partner for good. A partner's own account, an unknown code or a
// farm that already exists is never linked; the first link stays.
const CODE=/^[A-Z0-9]{4,12}$/;
export async function linkPartner({admin,player,code,now=Date.now()}){
 const clean=typeof code==='string'&&CODE.test(code.trim().toUpperCase())?code.trim().toUpperCase():null;if(!clean)return null;
 const owner=await admin.from('partners').select('user_id').eq('code',clean).maybeSingle();
 if(owner.error)throw owner.error;if(!owner.data||owner.data.user_id===player)return null;
 const saved=await admin.from('partner_referrals').upsert({player_id:player,partner_id:owner.data.user_id,code:clean,created_at:new Date(now).toISOString()},{onConflict:'player_id',ignoreDuplicates:true});
 if(saved.error)throw saved.error;
 return {code:clean};
}
