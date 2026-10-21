import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 11 Oct 2026 (Part A, A4): a lost 3D view (a phone that switched apps, a graphics reset) was a dead end: "The 3D view was interrupted.
// Reload..." for good. Now the farm waits under a small card and comes back by itself; only after 5 seconds the card with Try again.
test('a lost 3D view waits under a small card and comes back by itself; Try again only after 5 seconds',()=>{
 const game=read('public/game.js'),html=read('public/farm.html'),css=read('public/styles.css');
 const restore=game.slice(game.indexOf('function bindContextRestore('),game.indexOf('async function init(){'));
 assert.ok(restore.length>200,'bindContextRestore sits before init');
 assert.match(game,/bindContextRestore\(renderer\.domElement\);/);
 assert.doesNotMatch(game,/addEventListener\('webglcontextlost',e=>\{e\.preventDefault\(\);ready=false;\$\('error-message'\)/,'the loss alone no longer shows the error card');
 // On the loss: the browser may give the view back (preventDefault), the farm pauses, the small card shows, the error waits 5 seconds.
 const lost=restore.slice(restore.indexOf("'webglcontextlost'"),restore.indexOf("'webglcontextrestored'"));
 assert.match(lost,/event\.preventDefault\(\);/);assert.match(lost,/ready=false;\$\('restoring'\)\.hidden=false;/);
 assert.doesNotMatch(lost.split('restoreTimer=setTimeout(')[0],/\$\('error'\)\.hidden=false/,'#error is not shown at once');
 assert.match(lost,/restoreTimer=setTimeout\(\(\)=>\{if\(!document\.hidden\)graphicsTrouble\(gfxStore\);\$\('restoring'\)\.hidden=true;\$\('error-message'\)\.textContent='The 3D view was interrupted\. Reload to return to your saved farm\.';\$\('error'\)\.hidden=false;\},CONTEXT_RESTORE_MS\);/);
 assert.match(game,/const CONTEXT_RESTORE_MS=5000;/);
 // A loss during a new farm's first visit counts in its load chain (A1).
 assert.match(lost,/if\(firstVisit\)\{client\.look\(\{chain:\{lost:1\}\}\);client\.sendLook\(\);\}/);
 // On the way back: both cards go, canvas pictures and shadows are sent again, the farm is drawn and plays on, the map is shot again.
 const back=restore.slice(restore.indexOf("'webglcontextrestored'"));
 assert.match(back,/clearTimeout\(restoreTimer\);\$\('restoring'\)\.hidden=true;\$\('error'\)\.hidden=true;/);
 assert.match(back,/if\(v\?\.isCanvasTexture\)v\.needsUpdate=true;/);
 assert.match(back,/ready=true;resize\(\);renderer\.shadowMap\.needsUpdate=true;renderer\.render\(scene,camera\);if\(!villageWorld\)shootMinimap\(\);/);
 assert.match(back,/if\(!wasReady\)return;/,'lost while loading: init starts the farm itself');
 // The card: cream (.error-card), its text translated with the page, the bars free around it.
 assert.match(html,/<div id="restoring" class="error-card restoring-card" role="status" hidden><span class="restoring-dot" aria-hidden="true"><\/span><h2>Getting your farm back…<\/h2><\/div>/);
 assert.match(css,/\.restoring-card\{[^}]*pointer-events:none/);assert.match(css,/\.restoring-dot\{[^}]*var\(--btn-main\)/,'game palette');
 // Try again on a portal asks its page for the farm (never a reload of CrazyGames' page).
 assert.match(read('public/loading-screen.js'),/const reload=\(\)=>\{if\(portal\)portal\.reopen\(\);else win\.parent\.location\.reload\(\);\};/);
});
