-- =====================================================================
-- Dangila STEM Club — Phase 4: Physics, new labs, classes (classroom), student sign-up
-- Run AFTER schema.sql, phase2.sql and phase3.sql (or just run ALL_IN_ONE.sql). Safe to run again.
-- =====================================================================

-- ---------- Electricity becomes part of Physics ----------
do $$ begin
  if exists (select 1 from public.subjects where id = 'electricity') and not exists (select 1 from public.subjects where id = 'physics') then
    update public.subjects set id = 'physics', name = 'Physics', am = 'ፊዚክስ',
      description = 'Electricity and mechanics: build circuits, launch projectiles, swing pendulums and push boxes to discover the laws of motion and energy.'
    where id = 'electricity';   -- labs follow automatically (on update cascade)
  end if;
end $$;
insert into public.subjects (id, name, am, color, description, position) values
  ('physics', 'Physics', 'ፊዚክስ', '#e9a400', 'Electricity and mechanics: build circuits, launch projectiles, swing pendulums and push boxes to discover the laws of motion and energy.', 2)
on conflict (id) do nothing;
update public.exams         set subject_id = 'physics' where subject_id = 'electricity';
update public.lab_progress  set subject_id = 'physics' where subject_id = 'electricity';
update public.certificates  set subject_id = 'physics' where subject_id = 'electricity';
update public.courses       set subject_id = 'physics' where subject_id = 'electricity';
update public.subjects set description = 'Explore the human body, the beating heart and the cell, and watch populations and molecules change.' where id = 'biology' and description like 'Watch populations%';
update public.subjects set description = 'Mix chemicals, watch reactions happen particle by particle, and balance chemical equations.' where id = 'chemistry' and description like 'Mix chemicals in a virtual beaker%';

-- ---------- New built-in labs ----------
insert into public.labs (id, subject_id, kind, title, level, blurb, position) values
  ('projectile-motion', 'physics',  'builtin', 'Projectile motion: launch and land', 'Grade 9–11', 'Change the launch angle, speed and planet, then predict where the ball will land. Can you hit the target?', 4),
  ('pendulum-energy',   'physics',  'builtin', 'Pendulum and energy', 'Grade 10–12', 'Watch energy change between kinetic and potential as a pendulum swings. What changes the time of one swing?', 5),
  ('forces-motion',     'physics',  'builtin', 'Forces and motion: F = m × a', 'Grade 9–10', 'Push a box with different forces, masses and surfaces. See how friction and net force decide the acceleration.', 6),
  ('body-explorer',     'biology',  'builtin', 'Human body explorer', 'Grade 9–10', 'Click the organs to learn what they do, and switch on body systems to watch blood flow, breathing, digestion and nerve signals.', 0),
  ('heart-detail',      'biology',  'builtin', 'Inside the heart', 'Grade 10–12', 'Watch the four chambers, valves and blood flow through one heartbeat. Slow it down to see each step.', 0),
  ('cell-explorer',     'biology',  'builtin', 'Cell explorer: animal and plant cells', 'Grade 9', 'Compare an animal cell with a plant cell. Click each part to find out what it does.', 0),
  ('collision-theory',  'chemistry','builtin', 'Reactions up close: collision theory', 'Grade 10–11', 'Watch particles A and B collide and react to make AB. Change the temperature, concentration and catalyst and compare the reaction rates.', 2),
  ('balance-equations', 'chemistry','builtin', 'Balancing chemical equations', 'Grade 9–10', 'Atoms are never created or destroyed in a reaction. Change the numbers in front of each formula until every atom is balanced.', 3)
on conflict (id) do nothing;

-- ---------- Classes (like Google Classroom) ----------
create or replace function public.gen_class_code() returns text
language plpgsql volatile set search_path = public as $$
declare chars text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; c text; i int;
begin
  loop
    c := ''; for i in 1..6 loop c := c || substr(chars, 1 + floor(random() * length(chars))::int, 1); end loop;
    exit when not exists (select 1 from classes where code = c);
  end loop;
  return c;
end $$;

create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  subject_id  text not null default '',
  grade       text not null default '',
  description text not null default '',
  color       text not null default '#1f3f99',
  code        text unique,
  owner_id    uuid references public.profiles on delete set null default auth.uid(),
  archived    boolean not null default false,
  created_at  timestamptz not null default now()
);
create table if not exists public.class_members (
  class_id  uuid not null references public.classes on delete cascade,
  user_id   uuid not null references public.profiles on delete cascade,
  role      text not null default 'student' check (role in ('student','teacher')),
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);
create table if not exists public.class_posts (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes on delete cascade,
  author_id  uuid references public.profiles on delete set null default auth.uid(),
  kind       text not null default 'announcement' check (kind in ('announcement','material','course','exam','assignment','lab')),
  title      text not null default '',
  body       text not null default '',
  ref_id     text not null default '',
  link       text not null default '',
  due_date   date,
  created_at timestamptz not null default now()
);
create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.class_posts on delete cascade,
  author_id  uuid not null references public.profiles on delete cascade default auth.uid(),
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists class_posts_class on public.class_posts (class_id);
create index if not exists post_comments_post on public.post_comments (post_id);

create or replace function public.class_code_default() returns trigger
language plpgsql set search_path = public as $$
begin if new.code is null or new.code = '' then new.code := gen_class_code(); end if; new.code := upper(new.code); return new; end $$;
drop trigger if exists classes_code on public.classes;
create trigger classes_code before insert on public.classes for each row execute function public.class_code_default();

-- the teacher who creates a class becomes its teacher member
create or replace function public.class_owner_member() returns trigger
language plpgsql security definer set search_path = public as $$
begin if new.owner_id is not null then insert into class_members (class_id, user_id, role) values (new.id, new.owner_id, 'teacher') on conflict do nothing; end if; return new; end $$;
drop trigger if exists classes_owner on public.classes;
create trigger classes_owner after insert on public.classes for each row execute function public.class_owner_member();

create or replace function public.is_class_member(p_class uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from class_members where class_id = p_class and user_id = auth.uid())
$$;

alter table public.classes       enable row level security;
alter table public.class_members enable row level security;
alter table public.class_posts   enable row level security;
alter table public.post_comments enable row level security;

drop policy if exists "classes read" on public.classes;
create policy "classes read" on public.classes for select using (public.is_staff() or public.is_class_member(id));
drop policy if exists "classes staff" on public.classes;
create policy "classes staff" on public.classes for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "members read" on public.class_members;
create policy "members read" on public.class_members for select using (public.is_staff() or user_id = auth.uid() or public.is_class_member(class_id));
drop policy if exists "members staff add" on public.class_members;
create policy "members staff add" on public.class_members for insert with check (public.is_staff());
drop policy if exists "members remove" on public.class_members;
create policy "members remove" on public.class_members for delete using (public.is_staff() or user_id = auth.uid());

drop policy if exists "posts read" on public.class_posts;
create policy "posts read" on public.class_posts for select using (public.is_staff() or public.is_class_member(class_id));
drop policy if exists "posts staff" on public.class_posts;
create policy "posts staff" on public.class_posts for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "comments read" on public.post_comments;
create policy "comments read" on public.post_comments for select using (public.is_staff() or exists (select 1 from class_posts p where p.id = post_id and public.is_class_member(p.class_id)));
drop policy if exists "comments add" on public.post_comments;
create policy "comments add" on public.post_comments for insert with check (author_id = auth.uid() and (public.is_staff() or exists (select 1 from class_posts p where p.id = post_id and public.is_class_member(p.class_id))));
drop policy if exists "comments remove" on public.post_comments;
create policy "comments remove" on public.post_comments for delete using (public.is_staff() or author_id = auth.uid());

-- Students join with a code
create or replace function public.join_class(p_code text) returns public.classes
language plpgsql security definer set search_path = public as $$
declare c classes;
begin
  if auth.uid() is null then raise exception 'Please log in'; end if;
  select * into c from classes where code = upper(trim(p_code)) and not archived;
  if c.id is null then raise exception 'No class has that code. Check it with your teacher.'; end if;
  insert into class_members (class_id, user_id, role) values (c.id, auth.uid(), case when is_staff() then 'teacher' else 'student' end) on conflict do nothing;
  return c;
end $$;

-- Names of the people in a class (students can only read their own profile directly)
create or replace function public.class_people(p_class uuid) returns table (user_id uuid, full_name text, username text, grade text, role text, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.full_name, case when is_staff() then p.username else '' end, p.grade, m.role, m.joined_at
  from class_members m join profiles p on p.id = m.user_id
  where m.class_id = p_class and (is_staff() or is_class_member(p_class))
  order by m.role desc, p.full_name
$$;

create or replace function public.reset_class_code(p_class uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not is_staff() then raise exception 'Teachers only'; end if;
  c := gen_class_code(); update classes set code = c where id = p_class; return c;
end $$;

-- ---------- Student sign-up setting ----------
insert into public.app_settings (key, value) values ('signup', '{"enabled": true}') on conflict (key) do nothing;
