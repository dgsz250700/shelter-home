-- Several students: each one enters with a short PIN chosen on a shared device.
begin;

-- Order students by arrival; the oldest is the default in the tutor panel until it can choose.
alter table public.profiles add column created_at timestamptz not null default now();

-- PIN hashes live only on the server (service role); students and tutors cannot read them.
create table public.student_access(
 user_id uuid primary key references public.profiles on delete cascade,
 pin_hash text not null,
 failed_attempts int not null default 0 check(failed_attempts>=0),
 locked_until timestamptz,
 updated_at timestamptz not null default now()
);
alter table public.student_access enable row level security;
revoke all on public.student_access from anon,authenticated;

commit;
