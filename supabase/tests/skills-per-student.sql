begin;
-- Each student sees only skills assigned to them or to nobody; the tutor sees everything.
create temp table seen(who text,visible int,levels int,others int);
grant all on seen to authenticated;
do $$
declare a uuid;b uuid;
begin
 select id into a from public.profiles where role='student' order by created_at limit 1;
 select id into b from public.profiles where role='student' order by created_at offset 1 limit 1;
 if b is null then raise exception 'This test needs two students';end if;
 insert into public.skills(id,name,subject,description) values
  ('99999999-0000-0000-0000-00000000000a','Solo A','matematicas','Test'),
  ('99999999-0000-0000-0000-00000000000b','Solo B','musica','Test'),
  ('99999999-0000-0000-0000-0000000000ab','Para todos','musica','Test');
 insert into public.skill_levels(skill_id,level,description) values
  ('99999999-0000-0000-0000-00000000000a',1,'x'),('99999999-0000-0000-0000-00000000000b',1,'x'),('99999999-0000-0000-0000-0000000000ab',1,'x');
 insert into public.skill_students values('99999999-0000-0000-0000-00000000000a',a),('99999999-0000-0000-0000-00000000000b',b);
 perform set_config('test.a',a::text,true);perform set_config('test.b',b::text,true);
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
set local role authenticated;
insert into seen select 'A',count(*) filter(where id::text like '99999999%'),(select count(*) from public.skill_levels where skill_id::text like '99999999%'),(select count(*) from public.skill_students where user_id<>auth.uid()) from public.skills;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.b'),true);
set local role authenticated;
insert into seen select 'B',count(*) filter(where id::text like '99999999%'),(select count(*) from public.skill_levels where skill_id::text like '99999999%'),(select count(*) from public.skill_students where user_id<>auth.uid()) from public.skills;
reset role;
do $$
begin
 if (select visible from seen where who='A')<>2 or (select levels from seen where who='A')<>2 then raise exception 'Student A must see its own skill and the shared one';end if;
 if (select visible from seen where who='B')<>2 or (select levels from seen where who='B')<>2 then raise exception 'Student B must see its own skill and the shared one';end if;
 if exists(select 1 from seen where others<>0) then raise exception 'Students must not see other students'' assignments';end if;
end $$;
rollback;
select 'PASS: skills per student, shared skills, levels follow their skill, assignments stay private' as result;
