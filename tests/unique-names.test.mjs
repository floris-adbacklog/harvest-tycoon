import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('farmer names are unique whatever the capitals: the database refuses a taken one, sign-up and rename say so',()=>{
 const sql=read('supabase/unique-farmer-names.sql');
 assert.match(sql,/create unique index if not exists player_stats_username_unique on public\.player_stats \(lower\(btrim\(username\)\)\) where username is not null;/);
 assert.match(sql,/order by p\.level desc, u\.created_at, p\.player_id\) as place/,'of the names there twice, the higher level keeps it');
 assert.match(sql,/so it is now “%s”\. You can change it on the leaderboard\./,'the other farmer is told');
 assert.match(sql,/grant execute on function public\.username_available\(text\) to anon, authenticated, service_role;/,'the sign-up form asks before there is an account');
 const main=read('src/main.js');
 assert.match(main,/showFieldErrors\(\{name:'That farmer name is taken\. Try another one\.'\}\)/);
 assert.match(main,/if\(!name\)\{name=randomPlayerName\(\);for\(let i=0;i<5&&!\(await free\(name\)\);i\+\+\)name=randomPlayerName\(\);\}/,'a random name that is taken is picked again');
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/const username=profile\?\.username\?\?\(chosen\?await freeName\(admin,chosen\):null\);/,'a new farm always opens, with the first free Name 2');
 assert.match(api,/if\(!own&&!\(await nameFree\(admin,wanted\)\)\)return reply\(\{error:'That farmer name is taken\. Try another one\.'\},409\);/);
 assert.match(api,/renamed\.error\?\.code==='23505'/,'two at the same moment: the database decides');
});
