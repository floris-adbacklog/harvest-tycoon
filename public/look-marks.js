import {wornLook,seasonLook} from './farm-state.js';
import {pictureFile} from './visual-icons.js';

// The Season Pass's looks on a farmer's name and face (Oct 2026): what they wear (player_stats.look, cleaned by wornLook so only known
// looks in their own slot ever show). A frame around the face (the profile large, the leaderboard and the family list small; never in
// the chat: at 32 px it is too busy), a badge beside the name (chat, leaderboard, profile, family), a title under the name (profile and
// family list), the name's colour in the chat, and the profile's background. Every part returns '' when nothing is worn.
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function framed(look,face){
 const frame=seasonLook(wornLook(look).frame);
 return frame?`<span class="look-framed">${face}<img class="look-frame" src="${pictureFile(frame.art)}" alt="" loading="lazy" decoding="async" draggable="false"></span>`:face;
}
export function lookBadge(look){
 const badge=seasonLook(wornLook(look).badge);
 return badge?`<img class="look-badge" src="${pictureFile(badge.art)}" alt="${esc(badge.name)}" title="${esc(badge.name)}" loading="lazy" decoding="async" draggable="false">`:'';
}
export function lookTitle(look){const title=seasonLook(wornLook(look).title);return title?`<span class="look-title">${esc(title.name)}</span>`:'';}
// The chat name's colour (one of the game's own: the colours are in SEASON_LOOKS), or ''.
export const lookColor=look=>seasonLook(wornLook(look).color)?.color??'';
export function lookBackground(look){const bg=seasonLook(wornLook(look).bg);return bg?pictureFile(bg.art):'';}
