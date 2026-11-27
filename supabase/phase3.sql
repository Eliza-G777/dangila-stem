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
