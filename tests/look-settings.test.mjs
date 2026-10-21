import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lookSummaryMarkup,lookSettingsMarkup,LOOK_ICON} from '../public/look-settings.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// 21 Oct 2026, the owner: "Je look staat nu heel lelijk onder instellingen, kan het niet onder een nieuw kopje", then "Doe je look ook
// onder avatar, en verander het kopje mijn avatar in iets breders zodat het fit". Settings › Profile (was Avatar): the avatar card, then
// a Your look card with what is worn and one button; the tiles live in the Your look window.
// After the season (its rewards collected until 28 Dec 2026): only the looks a farmer has show.
const NOW=Date.UTC(2027,1,1,12);

test('Your look: no look, no card; a card is what is worn, the count and one button, never the tiles',()=>{
 assert.equal(lookSummaryMarkup({looks:[]},NOW,{}),'');
 assert.equal(lookSettingsMarkup({looks:[]},NOW,{}),'');
 const state={looks:['autumn-2026-frame','autumn-2026-badge','autumn-2026-golden-pumpkin','autumn-2026-float']};
 const card=lookSummaryMarkup(state,NOW,{frame:'autumn-2026-frame',bobber:'autumn-2026-float'});
 assert.match(card,/<ul class="look-worn">/);assert.equal((card.match(/<li /g)??[]).length,2,'one picture per kind worn');
 assert.match(card,/<span class="look-count">4 of 4 collected<\/span>/);
 assert.match(card,new RegExp(`<button type="button" class="secondary-button look-open" data-look-open aria-haspopup="dialog"><i data-game-art="${LOOK_ICON}"></i>Your look</button>`));
 assert.doesNotMatch(card,/look-chip|look-tabs|<h3/);
 assert.doesNotMatch(lookSummaryMarkup(state,NOW,{}),/look-worn/,'nothing worn: only the count');
});

test('Your look window: a tab per kind with what is worn on it, the open kind\'s tiles with None first; one kind has no tabs',()=>{
 const state={looks:['autumn-2026-frame','autumn-2026-badge','autumn-2026-golden-pumpkin','autumn-2026-float']};
 const body=lookSettingsMarkup(state,NOW,{badge:'autumn-2026-golden-pumpkin'},{tab:'badge'});
 assert.match(body,/<div class="market-tabs look-tabs" role="tablist" aria-label="Your look" style="--look-columns:3">/);
 assert.deepEqual([...body.matchAll(/data-look-tab="(\w+)"/g)].map(m=>m[1]),['frame','badge','bobber']);
 assert.match(body,/id="look-tab-badge" aria-controls="look-panel" aria-selected="true" tabindex="0"/);
 assert.deepEqual([...body.matchAll(/data-look-slot="badge" data-look-id="([^"]*)"/g)].map(m=>m[1]),['','autumn-2026-badge','autumn-2026-golden-pumpkin']);
 assert.match(body,/class="look-chip is-on" data-look-slot="badge" data-look-id="autumn-2026-golden-pumpkin" aria-pressed="true"/);
 assert.match(body,/<p class="look-feedback" role="status" aria-live="polite"><\/p>$/);
 // A kind that is gone opens the first.
 assert.match(lookSettingsMarkup(state,NOW,{},{tab:'rod'}),/id="look-tab-frame" aria-controls="look-panel" aria-selected="true"/);
 const one=lookSettingsMarkup({looks:['autumn-2026-frame']},NOW,{});
 assert.doesNotMatch(one,/role="tablist"/);assert.match(one,/<strong class="look-kind">Avatar frame<\/strong>/);
 // Rows of at most 4 tabs.
 const all=lookSettingsMarkup({looks:['autumn-2026-frame','autumn-2026-badge','autumn-2026-title-harvest-hero','autumn-2026-color-pumpkin','autumn-2026-bg-orchard','autumn-2026-float','autumn-2026-golden-rod','autumn-2026-tractor']},NOW,{});
 assert.match(all,/--look-columns:4/);
 const five=lookSettingsMarkup({looks:['autumn-2026-frame','autumn-2026-badge','autumn-2026-title-harvest-hero','autumn-2026-color-pumpkin','autumn-2026-bg-orchard']},NOW,{});
 assert.match(five,/--look-columns:3/);
});

test('Settings › Appearance (the owner, 21 Oct 2026: "Noem het uiterlijk"): the heading, the avatar card, then the Your look card; the window is a game dialog with its own picture',()=>{
 const farm=read('public/farm.html'),avatar=read('public/avatar-settings.js'),css=read('public/settings.css'),season=read('public/season.css');
 assert.match(avatar,/<h3 class="settings-heading" id="avatar-settings-title">Appearance<\/h3><div class="avatar-settings-header">.*<h3 id="avatar-card-title">Avatar<\/h3>/);
 assert.match(farm,/<section id="avatar-settings" aria-labelledby="avatar-settings-title"><\/section>/);
 assert.match(farm,/<section id="look-settings" class="look-settings-card" aria-label="Your look" hidden><\/section>/);
 assert.ok(farm.indexOf('id="avatar-settings"')<farm.indexOf('id="look-settings"'));
 assert.doesNotMatch(farm,/id="look-settings" class="settings-section/,'no row of its own in the list');
 assert.match(farm,new RegExp(`<dialog id="look-dialog" class="game-dialog is-sheet is-m" aria-labelledby="look-title"><div class="dialog-heading"><i class="dialog-badge" data-game-art="${LOOK_ICON}" aria-hidden="true"></i><div class="dialog-titles"><h2 id="look-title">Your look</h2></div><button class="icon-button close-dialog" aria-label="Close"><i data-lucide="x"></i></button></div><div class="look-dialog-body"></div></dialog>`));
 assert.match(css,/#sound-dialog #look-settings\{display:none\}\n#sound-dialog\.settings-one #avatar-settings\.is-open~#look-settings:not\(\[hidden\]\)\{display:grid\}/);
 assert.match(season,/#sound-dialog #look-settings\{gap:12px;margin:0 0 10px;padding:14px;border:1px solid #e8ded2;border-radius:18px;background:#fbf8f2\}/,'the avatar card\'s look');
 assert.doesNotMatch(season,/\.look-chips\{[^}]*overflow-x/,'tiles wrap, no sideways scroll');
});
