import {FAMILY_EMBLEMS,customEmblemPath} from './farm-state.js';
import {art} from './visual-icons.js';
// A family emblem as the game draws it (30 Oct 2026): one of FAMILY_EMBLEMS, or the family's own picture (farm-state.js
// customEmblemPath, stored by farm-api in the public bucket family-emblems, supabase/family-emblem-upload.sql).
export const EMBLEM_IMAGES='https://jnmdirvidffzxukbdmij.supabase.co/storage/v1/object/public/family-emblems/';
export const emblemOf=id=>FAMILY_EMBLEMS.find(e=>e.id===String(id))??FAMILY_EMBLEMS[0];
export const ownEmblemUrl=id=>{const path=customEmblemPath(id);return path?EMBLEM_IMAGES+path:null;};
// The colour behind it: the emblem's own, or a soft cream behind a picture.
export const emblemColor=id=>customEmblemPath(id)?'#efe5d2':emblemOf(id).color;
export const emblemInner=id=>{const url=ownEmblemUrl(id);return url?`<img class="family-emblem-own" src="${url}" alt="" width="64" height="64" loading="lazy" decoding="async" draggable="false">`:art(emblemOf(id).icon);};
export const emblemMarkup=id=>`<span class="family-emblem${customEmblemPath(id)?' is-own':''}" style="--family-color:${emblemColor(id)}">${emblemInner(id)}</span>`;
