begin;
-- Cats are drawn from traits; the personality decides pose and expression, so the sprite cell and stored expressions go away.
alter table public.cats add column size text not null default 'medium' check(size in ('small','medium','large')),
 add column build text not null default 'normal' check(build in ('slim','normal','chubby')),
 add column coat text not null default 'short' check(coat in ('short','fluffy')),
 add column tail text not null default 'normal' check(tail in ('thin','normal','fluffy')),
 add column ears text not null default 'normal' check(ears in ('small','normal','large')),
 drop column art_variant, drop column expressions;
update public.cats c set personality=t.personality,size=t.size,build=t.build,coat=t.coat,tail=t.tail,ears=t.ears,pattern=t.pattern,palette=t.palette::jsonb,accessories=t.accessories,story=coalesce(t.story,c.story)
from (values
 ('cat_01','curioso','medium','normal','short','normal','large','atigrado','{"body":"#d99a5b","belly":"#f7e6cf"}',array['cascabel'],null),
 ('cat_02','gruñón','large','chubby','short','thin','small','ahumado','{"body":"#857a72","belly":"#d8cdbf"}',array[]::text[],null),
 ('cat_03','asustadizo','small','slim','fluffy','fluffy','large','liso','{"body":"#9aa0a6","belly":"#eeeae4"}',array[]::text[],null),
 ('cat_04','travieso','small','slim','short','thin','normal','atigrado','{"body":"#e0af82","belly":"#fff1db"}',array['cascabel'],null),
 ('cat_05','dormilón','large','chubby','fluffy','fluffy','small','liso','{"body":"#e4ded2","belly":"#fff8ec"}',array[]::text[],null),
 ('cat_06','cariñoso','medium','chubby','short','normal','normal','bicolor','{"body":"#ceab6a","belly":"#fbf3e4"}',array['moño'],null),
 ('cat_07','elegante','large','slim','short','normal','large','liso','{"body":"#ae7f54","belly":"#f4e4d0"}',array['pañuelo'],null),
 ('cat_08','elegante','medium','slim','fluffy','fluffy','normal','ahumado','{"body":"#77716a","belly":"#eee8df"}',array[]::text[],'Llegó caminando despacio bajo la lluvia, sin despeinarse. Siempre elige el cojín más alto.'),
 ('cat_09','loquito','medium','normal','fluffy','fluffy','normal','bicolor','{"body":"#e2a064","belly":"#fff4e4"}',array[]::text[],'Llegó rodando detrás de una pelota. Nadie sabe cómo termina siempre patas arriba.'),
 ('cat_10','cariñoso','small','chubby','short','normal','small','atigrado','{"body":"#c58b55","belly":"#f6e6d2"}',array[]::text[],null),
 ('cat_11','dormilón','medium','chubby','short','thin','normal','liso','{"body":"#efe3cf","belly":"#fffaf2"}',array[]::text[],null),
 ('cat_12','curioso','small','normal','fluffy','fluffy','large','bicolor','{"body":"#3c3633","belly":"#fbf6ee"}',array['moño'],null),
 ('cat_13','travieso','medium','slim','short','thin','large','ahumado','{"body":"#968d84","belly":"#e9e3db"}',array['cascabel'],null),
 ('cat_14','gruñón','medium','normal','fluffy','normal','small','atigrado','{"body":"#a8906f","belly":"#eadcc6"}',array[]::text[],null),
 ('cat_15','asustadizo','small','normal','short','normal','large','liso','{"body":"#eab987","belly":"#fff3e2"}',array['moño'],null)
) as t(slug,personality,size,build,coat,tail,ears,pattern,palette,accessories,story) where c.slug=t.slug;
alter table public.cats add constraint cats_personality_check check(personality in ('gruñón','dormilón','cariñoso','travieso','asustadizo','curioso','elegante','loquito')),
 add constraint cats_pattern_check check(pattern in ('liso','atigrado','bicolor','ahumado'));

create or replace function public.cat_card(p_user uuid,p_cat uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',c.id,'slug',c.slug,'name',c.name,'personality',c.personality,'story',c.story,'palette',c.palette,
  'size',c.size,'build',c.build,'coat',c.coat,'tail',c.tail,'ears',c.ears,'pattern',c.pattern,'accessories',c.accessories,
  'unlockedAt',u.unlocked_at,'adoptedAt',u.adopted_at,'careCount',u.care_count)
 from public.cats c join public.cat_unlocks u on u.cat_id=c.id where c.id=p_cat and u.user_id=p_user;
$$;

-- Same completion as 20260929150000, with care preferences for the new personalities.
create or replace function public.finish_mission_atomic(p_session uuid,p_duration int,p_is_test boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare uid uuid:=auth.uid();s public.sessions;r public.streaks;cid uuid;today date:=(now() at time zone 'America/Bogota')::date;corrects int;next_streak int;reward text;already_today boolean;passed_now boolean;care_id uuid;adopt_id uuid;
 status jsonb;progress int;event text;
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
  if s.mode='daily' and passed_now and s.date=today and not already_today then
   next_streak:=case when r.last_session_date=today-1 then r.current+1 else 1 end;
   reward:=(array['bed','food','box','treat','toy','yarn','vet'])[coalesce(r.total_days,0)%7+1];
   insert into public.streaks(user_id,current,best,total_days,last_session_date) values(uid,next_streak,greatest(coalesce(r.best,0),next_streak),coalesce(r.total_days,0)+1,today)
   on conflict(user_id) do update set current=excluded.current,best=excluded.best,total_days=excluded.total_days,last_session_date=excluded.last_session_date;
   update public.shelter_state set food=food+(reward='food')::int,boxes=boxes+(reward='box')::int,beds=beds+(reward='bed')::int,treats=treats+(reward='treat')::int,toys=toys+(reward='toy')::int,yarn=yarn+(reward='yarn')::int,vet_visits=vet_visits+(reward='vet')::int,affection=affection+1,last_care_date=today,last_reward=reward,updated_at=now() where user_id=uid;
   status:=public.reward_status();
   select case when r.last_session_date=today-1 then coalesce(p.progress_days,0)+1 else 1 end into progress from (select 1) one left join public.reward_progress p on p.user_id=uid;
   if progress>=(status->>'needed')::int then
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
   insert into public.reward_progress(user_id,progress_days,arrivals,adoptions,last_event,last_event_at)
    values(uid,progress,coalesce(event='arrival',false)::int,coalesce(event='adoption',false)::int,event,case when event is not null then now() end)
    on conflict(user_id) do update set progress_days=excluded.progress_days,arrivals=public.reward_progress.arrivals+excluded.arrivals,adoptions=public.reward_progress.adoptions+excluded.adoptions,
     last_event=coalesce(excluded.last_event,public.reward_progress.last_event),last_event_at=coalesce(excluded.last_event_at,public.reward_progress.last_event_at),updated_at=now();
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
