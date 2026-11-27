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
