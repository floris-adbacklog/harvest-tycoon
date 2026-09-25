import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// "A helping hand" used to jump straight into one station (Greenhouse); it now opens a hub first, a clean 2x2 of all four stops,
// reusing the Buildings catalog's own card style (public/styles.css .building-catalog is already display:grid;grid-template-columns:1fr 1fr).
test('the activities hub dialog exists, with the four-stop grid and a farm-round strip',()=>{
 const html=read('public/farm.html');
 const hub=html.slice(html.indexOf('id="activities-hub-dialog"'),html.indexOf('</dialog>',html.indexOf('id="activities-hub-dialog"')));
 assert.match(hub,/A helping hand/);
 assert.match(hub,/id="activities-hub-round" class="activity-round"/,'the farm-round progress shows above the grid');
 assert.match(hub,/id="activities-hub-grid" class="building-catalog"/,'the 2x2 grid reuses the Buildings catalog card style');
 // It is its own dialog, separate from the per-station work screen, so leaving the hub never loses your place mid-job.
 assert.notEqual(html.indexOf('id="activities-hub-dialog"'),html.indexOf('id="activities-dialog"'));
});
test('the hub renders all four stops as tappable cards with a live status, and opens the tapped one',()=>{
 const ui=read('public/activities-ui.js');
 assert.match(ui,/function openHub\(\)\{/);
 assert.match(ui,/if\(!featureUnlocked\(state,'activities'\)\)\{notify\(featureUnlockHint\('activities'\)\);return false;\}/);
 assert.match(ui,/document\.querySelectorAll\('dialog\[open\]'\)\.forEach\(d=>d\.close\(\)\);renderHub\(\);hubDialog\.showModal\(\)/,'closes whatever else is open first, like every other dialog');
 assert.match(ui,/function renderHub\(\)\{/);
 assert.match(ui,/\$\('activities-hub-grid'\)\.innerHTML=all\.map\(s=>\{const status=stopStatus\(s\);/,'one card per station, built from a live status');
 assert.match(ui,/\$\('activities-hub-grid'\)\.querySelectorAll\('\[data-open-station\]'\)\.forEach\(b=>b\.onclick=\(\)=>open\(b\.dataset\.openStation\)\);/,'tapping a card opens that station');
 assert.match(ui,/function stopStatus\(s\)\{/);
 assert.match(ui,/return \{open,openHub,refresh,tick\};/,'openHub is part of the module\'s public surface');
 // Regression: a card once showed a checkmark in front of "Ready to help" for a stop already counted this round — read as both
 // done and not done at once. The round strip already has its own checkmark badge for that; the card's own pill just says what
 // tapping it now would start.
 const hubGrid=ui.slice(ui.indexOf("$('activities-hub-grid').innerHTML="),ui.indexOf(';',ui.indexOf("$('activities-hub-grid').innerHTML=")+40));
 assert.doesNotMatch(hubGrid,/inRound/,'the card status pill no longer repeats the round checkmark');
});
test('the round strip (in the hub and in a station\'s own dialog) is clickable: tap another stop to jump straight there',()=>{
 const ui=read('public/activities-ui.js');
 assert.match(ui,/function roundStrip\(all,round\)\{/,'one shared template for both places it appears');
 assert.match(ui,/<button type="button" class="round-stop \$\{stop\.inRound\?'complete':''\}" data-round-station="\$\{stop\.station\}" \$\{stop\.station===selected\?'disabled':''\}/,'a real button per stop, disabled only for the one already open');
 assert.match(ui,/function bindRoundStrip\(root\)\{root\.querySelectorAll\('\[data-round-station\]'\)\.forEach\(b=>b\.onclick=\(\)=>open\(b\.dataset\.roundStation\)\);\}/);
 assert.match(ui,/\$\('activities-hub-round'\)\.innerHTML=roundStrip\(all,round\);bindRoundStrip\(\$\('activities-hub-round'\)\);/);
 assert.match(ui,/\$\('activity-round'\)\.innerHTML=roundStrip\(all,round\);bindRoundStrip\(\$\('activity-round'\)\);/,'the station dialog\'s own strip is wired the same way');
 // The round stops used to be non-interactive <span role="img">; the CSS was updated for a real button (padding, disabled, hover).
 const css=read('public/farm-life.css');
 assert.match(css,/\.round-stop\{[^}]*padding:0/);
 assert.match(css,/\.round-stop:disabled\{cursor:default;opacity:\.6\}/);
});
test('refresh() and tick() keep the hub live too, not just the station dialog',()=>{
 const ui=read('public/activities-ui.js');
 assert.match(ui,/function refresh\(\)\{if\(dialog\.open&&!busy\)render\(\);else if\(hubDialog\.open\)renderHub\(\);\}/);
 assert.match(ui,/if\(hubDialog\.open&&signature\(\)!==lastSignature\)renderHub\(\);/);
});
test('clearer helping hand: rewards and state on the hub cards, a job starts on opening, and a finished job leads to the next stop',()=>{
 const ui=read('public/activities-ui.js'),html=read('public/farm.html');
 assert.match(ui,/<span class="activity-chips">\$\{rewardChips\(s\)\}<\/span><span class="building-status \$\{status\.kind\}">/,'each hub card shows what the stop gives, then one state pill');
 assert.match(ui,/if\(s\.remaining\)return \{text:`Back in \$\{formatDuration\(s\.remaining\)\}`,kind:'locked'\};/);
 assert.match(ui,/class="activity-stop-bar"/,'a job in progress shows a small bar');
 assert.match(ui,/if\(!s\.job&&!s\.remaining\)void act\(\{type:'activity_start',station:id\}\);/,'opening a ready stop starts it: no separate Start step');
 assert.match(ui,/function nextStop\(from\)\{/);
 assert.match(ui,/data-activity-next="\$\{next\.station\}">Next stop: \$\{next\.name\} ›<\/button>/);
 assert.match(ui,/data-activity-hub>‹ All stops<\/button>/);
 assert.match(ui,/result\.roundComplete\?'Round complete!':'Job complete!'/);
 assert.doesNotMatch(ui,/Leave as it is|Your progress is kept if you leave/,'the instruction is said once, at the top');
 const job=html.slice(html.indexOf('id="activities-dialog"'),html.indexOf('</dialog>',html.indexOf('id="activities-dialog"')));
 assert.ok(job.indexOf('id="activity-round"')<job.indexOf('id="activity-work"'),'the round strip sits above the job');
 const hub=html.slice(html.indexOf('id="activities-hub-dialog"'),html.indexOf('</dialog>',html.indexOf('id="activities-hub-dialog"')));
 assert.match(hub,/aria-label="Close"><i data-lucide="x"><\/i><\/button>/,'a normal close button');
});
