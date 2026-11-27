// Account management for teachers and the admin.
// Creating logins needs Supabase's secret service key, so it runs here on the server, never in the browser.
// Netlify environment variables needed: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, (optional) LOGIN_DOMAIN
//
// POST /api/users  with header  Authorization: Bearer <the user's Supabase access token>
//   { action: "create", users: [{ full_name, grade, username?, password?, role? }] }
//   { action: "reset",  user_id, password? }
//   { action: "update", user_id, full_name?, grade? }
//   { action: "role",   user_id, role }        (admin only)
//   { action: "delete", user_id }              (admin only)

const SB_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DOMAIN = process.env.LOGIN_DOMAIN || 'dangila-stem.netlify.app';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const sb = (path, opt = {}) =>
  fetch(SB_URL + path, {
    ...opt,
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', ...(opt.headers || {}) }
  });

const WORDS = ['lion', 'river', 'tana', 'atom', 'cell', 'volt', 'prism', 'orbit', 'coffee', 'eagle', 'cloud', 'magnet', 'comet', 'delta', 'zebra', 'lemon'];
const makePassword = () => WORDS[Math.floor(Math.random() * WORDS.length)] + (1000 + Math.floor(Math.random() * 9000));
const slug = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 24);

async function getProfile(id) {
  const r = await sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=id,username,role`);
  const rows = r.ok ? await r.json() : [];
  return rows[0] || null;
}

async function usernameTaken(u) {
  const r = await sb(`/rest/v1/profiles?username=eq.${encodeURIComponent(u)}&select=id`);
  return r.ok && (await r.json()).length > 0;
}

async function uniqueUsername(base) {
  let u = slug(base) || 'student';
  if (!(await usernameTaken(u))) return u;
  for (let i = 2; i < 500; i++) if (!(await usernameTaken(`${u}${i}`))) return `${u}${i}`;
  return `${u}${Date.now() % 100000}`;
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  if (!SB_URL || !KEY) return json({ error: 'The server is not set up yet: add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify environment variables.' }, 500);

  // Who is calling?
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Please log in.' }, 401);
  const who = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: KEY, Authorization: `Bearer ${token}` } });
  if (!who.ok) return json({ error: 'Your session has expired. Please log in again.' }, 401);
  const caller = await who.json();
  const me = await getProfile(caller.id);
  if (!me || !['teacher', 'admin'].includes(me.role)) return json({ error: 'Only teachers and admins can manage accounts.' }, 403);
  const isAdmin = me.role === 'admin';

  let body;
  try { body = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }

  // Teachers may only manage students; admins may manage everyone.
  const canManage = async (userId) => {
    const p = await getProfile(userId);
    if (!p) return [null, 'User not found'];
    if (!isAdmin && p.role !== 'student') return [null, 'Teachers can only manage student accounts'];
    return [p, null];
  };

  try {
    if (body.action === 'create') {
      const list = Array.isArray(body.users) ? body.users.slice(0, 200) : [];
      if (!list.length) return json({ error: 'No users given' }, 400);
      const created = [], failed = [];
      for (const u of list) {
        const role = isAdmin && ['student', 'teacher', 'admin'].includes(u.role) ? u.role : 'student';
        const full_name = String(u.full_name || '').trim().slice(0, 80);
        if (!full_name) { failed.push({ full_name, error: 'Missing name' }); continue; }
        const username = u.username ? slug(u.username) : await uniqueUsername(full_name);
        if (u.username && await usernameTaken(username)) { failed.push({ full_name, error: `Username ${username} is taken` }); continue; }
        const password = u.password && String(u.password).length >= 6 ? String(u.password) : makePassword();
        const r = await sb('/auth/v1/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            email: `${username}@${DOMAIN}`, password, email_confirm: true,
            user_metadata: { username, full_name, grade: String(u.grade || '').slice(0, 20) }
          })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) { failed.push({ full_name, error: data.msg || data.message || data.error_description || 'Could not create' }); continue; }
        if (role !== 'student') {
          await sb(`/rest/v1/profiles?id=eq.${data.id}`, { method: 'PATCH', body: JSON.stringify({ role }) });
        }
        created.push({ id: data.id, username, password, full_name, grade: u.grade || '', role });
      }
      return json({ created, failed });
    }

    if (body.action === 'reset') {
      const [p, err] = await canManage(body.user_id); if (err) return json({ error: err }, 403);
      const password = body.password && String(body.password).length >= 6 ? String(body.password) : makePassword();
      const r = await sb(`/auth/v1/admin/users/${p.id}`, { method: 'PUT', body: JSON.stringify({ password }) });
      if (!r.ok) return json({ error: 'Could not reset password' }, 500);
      return json({ username: p.username, password });
    }

    if (body.action === 'update') {
      const [p, err] = await canManage(body.user_id); if (err) return json({ error: err }, 403);
      const patch = {};
      if (typeof body.full_name === 'string') patch.full_name = body.full_name.trim().slice(0, 80);
      if (typeof body.grade === 'string') patch.grade = body.grade.trim().slice(0, 20);
      const r = await sb(`/rest/v1/profiles?id=eq.${p.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      return r.ok ? json({ ok: true }) : json({ error: 'Could not update' }, 500);
    }

    if (body.action === 'role') {
      if (!isAdmin) return json({ error: 'Only the admin can change roles' }, 403);
      if (!['student', 'teacher', 'admin'].includes(body.role)) return json({ error: 'Unknown role' }, 400);
      if (body.user_id === me.id && body.role !== 'admin') return json({ error: 'You cannot remove your own admin role' }, 400);
      const r = await sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(body.user_id)}`, { method: 'PATCH', body: JSON.stringify({ role: body.role }) });
      return r.ok ? json({ ok: true }) : json({ error: 'Could not change role' }, 500);
    }

    if (body.action === 'delete') {
      if (!isAdmin) return json({ error: 'Only the admin can delete accounts' }, 403);
      if (body.user_id === me.id) return json({ error: 'You cannot delete your own account' }, 400);
      const r = await sb(`/auth/v1/admin/users/${encodeURIComponent(body.user_id)}`, { method: 'DELETE' });
      return r.ok ? json({ ok: true }) : json({ error: 'Could not delete' }, 500);
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    return json({ error: 'Server error: ' + (e.message || e) }, 500);
  }
};

export const config = { path: '/api/users' };
