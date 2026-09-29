begin;
-- Catalog: stable ids and visual assets live with the cat; progress only references ids.
alter table public.cats add column slug text unique, add column sort_order int, add column art_variant int not null default 0 check(art_variant between 0 and 5),
 add column pattern text not null default 'liso', add column expressions text[] not null default array['feliz','curioso','dormido'], add column accessories text[] not null default array[]::text[];
-- On a fresh database the seed runs after migrations, so the original cats are created here.
insert into public.cats(id,name,personality,story,trait_tags,palette,unlock_day) values
('20000000-0000-0000-0000-000000000001','Milo','curioso','Llegó escondido en una caja de libros. Todavía revisa cada caja que encuentra.',array['cajas','explorador'],'{"body":"#c79765","belly":"#f4e4d0"}',1),
('20000000-0000-0000-0000-000000000002','Luna','tímido','La encontramos bajo un banco después de la lluvia. Una manta tibia le da valor.',array['mantas','tranquila'],'{"body":"#8d9298","belly":"#e7e2dc"}',4),
('20000000-0000-0000-0000-000000000003','Pipa','juguetón','Persiguió una hoja hasta la puerta del refugio. Ahora convierte las tardes en juegos.',array['hojas','activa'],'{"body":"#e0af82","belly":"#fff1db"}',5),
('20000000-0000-0000-0000-000000000004','Nube','dormilón','Dormía junto a una panadería. Aquí encontró su rincón de sol favorito.',array['sol','siesta'],'{"body":"#ddd8cb","belly":"#fff7e9"}',6),
('20000000-0000-0000-0000-000000000005','Bruno','gruñón','Cuidaba un jardín abandonado. Protesta bajito, pero siempre espera a sus amigos.',array['jardin','leal'],'{"body":"#756c66","belly":"#c4b8a6"}',3),
('20000000-0000-0000-0000-000000000006','Miel','cariñoso','Se acercó buscando una mano amiga. Su ronroneo acompaña cada regreso a casa.',array['compañia','ronroneo'],'{"body":"#ceab6a","belly":"#f4e4d0"}',7) on conflict(id) do nothing;
update public.cats c set slug=format('cat_%s',lpad(o.n::text,2,'0')),sort_order=o.n,art_variant=case c.name when 'Milo' then 0 when 'Miel' then 1 when 'Nube' then 2 when 'Luna' then 3 when 'Bruno' then 4 when 'Pipa' then 5 when 'Coco' then 4 when 'Oliva' then 3 when 'Simón' then 2 end,
 pattern=case c.name when 'Milo' then 'atigrado' when 'Pipa' then 'atigrado' when 'Bruno' then 'ahumado' when 'Luna' then 'ahumado' else 'liso' end,
 accessories=case c.name when 'Luna' then array['manta'] when 'Pipa' then array['pelota'] when 'Coco' then array['pañuelo'] else array[]::text[] end
 from (select id,row_number() over(order by unlock_day,name) n from public.cats where unlock_day is not null) o where c.id=o.id;
insert into public.cats(slug,sort_order,name,personality,story,trait_tags,palette,art_variant,pattern,accessories) values
('cat_10',10,'Canela','cariñoso','Esperaba cada tarde en la puerta de una panadería. Ahora recibe a todos con un ronroneo.',array['compañía'],'{"body":"#c58b55","belly":"#f6e6d2"}',0,'atigrado',array[]::text[]),
('cat_11',11,'Tomás','dormilón','Lo encontraron dormido sobre un montón de periódicos. Sigue buscando el rincón más tibio.',array['siesta'],'{"body":"#bca27f","belly":"#f3e8d8"}',1,'liso',array['cojín']),
('cat_12',12,'Frida','curioso','Trepó hasta la ventana del refugio para mirar adentro. Nada escapa a sus ojos atentos.',array['ventana'],'{"body":"#d3cbc2","belly":"#fbf6ef"}',2,'bicolor',array['moño']),
('cat_13',13,'Chispa','juguetón','Llegó persiguiendo mariposas por el patio. Convierte cualquier cordón en una aventura.',array['cordón'],'{"body":"#968d84","belly":"#e9e3db"}',3,'ahumado',array['cascabel']),
('cat_14',14,'Rayo','gruñón','Vigilaba un taller desde el techo. Refunfuña, pero nunca se aleja de sus amigos.',array['techo'],'{"body":"#a8906f","belly":"#eadcc6"}',4,'atigrado',array[]::text[]),
('cat_15',15,'Lola','tímido','Se escondía bajo una escalera en los días de lluvia. Poco a poco se asoma a jugar.',array['calma'],'{"body":"#eab987","belly":"#fff3e2"}',5,'liso',array['manta']);
alter table public.cats alter column slug set not null, alter column sort_order set not null;

-- Configurable streak milestones. arrival_days[k] = consecutive days for the k-th arrival while filling the shelter.
create table public.reward_rules(
 id int primary key default 1 check(id=1),
 capacity int not null default 7 check(capacity between 1 and 12),
 arrival_days int[] not null default array[1,2,2,3,3,4,4],
 adoption_days int not null default 5 check(adoption_days between 1 and 60),
 refill_days int not null default 3 check(refill_days between 1 and 60),
 updated_at timestamptz not null default now(),
 check(cardinality(arrival_days)=capacity and 1<=all(arrival_days) and 60>=all(arrival_days))
);
insert into public.reward_rules(id) values(1);
alter table public.reward_rules enable row level security;
grant select,update on public.reward_rules to authenticated;
create policy read_rules on public.reward_rules for select to authenticated using(exists(select 1 from public.profiles where id=(select auth.uid())));
create policy tutor_rules on public.reward_rules for update to authenticated using(exists(select 1 from public.profiles where id=(select auth.uid()) and role='tutor')) with check(exists(select 1 from public.profiles where id=(select auth.uid()) and role='tutor'));

-- Accumulated reward progress, independent of the current streak.
create table public.reward_progress(
 user_id uuid primary key references public.profiles,
 progress_days int not null default 0 check(progress_days>=0),
 arrivals int not null default 0 check(arrivals>=0),
 adoptions int not null default 0 check(adoptions>=0),
 last_event text check(last_event in ('arrival','adoption')),
 last_event_at timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.reward_progress enable row level security;
grant select,insert,update on public.reward_progress to authenticated;
create policy read_rows on public.reward_progress for select to authenticated using(user_id=(select auth.uid()) or (select auth.jwt()->'app_metadata'->>'role')='tutor');
create policy insert_own on public.reward_progress for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.profiles where id=(select auth.uid()) and role='student'));
create policy update_own on public.reward_progress for update to authenticated using(user_id=(select auth.uid()) and exists(select 1 from public.profiles where id=(select auth.uid()) and role='student'));
insert into public.reward_progress(user_id,arrivals,adoptions)
 select p.id,count(u.cat_id) filter(where u.admitted),count(u.cat_id) filter(where u.adopted_at is not null)
 from public.profiles p left join public.cat_unlocks u on u.user_id=p.id where p.role='student' group by p.id;

create or replace function public.cat_card(p_user uuid,p_cat uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',c.id,'slug',c.slug,'name',c.name,'personality',c.personality,'story',c.story,'palette',c.palette,'variant',c.art_variant,'pattern',c.pattern,'expressions',c.expressions,'accessories',c.accessories,
  'unlockedAt',u.unlocked_at,'adoptedAt',u.adopted_at,'careCount',u.care_count)
 from public.cats c join public.cat_unlocks u on u.cat_id=c.id where c.id=p_cat and u.user_id=p_user;
$$;
revoke all on function public.cat_card(uuid,uuid) from public,anon;
grant execute on function public.cat_card(uuid,uuid) to authenticated;

-- Which event comes next and how many consecutive days it needs. Read-only.
create or replace function public.reward_status() returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare uid uuid:=auth.uid();rules public.reward_rules;p public.reward_progress;st public.streaks;residents int;available int;kind text;needed int;today date:=(now() at time zone 'America/Bogota')::date;
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
 return jsonb_build_object('next',kind,'needed',needed,'capacity',rules.capacity,'residents',residents,'adopted',coalesce(p.adoptions,0),
  -- A broken streak restarts the count toward the next event.
  'progressDays',case when st.last_session_date>=today-1 then least(coalesce(p.progress_days,0),needed) else 0 end);
end $$;
revoke all on function public.reward_status() from public,anon;
grant execute on function public.reward_status() to authenticated;

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
   -- Streak milestones: each event needs N consecutive days; breaking the streak restarts the count, never the rewards.
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
       (reward='box' and c.personality='curioso') or (reward='bed' and c.personality in ('dormilón','tímido')) or
       (reward='treat' and c.personality in ('cariñoso','gruñón')) or (reward='toy' and c.personality='juguetón') or
       (reward='yarn' and c.personality in ('juguetón','curioso')) then 0 else 1 end,c.id limit 1;
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
