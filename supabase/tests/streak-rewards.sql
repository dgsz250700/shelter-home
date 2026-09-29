begin;
-- Test milestones: 1st arrival 1 day, 2nd arrival 2 days, the rest 1 day; adoption 2 days; refill 1 day.
update public.reward_rules set arrival_days=array[1,2,1,1,1,1,1],adoption_days=2,refill_days=1 where id=1;
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
create function pg_temp.residents() returns int language sql as $$select count(*)::int from public.cat_unlocks where user_id=auth.uid() and admitted and adopted_at is null$$;
do $$
declare uid uuid:=auth.uid();today date:=(now() at time zone 'America/Bogota')::date;r jsonb;day int;adopted uuid;before int;
begin
 update public.cat_unlocks set admitted=false,adopted_at=null,care_count=0 where user_id=uid;
 update public.reward_progress set progress_days=0,arrivals=0,adoptions=0,last_event=null where user_id=uid;
 update public.streaks set current=0,total_days=0 where user_id=uid;
 -- Stage 1: fill the shelter following the configured milestones.
 r:=pg_temp.reward_day('daily',10,true);
 if r->'cat'->>'slug' is distinct from 'cat_01' then raise exception 'First milestone must bring cat_01, got %',r->'cat';end if;
 if r->>'reward' is distinct from 'bed' then raise exception 'Care cycle changed';end if;
 r:=pg_temp.reward_day('daily',10,true);
 if r->'cat'<>'null'::jsonb or (r->'rewards'->>'progressDays')::int<>1 or (r->'rewards'->>'needed')::int<>2 then raise exception 'Second arrival needs two days: %',r->'rewards';end if;
 r:=pg_temp.reward_day('daily',10,true);
 if r->'cat'->>'slug' is distinct from 'cat_02' then raise exception 'Second milestone must bring cat_02';end if;
 for day in 3..7 loop
  r:=pg_temp.reward_day('daily',10,true);
  if r->'cat'->>'slug' is distinct from format('cat_%s',lpad(day::text,2,'0')) then raise exception 'Wrong arrival %',day;end if;
 end loop;
 if pg_temp.residents()<>7 or r->'rewards'->>'next'<>'adoption' then raise exception 'Shelter must be full and wait for an adoption';end if;
 -- Stage 2: a full shelter adopts instead of receiving an eighth cat.
 r:=pg_temp.reward_day('daily',10,true);
 if r->'cat'<>'null'::jsonb or r->'adopted'<>'null'::jsonb then raise exception 'Adoption needs two days';end if;
 r:=pg_temp.reward_day('daily',10,true);
 adopted:=(r->'adopted'->>'id')::uuid;
 if adopted is null or r->'cat'<>'null'::jsonb then raise exception 'Second full day must adopt';end if;
 if not exists(select 1 from public.cat_unlocks where user_id=uid and cat_id=adopted and adopted_at is not null) then raise exception 'Adoption not persistent';end if;
 if pg_temp.residents()<>6 or r->'rewards'->>'next'<>'arrival' then raise exception 'Adoption must free a space';end if;
 if r->'careCat'->>'id'=adopted::text then raise exception 'Adopted cat cannot receive care';end if;
 r:=pg_temp.reward_day('daily',10,true);
 if r->'cat'->>'slug' is distinct from 'cat_08' or pg_temp.residents()<>7 then raise exception 'Free space must receive the next catalog cat';end if;
 -- Breaking the streak restarts the count, never the rewards.
 before:=pg_temp.residents();
 update public.streaks set last_session_date=today-5 where user_id=uid;
 if (public.reward_status()->>'progressDays')::int<>0 then raise exception 'A broken streak must show no progress';end if;
 r:=pg_temp.reward_day('daily',10,false);
 if (r->'streak'->>'current')::int<>1 or r->'adopted'<>'null'::jsonb or (r->'rewards'->>'progressDays')::int<>1 then raise exception 'Restarted streak counts from one: %',r;end if;
 if pg_temp.residents()<>before or not exists(select 1 from public.cat_unlocks where user_id=uid and cat_id=adopted and adopted_at is not null) then raise exception 'Breaking the streak removed rewards';end if;
 -- Free practice and failed challenges never advance rewards.
 r:=pg_temp.reward_day('free',10,true);
 if r->'reward'<>'null'::jsonb or (r->'rewards'->>'progressDays')::int<>1 then raise exception 'Free practice advanced rewards';end if;
 r:=pg_temp.reward_day('daily',6,true);
 if r->'reward'<>'null'::jsonb or (r->'rewards'->>'progressDays')::int<>1 then raise exception 'Failed challenge advanced rewards';end if;
 if (select arrivals from public.reward_progress where user_id=uid)<>8 or (select adoptions from public.reward_progress where user_id=uid)<>1 then raise exception 'Accumulated counters are wrong';end if;
end $$;
rollback;
select 'PASS: milestone arrivals, capacity of seven, random adoptions, refill, streak reset without losing rewards, idempotence' as result;
