-- Questions per student: a skill can be assigned to some students; without assignments it is for everyone.
-- Music joins the subjects, with the tutor's own questions (there is no music generator).
begin;

alter table public.skills drop constraint if exists skills_subject_check;
alter table public.skills add constraint skills_subject_check check(subject in ('matematicas','fisica','quimica','musica'));

create table public.skill_students(
 skill_id uuid not null references public.skills on delete cascade,
 user_id uuid not null references public.profiles on delete cascade,
 primary key(skill_id,user_id)
);
alter table public.skill_students enable row level security;
grant select,insert,delete on public.skill_students to authenticated;
create policy tutor_assign on public.skill_students for all to authenticated
 using(exists(select 1 from public.profiles where id=(select auth.uid()) and role='tutor'))
 with check(exists(select 1 from public.profiles where id=(select auth.uid()) and role='tutor'));
create policy read_own on public.skill_students for select to authenticated using(user_id=(select auth.uid()));

-- Everything that exists today was prepared for the first student (Laura).
insert into public.skill_students(skill_id,user_id)
 select s.id,(select id from public.profiles where role='student' order by created_at limit 1) from public.skills s
 where exists(select 1 from public.profiles where role='student')
 on conflict do nothing;

-- Visibility must see every assignment, not only the student's own rows, so it runs as definer.
create or replace function public.skill_is_visible(p_skill uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=(select auth.uid()) and role='tutor')
  or exists(select 1 from public.skill_students where skill_id=p_skill and user_id=(select auth.uid()))
  or not exists(select 1 from public.skill_students where skill_id=p_skill);
$$;
revoke all on function public.skill_is_visible(uuid) from public,anon;
grant execute on function public.skill_is_visible(uuid) to authenticated;

drop policy if exists read_catalog on public.skills;
create policy read_catalog on public.skills for select to authenticated
 using(exists(select 1 from public.profiles where id=(select auth.uid())) and public.skill_is_visible(id));
drop policy if exists read_catalog on public.skill_levels;
create policy read_catalog on public.skill_levels for select to authenticated
 using(exists(select 1 from public.profiles where id=(select auth.uid())) and public.skill_is_visible(skill_id));

-- Drive banks may be music too.
CREATE OR REPLACE FUNCTION public.publish_drive_bank(p_file text, p_folder text, p_modified timestamp with time zone, p_name text, p_subject text, p_questions jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare sid uuid; lv int; counts int[]:=array[3,3,2,2]; levels jsonb;
begin
 if not exists(select 1 from public.profiles where id=auth.uid() and role='tutor') then raise exception 'Tutor required'; end if;
 if p_file !~ '^[A-Za-z0-9_-]{5,200}$' or p_folder !~ '^[A-Za-z0-9_-]{5,200}$' or length(p_name) not between 1 and 100 or p_subject not in ('fisica','quimica','matematicas','musica') then raise exception 'Invalid bank'; end if;
 if jsonb_typeof(p_questions)<>'array' or jsonb_array_length(p_questions) not between 10 and 60 then raise exception '10 to 60 questions required'; end if;
 for lv in 1..4 loop
  if (select count(*) from jsonb_array_elements(p_questions) q where (q->>'level')::int=lv)<counts[lv] then raise exception 'Not enough questions for level %',lv; end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(p_file,0));
 select id into sid from public.skills where drive_file_id=p_file;
 if sid is not null and exists(select 1 from public.sessions s where not s.completed and s.date=(now() at time zone 'America/Bogota')::date and s.planned_queue @> jsonb_build_array(jsonb_build_object('skillId',sid::text))) then raise exception 'SESSION_IN_PROGRESS';end if;
 sid:=coalesce(sid,gen_random_uuid());
 select jsonb_agg(jsonb_build_object('level',n,'description',jsonb_build_object('kind','custom','questions',(select jsonb_agg(q) from jsonb_array_elements(p_questions) q where (q->>'level')::int=n))::text)) into levels from generate_series(1,4) n;
 perform public.save_skill_atomic(sid,jsonb_build_object('name',p_name,'description','Banco de preguntas del profesor en Google Drive','subject',p_subject,'active',true,'priority',1,'base_difficulty',1),levels);
 update public.skills set drive_file_id=p_file,drive_folder_id=p_folder,drive_modified_time=p_modified where id=sid;
 return sid;
end $function$;

commit;
