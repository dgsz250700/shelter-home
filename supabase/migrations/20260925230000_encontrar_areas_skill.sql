-- Skill "Encontrar áreas" backed by the built-in area generator.
insert into public.skills(id,name,subject,description) values
('10000000-0000-0000-0000-000000000004','Encontrar áreas','matematicas','Medir la superficie de rectángulos, triángulos y figuras compuestas.')
on conflict(id) do nothing;
insert into public.skill_levels(skill_id,level,description)
select '10000000-0000-0000-0000-000000000004',n,'{"kind":"generated","family":"area","practiceDays":[],"fixedLevel":false,"classTopic":""}'
from generate_series(1,4) n
on conflict do nothing;
