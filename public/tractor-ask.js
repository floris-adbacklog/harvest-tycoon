import {art} from './visual-icons.js';
// The tractor's Plant tile asks first (17 Oct 2026, the owner: "Kunnen we een bevestiging maken bij tractor planten?"). Plant sowed the
// crop picked in the seed shop at once, on every empty field it could pay for, and that crop could be one picked days ago (the device
// keeps it). The owner chose 1 + 4: the tile always shows the crop it plants (its picture and name), and a first tap asks in the tile
// itself, no extra pop-up: "Plant 12 × Corn?" with Plant and Other crop. A tap anywhere else, or ASK_MS, puts the tile back. Water,
// Extra care and Harvest stay one tap; the night shift keeps its own confirm.
export const ASK_MS=5000,ASK_GUARD_MS=400;
// The question's clock: open for ASK_MS from the first tap. Plant answers only from ASK_GUARD_MS on, so a quick double tap on the
// tile never plants.
export function plantAsk(){
 let at=0;
 return {start(now){at=now;},stop(){at=0;},open:now=>at>0&&now-at<ASK_MS,answers:now=>at>0&&now-at>=ASK_GUARD_MS&&now-at<ASK_MS};
}
// The Plant tile as it asks: the crop, the price of the whole job, the question and its two buttons. A group, not a button: a button
// may hold no other buttons.
export const askTile=(crop,name,q)=>`<div class="tractor-tile is-asking" role="group" data-tractor-ask><span class="tractor-tile-art">${art(crop)}</span><span class="tractor-job-cost">${art('coins')}${q.total}</span><strong>Plant ${q.count} × ${name}?</strong><span class="tractor-ask-buttons"><button type="button" class="primary-button" data-tractor-go>Plant</button><button type="button" class="small-button" data-tractor-other>Other crop</button></span></div>`;
