import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// A gift queued by the admin (supabase/functions/farm-api/admin-service.js, tests/admin-grant.test.mjs) is
// delivered on the farmer's own next load and shown once, as its own small "Donation!" dialog with icons for
// whichever of coins/XP/diamonds were actually given, plus an optional note from the admin.
test('the gift dialog exists, styled like the level-up celebration, with its own rewards and message spots',()=>{
 const html=read('public/farm.html');
 const dialog=html.slice(html.indexOf('id="gift-dialog"'),html.indexOf('</dialog>',html.indexOf('id="gift-dialog"')));
 assert.match(dialog,/Donation!/);
 assert.match(dialog,/id="gift-rewards" class="gift-rewards"/);
 assert.match(dialog,/id="gift-message" class="gift-message" hidden/,'hidden by default — most gifts have no note');
 assert.match(dialog,/class="level-up-close close-dialog"/,'closing it needs no dedicated JS — the existing global .close-dialog wiring covers it');
 assert.match(dialog,/class="primary-button gift-done close-dialog"/);
 assert.match(dialog,/id="gift-icon" class="gift-icon"/,'a big icon at the top, like the level-up celebration has');
});
test('giftPopup fills in only the amounts (and item, if any) that were actually given, as plain text via textContent for the message',()=>{
 const js=read('public/game.js');
 // The same popup also carries Invite a friend rewards and the end of the Beginner guide, with its own heading, picture and
 // a plain line of text (defaults: a gift, no text).
 assert.match(js,/function giftPopup\(gift,\{eyebrow='A GIFT FOR YOU',title='Donation!',icon='gift',text=''\}=\{\}\)\{/);
 assert.match(js,/else\{note\.textContent=text;note\.hidden=!text;\}/,'that text is set as text too');
 assert.match(js,/if\(gift\.coins\)rewards\.push\(`<strong class="reward-coins">\$\{art\('coins'\)\}\+\$\{gift\.coins\.toLocaleString\('en-US'\)\} coins<\/strong>`\);/);
 assert.match(js,/if\(gift\.xp\)rewards\.push\(`<strong class="reward-xp">\$\{art\('xp'\)\}\+\$\{gift\.xp\.toLocaleString\('en-US'\)\} XP<\/strong>`\);/);
 assert.match(js,/if\(gift\.diamonds\)rewards\.push\(`<strong class="reward-diamonds">\$\{art\('diamonds'\)\}\+\$\{gift\.diamonds\.toLocaleString\('en-US'\)\} diamonds<\/strong>`\);/);
 assert.match(js,/if\(gift\.item&&gift\.itemCount&&ITEMS\[gift\.item\]\)rewards\.push\(`<strong class="reward-item">\$\{art\(gift\.item\)\}\+\$\{gift\.itemCount\.toLocaleString\('en-US'\)\} \$\{ITEMS\[gift\.item\]\.name\}<\/strong>`\);/,'an unrecognised item key (an old game version, say) is silently skipped rather than rendering "undefined"');
 // The note is set with .textContent, never interpolated into the innerHTML string — nothing here needs escaping.
 assert.match(js,/note\.textContent=`.*gift\.message.*`;note\.hidden=false/);
 assert.doesNotMatch(js,/gift-message'\)\.innerHTML/);
});
test('giftPopup is wired to both delivery paths: a fresh page load and a live reconnect refresh',()=>{
 const js=read('public/game.js');
 assert.match(js,/const initialGift=window\.harvestInitialFarm\.gift;/);
 assert.match(js,/if\(initialGift\)giftPopup\(initialGift\);/);
 assert.match(js,/onGift:giftPopup/,'passed straight through to farm-client.js, which calls it on data.gift');
});
test('the celebration styling exists for the amount badges, one colour per currency',()=>{
 const css=read('public/progression.css');
 assert.match(css,/#gift-dialog\{/);
 assert.match(css,/\.gift-rewards \.reward-coins\{/);assert.match(css,/\.gift-rewards \.reward-xp\{/);assert.match(css,/\.gift-rewards \.reward-diamonds\{/);assert.match(css,/\.gift-rewards \.reward-item\{/);
});
test('createFarmClient forwards a load response\'s gift to onGift (see tests/online-client.test.mjs for behaviour)',()=>{
 const js=read('public/farm-client.js');
 assert.match(js,/onGift,onEmailCheck\}\)\{/);
 assert.match(js,/if\(data\.gift\)onGift\?\.\(data\.gift\);/);
});
