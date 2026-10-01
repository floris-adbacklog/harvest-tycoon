-- The welcome message in the farmer's own language (1 Oct 2026). On top of welcome-dm.sql: the English text stays the one in
-- welcome_dm_config and goes to everyone whose language has no text of its own; each other language can have its own text, set in
-- the Admin dashboard (Settings, Welcome message, Language). The language is the game's language the farmer last opened it in
-- (player_seen.language, saved by farm-api on every load, admin-player-language.sql). An empty text removes it: English again.

create table if not exists public.welcome_dm_texts (
 language text primary key check (language ~ '^[a-z]{2}$' and language<>'en'),
 body text not null check (char_length(body) between 1 and 500),
 updated_at timestamptz not null default now()
);
alter table public.welcome_dm_texts enable row level security;
revoke all on public.welcome_dm_texts from anon, authenticated;

-- The admin reads the setting with every language's own text.
create or replace function public.welcome_dm_get()
 returns jsonb language plpgsql stable security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid()); c public.welcome_dm_config;
begin
 if me is null or public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 select * into c from public.welcome_dm_config where id;
 return jsonb_build_object('enabled',c.enabled,'body',c.body,'delayMinutes',c.delay_minutes,'enabledSince',c.enabled_since,
  'sent',(select count(*) from public.welcome_dm_sent),'lastSentAt',(select max(sent_at) from public.welcome_dm_sent),
  'texts',coalesce((select jsonb_object_agg(t.language,t.body) from public.welcome_dm_texts t),'{}'::jsonb));
end $function$;

-- The admin saves one language's own text; an empty one removes it, and that language gets the English text again.
create or replace function public.welcome_dm_save_text(p_language text, p_body text)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare me uuid:=(select auth.uid()); msg text:=btrim(coalesce(p_body,''));
begin
 if me is null or public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;
 if p_language is null or p_language !~ '^[a-z]{2}$' or p_language='en' then raise exception 'Choose a language.' using errcode='22023'; end if;
 if char_length(msg)>500 then raise exception 'Write 1–500 characters.' using errcode='22023'; end if;
 if msg='' then delete from public.welcome_dm_texts where language=p_language;
 else insert into public.welcome_dm_texts(language,body) values(p_language,msg)
  on conflict (language) do update set body=excluded.body,updated_at=now();
 end if;
 return public.welcome_dm_get();
end $function$;

-- Every minute (pg_cron), as before, now in the farmer's language when it has its own text.
create or replace function public.welcome_dm_run()
 returns integer language plpgsql security definer set search_path to '' as $function$
declare c public.welcome_dm_config; nm text; av text; vip boolean; n integer:=0; r record; ch text;
begin
 select * into c from public.welcome_dm_config where id;
 if not c.enabled or c.sender is null or c.enabled_since is null then return 0; end if;
 select ps.username, ps.avatar_id, coalesce(ps.vip_expires_at>now(),false) into nm, av, vip from public.player_stats ps where ps.player_id=c.sender;
 if nm is null then return 0; end if;
 for r in
  select u.id, ps.username, t.body as own from auth.users u join public.player_stats ps on ps.player_id=u.id
   left join public.player_seen seen on seen.player_id=u.id
   left join public.welcome_dm_texts t on t.language=seen.language
  where u.created_at>=greatest(c.enabled_since,now()-interval '1 day') and u.created_at<=now()-make_interval(mins=>c.delay_minutes)
   and not coalesce(u.is_anonymous,false) and u.id<>c.sender and ps.username is not null
   and ps.level>=(select cc.dm_level from public.chat_config cc)
   and not exists(select 1 from public.welcome_dm_sent s where s.player_id=u.id)
   and not exists(select 1 from public.chat_sanctions s where s.player_id=u.id and s.banned)
  order by u.created_at limit 200
 loop
  ch:='dm:'||(case when c.sender::text<r.id::text then c.sender::text||':'||r.id::text else r.id::text||':'||c.sender::text end);
  insert into public.welcome_dm_sent(player_id) values(r.id) on conflict do nothing;
  if not found then continue; end if;
  insert into public.chat_messages(channel,sender,sender_name,sender_avatar,sender_staff,sender_vip,body)
   values(ch,c.sender,nm,av,true,vip,left(replace(coalesce(r.own,c.body),'{name}',r.username),500));
  insert into public.chat_reads(player_id,channel,last_read_at) values(c.sender,ch,now())
   on conflict (player_id,channel) do update set last_read_at=excluded.last_read_at;
  n:=n+1;
 end loop;
 return n;
end $function$;
revoke all on function public.welcome_dm_run() from public, anon, authenticated;
revoke all on function public.welcome_dm_get() from public, anon;
revoke all on function public.welcome_dm_save_text(text,text) from public, anon;
grant execute on function public.welcome_dm_get() to authenticated;
grant execute on function public.welcome_dm_save_text(text,text) to authenticated;

-- The first texts: the English welcome of 1 Oct 2026 in every game language. A text the admin already set is kept.
insert into public.welcome_dm_texts(language,body) values
 ('nl',$t$Welkom in de vallei! 🌾 Ik ben Tony, de maker van Harvest Tycoon. We zijn gloednieuw en er komen elke dag tientallen boeren bij, dus jij bent een van de eersten! Je boerennaam is voorlopig {name}. Liever een andere? Die pas je altijd aan in Instellingen. Tips en antwoorden staan in de wiki (het boekje met het vraagteken). Vragen of ideeën? Antwoord gewoon op dit bericht, het komt rechtstreeks bij mij. Veel boerenplezier!$t$),
 ('de',$t$Willkommen im Tal! 🌾 Ich bin Tony, der Macher von Harvest Tycoon. Wir sind ganz neu und jeden Tag kommen Dutzende Farmer dazu, du bist also einer der Ersten! Dein Farmername ist vorerst {name}. Lieber einen anderen? Du kannst ihn jederzeit in den Einstellungen ändern. Tipps und Antworten stehen im Wiki (das kleine Buch mit dem Fragezeichen). Fragen oder Ideen? Antworte einfach auf diese Nachricht, sie kommt direkt bei mir an. Viel Spaß auf der Farm!$t$),
 ('fr',$t$Bienvenue dans la vallée ! 🌾 Je suis Tony, le créateur de Harvest Tycoon. Le jeu est tout neuf et des dizaines de fermiers arrivent chaque jour : tu es parmi les premiers ! Ton nom de fermier est {name} pour l'instant. Tu en veux un autre ? Change-le quand tu veux dans Paramètres. Astuces et réponses sont dans le wiki (le petit livre avec le point d'interrogation). Une question, une idée ? Réponds à ce message, il m'arrive directement. Bonne récolte !$t$),
 ('es',$t$¡Bienvenido al valle! 🌾 Soy Tony, el creador de Harvest Tycoon. Somos nuevos y cada día se unen decenas de granjeros, ¡así que eres de los primeros! Por ahora tu nombre de granjero es {name}. ¿Prefieres otro? Puedes cambiarlo cuando quieras en Ajustes. Hay consejos y respuestas en la wiki (el librito con el signo de interrogación). ¿Preguntas o ideas? Responde a este mensaje, me llega directamente. ¡Feliz cosecha!$t$),
 ('pt',$t$Bem-vindo ao vale! 🌾 Eu sou o Tony, o criador do Harvest Tycoon. Somos novinhos e dezenas de fazendeiros chegam todo dia, então você é um dos primeiros! Seu nome de fazendeiro por enquanto é {name}. Quer outro? Dá para mudar quando quiser em Configurações. Dicas e respostas estão na wiki (o livrinho com o ponto de interrogação). Dúvidas ou ideias? É só responder esta mensagem, ela chega direto para mim. Boa colheita!$t$),
 ('id',$t$Selamat datang di lembah! 🌾 Aku Tony, pembuat Harvest Tycoon. Game ini masih baru dan puluhan petani bergabung setiap hari, jadi kamu salah satu yang pertama! Nama petanimu untuk sementara {name}. Mau nama lain? Kamu bisa menggantinya kapan saja di Pengaturan. Tips dan jawaban ada di wiki (buku kecil dengan tanda tanya). Ada pertanyaan atau ide? Balas saja pesan ini, langsung sampai ke aku. Selamat bertani!$t$),
 ('tr',$t$Vadiye hoş geldin! 🌾 Ben Tony, Harvest Tycoon'un yapımcısıyım. Oyun yepyeni ve her gün onlarca çiftçi katılıyor, yani sen ilklerdensin! Çiftçi adın şimdilik {name}. Başka bir ad mı istersin? Ayarlar'dan istediğin zaman değiştirebilirsin. İpuçları ve cevaplar wiki'de (soru işaretli küçük kitap). Sorun ya da fikrin mi var? Bu mesajı yanıtlaman yeterli, doğrudan bana gelir. İyi çiftçilikler!$t$),
 ('cs',$t$Vítej v údolí! 🌾 Jsem Tony, tvůrce Harvest Tycoonu. Jsme úplně noví a každý den přibývají desítky farmářů, takže patříš mezi první! Tvoje jméno farmáře je zatím {name}. Chceš jiné? Kdykoli ho změníš v Nastavení. Tipy a odpovědi najdeš ve wiki (knížka s otazníkem). Máš otázku nebo nápad? Stačí odpovědět na tuhle zprávu, přijde rovnou mně. Ať se ti na farmě daří!$t$),
 ('hu',$t$Üdv a völgyben! 🌾 Tony vagyok, a Harvest Tycoon készítője. Vadonatújak vagyunk, és naponta több tucat gazda csatlakozik, szóval az elsők között vagy! A gazdaneved egyelőre {name}. Másikat szeretnél? A Beállításokban bármikor megváltoztathatod. Tippeket és válaszokat a wikiben találsz (a kis könyv a kérdőjellel). Kérdésed vagy ötleted van? Csak válaszolj erre az üzenetre, egyenesen hozzám jut. Jó gazdálkodást!$t$),
 ('ru',$t$Добро пожаловать в долину! 🌾 Я Тони, создатель Harvest Tycoon. Игра совсем новая, и каждый день к нам приходят десятки фермеров, так что ты один из первых! Пока твоё имя фермера — {name}. Хочешь другое? Его можно поменять в любой момент в Настройках. Советы и ответы есть в вики (маленькая книжка со знаком вопроса). Вопросы или идеи? Просто ответь на это сообщение, оно придёт прямо ко мне. Удачи на ферме!$t$),
 ('uk',$t$Ласкаво просимо в долину! 🌾 Я Тоні, творець Harvest Tycoon. Гра зовсім нова, і щодня до нас приходять десятки фермерів, тож ти один із перших! Поки що твоє ім’я фермера — {name}. Хочеш інше? Його можна змінити будь-коли в Налаштуваннях. Поради й відповіді є у вікі (маленька книжечка зі знаком питання). Питання чи ідеї? Просто відповідай на це повідомлення, воно прийде прямо до мене. Вдалого фермерства!$t$),
 ('hi',$t$घाटी में आपका स्वागत है! 🌾 मैं टोनी हूँ, Harvest Tycoon का निर्माता। गेम बिल्कुल नया है और हर दिन दर्जनों किसान जुड़ रहे हैं, यानी आप सबसे पहले किसानों में से एक हैं! अभी आपका किसान नाम {name} है। कोई और नाम चाहिए? आप इसे कभी भी सेटिंग्स में बदल सकते हैं। टिप्स और जवाब विकी में हैं (प्रश्नचिह्न वाली छोटी किताब)। सवाल या कोई आइडिया? बस इस संदेश का जवाब दें, यह सीधे मुझ तक पहुँचता है। खेती का मज़ा लें!$t$),
 ('ja',$t$谷へようこそ！🌾 Harvest Tycoon を作っているトニーです。始まったばかりのゲームで、毎日何十人もの農家さんが参加しています。あなたは最初期の仲間のひとりです！農家名は今のところ {name} です。別の名前がいいですか？設定からいつでも変えられます。ヒントや答えはウィキ（はてなマークの小さな本）にあります。質問やアイデアがあれば、このメッセージにそのまま返信してください。私に直接届きます。楽しい農場ライフを！$t$),
 ('ar',$t$مرحبًا بك في الوادي! 🌾 أنا توني، صانع Harvest Tycoon. اللعبة جديدة تمامًا وينضم إلينا عشرات المزارعين كل يوم، لذا فأنت من أوائلهم! اسمك كمزارع الآن هو {name}. تريد اسمًا آخر؟ يمكنك تغييره في أي وقت من الإعدادات. ستجد النصائح والإجابات في الويكي (الكتاب الصغير الذي عليه علامة استفهام). لديك سؤال أو فكرة؟ فقط ردّ على هذه الرسالة، فهي تصلني مباشرة. زراعة سعيدة!$t$),
 ('zh',$t$欢迎来到山谷！🌾 我是 Tony，Harvest Tycoon 的制作者。游戏刚刚上线，每天都有几十位农夫加入，所以你是最早的一批！你的农夫名称暂时是 {name}。想换一个？随时可以在设置中修改。小贴士和答案都在百科里（带问号的小书）。有问题或想法？直接回复这条消息就行，它会直接送到我这里。祝你种田愉快！$t$)
on conflict (language) do nothing;
