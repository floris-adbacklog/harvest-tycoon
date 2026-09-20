import {art} from './visual-icons.js';
// Ordinal places are stable: score descending, player ID ascending for ties.
export function rankArt(place){
 const icons=['rank-gold','rank-silver','rank-bronze'];
 return Number.isInteger(place)&&place>=1&&place<=3?`<span class="rank-trophy" role="img" aria-label="${['Gold','Silver','Bronze'][place-1]} trophy · Place ${place}">${art(icons[place-1])}</span>`:`<span class="rank-number">${Number.isInteger(place)?place:''}</span>`;
}
