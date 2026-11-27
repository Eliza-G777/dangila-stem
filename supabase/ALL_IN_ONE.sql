-- ============================================================
-- Dangila STEM Club: ALL database setup in one file
-- (schema + phase2 + phase3 + phase4 + permissions). Paste ALL of this into
-- Supabase -> SQL Editor -> New query, then click Run. Safe to run again.
-- The last result should say club_tables_found = 19.
-- ============================================================
-- =====================================================================
-- Dangila STEM Club — database
-- Run this ONCE in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe design: students can only see their own data; exam answers never
-- reach the browser; marking and certificates happen inside the database.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- People ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  username   text unique not null,
  full_name  text not null default '',
  role       text not null default 'student' check (role in ('student','teacher','admin')),
  grade      text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('teacher','admin') from profiles where id = auth.uid()), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'admin' from profiles where id = auth.uid()), false)
$$;

-- Every new login gets a profile. The very first account becomes admin.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username, full_name, grade, role)
  values (
    new.id,
    lower(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'grade', ''),
    case when exists (select 1 from profiles where role = 'admin') then 'student' else 'admin' end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only an admin (or the server) may change someone's role.
create or replace function public.protect_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role
     and not public.is_admin()
     and coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'Only an admin can change roles';
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.protect_role();

alter table public.profiles enable row level security;
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select
  using (id = auth.uid() or public.is_staff());
drop policy if exists "profiles staff update" on public.profiles;
create policy "profiles staff update" on public.profiles for update
  using (public.is_admin() or (public.is_staff() and role = 'student'));

-- ---------- Subjects and labs (managed in the Admin page) ----------
create table if not exists public.subjects (
  id          text primary key check (id ~ '^[a-z0-9-]+$'),
  name        text not null,
  am          text not null default '',
  color       text not null default '#3d6fe6',
  description text not null default '',
  position    int  not null default 0,
  published   boolean not null default true
);

create table if not exists public.labs (
  id           text primary key check (id ~ '^[a-z0-9-]+$'),
  subject_id   text not null references public.subjects on update cascade on delete cascade,
  kind         text not null default 'builtin' check (kind in ('builtin','embed','guide')),
  title        text not null,
  level        text not null default '',
  blurb        text not null default '',
  instructions text not null default '',
  embed_url    text not null default '',
  position     int  not null default 0,
  published    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.subjects enable row level security;
alter table public.labs     enable row level security;
drop policy if exists "subjects read" on public.subjects;
create policy "subjects read" on public.subjects for select using (published or public.is_staff());
drop policy if exists "subjects admin" on public.subjects;
create policy "subjects admin" on public.subjects for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "labs read" on public.labs;
create policy "labs read" on public.labs for select using (published or public.is_staff());
drop policy if exists "labs admin" on public.labs;
create policy "labs admin" on public.labs for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Notice board ----------
create table if not exists public.news (
  id         uuid primary key default gen_random_uuid(),
  date       date not null default current_date,
  tag        text not null default '',
  title      text not null,
  body       text not null default '',
  link       text not null default '',
  link_text  text not null default '',
  created_by uuid references public.profiles on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.news enable row level security;
drop policy if exists "news read" on public.news;
create policy "news read" on public.news for select using (true);
drop policy if exists "news staff" on public.news;
create policy "news staff" on public.news for all using (public.is_staff()) with check (public.is_staff());

-- ---------- Lab progress ----------
create table if not exists public.lab_progress (
  user_id      uuid not null references public.profiles on delete cascade,
  lab_id       text not null,
  subject_id   text not null default '',
  seconds      int  not null default 0,
  interactions int  not null default 0,
  completed    boolean not null default false,
  first_at     timestamptz not null default now(),
  last_at      timestamptz not null default now(),
  primary key (user_id, lab_id)
);
alter table public.lab_progress enable row level security;
drop policy if exists "progress read" on public.lab_progress;
create policy "progress read" on public.lab_progress for select
  using (user_id = auth.uid() or public.is_staff());

-- Called by the site every ~20 s while a student uses a lab.
-- A lab counts as COMPLETED after 2 minutes of use and (for built-in labs) 10 interactions.
create or replace function public.track_lab(p_lab text, p_subject text, p_kind text, p_seconds int, p_interactions int)
returns public.lab_progress
language plpgsql security definer set search_path = public as $$
declare r lab_progress;
begin
  if auth.uid() is null then raise exception 'Please log in'; end if;
  insert into lab_progress as lp (user_id, lab_id, subject_id, seconds, interactions)
  values (auth.uid(), p_lab, coalesce(p_subject, ''),
          least(greatest(coalesce(p_seconds, 0), 0), 60),
          least(greatest(coalesce(p_interactions, 0), 0), 200))
  on conflict (user_id, lab_id) do update set
    seconds      = lp.seconds + excluded.seconds,
    interactions = lp.interactions + excluded.interactions,
    subject_id   = excluded.subject_id,
    last_at      = now()
  returning * into r;
  if not r.completed and r.seconds >= 120 and (r.interactions >= 10 or coalesce(p_kind, '') <> 'builtin') then
    update lab_progress set completed = true
     where user_id = r.user_id and lab_id = r.lab_id returning * into r;
  end if;
  return r;
end $$;

-- ---------- Exams ----------
create table if not exists public.exams (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  subject_id   text not null default '',
  grade        text not null default '',
  description  text not null default '',
  time_limit   int  not null default 20,   -- minutes, 0 = no limit
  pass_mark    int  not null default 60,   -- percent
  max_attempts int  not null default 1,    -- 0 = unlimited (practice)
  published    boolean not null default false,
  created_by   uuid references public.profiles on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create table if not exists public.exam_questions (
  id       uuid primary key default gen_random_uuid(),
  exam_id  uuid not null references public.exams on delete cascade,
  position int  not null default 0,
  question text not null,
  options  jsonb not null default '[]',
  answer   int  not null default 0,
  points   int  not null default 1
);
create table if not exists public.attempts (
  id           uuid primary key default gen_random_uuid(),
  exam_id      uuid not null references public.exams on delete cascade,
  user_id      uuid not null references public.profiles on delete cascade,
  answers      jsonb not null default '{}',
  detail       jsonb not null default '[]',  -- per question: chosen option and whether it was correct
  score        int not null default 0,
  max_score    int not null default 0,
  percent      numeric(5,1) not null default 0,
  passed       boolean not null default false,
  started_at   timestamptz,
  submitted_at timestamptz not null default now()
);
create index if not exists attempts_user on public.attempts (user_id);
create index if not exists attempts_exam on public.attempts (exam_id);

alter table public.exams          enable row level security;
alter table public.exam_questions enable row level security;
alter table public.attempts       enable row level security;
drop policy if exists "exams read" on public.exams;
create policy "exams read" on public.exams for select using ((published and auth.uid() is not null) or public.is_staff());
drop policy if exists "exams staff" on public.exams;
create policy "exams staff" on public.exams for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "questions staff" on public.exam_questions;
create policy "questions staff" on public.exam_questions for all using (public.is_staff()) with check (public.is_staff());
drop policy if exists "attempts read" on public.attempts;
create policy "attempts read" on public.attempts for select using (user_id = auth.uid() or public.is_staff());

-- Teachers save an exam and its questions in one step.
create or replace function public.save_exam(p_exam jsonb, p_questions jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_staff() then raise exception 'Only teachers can save exams'; end if;
  v_id := nullif(p_exam->>'id', '')::uuid;
  if v_id is null then
    insert into exams (title, subject_id, grade, description, time_limit, pass_mark, max_attempts, published, created_by)
    values (p_exam->>'title', coalesce(p_exam->>'subject_id', ''), coalesce(p_exam->>'grade', ''),
            coalesce(p_exam->>'description', ''), coalesce((p_exam->>'time_limit')::int, 20),
            coalesce((p_exam->>'pass_mark')::int, 60), coalesce((p_exam->>'max_attempts')::int, 1),
            coalesce((p_exam->>'published')::boolean, false), auth.uid())
    returning id into v_id;
  else
    update exams set
      title = p_exam->>'title', subject_id = coalesce(p_exam->>'subject_id', ''), grade = coalesce(p_exam->>'grade', ''),
      description = coalesce(p_exam->>'description', ''), time_limit = coalesce((p_exam->>'time_limit')::int, 20),
      pass_mark = coalesce((p_exam->>'pass_mark')::int, 60), max_attempts = coalesce((p_exam->>'max_attempts')::int, 1),
      published = coalesce((p_exam->>'published')::boolean, false), updated_at = now()
    where id = v_id;
  end if;
  delete from exam_questions where exam_id = v_id;
  insert into exam_questions (exam_id, position, question, options, answer, points)
  select v_id, (q.ord - 1)::int, q.val->>'question', coalesce(q.val->'options', '[]'::jsonb),
         coalesce((q.val->>'answer')::int, 0), greatest(coalesce((q.val->>'points')::int, 1), 0)
  from jsonb_array_elements(coalesce(p_questions, '[]'::jsonb)) with ordinality as q(val, ord);
  return v_id;
end $$;

-- The exam paper a student sees: questions and options, never the answers.
create or replace function public.get_exam_paper(p_exam uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare e exams; used int;
begin
  if auth.uid() is null then raise exception 'Please log in'; end if;
  select * into e from exams where id = p_exam;
  if e.id is null or (not e.published and not is_staff()) then raise exception 'This exam is not available'; end if;
  select count(*) into used from attempts where exam_id = p_exam and user_id = auth.uid();
  return jsonb_build_object(
    'exam', to_jsonb(e),
    'attempts_used', used,
    'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'question', q.question, 'options', q.options, 'points', q.points) order by q.position)
                           from exam_questions q where q.exam_id = p_exam), '[]'::jsonb));
end $$;

-- Marking happens here. Correct answers are only shown when no attempts remain (or for practice exams).
create or replace function public.submit_exam(p_exam uuid, p_answers jsonb, p_started timestamptz) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  e exams; used int; s int := 0; m int := 0; det jsonb := '[]'; reveal jsonb := '{}';
  q record; a int; ok boolean; pct numeric; res attempts; show boolean;
begin
  if auth.uid() is null then raise exception 'Please log in'; end if;
  select * into e from exams where id = p_exam;
  if e.id is null or not e.published then raise exception 'This exam is not available'; end if;
  select count(*) into used from attempts where exam_id = p_exam and user_id = auth.uid();
  if e.max_attempts > 0 and used >= e.max_attempts then raise exception 'You have no attempts left for this exam'; end if;
  show := e.max_attempts = 0 or used + 1 >= e.max_attempts;
  for q in select * from exam_questions where exam_id = p_exam order by position loop
    a  := case when (p_answers->>(q.id::text)) ~ '^\d+$' then (p_answers->>(q.id::text))::int end;
    ok := a is not null and a = q.answer;
    m  := m + q.points;
    if ok then s := s + q.points; end if;
    det := det || jsonb_build_array(jsonb_build_object('id', q.id, 'chosen', a, 'correct', ok));
    if show then reveal := reveal || jsonb_build_object(q.id::text, q.answer); end if;
  end loop;
  pct := case when m > 0 then round(100.0 * s / m, 1) else 0 end;
  insert into attempts (exam_id, user_id, answers, detail, score, max_score, percent, passed, started_at)
  values (p_exam, auth.uid(), coalesce(p_answers, '{}'::jsonb), det, s, m, pct, pct >= e.pass_mark, p_started)
  returning * into res;
  return to_jsonb(res) || jsonb_build_object('answers_key', reveal);
end $$;

-- ---------- Certificates ----------
create table if not exists public.certificates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  subject_id text not null,           -- a subject id, or 'all' for the STEM Scholar award
  level      int  not null check (level between 1 and 3),
  code       text unique not null,
  issued_at  timestamptz not null default now(),
  unique (user_id, subject_id, level)
);
alter table public.certificates enable row level security;
drop policy if exists "certificates read" on public.certificates;
create policy "certificates read" on public.certificates for select using (user_id = auth.uid() or public.is_staff());

-- Progress toward each level, per subject.
--   Level 1 Explorer:     opened every lab in the subject
--   Level 2 Investigator: completed every lab and passed at least 1 exam in the subject
--   Level 3 Scientist:    Investigator, passed at least 2 exams, best scores average 85% or more
--   STEM Scholar ('all'): Investigator in every subject
create or replace function public.certificate_status(p_user uuid default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := coalesce(p_user, auth.uid()); out jsonb := '[]'; s record;
  total int; opened int; done int; passed int; avg_best numeric; lvl int;
begin
  if uid is null or (uid is distinct from auth.uid() and not is_staff()) then raise exception 'Not allowed'; end if;
  for s in select * from subjects where published order by position loop
    select count(*) into total from labs where subject_id = s.id and published;
    select count(*) filter (where true), count(*) filter (where p.completed) into opened, done
      from lab_progress p join labs l on l.id = p.lab_id and l.published and l.subject_id = s.id
     where p.user_id = uid;
    select count(*), coalesce(avg(best), 0) into passed, avg_best from (
      select max(a.percent) as best from attempts a join exams e on e.id = a.exam_id
       where a.user_id = uid and e.subject_id = s.id group by a.exam_id having bool_or(a.passed)) t;
    lvl := 0;
    if total > 0 and opened >= total then lvl := 1; end if;
    if lvl = 1 and done >= total and passed >= 1 then lvl := 2; end if;
    if lvl = 2 and passed >= 2 and avg_best >= 85 then lvl := 3; end if;
    out := out || jsonb_build_array(jsonb_build_object('subject_id', s.id, 'labs_total', total, 'labs_opened', opened,
      'labs_completed', done, 'exams_passed', passed, 'avg_best', round(avg_best, 1), 'level', lvl));
  end loop;
  return out;
end $$;

-- Issues any certificates the student has earned and returns all of theirs.
create or replace function public.claim_certificates() returns setof public.certificates
language plpgsql security definer set search_path = public as $$
declare st jsonb; x jsonb; l int; all_ok boolean := true; n int := 0;
begin
  if auth.uid() is null then raise exception 'Please log in'; end if;
  st := certificate_status(auth.uid());
  for x in select * from jsonb_array_elements(st) loop
    if (x->>'labs_total')::int > 0 then
      n := n + 1;
      if (x->>'level')::int < 2 then all_ok := false; end if;
      for l in 1 .. (x->>'level')::int loop
        insert into certificates (user_id, subject_id, level, code)
        values (auth.uid(), x->>'subject_id', l,
                'DSC-' || upper(left(x->>'subject_id', 4)) || '-' || l || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)))
        on conflict (user_id, subject_id, level) do nothing;
      end loop;
    end if;
  end loop;
  if n > 0 and all_ok then
    insert into certificates (user_id, subject_id, level, code)
    values (auth.uid(), 'all', 1, 'DSC-STEM-S-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)))
    on conflict (user_id, subject_id, level) do nothing;
  end if;
  return query select * from certificates where user_id = auth.uid() order by issued_at;
end $$;

-- Anyone (even without logging in) can check a certificate code.
create or replace function public.verify_certificate(p_code text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('valid', true, 'full_name', p.full_name, 'subject_id', c.subject_id,
                   'subject_name', coalesce(s.name, 'All subjects'), 'level', c.level, 'issued_at', c.issued_at, 'code', c.code)
                   from certificates c join profiles p on p.id = c.user_id left join subjects s on s.id = c.subject_id
                   where upper(c.code) = upper(trim(p_code))),
                  jsonb_build_object('valid', false))
$$;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- =====================================================================
-- Starting content: the four labs and their built-in simulations.
-- =====================================================================
insert into public.subjects (id, name, am, color, description, position) values
  ('chemistry',   'Chemistry',   'ኬሚስትሪ',  '#e5483a', 'Mix chemicals in a virtual beaker, watch what forms, and read the balanced equation.', 1),
  ('electricity', 'Electricity', 'ኤሌክትሪክ', '#e9a400', 'Build circuits, change voltage and resistance, and see current flow.', 2),
  ('biology',     'Biology',     'ባዮሎጂ',    '#2c9a59', 'Watch populations rise and fall, and molecules move across a cell membrane.', 3),
  ('math',        'Mathematics', 'ሂሳብ',     '#3d6fe6', 'Move graphs with sliders, spin the unit circle, and test probability with dice.', 4)
on conflict (id) do nothing;

insert into public.labs (id, subject_id, kind, title, level, blurb, position) values
  ('reaction-mixer',     'chemistry',   'builtin', 'Reaction mixer', 'Grade 9–10', 'Choose two chemicals, mix them, and see what happens and why.', 1),
  ('ph-scale',           'chemistry',   'builtin', 'pH and indicators', 'Grade 9', 'Test everyday substances with universal indicator and see how acidic or alkaline they are.', 2),
  ('circuit-builder',    'electricity', 'builtin', 'Circuit builder: series and parallel', 'Grade 9–10', 'Change the battery and two bulbs, then compare series and parallel circuits using Ohm’s law (V = I × R).', 1),
  ('ohms-law',           'electricity', 'builtin', 'Ohm’s law lab', 'Grade 9', 'Take readings like a real experiment and plot current against voltage to find resistance.', 2),
  ('predator-prey',      'biology',     'builtin', 'Predators and prey', 'Grade 10–11', 'Antelope eat grass and lions eat antelope. Change the rates and watch both populations rise and fall in cycles.', 1),
  ('membrane-diffusion', 'biology',     'builtin', 'Diffusion through a cell membrane', 'Grade 9–10', 'Small molecules slip through the pores of a membrane; big ones are blocked. Change pore size and temperature.', 2),
  ('graph-transformer',  'math',        'builtin', 'Graph transformer', 'Grade 9–12', 'Pick a function and stretch, squash and shift it with sliders: y = a·f(b(x − h)) + k.', 1),
  ('unit-circle',        'math',        'builtin', 'Unit circle and the sine wave', 'Grade 10–12', 'A point goes round a circle of radius 1. Its height traces the sine wave, its sideways position is cosine.', 2),
  ('dice-probability',   'math',        'builtin', 'Two dice: probability', 'Grade 9–11', 'Roll two dice many times. Why is 7 the most common total? Compare results with the theory.', 3)
on conflict (id) do nothing;

-- Examples of the two other lab kinds the admin can add: an embedded outside simulation and a hands-on guide.
insert into public.labs (id, subject_id, kind, title, level, blurb, instructions, embed_url, position) values
  ('phet-circuit-kit', 'electricity', 'embed', 'Circuit construction kit (PhET)', 'Grade 9–12',
   'Build any circuit you like with wires, batteries, bulbs and switches. A free simulation from the University of Colorado.',
   'Build a circuit with one battery and two bulbs in series. Then rebuild it in parallel. Which bulbs are brighter, and why?',
   'https://phet.colorado.edu/sims/html/circuit-construction-kit-dc/latest/circuit-construction-kit-dc_en.html', 3),
  ('hands-on-fizz', 'chemistry', 'guide', 'Hands-on: vinegar and baking soda', 'Grade 9',
   'A safe real experiment to do in class after the reaction mixer.',
   E'You need: vinegar, baking soda, a clear cup, a spoon, a balloon and a small bottle.
1. Put two spoons of baking soda in the cup.
2. Predict what will happen when you add vinegar. Write it down.
3. Slowly pour in half a cup of vinegar and watch.
4. Now put baking soda inside a balloon, vinegar in the bottle, and stretch the balloon over the bottle neck.
5. Lift the balloon so the powder falls in. What fills the balloon?
Safety: wear goggles and do not taste anything.', '', 3)
on conflict (id) do nothing;

insert into public.news (date, tag, title, body, link, link_text)
select current_date, 'News', 'Student accounts are here', 'Log in to track your lab progress, take exams and earn Dangila STEM certificates.', '#login', 'Log in'
where not exists (select 1 from public.news);

-- =====================================================================
-- Dangila STEM Club — Phase 2: AI tutor and coding labs
-- Run ONCE in Supabase → SQL Editor, AFTER schema.sql. Safe to run again.
-- =====================================================================

-- ---------- AI per subject ----------
alter table public.subjects add column if not exists ai_enabled boolean not null default true;
alter table public.subjects add column if not exists ai_instructions text not null default '';

-- ---------- Coding labs: a 4th kind of lab with starter code and automatic checks ----------
alter table public.labs add column if not exists starter_code text not null default '';
alter table public.labs add column if not exists tests text not null default '';
alter table public.labs drop constraint if exists labs_kind_check;
alter table public.labs add constraint labs_kind_check check (kind in ('builtin','embed','guide','code'));

-- A coding lab is completed when all its checks pass in the student's browser.
create or replace function public.complete_code_lab(p_lab text) returns public.lab_progress
language plpgsql security definer set search_path = public as $$
declare l labs; r lab_progress;
begin
  if auth.uid() is null then raise exception 'Please log in'; end if;
  select * into l from labs where id = p_lab and kind = 'code' and published;
  if l.id is null then raise exception 'Not a coding lab'; end if;
  insert into lab_progress as lp (user_id, lab_id, subject_id, seconds, interactions, completed)
  values (auth.uid(), l.id, l.subject_id, 0, 1, true)
  on conflict (user_id, lab_id) do update set completed = true, interactions = lp.interactions + 1, last_at = now()
  returning * into r;
  return r;
end $$;

-- ---------- Settings the admin can change (AI limits) ----------
create table if not exists public.app_settings (
  key   text primary key,
  value jsonb not null
);
alter table public.app_settings enable row level security;
drop policy if exists "settings read" on public.app_settings;
create policy "settings read" on public.app_settings for select using (auth.uid() is not null);
drop policy if exists "settings admin" on public.app_settings;
create policy "settings admin" on public.app_settings for all using (public.is_admin()) with check (public.is_admin());
insert into public.app_settings (key, value) values
  ('ai', '{"enabled": true, "student_daily": 20, "teacher_daily": 100}')
on conflict (key) do nothing;

-- ---------- AI usage: questions asked per person per day ----------
create table if not exists public.ai_usage (
  user_id uuid not null references public.profiles on delete cascade,
  day     date not null default current_date,
  count   int  not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
drop policy if exists "ai usage read" on public.ai_usage;
create policy "ai usage read" on public.ai_usage for select using (user_id = auth.uid() or public.is_staff());

-- Called only by the server (tutor function): counts one question if the daily limit allows it.
create or replace function public.ai_take(p_user uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s jsonb; role_ text; lim int; n int;
begin
  select value into s from app_settings where key = 'ai';
  s := coalesce(s, '{}'::jsonb);
  if not coalesce((s->>'enabled')::boolean, true) then
    return jsonb_build_object('allowed', false, 'reason', 'off');
  end if;
  select role into role_ from profiles where id = p_user;
  if role_ is null then return jsonb_build_object('allowed', false, 'reason', 'nouser'); end if;
  lim := case when role_ = 'student' then coalesce((s->>'student_daily')::int, 20) else coalesce((s->>'teacher_daily')::int, 100) end;
  insert into ai_usage as u (user_id, day, count) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set count = u.count + 1 where u.count < lim
  returning count into n;
  if n is null then
    return jsonb_build_object('allowed', false, 'reason', 'limit', 'limit', lim);
  end if;
  return jsonb_build_object('allowed', true, 'used', n, 'limit', lim, 'role', role_);
end $$;
revoke execute on function public.ai_take(uuid) from public, anon, authenticated;
grant execute on function public.ai_take(uuid) to service_role;

-- ---------- Starting content: a Coding subject with four exercises ----------
insert into public.subjects (id, name, am, color, description, position) values
  ('coding', 'Coding', 'ፕሮግራሚንግ', '#0e8a8a', 'Write real Python in your browser: solve science and maths problems with code, and get your work checked straight away.', 5)
on conflict (id) do nothing;

insert into public.labs (id, subject_id, kind, title, level, blurb, instructions, starter_code, tests, position) values
('py-average', 'coding', 'code', 'Python first steps: class average', 'Grade 9',
 'Your first Python function: work out the average of a list of marks.',
 E'Finish the function average(marks) so it returns the average of the numbers in the list.\nPress Run to try it, then Check to test your answer.',
 E'# Finish the function so it returns the average of the marks.\ndef average(marks):\n    # Hint: use sum(marks) and len(marks)\n    return 0\n\nprint("Average:", average([70, 80, 90]))\n',
 E'assert average([70, 80, 90]) == 80, "average([70, 80, 90]) should be 80"\nassert average([50]) == 50, "With one mark, the average is that mark"\nassert abs(average([1, 2]) - 1.5) < 1e-9, "average([1, 2]) should be 1.5"',
 1),
('py-ohms-law', 'coding', 'code', 'Ohm''s law calculator', 'Grade 9–10',
 'Turn the formula V = I × R into Python functions for current and power.',
 E'Write current(voltage, resistance), which returns I = V ÷ R.\nThen write power(voltage, resistance), which returns P = V² ÷ R.\nCompare with the Ohm''s law lab in Electricity.',
 E'def current(voltage, resistance):\n    # I = V / R\n    return 0\n\ndef power(voltage, resistance):\n    # P = V * V / R\n    return 0\n\nprint("6 V across 3 ohms:", current(6, 3), "A and", power(6, 3), "W")\n',
 E'assert current(6, 3) == 2, "current(6, 3) should be 2 A"\nassert current(12, 4) == 3, "current(12, 4) should be 3 A"\nassert power(6, 3) == 12, "power(6, 3) should be 12 W"\nassert abs(power(9, 2) - 40.5) < 1e-9, "power(9, 2) should be 40.5 W"',
 2),
('py-projectile', 'coding', 'code', 'Physics with code: how far does a ball fly?', 'Grade 10–12',
 'Use the projectile formula to find the best angle to throw, and draw a graph with matplotlib.',
 E'A ball thrown at speed v and angle θ on flat ground lands R = v² × sin(2θ) ÷ g away (g = 9.8 m/s²).\n1. Finish flight_range(speed, angle_deg). Remember math.sin needs radians: use math.radians().\n2. Run it and find which angle gives the longest throw.\n3. Bonus: remove the # signs at the bottom to draw a graph.',
 E'import math\ng = 9.8\n\ndef flight_range(speed, angle_deg):\n    # R = v² × sin(2θ) / g\n    return 0\n\nfor angle in [15, 30, 45, 60, 75]:\n    print(angle, "degrees ->", round(flight_range(20, angle), 1), "m")\n\n# Bonus: draw the graph (remove the # signs below)\n# import matplotlib.pyplot as plt\n# angles = list(range(0, 91, 5))\n# plt.plot(angles, [flight_range(20, a) for a in angles])\n# plt.xlabel("Angle (degrees)")\n# plt.ylabel("Range (m)")\n# plt.show()\n',
 E'assert abs(flight_range(10, 45) - 10.204) < 0.01, "flight_range(10, 45) should be about 10.2 m"\nassert abs(flight_range(10, 90)) < 1e-6, "Thrown straight up (90°), the ball lands where it started"\nassert abs(flight_range(20, 30) - 35.35) < 0.01, "flight_range(20, 30) should be about 35.35 m"',
 3),
('py-primes', 'coding', 'code', 'Maths with code: prime numbers', 'Grade 9–11',
 'Write a function that decides whether a number is prime, then list the primes below 100.',
 E'A prime number has exactly two factors: 1 and itself. 1 is not prime.\nFinish is_prime(n) so it returns True or False.\nHint: try dividing n by every number from 2 up to n − 1 (or up to √n to be faster).',
 E'def is_prime(n):\n    # Return True if n is prime, otherwise False\n    return False\n\nprimes = [n for n in range(100) if is_prime(n)]\nprint(len(primes), "primes below 100:", primes)\n',
 E'assert is_prime(2), "2 is prime"\nassert is_prime(13), "13 is prime"\nassert is_prime(97), "97 is prime"\nassert not is_prime(1), "1 is not prime"\nassert not is_prime(0), "0 is not prime"\nassert not is_prime(15), "15 = 3 × 5 is not prime"\nassert not is_prime(49), "49 = 7 × 7 is not prime"',
 4)
on conflict (id) do nothing;

-- =====================================================================
-- Dangila STEM Club — Phase 3: e-learning courses, assignments, AI model list
-- Run ONCE in Supabase → SQL Editor, AFTER schema.sql and phase2.sql. Safe to run again.
-- =====================================================================

-- ---------- Courses and lessons ----------
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  subject_id  text not null default '',
  grade       text not null default '',
  description text not null default '',
  color       text not null default '#1f3f99',
  published   boolean not null default false,
  position    int not null default 0,
  created_by  uuid references public.profiles on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);

create table if not exists public.lessons (
  id        uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses on delete cascade,
  position  int not null default 0,
  title     text not null,
  body      text not null default '',
  video_url text not null default '',
  resources text not null default '',   -- one per line: Title | https://link
  lab_id    text not null default '',
  exam_id   uuid,
  minutes   int not null default 10
);

create table if not exists public.lesson_progress (
  user_id      uuid not null references public.profiles on delete cascade,
  lesson_id    uuid not null references public.lessons on delete cascade,
  course_id    uuid not null references public.courses on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.assignments (
  id           uuid primary key default gen_random_uuid(),
  course_id    uuid not null references public.courses on delete cascade,
  position     int not null default 0,
  title        text not null,
  instructions text not null default '',
  due_date     date,
  points       int not null default 10,
  published    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments on delete cascade,
  user_id       uuid not null references public.profiles on delete cascade default auth.uid(),
  answer        text not null default '',
  submitted_at  timestamptz not null default now(),
  grade         int,
  feedback      text not null default '',
  graded_at     timestamptz,
  graded_by     uuid references public.profiles on delete set null,
  unique (assignment_id, user_id)
);

create or replace function public.course_visible(p_course uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select published from courses where id = p_course), false) or is_staff()
$$;

alter table public.courses         enable row level security;
alter table public.lessons         enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.assignments     enable row level security;
alter table public.submissions     enable row level security;

drop policy if exists "courses read" on public.courses;
create policy "courses read" on public.courses for select using ((published and auth.uid() is not null) or public.is_staff());
drop policy if exists "courses staff" on public.courses;
create policy "courses staff" on public.courses for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "lessons read" on public.lessons;
create policy "lessons read" on public.lessons for select using (auth.uid() is not null and public.course_visible(course_id));
drop policy if exists "lessons staff" on public.lessons;
create policy "lessons staff" on public.lessons for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "lesson progress read" on public.lesson_progress;
create policy "lesson progress read" on public.lesson_progress for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists "lesson progress add" on public.lesson_progress;
create policy "lesson progress add" on public.lesson_progress for insert with check (user_id = auth.uid() and public.course_visible(course_id));
drop policy if exists "lesson progress remove" on public.lesson_progress;
create policy "lesson progress remove" on public.lesson_progress for delete using (user_id = auth.uid());

drop policy if exists "assignments read" on public.assignments;
create policy "assignments read" on public.assignments for select using ((published and auth.uid() is not null and public.course_visible(course_id)) or public.is_staff());
drop policy if exists "assignments staff" on public.assignments;
create policy "assignments staff" on public.assignments for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "submissions read" on public.submissions;
create policy "submissions read" on public.submissions for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists "submissions add" on public.submissions;
create policy "submissions add" on public.submissions for insert with check (user_id = auth.uid());
drop policy if exists "submissions edit own" on public.submissions;
create policy "submissions edit own" on public.submissions for update using (user_id = auth.uid() and grade is null) with check (user_id = auth.uid());
drop policy if exists "submissions grade" on public.submissions;
create policy "submissions grade" on public.submissions for update using (public.is_staff()) with check (public.is_staff());

-- Students can only change their answer; only teachers can set grades and feedback.
create or replace function public.guard_submission() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_staff() then
    if tg_op = 'UPDATE' and (new.grade is distinct from old.grade or new.feedback is distinct from old.feedback) then
      new.graded_at := now(); new.graded_by := auth.uid();
    end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.grade := null; new.feedback := ''; new.graded_at := null; new.graded_by := null; new.submitted_at := now();
  else
    new.grade := old.grade; new.feedback := old.feedback; new.graded_at := old.graded_at; new.graded_by := old.graded_by;
    new.user_id := old.user_id; new.assignment_id := old.assignment_id; new.submitted_at := now();
  end if;
  return new;
end $$;
drop trigger if exists submissions_guard on public.submissions;
create trigger submissions_guard before insert or update on public.submissions
  for each row execute function public.guard_submission();

-- Teachers save a course with its lessons and assignments in one step.
-- Lessons/assignments keep their ids, so student progress is not lost when a course is edited.
create or replace function public.save_course(p_course jsonb, p_lessons jsonb, p_assignments jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_item uuid; x jsonb; i int := 0; keep uuid[] := '{}';
begin
  if not is_staff() then raise exception 'Only teachers can save courses'; end if;
  v_id := nullif(p_course->>'id', '')::uuid;
  if v_id is null or not exists (select 1 from courses where id = v_id) then
    insert into courses (id, title, subject_id, grade, description, color, published, position)
    values (coalesce(v_id, gen_random_uuid()), p_course->>'title', coalesce(p_course->>'subject_id', ''), coalesce(p_course->>'grade', ''),
            coalesce(p_course->>'description', ''), coalesce(p_course->>'color', '#1f3f99'), coalesce((p_course->>'published')::boolean, false),
            coalesce((p_course->>'position')::int, 0))
    returning id into v_id;
  else
    update courses set title = p_course->>'title', subject_id = coalesce(p_course->>'subject_id', ''), grade = coalesce(p_course->>'grade', ''),
      description = coalesce(p_course->>'description', ''), color = coalesce(p_course->>'color', '#1f3f99'),
      published = coalesce((p_course->>'published')::boolean, false), position = coalesce((p_course->>'position')::int, 0)
    where id = v_id;
  end if;

  for x in select * from jsonb_array_elements(coalesce(p_lessons, '[]')) loop
    i := i + 1;
    insert into lessons (id, course_id, position, title, body, video_url, resources, lab_id, exam_id, minutes)
    values (coalesce(nullif(x->>'id', '')::uuid, gen_random_uuid()), v_id, i, x->>'title', coalesce(x->>'body', ''), coalesce(x->>'video_url', ''),
            coalesce(x->>'resources', ''), coalesce(x->>'lab_id', ''), nullif(x->>'exam_id', '')::uuid, coalesce((x->>'minutes')::int, 10))
    on conflict (id) do update set position = excluded.position, title = excluded.title, body = excluded.body, video_url = excluded.video_url,
      resources = excluded.resources, lab_id = excluded.lab_id, exam_id = excluded.exam_id, minutes = excluded.minutes
    returning id into v_item;
    keep := keep || v_item;
  end loop;
  delete from lessons where course_id = v_id and not (id = any(keep));

  keep := '{}'; i := 0;
  for x in select * from jsonb_array_elements(coalesce(p_assignments, '[]')) loop
    i := i + 1;
    insert into assignments (id, course_id, position, title, instructions, due_date, points, published)
    values (coalesce(nullif(x->>'id', '')::uuid, gen_random_uuid()), v_id, i, x->>'title', coalesce(x->>'instructions', ''),
            nullif(x->>'due_date', '')::date, coalesce((x->>'points')::int, 10), coalesce((x->>'published')::boolean, true))
    on conflict (id) do update set position = excluded.position, title = excluded.title, instructions = excluded.instructions,
      due_date = excluded.due_date, points = excluded.points, published = excluded.published
    returning id into v_item;
    keep := keep || v_item;
  end loop;
  delete from assignments where course_id = v_id and not (id = any(keep));
  return v_id;
end $$;

-- ---------- AI Studio: the list of models the admin allows ----------
insert into public.app_settings (key, value) values ('ai_models', '[
  {"key":"claude","label":"Claude","provider":"anthropic","model":"claude-haiku-5-5","enabled":true,"staff_only":false},
  {"key":"gpt","label":"ChatGPT","provider":"openai","model":"gpt-6-luna","enabled":true,"staff_only":false},
  {"key":"gemini","label":"Gemini","provider":"gemini","model":"gemini-3.8-flash","enabled":true,"staff_only":false},
  {"key":"claude-pro","label":"Claude (advanced)","provider":"anthropic","model":"claude-sonnet-5-5","enabled":true,"staff_only":true}
]') on conflict (key) do nothing;

-- ---------- A starter course (added only the first time) ----------
do $seed$ begin
if not exists (select 1 from public.courses where id = '00000000-0000-4000-8000-000000000001') then
insert into public.courses (id, title, subject_id, grade, description, color, published, position) values
  ('00000000-0000-4000-8000-000000000001', 'Electricity basics', 'electricity', 'Grade 9–10',
   'Current, voltage and resistance in four short lessons, with simulations, a hands-on task and a short exam.', '#e9a400', true, 1);

insert into public.lessons (id, course_id, position, title, body, lab_id, minutes) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 1, 'What is electric current?',
   E'Electric current is a flow of electric charge. In metal wires, the charges that move are tiny particles called electrons.\nWe measure current in amperes (A) with an ammeter.\nKey ideas:\n- A circuit must be a complete loop for current to flow.\n- A switch opens or closes the loop.\n- More current through a bulb makes it brighter.\nOpen the circuit builder below and open and close the switch. Watch the electrons stop and start.', 'circuit-builder', 10),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 2, 'Voltage and resistance: Ohm''s law',
   E'Voltage (V, in volts) is the push that drives the current. Resistance (R, in ohms Ω) is how much a component resists the current.\nOhm''s law links them: V = I × R, so I = V ÷ R.\nExample: a 12 V battery and a 4 Ω resistor give I = 12 ÷ 4 = 3 A.\nIn the Ohm''s law lab, take at least three readings and find the mystery resistance from the graph.', 'ohms-law', 15),
  ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', 3, 'Series and parallel circuits',
   E'In a series circuit there is one path: the same current flows through every bulb, and resistances add up.\nIn a parallel circuit each bulb has its own path: each gets the full battery voltage, and if one bulb breaks the others stay on.\nThat is why the lights in a house are connected in parallel.\nUse the circuit builder to compare the brightness of the bulbs in series and in parallel.', 'circuit-builder', 15),
  ('00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000001', 4, 'Build it with code',
   E'Scientists and engineers use code to do calculations quickly.\nWrite a Python calculator for current and power in the coding exercise.', 'py-ohms-law', 15);

insert into public.assignments (id, course_id, position, title, instructions, points) values
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', 1, 'Electricity at home',
   E'Look at the electrical things in your home or school.\n1. Name three devices and say what they change electrical energy into.\n2. Are the lights in your home in series or in parallel? How do you know?\n3. Give one rule for using electricity safely.', 10);
end if;
end $seed$;

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


-- =====================================================================
-- Permissions and refresh (safe to run any time).
-- Some newer Supabase projects do not give the website access to new tables
-- automatically. This gives access; row-level security above still decides
-- what each person may see or change.
-- =====================================================================
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
-- the AI counter must stay server-only
revoke execute on function public.ai_take(uuid) from public, anon, authenticated;
grant execute on function public.ai_take(uuid) to service_role;
-- ask the Data API to see the new tables straight away
notify pgrst, 'reload schema';

-- Check: this should list 19 tables, including profiles, labs and courses.
select count(*) as club_tables_found from information_schema.tables
 where table_schema = 'public' and table_name in ('profiles','subjects','labs','news','lab_progress','exams','exam_questions','attempts','certificates','app_settings','ai_usage','courses','lessons','assignments','submissions','classes','class_members','class_posts','post_comments');
