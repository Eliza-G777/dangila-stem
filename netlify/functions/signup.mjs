// Student self sign-up with a class code.
// POST /api/signup { code, full_name, grade, username, password } → { ok, username }
// Needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LOGIN_DOMAIN. The admin can switch sign-up off in Admin → Users.
const normUrl = u => { u = String(u || '').trim(); const m = /https?:\/\/([a-z0-9-]+)\.supabase\.co/i.exec(u); if (m) return `https://${m[1].toLowerCase()}.supabase.co`; const d = /supabase\.com\/dashboard\/project\/([a-z0-9]+)/i.exec(u); if (d) return `https://${d[1].toLowerCase()}.supabase.co`; return u.replace(/\/+$/, ''); };
const URL_ = normUrl(process.env.SUPABASE_URL);
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const DOMAIN = (process.env.LOGIN_DOMAIN || 'dangila-stem.netlify.app').trim().toLowerCase();
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const svc = (path, opt = {}) => fetch(URL_ + path, { ...opt, headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
const slug = s => String(s || '').toLowerCase().trim().replace(/[^a-z0-9._-]+/g, '').slice(0, 24);

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  if (!URL_ || !KEY) return json({ error: 'Sign-up is not set up yet. Ask your teacher for a login.' }, 503);
  let b; try { b = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }

  const setting = await svc('/rest/v1/app_settings?key=eq.signup&select=value').then(r => r.ok ? r.json() : []).catch(() => []);
  if (setting[0] && setting[0].value && setting[0].value.enabled === false) return json({ error: 'Sign-up is closed. Ask your teacher to create your login.' }, 403);

  const code = String(b.code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const full_name = String(b.full_name || '').trim().slice(0, 80);
  const grade = String(b.grade || '').trim().slice(0, 20);
  const username = slug(b.username);
  const password = String(b.password || '');
  if (!code) return json({ error: 'Type the class code your teacher gave you.' }, 400);
  if (full_name.length < 2) return json({ error: 'Type your full name.' }, 400);
  if (username.length < 3) return json({ error: 'Choose a username with at least 3 letters or numbers.' }, 400);
  if (password.length < 6) return json({ error: 'Choose a password with at least 6 characters.' }, 400);

  const cls = await svc(`/rest/v1/classes?code=eq.${encodeURIComponent(code)}&archived=eq.false&select=id,name`).then(r => r.ok ? r.json() : []);
  if (!cls.length) return json({ error: 'No class has that code. Check it with your teacher.' }, 404);
  const taken = await svc(`/rest/v1/profiles?username=eq.${encodeURIComponent(username)}&select=id`).then(r => r.ok ? r.json() : []);
  if (taken.length) return json({ error: `The username “${username}” is already taken. Try adding a number, e.g. ${username}${Math.floor(Math.random() * 90 + 10)}.` }, 409);

  const r = await svc('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email: `${username}@${DOMAIN}`, password, email_confirm: true, user_metadata: { username, full_name, grade } }) });
  const u = await r.json().catch(() => ({}));
  if (!r.ok) return json({ error: /already/i.test(u.msg || u.message || '') ? 'That username is already taken.' : 'Could not create the account. Please try again.' }, 400);
  // make sure the new account is a student, then add it to the class
  await svc(`/rest/v1/profiles?id=eq.${u.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ role: 'student', full_name, grade }) });
  await svc('/rest/v1/class_members', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ class_id: cls[0].id, user_id: u.id, role: 'student' }) });
  return json({ ok: true, username, class_name: cls[0].name });
};

export const config = { path: '/api/signup' };
