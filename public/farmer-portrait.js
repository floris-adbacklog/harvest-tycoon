import {farmerPart,FARMER_SLOTS} from './farmer-parts.js';

// A farmer's small picture for the chat, the leaderboards, a family and a profile (20 Oct 2026, prototype; the avatars stay as they are
// until the owner decides): no 3D at all, so thirty of them in a chat cost nothing. Every part that shows from the shoulders up has
// one transparent layer, drawn at build time in one fixed pose and camera (scripts/build-farmer-pictures.mjs): a portrait is those
// layers on top of each other, in the order below. Nobody uploads a picture: a portrait is only ever the game's own layers, picked by
// part ids that farmer-parts.js checks (validFarmerConfig).
export const PORTRAIT_BASE='/assets/farmer/portrait/';
// The groups that have a layer, bottom to top: the skin, then the clothes, the face, what is worn on the face, a costume or a mascot
// (their hoods go round the face), the hair and the hat. Trousers, shoes, socks and gloves do not show from the shoulders up.
export const PORTRAIT_GROUPS=Object.freeze(['body','top','outfit','face','faceExtra','glasses','costume','mascot','hair','hairFull','hat','helmet']);
// The camera every layer was drawn with: from a little above the eyes, straight in front, the head and the shoulders.
export const PORTRAIT_CAMERA=Object.freeze({fov:14,position:Object.freeze([0,1.66,3.4]),target:Object.freeze([0,1.57,0])});
// The body drawn as the unseen shape in front of every layer (all bodies are the same shape).
export const BASE_BODY='body_001';
// The layers of a farmer, bottom first: part ids (each a file in PORTRAIT_BASE).
export function portraitLayers(config){
 const worn=FARMER_SLOTS.map(slot=>farmerPart(config?.[slot])).filter(p=>p&&PORTRAIT_GROUPS.includes(p.group));
 return worn.sort((a,b)=>PORTRAIT_GROUPS.indexOf(a.group)-PORTRAIT_GROUPS.indexOf(b.group)).map(p=>p.id);
}
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// The markup: a round frame (farmer-maker.css .farmer-portrait) with the layers in it. size: CSS pixels; label: what a screen reader
// says (the farmer's name), empty when the name stands beside it.
export function farmerPortrait(config,{size=48,label=''}={}){
 const layers=portraitLayers(config).map(id=>`<img src="${PORTRAIT_BASE}${id}.webp" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" draggable="false">`).join('');
 return `<span class="farmer-portrait" style="--portrait-size:${size}px"${label?` role="img" aria-label="${esc(label)}"`:' aria-hidden="true"'}>${layers}</span>`;
}
