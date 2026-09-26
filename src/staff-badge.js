import {art} from '../public/visual-icons.js';

// Who is the admin and who a moderator (supabase/chat-staff-list.sql), loaded once, for the mark beside their name: in the chat, on
// a farmer's profile and on the leaderboard. The admin shows as Admin, so farmers know who makes the game.
export const STAFF_LABELS={admin:{label:'Admin',title:'Admin: the maker of Harvest Tycoon'},moderator:{label:'Moderator',title:'Moderator of the valley chat'}};
let staff=new Map(),loading=null;
export function loadStaff(chat){
 loading??=Promise.resolve().then(()=>chat?.staffList?.()).then(list=>{staff=new Map((Array.isArray(list)?list:[]).map(s=>[s.player_id,s.role]));return staff;}).catch(()=>{loading=null;return staff;});
 return loading;
}
export const staffRole=id=>staff.get(id)??null;
export function staffBadge(role,cls='staff-badge'){const s=STAFF_LABELS[role];return s?`<span class="${cls} is-${role}" title="${s.title}">${art('admin')}${s.label}</span>`:'';}
