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
