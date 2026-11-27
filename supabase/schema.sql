-- =====================================================================
-- Danglila STEM Club — database
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
select current_date, 'News', 'Student accounts are here', 'Log in to track your lab progress, take exams and earn Danglila STEM certificates.', '#login', 'Log in'
where not exists (select 1 from public.news);
