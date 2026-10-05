import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FAMILY_CHEST_TIERS,FAMILY_CHEST_MIN,familyWeek} from '../public/farm-state.js';
import {chestCard,hiddenAsBlocked,messageLayout} from '../src/chat-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const sql=read('supabase/family-chest-cards.sql');

// 5 Oct 2026: when the family opens a Family Chest tier, its chat gets a card (supabase/family-chest-cards.sql, src/chat-ui.js).

test('the card comes from a trigger of its own on family_chests, which only wakes up when a tier is crossed',()=>{
 assert.match(sql,/create trigger family_chest_card after update of points on public\.family_chests for each row\n when \(\(old\.points<1500 and new\.points>=1500\) or \(old\.points<5000 and new\.points>=5000\) or \(old\.points<12000 and new\.points>=12000\) or \(old\.points<25000 and new\.points>=25000\)\)\n execute function public\.family_chest_card\(\);/);
 assert.match(sql,/create trigger family_chest_card_first after insert on public\.family_chests for each row\n when \(new\.points>=1500\)\n execute function public\.family_chest_card\(\);/,'a week\'s first points that already reach a chest');
 assert.match(sql,/drop trigger if exists family_chest_card on public\.family_chests;/);assert.match(sql,/drop trigger if exists family_chest_card_first on public\.family_chests;/);
 assert.doesNotMatch(sql,/function public\.harvest_family_chest/,'the function that counts the points stays as it is');
 assert.match(sql,/create or replace function public\.family_chest_card\(\) returns trigger language plpgsql security definer set search_path to ''/);
 assert.match(sql,/revoke all on function public\.family_chest_card\(\) from public, anon, authenticated;/);
});

test('the tiers in the SQL are the game\'s FAMILY_CHEST_TIERS, names and all',()=>{
 for(const t of FAMILY_CHEST_TIERS){
  assert.match(sql,new RegExp(`\\(old\\.points<${t.points} and new\\.points>=${t.points}\\)`),`${t.id}: the trigger's WHEN`);
  assert.match(sql,new RegExp(`when was<${t.points} and new\\.points>=${t.points} then '${t.id}'`),`${t.id}: the card's tier`);
  assert.match(sql,new RegExp(t.id==='wood'?`else '${t.name}' end;`:`when '${t.id}' then '${t.name}'`),`${t.id}: its name in the text`);
 }
 assert.equal(FAMILY_CHEST_MIN,300);
});

test('the card: the family channel, kind chest, meta {tier, week, points}, a sender who is a member, no second card',()=>{
 assert.match(sql,/values\('family:'\|\|new\.family_id::text,who,coalesce\(nm,'A farmer'\),av,coalesce\(vip,false\),format\('Our family opened the %s!',chest\),'chest',\n  jsonb_build_object\('tier',tier,'week',new\.week,'points',new\.points\)\)\n on conflict do nothing;/);
 assert.match(sql,/where m\.family_id=new\.family_id and m\.left_at is null\n  order by coalesce\(cp\.points,0\) desc, m\.player_id::text limit 1;/,'the week\'s top farmer, as family-top-chat.sql, else any member');
 assert.match(sql,/if who is null then return null; end if;/);
 // The guard: a unique key on the card itself, whatever runs at the same time.
 assert.match(sql,/create unique index if not exists chat_messages_chest_once on public\.chat_messages\(channel,\(meta->>'week'\),\(meta->>'tier'\)\) where kind='chest';/);
 // The kind: whatever the live check allows stays, 'chest' joins it (the other card files list six kinds).
 assert.match(sql,/regexp_matches\(pg_get_constraintdef\(c\.oid\),'''\(\[a-z_\]\+\)''','g'\)/);
 assert.match(sql,/where c\.conrelid='public\.chat_messages'::regclass and c\.conname='chat_messages_kind_check'/);
 assert.match(sql,/unnest\(array\['message','request','rank','top','join','kick','chest'\]\)/);
 assert.match(sql,/execute format\('alter table public\.chat_messages add constraint chat_messages_kind_check check \(kind in \(%s\)\)',kinds\);/);
});

test('a problem with the card never stops the farm action: every error is swallowed in the card\'s own block',()=>{
 const body=sql.slice(sql.indexOf('create or replace function public.family_chest_card'),sql.indexOf('end $f$;'));
 assert.match(body,/\nexception when others then return null;\n$/);
 assert.equal((body.match(/\nbegin\n/g)??[]).length,1);
 const declare=body.slice(0,body.indexOf('\nbegin\n'));
 assert.doesNotMatch(declare,/:=/,'nothing worked out in declare, where the exception block would not catch it');
 assert.match(body,/was:=case when tg_op='UPDATE' then old\.points else 0 end;/);
 assert.doesNotMatch(sql,/\braise\b/);
});

test('the file ends with a commented check query and runs no other statement against the live data',()=>{
 const tail=sql.trimEnd().split('\n').slice(-4);
 assert.match(tail[0],/^-- Check \(read-only\)/);
 for(const line of tail.slice(1))assert.match(line,/^-- select /);
 const code=sql.replace(/^--.*$/gm,'');
 assert.doesNotMatch(code,/\bupdate public\.|\bdelete from\b|\bcron\.|\bnet\.http/);
 assert.deepEqual([...code.matchAll(/insert into (public\.\w+)/g)].map(m=>m[1]),['public.chat_messages'],'it only writes the card');
 assert.doesNotMatch(code,/^select /m,'no statement of its own reads or runs anything when the file is run');
});

// The trigger's own comparisons, taken from the SQL and run here: the WHEN that wakes it, the tier it picks, and the unique key.
const when=sql.match(/after update of points on public\.family_chests for each row\n when \((.+)\)\n execute/)[1];
const tierCase=[...sql.match(/tier:=case (.+?) end;/s)[1].matchAll(/when (.+?) then '(\w+)'/g)].map(([,cond,tier])=>[cond,tier]);
const js=expr=>new Function('was','now',`return ${expr.replace(/old\.points/g,'was').replace(/new\.points/g,'now').replace(/\band\b/g,'&&').replace(/\bor\b/g,'||')};`);
const wakes=js(when),picks=tierCase.map(([cond,tier])=>[js(cond),tier]);
function chestWeek(steps,{start=null,cards=[],seen=new Set()}={}){
 let points=start;
 for(const step of steps){
  const was=points,now=step.set??(points??0)+step.add;points=now;
  const fire=was===null?now>=1500:wakes(was,now);if(!fire)continue;
  const tier=picks.find(([cond])=>cond(was??0,now))?.[1];if(!tier)continue;
  const key=`${step.week??1}|${tier}`;if(seen.has(key))continue;   // on conflict do nothing: chat_messages_chest_once
  seen.add(key);cards.push({tier,week:step.week??1,points:now});
 }
 return cards;
}

test('one card per tier and week: a farm action crossing a tier, never one already passed, never twice',()=>{
 assert.deepEqual(tierCase.map(([,tier])=>tier),['gold','silver','iron','wood'],'the highest tier first');
 const add=(...list)=>list.map(n=>({add:n}));
 assert.deepEqual(chestWeek(add(100,1399)),[],'1,499 points: no chest yet');
 assert.deepEqual(chestWeek(add(100,1399,1,100,3400,6999,1,13000,5)).map(c=>`${c.tier}@${c.points}`),['wood@1500','iron@5000','silver@12000','gold@25000']);
 assert.deepEqual(chestWeek(add(1499,1,1,1,1)).map(c=>c.tier),['wood'],'the actions after the wooden chest add no card');
 assert.deepEqual(chestWeek(add(1400,3700)).map(c=>c.tier),['iron'],'a step across two tiers (1,400 to 5,100): one card, the higher chest');
 assert.deepEqual(chestWeek([{add:1600},{set:1400},{add:200}]).map(c=>c.tier),['wood'],'points lowered by hand and up again: still one card');
 assert.deepEqual(chestWeek([{add:6000}]).map(c=>c.tier),['iron'],'a week\'s first points that already reach a chest (the insert trigger)');
 // A new week is a new chest: the same tier again, in its own week.
 const seen=new Set(),cards=[];chestWeek([{add:1500,week:1}],{cards,seen});chestWeek([{add:1500,week:2}],{cards,seen});
 assert.deepEqual(cards.map(c=>`${c.tier}@${c.week}`),['wood@1','wood@2']);
 // Two farmers of one family at the same moment: their chest updates wait for each other (the row lock), so the second sees the
 // first's points; and a crossing seen twice anyway is refused by the unique key.
 const twice=new Set(['1|wood']);assert.deepEqual(chestWeek(add(1499,1),{seen:twice}),[]);
 // Last week's busiest family (38,110 points, 28 Sep - 4 Oct 2026) would have had four cards.
 assert.equal(chestWeek(Array.from({length:3811},()=>({add:10}))).length,4);
});

test('the chat card: the chest\'s picture, the whole sentence, who gets the rewards and the way to Farm Family',()=>{
 const now=Date.parse('2026-10-05T19:00:00Z'),week=familyWeek(now);
 const card=(tier,w=week,extra={})=>chestCard({id:'m1',sender:'p1',sender_name:'Bram',kind:'chest',body:'Our family opened the Iron chest!',created_at:new Date(now-5*60000).toISOString(),meta:{tier,week:w,points:5000},...extra},now);
 const iron=card('iron');
 assert.match(iron,/^<li class="chat-request chat-chest" data-id="m1">/);
 assert.match(iron,/data-art="family-chest-iron" src="\/assets\/icons\/family-chest-iron\.webp"/);
 assert.match(iron,/<p class="chat-text">Your family opened the Iron chest!<\/p>/);
 assert.match(iron,new RegExp(`<small class="chat-request-status">Everyone with ${FAMILY_CHEST_MIN} points this week gets its rewards\\. Collect them in Farm Family\\.</small>`));
 assert.match(iron,/<button type="button" class="small-button chat-chest-open" data-open-family>Open Farm Family<\/button><\/li>$/);
 assert.match(iron,/data-art="family-members"[^>]*>Family Chest<\/span><time datetime="[^"]+" title="[^"]+">5m<\/time>/);
 assert.doesNotMatch(iron,/Bram/,'the family\'s card, not the message of the farmer it went out under');
 for(const t of FAMILY_CHEST_TIERS){const html=card(t.id);assert.match(html,new RegExp(`family-chest-${t.id}\\.webp`));assert.match(html,new RegExp(`Your family opened the ${t.name}!`));}
 assert.match(card('iron',week-1),/points that week gets its rewards/,'a card from an earlier week');
 assert.match(card('iron',week-1),/Collect them in Farm Family/);
 const odd=card('platinum',week,{body:'Our family opened the <b>Platinum</b> chest!'});
 assert.match(odd,/family-chest-open\.webp/);assert.match(odd,/Our family opened the &lt;b&gt;Platinum&lt;\/b&gt; chest!/,'an unknown chest: the database\'s own text, escaped');
 const ui=read('src/chat-ui.js');
 assert.match(ui,/if\(m\.kind==='kick'\)return kickRow\(m\);\n  if\(m\.kind==='chest'\)return chestCard\(m\);/);
 assert.match(ui,/if\(event\.target\.closest\('\[data-open-family\]'\)\)\{dialog\.close\(\);doc\.getElementById\('family-button'\)\?\.click\(\);\}/,'the button opens Farm Family, as the empty Family tab does');
});

test('the card stands on its own between the messages and shows even to a farmer who blocked its sender',()=>{
 const at=minute=>new Date(Date.UTC(2026,9,5,10,minute)).toISOString();
 assert.deepEqual(messageLayout([{sender:'a',created_at:at(3)},{sender:'a',kind:'chest',created_at:at(2)},{sender:'a',created_at:at(1)}]).map(x=>x.cont),[false,false,false]);
 const blocked=new Set(['a']);
 assert.equal(hiddenAsBlocked({sender:'a',kind:'chest'},blocked),false);
 assert.equal(hiddenAsBlocked({sender:'a',kind:'message'},blocked),true);
 assert.equal(hiddenAsBlocked({sender:'a'},blocked),true);
 assert.equal(hiddenAsBlocked({sender:'b',kind:'message'},blocked),false);
 const ui=read('src/chat-ui.js');
 assert.match(ui,/const shown=messages\.filter\(m=>!hiddenAsBlocked\(m,blocked\(\)\)\);/);
 assert.match(ui,/const m=event\.message;if\(!m\|\|hiddenAsBlocked\(m,blocked\(\)\)\)return;/);
});

test('no push for a chest card: the chat pushes private messages, the Crew and mentions only, and a card is never tagged',()=>{
 assert.match(read('supabase/chat-mentions.sql'),/create trigger chat_mention_push after insert on public\.chat_messages for each row when \(new\.meta \? 'mentions' and/);
 assert.match(read('supabase/chat.sql'),/create trigger chat_dm_push after insert on public\.chat_messages for each row when \(new\.channel like 'dm:%'\)/);
 assert.match(read('supabase/chat-crew-push.sql'),/when \(new\.channel='crew'\)/);
 assert.match(read('supabase/chat-mentions.sql'),/if new\.sender is distinct from \(select auth\.uid\(\)\) or coalesce\(new\.kind,'message'\)<>'message' then return new; end if;/,'only a farmer\'s own message gets mentions');
 assert.doesNotMatch(sql,/'mentions'/,'the card\'s meta has none');
});

test('the card wears the gold of the chest panel in Farm Family (the game\'s own palette)',()=>{
 const css=read('public/chat.css'),family=read('public/family.css');
 assert.match(css,/\.chat-request\.chat-chest\{border-color:#ead9ad;background:linear-gradient\(160deg,#fff6dc,#fffaf0 60%\)\}/);
 assert.match(family,/\.family-chest\{[^}]*border:1px solid #ead9ad;[^}]*background:linear-gradient\(160deg,#fff6dc,#fffaf0 60%\)\}/);
 assert.match(family,/color:#a17a26/);assert.match(css,/\.chat-request\.chat-chest \.chat-request-label\{color:#a17a26\}/);
 assert.match(css,/\.chat-chest-open\{width:100%;margin-top:10px\}/);
});
