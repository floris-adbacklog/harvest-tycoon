import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 25 Sep 2026: a new avatar showed in the profile, but old chat messages kept the face their sender had when writing them
// (chat_messages.sender_avatar). The chat and the staff dashboard show the avatar of now.
test('the chat shows every sender with the avatar they have now, and yours changes the moment you save it',()=>{
 const ui=read('src/chat-ui.js');
 assert.match(ui,/avatarImage\(faceOf\(m\)\),'chat-avatar'\)/);assert.doesNotMatch(ui,/avatarImage\(m\.sender_avatar\)/);
 assert.match(ui,/const faceOf=m=>faces\.get\(m\.sender\)\?\?m\.sender_avatar;/,'the saved face only until the lookup answers');
 assert.match(ui,/void freshFaces\(messages\.map\(m=>m\.sender\),Date\.now\(\)-facesAt>60000\)/,'every farmer on screen is looked up again, at most once a minute');
 assert.match(ui,/void freshFaces\(\[m\.sender\]\)/,'a new message from someone not seen yet');
 assert.match(ui,/addEventListener\?\.\('harvest-avatar-changed'/);
 assert.match(read('public/avatar-settings.js'),/dispatchEvent\(new CustomEvent\('harvest-avatar-changed',\{detail:\{playerId:bridge\.playerId,avatarId:saved\}\}\)\)/);
});
test('the staff dashboard asks for the faces again on every refresh, not only for farmers it has not seen',()=>{
 const dash=read('src/admin-dashboard.js');
 assert.match(dash,/async function loadFaces\(ids\)\{try\{const found=await bridge\.chat\?\.faces\?\.\(ids\);/);
 assert.match(dash,/addEventListener\('harvest-avatar-changed'/);
});
