import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 29 Oct 2026 (the owner): the family badge beside a name in the chat; a tap opens the family's profile.
test('the chat shows each sender\'s family emblem beside the name, and a tap opens the family profile',()=>{
 const ui=read('src/chat-ui.js'),client=read('src/chat-client.js'),css=read('public/chat.css'),sql=read('supabase/chat-families.sql');
 assert.match(ui,/\$\{lookBadge\(lookOf\(m\)\)\}\$\{familyBadge\(m\)\}<time/,'beside the name and its marks, before the time');
 assert.match(ui,/data-family-view="\$\{esc\(f\.id\)\}" translate="no"/,'the View of a shared family card: it opens the profile; the name is never translated');
 assert.match(ui,/if\(!f\|\|tab==='family'\)return '';/,'not in the family\'s own chat');
 assert.match(ui,/freshFamilies\('open'\);void freshSenderFamilies\(messages\.map\(m=>m\.sender\),Date\.now\(\)-familiesAt>60000\);/,'asked when a chat opens');
 assert.match(ui,/void freshSenderFamilies\(\[m\.sender\]\);/,'and for a new sender');
 assert.match(client,/supabase\.rpc\('chat_families',\{p_players:unique\}\);\n {3}if\(error\)return null;/,'no badge, never an error, before the SQL runs');
 assert.match(css,/\.chat-family>\.family-emblem\{width:20px;height:20px/);
 assert.match(sql,/security definer set search_path to ''/);
 assert.match(sql,/m\.left_at is null\s+and f\.deleted_at is null/,'only the family they are in now');
 assert.match(sql,/revoke all on function public\.chat_families\(uuid\[\]\) from public, anon;\ngrant execute on function public\.chat_families\(uuid\[\]\) to authenticated;/);
 assert.doesNotMatch(sql,/invite_code|join_mode|min_level/,'nothing private');
});
