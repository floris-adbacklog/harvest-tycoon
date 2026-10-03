-- A check of supabase/support.sql's limits on the real database (3 Oct 2026): run it after support.sql in the SQL editor. Everything
-- happens inside one transaction that is rolled back at the end, so nothing stays behind. It passes when it ends with the notice
-- "support_submit: all checks passed"; a failed assert stops it with the check that failed. The network hashes are md5s (32 characters,
-- as the table asks).
begin;
do $t$
declare r jsonb; i integer; mails integer;
begin
 -- One network: three an hour, the fourth hears null (the farmer: #error-busy).
 for i in 1..3 loop
  r:=public.support_submit(format('check%s@example.com',i),null,'other','A check of the support limits','en','web',null,md5('check-net'),false,3,3,200,1000);
  assert r->>'id' is not null and (r->>'mail')::boolean,format('network message %s stored and mailed',i);
 end loop;
 assert public.support_submit('check4@example.com',null,'other','A check of the support limits','en','web',null,md5('check-net'),false,3,3,200,1000) is null,'the 4th from one network refused';
 -- One address, from three networks: three an hour, then null (in any case of letters).
 for i in 1..3 loop
  assert public.support_submit('Check.Same@example.com',null,'bug','A check of the support limits','nl','android',null,md5(format('check-address-%s',i)),false,3,3,200,1000) is not null,format('address message %s stored',i);
 end loop;
 assert public.support_submit('check.same@EXAMPLE.com',null,'bug','A check of the support limits','nl','android',null,md5('check-address-4'),false,3,3,200,1000) is null,'the 4th from one address refused';
 -- No address known: the network limit is skipped.
 assert public.support_submit('check5@example.com',null,'other','A check of the support limits','en','ios',null,null,false,3,3,200,1000) is not null,'no network hash: stored';
 -- Past the day's mails: still stored, not mailed; spam: stored, never mailed.
 select count(*) into mails from public.support_messages where mailed and created_at>now()-interval '1 day';
 r:=public.support_submit('check6@example.com',null,'other','A check of the support limits','en','web',null,md5('check-6'),false,3,3,mails,1000);
 assert r->>'id' is not null and not (r->>'mail')::boolean,'past the mails of the day: stored, not mailed';
 r:=public.support_submit('check7@example.com',null,'other','A check of the support limits','en','web',null,md5('check-7'),true,3,3,200,1000);
 assert r->>'id' is not null and not (r->>'mail')::boolean,'spam: stored, not mailed';
 assert (select spam and not mailed from public.support_messages where id=(r->>'id')::bigint),'spam row marked';
 -- The hard ceiling: nothing stored past it.
 assert public.support_submit('check8@example.com',null,'other','A check of the support limits','en','web',null,md5('check-8'),false,3,3,200,0) is null,'past the ceiling refused';
 raise notice 'support_submit: all checks passed';
end $t$;
rollback;
