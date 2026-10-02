-- Arrivals need 1, 2, 3 … 7 streak days, counted after the previous arrival.
-- Two complete free practices take one day off the next arrival, once per cat.
-- The cat still arrives only when a daily challenge is passed, and a broken streak starts over.
begin;

alter table public.reward_progress
 add column boost_practices int not null default 0 check(boost_practices between 0 and 2),
 add column boost_used boolean not null default false;

update public.reward_rules set arrival_days=array[1,2,3,4,5,6,7],updated_at=now() where id=1;

create or replace function public.reward_status() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare uid uuid:=auth.uid();rules public.reward_rules;p public.reward_progress;st public.streaks;residents int;available int;kind text;needed int;today date:=(now() at time zone 'America/Bogota')::date;
 alive boolean;progress int;used boolean;practices int;
begin
 select * into rules from public.reward_rules where id=1;
 select * into p from public.reward_progress where user_id=uid;
 select * into st from public.streaks where user_id=uid;
 select count(*) into residents from public.cat_unlocks where user_id=uid and admitted and adopted_at is null;
 select count(*) into available from public.cats c where not exists(select 1 from public.cat_unlocks u where u.user_id=uid and u.cat_id=c.id and u.admitted);
 if residents>=rules.capacity then kind:='adoption';needed:=rules.adoption_days;
 else
  needed:=case when coalesce(p.arrivals,0)<cardinality(rules.arrival_days) then rules.arrival_days[coalesce(p.arrivals,0)+1] else rules.refill_days end;
  kind:=case when available>0 then 'arrival' else 'waiting' end;
 end if;
 -- A broken streak restarts the count toward the next event, and the practice boost with it.
 alive:=coalesce(st.last_session_date>=today-1,false);
 progress:=case when alive then least(coalesce(p.progress_days,0),needed) else 0 end;
 used:=alive and coalesce(p.boost_used,false);
 practices:=case when alive then coalesce(p.boost_practices,0) else 0 end;
 return jsonb_build_object('next',kind,'needed',needed,'capacity',rules.capacity,'residents',residents,'adopted',coalesce(p.adoptions,0),
  'progressDays',progress,
  -- The boost only helps an arrival with at least two days still to go: the last day always comes from a challenge.
  'boost',jsonb_build_object('practices',practices,'used',used,'available',kind='arrival' and alive and not used and needed-progress>=2));
end $$;
revoke all on function public.reward_status() from public,anon;
grant execute on function public.reward_status() to authenticated;

create or replace function public.finish_mission_atomic(p_session uuid,p_duration int,p_is_test boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid();s public.sessions;r public.streaks;cid uuid;today date:=(now() at time zone 'America/Bogota')::date;corrects int;next_streak int;reward text;already_today boolean;passed_now boolean;care_id uuid;adopt_id uuid;
 status jsonb;progress int;event text;boosted boolean;continued boolean;
begin
 if uid is null then raise exception 'Student required';end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 select * into s from public.sessions where id=p_session and user_id=uid;
 if not found then raise exception 'Practice unavailable';end if;
 if not s.completed then
  if cardinality(s.completed_seeds)<>10 then raise exception 'Complete ten steps';end if;
  select count(*) filter(where correct) into corrects from (
    select distinct on(exercise_seed) correct from public.attempts where session_id=p_session and user_id=uid and exercise_seed=any(s.completed_seeds) order by exercise_seed,created_at,id
  ) first_answers;
  passed_now:=corrects>=7;
  select exists(select 1 from public.sessions where user_id=uid and date=today and mode='daily' and passed) into already_today;
  select * into r from public.streaks where user_id=uid;
  next_streak:=coalesce(r.current,0);
  if s.mode='free' then
   -- A complete free practice counts toward the boost while it can still help.
   status:=public.reward_status();
   if (status->'boost'->>'available')::boolean then
    insert into public.reward_progress(user_id,boost_practices,boost_used) values(uid,1,false)
    on conflict(user_id) do update set boost_practices=least(2,public.reward_progress.boost_practices+1),boost_used=public.reward_progress.boost_practices+1>=2,updated_at=now();
   end if;
  end if;
  if s.mode='daily' and passed_now and s.date=today and not already_today then
   continued:=r.last_session_date=today-1;
   next_streak:=case when continued then r.current+1 else 1 end;
   reward:=(array['bed','food','box','treat','toy','yarn','vet'])[coalesce(r.total_days,0)%7+1];
   insert into public.streaks(user_id,current,best,total_days,last_session_date) values(uid,next_streak,greatest(coalesce(r.best,0),next_streak),coalesce(r.total_days,0)+1,today)
   on conflict(user_id) do update set current=excluded.current,best=excluded.best,total_days=excluded.total_days,last_session_date=excluded.last_session_date;
   update public.shelter_state set food=food+(reward='food')::int,boxes=boxes+(reward='box')::int,beds=beds+(reward='bed')::int,treats=treats+(reward='treat')::int,toys=toys+(reward='toy')::int,yarn=yarn+(reward='yarn')::int,vet_visits=vet_visits+(reward='vet')::int,affection=affection+1,last_care_date=today,last_reward=reward,updated_at=now() where user_id=uid;
   status:=public.reward_status();
   select case when continued then coalesce(p.progress_days,0)+1 else 1 end,coalesce(continued and p.boost_used,false) into progress,boosted from (select 1) one left join public.reward_progress p on p.user_id=uid;
   if progress>=(status->>'needed')::int-(case when boosted and status->>'next'='arrival' then 1 else 0 end) then
    if status->>'next'='arrival' then
     select c.id into cid from public.cats c where not exists(select 1 from public.cat_unlocks u where u.user_id=uid and u.cat_id=c.id and u.admitted) order by c.sort_order limit 1;
     insert into public.cat_unlocks(user_id,cat_id,admitted) values(uid,cid,true) on conflict(user_id,cat_id) do update set admitted=true,unlocked_at=now();
     progress:=0;event:='arrival';
    elsif status->>'next'='adoption' then
     select cat_id into adopt_id from public.cat_unlocks where user_id=uid and admitted and adopted_at is null order by random() limit 1;
     update public.cat_unlocks set adopted_at=now() where user_id=uid and cat_id=adopt_id;
     progress:=0;event:='adoption';
    else progress:=least(progress,(status->>'needed')::int);
    end if;
   end if;
   -- A new cycle (event or broken streak) starts without practices toward the boost.
   insert into public.reward_progress(user_id,progress_days,arrivals,adoptions,last_event,last_event_at,boost_practices,boost_used)
    values(uid,progress,coalesce(event='arrival',false)::int,coalesce(event='adoption',false)::int,event,case when event is not null then now() end,0,false)
    on conflict(user_id) do update set progress_days=excluded.progress_days,arrivals=public.reward_progress.arrivals+excluded.arrivals,adoptions=public.reward_progress.adoptions+excluded.adoptions,
     last_event=coalesce(excluded.last_event,public.reward_progress.last_event),last_event_at=coalesce(excluded.last_event_at,public.reward_progress.last_event_at),
     boost_practices=case when event is null and continued then public.reward_progress.boost_practices else 0 end,
     boost_used=case when event is null and continued then public.reward_progress.boost_used else false end,
     updated_at=now();
   select u.cat_id into care_id from public.cat_unlocks u join public.cats c on c.id=u.cat_id
     where u.user_id=uid and u.admitted and u.adopted_at is null
     order by u.care_count,case when
       (reward='box' and c.personality='curioso') or (reward='bed' and c.personality in ('dormilón','asustadizo')) or
       (reward='treat' and c.personality in ('cariñoso','gruñón','elegante')) or (reward='toy' and c.personality in ('travieso','loquito')) or
       (reward='yarn' and c.personality in ('travieso','curioso')) then 0 else 1 end,c.id limit 1;
   update public.cat_unlocks set care_count=care_count+1 where user_id=uid and cat_id=care_id;
  end if;
  update public.sessions set completed=true,passed=passed_now,correct_count=corrects,total_count=10,duration_ms=greatest(0,least(7200000,p_duration)),cat_id=cid,care_cat_id=care_id,adopted_cat_id=adopt_id,daily_reward=reward where id=p_session and user_id=uid returning * into s;
  insert into public.app_events(id,actor_id,actor_kind,event_name,surface,session_id,is_test,properties) values(gen_random_uuid(),uid,'shared_refuge','mission_completed','refuge',p_session,p_is_test,jsonb_build_object('correct',corrects,'duration_ms',p_duration,'reward',reward,'care_cat_id',care_id,'arrived_cat_id',cid,'adopted_cat_id',adopt_id,'reward_event',event,'streak',next_streak,'mode',s.mode,'daily_try',s.daily_try,'passed',passed_now));
 else cid:=s.cat_id;care_id:=s.care_cat_id;adopt_id:=s.adopted_cat_id;reward:=s.daily_reward;
 end if;
 select * into r from public.streaks where user_id=uid;
 return jsonb_build_object('streak',to_jsonb(r),'cat',public.cat_card(uid,cid),'careCat',public.cat_card(uid,care_id),'adopted',public.cat_card(uid,adopt_id),'reward',reward,'rewards',public.reward_status(),
  'state',(select to_jsonb(st) from public.shelter_state st where user_id=uid),'passed',s.passed,'correct',s.correct_count,'mode',s.mode,'dailyTry',s.daily_try);
end $$;
revoke all on function public.finish_mission_atomic(uuid,int,boolean) from public,anon;
grant execute on function public.finish_mission_atomic(uuid,int,boolean) to authenticated;

commit;
