begin;
-- Default rules after 20261002120000: arrivals need 1, 2, 3 … 7 days; two free practices take one day off, once per cat.
select set_config('request.jwt.claim.sub',(select id::text from public.profiles where role='student' limit 1),true);
set local role authenticated;
create function pg_temp.reward_day(test_mode text,score int,continued boolean) returns jsonb language plpgsql as $$
declare uid uuid:=auth.uid();today date:=(now() at time zone 'America/Bogota')::date;sk uuid;q jsonb;s jsonb;sid uuid;seed text;n int;r jsonb;again jsonb;residents int;
begin
 update public.sessions set date=today-60 where user_id=uid and date=today;
 update public.streaks set last_session_date=case when continued then today-1 else today-5 end,current=case when continued then current else 0 end where user_id=uid;
 select id into sk from public.skills limit 1;
 select jsonb_agg(jsonb_build_object('skillId',sk,'family','equations','level',1,'seed',gen_random_uuid()::text)) into q from generate_series(1,10);
 s:=public.start_practice_atomic(test_mode,q);sid:=(s->>'id')::uuid;
 for n in 1..10 loop
  seed:=q->(n-1)->>'seed';insert into public.attempts(user_id,skill_id,level,exercise_seed,prompt_text,expected_answer,given_answer,correct,response_ms,hint_level,session_id) values(uid,sk,1,seed,'Isolated reward verification','1','1',n<=score,1000,0,sid);perform public.complete_question_atomic(sid,seed);
 end loop;
 r:=public.finish_mission_atomic(sid,10000,true);again:=public.finish_mission_atomic(sid,10000,true);
 if r<>again then raise exception 'Completion must be idempotent';end if;
 select count(*) into residents from public.cat_unlocks where user_id=uid and admitted and adopted_at is null;
 if residents>7 then raise exception 'More than seven cats in the shelter';end if;
 if (r->'rewards'->>'residents')::int<>residents then raise exception 'Status disagrees with the shelter';end if;
 return r;
end $$;
create function pg_temp.boost() returns jsonb language sql as $$select public.reward_status()->'boost'$$;
do $$
declare uid uuid:=auth.uid();r jsonb;st jsonb;
begin
 update public.cat_unlocks set admitted=false,adopted_at=null,care_count=0 where user_id=uid;
 update public.reward_progress set progress_days=0,arrivals=0,adoptions=0,last_event=null,boost_practices=0,boost_used=false where user_id=uid;
 update public.streaks set current=0,total_days=0 where user_id=uid;
 -- 1st cat: one day.
 r:=pg_temp.reward_day('daily',8,false);
 if r->'cat'='null'::jsonb then raise exception 'First cat must arrive after one day';end if;
 st:=public.reward_status();
 if (st->>'needed')::int<>2 or not (st->'boost'->>'available')::boolean then raise exception 'Second cat needs two days and offers the boost: %',st;end if;
 -- Two complete free practices use the boost; a third one does nothing more.
 r:=pg_temp.reward_day('free',3,true);
 if (pg_temp.boost()->>'practices')::int<>1 or (pg_temp.boost()->>'used')::boolean then raise exception 'One practice is half the boost: %',pg_temp.boost();end if;
 r:=pg_temp.reward_day('free',10,true);
 if not (pg_temp.boost()->>'used')::boolean or (pg_temp.boost()->>'available')::boolean then raise exception 'Two practices use the boost: %',pg_temp.boost();end if;
 if r->'cat'<>'null'::jsonb or (r->'rewards'->>'progressDays')::int<>0 then raise exception 'Practices never bring a cat or add streak days';end if;
 -- 2nd cat arrives with the next challenge: 1 streak day + the boost.
 r:=pg_temp.reward_day('daily',8,true);
 if r->'cat'='null'::jsonb then raise exception 'Boosted second cat must arrive after one more challenge';end if;
 if (pg_temp.boost()->>'used')::boolean or (pg_temp.boost()->>'practices')::int<>0 then raise exception 'A new cat starts a fresh boost';end if;
 -- 3rd cat (3 days): a broken streak starts over, practices included.
 r:=pg_temp.reward_day('daily',8,true);
 r:=pg_temp.reward_day('free',5,true);
 if (pg_temp.boost()->>'practices')::int<>1 then raise exception 'Practice must count during the streak';end if;
 r:=pg_temp.reward_day('daily',8,false);
 if (r->'rewards'->>'progressDays')::int<>1 or (r->'rewards'->'boost'->>'practices')::int<>0 then raise exception 'Broken streak resets days and practices: %',r->'rewards';end if;
 -- Without the boost, the 3rd cat needs all three days.
 r:=pg_temp.reward_day('daily',8,true);
 if r->'cat'<>'null'::jsonb then raise exception 'Third cat must not arrive after two days';end if;
 if (r->'rewards'->'boost'->>'available')::boolean then raise exception 'With one day left the boost cannot help';end if;
 r:=pg_temp.reward_day('free',10,true);r:=pg_temp.reward_day('free',10,true);
 if (pg_temp.boost()->>'practices')::int<>0 then raise exception 'Practices must not count when the boost cannot help';end if;
 r:=pg_temp.reward_day('daily',8,true);
 if r->'cat'='null'::jsonb then raise exception 'Third cat arrives on the third day';end if;
 -- A failed challenge never advances, even with the boost.
 r:=pg_temp.reward_day('free',10,true);r:=pg_temp.reward_day('free',10,true);
 r:=pg_temp.reward_day('daily',3,true);
 if r->'cat'<>'null'::jsonb then raise exception 'A failed challenge never rescues a cat';end if;
 if (select arrivals from public.reward_progress where user_id=uid)<>3 then raise exception 'Expected three arrivals';end if;
end $$;
rollback;
select 'PASS: 1-2-3 day arrivals, practice boost once per cat, only with a passed challenge, reset on broken streak' as result;
