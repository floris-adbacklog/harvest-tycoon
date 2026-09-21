import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {art} from '../public/visual-icons.js';
import {BEGINNER_REWARD} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const play=read('public/play.html'),css=read('public/welcome.css');

test('the sign-in page says the game is new and when it opened',()=>{
 assert.match(play,/<p class="launch-banner"><span class="launch-chip">.*NEW GAME<\/span><span class="launch-copy">Opened on <time datetime="2026-09-16">16 September 2026<\/time><\/span><\/p>/);
 assert(play.indexOf('launch-banner')<play.indexOf('id="welcome-title"'),'above the headline');
 assert.match(css,/\.launch-banner\{[^}]*border-radius:99px/);assert.match(css,/\.launch-banner,\.launch-chip\{white-space:nowrap\}/,'one line, also on a 320px phone');assert.match(css,/@media\(max-width:360px\)\{\.launch-banner\{[^}]*font-size:11px/);assert.match(css,/\.launch-chip\{[^}]*linear-gradient/);
 assert.match(css,/@media\(max-width:720px\)\{\s*\.story-copy\{display:contents\}\s*\.launch-banner\{order:0/,'on phones it sits right under the logo');
});
test('the sign-in page is calm: one headline, one sentence, one card',()=>{
 for(const gone of ['valley-tag','YOUR LITTLE COUNTRYSIDE ESCAPE','A LITTLE FARM. A WORLD OF POSSIBILITIES','welcome-header','header-link','farm-features','welcome-footer','Small seeds'])assert(!play.includes(gone),gone);
 for(const gone of ['.valley-tag','.welcome-header','.header-link','.farm-features','.welcome-footer','.story-copy .eyebrow'])assert(!css.includes(gone),gone);
 assert.match(play,/<h1 id="welcome-title">Grow your farm<br><em>into an empire\.<\/em><\/h1>/);
 assert.match(css,/\.card-top\{display:none\}/);assert.match(css,/#mode-switch-row\{display:none\}/);
 assert.match(css,/\.welcome-story h1,\.hero-copy\{text-wrap:balance\}/);
});
test('the sign-up card does not say "Free to play" twice, and the name field says Username',()=>{
 const account=read('src/account-form.js');
 assert.match(account,/copy:'Your first harvest is just around the corner\.'/);assert.match(play,/<p id="account-copy">Your first harvest is just around the corner\.<\/p>/);
 assert.equal((play.match(/Free to play/g)??[]).length,1,'only the promise says it');
 assert.match(play,/id="player-name"[^>]*placeholder="Username"/);
});
test('Grow, Craft and Trade are painted game icons joined by arrows',()=>{
 assert.match(play,/<ul class="loop-icons"[^>]*>.*Grow<\/li><li class="loop-arrow" aria-hidden="true"><svg.*Craft<\/li><li class="loop-arrow" aria-hidden="true"><svg.*Trade<\/li><\/ul>/);
 assert.equal((play.match(/class="loop-arrow" aria-hidden="true"/g)??[]).length,2);
 // the sprite cells are computed the way the game does it (public/visual-icons.js), so the right picture shows
 for(const [key,klass] of [['wheat','wart-wheat'],['bread','wart-bread'],['market','wart-market'],['diamonds','wart-diamonds']]){
  const game=art(key),rule=css.match(new RegExp(`\\.${klass}\\{--sheet:url\\('([^']+)'\\);--size:([\\d.]+)%;--pos:([\\d.]+)% ([\\d.]+)%\\}`));
  assert(rule,klass);
  assert.equal(rule[1],game.match(/--art-sheet:url\('([^']+)'\)/)[1],`${key}: sheet`);assert.equal(Number(rule[2]),Number(game.match(/--art-size:([\d.]+)%/)[1]),`${key}: size`);
  const [x,y]=game.match(/--art-position:([\d.]+)% ([\d.]+)%/).slice(1).map(Number);assert(Math.abs(rule[3]-x)<.01&&Math.abs(rule[4]-y)<.01,`${key}: position`);
 }
});
test('the diamond next to the promise is the real diamond, not a line icon',()=>{
 const promise=play.slice(play.indexOf('id="register-promise"'),play.indexOf('</p>',play.indexOf('id="register-promise"')));
 assert.match(promise,/class="wart wart-diamonds"/);assert(!promise.includes('wi-gem')&&!promise.includes('lucide'));
 assert.match(css,/\.register-promise\{align-items:center\}/,'centred in its box');
});
test('the beginner reward is the same number on the sign-in page and in the game',()=>{
 assert.equal(BEGINNER_REWARD,50);
 assert.match(play,new RegExp(`Finish 10 beginner quests and earn ${BEGINNER_REWARD} diamonds\\.`));
 const farm=read('public/farm.html');
 assert.match(farm,new RegExp(`<b id="beginner-prize-title">${BEGINNER_REWARD} diamonds</b>`));assert.match(farm,new RegExp(`10 steps · ${BEGINNER_REWARD} diamond reward`));
 const ui=read('public/beginner-ui.js');assert(!/\b\d+ diamond/.test(ui),'no amount is typed into the guide text: it follows BEGINNER_REWARD');assert(/\$\{BEGINNER_REWARD\} diamonds/.test(ui));
});
